"use strict";

window.browser = (function () {
    return window.chrome || window.browser;
})();

var yellowHighlightClass = "find-ext-highlight-yellow";
var orangeHighlightClass = "find-ext-highlight-orange";

browser.runtime.onMessage.addListener(function(message, sender, response) {
    switch(message.action) {
        case 'highlight_update':
            restore(yellowHighlightClass, orangeHighlightClass);
            highlightAll(message.occurrenceMap, message.regex, message.options);
            seekHighlight(message.index);
            break;
        case 'omni_update':
            restore(yellowHighlightClass, orangeHighlightClass);
            highlightAll(message.occurrenceMap, message.regex, null);
            break;
        case 'highlight_seek':
            restoreClass(orangeHighlightClass);
            seekHighlight(message.index);
            break;
        case 'highlight_restore':
            restore(yellowHighlightClass, orangeHighlightClass);
            break;
        case 'highlight_replace':
            replace(message.index, message.replaceWith);
            break;
        case 'highlight_replace_all':
            replaceAll(message.replaceWith);
            break;
        case 'enter_link':
            enterLink();
            break;
    }
});

//Highlight all occurrences of regular expression on the page
function highlightAll(occurrenceMap, regex, options) {
    var occIndex = 0;
    var tags = {occIndex: null, maxIndex: null, openingMarkup: '', closingMarkup: '', update: function(index) {
        if(this.occIndex != index) {
            this.occIndex = index;

            //If reached max number of occurrences to show, don't highlight text
            if(this.maxIndex == null || this.occIndex <= this.maxIndex) {
                this.openingMarkup = '<span class="' + yellowHighlightClass + ' find-ext-occr' + index + '">';
                this.closingMarkup = '</span>';
            }
            else {
                this.openingMarkup = '';
                this.closingMarkup = '';
            }
        }
    }};

    if(options && options.max_results != 0)
        tags.maxIndex = options.max_results - 1;
    else
        tags.maxIndex = null;

    regex = regex.replace(/ /g, '\\s');
    if(!options || options.match_case)
        regex = new RegExp(regex, 'm');
    else
        regex = new RegExp(regex, 'mi');

    //Iterate each text group
    for(var index = 0; index < occurrenceMap.groups; index++) {
        var uuids = occurrenceMap[index].uuids;
        var groupText = '', charMap = {}, charIndexMap = [];

        //Build groupText, charMap and charIndexMap
        var count = 0;
        for(var uuidIndex = 0; uuidIndex < uuids.length; uuidIndex++) {
            var el = document.getElementById(uuids[uuidIndex]);
            var text = el.childNodes[0].nodeValue;

            if(!text)
                continue;

            text = decode(text);
            groupText += text;

            for(var stringIndex = 0; stringIndex < text.length; stringIndex++) {
                charIndexMap.push(count);
                charMap[count++] = {char: text.charAt(stringIndex), nodeUUID: uuids[uuidIndex], nodeIndex: stringIndex, ignorable: false, matched: false, boundary: false};
            }
        }
        charMap.length = count;

        //Format text nodes (whitespaces) whilst keeping references to their nodes in the DOM, updating charMap ignorable characters
        if(!occurrenceMap[index].preformatted) {
            var info;

            //Replace all whitespace characters (\t \n\r) with the space character
            while(info = /[\t\n\r]/.exec(groupText)) {
                charMap[charIndexMap[info.index]].ignorable = true;
                groupText = groupText.replace(/[\t\n\r]/, ' ');
            }

            //Truncate consecutive whitespaces
            var len, offset, currIndex;
            while(info = / {2,}/.exec(groupText)) {
                len = info[0].length;
                offset = info.index;

                for(currIndex = 0; currIndex < len; currIndex++)
                    charMap[charIndexMap[offset + currIndex]].ignorable = true;

                for(currIndex = 0; currIndex < len-1; currIndex++)
                    charIndexMap.splice(offset,1);

                groupText = groupText.replace(/ {2,}/, ' ');
            }

            //Collapse leading or trailing whitespaces
            while(info = /^ | $/.exec(groupText)) {
                len = info[0].length;
                offset = info.index;

                for(currIndex = 0; currIndex < len; currIndex++)
                    charMap[charIndexMap[offset + currIndex]].ignorable = true;

                for(currIndex = 0; currIndex < len; currIndex++)
                    charIndexMap.splice(offset,1);

                groupText = groupText.replace(/^ | $/, '');
            }
        }

        //Perform complex regex search, updating charMap matched characters
        while(info = regex.exec(groupText)) {
            len = info[0].length;
            offset = info.index;

            if(len == 0)
                break;

            var first = charIndexMap[offset];
            var last = charIndexMap[offset + len - 1];
            for(currIndex = first; currIndex <= last; currIndex++) {
                charMap[currIndex].matched = true;
                if(currIndex == last)
                    charMap[currIndex].boundary = true;
            }

            for(currIndex = 0; currIndex < offset+len; currIndex++)
                charIndexMap.splice(0,1);

            groupText = groupText.substring(offset+len);
        }

        //Wrap matched characters in an element with class yellowHighlightClass and occurrenceIdentifier
        var matchGroup = {text: '', groupUUID: charMap[0].nodeUUID};
        var inMatch = false;
        for(var key = 0; key < charMap.length; key++) {
            tags.update(occIndex);

            //If Transitioning Into New Text Group
            if(matchGroup.groupUUID != charMap[key].nodeUUID) {
                if(inMatch)
                    matchGroup.text += tags.closingMarkup;

                document.getElementById(matchGroup.groupUUID).innerHTML = matchGroup.text;
                matchGroup.text = '';
                matchGroup.groupUUID = charMap[key].nodeUUID;

                if(inMatch)
                    matchGroup.text += tags.openingMarkup;
            }

            //If Current Character is Matched
            if(charMap[key].matched) {
                if(!inMatch) {
                    inMatch = charMap[key].matched;
                    matchGroup.text += tags.openingMarkup;
                }
            }
            else {
                if(inMatch) {
                    inMatch = charMap[key].matched;
                    matchGroup.text += tags.closingMarkup;

                    if(key < charMap.length)
                        occIndex++;
                }
            }

            matchGroup.text += encode(charMap[key].char);

            if(charMap[key].boundary) {
                inMatch = false;
                matchGroup.text += tags.closingMarkup;
                if(key < charMap.length)
                    occIndex++;
            }

            //If End of Map Reached
            if(key == charMap.length-1) {
                if(inMatch) {
                    matchGroup.text += tags.closingMarkup;
                    occIndex++;
                }

                document.getElementById(matchGroup.groupUUID).innerHTML = matchGroup.text;
            }
        }
    }
}

//Move highlight focused text to a given occurrence index
function seekHighlight(index) {
    var els = Array.from(document.querySelectorAll('.find-ext-occr' + index));
    if(els == null || els.length == 0)
        return;

    for(var elsIndex = 0; elsIndex < els.length; elsIndex++)
        els[elsIndex].classList.add(orangeHighlightClass);

    els[0].scrollIntoView(true);

    var docHeight = Math.max(document.documentElement.clientHeight, document.documentElement.offsetHeight, document.documentElement.scrollHeight);
    var bottomScrollPos = window.pageYOffset + window.innerHeight;
    if(bottomScrollPos + 100 < docHeight)
        window.scrollBy(0,-100);
}

function replace(index, replaceWith) {
    var els = Array.from(document.querySelectorAll('.find-ext-occr' + index));

    if(els.length == 0)
        return;

    els.shift().innerText = replaceWith;
    for(var elsIndex = 0; elsIndex < els.length; elsIndex++)
        els[elsIndex].innerText = '';
}

function replaceAll(replaceWith) {
    var els = Array.from(document.querySelectorAll("[class*='find-ext-occr']"));

    var currentOccurrence = null;
    for(var index = 0; index < els.length; index++) {
        var el = els[index];
        var occrClassName = el.getAttribute('class').match(/find-ext-occr\d*/)[0];
        var occurrenceFromClass = parseInt(occrClassName.replace('find-ext-occr', ''));

        if(occurrenceFromClass != currentOccurrence) {
            currentOccurrence = occurrenceFromClass;
            el.innerText = replaceWith
        }
        else
            el.innerText = '';
    }
}

//Bubbling up the DOM tree, locate any highlighted anchor element and follow link once found
function enterLink() {
    var els = document.getElementsByClassName(orangeHighlightClass);
    for(var index = 0; index < els.length; index ++) {
        var el = els[index];
        while (el.parentElement) {
            el = el.parentElement;
            if (el.tagName.toLowerCase() == 'a')
                return el.click();
        }
    }
}

//Unwrap all elements that have the yellowHighlightClass/orangeHighlightClass class
function restore() {
    for(var argIndex = 0; argIndex < arguments.length; argIndex++) {
        var els = Array.from(document.querySelectorAll('.' + arguments[argIndex]));

        for(var elsIndex = 0; elsIndex < els.length; elsIndex++) {
            var el = els[elsIndex];
            var parent = el.parentElement;

            while(el.firstChild)
                parent.insertBefore(el.firstChild, el);

            parent.removeChild(el);
            parent.normalize();
        }
    }
}

//Remove class from all element with that class
function restoreClass() {
    for(var argIndex = 0; argIndex < arguments.length; argIndex++) {
        var els = Array.from(document.querySelectorAll('.' + arguments[argIndex]));

        for(var elsIndex = 0; elsIndex < els.length; elsIndex++)
            els[elsIndex].classList.remove(arguments[argIndex]);
    }
}
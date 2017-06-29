"use strict";

var yellowHighlightClass = "find-ext-highlight-yellow";
var orangeHighlightClass = "find-ext-highlight-orange";

chrome.runtime.onMessage.addListener(function(message, sender, response) {
    var index;
    if(message.action == 'highlight_update') {
        var occurrenceMap = message.occurrenceMap;
        var regex = message.regex;
        index = message.index;
        restore(yellowHighlightClass, orangeHighlightClass);
        highlightAll(occurrenceMap, regex);
        seekHighlight(index);
    }
    else if(message.action == 'highlight_seek') {
        index = message.index;
        restoreClass(orangeHighlightClass);
        seekHighlight(index);
    }
    else if(message.action == 'highlight_restore') {
        restore(yellowHighlightClass, orangeHighlightClass);
    }
});

//Highlight all occurrences of regular expression on the page
function highlightAll(occurrenceMap, regex) {
    var occIndex = 0;
    var tags = {occIndex: null, openingMarkup: '', closingMarkup: '</span>', update: function(index) {
        if(this.occIndex != index) {
            this.occIndex = index;
            this.openingMarkup = '<span class="find-ext-highlight-yellow find-ext-occr' + index + '">';
        }
    }};
    regex = regex.replace(/ /g, '\\s');
    regex = new RegExp(regex, 'm');

    //Iterate each text group
    for(var index = 0; index < occurrenceMap.groups; index++) {
        var uuids = occurrenceMap[index].uuids;
        var groupText = '', charMap = {}, charIndexMap = [];

        //Build groupText, charMap and charIndexMap
        var count = 0;
        for(var uuidIndex = 0; uuidIndex < uuids.length; uuidIndex++) {
            var $el = document.getElementById(uuids[uuidIndex]);
            var text = $el.childNodes[0].nodeValue;

            if(!text)
                continue;

            text = decode(text);
            groupText += text;

            for(var stringIndex = 0; stringIndex < text.length; stringIndex++) {
                charIndexMap.push(count);
                charMap[count++] = {char: text.charAt(stringIndex), nodeUUID: uuids[uuidIndex], nodeIndex: stringIndex, ignorable: false, matched: false};
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
            for(currIndex = first; currIndex <= last; currIndex++)
                charMap[currIndex].matched = true;

            for(currIndex = 0; currIndex < offset+len; currIndex++)
                charIndexMap.splice(0,1);

            groupText = groupText.substring(offset+len);
        }

        //Wrap matched characters in an element with class yellowHighlightClass and occurrenceIdentifier
        var matchGroup = {text: '', groupUUID: null};
        var inMatch = false;
        for(var key = 0; key < charMap.length; key++) {
            tags.update(occIndex);

            //Performed Initially
            if(matchGroup.groupUUID == null)
                matchGroup.groupUUID = charMap[key].nodeUUID;

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
    var classSelector = '.find-ext-occr' + index;
    var $el = $(classSelector);
    $el.addClass(orangeHighlightClass);

    $el.get(0).scrollIntoView(true);
    var docHeight = Math.max(document.documentElement.clientHeight, document.documentElement.offsetHeight, document.documentElement.scrollHeight);
    var bottomScrollPos = window.pageYOffset + window.innerHeight;
    if(bottomScrollPos + 100 < docHeight)
        window.scrollBy(0,-100);
}

//Unwrap all elements that have the yellowHighlightClass/orangeHighlightClass class
function restore() {
    function unwrapContentFromClass(className) {
        var classSelector = '.' + className;
        var $el = $(classSelector);

        if($el.length == 0)
            return;

        var $parent = $el.parent();
        $el.replaceWith(function() {
            return $(this).contents();
        });

        for(var index = 0; index < $parent.length; index++)
            $parent[index].normalize();
    }

    for(var argIndex = 0; argIndex < arguments.length; argIndex++)
        unwrapContentFromClass(arguments[argIndex]);
}

//Remove class from all element with that class
function restoreClass() {
    function removeClassFromElement(className) {
        var classSelector = '.' + className;
        $(classSelector).removeClass(className);
    }

    for(var argIndex = 0; argIndex < arguments.length; argIndex++)
        removeClassFromElement(arguments[argIndex]);
}
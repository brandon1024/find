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
    else if(message.action == 'highlight_next') {
        index = message.index;
        restoreClass(orangeHighlightClass);
        seekHighlight(index);
    }
    else if(message.action == 'highlight_previous') {
        index = message.index;
        restoreClass(orangeHighlightClass);
        seekHighlight(index);
    }
    else if(message.action == 'highlight_restore') {
        restore(yellowHighlightClass, orangeHighlightClass);
    }
});

//Highlight all occurrences on the page
function highlightAll(occurrenceMap, regex) {
    var occIndex = 0;
    regex = regex.replace(/ /g, '\\s');
    regex = new RegExp(regex, 'gm');

    for(var index = 0; index < occurrenceMap.groups; index++) {
        var uuids = occurrenceMap[index].uuids;
        var groupText = '', charMap = {}, charIndexMap = [];

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

        //format text nodes (whitespaces) whilst keeping references to their nodes in the DOM, updating charMap ignorable characters
        if(!occurrenceMap[index].preformatted) {
            var info;
            while(info = /[\t\n\r]/.exec(groupText)) {
                charMap[charIndexMap[info.index]].ignorable = true;
                groupText = groupText.replace(/[\t\n\r]/, ' ');
            }

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
            }

            for(currIndex = 0; currIndex < offset+len; currIndex++)
                charIndexMap.splice(0,1);

            groupText = groupText.substring(offset+len);
        }

        //Wrap matched characters in an element with class yellowHighlightClass and occurrenceIdentifier
        var matchGroup = {text: '', groupUUID: null};
        var inMatch = false;
        for(var key in charMap) {
            var openingMarkup = '<span class="' + yellowHighlightClass + ' ' + generateOccurrenceIdentifier(occIndex) + '">';
            var closingMarkup = '</span>';

            if(matchGroup.groupUUID == null)
                matchGroup.groupUUID = charMap[key].nodeUUID;

            if(matchGroup.groupUUID != charMap[key].nodeUUID) {
                document.getElementById(matchGroup.groupUUID).innerHTML = matchGroup.text;
                matchGroup.text = '';
                matchGroup.groupUUID = charMap[key].nodeUUID;

                if(inMatch)
                    matchGroup.text += openingMarkup;
            }

            if(charMap[key].matched) {
                if(!inMatch) {
                    inMatch = charMap[key].matched;
                    matchGroup.text += openingMarkup;
                }
            }
            else {
                if(inMatch) {
                    inMatch = charMap[key].matched;
                    matchGroup.text += closingMarkup;
                    occIndex++;
                }
            }

            matchGroup.text += encode(charMap[key].char);
        }
        document.getElementById(matchGroup.groupUUID).innerHTML = matchGroup.text;
    }
}

function seekHighlight(index) {
    var classSelector = '.' + generateOccurrenceIdentifier(index);
    var $el = $(classSelector);
    $el.addClass(orangeHighlightClass);
    $el.get(0).scrollIntoView(true);
}

//Unwrap all elements that have the yellowHighlightClass/orangeHighlightClass class
function restore() {
    function unwrapContentFromClass(className) {
        var classSelector = '.' + className;
        var $el = $(classSelector);

        if($el.length == 0)
            return;

        var $parent = $el.parent();
        $(classSelector).contents().unwrap();

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

//Generate an occurrence identifier by the occurrenceIndex
function generateOccurrenceIdentifier(occurrenceIndex) {
    return 'find-ext-occr' + occurrenceIndex;
}
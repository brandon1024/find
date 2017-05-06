//Uses helper methods from helper.js
var uuidYellow = generateElementUUID();
var uuidOrange = generateElementUUID();

chrome.runtime.onMessage.addListener(function(message, _, _) {
    if(message.action == 'highlight_update') {
        restore(uuidYellow, uuidOrange);

        var occurrenceMap = message.occurrenceMap;
        var regex = message.regex;
        var index = message.index;
        highlightAll(occurrenceMap, regex);
        seekHighlight(index);
    }
    else if(message.action == 'highlight_next') {
        //Find and remove uuidOrange class from element
        restoreClass(uuidOrange);

        //Add uuidOrange class to element at the specified index
        //TODO: Mike, you got this :D Just find the span elements
        //TODO: with class 'Fnd-Occr#' (using helper method), and add the class uuidOrange
    }
    else if(message.action == 'highlight_previous') {
        //Find and remove uuidOrange class from element
        restoreClass(uuidOrange);

        //Add uuidOrange class to element at the specified index
        //TODO: You can also combine highlight_next and highlight_previous
        //TODO: into a single action. Maybe call it highlight_seek or something, your call.
    }
    else if(message.action == 'highlight_restore') {
        restore(uuidYellow, uuidOrange);
    }
});

function highlightAll(occurrenceMap, regex) {
    var occIndex = 0;
    for(var index = 0; index < occurrenceMap.groups; index++) {
        regex = new RegExp(regex);
        var uuids = occurrenceMap[index].uuids;
        var groupText = '', charMap = {}, charIndexMap = [];

        var count = 0;
        for(var uuidIndex = 0; uuidIndex < uuids.length; uuidIndex++) {
            var $el = document.getElementById(uuids[uuidIndex]);
            var text = $el.childNodes[0].nodeValue;
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

            var first = charIndexMap[offset];
            var last = charIndexMap[offset + len - 1];
            for(currIndex = first; currIndex <= last; currIndex++) {
                charMap[currIndex].matched = true;
            }

            for(currIndex = 0; currIndex < offset+len; currIndex++)
                charIndexMap.splice(0,1);

            groupText = groupText.substring(offset+len);
        }

        //Wrap matched characters in an element with ID="occurrenceIdentifier" and class uuidYellow
        var matchGroup = {text: '', groupUUID: null};
        var inMatch = false;
        var openingMarkup = '<span id="' + generateOccurrenceIdentifier(occIndex) +'" class="' + uuidYellow + '">';
        var closingMarkup = '</span>';
        for(var key in charMap) {
            if(matchGroup.groupUUID == null)
                matchGroup.groupUUID = charMap[key].nodeUUID;

            if(matchGroup.groupUUID != charMap[key].nodeUUID) {
                document.getElementById(matchGroup.groupUUID).innerHTML = matchGroup.text;
                matchGroup.text = '';
                matchGroup.groupUUID = charMap[key].nodeUUID;
                occIndex++;
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
                }
            }

            matchGroup.text += charMap[key].char;
        }
        document.getElementById(matchGroup.groupUUID).innerHTML = matchGroup.text;
    }
}

function seekHighlight(index) {
    //TODO: Mike :)
}

//unwrap all elements that have the uuidYellow/uuidOrange class
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

function generateOccurrenceIdentifier(occurrenceIndex) {
    return 'Fnd-Occr' + occurrenceIndex;
}
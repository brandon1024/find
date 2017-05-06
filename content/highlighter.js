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
        var occurrenceIdentifier = generateOccurrenceIdentifier(occIndex);
        var uuids = occurrenceMap[index].uuids;
        var groupText = '', charMap = {}, charIndexMap = [];

        var count = 0;
        for(var uuidIndex = 0; uuidIndex < uuids.length; uuidIndex++) {
            var $el = document.getElementById(uuids[uuidIndex]);
            var text = $el.childNodes[0].nodeValue;

            $el.innerHTML = $el.childNodes[0].nodeValue.replace(regex, function(x) {
                return "<span id='" + 'f2' + "' class='" + uuidYellow + "' style='background-color:#FFFF00'>" + x + "</span>";
            });

            groupText += text;

            for(var stringIndex = 0; stringIndex < text.length; stringIndex++) {
                charIndexMap.push(count);
                charMap[count++] = {char: text.charAt(stringIndex), nodeIndex: stringIndex, nodeUUID: uuids[uuidIndex], ignorable: false, matched: false};
            }
        }

        //TODO: Brandon: Format text nodes (whitespaces) whilst keeping references to their nodes in the DOM, updating charMap ignorable characters

        //TODO: Brandon: Perform complex regex search, updating charMap matched characters

        //TODO: Brandon: Wrap matched characters in an element with ID="occurrenceIdentifier" and class uuidYellow
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
        console.log($parent);
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
//Uses helper methods from helper.js
var uuidYellow = generateElementUUID();
var uuidOrange = generateElementUUID();

chrome.runtime.onMessage.addListener(function(message, _, _) {
    if(message.action == 'highlight_update') {
        //unwrap all elements that have the uuidYellow/uuidOrange class
        unwrapContentFromClass(uuidYellow);
        unwrapContentFromClass(uuidOrange);

        //Add highlight markup to all text that matches the regex, with uuidYellow class
        //Add uuidOrange class to element at the specified index


        console.group('Action:', message.action);
        console.log('Occurrence Map:', message.occurrenceMap);
        console.log('Index:', message.index);
        console.log('Regex:', message.regex);
        console.groupEnd();
    }
    else if(message.action == 'highlight_next') {
        //Find and remove uuidOrange class from element
        //Add uuidOrange class to element at the specified index

        console.group('Action:', message.action);
        console.log('Occurrence Map:', message.occurrenceMap);
        console.log('Index:', message.index);
        console.log('Regex:', message.regex);
        console.groupEnd();
    }
    else if(message.action == 'highlight_previous') {
        //Find and remove uuidOrange class from element
        //Add uuidOrange class to element at the specified index
        console.group('Action:', message.action);
        console.log('Occurrence Map:', message.occurrenceMap);
        console.log('Index:', message.index);
        console.log('Regex:', message.regex);
        console.groupEnd();
    }
    else if(message.action == 'highlight_restore') {
        //unwrap all elements that have the uuidYellow/uuidOrange class
        unwrapContentFromClass(uuidYellow);
        unwrapContentFromClass(uuidOrange);

        console.group('Action:', message.action);
        console.groupEnd();
    }
});

function unwrapContentFromClass(className) {
    var classSelector = '.' + className;
    $(classSelector).contents().unwrap();
}


/**
 * This function highlights the targeted string in the regex search
 * @param el is the DOM element
 * @param pat is the regex pattern entered in the search bar
 * @returns {void|string|XML} returns the DOM element with values highlighted
 */
function highlightAllMatch(el, pat) {
    return el.replace(pat, function (x){return "<span id='" + uuid + "' style='background-color:#FFFF00'>" + x + "</span>";});
}

/**
 * This function will highlight a marked DOM text selection in orange
 * @param el is the DOM element
 * @returns {string} returns the marked DOM element with orange highlighted
 */
function setHighlightOrange(el) {
    return el.getElementById(uuid).style.backgroundColor = "#FFA500";
}

/**
 * This function will highlight a marked DOM text selection in yellow
 * @param el is the DOM element
 * @returns {string} returns the marked DOM searchable text yellow highlighted
 */
function setHighlightYellow(el) {
    return el.getElementById(uuid).style.backgroundColor = "#FFFF00";
}

/**
 * This function removes all highlighting which contains specific find+ ID
 * @param el is the DOM element
 * @returns {*|jQuery} returns un-highlighted DOM element
 */
function removeAllHighlight(el) {
    return $(uuid, $(el).context).contents().unwrap();
}
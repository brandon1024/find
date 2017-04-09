console.log('Extension popup script started');

console.group('Establishing port to background script', '(Message API)');
var port = chrome.runtime.connect({name: "popup_to_backend_port"});
console.log('Successfully opened port to background script');
console.groupCollapsed('Details:');
console.log('Port Name:', port.name);
console.groupEnd();
console.groupEnd();

/**
 * Load event listeners for popup components
 */
window.onload = function addListeners() {
    console.group('Spawning extension popup event listeners');

    document.getElementById('search-next-button').addEventListener('click', nextHighlight);
    document.getElementById('search-prev-button').addEventListener('click', previousHighlight);
    document.getElementById('close-button').addEventListener('click', closeExtension);
    document.getElementById('search-field').addEventListener('input', updateHighlight);
    document.getElementById('search-field').addEventListener('input', updateLocalStorage);
    document.getElementById('search-field').addEventListener('keyup', handleKeyPress, true);
    console.log('Successfully spawned popup event listeners');

    console.groupCollapsed('Details:');
    console.groupCollapsed('Element ID: searchNextBtn');
    console.log('Event Type: click event');
    console.log('Action: next');
    console.groupEnd();
    console.groupCollapsed('Element ID: searchPrevBtn');
    console.log('Event Type: click event');
    console.log('Action: previous');
    console.groupEnd();
    console.groupCollapsed('Element ID: closeBtn');
    console.log('Event Type: click event');
    console.log('Action: close');
    console.groupEnd();
    console.groupCollapsed('Element ID: searchField');
    console.log('Event Type: keypress event');
    console.log('Action: update');
    console.groupEnd();
    console.groupEnd();
    console.groupEnd();

    retrieveLastSearch();
};

/**
 * Listen for messages from the background script
 */
console.group('Spawning onMessage event listener from background script', '(Message API)');
port.onMessage.addListener(function listener(response) {
    console.group('Message Received', '(Message API)');
    if(response.action == 'index_update') {
        console.groupCollapsed('Update:');
        console.log('Index:', response.index);
        console.log('Total:', response.total);
        console.groupEnd();
        updateIndexText(response.index, response.total);
    }
    else if(response.action == 'invalid_regex') {
        updateIndexText();
    }
    else {
        console.error('Unrecognized action:', response.action);
    }
    console.groupEnd();
});
console.log('Successfully spawned event listener');
console.groupEnd();

/**
 * Perform mass update
 */
function updateHighlight() {
    var regex = getSearchFieldText();

    if(regex.length == 0) {
        updateIndexText();
        return;
    }

    var action = 'update';
    invokeAction({action: action, regex: regex});
}

/**
 * Highlight next occurrence of regex
 */
function nextHighlight() {
    var action = 'next';
    invokeAction({action: action});
}

/**
 * Highlight previous occurrence of regex
 */
function previousHighlight() {
    var action = 'previous';
    invokeAction({action: action});
}

function invokeAction(params) {
    console.groupCollapsed('Action Invoked:');

    console.groupCollapsed('Details:');
    console.log('Port:', port.name);
    for(var key in params)
        console.log(key + ': ' + params[key]);

    port.postMessage(params);
    console.log('Message Sent', '(Message API)');
    console.groupEnd();
    console.groupEnd();
}

/**
 * Close the extension
 */
function closeExtension() {
    console.group('Closing port to background script', '(Message API)');
    port.disconnect();
    console.log('Successfully closed port to background script');
    console.groupEnd();
    console.log('Suspending background script');
    window.close();
}

/**
 * Handles keyboard shortcuts for proceeding to the previous occurrence,
 * next occurrence, and for closing the extension.
 * @param e the keypress event
 */
function handleKeyPress(e) {
    if (e.keyCode == 13 && e.shiftKey) {
        previousHighlight();
    }
    else if (e.keyCode == 13 && e.ctrlKey) {
        closeExtension();
    }
    else if (e.keyCode == 13) {
        nextHighlight();
    }
}

/**
 * Converts current search field text to JSON payload
 * and send to storeDataToLocalStorage() to store.
 */
function updateLocalStorage() {
    var payload = {'previousSearch': document.getElementById('search-field').value};
    storeDataToLocalStorage(payload);
}

/**
 * Stores input payload in local storage
 * @param payload JSON object to be stored
 */
function storeDataToLocalStorage(payload) {
    chrome.storage.local.set({'payload': payload}, function callback() {
        console.log('Previous search: \"' + payload.previousSearch + '\" saved');
    });
}

/**
 * Retrieve locally stored payload to be
 * handled by handleDataFromStorage()
 */
function retrieveLastSearch() {
    chrome.storage.local.get('payload', function(data) {
        console.log('Receiving Payload:', data, ' from local storage');
        handleDataFromStorage(data)
    });
}

/**
 * Receives payload from storage and gets previousSearch JSON
 * to be sent to changeSearchFieldText()
 * @param data is received payload to parse
 */
function handleDataFromStorage(data) {
    var storagePayload = data.payload;
    var previousSearchText = storagePayload.previousSearch;

    changeSearchFieldText(previousSearchText);
}

/**
 * gets previous search text and sets it to search field text,
 * then selects search field
 * @param text to fill search field value
 */
function changeSearchFieldText(text) {
    document.getElementById('search-field').value = text;
    document.getElementById('search-field').select();
}

/**
 * Retrieve search field text
 */
function getSearchFieldText() {
    return document.getElementById('search-field').value;
}

/**
 * Update index text
 */
function updateIndexText() {
    if(arguments.length == 0)
        document.getElementById('index-text').innerText = '';
    else if(arguments.length == 2)
        document.getElementById('index-text').innerText = numberWithCommas(arguments[0]) + ' of ' + numberWithCommas(arguments[1]);
}

/**
 * Formats numbers to have thousands comma delimiters
 */
function numberWithCommas(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}
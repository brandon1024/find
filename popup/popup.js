var port = chrome.runtime.connect({name: "popup_to_backend_port"});

/**
 * Load event listeners for popup components
 */
window.onload = function addListeners() {
    document.getElementById('search-next-button').addEventListener('click', nextHighlight);
    document.getElementById('search-prev-button').addEventListener('click', previousHighlight);
    document.getElementById('close-button').addEventListener('click', closeExtension);
    document.getElementById('search-field').addEventListener('input', updateHighlight);
    document.getElementById('search-field').addEventListener('input', updateLocalStorage);
    document.getElementById('search-field').addEventListener('keyup', handleKeyPress, true);

    retrieveLastSearch();
};

/**
 * Listen for messages from the background script
 */
port.onMessage.addListener(function listener(response) {
    if(response.action == 'index_update') {
        updateIndexText(response.index, response.total);

        if(response.index == 0 && response.total == 0)
            disableButtons();
        else
            enableButtons();
    }
    else if(response.action == 'empty_regex') {
        updateIndexText();
        disableButtons();
    }
    else if(response.action == 'invalid_regex') {
        updateIndexText();
        disableButtons();
    }
    else {
        console.error('Unrecognized action:', response.action);
        disableButtons();
    }
});

/**
 * Perform mass update
 */
function updateHighlight() {
    var regex = getSearchFieldText();
    var action = 'update';
    invokeAction({action: action, regex: regex});
}

/**
 * Highlight next occurrence of regex
 */
function nextHighlight() {
    var action = 'next';
    invokeAction({action: action});
    document.getElementById('search-field').focus();
}

/**
 * Highlight previous occurrence of regex
 */
function previousHighlight() {
    var action = 'previous';
    invokeAction({action: action});
    document.getElementById('search-field').focus();
}

function invokeAction(params) {
    port.postMessage(params);
}

/**
 * Close the extension
 */
function closeExtension() {
    port.disconnect();
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
    chrome.storage.local.set({'payload': payload});
}

/**
 * Retrieve locally stored payload to be
 * handled by handleDataFromStorage()
 */
function retrieveLastSearch() {
    chrome.storage.local.get('payload', function(data) {
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
        document.getElementById('index-text').innerText = formatNumber(arguments[0]) + ' of ' + formatNumber(arguments[1]);
}

function enableButtons() {
    document.getElementById('search-prev-button').disabled = false;
    document.getElementById('search-next-button').disabled = false;
}

function disableButtons() {
    document.getElementById('search-prev-button').disabled = true;
    document.getElementById('search-next-button').disabled = true;
}

/**
 * Formats numbers to have thousands comma delimiters
 */
function formatNumber(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}
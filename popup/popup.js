"use strict";

var port = chrome.runtime.connect({name: "popup_to_backend_port"});
var initialized = false;

//Load event listeners for popup components
window.onload = function addListeners() {
    document.getElementById('search-next-button').addEventListener('click', nextHighlight);
    document.getElementById('search-prev-button').addEventListener('click', previousHighlight);
    document.getElementById('close-button').addEventListener('click', closeExtension);
    document.getElementById('search-field').addEventListener('input', updateHighlight);
    document.getElementById('search-field').addEventListener('input', updateLocalStorage);
    document.getElementById('search-field').addEventListener('keyup', handleKeyPress, true);

    document.body.addEventListener('click', function(){
        document.getElementById('search-field').focus();
    });

    chrome.tabs.query({'active': true, currentWindow: true}, function (tabs) {
        var url = tabs[0].url;
        if(url.match(/chrome:\/\/.*/) || url.match(/https:\/\/chrome.google.com\/webstore\/.*/)) {
            document.getElementById('extension-message-body').style.display = 'initial';
            document.getElementById('extension-limitation-chrome-settings-text').style.display = 'initial';
        }
        else {
            chrome.tabs.executeScript( {
                code: "window.getSelection().toString();"
            }, function(selection) {
                var selectedText = selection[0];
                if(selectedText === undefined || selectedText == null || selectedText.length <= 0) {
                    retrieveLastSearch();
                }
                else {
                    changeSearchFieldText(selection[0]);
                    updateHighlight();
                }
            });
        }
    });
};

//Listen for messages from the background script
port.onMessage.addListener(function listener(response) {
    if(response.action == 'index_update') {
        showMalformedRegexIcon(false);
        updateIndexText(response.index, response.total);

        if(response.index == 0 && response.total == 0)
            disableButtons();
        else
            enableButtons();
    }
    else if(response.action == 'empty_regex') {
        showMalformedRegexIcon(false);
        updateIndexText();
        disableButtons();
    }
    else if(response.action == 'invalid_regex') {
        updateIndexText();
        disableButtons();
        showMalformedRegexIcon(true);
    }
    else {
        console.error('Unrecognized action:', response.action);
        disableButtons();
    }
});

//Perform update action
function updateHighlight() {
    initialized = true;
    
    var regex = getSearchFieldText();
    var action = 'update';
    invokeAction({action: action, regex: regex});
}

//Highlight next occurrence of regex
function nextHighlight() {
    if(!initialized) {
        updateHighlight();
        return;
    }

    var action = 'next';
    invokeAction({action: action});
    document.getElementById('search-field').focus();
}

//Highlight previous occurrence of regex
function previousHighlight() {
    if(!initialized) {
        updateHighlight();
        return;
    }

    var action = 'previous';
    invokeAction({action: action});
    document.getElementById('search-field').focus();
}

function invokeAction(params) {
    port.postMessage(params);
}

//Close the extension
function closeExtension() {
    port.disconnect();
    window.close();
}

//Handles keyboard shortcuts
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

//Converts current search field text to JSON payload and send to storeDataToLocalStorage() to store
function updateLocalStorage() {
    var payload = {'previousSearch': document.getElementById('search-field').value};
    storeDataToLocalStorage(payload);
}

//Stores input payload in local storage
function storeDataToLocalStorage(payload) {
    chrome.storage.local.set({'payload': payload});
}

//Retrieve locally stored payload to be handled by handleDataFromStorage()
function retrieveLastSearch() {
    chrome.storage.local.get('payload', function(data) {
        handleDataFromStorage(data);
    });
}

//Receives payload from storage and gets previousSearch JSON to be sent to changeSearchFieldText()
function handleDataFromStorage(data) {
    var storagePayload = data.payload;
    var previousSearchText = storagePayload.previousSearch;

    changeSearchFieldText(previousSearchText);
    if(previousSearchText.length > 0)
        enableButtons();
}

//gets previous search text and sets it to search field text, then selects search field
function changeSearchFieldText(text) {
    document.getElementById('search-field').value = text;
    document.getElementById('search-field').select();
}

//Retrieve search field text
function getSearchFieldText() {
    return document.getElementById('search-field').value;
}

//Update index text
function updateIndexText() {
    if(arguments.length == 0)
        document.getElementById('index-text').innerText = '';
    else if(arguments.length == 2)
        document.getElementById('index-text').innerText = formatNumber(arguments[0]) + ' of ' + formatNumber(arguments[1]);
}

//Show or hide red exclamation icon in the extension popup
function showMalformedRegexIcon(flag) {
    if(flag)
        document.getElementById('invalid-regex-icon').style.display = 'initial';
    else
        document.getElementById('invalid-regex-icon').style.display = 'none';
}

//Enable next and previous buttons
function enableButtons() {
    document.getElementById('search-prev-button').disabled = false;
    document.getElementById('search-next-button').disabled = false;
}

//Disable next and previous buttons
function disableButtons() {
    document.getElementById('search-prev-button').disabled = true;
    document.getElementById('search-next-button').disabled = true;
}

//Formats numbers to have thousands comma delimiters
function formatNumber(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

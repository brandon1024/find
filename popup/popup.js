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
    document.getElementsByClassName('max-results-slider')[0].addEventListener('input', updateMaxHighlights);

    document.body.addEventListener('click', function(){
        document.getElementById('search-field').focus();
    });

    document.getElementById('search-field').addEventListener('keyup', function(e){
        if (e.keyCode == 13 && e.shiftKey)
            previousHighlight();
        else if (e.keyCode == 27 || e.keyCode == 13 && e.ctrlKey)
            closeExtension();
        else if (e.keyCode == 13)
            nextHighlight();
        else if(e.keyCode == 79 && e.ctrlKey) {
            var el = document.getElementById("regex-options");
            if(el.style.display == 'none' || el.style.display == '')
                el.style.display = 'inherit';
            else
                el.style.display = 'none';
        }
    }, true);
};

chrome.tabs.query({'active': true, currentWindow: true}, function (tabs) {
    var url = tabs[0].url;
    if(!(url.match(/chrome:\/\/newtab\//)) && (url.match(/chrome:\/\/.*/) || url.match(/https:\/\/chrome.google.com\/webstore\/.*/))) {
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

//Listen for messages from the background script
port.onMessage.addListener(function listener(response) {
    if(response.action == 'index_update') {
        showMalformedRegexIcon(false);
        updateIndexText(response.index, response.total);

        if(response.index == 0 && response.total == 0)
            enableButtons(false);
        else
            enableButtons(true);
    }
    else if(response.action == 'empty_regex') {
        showMalformedRegexIcon(false);
        updateIndexText();
        enableButtons(false);
    }
    else if(response.action == 'invalid_regex') {
        updateIndexText();
        enableButtons(false);
        showMalformedRegexIcon(true);
    }
    else {
        console.error('Unrecognized action:', response.action);
        enableButtons(false);
    }
});

//Perform update action
function updateHighlight() {
    initialized = true;
    
    var regex = getSearchFieldText();
    var action = 'update';
    port.postMessage({action: action, regex: regex});
}

//Highlight next occurrence of regex
function nextHighlight() {
    if(!initialized) {
        updateHighlight();
        return;
    }

    var action = 'next';
    port.postMessage({action: action});
    document.getElementById('search-field').focus();
}

//Highlight previous occurrence of regex
function previousHighlight() {
    if(!initialized) {
        updateHighlight();
        return;
    }

    var action = 'previous';
    port.postMessage({action: action});
    document.getElementById('search-field').focus();
}

//Close the extension
function closeExtension() {
    port.disconnect();
    window.close();
}

//Converts current search field text to JSON payload and send to storeDataToLocalStorage() to store
function updateLocalStorage() {
    var payload = {'previousSearch': getSearchFieldText()};
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
    if(!data.payload)
        return;

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

function updateMaxHighlights() {
    var rangeValue = document.getElementsByClassName('max-results-slider')[0].value;
    document.getElementsByClassName('max-results-slider-value')[0].innerText = rangeValue == 500 ? '∞' : rangeValue;
}

//Show or hide red exclamation icon in the extension popup
function showMalformedRegexIcon(flag) {
    document.getElementById('invalid-regex-icon').style.display = flag ? 'initial' : 'none';
}

//Enable next and previous buttons
function enableButtons() {
    if(arguments.length == 1 && !arguments[0]) {
        document.getElementById('search-prev-button').disabled = true;
        document.getElementById('search-next-button').disabled = true;
        return;
    }

    document.getElementById('search-prev-button').disabled = false;
    document.getElementById('search-next-button').disabled = false;
}

//Formats numbers to have thousands comma delimiters
function formatNumber(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

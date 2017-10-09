'use strict';

var port = chrome.runtime.connect({name: 'popup_to_backend_port'});
var options = {'find_by_regex': true, 'match_case': true, 'max_results': 0};
var initialized = false;

//Load event listeners for popup components
window.onload = function addListeners() {
    document.getElementById('search-next-button').addEventListener('click', nextHighlight);
    document.getElementById('search-prev-button').addEventListener('click', previousHighlight);
    document.getElementById('close-button').addEventListener('click', closeExtension);
    document.getElementById('search-field').addEventListener('input', updateHighlight);
    document.getElementById('search-field').addEventListener('input', updateSavedPreviousSearch);
    document.getElementById('regex-option-regex-disable-toggle').addEventListener('change', updateOptions);
    document.getElementById('regex-option-case-insensitive-toggle').addEventListener('change', updateOptions);
    document.getElementById('max-results-slider').addEventListener('input', updateOptions);

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
            var $el = document.getElementById('regex-options');
            if($el.style.display == 'none' || $el.style.display == '')
                $el.style.display = 'inherit';
            else
                $el.style.display = 'none';
        }
    }, true);

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
                    retrieveSavedLastSearch();
                }
                else {
                    setSearchFieldText(selection[0]);
                    updateHighlight();
                }
            });
        }
    });

    retrieveSavedOptions();
};

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
    port.postMessage({action: action, regex: regex, options: options});
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

//Commit options in memory to local storage
function updateSavedOptions() {
    chrome.storage.local.set({'options': options});
}

//Commit text in search field to local storage
function updateSavedPreviousSearch() {
    var payload = {'previousSearch': getSearchFieldText()};
    chrome.storage.local.set(payload);
}

//Retrieve last search from local storage, set the search field text, and enable buttons if text length > 0
function retrieveSavedLastSearch() {
    chrome.storage.local.get('previousSearch', function(data) {
        var previousSearchText = data.previousSearch;
        if(previousSearchText == null)
            return;

        setSearchFieldText(previousSearchText);
        if(previousSearchText.length > 0)
            enableButtons();
    });
}

//Retrieve saved options from local storage and update options panel
function retrieveSavedOptions() {
    chrome.storage.local.get('options', function(data) {
        if(data.options == null) {
            updateSavedOptions();
            return;
        }

        options = data.options;

        document.getElementById('regex-option-regex-disable-toggle').checked = options.find_by_regex;
        document.getElementById('regex-option-case-insensitive-toggle').checked = options.match_case;

        var rangeValues = [1,50,100,150,200,250,300,350,400,450,0];
        if(options.max_results == 0)
            document.getElementById('max-results-slider-value').innerText = '∞';
        else
            document.getElementById('max-results-slider-value').innerText = options.max_results.toString();

        document.getElementById('max-results-slider').value = rangeValues.indexOf(options.max_results);
    });
}

//Update options in memory with data from options panel
function updateOptions() {
    options.find_by_regex = document.getElementById('regex-option-regex-disable-toggle').checked;
    options.match_case = document.getElementById('regex-option-case-insensitive-toggle').checked;

    var rangeValues = [1,50,100,150,200,250,300,350,400,450,0];
    var rangeIndex = document.getElementById('max-results-slider').value;
    if(rangeValues[rangeIndex] == 0)
        document.getElementById('max-results-slider-value').innerText = '∞';
    else
        document.getElementById('max-results-slider-value').innerText = rangeValues[rangeIndex].toString();

    options.max_results = rangeValues[rangeIndex];

    updateSavedOptions();
    updateHighlight();
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

//Update index text
function updateIndexText() {
    if(arguments.length == 0)
        document.getElementById('index-text').innerText = '';
    else if(arguments.length == 2)
        document.getElementById('index-text').innerText = formatNumber(arguments[0]) + ' of ' + formatNumber(arguments[1]);
}

//gets previous search text and sets it to search field text, then selects search field
function setSearchFieldText(text) {
    document.getElementById('search-field').value = text;
    document.getElementById('search-field').select();
}

//Retrieve search field text
function getSearchFieldText() {
    return document.getElementById('search-field').value;
}

//Formats numbers to have thousands comma delimiters
function formatNumber(x) {
    var parts = x.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
}

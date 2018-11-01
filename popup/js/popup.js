'use strict';

window.browser = (() => {
    return window.chrome || window.browser;
})();

let port = browser.runtime.connect({name: 'popup_to_backend_port'});
let options = {'find_by_regex': true, 'match_case': true, 'persistent_highlights': false, 'max_results': 0};
let initialized = false;
let index = 0;

window.onload = () => {
    //Load event listeners for popup components
    document.getElementById('regex-option-regex-disable-toggle').addEventListener('change', updateOptions);
    document.getElementById('regex-option-case-insensitive-toggle').addEventListener('change', updateOptions);
    document.getElementById('regex-option-persistent-highlights-toggle').addEventListener('change', updateOptions);
    document.getElementById('max-results-slider').addEventListener('input', updateOptions);
    document.getElementById('replace-next-button').addEventListener('click', replaceNext);
    document.getElementById('replace-all-button').addEventListener('click', replaceAll);

    document.getElementById('popup-body').addEventListener('click', () => {
        document.getElementById('search-field').focus();
    });

    document.body.addEventListener('keyup', (e) => {
        if(e.keyCode === 79 && e.ctrlKey && e.altKey) {
            //CTRL+ALT+O => Toggle Options Pane
            toggleReplacePane(false);
            toggleOptionsPane();
        } else if(e.keyCode === 82 && e.ctrlKey && e.altKey) {
            //CTRL+ALT+R => Toggle Replace Pane
            toggleOptionsPane(false);
            toggleReplacePane();
        }
    }, true);

    browser.tabs.query({'active': true, currentWindow: true}, (tabs) => {
        function getSelectedOrLastSearch() {
            browser.tabs.executeScript({code: "window.getSelection().toString();"}, function(selection) {
                if(selection[0]) {
                    document.getElementById('search-field').value = selection[0];
                    document.getElementById('search-field').select();
                    updateHighlight();
                } else {
                    retrieveSavedLastSearch();
                }
            });
        }

        //Ensure valid url, then get text selected on page or retrieve last search
        let url = tabs[0].url;
        if(url.match(/chrome:\/\/.*/) || url.match(/https:\/\/chrome\.google\.com\/webstore\/.*/) || url.match(/https:\/\/google\.[^\/]*\/_\/chrome\/newtab.*/)) {
            document.getElementById('extension-message-body').style.display = 'initial';
            document.getElementById('extension-limitation-chrome-settings-text').style.display = 'initial';
        } else if(url.match(/.*\.pdf$/i)) {
            document.getElementById('extension-message-body').style.display = 'initial';
            document.getElementById('extension-limitation-pdf-fileview-text').style.display = 'initial';
        } else if(url.match(/^file:\/\/.*/i)) {
            browser.tabs.sendMessage(tabs[0].id, {action: 'poll'}, (response) => {
                if(!response || !response.success) {
                    showOfflineFileErrorIcon(true);
                    updateIndexText();
                    enableButtons(false);
                } else {
                    getSelectedOrLastSearch();
                }
            });
        } else {
            getSelectedOrLastSearch();
        }
    });

    retrieveSavedOptions();
};

//Listen for messages from the background script
port.onMessage.addListener((response) => {
    switch(response.action) {
        case 'index_update':
            updateIndexText(response.index, response.total);
            index = response.index;

            //Enable buttons only if occurrence exists
            enableButtons(response.total !== 0);
            enableReplaceButtons(response.total !== 0);

            showMalformedRegexIcon(false);
            break;
        case 'invalidate':
            updateHighlight();
            break;
        case 'install':
            installedOrUpdated(response.details);
            break;
        case 'close':
            closeExtension();
            return;
        case 'empty_regex':
        case 'invalid_regex':
        default:
            showMalformedRegexIcon(response.action === 'invalid_regex');
            enableButtons(false);
            enableReplaceButtons(false);
            updateIndexText();
            index = 0;
    }
});

//Perform update action
function updateHighlight() {
    initialized = true;

    let regex = document.getElementById('search-field').value;
    port.postMessage({action: 'update', regex: regex, options: options});
}

//Highlight next occurrence of regex
function nextHighlight() {
    if(!initialized) {
        updateHighlight();
        return;
    }

    port.postMessage({action: 'next', options: options});
    document.getElementById('search-field').focus();
}

//Highlight previous occurrence of regex
function previousHighlight() {
    if(!initialized) {
        updateHighlight();
        return;
    }

    port.postMessage({action: 'previous', options: options});
    document.getElementById('search-field').focus();
}

//Replace current occurrences of regex with text
function replaceNext() {
    let replaceWith = document.getElementById('replace-field').value;
    port.postMessage({action: 'replace_next', index: index, replaceWith: replaceWith, options: options});
}

//Replace all occurrences of regex with text
function replaceAll() {
    let replaceWith = document.getElementById('replace-field').value;
    port.postMessage({action: 'replace_all', replaceWith: replaceWith, options: options});
}

//Follow the link under the current focus highlight in the page
function followLinkUnderFocus() {
    if(!initialized) {
        updateHighlight();
        return;
    }

    port.postMessage({action: 'follow_link', options: options});
}

//Close the extension
function closeExtension() {
    port.disconnect();
    window.close();
}

//Commit options in memory to local storage
function updateSavedOptions() {
    browser.storage.local.set({'options': options});
}

//Commit text in search field to local storage
function updateSavedPreviousSearch() {
    let payload = {'previousSearch': document.getElementById('search-field').value};
    browser.storage.local.set(payload);
}

//Retrieve last search from local storage, set the search field text, and enable buttons if text length > 0
function retrieveSavedLastSearch() {
    browser.storage.local.get('previousSearch', (data) => {
        let previousSearchText = data.previousSearch || '';
        if(previousSearchText === '' || browser.extension.inIncognitoContext)
            return;

        document.getElementById('search-field').value = previousSearchText;
        document.getElementById('search-field').select();
        if(previousSearchText.length > 0) {
            enableButtons();
        }
    });
}

//Retrieve saved options from local storage and update options panel
function retrieveSavedOptions() {
    browser.storage.local.get('options', function(data) {
        if(data.options == null) {
            updateSavedOptions();
            return;
        }

        options = data.options;

        document.getElementById('regex-option-regex-disable-toggle').checked = options.find_by_regex;
        document.getElementById('regex-option-case-insensitive-toggle').checked = options.match_case;
        document.getElementById('regex-option-persistent-highlights-toggle').checked = options.persistent_highlights;

        const rangeValues = [1,10,25,50,75,100,150,200,300,400,0];
        if(options.max_results === 0) {
            document.getElementById('max-results-slider-value').innerText = '∞';
        } else {
            document.getElementById('max-results-slider-value').innerText = options.max_results.toString();
        }

        document.getElementById('max-results-slider').value = rangeValues.indexOf(options.max_results);
    });
}

//Update options in memory with data from options panel
function updateOptions() {
    options.find_by_regex = document.getElementById('regex-option-regex-disable-toggle').checked;
    options.match_case = document.getElementById('regex-option-case-insensitive-toggle').checked;
    options.persistent_highlights = document.getElementById('regex-option-persistent-highlights-toggle').checked;

    const rangeValues = [1,10,25,50,75,100,150,200,300,400,0];
    let rangeIndex = document.getElementById('max-results-slider').value;
    if(rangeValues[rangeIndex] === 0) {
        document.getElementById('max-results-slider-value').innerText = '∞';
    } else {
        document.getElementById('max-results-slider-value').innerText = rangeValues[rangeIndex].toString();
    }

    options.max_results = rangeValues[rangeIndex];

    updateSavedOptions();
    updateHighlight();
}

//Display information icon on install or update
function installedOrUpdated(details) {
    let el = null;
    if(details.reason === 'install') {
        el = document.getElementById('install-information');
    } else if(details.reason === 'update') {
        el = document.getElementById('update-information');
    } else {
        return;
    }

    let timeoutFunction = () => {
        el.style.display = 'none';
    };

    //Show information icon
    el.style.display = 'initial';

    //Hide icon after 3 seconds
    let timeoutHandle = window.setTimeout(timeoutFunction, 3000);

    //Self-deregistering event handler
    let handler = (event) => {
        if(el === event.target) {
            return;
        }

        timeoutFunction();
        window.clearTimeout(timeoutHandle);
        document.getElementById('popup-body').removeEventListener('click', handler);
        document.getElementById('popup-body').removeEventListener('keyup', handler);
    };
    
    //Add event listeners
    document.getElementById('popup-body').addEventListener('click', handler);
    document.getElementById('popup-body').addEventListener('keyup', handler);

    el.addEventListener('mouseover', () => {
        window.clearTimeout(timeoutHandle);
    });

    el.addEventListener('mouseout', () => {
        timeoutHandle = window.setTimeout(timeoutFunction, 3000);
    });
}

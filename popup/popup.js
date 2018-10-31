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
    document.getElementById('search-next-button').addEventListener('click', nextHighlight);
    document.getElementById('search-prev-button').addEventListener('click', previousHighlight);
    document.getElementById('close-button').addEventListener('click', closeExtension);
    document.getElementById('search-field').addEventListener('input', updateHighlight);
    document.getElementById('search-field').addEventListener('input', updateSavedPreviousSearch);
    document.getElementById('regex-option-regex-disable-toggle').addEventListener('change', updateOptions);
    document.getElementById('regex-option-case-insensitive-toggle').addEventListener('change', updateOptions);
    document.getElementById('regex-option-persistent-highlights-toggle').addEventListener('change', updateOptions);
    document.getElementById('max-results-slider').addEventListener('input', updateOptions);
    document.getElementById('replace-next-button').addEventListener('click', replaceNext);
    document.getElementById('replace-all-button').addEventListener('click', replaceAll);

    document.getElementById('popup-body').addEventListener('click', () => {
        document.getElementById('search-field').focus();
    });

    document.getElementById('search-field').addEventListener('keyup', (e) => {
        if(e.ctrlKey && e.shiftKey && e.keyCode === 13) {
            //CTRL+SHIFT+ENTER => Enter Link
            followLinkUnderFocus();
            //SHIFT+ENTER => Previous Highlight (seek)
        } else if((e.keyCode === 13 && e.shiftKey) || (e.keyCode === 114 && e.shiftKey)) {
            previousHighlight();
        } else if(e.keyCode === 27 || e.keyCode === 13 && e.ctrlKey) {
            //ESC OR CTRL+ENTER => Close Extension
            closeExtension();
            //ENTER => Next Highlight (seek)
        } else if (e.keyCode === 13 || e.keyCode === 114) {
            nextHighlight();
        }
    }, true);

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

    document.getElementById('search-toggle-options-button').addEventListener('click', function() {
        toggleReplacePane(false);
        toggleOptionsPane();
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

function getStorageKey(){
    let key = 'previousSearch';
    if(browser.extension.inIncognitoContext){
        key += 'Incognito';
    }
    return key;
}

//Commit text in search field to local storage
function updateSavedPreviousSearch() {
    let payload = {};
    payload[getStorageKey()] = document.getElementById('search-field').value;
    browser.storage.local.set(payload);
}

//Retrieve last search from local storage, set the search field text, and enable buttons if text length > 0
function retrieveSavedLastSearch() {
    let key = getStorageKey();
    browser.storage.local.get(key, (data) => {
        let previousSearchText = data[key] || '';
        if(previousSearchText === '')
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

//Toggle Options Pane
function toggleOptionsPane() {
    let el = document.getElementById('regex-options');

    if(arguments.length === 1) {
        if (arguments.length === 1 && arguments[0]) {
            el.style.display = 'inherit';
        } else if (arguments.length === 1 && !arguments[0]) {
            el.style.display = 'none';
        }

        return;
    }

    if(el.style.display === 'none' || el.style.display === '') {
        el.style.display = 'inherit';
    } else {
        el.style.display = 'none';
    }
}

//Toggle Replace Pane
function toggleReplacePane() {
    let el = document.getElementById('replace-body');

    if(arguments.length === 1) {
        if (arguments[0]) {
            el.style.display = 'inherit';
        } else {
            el.style.display = 'none';
        }

        return;
    }

    if(el.style.display === 'none' || el.style.display === '') {
        el.style.display = 'inherit';
    } else {
        el.style.display = 'none';
    }
}

//Show or hide red exclamation icon in the extension popup
function showMalformedRegexIcon(flag) {
    document.getElementById('invalid-regex-icon').style.display = flag ? 'initial' : 'none';
}

//Show or hide red exclamation icon in the extension popup
function showOfflineFileErrorIcon(flag) {
    document.getElementById('offline-file-search-err').style.display = flag ? 'initial' : 'none';
}

//Enable next and previous buttons
function enableButtons() {
    if(arguments.length === 1 && !arguments[0]) {
        document.getElementById('search-prev-button').disabled = true;
        document.getElementById('search-next-button').disabled = true;
        return;
    }

    document.getElementById('search-prev-button').disabled = false;
    document.getElementById('search-next-button').disabled = false;
}

//Enable `replace next` and `replace all` buttons
function enableReplaceButtons() {
    if(arguments.length === 1 && !arguments[0]) {
        document.getElementById('replace-next-button').disabled = true;
        document.getElementById('replace-all-button').disabled = true;
        return;
    }

    document.getElementById('replace-next-button').disabled = false;
    document.getElementById('replace-all-button').disabled = false;
}

//Update index text
function updateIndexText() {
    if(arguments.length === 0) {
        document.getElementById('index-text').innerText = '';
    } else if(arguments.length === 2) {
        document.getElementById('index-text').innerText = formatNumber(arguments[0]) + ' of ' + formatNumber(arguments[1]);
    }
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

//Formats numbers to have thousands comma delimiters
function formatNumber(x) {
    let parts = x.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
}

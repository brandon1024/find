'use strict';

/**
 * Create the Popup BrowserAction namespace.
 * */
Find.register('Popup.BrowserAction', function (self) {
    let initialized = false;
    let index = 0;
    let options = {
        'find_by_regex': true,
        'match_case': true,
        'persistent_highlights': false,
        'max_results': 0
    };

    /**
     * Register event handlers and initialize extension browser action.
     * */
    self.init = function() {
        Find.Popup.BackgroundProxy.openConnection();
        Find.Popup.BackgroundProxy.postMessage({action: 'browser_action_init'});

        Find.Popup.Storage.retrieveOptions((data) => {
            if(data) {
                options = data;
            } else {
                Find.Popup.Storage.saveOptions(options);
            }

            Find.Popup.OptionsPane.applyOptions(options);
        });

        document.body.addEventListener('keyup', (e) => {
            if(e.code === 'KeyO' && e.ctrlKey && e.altKey) {
                //CTRL+ALT+O => Toggle Options Pane
                Find.Popup.OptionsPane.toggle();
                Find.Popup.ReplacePane.show(false);
            } else if(e.code === 'KeyR' && e.ctrlKey && e.altKey) {
                //CTRL+ALT+R => Toggle Replace Pane
                Find.Popup.ReplacePane.toggle();
                Find.Popup.OptionsPane.show(false);
            }
        }, true);

        document.getElementById('popup-body').addEventListener('click', () => {
            Find.Popup.SearchPane.focusSearchField();
        });
    };

    /**
     * Initialize the browser action popup based on the current state of the active tab.
     *
     * If the URL is valid and reachable, the search field is either populated with the text selected
     * in the page or the last search query pulled from local storage.
     *
     * If the URL is not valid or cannot be reached, an appropriate error message is shown.
     * */
    self.startExtension = function(initInformation) {
        let url = initInformation.activeTab.url;
        if(isWithinChromeNamespace(url)) {
            Find.Popup.MessagePane.showChromeNamespaceErrorMessage();
            Find.Popup.BrowserAction.error('forbidden_url');
        } else if(isWithinWebStoreNamespace(url)) {
            Find.Popup.MessagePane.showChromeWebStoreErrorMessage();
            Find.Popup.BrowserAction.error('forbidden_url');
        } else if(isPDF(url)) {
            Find.Popup.MessagePane.showPDFSearchErrorMessage();
            Find.Popup.BrowserAction.error('pdf_unsupported');
        } else if(isLocalFile(url) && !initInformation.isReachable) {
            Find.Popup.MessagePane.showOfflineFileErrorMessage();
            Find.Popup.BrowserAction.error('offline_file');
        } else {
            if(initInformation.selectedText) {
                Find.Popup.SearchPane.setSearchFieldText(initInformation.selectedText);
                Find.Popup.SearchPane.selectSearchField();
                Find.Popup.BrowserAction.updateSearch();
            } else {
                Find.Popup.Storage.retrieveHistory((data) => {
                    if(data) {
                        Find.Popup.SearchPane.setSearchFieldText(data);
                    }

                    Find.Popup.SearchPane.selectSearchField();
                });
            }
        }
    };

    /**
     * Close the extension.
     * */
    self.closeExtension = function() {
        Find.Popup.BackgroundProxy.closeConnection();
        window.close();
    };

    /**
     * Update the current search query.
     * */
    self.updateSearch = function() {
        initialized = true;

        let regex = Find.Popup.SearchPane.getSearchFieldText();
        Find.Popup.Storage.saveHistory(regex);
        Find.Popup.BackgroundProxy.postMessage({action: 'update', regex: regex, options: options});
    };

    /**
     * Seek forward to the next occurrence of the regex.
     *
     * If the search has not yet been initialized, it will invoke updateSearch().
     * */
    self.seekForwards = function() {
        if(!initialized) {
            Find.Popup.BrowserAction.updateSearch();
            return;
        }

        Find.Popup.BackgroundProxy.postMessage({action: 'next', options: options});
        Find.Popup.SearchPane.focusSearchField();
    };

    /**
     * Seek backwards to the previous occurrence of the regex.
     *
     * If the search has not yet been initialized, it will invoke updateSearch().
     * */
    self.seekBackwards = function() {
        if(!initialized) {
            Find.Popup.BrowserAction.updateSearch();
            return;
        }

        Find.Popup.BackgroundProxy.postMessage({action: 'previous', options: options});
        Find.Popup.SearchPane.focusSearchField();
    };

    /**
     * Replace the current occurrence with the text in the replace field, and seek to the next occurrence.
     * */
    self.replaceNext = function() {
        let replaceWith = Find.Popup.ReplacePane.getReplaceFieldText();
        Find.Popup.BackgroundProxy.postMessage({action: 'replace_next', index: index, replaceWith: replaceWith, options: options});
    };

    /**
     * Replace all occurrences with the text in the replace field.
     * */
    self.replaceAll = function() {
        let replaceWith = Find.Popup.ReplacePane.getReplaceFieldText();
        Find.Popup.BackgroundProxy.postMessage({action: 'replace_all', replaceWith: replaceWith, options: options});
    };

    /**
     * Follow the link at the current search index.
     * */
    self.followLink = function() {
        if(!initialized) {
            Find.Popup.BrowserAction.updateSearch();
            return;
        }

        Find.Popup.BackgroundProxy.postMessage({action: 'follow_link', options: options});
    };

    /**
     * Update the options, save them to the local storage, and update the search.
     * */
    self.updateOptions = function(newOptions) {
        options = newOptions;
        Find.Popup.Storage.saveOptions(newOptions);
        Find.Popup.BrowserAction.updateSearch();
    };

    /**
     * Update the current search index. Disable buttons if the total is zero.
     *
     * @param {number} newIndex - The new occurrence index.
     * @param {number} total - The total number of occurrences.
     * */
    self.updateIndex = function(newIndex, total) {
        index = newIndex;

        Find.Popup.SearchPane.updateIndexText(index, total);
        Find.Popup.SearchPane.showMalformedRegexIcon(false);

        Find.Popup.SearchPane.enableButtons(total !== 0);
        Find.Popup.ReplacePane.enableButtons(total !== 0);
    };

    /**
     * Reset the index, disable buttons, clear the index text.
     *
     * If the reason is 'invalid_regex', the malformed regex icon is shown.
     *
     * @param {string} reason - The cause of the error.
     * */
    self.error = function(reason) {
        index = 0;

        Find.Popup.SearchPane.enableButtons(false);
        Find.Popup.ReplacePane.enableButtons(false);

        Find.Popup.SearchPane.clearIndexText();
        Find.Popup.SearchPane.showMalformedRegexIcon(reason === 'invalid_regex');
    };

    /**
     * Momentarily display the install/update icon in the search pane.
     *
     * The icon will be shown for 3000ms, and will be hidden unless the user hovers the mouse over the icon to
     * display the tooltip. In this case, the internal timer will be reset and the icon will remain visible for
     * another 3000ms.
     *
     * Once the icon disappears, the event handlers are removed.
     *
     * @param {object} details - A simple object containing a single key 'reason', with the value 'install' or 'update'.
     * */
    self.showInstallUpdateDetails = function(details) {
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

        //Self de-registering event handler
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
    };

    /**
     * Return whether or not the given url is within the chrome:// namespace.
     *
     * @private
     * @return {boolean} True if URL is within the chrome:// namespace, false otherwise.
     * */
    function isWithinChromeNamespace(url) {
        return url.match(/chrome:\/\/.*/);
    }

    /**
     * Return whether or not the given url is within the Chrome Web Store or newtab namespace.
     *
     * @private
     * @return {boolean} True if URL is within the Chrome Web Store or newtab namespace, false otherwise.
     * */
    function isWithinWebStoreNamespace(url) {
        return url.match(/https:\/\/chrome\.google\.com\/webstore\/.*/)
            || url.match(/https:\/\/google\.[^\/]*\/_\/chrome\/newtab.*/);
    }

    /**
     * Return whether or not the given url is a PDF.
     *
     * @private
     * @return {boolean} True if URL is a PDF, false otherwise.
     * */
    function isPDF(url) {
        return url.match(/.*\.pdf$/i);
    }

    /**
     * Return whether or not the given url is a local file.
     *
     * @private
     * @return {boolean} True if URL is a local file, false otherwise.
     * */
    function isLocalFile(url) {
        return url.match(/^file:\/\/.*/i);
    }
});
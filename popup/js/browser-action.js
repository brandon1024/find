'use strict';

/**
 * Create the Popup BrowserAction namespace.
 * */
Find.register('Popup.BrowserAction', function (self) {

    let initialized = false;
    let index = 0;

    /**
     * Register event handlers and initialize extension browser action.
     * */
    self.init = function() {
        Find.Popup.BackgroundProxy.openConnection();
        Find.Popup.BackgroundProxy.postMessage({action: 'browser_action_init'});

        document.body.addEventListener('keyup', (e) => {
            if(e.code === 'KeyO' && e.ctrlKey && e.altKey) {
                //CTRL+ALT+O => Toggle Options Pane
                Find.Popup.OptionsPane.toggle();
                Find.Popup.ReplacePane.show(false);
                Find.Popup.HistoryPane.show(false);
            } else if(e.code === 'KeyR' && e.ctrlKey && e.altKey) {
                //CTRL+ALT+R => Toggle Replace Pane
                Find.Popup.ReplacePane.toggle();
                Find.Popup.OptionsPane.show(false);
                Find.Popup.HistoryPane.show(false);
            } else if(e.code === 'KeyH' && e.ctrlKey && e.altKey) {
                //CTRL+ALT+R => Toggle Replace Pane
                Find.Popup.HistoryPane.toggle();
                Find.Popup.OptionsPane.show(false);
                Find.Popup.ReplacePane.show(false);
            }
        }, true);

        document.getElementById('popup-body').addEventListener('click', () => {
            Find.Popup.SearchPane.focusSearchField();
        });

        Find.Popup.SearchPane.focusSearchField();
    };

    /**
     * Initialize the browser action popup based on the current state of the active tab.
     *
     * If the URL is valid and reachable, the search field is either populated with the text selected
     * in the page or the last search query pulled from local storage.
     *
     * If the URL is not valid or cannot be reached, an appropriate error message is shown.
     *
     * @param {object} initInformation - An object that contains information about the current session.
     * */
    self.startExtension = function(initInformation) {
        let url = initInformation.activeTab.url;
        if(isWithinChromeNamespace(url)) {
            Find.Popup.MessagePane.showChromeNamespaceErrorMessage();
            self.error('forbidden_url');
        } else if(isWithinWebStoreNamespace(url)) {
            Find.Popup.MessagePane.showChromeWebStoreErrorMessage();
            self.error('forbidden_url');
        } else if(isPDF(url)) {
            Find.Popup.MessagePane.showPDFSearchErrorMessage();
            self.error('pdf_unsupported');
        } else if(isLocalFile(url) && !initInformation.isReachable) {
            Find.Popup.MessagePane.showOfflineFileErrorMessage();
            self.error('offline_file');
        } else {
            if(initInformation.iframes > 0) {
                Find.Popup.SearchPane.flashIframesFoundWarningIcon();
            }

            if(initInformation.selectedText) {
                Find.Popup.SearchPane.setSearchFieldText(initInformation.selectedText);
                Find.Popup.SearchPane.selectSearchField();
                self.updateSearch();
            } else if(initInformation.regex != null) {
                Find.Popup.SearchPane.setSearchFieldText(initInformation.regex);
                Find.Popup.SearchPane.selectSearchField();
                self.updateSearch();
            } else {
                Find.Popup.Storage.retrieveHistory((data) => {
                    if(data && data.length) {
                        Find.Popup.SearchPane.setSearchFieldText(data[0]);
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
        let options = Find.Popup.OptionsPane.getOptions();
        Find.Popup.BackgroundProxy.postMessage({action: 'update', regex: regex, options: options});
    };

    /**
     * Seek forward to the next occurrence of the regex.
     *
     * If the search has not yet been initialized, it will invoke updateSearch().
     * */
    self.seekForwards = function() {
        if(!initialized) {
            self.updateSearch();
            return;
        }

        let options = Find.Popup.OptionsPane.getOptions();
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
            self.updateSearch();
            return;
        }

        let options = Find.Popup.OptionsPane.getOptions();
        Find.Popup.BackgroundProxy.postMessage({action: 'previous', options: options});
        Find.Popup.SearchPane.focusSearchField();
    };

    /**
     * Replace the current occurrence with the text in the replace field, and seek to the next occurrence.
     * */
    self.replaceNext = function() {
        let replaceWith = Find.Popup.ReplacePane.getReplaceFieldText();
        let options = Find.Popup.OptionsPane.getOptions();
        Find.Popup.BackgroundProxy.postMessage({action: 'replace_next', index: index, replaceWith: replaceWith, options: options});
    };

    /**
     * Replace all occurrences with the text in the replace field.
     * */
    self.replaceAll = function() {
        let replaceWith = Find.Popup.ReplacePane.getReplaceFieldText();
        let options = Find.Popup.OptionsPane.getOptions();
        Find.Popup.BackgroundProxy.postMessage({action: 'replace_all', replaceWith: replaceWith, options: options});
    };

    /**
     * Follow the link at the current search index.
     * */
    self.followLink = function() {
        if(!initialized) {
            self.updateSearch();
            return;
        }

        let options = Find.Popup.OptionsPane.getOptions();
        Find.Popup.BackgroundProxy.postMessage({action: 'follow_link', options: options});
    };

    /**
     * Issue a message to the background script requesting the current occurrence of the regex.
     *
     * @param {object} options - The options to be used by the background script.
     * */
    self.getOccurrence = function(options) {
        if(!initialized) {
            self.updateSearch();
            return;
        }

        Find.Popup.BackgroundProxy.postMessage({action: 'get_occurrence', options: options});
    };

    /**
     * Copy a given string to the clipboard.
     *
     * @param {string} text - The text to copy to the clipboard
     * */
    self.copyTextToClipboard = function(text) {
        navigator.clipboard.writeText(text).then(() => {
            Find.Popup.SearchPane.flashClipboardCopyIcon();
        }).catch(() => {
            Find.Popup.SearchPane.flashClipboardCopyErrorIcon();
        });
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
     * @param {object} details - A simple object containing a single key 'reason', with the value 'install' or 'update'.
     * */
    self.showInstallUpdateDetails = function(details) {
        if(details.reason === 'install') {
            Find.Popup.SearchPane.flashInstallInformationIcon();
        } else if(details.reason === 'update') {
            Find.Popup.SearchPane.flashUpdateInformationIcon();
        }
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
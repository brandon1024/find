'use strict';

/**
 * Create the Popup BrowserAction namespace.
 * */
Find.register('Popup.BrowserAction', function (namespace) {
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
    namespace.init = function() {
        Find.Popup.Storage.retrieveOptions((data) => {
            if(data) {
                options = data;
            }

            Find.Popup.OptionsPane.applyOptions(options);
            Find.Popup.BrowserAction.updateOptions(options);
        });

        document.getElementById('popup-body').addEventListener('click', () => {
            Find.Popup.SearchPane.focusSearchField();
        });

        document.body.addEventListener('keyup', (e) => {
            if(e.code === 'KeyO' && e.ctrlKey && e.altKey) {
                //CTRL+ALT+O => Toggle Options Pane
                Find.Popup.OptionsPane.show(true);
                Find.Popup.ReplacePane.show(false);
            } else if(e.code === 'KeyR' && e.ctrlKey && e.altKey) {
                //CTRL+ALT+R => Toggle Replace Pane
                Find.Popup.OptionsPane.show(false);
                Find.Popup.ReplacePane.show(true);
            }
        }, true);

        browser.tabs.query({'active': true, currentWindow: true}, (tabs) => {
            //Todo: move this logic into the content scripts
            function getSelectedOrLastSearch() {
                browser.tabs.executeScript({code: "window.getSelection().toString();"}, function(selection) {
                    if(selection[0]) {
                        Find.Popup.SearchPane.setSearchFieldText(selection[0]);
                        Find.Popup.SearchPane.select();
                        Find.Popup.BrowserAction.updateSearch();
                    } else {
                        Find.Popup.Storage.retrieveHistory((data) => {
                            if(data) {
                                Find.Popup.SearchPane.setSearchFieldText(data);
                            }

                            Find.Popup.SearchPane.selectSearchField();
                        });
                    }
                });
            }

            //Ensure valid url, then get text selected on page or retrieve last search
            let url = tabs[0].url;
            if(isWithinChromeNamespace(url)) {
                Find.Popup.MessagePane.showChromeNamespaceErrorMessage();
                Find.Popup.ReplacePane.enableButtons(false);
                Find.Popup.SearchPane.enableButtons(false);
            } else if(isWithinWebStoreNamespace(url)) {
                Find.Popup.MessagePane.showChromeWebStoreErrorMessage();
            } else if(isPDF(url)) {
                Find.Popup.MessagePane.showPDFSearchErrorMessage();
            } else if(isLocalFile(url)) {
                // browser.tabs.sendMessage(tabs[0].id, {action: 'poll'}, (response) => {
                //     if(!response || !response.success) {
                //         Find.Popup.MessagePane.showOfflineFileErrorMessage();
                //         updateIndexText();
                //         enableButtons(false);
                //     } else {
                //         getSelectedOrLastSearch();
                //     }
                // });
            } else {
                //getSelectedOrLastSearch();
            }
        });
    };

    /**
     * Close the extension.
     * */
    namespace.closeExtension = function() {
        Find.Popup.BackgroundProxy.closeConnection();
        window.close();
    };

    /**
     * Update the current search query.
     * */
    namespace.updateSearch = function() {
        initialized = true;

        let regex = Find.Popup.SearchPane.getSearchFieldText();
        Find.Popup.BackgroundProxy.postMessage({action: 'update', regex: regex, options: options});
    };

    /**
     *
     * */
    namespace.seekForward = function() {
        if(!initialized) {
            Find.Popup.BrowserAction.updateSearch();
            return;
        }

        Find.Popup.BackgroundProxy.postMessage({action: 'next', options: options});
        Find.Popup.SearchPane.focusSearchField();
    };

    /**
     *
     * */
    namespace.seekBackwards = function() {
        if(!initialized) {
            Find.Popup.BrowserAction.updateSearch();
            return;
        }

        Find.Popup.BackgroundProxy.postMessage({action: 'previous', options: options});
        Find.Popup.SearchPane.focusSearchField();
    };

    /**
     *
     * */
    namespace.replaceNext = function() {
        let replaceWith = Find.Popup.ReplacePane.getReplaceFieldText();
        Find.Popup.BackgroundProxy.postMessage({action: 'replace_next', index: index, replaceWith: replaceWith, options: options});
    };

    /**
     *
     * */
    namespace.replaceAll = function() {
        let replaceWith = Find.Popup.ReplacePane.getReplaceFieldText();
        Find.Popup.BackgroundProxy.postMessage({action: 'replace_all', replaceWith: replaceWith, options: options});
    };

    /**
     *
     * */
    namespace.followLink = function() {
        if(!initialized) {
            Find.Popup.BrowserAction.updateSearch();
            return;
        }

        Find.Popup.BackgroundProxy.postMessage({action: 'follow_link', options: options});
    };

    /**
     *
     * */
    namespace.updateOptions = function(newOptions) {
        options = newOptions;
        Find.Popup.BrowserAction.updateSearch();
    };

    /**
     *
     * */
    namespace.updateIndex = function(newIndex, total) {
        index = newIndex;

        Find.Popup.SearchPane.updateIndexText(index, total);
        Find.Popup.SearchPane.showMalformedRegexIcon(false);

        Find.Popup.SearchPane.enableButtons(response.total !== 0);
        Find.Popup.ReplacePane.enableButtons(response.total !== 0);
    };

    /**
     *
     * */
    namespace.error = function(reason) {
        index = 0;

        Find.Popup.SearchPane.enableButtons(false);
        Find.Popup.SearchPane.clearIndexText();
        Find.Popup.ReplacePane.enableButtons(false);
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
    namespace.showInstallUpdateDetails = function(details) {
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
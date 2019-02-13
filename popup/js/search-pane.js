'use strict';

/**
 * Create the Popup SearchPane namespace.
 * */
Find.register('Popup.SearchPane', function (self) {

    /**
     * Register event handlers.
     * */
    self.init = function() {
        document.getElementById('search-field').addEventListener('keyup', (e) => {
            if(e.ctrlKey && e.shiftKey && e.key === 'Enter') {
                //CTRL+SHIFT+ENTER => Enter Link
                Find.Popup.BrowserAction.followLink();
            } else if((e.key === 'Enter' && e.shiftKey) || (e.key === 'F3' && e.shiftKey)) {
                //SHIFT+ENTER => Previous Highlight (seek)
                Find.Popup.BrowserAction.seekBackwards();
            } else if(e.key === 'Escape' || (e.key === 'Enter' && e.ctrlKey)) {
                //ESC OR CTRL+ENTER => Close Extension
                Find.Popup.BrowserAction.closeExtension();
            } else if(e.key === 'Enter' || e.key === 'F3') {
                //ENTER => Next Highlight (seek)
                Find.Popup.BrowserAction.seekForwards();
            } else if(e.ctrlKey && e.altKey && e.code === 'KeyC') {
                Find.Popup.BrowserAction.getOccurrence({cardinality: 'single'});
            } else if(e.ctrlKey && e.altKey && e.code === 'KeyA') {
                Find.Popup.BrowserAction.getOccurrence({cardinality: 'all'});
            }
        }, true);

        document.getElementById('search-field').addEventListener('input', () => {
            Find.Popup.BrowserAction.updateSearch();
        });

        document.getElementById('search-next-button').addEventListener('click', () => {
            Find.Popup.BrowserAction.seekForwards();
        });

        document.getElementById('search-prev-button').addEventListener('click', () => {
            Find.Popup.BrowserAction.seekBackwards();
        });

        document.getElementById('search-toggle-options-button').addEventListener('click', () => {
            Find.Popup.OptionsPane.toggle();
            Find.Popup.ReplacePane.show(false);
            Find.Popup.HistoryPane.show(false);
        }, true);


        document.getElementById('history-toggle-button').addEventListener('click', () => {
            Find.Popup.HistoryPane.toggle();
            Find.Popup.ReplacePane.show(false);
            Find.Popup.OptionsPane.show(false);
        }, true);

        document.getElementById('close-button').addEventListener('click', () => {
            Find.Popup.BrowserAction.closeExtension();
        });
    };

    /**
     * Enable or disable the search next and previous buttons.
     *
     * @param {boolean} enable - Optional boolean value. If true or undefined, enables the buttons.
     * Otherwise disables the buttons.
     * */
    self.enableButtons = function(enable) {
        document.getElementById('search-prev-button').disabled = enable !== undefined && !enable;
        document.getElementById('search-next-button').disabled = enable !== undefined && !enable;
    };

    /**
     * Retrieve the text in the search field.
     *
     * @return {string} the text in the search field.
     * */
    self.getSearchFieldText = function() {
        return document.getElementById('search-field').value;
    };

    /**
     * Set the search field text to the given value.
     *
     * @param {string} text - The text to place in the search field.
     * */
    self.setSearchFieldText = function(text) {
        document.getElementById('search-field').value = text;
    };

    /**
     * Place focus on the search field.
     * */
    self.focusSearchField = function() {
        document.getElementById('search-field').focus();
    };

    /**
     * Select all the text in the search field.
     * */
    self.selectSearchField = function() {
        document.getElementById('search-field').select();
    };

    /**
     * Update the search occurrence index text.
     *
     * @param {number} occurrence - The index of the current occurrence
     * @param {number} count - The total number of occurrences
     * */
    self.updateIndexText = function(occurrence, count) {
        document.getElementById('index-text').innerText = formatNumber(occurrence)
            + ' of ' + formatNumber(count);
    };

    /**
     * Clear the search occurrence index text.
     * */
    self.clearIndexText = function() {
        document.getElementById('index-text').innerText = '';
    };

    /**
     * Display an error icon in the notification area to notify the user that the regex is invalid.
     *
     * @param {boolean} flag - Whether or not to display the icon.
     * */
    self.showMalformedRegexIcon = function(flag) {
        document.getElementById('invalid-regex-icon').style.display = flag ? 'initial' : 'none';
    };

    /**
     * Display an error icon in the notification area to notify the user that the extension does not have
     * permission to search in offline files.
     *
     * @param {boolean} flag - Whether or not to display the icon.
     * */
    self.showOfflineFileErrorIcon = function(flag) {
        document.getElementById('offline-file-search-err').style.display = flag ? 'initial' : 'none';
    };

    /**
     * Momentarily display an icon in the notification area to notify the user that text was copied to the clipboard
     * successfully.
     * */
    self.flashClipboardCopyIcon = function() {
        let el = document.getElementById('clipboard-copy-icon');
        flashElement(el);
    };

    /**
     * Momentarily display an icon in the inotification area to notify the user that text was not copied to the clipboard
     * due to an unexpected error.
     * */
    self.flashClipboardCopyErrorIcon = function() {
        let el = document.getElementById('clipboard-copy-error');
        flashElement(el);
    };

    /**
     * Momentarily display an icon in the notification area to notify the user that an iframe was encountered, and
     * that some occurrences of the regex may not be highlighted in the page.
     * */
    self.flashIframesFoundWarningIcon = function() {
        let el = document.getElementById('iframes-found-icon');
        flashElement(el);
    };

    /**
     * Momentarily display an icon in the notification area to provide an installation message to the user.
     * */
    self.flashInstallInformationIcon = function() {
        let el = document.getElementById('install-information');
        flashElement(el);
    };

    /**
     * Momentarily display an icon in the notification area to provide update information message to the user.
     * */
    self.flashUpdateInformationIcon = function() {
        let el = document.getElementById('update-information');
        flashElement(el);
    };

    /**
     * Momentarily display an icon or element. This is primarily used for flashing
     * notification information in the search pane.
     *
     * The icon will be shown for 3000ms, and will be hidden unless the user hovers the mouse over the icon to
     * display the tooltip. In this case, the internal timer will be reset and the icon will remain visible for
     * another 3000ms.
     *
     * Once the icon disappears, the event handlers are removed.
     *
     * @private
     * @param {Element} el - The element to flash
     * */
    function flashElement(el) {
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
    }

    /**
     * Format a number as a string with thousands separators.
     *
     * Example:
     * console.log(formatNumber(98254.2688));
     * > "98,254.2688"
     *
     * @private
     * @param {number} x - The number to be formatted to a string
     * @return {string} a the number formatted as a string with thousands separators
     * */
    function formatNumber(x) {
        let parts = x.toString().split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }
});
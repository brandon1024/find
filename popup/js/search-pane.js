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
     * Display an error icon in the index text to notify the user that the regex is invalid.
     *
     * @param {boolean} flag - Whether or not to display the icon.
     * */
    self.showMalformedRegexIcon = function(flag) {
        document.getElementById('invalid-regex-icon').style.display = flag ? 'initial' : 'none';
    };

    /**
     * Display an error icon in the index text to notify the user that the extension does not have
     * permission to search in offline files.
     *
     * @param {boolean} flag - Whether or not to display the icon.
     * */
    self.showOfflineFileErrorIcon = function(flag) {
        document.getElementById('offline-file-search-err').style.display = flag ? 'initial' : 'none';
    };

    /**
     * Display an icon in the index text to notify the user that text was copied to the clipboard
     * successfully.
     *
     * @param {boolean} flag - Whether or not to display the icon.
     * */
    self.showClipboardCopyIcon = function(flag) {
        document.getElementById('clipboard-copy-icon').style.display = flag ? 'initial' : 'none';
    };

    /**
     * Display an icon in the index text to notify the user that text was not copied to the clipboard
     * due to an unexpected error.
     *
     * @param {boolean} flag - Whether or not to display the icon.
     * */
    self.showClipboardCopyErrorIcon = function(flag) {
        document.getElementById('clipboard-copy-error').style.display = flag ? 'initial' : 'none';
    };

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
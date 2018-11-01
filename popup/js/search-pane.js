'use strict';

/**
 *
 * */
Find.register('Popup.SearchPane', function (namespace) {

    namespace.init = function() {
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

        document.getElementById('search-toggle-options-button').addEventListener('click', () => {
            toggleReplacePane(false);
            toggleOptionsPane();
        }, true);

        document.getElementById('search-next-button').addEventListener('click', nextHighlight);
        document.getElementById('search-prev-button').addEventListener('click', previousHighlight);
        document.getElementById('close-button').addEventListener('click', closeExtension);
        document.getElementById('search-field').addEventListener('input', updateHighlight);
        document.getElementById('search-field').addEventListener('input', updateSavedPreviousSearch);
    };

    /**
     * Enable or disable the search next and previous buttons.
     *
     * @param {boolean} enable - Optional boolean value. If true or undefined, enables the buttons.
     * Otherwise disables the buttons.
     * */
    namespace.enableButtons = function(enable) {
        if(enable !== undefined && !enable) {
            document.getElementById('search-prev-button').disabled = true;
            document.getElementById('search-next-button').disabled = true;
            return;
        }

        document.getElementById('search-prev-button').disabled = false;
        document.getElementById('search-next-button').disabled = false;
    };

    /**
     * Set the search field text to the given value.
     *
     * @param {string} text - The text to place in the search field.
     * */
    namespace.setSearchFieldText = function(text) {
        document.getElementById('search-field').value = text;
    };

    /**
     * Retrieve the text in the search field.
     *
     * @return {string} the text in the search field.
     * */
    namespace.getSearchFieldText = function() {
        return document.getElementById('search-field').value;
    };

    /**
     * Place focus on the search field.
     * */
    namespace.focusSearchField = function() {
        document.getElementById('search-field').focus();
    };

    /**
     * Select all the text in the search field text field.
     * */
    namespace.selectSearchField = function() {
        document.getElementById('search-field').select();
    };

    /**
     * Update the search occurrence index text.
     *
     * @param {number} occurrence - The index of the current occurrence
     * @param {number} count - The total number of occurrences
     * */
    namespace.updateIndexText = function(occurrence, count) {
        document.getElementById('index-text').innerText = formatNumber(occurrence)
            + ' of ' + formatNumber(count);
    };

    /**
     * Clear the search occurrence index text.
     * */
    namespace.clearIndexText = function() {
        document.getElementById('index-text').innerText = '';
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
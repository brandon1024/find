'use strict';

/**
 * Create the Popup OptionsPane namespace.
 * */
Find.register('Popup.OptionsPane', function (namespace) {

    /**
     * Register event handlers.
     * */
    namespace.init = function() {
        document.getElementById('regex-option-regex-disable-toggle').addEventListener('change', notifyBrowserActionOptionsChange);
        document.getElementById('regex-option-case-insensitive-toggle').addEventListener('change', notifyBrowserActionOptionsChange);
        document.getElementById('regex-option-persistent-highlights-toggle').addEventListener('change', notifyBrowserActionOptionsChange);
        document.getElementById('max-results-slider').addEventListener('input', notifyBrowserActionOptionsChange);
    };

    /**
     * Show or hide the options pane.
     *
     * @param {boolean} value - Undefined or true to display the options pane, false to hide.
     * */
    namespace.show = function(value) {
        let el = document.getElementById('regex-options');

        if(value === undefined || value) {
            el.style.display = 'inherit';
        } else {
            el.style.display = 'none';
        }
    };

    /**
     * Build an object of values from the settings fields in the options pane.
     *
     * @return {object} an options object.
     * */
    namespace.getOptions = function() {
        let findByRegex = document.getElementById('regex-option-regex-disable-toggle').checked;
        let matchCase = document.getElementById('regex-option-case-insensitive-toggle').checked;
        let persistentHighlights = document.getElementById('regex-option-persistent-highlights-toggle').checked;

        const rangeValues = [1,10,25,50,75,100,150,200,300,400,0];
        let rangeIndex = document.getElementById('max-results-slider').value;
        if(rangeValues[rangeIndex] === 0) {
            document.getElementById('max-results-slider-value').innerText = '∞';
        } else {
            document.getElementById('max-results-slider-value').innerText = rangeValues[rangeIndex].toString();
        }

        let maxResults = rangeValues[rangeIndex];

        return buildOptions(findByRegex, matchCase, persistentHighlights, maxResults);
    };

    /**
     * Apply an object representing a set of options to the options pane.
     *
     * @param {object} options - The options to apply to the options pane.
     * */
    namespace.applyOptions = function(options) {
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
    };

    /**
     * Notify the browser action that the user has changed the settings through the options pane.
     * */
    function notifyBrowserActionOptionsChange() {
        let options = namespace.getOptions();

        Find.Popup.BrowserAction.updateOptions(options);
    }

    /**
     * Build an options object from individual fields.
     *
     * @return {object} an options object.
     * */
    function buildOptions(findByRegex, matchCase, persistentHighlights, maxResults) {
        return {
            'find_by_regex': findByRegex,
            'match_case': matchCase,
            'persistent_highlights': persistentHighlights,
            'max_results': maxResults
        };
    }
});
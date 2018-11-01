'use strict';

/**
 *
 * */
Find.register('Popup.OptionsPane', function (namespace) {

    /**
     *
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
     *
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
     *
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
     *
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
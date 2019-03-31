'use strict';

/**
 * Create the Background Omni namespace. Registers various event listeners which invoke
 * the appropriate background functions.
 * */
Find.register("Background.Omni", function(self) {

    Find.browser.omnibox.setDefaultSuggestion({description: 'Enter a regular expression'});

    Find.browser.omnibox.onInputStarted.addListener(() => {
        Find.browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
            Find.Background.initializePage(tabs[0]);
        });
    });

    Find.browser.omnibox.onInputChanged.addListener((regex) => {
        retrieveOptions((options) => {
            Find.browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
                Find.Background.updateSearch({regex: regex, options: options}, tabs[0], () => {});
            });
        });
    });

    Find.browser.omnibox.onInputCancelled.addListener(() => {
        Find.Background.restorePageState();
    });

    Find.browser.omnibox.onInputEntered.addListener(() => {
        Find.Background.restorePageState(false);
    });

    /**
     * Default options. This object and all of it's properties are immutable.
     * To use this object, it must be cloned into a mutable object.
     *
     * To clone this object:
     * let mutableOptions = JSON.parse(JSON.stringify(DEFAULT_OPTIONS));
     * */
    const DEFAULT_OPTIONS = Object.freeze({
        find_by_regex: true,
        match_case: true,
        persistent_highlights: false,
        persistent_storage_incognito: false,
        max_results: 0,
        index_highlight_color: Object.freeze({
            hue: 34,
            saturation: 0.925,
            value: 1,
            hexColor: '#ff9813'
        }),
        all_highlight_color: Object.freeze({
            hue: 56,
            saturation: 1,
            value: 1,
            hexColor: '#fff000'
        })
    });

    /**
     * Retrieve the search options from the browser local storage, and pass
     * to the callback function. The data from the storage is passed as a single
     * argument to the callback function.
     *
     * @param {function} callback - The callback function to handle the data.
     * @return {object} The search history, or null if it does not exist or cannot be retrieved.
     * */
    function retrieveOptions(callback) {
        Find.browser.storage.local.get('options', (data) => {
            let options = data['options'];
            if(!options) {
                return callback(JSON.parse(JSON.stringify(DEFAULT_OPTIONS)));
            }

            callback(options);
        });
    }
});
'use strict';

/**
 * Create the Background Omni namespace. Registers various event listeners which invoke
 * the appropriate background functions.
 * */
Find.register("Background.Omni", function(self) {

    let options = {
        find_by_regex: true,
        match_case: true,
        persistent_highlights: false,
        max_results: 0,
        index_highlight_color: {
            hue: 34,
            saturation: 0.925,
            value: 1,
            hexColor: '#ff9813'
        },
        all_highlight_color: {
            hue: 56,
            saturation: 1,
            value: 1,
            hexColor: '#fff000'
        }
    };

    Find.browser.omnibox.setDefaultSuggestion({description: 'Enter a regular expression'});

    Find.browser.omnibox.onInputStarted.addListener(() => {
        Find.browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
            Find.Background.initializePage(tabs[0]);
        });
    });

    Find.browser.omnibox.onInputChanged.addListener((regex) => {
        Find.browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
            Find.Background.updateSearch({regex: regex, options: options}, tabs[0], () => {});
        });
    });

    Find.browser.omnibox.onInputCancelled.addListener(() => {
        Find.Background.restorePageState();
    });

    Find.browser.omnibox.onInputEntered.addListener(() => {
        Find.Background.restorePageState(false);
    });
});
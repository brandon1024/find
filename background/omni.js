'use strict';

/**
 * Create the Background Omni namespace. Registers various event listeners which invoke
 * the appropriate background functions.
 * */
Find.register('Background.Omni', function (self) {
    Find.browser.omnibox.onInputStarted.addListener(() => {
        Find.browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            Find.Background.initializePage(tabs[0]);
        });
    });

    retrieveOptions((options) => {
        Find.browser.omnibox.onInputChanged.addListener((regex) => {
            Find.browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                Find.Background.updateSearch({ regex: regex, options: options }, tabs[0], (result) => {
                    let description;
                    if (!regex) {
                        description = 'Enter a regular expression';
                    } else if (result.action === 'index_update') {
                        description = `${result.total} matches found`;
                    } else if (result.action === 'invalid_regex') {
                        description = result.error;
                    }

                    Find.browser.omnibox.setDefaultSuggestion({ description: description });
                });
            });
        });
    });

    /**
 * Migrates legacy snake_case option keys to their camelCase equivalents.
 * Existing installs may have options persisted under the old key names;
 * this ensures those are transparently upgraded on read.
 *
 * @private
 * @param {object} options - The options object retrieved from storage.
 * @return {object} options object with migrated key names.
 * */
    function migrateOptionKeys(options) {
        const keyMap = {
            'find_by_regex': 'findByRegex',
            'match_case': 'matchCase',
            'persistent_highlights': 'persistentHighlights',
            'persistent_storage_incognito': 'persistentStorageIncognito',
            'hide_options_button': 'hideOptionsButton',
            'hide_saved_expressions_button': 'hideSavedExpressionsButton',
            'hide_clipboard_button': 'hideClipboardButton',
            'hide_find_replace_button': 'hideFindReplaceButton',
            'max_results': 'maxResults',
            'index_highlight_color': 'indexHighlightColor',
            'all_highlight_color': 'allHighlightColor'
        };
        const migrated = { ...options };
        for (const oldKey in keyMap) {
            if (Object.prototype.hasOwnProperty.call(migrated, oldKey)) {
                migrated[keyMap[oldKey]] = migrated[oldKey];
                delete migrated[oldKey];
            }
        }

        return migrated;
    }

    /**
 * Part of the legacy snake_case option keys migration to their camelCase equivalents.
 * Existing installs may have options persisted under the old key names;
 * this ensures those are transparently upgraded on read.
 *
 * @private
 * @param {function} callback - The callback function to handle the data.
 * */
    function retrieveOptions(callback) {
        Find.browser.storage.local.get('options', (data) => {
            const options = data['options'];
            if (!options) {
                return callback(JSON.parse(JSON.stringify(DEFAULT_OPTIONS)));
            }

            const migrated = migrateOptionKeys(options);
            Find.browser.storage.local.set({ options: migrated });
            callback(migrated);
        });
    }

    Find.browser.omnibox.onInputCancelled.addListener(() => {
        Find.browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            Find.Background.restorePageState(tabs[0]);
        });
    });

    Find.browser.omnibox.onInputEntered.addListener(() => {
        Find.browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            Find.Background.restorePageState(tabs[0], false);
        });
    });

    /**
     * Default options. This object and all of it's properties are immutable.
     * To use this object, it must be cloned into a mutable object.
     *
     * To clone this object:
     * let mutableOptions = JSON.parse(JSON.stringify(DEFAULT_OPTIONS));
     * */
    const DEFAULT_OPTIONS = Object.freeze({
        findByRegex: true,
        matchCase: true,
        persistentHighlights: false,
        persistentStorageIncognito: false,
        hideOptionsButton: false,
        hideSavedExpressionsButton: false,
        hideClipboardButton: true,
        hideFindReplaceButton: true,
        maxResults: 0,
        indexHighlightColor: Object.freeze({
            hue: 34,
            saturation: 0.925,
            value: 1,
            hexColor: '#ff9813'
        }),
        allHighlightColor: Object.freeze({
            hue: 56,
            saturation: 1,
            value: 1,
            hexColor: '#fff000'
        })
    });
});

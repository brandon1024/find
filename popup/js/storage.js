'use strict';

/**
 * Create the Popup Storage namespace.
 * */
Find.register('Popup.Storage', function (namespace) {
    const HISTORY_KEY = 'history';
    const OPTIONS_KEY = 'options';

    /**
     * Retrieve the search history from the browser local storage, and pass
     * to the callback function. The data from the storage is passed as a single
     * argument to the callback function.
     *
     * @paran {function} callback - The callback function to handle the data.
     * @return {object} The search history, or null if it does not exist or cannot be retrieved.
     * */
    namespace.retrieveHistory = function(callback) {
        if(Find.incognito) {
            return null;
        }

        Find.browser.storage.local.get(HISTORY_KEY, (data) => {
            callback(data[HISTORY_KEY])
        });
    };

    /**
     * Retrieve the search options from the browser local storage, and pass
     * to the callback function. The data from the storage is passed as a single
     * argument to the callback function.
     *
     * @paran {function} callback - The callback function to handle the data.
     * @return {object} The search history, or null if it does not exist or cannot be retrieved.
     * */
    namespace.retrieveOptions = function(callback) {
        if(Find.incognito) {
            return null;
        }

        Find.browser.storage.local.get(OPTIONS_KEY, (data) => {
            callback(data[OPTIONS_KEY]);
        });
    };

    /**
     * Save the search history in the browser local storage, and optionally invoke
     * a callback function once the operation is complete.
     *
     * @paran {function} callback - The callback function to execute once the
     * save operation is complete.
     * */
    namespace.saveHistory = function(data, callback) {
        if(Find.incognito) {
            if(callback) {
                callback();
            }

            return;
        }

        let payload = {};
        payload[HISTORY_KEY] = data;

        Find.browser.storage.local.set(payload, callback);
    };

    /**
     * Save the search options in the browser local storage, and optionally invoke
     * a callback function once the operation is complete.
     *
     * @paran {function} callback - The callback function to execute once the
     * save operation is complete.
     * */
    namespace.saveOptions = function(data, callback) {
        if(Find.incognito) {
            if(callback) {
                callback();
            }

            return;
        }

        let payload = {};
        payload[OPTIONS_KEY] = data;

        Find.browser.storage.local.set(payload, callback);
    };
});
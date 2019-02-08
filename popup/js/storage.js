'use strict';

/**
 * Create the Popup Storage namespace.
 *
 * This storage is lockable. When locked, reads from storage will return null, and
 * writes will have no effect. By default, the storage is unlocked.
 * */
Find.register('Popup.Storage', function (self) {
    const HISTORY_KEY = 'history';
    const OPTIONS_KEY = 'options';

    /**
     * Controls whether or not data can be read from or written to local storage.
     *
     * By default, the storage should not be locked.
     * */
    let locked = false;

    /**
     * Retrieve the search history from the browser local storage, and pass
     * to the callback function. The data from the storage is passed as a single
     * argument to the callback function.
     *
     * @param {function} callback - The callback function to handle the data.
     * @return {object} The search history, or null if it cannot be retrieved.
     * */
    self.retrieveHistory = function(callback) {
        if(locked) {
            return callback(null);
        }

        Find.browser.storage.local.get(HISTORY_KEY, (data) => {
            //Ensure backwards compatibility
            if(Array.isArray(data[HISTORY_KEY])) {
                callback(data[HISTORY_KEY]);
            } else {
                callback([]);
            }
        });
    };

    /**
     * Retrieve the search options from the browser local storage, and pass
     * to the callback function. The data from the storage is passed as a single
     * argument to the callback function.
     *
     * @param {function} callback - The callback function to handle the data.
     * @return {object} The search history, or null if it does not exist or cannot be retrieved.
     * */
    self.retrieveOptions = function(callback) {
        if(locked) {
            return callback(null);
        }

        Find.browser.storage.local.get(OPTIONS_KEY, (data) => {
            callback(data[OPTIONS_KEY]);
        });
    };

    /**
     * Save the search history in the browser local storage, and optionally invoke
     * a callback function once the operation is complete.
     *
     * @param {object} data - The data to store in local storage
     * @param {function} [callback] - The callback function to execute once the
     * save operation is complete.
     * */
    self.saveHistory = function(data, callback) {
        if(!locked) {
            let payload = {};
            payload[HISTORY_KEY] = data;

            Find.browser.storage.local.set(payload, callback);
        } else if(callback) {
            callback();
        }
    };

    /**
     * Save the search options in the browser local storage, and optionally invoke
     * a callback function once the operation is complete.
     *
     * @param {object} data - The data to store in local storage
     * @param {function} [callback] - The callback function to execute once the
     * save operation is complete.
     * */
    self.saveOptions = function(data, callback) {
        if(!locked) {
            let payload = {};
            payload[OPTIONS_KEY] = data;

            Find.browser.storage.local.set(payload, callback);
        } else if(callback) {
            callback();
        }
    };

    /**
     * Remove all items from the extension local storage, and optionally
     * invoke a callback function once the operation is complete.
     *
     * @param {function} [callback] - The callback function to execute once the
     * clear operation is complete.
     * */
    self.clearStorage = function(callback) {
        Find.browser.storage.local.clear(callback);
    };

    /**
     * Enable to disable the storage. This is used to ensure that data and
     * settings are not stored while incognito.
     *
     * @param {boolean} value - True if storage is locked, false otherwise.
     * */
    self.lockStorage = function(value) {
        locked = value;
    };

    /**
     * Determine whether or not the storage is locked.
     *
     * @return {boolean} True if the storage is locked, false otherwise.
     * */
    self.isStorageLocked = function() {
        return locked;
    };
});
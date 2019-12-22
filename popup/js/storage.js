'use strict';

/**
 * Create the Popup Storage namespace.
 *
 * This storage is lockable. When locked, reads from storage will return null, and
 * writes will have no effect. By default, the storage is unlocked.
 * */
Find.register('Popup.Storage', function (self) {

    const SAVED_EXPRESSIONS_KEY = 'expressions';
    const OPTIONS_KEY = 'options';
    const HISTORY_KEY = 'history';

    /**
     * Controls whether or not data can be read from or written to local storage.
     *
     * By default, the storage should not be locked.
     * */
    let locked = false;

    /**
     * Retrieve the saved expressions from the browser local storage, and pass
     * to the callback function. The data from the storage is passed as a single
     * argument to the callback function.
     *
     * @param {function} callback - The callback function to handle the data.
     * @return {object} The saved expressions, or null if it cannot be retrieved.
     * */
    self.retrieveSavedExpressions = function(callback) {
        retrieve(SAVED_EXPRESSIONS_KEY, callback);
    };

    /**
     * Retrieve the search options from the browser local storage, and pass
     * to the callback function. The data from the storage is passed as a single
     * argument to the callback function.
     *
     * @param {function} callback - The callback function to handle the data.
     * @return {object} The saved expressions, or null if it does not exist or cannot be retrieved.
     * */
    self.retrieveOptions = function(callback) {
        retrieve(OPTIONS_KEY, callback);
    };

    /**
     * Retrieve from browser local storage the search history for various hosts
     * and pass to callback function. The data from storage is passed as a single
     * argument to the callback function.
     *
     * @param {function} callback - The callback function to handle the data.
     * @return {object} The history, or null if it does not exist or cannot be retrieved.
     * */
    self.retrieveHistory = function(callback) {
        retrieve(HISTORY_KEY, callback);
    };

    /**
     * Save the expressions in the browser local storage, and optionally invoke
     * a callback function once the operation is complete.
     *
     * @param {object} data - The data to store in local storage
     * @param {function} [callback] - The callback function to execute once the
     * save operation is complete.
     * */
    self.saveExpressions = function(data, callback) {
        save(SAVED_EXPRESSIONS_KEY, data, callback);
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
        save(OPTIONS_KEY, data, callback);
    };

    /**
     * Save the search history in the browser local storage, and optionally invoke
     * a callback function once the operation is complete.
     *
     * @param {object} data - The data to store in local storage.
     * @param {function} [callback] - The callback function to execute once the
     * save operation is complete.
     * */
    self.saveHistory = function(data, callback) {
        save(HISTORY_KEY, data, callback);
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

    /**
     * Retrieve from browser local storage, passing the data to the given
     * callback function.
     *
     * @private
     * @param {string} key - The key associated with the data being retrieved.
     * @param {function} callback - The callback function that will accept the data.
     * */
    function retrieve(key, callback) {
        if (locked) {
            return callback(null);
        }

        Find.browser.storage.local.get(key, (data) => {
            callback(data[key]);
        });
    }

    /**
     * Save to the browser local storage, and optionally invoke
     * a callback function once the operation is complete.
     *
     * @private
     * @param {string} key - The key associated with the data being persisted.
     * @param {object} data - The data to store in local storage.
     * @param {function} [callback] - The callback function to execute once the
     * save operation is complete.
     * */
    function save(key, data, callback) {
        if(!locked) {
            let payload = {};
            payload[key] = data;

            Find.browser.storage.local.set(payload, callback);
        } else if(callback) {
            callback();
        }
    }
});
'use strict';

/**
 *
 * */
Find.register('Popup.Storage', function (namespace) {
    const HISTORY_KEY = 'history';
    const OPTIONS_KEY = 'options';

    namespace.retrieveHistory = function(callback) {
        browser.storage.local.get(HISTORY_KEY, callback);
    };

    namespace.retrieveOptions = function(callback) {
        browser.storage.local.get(OPTIONS_KEY, callback);
    };

    namespace.saveHistory = function(data, callback) {
        let payload = {};
        payload[HISTORY_KEY] = data;

        browser.storage.local.set(payload, callback);
    };

    namespace.saveOptions = function(data, callback) {
        let payload = {};
        payload[OPTIONS_KEY] = data;

        browser.storage.local.set(payload, callback);
    };
});
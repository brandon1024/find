'use strict';

/**
 *
 * */
Find.register('Popup.BackgroundProxy', function (namespace) {
    let port;

    namespace.openConnection = function() {
        port = Find.browser.runtime.connect({name: 'popup_to_backend_port'});
        registerPortListener(port);
    };

    namespace.closeConnection = function() {
        port.disconnect();
    };

    namespace.postMessage = function(message) {
        port.postMessage(message);
    };

    function registerPortListener(port) {
        port.onMessage.addListener((response) => {
            switch(response.action) {
                case 'index_update':
                    //
                case 'invalidate':
                    //
                case 'install':
                    //
                case 'close':
                    //
                case 'empty_regex':
                case 'invalid_regex':
                default:
                    //
            }
        });
    }
});
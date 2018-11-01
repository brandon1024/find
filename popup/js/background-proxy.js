'use strict';

/**
 * Create the Popup BackgroundProxy namespace.
 * */
Find.register('Popup.BackgroundProxy', function (namespace) {
    let port;

    /**
     * Open a port to the background script, and register the port message listener.
     * */
    namespace.openConnection = function() {
        port = Find.browser.runtime.connect({name: 'popup_to_backend_port'});
        registerPortListener(port);
    };

    /**
     * Close the port.
     * */
    namespace.closeConnection = function() {
        port.disconnect();
    };

    /**
     * Post a message to the background script.
     *
     * @param {object} message - The message to post to the background script.
     * */
    namespace.postMessage = function(message) {
        port.postMessage(message);
    };

    /**
     * Register the post message listener.
     *
     * @param {object} port - The port to the background script
     * */
    function registerPortListener(port) {
        port.onMessage.addListener((response) => {
            switch(response.action) {
                case 'index_update':
                    Find.Popup.BrowserAction.updateIndex(response.index, response.total);
                    break;
                case 'invalidate':
                    Find.Popup.BrowserAction.updateSearch();
                    break;
                case 'install':
                    Find.Popup.BrowserAction.showInstallUpdateDetails(response.details);
                    break;
                case 'close':
                    Find.Popup.BrowserAction.closeExtension();
                    break;
                case 'empty_regex':
                case 'invalid_regex':
                default:
                    Find.Popup.BrowserAction.error(response.action);
            }
        });
    }
});
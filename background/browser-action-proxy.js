'use strict';

/**
 * Create the Background ContentProxy namespace. Serves as mediator between the background scripts
 * and the browser action popup.
 * */
Find.register("Background.BrowserActionProxy", function() {

    /**
     * Initialize the port connection with the browser action popup.
     * */
    Find.browser.runtime.onConnect.addListener((browserActionPort) => {
        if(browserActionPort.name !== 'popup_to_background_port') {
            return;
        }

        if(Find.Background.installationDetails) {
            browserActionPort.postMessage({action: 'install', details: Find.Background.installationDetails});
            Find.Background.installationDetails = null;
        }

        let activeTab = null;
        Find.browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
            activeTab = tabs[0];

            // invoke action on message from popup script
            browserActionPort.onMessage.addListener((message) => {
                actionDispatch(message, activeTab, (resp) => {
                    browserActionPort.postMessage(resp);
                });
            });

            // handle extension close
            browserActionPort.onDisconnect.addListener(() => {
                if(!Find.Background.options || !Find.Background.options.persistent_highlights) {
                    Find.Background.restorePageState(activeTab);
                } else {
                    Find.Background.restorePageState(activeTab, false);
                }

                activeTab = null;
            });
        });
    });

    /**
     * Dispatcher for calls for action by the browser action popup.
     * Invokes the appropriate function in the Background based on the
     * message.action field.
     *
     * @param {object} message - The message received from the popup
     * @param {object} tab - Information about the active tab in the current window
     * @param {function} sendResponse - Function used to issue a response back to the popup.
     * */
    function actionDispatch(message, tab, sendResponse) {
        let action = message.action;
        switch(action) {
            case 'update':
                Find.Background.updateSearch(message, tab, sendResponse);
                break;
            case 'next':
                Find.Background.seekSearch(message, true, tab, sendResponse);
                break;
            case 'previous':
                Find.Background.seekSearch(message, false, tab, sendResponse);
                break;
            case 'replace_next':
                Find.Background.replaceNext(message, tab, sendResponse);
                break;
            case 'replace_all':
                Find.Background.replaceAll(message, tab, sendResponse);
                break;
            case 'follow_link':
                Find.Background.followLinkUnderFocus(message, tab, sendResponse);
                break;
            case 'browser_action_init':
                Find.Background.initializeBrowserAction(message, tab, sendResponse);
                break;
            case 'get_occurrence':
                Find.Background.extractOccurrences(message, tab, sendResponse);
                break;
        }
    }
});
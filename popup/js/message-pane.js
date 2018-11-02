'use strict';

/**
 * Create the Popup MessagePane namespace.
 * */
Find.register('Popup.MessagePane', function (self) {

    /**
     * Display an error message that indicates that the current URL is forbidden.
     * */
    self.showChromeNamespaceErrorMessage = function() {
        document.getElementById('extension-message-body').style.display = 'initial';
        document.getElementById('extension-limitation-chrome-settings-text').style.display = 'initial';
    };

    /**
     * Display an error message that indicates that the current URL is forbidden.
     * */
    self.showChromeWebStoreErrorMessage = function() {
        document.getElementById('extension-message-body').style.display = 'initial';
        document.getElementById('extension-limitation-web-store-text').style.display = 'initial';
    };

    /**
     * Display an error message that indicates that the current page cannot be parsed.
     * */
    self.showPDFSearchErrorMessage = function() {
        document.getElementById('extension-message-body').style.display = 'initial';
        document.getElementById('extension-limitation-pdf-fileview-text').style.display = 'initial';
    };

    /**
     * Display an error message that indicates that the current page cannot be parsed.
     * */
    self.showOfflineFileErrorMessage = function() {
        document.getElementById('extension-message-body').style.display = 'initial';
        document.getElementById('extension-limitation-offline-file-search-text').style.display = 'initial';
    };
});
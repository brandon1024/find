'use strict';

/**
 * Find-and-Replace tool for input/editable elements on the page.
 *
 * This tool is accessed by right clicking the element and selecting the context menu.
 * */
Find.register('Content.InputReplace', function(self) {

    self.init = function() {
        setupContextMenuEventListener();
    };

    /**
     * Executed once the background script notifies the content script that
     * the user clicked the context menu.
     * */
    self.showDialog = function() {
        console.log('1');
        //todo
    };

    /**
     *
     * */
    function showDialog(target) {
        console.log(target);
    }

    /**
     * Register a promise that resolves when the contextmenu event is fired. This promise is needed
     * to ensure that the background script has notified the context script that the user selected the
     * input-replace context menu tool, but also get the target element id from the contextmenu event.
     * */
    function setupContextMenuEventListener() {
        //todo
    }
});

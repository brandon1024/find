'use strict';

/**
 *
 * */
Find.register('Popup.BrowserAction', function (namespace) {
    namespace.init = function() {
        let initialized = false;
        let index = 0;
        let options = {
            'find_by_regex': true,
            'match_case': true,
            'persistent_highlights': false,
            'max_results': 0
        };


    };

    /**
     *
     * */
    namespace.closeExtension = function() {
        Find.Popup.BackgroundProxy.closeConnection();
        window.close();
    };
});
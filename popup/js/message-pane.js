'use strict';

/**
 *
 * */
Find.register('Popup.MessagePane', function (namespace) {

    /**
     *
     * */
    namespace.showMalformedRegexIcon = function(flag) {
        document.getElementById('invalid-regex-icon').style.display = flag ? 'initial' : 'none';
    };

    /**
     *
     * */
    namespace.showOfflineFileErrorIcon = function(flag) {
        document.getElementById('offline-file-search-err').style.display = flag ? 'initial' : 'none';
    };
});
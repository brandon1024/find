'use strict';

/**
 * Create the Background ContentProxy namespace. Serves as mediator between the content
 * in the web page and the background scripts.
 * */
Find.register("Background.ContentProxy", function(self) {

    /**
     * Request from a given page a representation of the text nodes in the page's document.
     *
     * @param {object} tab - The tab to which the request will be made.
     * @param {function} callback - The callback function that will utilize the document object model.
     * @param {function} [error] - Callback function for handing an error.
     * */
    self.buildDocumentRepresentation = function(tab, callback, error) {
        Find.browser.tabs.sendMessage(tab.id, {action: 'init'}, (response) => {
            if(response && response.model) {
                callback(response.model);
            } else if(error) {
                error();
            }
        });
    };

    /**
     * Restore the page by removing reference markup to next nodes in the page. Highlight marking will not be removed.
     *
     * @param {object} tab - The tab from which all markup will be removed.
     * @param {array} nodeReferences - Array of node reference UUIDs.
     * @param {function} [callback] - Callback invoked when the page is restored.
     * */
    self.restoreWebPage = function(tab, nodeReferences, callback) {
        Find.browser.tabs.sendMessage(tab.id, {
            action: 'restore',
            uuids: nodeReferences
        }, callback);
    };

    /**
     * Update the highlights in the page once the search query or options change.
     *
     * @param {object} tab - The tab that will be updated
     * @param {string} regex - The regular expression or query
     * @param {number} index - The index of the first occurrence
     * @param {object} occurrenceMap - A special object that maps occurrences of the regex to individual text nodes.
     * @param {object} options - The search options
     * @param {function} [callback] - Callback invoked when the page highlights are updated.
     * */
    self.updatePageHighlights = function(tab, regex, index, occurrenceMap, options, callback) {
        Find.browser.tabs.sendMessage(tab.id, {
            action: 'update',
            occurrenceMap: occurrenceMap,
            index: index,
            regex: regex,
            options: options
        }, callback);
    };

    /**
     * Seek the search forward or backward.
     *
     * @param {object} tab - The tab that will be updated
     * @param {number} index - The index of the occurrence to seek to
     * @param {object} options - The search options
     * @param {function} [callback] - Callback invoked when complete.
     * */
    self.seekHighlight = function(tab, index, options, callback) {
        Find.browser.tabs.sendMessage(tab.id, {
            action: 'seek',
            index: index,
            options: options
        }, callback);
    };

    /**
     * Remove all highlights from the page.
     *
     * @param {object} tab - The tab from which to remove all highlights
     * @param {function} [callback] - Callback invoked when the highlights are removed from the page.
     * */
    self.clearPageHighlights = function(tab, callback) {
        Find.browser.tabs.sendMessage(tab.id, {action: 'highlight_restore'}, callback);
    };

    /**
     * Replace a single occurrence of the regular expression with a given piece of text in the page.
     *
     * @param {object} tab - The tab that will be updated
     * @param {number} index - The specific index of the occurrence that will be replaced
     * @param {string} replaceWith - The text that will replace the occurrence of the regex
     * @param {object} options - The search options
     * @param {function} [callback] - Callback invoked when the occurrence is replaced.
     * */
    self.replaceOccurrence = function(tab, index, replaceWith, options, callback) {
        Find.browser.tabs.sendMessage(tab.id, {
            action: 'replace',
            index: index,
            replaceWith: replaceWith,
            options: options
        }, callback);
    };

    /**
     * Replace all occurrences of the regular expression with a given piece of text in the page.
     *
     * @param {object} tab - The tab that will be updated
     * @param {string} replaceWith - The text that will replace each occurrence of the regex
     * @param {object} options - The search options
     * @param {function} [callback] - Callback invoked when the occurrences are replaced.
     * */
    self.replaceAllOccurrences = function(tab, replaceWith, options, callback) {
        Find.browser.tabs.sendMessage(tab.id, {
            action: 'replace_all',
            replaceWith: replaceWith,
            options: options
        }, callback);
    };

    /**
     * Follow the link in the page at the current index.
     *
     * @param {object} tab - The tab with the search
     * @param {function} [callback] - Callback invoked once the operation is complete.
     * */
    self.followLinkUnderFocus = function(tab, callback) {
        Find.browser.tabs.sendMessage(tab.id, {action: 'follow_link'}, callback);
    };

    /**
     * Send a fetch message to the given tab to ensure that it responds. A successful response
     * indicates that the content scripts were loaded successfully.
     *
     * @param {object} tab - The tab to fetch.
     * @param {function} callback - Callback invoked once the operation is complete.
     * */
    self.fetch = function(tab, callback) {
        Find.browser.tabs.sendMessage(tab.id, {action: 'fetch'}, callback);
    };

    /**
     * Execute a given script in a specific tab.
     *
     * @param {object} tab - The tab with the search.
     * @param {object} details - Details of the script to run. Either the code or the file property must be set, but
     * both may not be set at the same time.
     * @param {function} [callback] - Callback invoked once the operation is complete.
     * */
    self.executeScript = function(tab, details, callback) {
        Find.browser.tabs.executeScript(tab.id, details, callback);
    };
});
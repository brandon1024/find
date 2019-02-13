'use strict';

/**
 * Create the Background namespace. The background coordinates activities between the browser
 * action popup and the content in the web page. The background keeps track of the state of the
 * search, along with other necessary data to seek, replace, and perform other actions efficiently.
 * */
Find.register("Background", function(self) {

    /**
     * Allocated on the namespace to allow the BrowserActionProxy to communicate installation
     * details to the browser action popup if the extension was recently installed or updated.
     * */
    self.installationDetails = null;
    self.options = null;

    let documentRepresentation = null;
    let regexOccurrenceMap = null;
    let index = null;

    /**
     * Inject content scripts into pages once installed (not performed automatically in Chrome)
     */
    Find.browser.runtime.onInstalled.addListener((installation) => {
        self.installationDetails = installation.details;

        if(Find.browserId === 'Firefox') {
            return;
        }

        let scripts =  Find.browser.runtime.getManifest().content_scripts[0].js;
        Find.browser.tabs.query({}, (tabs) => {
            for(let tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
                let url = tabs[tabIndex].url;
                if(url.match(/chrome:\/\/.*/) || url.match(/https:\/\/chrome.google.com\/webstore\/.*/)) {
                    continue;
                }

                for (let i = 0; i < scripts.length; i++) {
                    Find.Background.ContentProxy.executeScript(tabs[tabIndex], {file: scripts[i]});
                }
            }
        });
    });

    /**
     * Initialize the browser action. Fetches the web page to ensure that the content scripts
     * have been properly injected. If the content script responds, the selected text is retrieved
     * from the page and included in the response to the popup.
     *
     * If the content script still has state variables, such as the index and regex of the last search,
     * this information is used to initialize the extension.
     *
     * @param {object} message - The message containing the details about the action.
     * @param {object} tab - Information about the active tab in the current window.
     * @param {function} sendResponse - Function used to issue a response back to the popup.
     * */
    self.initializeBrowserAction = function(message, tab, sendResponse) {
        let resp = {};
        resp.activeTab = tab;

        Find.Background.ContentProxy.fetch(tab, (response) => {
            resp.isReachable = response && response.success;
            if(resp.isReachable) {
                resp.selectedText = response.selection;
                resp.regex = response.regex;
                resp.iframes = response.iframes;
                index = response.index || 0;
            }

            sendResponse({action: 'browser_action_init', response: resp});
        });
    };

    /**
     * Initialize the extension by constructing the page document representation.
     *
     * @param {object} tab - Information about the active tab in the current window.
     * */
    self.initializePage = function(tab) {
        Find.Background.ContentProxy.buildDocumentRepresentation(tab, (model) => {
            documentRepresentation = model;
            index = 0;
        });
    };

    /**
     * Remove any highlights and markup from the active tab in the current window. Also resets
     * any state variables, such as the current index, document representation and occurrence map.
     *
     * @param {boolean} [restoreHighlights] - If undefined or true, remove highlights. If false,
     * highlights are not removed, and are persisted in the page.
     * */
    self.restorePageState = function(restoreHighlights) {
        Find.browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if(restoreHighlights === undefined || restoreHighlights) {
                Find.Background.ContentProxy.clearPageHighlights(tabs[0]);
            }

            let uuids = getUUIDsFromModelObject(documentRepresentation);
            Find.Background.ContentProxy.restoreWebPage(tabs[0], uuids);

            documentRepresentation = null;
            regexOccurrenceMap = null;
            index = null;
        });
    };

    /**
     * Update the search when the search query or search options change. Builds a new occurrence map from the
     * documentRepresentation object, highlight the occurrence in the page, and send the indices
     * to the browser action popup through the sendResponse function.
     *
     * If the background has not been initialized properly (documentRepresentation is null), simply returns.
     *
     * If the regex is invalid, removes all highlights from the page and sends appropriate response
     * to the popup.
     *
     * @param {object} message - The message containing the details about the search, including the search
     * options and search query.
     * @param {object} tab - Information about the active tab in the current window.
     * @param {function} sendResponse - Function used to issue a response back to the popup.
     * */
    self.updateSearch = function(message, tab, sendResponse) {
        try {
            if(!documentRepresentation) {
                return;
            }

            self.options = message.options;
            let regex = message.regex;

            //If searching by string, escape all regex metacharacters
            if(!self.options.find_by_regex) {
                regex = regex.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
            }

            //Ensure non-empty search
            if(regex.length === 0) {
                sendResponse({action: 'empty_regex'});
                Find.Background.ContentProxy.clearPageHighlights(tab);
                return;
            }

            //Build occurrence map, reposition index if necessary
            console.log(index);
            regexOccurrenceMap = buildOccurrenceMap(documentRepresentation, regex, self.options);
            if(index > regexOccurrenceMap.length-1) {
                if(regexOccurrenceMap.length !== 0) {
                    index = regexOccurrenceMap.length - 1;
                } else {
                    index = 0;
                }
            }

            if(self.options.max_results !== 0 && index >= self.options.max_results) {
                index = self.options.max_results - 1;
            }

            //Invoke update action
            Find.Background.ContentProxy.updatePageHighlights(tab, regex, index, regexOccurrenceMap, self.options);

            //If occurrence map empty, viewable index is zero
            let viewableIndex = index + 1;
            if(regexOccurrenceMap.length === 0) {
                viewableIndex = 0;
            }

            //if occurrence map larger than max results, viewable total is max results
            let viewableTotal = regexOccurrenceMap.length;
            if(self.options.max_results !== 0 && self.options.max_results <= regexOccurrenceMap.length) {
                viewableTotal = self.options.max_results;
            }

            sendResponse({
                action: 'index_update',
                index: viewableIndex,
                total: viewableTotal
            });
        } catch(e) {
            sendResponse({action: 'invalid_regex', error: e.message});
            Find.Background.ContentProxy.clearPageHighlights(tab);
        }
    };

    /**
     * Move forward or backward the current search index, and respond to the popup
     * the new search index.
     *
     * @param {object} message - The message containing the details about the search options.
     * @param {boolean} seekForward - Specifies whether to seek forward or backward.
     * @param {object} tab - Information about the active tab in the current window.
     * @param {function} sendResponse - Function used to issue a response back to the popup.
     * */
    self.seekSearch = function(message, seekForward, tab, sendResponse) {
        self.options= message.options;
        let indexCap = self.options.max_results !== 0;

        //If reached end, reset index
        if(seekForward) {
            index = computeSubsequentIndex(index, regexOccurrenceMap, self.options);
        } else {
            index = computePrecedingIndex(index, regexOccurrenceMap, self.options);
        }

        //Invoke seek action
        Find.Background.ContentProxy.seekHighlight(tab, index, self.options);

        let viewableIndex = regexOccurrenceMap.length === 0 ? 0 : index+1;
        let viewableTotal = (indexCap && self.options.max_results <= regexOccurrenceMap.length) ?
            self.options.max_results : regexOccurrenceMap.length;
        sendResponse({
            action: 'index_update',
            index: viewableIndex,
            total: viewableTotal
        });
    };

    /**
     * Replace the occurrence of the search query with a given replacement string, and invalidate the search
     * state.
     *
     * @param {object} message - The message containing the details about the action, including the index to
     * replace, the replacement string, and the search options.
     * @param {object} tab - Information about the active tab in the current window.
     * @param {function} sendResponse - Function used to issue a response back to the popup.
     * */
    self.replaceNext = function(message, tab, sendResponse) {
        Find.Background.ContentProxy.replaceOccurrence(tab, message.index - 1, message.replaceWith, message.options);

        //Restore Web Page
        Find.Background.ContentProxy.clearPageHighlights(tab);

        let uuids = getUUIDsFromModelObject(documentRepresentation);
        Find.Background.ContentProxy.restoreWebPage(tab, uuids, () => {
            //Rebuild documentRepresentation and invalidate
            Find.Background.ContentProxy.buildDocumentRepresentation(tab, (model) => {
                documentRepresentation = model;
                sendResponse({action: 'invalidate'});
            });
        });
    };

    /**
     * Replace all occurrences of the search query with a given replacement string, and invalidate the search
     * state.
     *
     * @param {object} message - The message containing the details about the action, the replacement string,
     * and the search options.
     * @param {object} tab - Information about the active tab in the current window.
     * @param {function} sendResponse - Function used to issue a response back to the popup.
     * */
    self.replaceAll = function(message, tab, sendResponse) {
        Find.Background.ContentProxy.replaceAllOccurrences(tab, message.replaceWith, message.options);

        //Restore Web Page
        Find.Background.ContentProxy.clearPageHighlights(tab);

        let uuids = getUUIDsFromModelObject(documentRepresentation);
        Find.Background.ContentProxy.restoreWebPage(tab, uuids, () => {
            //Rebuild documentRepresentation and invalidate
            Find.Background.ContentProxy.buildDocumentRepresentation(tab, (model) => {
                documentRepresentation = model;
                sendResponse({action: 'invalidate'});
            });
        });
    };

    /**
     * Follow the link at the current occurrence index in the page.
     *
     * @param {object} message - The message containing the details about the action.
     * @param {object} tab - Information about the active tab in the current window.
     * @param {function} sendResponse - Function used to issue a response back to the popup.
     * */
    self.followLinkUnderFocus = function(message, tab, sendResponse) {
        Find.Background.ContentProxy.followLinkUnderFocus(tab);
        sendResponse({action: 'close'});
    };

    /**
     * Extract from the regex occurrence map the current or all occurrences of the search query
     * and respond to the popup. Used to allow the occurrences to be copied to the clipboard.
     *
     * If the cardinality is 'all', a line feed separated string of occurrences is returned.
     * Otherwise, only the current occurrence is returned.
     *
     * @param {object} message - The message containing the details about the action.
     * @param {object} tab - Information about the active tab in the current window.
     * @param {function} sendResponse - Function used to issue a response back to the popup.
     * */
    self.extractOccurrences = function(message, tab, sendResponse) {
        let cardinality = message.options.cardinality;
        let resp;

        if(cardinality === 'all') {
            let occurrences = [];
            for(let occIndex = 0; occIndex < regexOccurrenceMap.length; occIndex++) {
                occurrences.push(regexOccurrenceMap.occurrenceIndexMap[occIndex].occurrence);
            }

            resp = occurrences.join('\n');
        } else {
            resp = regexOccurrenceMap.occurrenceIndexMap[index].occurrence;
        }

        sendResponse({action: 'get_occurrence', response: resp});
    };

    /**
     * Construct an occurrence map object from a document representation and regular expression.
     * The occurrence map is used to map occurrences of a given regex to nodes in the DOM.
     *
     * The occurrence map will have the following format:
     * {
     *     occurrenceIndexMap: {
     *          1: {
     *              groupIndex: _index to the parent group of this occurrence_,
     *              subIndex: _the occurrence subindex of the parent group_,
     *              occurrence: _the matched text_
     *          }, ...
     *     },
     *     length: _number of occurrences of the regex_,
     *     groups: _number of occurrence groups_,
     *     1: {
     *         uuids: [...],
     *         count: _number of matches in this group_,
     *         preformated: _whether or not the text node in the DOM is preformatted_
     *     }, ...
     * }
     *
     * @private
     * @param {object} documentRepresentation - The representation of the page's DOM
     * @param {string} regex - A regular expression
     * @param {object} options - Options used to alter the creation of the occurrence map.
     * @return {object} occurrence map
     * */
    function buildOccurrenceMap(documentRepresentation, regex, options) {
        let occurrenceMap = {occurrenceIndexMap: {}, length: null, groups: null};
        let count = 0;
        let groupIndex = 0;

        regex = regex.replace(/ /g, '\\s');
        regex = (options.match_case) ? new RegExp(regex, 'gm') : new RegExp(regex, 'gmi');

        //Loop over all text nodes in documentRepresentation
        for(let key in documentRepresentation) {
            let textNodes = documentRepresentation[key].group, preformatted = documentRepresentation[key].preformatted;
            let textGroup = '';
            let uuids = [];
            for(let nodeIndex = 0; nodeIndex < textNodes.length; nodeIndex++) {
                textGroup += textNodes[nodeIndex].text;
                uuids.push(textNodes[nodeIndex].elementUUID);
            }

            let matches = textGroup.match(regex);
            if(!matches) {
                continue;
            }

            count += matches.length;
            occurrenceMap[groupIndex] = {
                uuids: uuids,
                count: matches.length,
                preformatted: preformatted
            };

            for(let matchesIndex = 0; matchesIndex < matches.length; matchesIndex++) {
                let occMapIndex = matchesIndex + (count - matches.length);
                occurrenceMap.occurrenceIndexMap[occMapIndex] = {groupIndex: groupIndex, subIndex: matchesIndex, occurrence: matches[matchesIndex]};
            }

            groupIndex++;

            //If reached maxIndex, exit
            if(options.max_results !== 0 && count >= options.max_results) {
                break;
            }
        }

        occurrenceMap.length = count;
        occurrenceMap.groups = groupIndex;
        return occurrenceMap;
    }

    /**
     * Increment the given index, wrapping back to zero if reached end of occurrence map or index cap.
     *
     * @private
     * @param {number} index - The current index
     * @param {object} regexOccurrenceMap - The occurrence map object
     * @param {object} options - The search options
     * @return {number} the new index
     * */
    function computeSubsequentIndex(index, regexOccurrenceMap, options) {
        //If reached end, reset index
        let indexCap = self.options.max_results !== 0;
        if(index >= regexOccurrenceMap.length-1 || (indexCap && index >= options.max_results-1)) {
            return 0;
        }

        return index + 1;
    }

    /**
     * Decrement the given index, wrapping back to the end if reached zero.
     *
     * @private
     * @param {number} index - The current index
     * @param {object} regexOccurrenceMap - The occurrence map object
     * @param {object} options - The search options
     * @return {number} the new index
     * */
    function computePrecedingIndex(index, regexOccurrenceMap, options) {
        //If reached start, set index to last occurrence
        let indexCap = self.options.max_results !== 0;
        if(index <= 0) {
            if(indexCap && options.max_results <= regexOccurrenceMap.length) {
                return options.max_results - 1;
            }

            return regexOccurrenceMap.length - 1;
        } else {
            return index - 1;
        }
    }

    /**
     * Extract UUIDs from the document representation object.
     *
     * @private
     * @param {object} documentRepresentation - The document representation object
     * @return {array} a list of UUIDs
     * */
    function getUUIDsFromModelObject(documentRepresentation) {
        let uuids = [];

        for(let key in documentRepresentation) {
            let textNodes = documentRepresentation[key].group;
            for(let index = 0; index < textNodes.length; index++) {
                uuids.push(textNodes[index].elementUUID);
            }
        }

        return uuids;
    }
});

'use strict';

//Support Chrome and Firefox
window.browser_id = typeof browser !== 'undefined' ? 'Firefox' : 'Chrome';
window.browser = (() => {
    return window.chrome || window.browser;
})();

let DOMModelObject = null;
let regexOccurrenceMap = null;
let options = null;
let index = null;
let regex = null;

let installed = null;

//Inject content scripts into pages on installed (not performed automatically in Chrome)
browser.runtime.onInstalled.addListener((details) => {
    if(browser_id === 'Firefox') {
        return;
    }

    installed = {details: details};

    let manifest = browser.runtime.getManifest();
    let scripts = manifest.content_scripts[0].js;
    let css = manifest.content_scripts[0].css;

    browser.tabs.query({}, (tabs) => {
        for(let tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
            let url = tabs[tabIndex].url;
            if(url.match(/chrome:\/\/.*/) || url.match(/https:\/\/chrome.google.com\/webstore\/.*/)) {
                continue;
            }

            for (let i = 0; i < scripts.length; i++) {
                browser.tabs.executeScript(tabs[tabIndex].id, {file: scripts[i]});
            }

            for (let i = 0; i < css.length; i++) {
                browser.tabs.insertCSS(tabs[tabIndex].id, {file: css[i]});
            }
        }
    });
});

browser.runtime.onConnect.addListener((port) => {
    if(port.name !== 'popup_to_background_port') {
        return;
    }

    if(installed) {
        port.postMessage({action: 'install', details: installed.details});
        installed = null;
    }

    browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
        browser.tabs.sendMessage(tabs[0].id, {action: 'highlight_restore'});

        //Invoke action on message from popup script
        port.onMessage.addListener((message) => {
            invokeAction(message.action, port, tabs[0], message);
        });

        //Handle extension close
        port.onDisconnect.addListener(() => {
            if(!options || !options.persistent_highlights) {
                browser.tabs.sendMessage(tabs[0].id, {action: 'highlight_restore'});
            }

            let uuids = getUUIDsFromModelObject(DOMModelObject);
            browser.tabs.sendMessage(tabs[0].id, {action: 'restore', uuids: uuids});

            DOMModelObject = null;
            regexOccurrenceMap = null;
            index = null;
            regex = null;
        });

        //Perform init action
        browser.tabs.sendMessage(tabs[0].id, {action: 'init'}, (response) => {
            if(response && response.model) {
                DOMModelObject = response.model;
                index = 0;
            }
        });
    });
});

//Omnibox support
browser.omnibox.setDefaultSuggestion({description: 'Enter a regular expression'});

browser.omnibox.onInputStarted.addListener(() => {
    browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
        //Perform init action
        browser.tabs.sendMessage(tabs[0].id, {action: 'init'}, (response) => {
            if(response && response.model) {
                DOMModelObject = response.model;
            }
        });
    });
});

browser.omnibox.onInputChanged.addListener((regex) => {
    browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
        try {
            if (!DOMModelObject) {
                return;
            }

            //Ensure non-empty search
            if (regex.length === 0) {
                browser.tabs.sendMessage(tabs[0].id, {action: 'highlight_restore'});
                return;
            }

            //Build occurrence map, reposition index if necessary
            regexOccurrenceMap = buildOccurrenceMap(DOMModelObject, regex, null);

            //Invoke highlight_update action, index_update action
            browser.tabs.sendMessage(tabs[0].id, {
                action: 'omni_update',
                occurrenceMap: regexOccurrenceMap,
                regex: regex
            });
        }
        catch (e) {
            browser.tabs.sendMessage(tabs[0].id, {action: 'highlight_restore'});
        }
    });
});

browser.omnibox.onInputCancelled.addListener(() => {
    browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
        browser.tabs.sendMessage(tabs[0].id, {action: 'highlight_restore'});
        let uuids = getUUIDsFromModelObject(DOMModelObject);
        browser.tabs.sendMessage(tabs[0].id, {action: 'restore', uuids: uuids});

        DOMModelObject = null;
        regexOccurrenceMap = null;
        index = null;
        regex = null;
    });
});

browser.omnibox.onInputEntered.addListener(() => {
    browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
        let uuids = getUUIDsFromModelObject(DOMModelObject);
        browser.tabs.sendMessage(tabs[0].id, {action: 'restore', uuids: uuids});

        DOMModelObject = null;
        regexOccurrenceMap = null;
        index = null;
        regex = null;
    });
});

//Dispatch action function
function invokeAction(action, port, tab, message) {
    if(action === 'update') {
        actionUpdate(port, tab.id, message);
    } else if(action === 'next') {
        actionNext(port, tab.id, message);
    } else if(action === 'previous') {
        actionPrevious(port, tab.id, message);
    } else if(action === 'replace_next') {
        replaceNext(port, tab.id, message);
    } else if(action === 'replace_all') {
        replaceAll(port, tab.id, message);
    } else if(action === 'follow_link') {
        followLinkUnderFocus(port, tab.id);
    } else if(action === 'browser_action_init') {
        initializeBrowserAction(port, tab);
    } else if(action === 'get_occurrence') {
        extractOccurrences(port, message);
    }
}

//Action Update
function actionUpdate(port, tabID, message) {
    browser.tabs.sendMessage(tabID, {action: 'update'}, (response) => {
        try {
            if(!DOMModelObject) {
                return;
            }

            options = message.options;
            regex = message.regex;

            //If searching by string, escape all regex metacharacters
            if(!options.find_by_regex) {
                regex = regex.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
            }

            //Ensure non-empty search
            if(regex.length === 0) {
                port.postMessage({action: 'empty_regex'});
                browser.tabs.sendMessage(tabID, {action: 'highlight_restore'});
                return;
            }

            //Build occurrence map, reposition index if necessary
            regexOccurrenceMap = buildOccurrenceMap(DOMModelObject, regex, options);
            if(index > regexOccurrenceMap.length-1) {
                if(regexOccurrenceMap.length !== 0) {
                    index = regexOccurrenceMap.length - 1;
                } else {
                    index = 0;
                }
            }

            if(options.max_results !== 0 && index >= options.max_results)
                index = options.max_results - 1;

            //Invoke highlight_update action, index_update action
            browser.tabs.sendMessage(tabID, {
                action: 'highlight_update',
                occurrenceMap: regexOccurrenceMap,
                index: index,
                regex: regex,
                options: options
            });

            //If occurrence map empty, viewable index is zero
            let viewableIndex = index + 1;
            if(regexOccurrenceMap.length === 0) {
                viewableIndex = 0;
            }

            //if occurrence map larger than max results, viewable total is max results
            let viewableTotal = regexOccurrenceMap.length;
            if(options.max_results !== 0 && options.max_results <= regexOccurrenceMap.length) {
                viewableTotal = options.max_results;
            }

            port.postMessage({
                action: 'index_update',
                index: viewableIndex,
                total: viewableTotal
            });
        } catch(e) {
            port.postMessage({action: 'invalid_regex', error: e.message});
        }
    });
}

//Action Next
function actionNext(port, tabID, message) {
    options = message.options;
    let indexCap = options.max_results !== 0;

    //If reached end, reset index
    if(index >= regexOccurrenceMap.length-1 || (indexCap && index >= options.max_results-1)) {
        index = 0;
    } else {
        index++;
    }

    //Invoke highlight_seek action, index_update action
    browser.tabs.sendMessage(tabID, {
        action: 'highlight_seek',
        occurrenceMap: regexOccurrenceMap,
        index: index,
        regex: regex
    });

    let viewableIndex = regexOccurrenceMap.length === 0 ? 0 : index+1;
    let viewableTotal = (indexCap && options.max_results <= regexOccurrenceMap.length) ? options.max_results : regexOccurrenceMap.length;
    port.postMessage({
        action: 'index_update',
        index: viewableIndex,
        total: viewableTotal
    });
}

//Action Previous
function actionPrevious(port, tabID, message) {
    options = message.options;
    let indexCap = options.max_results !== 0;

    //If reached start, set index to last occurrence
    if(index <= 0) {
        if(indexCap && options.max_results <= regexOccurrenceMap.length) {
            index = options.max_results - 1;
        } else {
            index = regexOccurrenceMap.length - 1;
        }
    } else {
        index--;
    }

    //Invoke highlight_seek action, index_update action
    browser.tabs.sendMessage(tabID, {
        action: 'highlight_seek',
        occurrenceMap: regexOccurrenceMap,
        index: index,
        regex: regex
    });

    let viewableIndex = regexOccurrenceMap.length === 0 ? 0 : index+1;
    let viewableTotal = (indexCap && options.max_results <= regexOccurrenceMap.length) ? options.max_results : regexOccurrenceMap.length;
    port.postMessage({
        action: 'index_update',
        index: viewableIndex,
        total: viewableTotal
    });
}

function replaceNext(port, tabID, message) {
    browser.tabs.sendMessage(tabID, {
        action: 'highlight_replace',
        index: message.index - 1,
        replaceWith: message.replaceWith,
        options: message.options
    });

    //Restore Web Page
    browser.tabs.sendMessage(tabID, {action: 'highlight_restore'});

    let uuids = getUUIDsFromModelObject(DOMModelObject);
    browser.tabs.sendMessage(tabID, {action: 'restore', uuids: uuids}, (response) => {
        //Rebuild DOMModelObject and invalidate
        browser.tabs.sendMessage(tabID, {action: 'init'}, (response) => {
            if(response && response.model) {
                DOMModelObject = response.model;
                port.postMessage({action: 'invalidate'});
            }
        });
    });
}

function replaceAll(port, tabID, message) {
    browser.tabs.sendMessage(tabID, {
        action: 'highlight_replace_all',
        replaceWith: message.replaceWith,
        options: message.options
    });

    //Restore Web Page
    browser.tabs.sendMessage(tabID, {action: 'highlight_restore'});

    let uuids = getUUIDsFromModelObject(DOMModelObject);
    browser.tabs.sendMessage(tabID, {action: 'restore', uuids: uuids}, (response) => {
        //Rebuild DOMModelObject and invalidate
        browser.tabs.sendMessage(tabID, {action: 'init'}, (response) => {
            if(response && response.model) {
                DOMModelObject = response.model;
                port.postMessage({action: 'invalidate'});
            }
        });
    });
}

function followLinkUnderFocus(port, tabID) {
    browser.tabs.sendMessage(tabID, {action: 'follow_link'});
    port.postMessage({action: 'close'});
}

//Build all the information required to initialize the browser extension.
function initializeBrowserAction(port, tab) {
    let resp = {};
    resp.activeTab = tab;

    browser.tabs.sendMessage(tab.id, {action: 'poll'}, (response) => {
        resp.isReachable = response && response.success;

        if(resp.isReachable) {
            browser.tabs.executeScript(tab.id, {code: 'window.getSelection().toString();'}, (selection) => {
                resp.selectedText = selection[0];
                port.postMessage({action: 'browser_action_init', response: resp});
            });
        } else {
            port.postMessage({action: 'browser_action_init', response: resp});
        }
    });
}

//Extract one or all occurrences and post to the popup UI.
function extractOccurrences(port, message) {
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

    port.postMessage({action: 'get_occurrence', response: resp});
}

//Build occurrence map from DOM model and regex
function buildOccurrenceMap(DOMModelObject, regex, options) {
    let occurrenceMap = {occurrenceIndexMap: {}, length: null, groups: null};
    let count = 0;
    let groupIndex = 0;

    regex = regex.replace(/ /g, '\\s');
    regex = (options && options.match_case) ? new RegExp(regex, 'gm') : new RegExp(regex, 'gmi');

    //Loop over all text nodes in DOMModelObject
    for(let key in DOMModelObject) {
        let textNodes = DOMModelObject[key].group, preformatted = DOMModelObject[key].preformatted;
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
        if(options && options.max_results !== 0 && count >= options.max_results) {
            break;
        }
    }

    occurrenceMap.length = count;
    occurrenceMap.groups = groupIndex;
    return occurrenceMap;
}

//Get all group uuids from model object
function getUUIDsFromModelObject(modelObject) {
    let uuids = [];

    for(let key in modelObject) {
        let textNodes = modelObject[key].group;
        for(let index = 0; index < textNodes.length; index++) {
            uuids.push(textNodes[index].elementUUID);
        }
    }

    return uuids;
}


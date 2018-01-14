"use strict";

window.browser = (function () {
    return window.chrome || window.browser;
})();

var DOMModelObject;
var regexOccurrenceMap = null;
var index = null;
var regex = null;

//Inject content scripts into pages on installed (not performed automatically)
browser.runtime.onInstalled.addListener(function(details) {
    var manifest = browser.runtime.getManifest();
    var scripts = manifest.content_scripts[0].js;
    var css = manifest.content_scripts[0].css;

    browser.tabs.query({}, function (tabs) {
        for(var tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
            var url = tabs[tabIndex].url;
            if(!(url.match(/chrome:\/\/newtab\//)) && (url.match(/chrome:\/\/.*/) || url.match(/https:\/\/chrome.google.com\/webstore\/.*/)))
                continue;

            for (var i = 0; i < scripts.length; i++)
                browser.tabs.executeScript(tabs[tabIndex].id, {file: scripts[i]});

            for (i = 0; i < css.length; i++)
                browser.tabs.insertCSS(tabs[tabIndex].id, {file: css[i]});
        }
    });
});

browser.runtime.onConnect.addListener(function(port) {
    if(port.name != 'popup_to_backend_port')
        return;

    //Listen to port to popup.js for action
    browser.tabs.query({active: true, currentWindow: true}, function (tabs) {
        port.onMessage.addListener(function (message) {
            invokeAction(message.action, port, tabs[0].id, message);
        });
    });

    //Handle extension close
    browser.tabs.query({active: true, currentWindow: true}, function (tabs) {
        port.onDisconnect.addListener(function() {
            browser.tabs.sendMessage(tabs[0].id, {action: 'highlight_restore'});
            var uuids = getUUIDsFromModelObject(DOMModelObject);
            browser.tabs.sendMessage(tabs[0].id, {action: 'restore', uuids: uuids});

            DOMModelObject = null;
            regexOccurrenceMap = null;
            index = null;
            regex = null;
        });
    });

    //perform init action
    browser.tabs.query({active: true, currentWindow: true}, function (tabs) {
        browser.tabs.sendMessage(tabs[0].id, {action: 'init'}, function (response) {
            if(response && response.model) {
                DOMModelObject = response.model;
                index = 0;
            }
        });
    });
});

//Dispatch action function
function invokeAction(action, port, tabID, message) {
    if(action == 'update')
        actionUpdate(port, tabID, message);
    else if(action == 'next')
        actionNext(port, tabID, message);
    else if(action == 'previous')
        actionPrevious(port, tabID, message);
    else if(action == 'replace_next')
        replaceNext(port, tabID, message);
    else if(action == 'replace_all')
        replaceAll(port, tabID, message);
}

//Action Update
function actionUpdate(port, tabID, message) {
    browser.tabs.sendMessage(tabID, {action: 'update'}, function (response) {
        try {
            if(!DOMModelObject)
                return;

            var options = message.options;
            regex = message.regex;

            //If searching by string, escape all regex metacharacters
            if(!options.find_by_regex)
                regex = regex.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");

            //Ensure non-empty search
            if(regex.length == 0) {
                port.postMessage({action: "empty_regex"});
                browser.tabs.sendMessage(tabID, {action: 'highlight_restore'});
                return;
            }

            //Build occurrence map, reposition index if necessary
            regexOccurrenceMap = buildOccurrenceMap(DOMModelObject, regex, options);
            if(index > regexOccurrenceMap.length-1) {
                if(regexOccurrenceMap.length != 0)
                    index = regexOccurrenceMap.length-1;
                else
                    index = 0;
            }

            if(options.max_results != 0 && index >= options.max_results)
                index = options.max_results - 1;

            //Invoke highlight_update action, index_update action
            browser.tabs.sendMessage(tabID, {action: 'highlight_update', occurrenceMap: regexOccurrenceMap, index: index, regex: regex, options: options});

            //If occurrence map empty, viewable index is zero
            var viewableIndex = index + 1;
            if(regexOccurrenceMap.length == 0)
                viewableIndex = 0;

            //if occurrence map larger than max results, viewable total is max results
            var viewableTotal = regexOccurrenceMap.length;
            if(options.max_results != 0 && options.max_results <= regexOccurrenceMap.length)
                viewableTotal = options.max_results;

            port.postMessage({action: "index_update", index: viewableIndex, total: viewableTotal});
        }
        catch(e) {
            console.error(e);
            port.postMessage({action: "invalid_regex", error: e.message});
        }
    });
}

//Action Next
function actionNext(port, tabID, message) {
    var options = message.options;
    var indexCap = options.max_results != 0;

    //If reached end, reset index
    if(index >= regexOccurrenceMap.length-1 || (indexCap && index >= options.max_results-1))
        index = 0;
    else
        index++;

    //Invoke highlight_seek action, index_update action
    browser.tabs.sendMessage(tabID, {action: 'highlight_seek', occurrenceMap: regexOccurrenceMap, index: index, regex: regex});
    var viewableIndex = regexOccurrenceMap.length == 0 ? 0 : index+1;
    var viewableTotal = ((indexCap && options.max_results <= regexOccurrenceMap.length) ? options.max_results : regexOccurrenceMap.length);
    port.postMessage({action: "index_update", index: viewableIndex, total: viewableTotal});
}

//Action Previous
function actionPrevious(port, tabID, message) {
    var options = message.options;
    var indexCap = options.max_results != 0;

    //If reached start, set index to last occurrence
    if(index <= 0) {
        if(indexCap && options.max_results <= regexOccurrenceMap.length)
            index = options.max_results-1;
        else
            index = regexOccurrenceMap.length-1;
    }
    else
        index--;

    //Invoke highlight_seek action, index_update action
    browser.tabs.sendMessage(tabID, {action: 'highlight_seek', occurrenceMap: regexOccurrenceMap, index: index, regex: regex});
    var viewableIndex = regexOccurrenceMap.length == 0 ? 0 : index+1;
    var viewableTotal = ((indexCap && options.max_results <= regexOccurrenceMap.length) ? options.max_results : regexOccurrenceMap.length);
    port.postMessage({action: "index_update", index: viewableIndex, total: viewableTotal});
}

function replaceNext(port, tabID, message) {
    browser.tabs.sendMessage(tabID, {action: 'highlight_replace', index: message.index - 1, replaceWith: message.replaceWith, options: message.options});

    //Restore Web Page
    browser.tabs.sendMessage(tabID, {action: 'highlight_restore'});
    var uuids = getUUIDsFromModelObject(DOMModelObject);
    browser.tabs.sendMessage(tabID, {action: 'restore', uuids: uuids}, function(response) {
        //Rebuild DOMModelObject and invalidate
        browser.tabs.sendMessage(tabID, {action: 'init'}, function (response) {
            if(response && response.model) {
                DOMModelObject = response.model;
                port.postMessage({action: 'invalidate'});
            }
        });
    });
}

function replaceAll(port, tabID, message) {
    browser.tabs.sendMessage(tabID, {action: 'highlight_replace_all', replaceWith: message.replaceWith, options: message.options});

    //Restore Web Page
    browser.tabs.sendMessage(tabID, {action: 'highlight_restore'});
    var uuids = getUUIDsFromModelObject(DOMModelObject);
    browser.tabs.sendMessage(tabID, {action: 'restore', uuids: uuids}, function(response) {
        //Rebuild DOMModelObject and invalidate
        browser.tabs.sendMessage(tabID, {action: 'init'}, function (response) {
            if(response && response.model) {
                DOMModelObject = response.model;
                port.postMessage({action: 'invalidate'});
            }
        });
    });
}

//Build occurrence map from DOM model and regex
function buildOccurrenceMap(DOMModelObject, regex, options) {
    var occurrenceMap = {occurrenceIndexMap: {}, length: null, groups: null};
    var count = 0, groupIndex = 0;
    regex = regex.replace(/ /g, '\\s');

    if(options.match_case)
        regex = new RegExp(regex, 'gm');
    else
        regex = new RegExp(regex, 'gmi');

    //Loop over all text nodes in DOMModelObject
    for(var key in DOMModelObject) {
        var textNodes = DOMModelObject[key].group, preformatted = DOMModelObject[key].preformatted;
        var textGroup = '', uuids = [];
        for(var nodeIndex = 0; nodeIndex < textNodes.length; nodeIndex++) {
            textGroup += textNodes[nodeIndex].text;
            uuids.push(textNodes[nodeIndex].elementUUID);
        }

        var matches = textGroup.match(regex);
        if(!matches)
            continue;

        count += matches.length;
        occurrenceMap[groupIndex] = {text: textGroup, uuids: uuids, count: matches.length, preformatted: preformatted};

        for(var matchesIndex = 0; matchesIndex < matches.length; matchesIndex++) {
            var occMapIndex = matchesIndex + (count - matches.length);
            occurrenceMap.occurrenceIndexMap[occMapIndex] = {groupIndex: groupIndex, subIndex: matchesIndex};
        }

        groupIndex++;

        //If reached maxIndex, exit
        if(options.max_results != 0 && count >= options.max_results)
            break;
    }

    occurrenceMap.length = count;
    occurrenceMap.groups = groupIndex;
    return occurrenceMap;
}

//Get all group uuids from model object
function getUUIDsFromModelObject(modelObject) {
    var uuids = [];

    for(var key in modelObject) {
        var textNodes = modelObject[key].group;
        for(var index = 0; index < textNodes.length; index++)
            uuids.push(textNodes[index].elementUUID);
    }

    return uuids;
}


"use strict";

var DOMModelObject;
var regexOccurrenceMap = null;
var index = null;
var regex = null;

chrome.runtime.onInstalled.addListener(function(details) {
    var manifest = chrome.runtime.getManifest();
    var scripts = manifest.content_scripts[0].js;
    var css = manifest.content_scripts[0].css;

    chrome.tabs.query({}, function (tabs) {
        for(var tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
            var url = tabs[tabIndex].url;
            if(!(url.match(/chrome:\/\/newtab\//)) && (url.match(/chrome:\/\/.*/) || url.match(/https:\/\/chrome.google.com\/webstore\/.*/)))
                continue;

            for (var i = 0; i < scripts.length; i++)
                chrome.tabs.executeScript(tabs[tabIndex].id, {file: scripts[i]});

            for (i = 0; i < css.length; i++)
                chrome.tabs.insertCSS(tabs[tabIndex].id, {file: css[i]});
        }
    });
});

chrome.runtime.onConnect.addListener(function(port) {
    if(port.name != 'popup_to_backend_port')
        return;

    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        port.onMessage.addListener(function (message) {
            invokeAction(message.action, port, tabs[0].id, message);
        });
    });

    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        port.onDisconnect.addListener(function() {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'highlight_restore'});
            var uuids = getUUIDsFromModelObject(DOMModelObject);
            chrome.tabs.sendMessage(tabs[0].id, {action: 'restore', uuids: uuids});

            DOMModelObject = null;
            regexOccurrenceMap = null;
            index = null;
            regex = null;
        });
    });

    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'init'}, function (response) {
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
        actionNext(port, tabID);
    else if(action == 'previous')
        actionPrevious(port, tabID);
}

//Action Update
function actionUpdate(port, tabID, message) {
    chrome.tabs.sendMessage(tabID, {action: 'update'}, function (response) {
        try {
            if(!DOMModelObject)
                return;

            regex = message.regex;
            if(regex.length == 0) {
                port.postMessage({action: "empty_regex"});
                chrome.tabs.sendMessage(tabID, {action: 'highlight_restore'});
                return;
            }

            regexOccurrenceMap = buildOccurrenceMap(DOMModelObject, regex);
            if(index > regexOccurrenceMap.length-1) {
                if(regexOccurrenceMap.length == 0)
                    index = 0;
                else
                    index = regexOccurrenceMap.length-1;
            }

            chrome.tabs.sendMessage(tabID, {action: 'highlight_update', occurrenceMap: regexOccurrenceMap, index: index, regex: regex});
            var viewableIndex = regexOccurrenceMap.length == 0 ? 0 : index+1;
            port.postMessage({action: "index_update", index: viewableIndex, total: regexOccurrenceMap.length});
        }
        catch(e) {
            console.error(e);
            port.postMessage({action: "invalid_regex", error: e.message});
        }
    });
}

//Action Next
function actionNext(port, tabID) {
    if(index >= regexOccurrenceMap.length-1) {
        index = 0;
        chrome.tabs.sendMessage(tabID, {action: 'highlight_seek', occurrenceMap: regexOccurrenceMap, index: index, regex: regex});
    } else {
        chrome.tabs.sendMessage(tabID, {action: 'highlight_seek', occurrenceMap: regexOccurrenceMap, index: ++index, regex: regex});
    }

    var viewableIndex = regexOccurrenceMap.length == 0 ? 0 : index+1;
    port.postMessage({action: "index_update", index: viewableIndex, total: regexOccurrenceMap.length});
}

//Action Previous
function actionPrevious(port, tabID) {
    if(index <= 0) {
        index = regexOccurrenceMap.length-1;
        chrome.tabs.sendMessage(tabID, {action: 'highlight_seek', occurrenceMap: regexOccurrenceMap, index: index, regex: regex});
    } else {
        chrome.tabs.sendMessage(tabID, {action: 'highlight_seek', occurrenceMap: regexOccurrenceMap, index: --index, regex: regex});
    }

    var viewableIndex = regexOccurrenceMap.length == 0 ? 0 : index+1;
    port.postMessage({action: "index_update", index: viewableIndex, total: regexOccurrenceMap.length});
}

//Build occurrence map from DOM model and regex
function buildOccurrenceMap(DOMModelObject, regex) {
    var occurrenceMap = {occurrenceIndexMap: {}, length: null, groups: null};
    var count = 0, groupIndex = 0;
    regex = regex.replace(/ /g, '\\s');
    regex = new RegExp(regex, 'gm');

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


"use strict";

var DOMModelObject;
var regexOccurrenceMap = null;
var index = null;
var regex = null;

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
    var action = (!DOMModelObject ? 'init' : 'update');
    chrome.tabs.sendMessage(tabID, {action: action}, function (response) {
        try {
            if(response && response.model) {
                DOMModelObject = response.model;
                index = 0;
            }

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
        chrome.tabs.sendMessage(tabID, {action: 'highlight_next', occurrenceMap: regexOccurrenceMap, index: index, regex: regex});
    } else {
        chrome.tabs.sendMessage(tabID, {action: 'highlight_next', occurrenceMap: regexOccurrenceMap, index: ++index, regex: regex});
    }

    var viewableIndex = regexOccurrenceMap.length == 0 ? 0 : index+1;
    port.postMessage({action: "index_update", index: viewableIndex, total: regexOccurrenceMap.length});
}

//Action Previous
function actionPrevious(port, tabID) {
    if(index <= 0) {
        index = regexOccurrenceMap.length-1;
        chrome.tabs.sendMessage(tabID, {action: 'highlight_previous', occurrenceMap: regexOccurrenceMap, index: index, regex: regex});
    } else {
        chrome.tabs.sendMessage(tabID, {action: 'highlight_previous', occurrenceMap: regexOccurrenceMap, index: --index, regex: regex});
    }

    var viewableIndex = regexOccurrenceMap.length == 0 ? 0 : index+1;
    port.postMessage({action: "index_update", index: viewableIndex, total: regexOccurrenceMap.length});
}

//Build occurrence map from DOM model and regex
function buildOccurrenceMap(DOMModelObject, regex) {
    regex = new RegExp(regex, 'gm');
    var occurrenceMap = {occurrenceIndexMap: {}, length: null, groups: null};
    var count = 0, groupIndex = 0;

    for(var key in DOMModelObject) {
        var textNodes = DOMModelObject[key].group, preformatted = DOMModelObject[key].preformatted;
        var textGroup = '', uuids = [];
        for(var nodeIndex = 0; nodeIndex < textNodes.length; nodeIndex++) {
            textGroup += textNodes[nodeIndex].text;
            uuids.push(textNodes[nodeIndex].elementUUID);
        }

        textGroup = decode(textGroup);

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

//Replace ASCII HTML character entities with their actual character representation
function decode(string) {
    var regex = /&(#[xX])?.*?;/g;

    string = string.replace(regex, function(regexMatch) {
        var entities = {9: ['tab'], 10: ['newline'], 32: ['nbsp', 'nonbreakingspace'], 33: ['excl'], 34: ['quot'], 35: ['num'], 36: ['dollar'], 37: ['percnt'], 38: ['amp'], 39: ['apos'], 40: ['lpar'], 41: ['rpar'], 42: ['ast', 'midast'], 43: ['plus'], 44: ['comma'], 45: ['period'], 46: ['sol'], 47: [], 48: [], 49: [], 50: [], 51: [], 52: [], 53: [], 54: [], 55: [], 56: [], 57: [], 58: ['colon'], 59: ['semi'], 60: ['lt'], 61: ['equals'], 62: ['gt'], 63: ['quest'], 64: ['commat'], 65: [], 66: [], 67: [], 68: [], 69: [], 70: [], 71: [], 72: [], 73: [], 74: [], 75: [], 76: [], 77: [], 78: [], 79: [], 80: [], 81: [], 82: [], 83: [], 84: [], 85: [], 86: [], 87: [], 88: [], 89: [], 90: [], 91: ['lsqb', 'lbrack'], 92: ['bsol'], 93: ['rsqb', 'rbrack'], 94: ['hat'], 95: ['lowbar'], 96: ['grave', 'diacritialgrave'], 97: [], 98: [], 99: [], 100: [], 101: [], 102: [], 103: [], 104: [], 105: [], 106: [], 107: [], 108: [], 109: [], 110: [], 111: [], 112: [], 113: [], 114: [], 115: [], 116: [], 117: [], 118: [], 119: [], 120: [], 121: [], 122: [], 123: ['lcub', 'lbrace'], 124: ['verbar', 'vert', 'verticalline'], 125: ['rcub', 'rbrace'], 126: ['tilde', 'diacriticaltilde']};
        var strippedMatch = regexMatch.replace(/[&;]/g, '');

        if(strippedMatch.charAt(0) == '#') {
            strippedMatch = strippedMatch.replace(/#/, '');

            var charCode;
            if(strippedMatch.charAt(0).toLowerCase() == 'x')
                charCode = parseInt('0' + strippedMatch);
            else
                charCode = parseInt(strippedMatch);

            if(entities[charCode])
                return String.fromCharCode(charCode);
        }
        else {
            strippedMatch = strippedMatch.toLowerCase();
            for(var key in entities) {
                for(var index = 0; index < entities[key].length; index++) {
                    if(entities[key][index] == strippedMatch)
                        return String.fromCharCode(key);
                }
            }
        }

        return regexMatch;
    });

    return string;
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


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
            this.close();
        });
    });
});

function invokeAction(action, port, tabID, message) {
    if(action == 'update')
        actionUpdate(port, tabID, message);
    else if(action == 'next')
        actionNext(port, tabID);
    else if(action == 'previous')
        actionPrevious(port, tabID);
}

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

function actionNext(port, tabID) {
    if(index >= regexOccurrenceMap.length-1)
        return;

    chrome.tabs.sendMessage(tabID, {action: 'highlight_next', occurrenceMap: regexOccurrenceMap, index: ++index, regex: regex});
    var viewableIndex = regexOccurrenceMap.length == 0 ? 0 : index+1;
    port.postMessage({action: "index_update", index: viewableIndex, total: regexOccurrenceMap.length});
}

function actionPrevious(port, tabID) {
    if(index <= 0)
        return;

    chrome.tabs.sendMessage(tabID, {action: 'highlight_previous', occurrenceMap: regexOccurrenceMap, index: --index, regex: regex});
    var viewableIndex = regexOccurrenceMap.length == 0 ? 0 : index+1;
    port.postMessage({action: "index_update", index: viewableIndex, total: regexOccurrenceMap.length});
}

function buildOccurrenceMap(DOMModelObject, regex) {
    regex = new RegExp(regex, 'gm');
    var occurrenceMap = {occurrenceIndexMap: {}, length: null, groups: null};
    var count = 0, groupIndex = 0;

    for(var key in DOMModelObject) {
        var textNodes = DOMModelObject[key].group, preformatted = DOMModelObject[key].preformatted;
        var textGroup = '', uuids = [];
        for(var index = 0; index < textNodes.length; index++) {
            textGroup += textNodes[index].text;
            uuids.push(textNodes[index].elementUUID);
        }

        var matches = textGroup.match(regex);
        if(!matches)
            continue;

        count += matches.length;
        occurrenceMap[groupIndex] = {text: textGroup, uuids: uuids, count: matches.length, preformatted: preformatted};

        for(var index = 0; index < matches.length; index++) {
            var occMapIndex = index + (count - matches.length);
            occurrenceMap.occurrenceIndexMap[occMapIndex] = {groupIndex: groupIndex, subIndex: index};
        }

        groupIndex++;
    }

    occurrenceMap.length = count;
    occurrenceMap.groups = groupIndex;
    return occurrenceMap;
}

//FOR TESTING
function extractContext(textGroup, regex) {
    var regexPattern = '.{0,20}' + regex.source + '.{0,20}';
    regex = new RegExp(regexPattern, 'gm');
    var occurrences =  textGroup.match(regex);
    return occurrences.join(" [...] ");
}

function getUUIDsFromModelObject(modelObject) {
    var uuids = [];

    for(var key in modelObject) {
        var textNodes = modelObject[key].group;
        for(var index = 0; index < textNodes.length; index++)
            uuids.push(textNodes[index].elementUUID);
    }

    return uuids;
}


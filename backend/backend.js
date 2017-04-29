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
            if(action == 'init')
                DOMModelObject = response.model;

            regex = message.regex;
            regexOccurrenceMap = buildOccurrenceMap(DOMModelObject, regex);

            if(index > regexOccurrenceMap.length-1) {
                if(regexOccurrenceMap.length == 0)
                    index = 0;
                else
                    index = regexOccurrenceMap.length-1;
            }

            var viewableIndex = regexOccurrenceMap.length == 0 ? 0 : index+1;
            port.postMessage({action: "index_update", index: viewableIndex, total: regexOccurrenceMap.length});
        }
        catch(e) {
            console.error(e);
            port.postMessage({action: "invalid_regex"});
        }
    });
}

function actionNext(port, tabID) {
    if(index >= regexOccurrenceMap.length-1)
        return;

    var prevInternodalIndex = regexOccurrenceMap.occurrenceIndexMap[index].groupIndex;
    var prevOffsetIndex = regexOccurrenceMap.occurrenceIndexMap[index].subIndex;
    var prevOccurrenceUUIDs = regexOccurrenceMap[prevInternodalIndex].uuids;

    index++;
    var newInternodalIndex = regexOccurrenceMap.occurrenceIndexMap[index].groupIndex;
    var newOffsetIndex = regexOccurrenceMap.occurrenceIndexMap[index].subIndex;
    var newOccurrenceUUIDs = regexOccurrenceMap[newInternodalIndex].uuids;

    //chrome.tabs.sendMessage(tabID, {action: 'next', focus: newOccurrenceUUIDs, focusIndex: newOffsetIndex, reset: prevOccurrenceUUIDs, resetIndex: prevOffsetIndex}, function (response) {
    var userIndex = regexOccurrenceMap.length == 0 ? 0 : index+1;
    port.postMessage({action: "index_update", index: userIndex, total: regexOccurrenceMap.length});
   // });
}

function actionPrevious(port, tabID) {
    if(index <= 0)
        return;

    var prevInternodalIndex = regexOccurrenceMap.occurrenceIndexMap[index].groupIndex;
    var prevOffsetIndex = regexOccurrenceMap.occurrenceIndexMap[index].subIndex;
    var prevOccurrenceUUIDs = regexOccurrenceMap[prevInternodalIndex].uuids;

    index--;
    var newInternodalIndex = regexOccurrenceMap.occurrenceIndexMap[index].groupIndex;
    var newOffsetIndex = regexOccurrenceMap.occurrenceIndexMap[index].subIndex;
    var newOccurrenceUUIDs = regexOccurrenceMap[newInternodalIndex].uuids;

    //chrome.tabs.sendMessage(tabID, {action: 'previous', focus: newOccurrenceUUIDs, focusIndex: newOffsetIndex, reset: prevOccurrenceUUIDs, resetIndex: prevOffsetIndex}, function (response) {
    var userIndex = regexOccurrenceMap.length == 0 ? 0 : index+1;
    port.postMessage({action: "index_update", index: userIndex, total: regexOccurrenceMap.length});
   // });
}

function buildOccurrenceMap(DOMModelObject, regex) {
    regex = new RegExp(regex, 'gm');
    var occurrenceMap = {occurrenceIndexMap: {}};
    var count = 0, groupIndex = 0;

    for(var key in DOMModelObject) {
        var textNodes = DOMModelObject[key].group, textGroup = '', uuids = [];
        for(var index = 0; index < textNodes.length; index++) {
            textGroup += textNodes[index].text;
            uuids.push(textNodes[index].elementUUID);
        }

        var matches = textGroup.match(regex);
        if(!matches)
            continue;

        count += matches.length;
        occurrenceMap[groupIndex] = {text: textGroup, uuids: uuids, count: matches.length};

        for(var index = 0; index < matches.length; index++) {
            var occMapIndex = index + (count - matches.length);
            occurrenceMap.occurrenceIndexMap[occMapIndex] = {groupIndex: groupIndex, subIndex: index};
        }

        groupIndex++;
    }

    occurrenceMap.length = count;
    return occurrenceMap;
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


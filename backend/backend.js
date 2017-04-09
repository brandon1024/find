console.log('Background script started');

var DOMModelObject;
var regexOccurrenceMap;
var index = 0;
var regex;

console.log('Listening for port to popup', '(Message API)');
chrome.runtime.onConnect.addListener(function(port) {
    if(port.name != 'popup_to_backend_port') {
        console.error('Port to popup failed to open', '(Message API)');
        console.error('Unrecognized port connected to background; name:', (port.name == null ? 'none provided' : port.name), '(Message API)');
        return;
    }

    console.log('Port to background script open', '(Message API)');

    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        var tabID = tabs[0].id;
        port.onMessage.addListener(function (message) {
            invokeAction(message.action, port, tabID, message);
        });
    });

    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        var tabID = tabs[0].id;
        port.onDisconnect.addListener(function() {
            var uuids = getUUIDsFromModelObject(DOMModelObject);
            chrome.tabs.sendMessage(tabID, {action: 'restore', uuids: uuids, len: uuids.length}, function (response) {
                if(response.success)
                    console.log('Web Page Restored');
                else
                    console.error('Web Page Restoration Unsuccessful');
            });

            console.log('Port to popup script closed', '(Message API)');
            console.log('Suspending background script');
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
    console.log(action);
    chrome.tabs.sendMessage(tabID, {action: action}, function (response) {
        try {
            if(action == 'init')
                DOMModelObject = response.model;

            regex = message.regex;
            regexOccurrenceMap = buildOccurrenceMap(DOMModelObject, regex);

            console.group('OCCURRENCES');
            for(var key in regexOccurrenceMap) {
                console.log(regexOccurrenceMap[key].text);
            }
            console.groupEnd();

            console.groupCollapsed('Regex Update');
            console.log('Index:', index);
            console.log('Regex: \'' + regex + '\'');
            port.postMessage({action: "index_update", index: index, total: regexOccurrenceMap.length});
        }
        catch(e) {
            console.error(e);
            port.postMessage({action: "invalid_regex"});
        }
    });
}

function actionNext(port, tabID) {
    if(index == regexOccurrenceMap.length-1)
        return;

    var newOccurrenceUUIDs = regexOccurrenceMap[++index].uuids;
    var oldOccurrenceUUIDs = regexOccurrenceMap[index].uuids;
    chrome.tabs.sendMessage(tabID, {action: 'next', focus: newOccurrenceUUIDs, reset: oldOccurrenceUUIDs}, function (response) {
        port.postMessage({action: "index_update", index: index, total: regexOccurrenceMap.length});
    });
}

function actionPrevious(port, tabID) {
    if(index == 0)
        return;

    var newOccurrenceUUIDs = regexOccurrenceMap[--index].uuids;
    var oldOccurrenceUUIDs = regexOccurrenceMap[index].uuids;
    chrome.tabs.sendMessage(tabID, {action: 'previous', focus: newOccurrenceUUIDs, reset: oldOccurrenceUUIDs}, function (response) {
        port.postMessage({action: "index_update", index: index, total: regexOccurrenceMap.length});
    });
}

function buildOccurrenceMap(DOMModelObject, regex) {
    regex = new RegExp(regex, 'gm'); //May need to change these modifiers (could introduce strange behavior with ^ and $ anchors)
    var occurrenceMap = {};
    var count = 0;
    var occurrenceIndex = 0;
    for(var key in DOMModelObject) {
        var textNodes = DOMModelObject[key].group;
        var textGroup = '';
        var uuids = [];
        for(var index = 0; index < textNodes.length; index++) {
            textGroup += textNodes[index].text;
            uuids.push(textNodes[index].elementUUID);
        }

        var matches = textGroup.match(regex);
        if(!matches)
            continue;

        count += matches.length;
        occurrenceMap[occurrenceIndex++] = {text: textGroup, uuids: uuids, count: matches.length};
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


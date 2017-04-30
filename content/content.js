chrome.runtime.onMessage.addListener(function(message, _, sendResponse) {
    if(message.action == 'init')
        sendResponse({model: buildDOMReferenceObject()});
    else if(message.action == 'update')
        sendResponse({success: true});
    else if(message.action == 'restore')
        sendResponse({success: restoreWebPage(message.uuids)});

    return true;
});

//Build DOM Model Object, inject UUID references
function buildDOMReferenceObject() {
    var DOMTreeWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_ALL, { acceptNode: nodeFilter }, false);
    var DOMModelObject = {};

    var end = false, groupIndex = 0, mostRecentBlockLevel = 0;
    while(!end) {
        var node = DOMTreeWalker.nextNode();
        var textGroup = {group: []};

        if(!node)
            end = true;

        while(node) {
            if(isElementNode(node)) {
                if(isInlineLevelElement(node) && getNodeTreeDepth(node) <= mostRecentBlockLevel)
                    break;
                if(!isInlineLevelElement(node)) {
                    mostRecentBlockLevel = getNodeTreeDepth(node);
                    break;
                }
            }
            else if(isTextNode(node)) {
                var identifierUUID = generateElementUUID();
                var nodeText = formatTextNodeValue(node);
                var textNodeInformation = {groupIndex: groupIndex, text: nodeText, elementUUID: identifierUUID};

                textGroup.group.push(textNodeInformation);
                $(node.parentElement).addClass(identifierUUID);
            }

            node = DOMTreeWalker.nextNode();
            if(!node)
                end = true;
        }

        if(textGroup.group.length == 0)
            continue;

        DOMModelObject[groupIndex++] = textGroup;
    }

    return DOMModelObject;
}

//TreeWalker Filter, Allowing Element and Text Nodes
function nodeFilter(node) {
    if(isElementNode(node)) {
        if(node.tagName.toLowerCase() == 'script')
            return NodeFilter.FILTER_REJECT;
        else
            return NodeFilter.FILTER_ACCEPT;
    }
    else if(isTextNode(node)) {
        if(!isNodeTextValueWhitespaceOnly(node) || node.nodeValue.length == 1)
            return NodeFilter.FILTER_ACCEPT;
    }

    return NodeFilter.FILTER_REJECT;
}

function formatTextNodeValue(node) {
    if(isElementNode(node))
        return;

    var parentElement = node.parentElement;
    var nodeText = node.nodeValue;

    if(parentElement.tagName == 'pre' || parentElement.style.whiteSpace == 'pre')
        return nodeText;
    else
        return nodeText.replace(/[\t\n\r ]+/g,' ');
}

//Remove All Highlighting and Injected Markup
function restoreWebPage(uuids) {
    for(var index = 0; index < uuids.length; index++) {
        var elementClassUUID = '.' + uuids[index];
        $(elementClassUUID).removeClass(uuids[index]);
    }

    return true;
}
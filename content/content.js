chrome.runtime.onMessage.addListener(function(message, _, sendResponse) {
    if(message.action == 'init')
        sendResponse({model: buildDOMReferenceObject()});
    else if(message.action == 'update')
        sendResponse({success: true});
    else if(message.action == 'restore')
        sendResponse({success: restoreWebPage(message.uuids)});
    else
        return false;

    return true;
});

//Build DOM Model Object, inject UUID references
function buildDOMReferenceObject() {
    var DOMTreeWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_ALL, { acceptNode: nodeFilter }, false);
    var DOMModelObject = {};

    var end = false, groupIndex = 0, blockLevels = [];
    var preformatted = {flag: false, index: null};
    var node;
    while(!end) {
        if(!node)
            node = DOMTreeWalker.root;
        else
            node = DOMTreeWalker.nextNode();

        if(!node)
            end = true;

        var textGroup = {group: []};
        while(node) {
            if(!preformatted.flag && isPreformattedElement(node)) {
                preformatted.flag = true;
                preformatted.index = getNodeTreeDepth(node);
            }
            else if(preformatted.flag && getNodeTreeDepth(node) <= preformatted.index) {
                preformatted.flag = false;
                preformatted.index = null;
            }

            if(isElementNode(node)) {
                if(getNodeTreeDepth(node) <= blockLevels[blockLevels.length-1]) { //if depth decreased
                    while(getNodeTreeDepth(node) <= blockLevels[blockLevels.length-1])
                        blockLevels.pop();

                    if(!isInlineLevelElement(node))
                        blockLevels.push(getNodeTreeDepth(node));

                    break;
                }
                else {
                    if(!isInlineLevelElement(node)) {
                        blockLevels.push(getNodeTreeDepth(node));
                        break;
                    }
                }
            }
            else if(isTextNode(node)) {
                if(getNodeTreeDepth(node) <= blockLevels[blockLevels.length-1]) { //if depth decreased
                    while(getNodeTreeDepth(node) <= blockLevels[blockLevels.length-1])
                        blockLevels.pop();

                    DOMTreeWalker.previousNode();
                    break;
                }

                if(!preformatted.flag && isNodeTextValueWhitespaceOnly(node) && node.nodeValue.length != 1) {
                    node = DOMTreeWalker.nextNode();
                    continue;
                }

                var identifierUUID = generateElementUUID();
                var nodeText = formatTextNodeValue(node, preformatted.flag);
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

    console.log(DOMModelObject);
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
    else if(isTextNode(node))
        return NodeFilter.FILTER_ACCEPT;

    return NodeFilter.FILTER_REJECT;
}

function formatTextNodeValue(node, preformatted) {
    if(isElementNode(node))
        return;

    var nodeText = node.nodeValue;
    if(preformatted)
        return nodeText;
    else
        return nodeText.replace(/[\t\n\r ]+/g,' ');
}

function isPreformattedElement(node) {
    if(!isElementNode(node))
        return;

    return node.tagName.toLowerCase() == 'pre' || node.style.whiteSpace.toLowerCase() == 'pre';
}

//Remove All Highlighting and Injected Markup
function restoreWebPage(uuids) {
    for(var index = 0; index < uuids.length; index++) {
        var elementClassUUID = '.' + uuids[index];
        $(elementClassUUID).removeClass(uuids[index]);
    }

    return true;
}

//Check if Node is Element Node
function isElementNode(node) {
    return node.nodeType == 1;
}

//Check if Node is Text Node
function isTextNode(node) {
    return node.nodeType == 3;
}

//Check if Element is Inline
function isInlineLevelElement(element) {
    if(!isElementNode(element))
        return false;

    var elementTagName = element.tagName.toLowerCase();
    var inlineElements = ['a','b','big','i','small','tt','abbr','acronym',
        'cite','code','dfn','em','kbd','strong','samp','time','var','bdo',
        'br','img','map','object','q','script','span','sub','sup','button',
        'input','label','select','textarea'];

    for(var index = 0; index < inlineElements.length; index++)
        if(elementTagName == inlineElements[index])
            return true;

    return false;
}

//Check if a Text Node Value Contains only Whitespace
function isNodeTextValueWhitespaceOnly(node) {
    return !(/[^\t\n\r ]/.test(node.nodeValue));
}

//Get Depth of Node in Tree
function getNodeTreeDepth(node) {
    var depth = -1;

    while(node != null) {
        depth++;
        node = node.parentNode;
    }

    return depth;
}

//Generate V4 UUID
function generateElementUUID() {
    function generateBlock(size) {
        var block = '';
        for(var index = 0; index < size; index++)
            block += Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);

        return block;
    }

    var uuid = '', blockSizes = [2,1,1,1,3];
    for(var index = 0; index < blockSizes.length; index++)
        uuid += generateBlock(blockSizes[index]) + (index == blockSizes.length-1 ? '' : '-');

    return uuid;
}
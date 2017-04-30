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
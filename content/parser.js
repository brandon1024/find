'use strict';

/**
 * Create the Content Parser namespace. This component is injected into the
 * page and constructs a representation of the DOM, which will be used for
 * occurrence matching by the background script and highlighting by the
 * highlighter.
 *
 * As the document representation object is constructed, text nodes in the page
 * are wrapped in a span, and assigned a UUID which is used to reference it.
 *
 * Once the extension closes, the page is restored using the UUIDs from the
 * document representation object.
 * */
Find.register('Content.Parser', function(self) {

	/**
	 * Walk the pages DOM tree and construct the document representation object, while
	 * wrapping text nodes with wrapper elements.
	 *
	 * @return {object} the document representation object
	 * */
	self.buildDOMReferenceObject = function() {
		let DOMTreeWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_ALL, {acceptNode: nodeFilter}, false);
		let DOMModelObject = {};
		let reachedEndOfTree = false;
		let groupIndex = 0;
		let blockLevels = [];
		let elementBoundary = false;
		let preformatted = {flag: false, index: null};
		let hidden = {flag: false, index: null};
		let node = DOMTreeWalker.root;

		while (!reachedEndOfTree) {
			node = DOMTreeWalker.nextNode();

			if (!node) {
				reachedEndOfTree = true;
			}

			let textGroup = {group: [], preformatted: false};
			while (node) {
				let nodeDepth = getNodeTreeDepth(node);

				if (!preformatted.flag && isPreformattedElement(node)) {
					preformatted.flag = true;
					preformatted.index = nodeDepth;
				} else if (preformatted.flag && nodeDepth <= preformatted.index) {
					preformatted.flag = false;
					preformatted.index = null;
				}

				if (!hidden.flag && isHiddenElement(node)) {
					hidden.flag = true;
					hidden.index = nodeDepth;
				} else if (hidden.flag && nodeDepth <= hidden.index) {
					if (!isHiddenElement(node)) {
						hidden.flag = false;
						hidden.index = null;
					} else {
						hidden.index = nodeDepth;
					}
				}

				if (hidden.flag) {
					node = DOMTreeWalker.nextNode();
					continue;
				}

				if (isElementNode(node)) {
					if (nodeDepth <= blockLevels[blockLevels.length - 1]) {
						while (nodeDepth <= blockLevels[blockLevels.length - 1]) {
							blockLevels.pop();
						}

						if (!isInlineLevelElement(node)) {
							blockLevels.push(nodeDepth);
						}

						elementBoundary = true;
						break;
					} else {
						if (!isInlineLevelElement(node)) {
							blockLevels.push(nodeDepth);
							elementBoundary = true;
							break;
						}
					}
				} else if (isTextNode(node)) {
					if (nodeDepth <= blockLevels[blockLevels.length - 1]) {
						while (nodeDepth <= blockLevels[blockLevels.length - 1]) {
							blockLevels.pop();
						}

						DOMTreeWalker.previousNode();
						elementBoundary = true;
						break;
					}

					if (!preformatted.flag && isNodeTextValueWhitespaceOnly(node) && node.nodeValue.length !== 1) {
						node = DOMTreeWalker.nextNode();
						continue;
					} else if (node.nodeValue.length === 1 && node.nodeValue.charCodeAt(0) === 10) {
						node = DOMTreeWalker.nextNode();
						continue;
					}

					let identifierUUID = generateElementUUID();
					let nodeText = formatTextNodeValue(node, preformatted.flag, elementBoundary);

					if (nodeText.length === 0) {
						node = DOMTreeWalker.nextNode();
						continue;
					}

					let wrapperElement = document.createElement('span');
					wrapperElement.style.cssText = 'all: unset;';
					wrapperElement.setAttribute('id', identifierUUID);
					node.parentNode.insertBefore(wrapperElement, node);
					wrapperElement.appendChild(node);

					let textNodeInformation = {groupIndex: groupIndex, text: nodeText, elementUUID: identifierUUID};
					textGroup.group.push(textNodeInformation);
					textGroup.preformatted = preformatted.flag;
				}

				node = DOMTreeWalker.nextNode();
				elementBoundary = false;
				if (!node) {
					reachedEndOfTree = true;
				}
			}

			if (textGroup.group.length === 0) {
				continue;
			}

			DOMModelObject[groupIndex++] = textGroup;
		}

		return DOMModelObject;
	};

	/**
	 * Restore the web page by removing any wrapper elements.
	 *
	 * @param {array} uuids - A list of UUIDs
	 * */
	self.restoreWebPage = function(uuids) {
		for (let index = 0; index < uuids.length; index++) {
			let el = document.getElementById(uuids[index]);
			let parent = el.parentElement;

			while (el.firstChild) {
				parent.insertBefore(el.firstChild, el);
			}

			parent.removeChild(el);
			parent.normalize();
		}
	};

	/**
	 * Filter used by the DOM tree walker. Used to skip certain elements.
	 * @private
	 * @param {Element} node - The DOM node.
	 * @return {number} NodeFilter.FILTER_ACCEPT if the node is accepted, or NodeFilter.FILTER_REJECT
	 * if the node is rejected.
	 * */
	function nodeFilter(node) {
		if (isElementNode(node)) {
			switch(node.tagName.toLowerCase()) {
				case 'script':
				case 'noscript':
				case 'style':
				case 'textarea':
				case 'math':
					return NodeFilter.FILTER_REJECT;
				default:
					return NodeFilter.FILTER_ACCEPT;
			}
		}

		if (isTextNode(node)) {
			return NodeFilter.FILTER_ACCEPT;
		}

		return NodeFilter.FILTER_REJECT;
	}

	/**
	 * Decode any HTML character entities, strip consecutive whitespaces,
	 * and return the node text value.
	 *
	 * @private
	 * @param {Node} node - The DOM node.
	 * @param {boolean} preformatted - Whether or not the node is a preformatted text element.
	 * @param {boolean} elementBoundary - Whether the element is a boundary element.
	 * @return {string} the formatted text.
	 * */
	function formatTextNodeValue(node, preformatted, elementBoundary) {
		if (isElementNode(node)) {
			return;
		}

		let nodeText = decode(node.nodeValue);
		if (preformatted) {
			return nodeText;
		}

		let text = nodeText.replace(/[\t\n\r ]+/g, ' ');
		if (elementBoundary) {
			text = text.replace(/^[\t\n\r ]+/g, '');
		}

		return text;
	}

	/**
	 * Determine whether a given node is preformatted.
	 *
	 * A node is preformatted if it has:
	 * - tag name 'pre'
	 * - style 'whitespace: pre'
	 *
	 * @private
	 * @param {Element} node - The DOM node.
	 * @return {boolean} true of the element is a preformatted element, false if the
	 * element is not preformatted, and undefined if the node is not an element.
	 * */
	function isPreformattedElement(node) {
		if (!isElementNode(node)) {
			return undefined;
		}

		if (node.tagName.toLowerCase() === 'pre' || node.style.whiteSpace.toLowerCase() === 'pre') {
			return true;
		}

		let computedStyle = window.getComputedStyle(node);
		if (computedStyle.getPropertyValue('whitespace').toLowerCase() === 'pre') {
			return true;
		}

		return false;
	}

	/**
	 * Determine whether a given node is visible in the page.
	 *
	 * @private
	 * @param {Node} node - The DOM node.
	 * @return {boolean} true if the element is hidden, false if the element is visible,
	 * and undefined if the not an element.
	 * */
	function isHiddenElement(node) {
		if (!isElementNode(node)) {
			return undefined;
		}

		if (node.style.display === 'none' || node.style.display === 'hidden') {
			return true;
		}

		let computedStyle = window.getComputedStyle(node);
		if (computedStyle.getPropertyValue('display').toLowerCase() === 'none') {
			return true;
		}

		if (computedStyle.getPropertyValue('display').toLowerCase() === 'hidden') {
			return true;
		}

		return false;
	}

	/**
	 * Determine whether or not a given DOM node is an Element.
	 *
	 * @private
	 * @param {Node} node - The DOM node.
	 * @return {boolean} true if the node is an element, false otherwise.
	 * */
	function isElementNode(node) {
		return node.nodeType === Node.ELEMENT_NODE;
	}

	/**
	 * Determine whether or not a given DOM node is a text node.
	 *
	 * @private
	 * @param {Node} node - The DOM node.
	 * @return {boolean} true if the node is a text node, false otherwise.
	 * */
	function isTextNode(node) {
		return node.nodeType === Node.TEXT_NODE;
	}

	/**
	 * Determine whether or not an element is inline-level or block-level.
	 *
	 * @private
	 * @param {Element} element - The DOM element.
	 * @return {boolean} true if the element is inline, false otherwise.
	 * */
	function isInlineLevelElement(element) {
		if (!isElementNode(element)) {
			return false;
		}

		//Special case: will treat <br> as block element
		let elementTagName = element.tagName.toLowerCase();
		if (elementTagName === 'br') {
			return false;
		}

		if (window.getComputedStyle(element).display === 'inline') {
			return true;
		}

		return false;
	}

	/**
	 * Determine whether a text node value is whitespace only.
	 *
	 * @private
	 * @param {Node} node - The DOM node.
	 * @return {boolean} true if the node value is whitespace only, false otherwise.
	 * */
	function isNodeTextValueWhitespaceOnly(node) {
		return !(/[^\t\n\r ]/.test(node.nodeValue));
	}

	/**
	 * Determine the depth of a given node in the DOM tree.
	 *
	 * @private
	 * @param {Node} node - The DOM node.
	 * @return {number} the depth of the DOM node in the tree.
	 * */
	function getNodeTreeDepth(node) {
		let depth = -1;

		while (node != null) {
			depth++;
			node = node.parentNode;
		}

		return depth;
	}

	/**
	 * Generate a UUIDv4.
	 *
	 * @private
	 * @return {string} a new UUIDv4.
	 * */
	function generateElementUUID() {
		let generateBlock = (size) => {
			let block = '';
			for (let index = 0; index < size; index++) {
				block += Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
			}

			return block;
		};

		const blockSizes = [2, 1, 1, 1, 3];
		let uuid = '';
		for (let index = 0; index < blockSizes.length; index++) {
			uuid += generateBlock(blockSizes[index]) + (index === blockSizes.length - 1 ? '' : '-');
		}

		return uuid;
	}
});
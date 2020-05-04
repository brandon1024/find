'use strict';

/**
 * Create the Content namespace. This component is injected into the
 * page and delegates messages to the parser or highlighter.
 * */
Find.register('Content', function (self) {

	/**
	 * State variables, used to recover the extension state if the extension
	 * is closed accidentally.
	 * */
	let regex = null;
	let index = null;
	let selected = null;

	/**
	 * Register a message listener to the extension background script.
	 * */
	Find.browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
		try {
			return delegateAction(message, sender, sendResponse);
		} catch (error) {
			if (error instanceof Find.Content.DynamicPageDetectedError) {
				sendResponse({
					error: {
						errorCode: 1,
						errorName: error.name,
						errorMessage: error.message
					}
				});
			} else {
				sendResponse({
					error: {
						errorCode: null,
						errorName: error.name,
						errorMessage: error.message
					}
				});
			}
		}
	});

	/**
	 * Carry out an action from a message.
	 * */
	function delegateAction(message, sender, sendResponse) {
		//Parser Actions
		switch (message.action) {
			case 'init':
				selected = window.getSelection().toString();
				sendResponse({model: Find.Content.Parser.buildDOMReferenceObject()});
				return true;
			case 'fetch':
				sendResponse({
					success: true,
					regex: regex,
					index: index,
					selection: selected,
					iframes: document.getElementsByTagName('iframe').length
				});
				return true;
			case 'restore':
				selected = null;
				Find.Content.Parser.restoreWebPage(message.uuids);
				return false;
		}

		//Highlighter Actions
		switch (message.action) {
			case 'update':
				regex = message.regex;
				index = message.index;
				Find.Content.Highlighter.restore();
				Find.Content.Highlighter.highlightAll(message.occurrenceMap, message.regex, message.options);
				Find.Content.Highlighter.seekHighlight(message.index, message.options);
				break;
			case 'seek':
				index = message.index;
				Find.Content.Highlighter.seekHighlight(message.index, message.options);
				break;
			case 'highlight_restore':
				Find.Content.Highlighter.restore();
				break;
			case 'replace':
				Find.Content.Highlighter.replace(message.index, message.replaceWith);
				break;
			case 'replace_all':
				Find.Content.Highlighter.replaceAll(message.replaceWith);
				break;
			case 'follow_link':
				Find.Content.Highlighter.followLinkUnderFocus();
				break;
		}

		return false;
	}

	/**
	 * Custom Error used to indicate that something went wrong while updating the DOM due to missing elements
	 * likely caused by dynamic scripts.
	 * */
	self.DynamicPageDetectedError = (() => {
		function DynamicPageDetectedError(message, fileName, lineNumber) {
			let instance = new Error(message, fileName, lineNumber);

			Object.setPrototypeOf(instance, Object.getPrototypeOf(this));
			return instance;
		}

		DynamicPageDetectedError.prototype = Object.create(Error.prototype, {
			constructor: {
				value: Error,
				enumerable: false,
				writable: true,
				configurable: true
			}
		});

		if (Object.setPrototypeOf) {
			Object.setPrototypeOf(DynamicPageDetectedError, Error);
		} else {
			DynamicPageDetectedError.__proto__ = Error;
		}

		return DynamicPageDetectedError;
	})();
});
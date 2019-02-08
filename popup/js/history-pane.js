'use strict';

/**
 * Create the Popup HistoryPane namespace.
 * */
Find.register('Popup.HistoryPane', function (self) {

	/**
	 * Initialize the history pane. Registers button event handlers, and loads
	 * the search history from local storage and builds history entry elements.
	 * */
	self.init = function() {
		document.getElementById('clear-history-button').addEventListener('click', () => {
			self.clearHistory();
		});

		document.getElementById('save-history-entry-button').addEventListener('click', () => {
			self.saveEntry();
		});

		let parentEl = document.getElementById('history-entry-list');
		Find.Popup.Storage.retrieveHistory((data) => {
			if(data && data.length) {
				for(let index = 0; index < data.length; index++) {
					let entryEl = buildHistoryEntryElement(data[index]);
					parentEl.appendChild(entryEl);
				}
			} else {
				parentEl.appendChild(buildNullHistoryEntryElement());
			}
		});
	};

	/**
	 * Display or hide the history pane.
	 *
	 * @param {boolean} value - True to display the history pane, false to hide.
	 * */
	self.show = function(value) {
		let el = document.getElementById('history-body');
		if(value === undefined || value) {
			el.style.display = 'inherit';
		} else {
			el.style.display = 'none';
		}
	};

	/**
	 * Toggle the history pane. If the history pane is hidden, it will be shown.
	 * Otherwise it will be hidden.
	 * */
	self.toggle = function() {
		let el = document.getElementById('history-body');
		if(el.style.display === 'none' || el.style.display === '') {
			self.show(true);
		} else {
			self.show(false);
		}
	};

	/**
	 * Save the regex from the search field into the local storage, and create
	 * a history entry in the history pane.
	 *
	 * If the regex already exists in the history, the entry is moved to the
	 * front of the history array, and the entry in the history pane is placed
	 * at the top.
	 * */
	self.saveEntry = function() {
		let regex = Find.Popup.SearchPane.getSearchFieldText();
		if(!regex) {
			return;
		}

		Find.Popup.Storage.retrieveHistory((data) => {
			if(data) {
				//Remove existing entry, if it exists
				for(let index = 0; index < data.length; index++) {
					if(data[index] === regex) {
						data.splice(index, 1);
						break;
					}
				}

				data.unshift(regex);
			}

			//Add new entry as first child
			let parentEl = document.getElementById('history-entry-list');
			for (let index = 0; index < parentEl.children.length; index++) {
				if(parentEl.children[index].dataset.regex === regex) {
					parentEl.removeChild(parentEl.children[index]);
					break;
				}
			}

			let entryEl = buildHistoryEntryElement(regex);
			parentEl.insertBefore(entryEl, parentEl.firstChild);

			//Remove null entry, if it exists
			let nullEntry = document.getElementById('null-entry');
			if(nullEntry) {
				nullEntry.parentNode.removeChild(nullEntry);
			}

			Find.Popup.Storage.saveHistory(data);
		});
	};

	/**
	 * Remove all history entries from the history pane and local storage.
	 * Inserts a null entry to describe to the user that no history entries
	 * exist.
	 * */
	self.clearHistory = function() {
		let parentEl = document.getElementById('history-entry-list');
		while (parentEl.firstChild) {
			parentEl.removeChild(parentEl.firstChild);
		}

		parentEl.appendChild(buildNullHistoryEntryElement());

		Find.Popup.Storage.saveHistory([]);
	};

	/**
	 * Construct a history entry element, along with it's event handlers
	 * and reference information.
	 *
	 * @private
	 * @param {string} regex - The regular expression to display in the entry body.
	 * */
	function buildHistoryEntryElement(regex) {
		// Set search field with regex and update search. Also invoke saveEntry(), which
		// will place regex at top of history and update local storage.
		let useEntryHandler = (e) => {
			Find.Popup.SearchPane.setSearchFieldText(e.currentTarget.parentElement.dataset.regex);
			self.saveEntry();

			Find.Popup.BrowserAction.updateSearch();
		};

		// Remove entry from list and local storage. Also append null entry if no
		// entries exist.
		let deleteEntryHandler = (e) => {
			let entry = e.currentTarget.parentElement.parentElement;
			let regex = entry.dataset.regex;

			entry.parentNode.removeChild(entry);

			Find.Popup.Storage.retrieveHistory((data) => {
				if(data) {
					//Remove existing entry, if it exists
					for(let index = 0; index < data.length; index++) {
						if(data[index] === regex) {
							data.splice(index, 1);
							break;
						}
					}
				}

				let parentEl = document.getElementById('history-entry-list');
				if(!parentEl.children.length) {
					parentEl.appendChild(buildNullHistoryEntryElement());
				}

				Find.Popup.Storage.saveHistory(data);
			});
		};

		return ElementBuilder.create(document)
			.createElement('div')
			.addClass('history-entry')
			.setAttribute('data-regex', regex)
			.appendChild(ElementBuilder.create(document)
				.createElement('button')
				.addClass('history-entry-button', 'controls-button')
				.addEventListener('click', useEntryHandler)
				.appendChild(ElementBuilder.create(document)
					.createElement('img')
					.addClass('information-hover-icon')
					.setAttribute('src', '/resources/bookmark.svg')
					.setAttribute('data-locale-title', 'history_entry_icon_title')
					.build())
				.appendChild(ElementBuilder.create(document)
					.createElement('span')
					.addClass('history-entry-regex-text', 'def-font')
					.setInnerText(regex)
					.build())
				.build())
			.appendChild(ElementBuilder.create(document)
				.createElement('div')
				.addClass('controls-button-cell')
				.appendChild(ElementBuilder.create(document)
					.createElement('button')
					.addClass('controls-button', 'delete-history-entry-button')
					.setAttribute('type', 'button')
					.setAttribute('data-locale-title', 'delete_history_entry_icon_title')
					.addEventListener('click', deleteEntryHandler)
					.build())
				.build())
			.build();
	}

	/**
	 * Create a null entry with the given text as the body.
	 *
	 * @private
	 * @param {string} text - Custom text to display in the null entry body. If undefined, null,
	 * or empty, displays 'No history entries found.'.
	 * */
	function buildNullHistoryEntryElement(text) {
		return ElementBuilder.create(document)
			.createElement('div')
			.addClass('history-entry')
			.setAttribute('id', 'null-entry')
			.appendChild(ElementBuilder.create(document)
				.createElement('button')
				.addClass('history-entry-button', 'controls-button')
				.appendChild(ElementBuilder.create(document)
					.createElement('img')
					.addClass('information-hover-icon')
					.setAttribute('src', '/resources/bookmark.svg')
					.setAttribute('data-locale-title', 'history_entry_icon_title')
					.build())
				.appendChild(ElementBuilder.create(document)
					.createElement('span')
					.addClass('history-entry-regex-text', 'def-font')
					.setAttribute('id', 'null-entry-text')
					.setInnerText(text ? text : 'No history entries found.')
					.build())
				.build())
			.build();
	}

	/**
	 * Simple DOM element builder class.
	 * */
	let ElementBuilder = function(doc) {

		let el = null;

		this.createElement = function(name) {
			el = doc.createElement(name);
			return this;
		};

		this.appendChild = function(newEl) {
			el.appendChild(newEl);
			return this;
		};

		this.addClass = function() {
			for(let index = 0; index < arguments.length; index++) {
				el.classList.add(arguments[index]);
			}
			return this;
		};

		this.setAttribute = function(key, value) {
			el.setAttribute(key, value);
			return this;
		};

		this.addEventListener = function(type, handler) {
			el.addEventListener(type, handler);
			return this;
		};

		this.setInnerText = function(text) {
			el.innerText = text;
			return this;
		};

		this.build = function() {
			return el;
		}
	};

	ElementBuilder.create = function(doc) {
		return new ElementBuilder(doc);
	};
});
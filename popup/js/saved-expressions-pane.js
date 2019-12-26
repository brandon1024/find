'use strict';

/**
 * Create the Popup SavedExpressionsPane namespace.
 * */
Find.register('Popup.SavedExpressionsPane', function (self) {

	/**
	 * Initialize the saved expressions pane. Registers button event handlers, and loads
	 * the saved expressions from local storage and builds expression entry elements.
	 * */
	self.init = function() {
		document.getElementById('clear-saved-expressions-button').addEventListener('click', () => {
			self.clearSavedExpressions();
		});

		document.getElementById('save-expression-entry-button').addEventListener('click', () => {
			self.saveEntry();
		});

		let parentEl = document.getElementById('saved-expressions-entry-list');
		Find.Popup.Storage.retrieveSavedExpressions((data) => {
			if(data && data.length) {
				for(let index = 0; index < data.length; index++) {
					let entryEl = buildExpressionEntryElement(data[index]);
					parentEl.appendChild(entryEl);
				}
			} else {
				parentEl.appendChild(buildNullExpressionEntryElement());
			}
		});
	};

	/**
	 * Display or hide the saved expressions pane.
	 *
	 * @param {boolean} value - True to display the pane, false to hide.
	 * */
	self.show = function(value) {
		let el = document.getElementById('saved-expressions-body');
		if(value === undefined || value) {
			el.style.display = 'inherit';
		} else {
			el.style.display = 'none';
		}
	};

	/**
	 * Toggle the saved expressions pane. If the pane is hidden, it will be shown.
	 * Otherwise it will be hidden.
	 * */
	self.toggle = function() {
		let el = document.getElementById('saved-expressions-body');
		if(el.style.display === 'none' || el.style.display === '') {
			self.show(true);
		} else {
			self.show(false);
		}
	};

	/**
	 * Save the regex from the search field into the local storage, and create
	 * an expression entry in the saved expressions pane.
	 *
	 * If the regex already exists in the saved expressions, the entry is moved to the
	 * front of the expressions array, and the entry in the saved expressions pane is placed
	 * at the top.
	 * */
	self.saveEntry = function() {
		let regex = Find.Popup.SearchPane.getSearchFieldText();
		if(!regex) {
			return;
		}

		Find.Popup.Storage.retrieveSavedExpressions((data) => {
			if(data) {
				//Remove existing entry, if it exists
				for(let index = 0; index < data.length; index++) {
					if(data[index] === regex) {
						data.splice(index, 1);
						break;
					}
				}
			} else {
				data = [];
			}

			data.unshift(regex);

			//Add new entry as first child
			let parentEl = document.getElementById('saved-expressions-entry-list');
			for (let index = 0; index < parentEl.children.length; index++) {
				if(parentEl.children[index].dataset.regex === regex) {
					parentEl.removeChild(parentEl.children[index]);
					break;
				}
			}

			let entryEl = buildExpressionEntryElement(regex);
			parentEl.insertBefore(entryEl, parentEl.firstChild);

			//Remove null entry, if it exists
			let nullEntry = document.getElementById('null-entry');
			if(nullEntry) {
				nullEntry.parentNode.removeChild(nullEntry);
			}

			console.log(data);

			Find.Popup.Storage.saveExpressions(data);
		});
	};

	/**
	 * Remove all saved expression entries from the pane and local storage.
	 * Inserts a null entry to describe to the user that no expression entries
	 * exist.
	 * */
	self.clearSavedExpressions = function() {
		let parentEl = document.getElementById('saved-expressions-entry-list');
		while (parentEl.firstChild) {
			parentEl.removeChild(parentEl.firstChild);
		}

		parentEl.appendChild(buildNullExpressionEntryElement());

		Find.Popup.Storage.saveExpressions([]);
	};

	/**
	 * Construct an expression entry element, along with it's event handlers
	 * and reference information.
	 *
	 * @private
	 * @param {string} regex - The regular expression to display in the entry body.
	 * */
	function buildExpressionEntryElement(regex) {
		// Set search field with regex and update search. Also invoke saveEntry(), which
		// will place regex at top of saved expression entries and update local storage.
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

			Find.Popup.Storage.retrieveSavedExpressions((data) => {
				if(data) {
					//Remove existing entry, if it exists
					for(let index = 0; index < data.length; index++) {
						if(data[index] === regex) {
							data.splice(index, 1);
							break;
						}
					}
				}

				let parentEl = document.getElementById('saved-expressions-entry-list');
				if(!parentEl.children.length) {
					parentEl.appendChild(buildNullExpressionEntryElement());
				}

				Find.Popup.Storage.saveExpressions(data);
			});
		};

		return ElementBuilder.create(document)
			.createElement('div')
			.addClass('saved-expression-entry')
			.setAttribute('data-regex', regex)
			.appendChild(ElementBuilder.create(document)
				.createElement('button')
				.addClass('saved-expression-entry-button', 'controls-button')
				.addEventListener('click', useEntryHandler)
				.appendChild(ElementBuilder.create(document)
					.createElement('img')
					.addClass('information-hover-icon')
					.setAttribute('src', '/resources/bookmark.svg')
					.setAttribute('data-locale-title', 'saved_expression_icon_title')
					.build())
				.appendChild(ElementBuilder.create(document)
					.createElement('span')
					.addClass('saved-expression-entry-text', 'def-font')
					.setInnerText(regex)
					.build())
				.build())
			.appendChild(ElementBuilder.create(document)
				.createElement('div')
				.addClass('controls-button-cell')
				.appendChild(ElementBuilder.create(document)
					.createElement('button')
					.addClass('controls-button', 'delete-saved-expression-entry-button')
					.setAttribute('type', 'button')
					.setAttribute('data-locale-title', 'delete_saved_expression_icon_title')
					.addEventListener('click', deleteEntryHandler)
					.build())
				.build())
			.build();
	}

	/**
	 * Create a null entry with the given text as the body.
	 *
	 * @private
	 * */
	function buildNullExpressionEntryElement() {
		let text = Find.Popup.i18n.getLocalizedString("no_expressions_found_text");

		return ElementBuilder.create(document)
			.createElement('div')
			.addClass('saved-expression-entry')
			.setAttribute('id', 'null-entry')
			.appendChild(ElementBuilder.create(document)
				.createElement('button')
				.addClass('saved-expression-entry-button', 'controls-button')
				.appendChild(ElementBuilder.create(document)
					.createElement('img')
					.addClass('information-hover-icon')
					.setAttribute('src', 'img/icon/bookmark.svg')
					.setAttribute('data-locale-title', 'saved_expression_icon_title')
					.build())
				.appendChild(ElementBuilder.create(document)
					.createElement('span')
					.addClass('saved-expression-entry-text', 'def-font')
					.setAttribute('id', 'null-entry-text')
					.setInnerText(text)
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
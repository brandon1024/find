'use strict';

/**
 * Create the Popup History namespace.
 *
 * This namespace is responsible for retrieving and persisting previous search
 * queries for specific hosts. It's mostly a facade for the Find.Popup.Storage
 * API that has caching capabilities and logic for pruning old history.
 * */
Find.register('Popup.History', function (self) {

	let cachedHistory = null;
	let currentHostname = null;

	/**
	 * Since the hostname is only available when the popup is initialized,
	 * the hostname can be set here at initialization time and so it can
	 * be referenced later.
	 *
	 * @param {string} hostname - The hostname of the current page in the active tab.
	 * */
	self.setHostname = function (hostname) {
		currentHostname = hostname;
	};

	/**
	 * Retrieve the last search query for the current host, passing the
	 * result to the given callback function.
	 *
	 * If the current hostname is not set, or no history data exists for
	 * this host, null is passed to the callback.
	 *
	 * @param {function} callback - The callback function, accepting a single
	 * argument that is the last known search query for this host, or null
	 * if current hostname is not set, or no such information exists.
	 * */
	self.retrieveForHost = function(callback) {
		if (!currentHostname) {
			callback();
			return;
		}

		Find.Popup.Storage.retrieveHistory((history) => {
			if (history && history[currentHostname]) {
				callback(history[currentHostname].expression);

				cachedHistory = history;
			} else {
				callback(null);
			}
		});
	};

	/**
	 * Update the history entry for the current host with the new expression,
	 * invoking the given callback when the operation is complete.
	 *
	 * If the number of history entries for all hosts exceeds 100, old queries
	 * are pruned.
	 *
	 * @param {string} expression - The query/expression to save for the current host
	 * @param {function} callback - The optional callback function invoked when the
	 * operation is complete.
	 * */
	self.saveForHost = function(expression, callback) {
		if (!callback) {
			callback = () => {};
		}

		if (!currentHostname) {
			callback();
			return;
		}

		// if we cached the history, don't bother fetching from local storage
		if (cachedHistory) {
			cachedHistory[currentHostname] = {
				expression: expression,
				timestamp: Date.now()
			};

			// prune and save
			cachedHistory = prune(cachedHistory);
			Find.Popup.Storage.saveHistory(cachedHistory, callback);
		} else {
			Find.Popup.Storage.retrieveHistory((history) => {
				if (!history) {
					history = {};
				}

				history[currentHostname] = {
					expression: expression,
					timestamp: Date.now()
				};

				history = prune(history);

				Find.Popup.Storage.saveHistory(history, () => {
					cachedHistory = history;
					callback();
				});
			});
		}
	};

	/**
	 * Prune old search history data to avoid exceeding localstorage space
	 * limitations.
	 *
	 * History will only be pruned if the number of entries exceeds 100. If
	 * exceeded, the oldest entries will be removed.
	 *
	 * @private
	 * @param {object} history - History data.
	 * @return {object} Pruned history data.
	 * */
	function prune(history) {
		// only prune of number of items is over 100
		if (history && Object.keys(history).length <= 100)
			return history;

		let temporary = [];
		for (let key in history) {
			temporary.push({k: key, v: history[key]});
		}

		temporary.sort((a, b) => {
			return a.v.timestamp - b.v.timestamp;
		});

		temporary = temporary.slice((temporary.length - 100), temporary.length);

		let prunedHistory = {};
		for (let element of temporary) {
			prunedHistory[element.k] = element.v;
		}

		return prunedHistory;
	}
});
/**
 * Regression tests for background/background.js.
 *
 * Built against the actual source (file:127), not diff inference. Key
 * confirmed facts used below:
 *  - updateSearch(message, tab, sendResponse) lazily calls initializePage()
 *    (which calls ContentProxy.buildDocumentRepresentation) if
 *    documentRepresentation is not yet set, then re-invokes itself.
 *  - buildOccurrenceMap() returns { occurrenceIndexMap, length, groups } plus
 *    numeric keys for each group that has at least one match. `length` is the
 *    total match count; `groups` is the count of MATCHING groups (groups with
 *    zero matches are skipped via `continue`, not counted).
 *  - The module-level `index` variable starts as null and is NOT reset to 0
 *    by updateSearch alone (the reposition guard `index > length-1` is false
 *    when index is null, so it never fires). In real usage `index` is first
 *    set via initializeBrowserAction's `index = response.index || 0`. Tests
 *    that rely on a numeric `index` (e.g. extractOccurrences with a
 *    non-'all' cardinality) must call initializeBrowserAction first, exactly
 *    like the real popup-init flow does.
 *  - seekSearch()/extractOccurrences() both depend on regexOccurrenceMap
 *    already being populated by a prior updateSearch() call - they will throw
 *    if called cold.
 *  - restorePageState()/replaceNext()/replaceAll() call
 *    getUUIDsFromModelObject(documentRepresentation), which does
 *    `for (const key in documentRepresentation)` and reads
 *    documentRepresentation[key].group[i].elementUUID - needs a realistic
 *    model shape, not an empty object.
 *  - Loading strategy: no module.exports in this codebase, so we eval() the
 *    raw source against a mocked global Find namespace (see
 *    mock-extension-apis.js), same pattern used for highlighter.test.js.
 * */

const fs = require('fs');
const path = require('path');

function loadScript(relativePath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  // eslint-disable-next-line no-eval
  eval(code);
}

function debugError(fn) {
  try {
    return { result: fn(), error: null };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('DEBUG thrown error:', e.message, '\n', e.stack);
    return { result: null, error: e };
  }
}

// A minimal but realistic documentRepresentation, matching the shape
// getUUIDsFromModelObject/buildOccurrenceMap iterate over:
// { <groupKey>: { group: [{ text, elementUUID }, ...], preformatted } }
function buildModel(textByUUID) {
  const model = {};
  let groupIndex = 0;
  Object.keys(textByUUID).forEach((uuid) => {
    model[groupIndex] = {
      group: [{ text: textByUUID[uuid], elementUUID: uuid }],
      preformatted: false
    };
    groupIndex++;
  });
  return model;
}

describe('Background', () => {
  let tab;
  let sendResponse;

  beforeEach(() => {
    jest.resetModules();
    delete global.Find;
    require('../test/mock-extension-apis.js');

    global.Find.Background = global.Find.Background || {};
    global.Find.Background.ContentProxy = {
      buildDocumentRepresentation: jest.fn((t, cb) => cb(buildModel({ 'node-1': 'the quick brown fox' }))),
      clearPageHighlights: jest.fn(),
      fetch: jest.fn((t, cb) => cb({ success: true, selection: '', regex: '', iframes: 0, index: 0 })),
      executeScript: jest.fn(),
      seekHighlight: jest.fn(),
      updatePageHighlights: jest.fn(),
      replaceOccurrence: jest.fn(),
      replaceAllOccurrences: jest.fn(),
      restoreWebPage: jest.fn((t, uuids, cb) => cb && cb()),
      followLinkUnderFocus: jest.fn()
    };

    loadScript('background/background.js');

    tab = { id: 1, url: 'https://example.com' };
    sendResponse = jest.fn();
  });

  function lastResponse() {
    const calls = sendResponse.mock.calls;
    return calls.length ? calls[calls.length - 1][0] : null;
  }

  // Mirrors the real popup-init flow: initializeBrowserAction is what
  // first sets the module-level `index` to a real number (defaulting to 0
  // via `index = response.index || 0`). Any test that depends on `index`
  // being numeric (extractOccurrences, seekSearch) should call this first.
  function seedIndex() {
    global.Find.Background.initializeBrowserAction({}, tab, jest.fn());
  }

  describe('updateSearch - regex/literal escaping', () => {
    test('literal search escapes regex metacharacters without breaking the match', () => {
      const message = {
        regex: 'a.b*c',
        options: { findByRegex: false, matchCase: true, maxResults: 0 }
      };

      const { error } = debugError(() => {
        global.Find.Background.updateSearch(message, tab, sendResponse);
      });
      expect(error).toBeNull();

      expect(lastResponse().action).not.toBe('invalid_regex');
    });

    test('regex mode leaves metacharacters intact for pattern matching', () => {
      const message = {
        regex: 'a.b*c',
        options: { findByRegex: true, matchCase: true, maxResults: 0 }
      };

      const { error } = debugError(() => {
        global.Find.Background.updateSearch(message, tab, sendResponse);
      });
      expect(error).toBeNull();

      expect(lastResponse().action).not.toBe('invalid_regex');
    });

    test('every character class metacharacter is escaped correctly in literal mode', () => {
      // Directly exercises the line-160 fix: /[-[\]/{}()*+?.\\^$|]/g
      const metacharacters = '-[]/{}()*+?.\\^$|';
      const message = {
        regex: metacharacters,
        options: { findByRegex: false, matchCase: true, maxResults: 0 }
      };

      const { error } = debugError(() => {
        global.Find.Background.updateSearch(message, tab, sendResponse);
      });
      expect(error).toBeNull();

      expect(lastResponse().action).not.toBe('invalid_regex');
    });

    test('an actual literal match against page text returns a real occurrence, not empty_regex or invalid_regex', () => {
      const message = {
        regex: 'quick',
        options: { findByRegex: false, matchCase: true, maxResults: 0 }
      };

      global.Find.Background.updateSearch(message, tab, sendResponse);
      const response = lastResponse();

      expect(response.action).toBe('index_update');
      expect(response.total).toBe(1);
    });

    test('empty search string sends the empty_regex action and clears highlights', () => {
      const message = {
        regex: '',
        options: { findByRegex: false, matchCase: true, maxResults: 0 }
      };

      global.Find.Background.updateSearch(message, tab, sendResponse);

      expect(lastResponse().action).toBe('empty_regex');
      expect(global.Find.Background.ContentProxy.clearPageHighlights).toHaveBeenCalledWith(tab);
    });

    test('an invalid regex pattern (unbalanced group) is caught and reported as invalid_regex', () => {
      const message = {
        regex: 'a(b',
        options: { findByRegex: true, matchCase: true, maxResults: 0 }
      };

      global.Find.Background.updateSearch(message, tab, sendResponse);
      const response = lastResponse();

      expect(response.action).toBe('invalid_regex');
      expect(response.error).toBeTruthy();
    });

    test('lazily initializes the page via ContentProxy when documentRepresentation is not yet set', () => {
      const message = {
        regex: 'quick',
        options: { findByRegex: false, matchCase: true, maxResults: 0 }
      };

      global.Find.Background.updateSearch(message, tab, sendResponse);

      expect(global.Find.Background.ContentProxy.buildDocumentRepresentation).toHaveBeenCalled();
    });
  });

  describe('initializeBrowserAction', () => {
    test('responds with activeTab and reachability info from ContentProxy.fetch', () => {
      const message = {};

      global.Find.Background.initializeBrowserAction(message, tab, sendResponse);
      const response = lastResponse();

      expect(response.action).toBe('browser_action_init');
      expect(response.response.activeTab).toBe(tab);
      expect(response.response.isReachable).toBe(true);
    });

    test('does not attach selection/regex/iframes when the tab is not reachable', () => {
      global.Find.Background.ContentProxy.fetch = jest.fn((t, cb) => cb({ success: false }));

      global.Find.Background.initializeBrowserAction({}, tab, sendResponse);
      const response = lastResponse();

      expect(response.response.isReachable).toBeFalsy();
      expect(response.response.selectedText).toBeUndefined();
    });
  });

  describe('restorePageState', () => {
    test('clears highlights and restores the web page by default', () => {
      // Seed documentRepresentation via a search first
      global.Find.Background.updateSearch(
        { regex: 'quick', options: { findByRegex: false, matchCase: true, maxResults: 0 } },
        tab,
        sendResponse
      );

      const { error } = debugError(() => {
        global.Find.Background.restorePageState(tab);
      });
      expect(error).toBeNull();

      expect(global.Find.Background.ContentProxy.clearPageHighlights).toHaveBeenCalledWith(tab);
      expect(global.Find.Background.ContentProxy.restoreWebPage).toHaveBeenCalled();
    });

    test('does not clear highlights when restoreHighlights is explicitly false', () => {
      global.Find.Background.updateSearch(
        { regex: 'quick', options: { findByRegex: false, matchCase: true, maxResults: 0 } },
        tab,
        sendResponse
      );
      global.Find.Background.ContentProxy.clearPageHighlights.mockClear();

      global.Find.Background.restorePageState(tab, false);

      expect(global.Find.Background.ContentProxy.clearPageHighlights).not.toHaveBeenCalled();
    });
  });

  describe('seekSearch', () => {
    test('advances the index forward after a prior search and reports index_update', () => {
      seedIndex();
      global.Find.Background.updateSearch(
        { regex: 'o', options: { findByRegex: false, matchCase: true, maxResults: 0 } },
        tab,
        sendResponse
      ); // "the quick brown fox" - two occurrences of "o": brown, fox
      sendResponse.mockClear();

      const { error } = debugError(() => {
        global.Find.Background.seekSearch(
          { options: { findByRegex: false, matchCase: true, maxResults: 0 } },
          true,
          tab,
          sendResponse
        );
      });
      expect(error).toBeNull();

      const response = lastResponse();
      expect(response.action).toBe('index_update');
      expect(global.Find.Background.ContentProxy.seekHighlight).toHaveBeenCalled();
    });
  });

  describe('extractOccurrences', () => {
    test('returns the current single occurrence when cardinality is not "all"', () => {
      // index must be numeric (0) before extractOccurrences reads
      // regexOccurrenceMap.occurrenceIndexMap[index] - seed it the same
      // way the real popup-init flow does.
      seedIndex();
      global.Find.Background.updateSearch(
        { regex: 'quick', options: { findByRegex: false, matchCase: true, maxResults: 0 } },
        tab,
        sendResponse
      );
      sendResponse.mockClear();

      global.Find.Background.extractOccurrences(
        { options: { cardinality: 'current' } },
        tab,
        sendResponse
      );

      const response = lastResponse();
      expect(response.action).toBe('get_occurrence');
      expect(response.response).toBe('quick');
    });

    test('returns a newline-joined list of all occurrences when cardinality is "all"', () => {
      global.Find.Background.updateSearch(
        { regex: 'o', options: { findByRegex: false, matchCase: true, maxResults: 0 } },
        tab,
        sendResponse
      );
      sendResponse.mockClear();

      global.Find.Background.extractOccurrences(
        { options: { cardinality: 'all' } },
        tab,
        sendResponse
      );

      const response = lastResponse();
      expect(response.action).toBe('get_occurrence');
      expect(response.response.split('\n').length).toBeGreaterThan(1);
    });
  });

  describe('replaceNext / replaceAll / followLinkUnderFocus', () => {
    test('replaceNext delegates to ContentProxy.replaceOccurrence with a zero-based index and invalidates', () => {
      global.Find.Background.updateSearch(
        { regex: 'quick', options: { findByRegex: false, matchCase: true, maxResults: 0 } },
        tab,
        sendResponse
      );
      sendResponse.mockClear();

      const message = { index: 1, replaceWith: 'slow', options: {} };
      global.Find.Background.replaceNext(message, tab, sendResponse);

      expect(global.Find.Background.ContentProxy.replaceOccurrence)
        .toHaveBeenCalledWith(tab, 0, 'slow', {});
      expect(lastResponse().action).toBe('invalidate');
    });

    test('replaceAll delegates to ContentProxy.replaceAllOccurrences and invalidates', () => {
      global.Find.Background.updateSearch(
        { regex: 'quick', options: { findByRegex: false, matchCase: true, maxResults: 0 } },
        tab,
        sendResponse
      );
      sendResponse.mockClear();

      const message = { replaceWith: 'slow', options: {} };
      global.Find.Background.replaceAll(message, tab, sendResponse);

      expect(global.Find.Background.ContentProxy.replaceAllOccurrences)
        .toHaveBeenCalledWith(tab, 'slow', {});
      expect(lastResponse().action).toBe('invalidate');
    });

    test('followLinkUnderFocus delegates to ContentProxy and responds with close', () => {
      global.Find.Background.followLinkUnderFocus({}, tab, sendResponse);

      expect(global.Find.Background.ContentProxy.followLinkUnderFocus).toHaveBeenCalledWith(tab);
      expect(lastResponse().action).toBe('close');
    });
  });

  describe('max_results option', () => {
    test('caps the reported total when max_results is set below the real match count', () => {
      global.Find.Background.ContentProxy.buildDocumentRepresentation =
        jest.fn((t, cb) => cb(buildModel({ 'node-1': 'o o o o o' })));
      loadScript('background/background.js');

      const message = {
        regex: 'o',
        options: { findByRegex: false, matchCase: true, maxResults: 2 }
      };

      global.Find.Background.updateSearch(message, tab, sendResponse);
      const response = lastResponse();

      expect(response.total).toBe(2);
    });
  });
});

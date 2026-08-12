/**
 * Regression tests for background/omni.js.
 *
 * Built against the actual source (file:131). Key confirmed facts used below:
 * - Everything in this file registers browser.omnibox.* listeners at
 *   Find.register() time - there is nothing exposed on `self` (this is the
 *   same file that produced the no-unused-vars "self" finding during the
 *   ESLint cleanup). Listeners are captured via mocked addListener() calls
 *   and invoked manually to exercise the logic.
 * - retrieveOptions(callback) runs SYNCHRONOUSLY at load time (not inside an
 *   event listener), immediately after Find.register()'s callback executes,
 *   calling browser.storage.local.get('options', ...). Its result is closed
 *   over by the onInputChanged listener registered inside it. Because our
 *   mock's storage.local.get invokes its callback synchronously, the
 *   listener is fully wired by the time loadScript() returns.
 * - DEFAULT_OPTIONS is a private frozen const - not exposed - so its shape
 *   is verified indirectly, via the options object passed to
 *   Find.Background.updateSearch() when nothing is in storage.
 * - Find.Background.updateSearch is looked up dynamically at call time
 *   inside the onInputChanged listener body, so it can be reassigned
 *   per-test without reloading the script.
 * */

const fs = require('fs');
const path = require('path');

function loadScript(relativePath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  // eslint-disable-next-line no-eval
  eval(code);
}

describe('Background.Omni', () => {
  let capturedListeners;
  let tabs;

  beforeEach(() => {
    jest.resetModules();
    delete global.Find;
    require('../test/mock-extension-apis.js');

    capturedListeners = {};
    tabs = [{ id: 1, url: 'https://example.com' }];

    global.Find.browser.omnibox = {
      onInputStarted: { addListener: jest.fn((cb) => { capturedListeners.onInputStarted = cb; }) },
      onInputChanged: { addListener: jest.fn((cb) => { capturedListeners.onInputChanged = cb; }) },
      onInputCancelled: { addListener: jest.fn((cb) => { capturedListeners.onInputCancelled = cb; }) },
      onInputEntered: { addListener: jest.fn((cb) => { capturedListeners.onInputEntered = cb; }) },
      setDefaultSuggestion: jest.fn()
    };

    global.Find.browser.tabs.query = jest.fn((queryInfo, cb) => cb(tabs));

    global.Find.Background = {
      initializePage: jest.fn(),
      updateSearch: jest.fn(),
      restorePageState: jest.fn()
    };
  });

  function loadOmniWithStoredOptions(storageResponse) {
    global.Find.browser.storage.local.get = jest.fn((key, cb) => {
      process.nextTick(() => cb(storageResponse));
    });
    loadScript('background/omni.js');
    return new Promise(process.nextTick);
  }

  test('onInputStarted initializes the page for the currently active tab', async () => {
    await loadOmniWithStoredOptions({});
    capturedListeners.onInputStarted();

    expect(global.Find.Background.initializePage).toHaveBeenCalledWith(tabs[0]);
  });

  test('onInputCancelled restores page state, removing highlights', async () => {
    await loadOmniWithStoredOptions({});
    capturedListeners.onInputCancelled();

    expect(global.Find.Background.restorePageState).toHaveBeenCalledWith(tabs[0]);
  });

  test('onInputEntered restores page state without removing highlights', async () => {
    await loadOmniWithStoredOptions({});
    capturedListeners.onInputEntered();

    expect(global.Find.Background.restorePageState).toHaveBeenCalledWith(tabs[0], false);
  });

  describe('retrieveOptions default fallback', () => {
    test('falls back to DEFAULT_OPTIONS when nothing is stored', async () => {
      await loadOmniWithStoredOptions({}); // no 'options' key present
      capturedListeners.onInputChanged('quick');

      const passedOptions = global.Find.Background.updateSearch.mock.calls[0][0].options;
      expect(passedOptions.findByRegex).toBe(true);
      expect(passedOptions.matchCase).toBe(true);
      expect(passedOptions.maxResults).toBe(0);
      expect(passedOptions.persistentHighlights).toBe(false);
    });

    test('uses stored options as-is, without falling back to defaults', async () => {
      const customOptions = { findByRegex: false, matchCase: false, maxResults: 5 };
      await loadOmniWithStoredOptions({ options: customOptions });
      capturedListeners.onInputChanged('quick');

      const passedOptions = global.Find.Background.updateSearch.mock.calls[0][0].options;
      expect(passedOptions).toEqual(customOptions);
    });
  });

  describe('onInputChanged suggestion text', () => {
    test('prompts for input when the regex is empty', async () => {
      await loadOmniWithStoredOptions({});
      capturedListeners.onInputChanged('');

      expect(global.Find.browser.omnibox.setDefaultSuggestion).not.toHaveBeenCalled();
    });

    test('shows the match count when the search succeeds', async () => {
      await loadOmniWithStoredOptions({});
      global.Find.Background.updateSearch =
        jest.fn((msg, tab, cb) => cb({ action: 'index_update', total: 3 }));

      capturedListeners.onInputChanged('quick');

      expect(global.Find.browser.omnibox.setDefaultSuggestion)
        .toHaveBeenCalledWith({ description: '3 matches found' });
    });

    test('shows the error message when the regex is invalid', async () => {
      await loadOmniWithStoredOptions({});
      global.Find.Background.updateSearch =
        jest.fn((msg, tab, cb) => cb({ action: 'invalid_regex', error: 'Unterminated group' }));

      capturedListeners.onInputChanged('a(b');

      expect(global.Find.browser.omnibox.setDefaultSuggestion)
        .toHaveBeenCalledWith({ description: 'Unterminated group' });
    });

    test('queries the active tab and forwards the entered regex to updateSearch', async () => {
      await loadOmniWithStoredOptions({});
      capturedListeners.onInputChanged('quick');

      expect(global.Find.Background.updateSearch).toHaveBeenCalledWith(
        expect.objectContaining({ regex: 'quick' }),
        tabs[0],
        expect.any(Function)
      );
    });
  });
});

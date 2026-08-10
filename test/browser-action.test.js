/**
 * Regression tests for popup/js/browser-action.js.
 *
 * Popup.BrowserAction coordinates the popup UI: it dispatches messages to the
 * background script via Popup.BackgroundProxy, and delegates rendering to the
 * various Popup.*Pane namespaces. All of those collaborators are mocked here;
 * only browser-action.js itself is loaded via eval.
 *
 * Uses jsdom's real `document`/`window`/`navigator` globals (Jest's default test
 * environment). `document.getElementById('popup-body')` must exist before load,
 * since init() attaches a listener to it directly.
 */

const fs = require('fs');
const path = require('path');

function loadScript(relativePath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  // eslint-disable-next-line no-eval
  eval(code);
}

function dispatchKeyup({ code, ctrlKey = false, altKey = false }) {
  const event = new window.KeyboardEvent('keyup', { code, ctrlKey, altKey, bubbles: true });
  document.body.dispatchEvent(event);
}

describe('Popup.BrowserAction', () => {
  let BrowserAction;

  beforeEach(() => {
    jest.resetModules();
    delete global.Find;
    require('../test/mock-extension-apis.js');

    document.body.innerHTML = '<div id="popup-body"></div>';

    global.Find.browserId = 'Chrome';

    global.Find.Popup = {
      BackgroundProxy: {
        openConnection: jest.fn(),
        closeConnection: jest.fn(),
        postMessage: jest.fn()
      },
      OptionsPane: {
        toggle: jest.fn(),
        show: jest.fn(),
        getOptions: jest.fn(() => ({ match_case: true }))
      },
      ReplacePane: {
        toggle: jest.fn(),
        show: jest.fn(),
        getReplaceFieldText: jest.fn(() => 'replacement'),
        enableButtons: jest.fn()
      },
      SavedExpressionsPane: {
        toggle: jest.fn(),
        show: jest.fn()
      },
      SearchPane: {
        focusSearchField: jest.fn(),
        setSearchFieldText: jest.fn(),
        selectSearchField: jest.fn(),
        getSearchFieldText: jest.fn(() => 'quick'),
        flashIframesFoundWarningIcon: jest.fn(),
        updateIndexText: jest.fn(),
        showMalformedRegexIcon: jest.fn(),
        enableButtons: jest.fn(),
        clearIndexText: jest.fn(),
        flashInstallInformationIcon: jest.fn(),
        flashUpdateInformationIcon: jest.fn(),
        flashClipboardCopyIcon: jest.fn(),
        flashClipboardCopyErrorIcon: jest.fn()
      },
      History: {
        setHostname: jest.fn(),
        retrieveForHost: jest.fn(),
        saveForHost: jest.fn()
      },
      MessagePane: {
        showInternalRestrictedBrowserPageErrorMessage: jest.fn(),
        showPDFSearchErrorMessage: jest.fn(),
        showOfflineFileErrorMessage: jest.fn()
      }
    };

    global.navigator.clipboard = {
      writeText: jest.fn(() => Promise.resolve())
    };

    loadScript('popup/js/browser-action.js');
    BrowserAction = global.Find.Popup.BrowserAction;
  });

  describe('init', () => {
    test('opens the background connection and sends browser_action_init', () => {
      BrowserAction.init();

      expect(global.Find.Popup.BackgroundProxy.openConnection).toHaveBeenCalled();
      expect(global.Find.Popup.BackgroundProxy.postMessage)
        .toHaveBeenCalledWith({ action: 'browser_action_init' });
    });

    test('focuses the search field on init', () => {
      BrowserAction.init();

      expect(global.Find.Popup.SearchPane.focusSearchField).toHaveBeenCalled();
    });

    test('clicking the popup body refocuses the search field', () => {
      BrowserAction.init();
      jest.clearAllMocks();

      document.getElementById('popup-body').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(global.Find.Popup.SearchPane.focusSearchField).toHaveBeenCalled();
    });

    test('Ctrl+Alt+O toggles the options pane and hides replace/saved-expressions panes', () => {
      BrowserAction.init();

      dispatchKeyup({ code: 'KeyO', ctrlKey: true, altKey: true });

      expect(global.Find.Popup.OptionsPane.toggle).toHaveBeenCalled();
      expect(global.Find.Popup.ReplacePane.show).toHaveBeenCalledWith(false);
      expect(global.Find.Popup.SavedExpressionsPane.show).toHaveBeenCalledWith(false);
    });

    test('Ctrl+Alt+R toggles the replace pane and hides options/saved-expressions panes', () => {
      BrowserAction.init();

      dispatchKeyup({ code: 'KeyR', ctrlKey: true, altKey: true });

      expect(global.Find.Popup.ReplacePane.toggle).toHaveBeenCalled();
      expect(global.Find.Popup.OptionsPane.show).toHaveBeenCalledWith(false);
      expect(global.Find.Popup.SavedExpressionsPane.show).toHaveBeenCalledWith(false);
    });

    test('Ctrl+Alt+H toggles the saved expressions pane and hides options/replace panes', () => {
      BrowserAction.init();

      dispatchKeyup({ code: 'KeyH', ctrlKey: true, altKey: true });

      expect(global.Find.Popup.SavedExpressionsPane.toggle).toHaveBeenCalled();
      expect(global.Find.Popup.OptionsPane.show).toHaveBeenCalledWith(false);
      expect(global.Find.Popup.ReplacePane.show).toHaveBeenCalledWith(false);
    });

    test('a keyup without the required modifiers does not toggle any pane', () => {
      BrowserAction.init();

      dispatchKeyup({ code: 'KeyO', ctrlKey: false, altKey: true });

      expect(global.Find.Popup.OptionsPane.toggle).not.toHaveBeenCalled();
    });
  });

  describe('startExtension', () => {
    function initInfo(overrides = {}) {
      return {
        activeTab: { url: 'https://example.com/page' },
        isReachable: true,
        iframes: 0,
        selectedText: '',
        regex: null,
        ...overrides
      };
    }

    test('sets the hostname from the active tab URL', () => {
      BrowserAction.startExtension(initInfo({ activeTab: { url: 'https://example.com/page' } }));

      expect(global.Find.Popup.History.setHostname).toHaveBeenCalledWith('example.com');
    });

    test('shows a forbidden URL error for internal browser pages', () => {
      BrowserAction.startExtension(initInfo({ activeTab: { url: 'chrome://extensions' } }));

      expect(global.Find.Popup.MessagePane.showInternalRestrictedBrowserPageErrorMessage).toHaveBeenCalled();
      expect(global.Find.Popup.SearchPane.enableButtons).toHaveBeenCalledWith(false);
    });

    test('shows a forbidden URL error for about: pages regardless of browser', () => {
      BrowserAction.startExtension(initInfo({ activeTab: { url: 'about:blank' } }));

      expect(global.Find.Popup.MessagePane.showInternalRestrictedBrowserPageErrorMessage).toHaveBeenCalled();
    });

    test('shows a forbidden URL error for Firefox moz-extension pages when browserId is Firefox', () => {
      global.Find.browserId = 'Firefox';
      BrowserAction.startExtension(initInfo({ activeTab: { url: 'moz-extension://abc/page.html' } }));

      expect(global.Find.Popup.MessagePane.showInternalRestrictedBrowserPageErrorMessage).toHaveBeenCalled();
    });

    test('shows a PDF error message for .pdf URLs', () => {
      BrowserAction.startExtension(initInfo({ activeTab: { url: 'https://example.com/doc.pdf' } }));

      expect(global.Find.Popup.MessagePane.showPDFSearchErrorMessage).toHaveBeenCalled();
    });

    test('shows an offline file error for unreachable local files', () => {
      BrowserAction.startExtension(initInfo({
        activeTab: { url: 'file:///home/user/page.html' },
        isReachable: false
      }));

      expect(global.Find.Popup.MessagePane.showOfflineFileErrorMessage).toHaveBeenCalled();
    });

    test('does not show an offline file error for a reachable local file', () => {
      BrowserAction.startExtension(initInfo({
        activeTab: { url: 'file:///home/user/page.html' },
        isReachable: true
      }));

      expect(global.Find.Popup.MessagePane.showOfflineFileErrorMessage).not.toHaveBeenCalled();
    });

    test('flashes the iframe warning icon when iframes are present', () => {
      BrowserAction.startExtension(initInfo({ iframes: 2 }));

      expect(global.Find.Popup.SearchPane.flashIframesFoundWarningIcon).toHaveBeenCalled();
    });

    test('populates the search field with selected text and triggers a search', () => {
      BrowserAction.startExtension(initInfo({ selectedText: 'selected phrase' }));

      expect(global.Find.Popup.SearchPane.setSearchFieldText).toHaveBeenCalledWith('selected phrase');
      expect(global.Find.Popup.SearchPane.selectSearchField).toHaveBeenCalled();
      expect(global.Find.Popup.BackgroundProxy.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'update' })
      );
    });

    test('falls back to the previously active regex when no text is selected', () => {
      BrowserAction.startExtension(initInfo({ selectedText: '', regex: '\\d+' }));

      expect(global.Find.Popup.SearchPane.setSearchFieldText).toHaveBeenCalledWith('\\d+');
      expect(global.Find.Popup.SearchPane.selectSearchField).toHaveBeenCalled();
    });

    test('falls back to stored per-host history when there is no selection or active regex', () => {
      global.Find.Popup.History.retrieveForHost.mockImplementation((cb) => cb('stored expr'));

      BrowserAction.startExtension(initInfo({ selectedText: '', regex: null }));

      expect(global.Find.Popup.History.retrieveForHost).toHaveBeenCalled();
      expect(global.Find.Popup.SearchPane.setSearchFieldText).toHaveBeenCalledWith('stored expr');
    });

    test('does not populate the search field when history has nothing stored for the host', () => {
      global.Find.Popup.History.retrieveForHost.mockImplementation((cb) => cb(null));

      BrowserAction.startExtension(initInfo({ selectedText: '', regex: null }));

      expect(global.Find.Popup.SearchPane.setSearchFieldText).not.toHaveBeenCalled();
    });
  });

  describe('closeExtension', () => {
    test('closes the background connection and the popup window', () => {
      window.close = jest.fn();

      BrowserAction.closeExtension();

      expect(global.Find.Popup.BackgroundProxy.closeConnection).toHaveBeenCalled();
      expect(window.close).toHaveBeenCalled();
    });
  });

  describe('updateSearch', () => {
    test('posts the current regex and options, and saves the query to history', () => {
      BrowserAction.updateSearch();

      expect(global.Find.Popup.BackgroundProxy.postMessage).toHaveBeenCalledWith({
        action: 'update',
        regex: 'quick',
        options: { match_case: true }
      });
      expect(global.Find.Popup.History.saveForHost).toHaveBeenCalledWith('quick');
    });
  });

  describe('seekForwards / seekBackwards', () => {
    test('seekForwards triggers updateSearch when not yet initialized', () => {
      BrowserAction.seekForwards();

      expect(global.Find.Popup.BackgroundProxy.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'update' })
      );
    });

    test('seekForwards posts a next action once initialized', () => {
      BrowserAction.updateSearch();
      global.Find.Popup.BackgroundProxy.postMessage.mockClear();

      BrowserAction.seekForwards();

      expect(global.Find.Popup.BackgroundProxy.postMessage).toHaveBeenCalledWith({
        action: 'next',
        options: { match_case: true }
      });
      expect(global.Find.Popup.SearchPane.focusSearchField).toHaveBeenCalled();
    });

    test('seekBackwards posts a previous action once initialized', () => {
      BrowserAction.updateSearch();
      global.Find.Popup.BackgroundProxy.postMessage.mockClear();

      BrowserAction.seekBackwards();

      expect(global.Find.Popup.BackgroundProxy.postMessage).toHaveBeenCalledWith({
        action: 'previous',
        options: { match_case: true }
      });
    });
  });

  describe('replaceNext / replaceAll', () => {
    test('replaceNext posts the current index and replacement text', () => {
      BrowserAction.updateIndex(2, 5);

      BrowserAction.replaceNext();

      expect(global.Find.Popup.BackgroundProxy.postMessage).toHaveBeenCalledWith({
        action: 'replace_next',
        index: 2,
        replaceWith: 'replacement',
        options: { match_case: true }
      });
    });

    test('replaceAll posts the replacement text without an index', () => {
      BrowserAction.replaceAll();

      expect(global.Find.Popup.BackgroundProxy.postMessage).toHaveBeenCalledWith({
        action: 'replace_all',
        replaceWith: 'replacement',
        options: { match_case: true }
      });
    });
  });

  describe('followLink', () => {
    test('triggers updateSearch when not yet initialized', () => {
      BrowserAction.followLink();

      expect(global.Find.Popup.BackgroundProxy.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'update' })
      );
    });

    test('posts a follow_link action once initialized', () => {
      BrowserAction.updateSearch();
      global.Find.Popup.BackgroundProxy.postMessage.mockClear();

      BrowserAction.followLink();

      expect(global.Find.Popup.BackgroundProxy.postMessage).toHaveBeenCalledWith({
        action: 'follow_link',
        options: { match_case: true }
      });
    });
  });

  describe('getOccurrence', () => {
    test('triggers updateSearch when not yet initialized', () => {
      BrowserAction.getOccurrence({ some: 'options' });

      expect(global.Find.Popup.BackgroundProxy.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'update' })
      );
    });

    test('posts a get_occurrence action with the given options once initialized', () => {
      BrowserAction.updateSearch();
      global.Find.Popup.BackgroundProxy.postMessage.mockClear();

      BrowserAction.getOccurrence({ custom: true });

      expect(global.Find.Popup.BackgroundProxy.postMessage).toHaveBeenCalledWith({
        action: 'get_occurrence',
        options: { custom: true }
      });
    });
  });

  describe('copyTextToClipboard', () => {
    test('flashes the copy icon on success', async () => {
      await BrowserAction.copyTextToClipboard('matched text');

      expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith('matched text');
      expect(global.Find.Popup.SearchPane.flashClipboardCopyIcon).toHaveBeenCalled();
    });

    test('flashes the copy error icon on failure', async () => {
      global.navigator.clipboard.writeText = jest.fn(() => Promise.reject(new Error('denied')));

      BrowserAction.copyTextToClipboard('matched text');
      await Promise.resolve();
      await Promise.resolve();

      expect(global.Find.Popup.SearchPane.flashClipboardCopyErrorIcon).toHaveBeenCalled();
    });
  });

  describe('updateIndex', () => {
    test('updates the index text and enables buttons when occurrences exist', () => {
      BrowserAction.updateIndex(3, 10);

      expect(global.Find.Popup.SearchPane.updateIndexText).toHaveBeenCalledWith(3, 10);
      expect(global.Find.Popup.SearchPane.showMalformedRegexIcon).toHaveBeenCalledWith(false);
      expect(global.Find.Popup.SearchPane.enableButtons).toHaveBeenCalledWith(true);
      expect(global.Find.Popup.ReplacePane.enableButtons).toHaveBeenCalledWith(true);
    });

    test('disables buttons when there are zero occurrences', () => {
      BrowserAction.updateIndex(0, 0);

      expect(global.Find.Popup.SearchPane.enableButtons).toHaveBeenCalledWith(false);
      expect(global.Find.Popup.ReplacePane.enableButtons).toHaveBeenCalledWith(false);
    });
  });

  describe('error', () => {
    test('resets index, disables buttons, and clears the index text', () => {
      BrowserAction.updateIndex(4, 8);

      BrowserAction.error('some_error');

      expect(global.Find.Popup.SearchPane.enableButtons).toHaveBeenCalledWith(false);
      expect(global.Find.Popup.ReplacePane.enableButtons).toHaveBeenCalledWith(false);
      expect(global.Find.Popup.SearchPane.clearIndexText).toHaveBeenCalled();
    });

    test('shows the malformed regex icon only for invalid_regex errors', () => {
      BrowserAction.error('invalid_regex');
      expect(global.Find.Popup.SearchPane.showMalformedRegexIcon).toHaveBeenCalledWith(true);

      BrowserAction.error('offline_file');
      expect(global.Find.Popup.SearchPane.showMalformedRegexIcon).toHaveBeenCalledWith(false);
    });

    test('resets the index used by subsequent replaceNext calls', () => {
      BrowserAction.updateIndex(4, 8);
      BrowserAction.error('some_error');

      BrowserAction.replaceNext();

      expect(global.Find.Popup.BackgroundProxy.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ index: 0 })
      );
    });
  });

  describe('showInstallUpdateDetails', () => {
    test('flashes the install icon for an install reason', () => {
      BrowserAction.showInstallUpdateDetails({ reason: 'install' });

      expect(global.Find.Popup.SearchPane.flashInstallInformationIcon).toHaveBeenCalled();
    });

    test('flashes the update icon for an update reason', () => {
      BrowserAction.showInstallUpdateDetails({ reason: 'update' });

      expect(global.Find.Popup.SearchPane.flashUpdateInformationIcon).toHaveBeenCalled();
    });

    test('flashes nothing for an unrecognized reason', () => {
      BrowserAction.showInstallUpdateDetails({ reason: 'unknown' });

      expect(global.Find.Popup.SearchPane.flashInstallInformationIcon).not.toHaveBeenCalled();
      expect(global.Find.Popup.SearchPane.flashUpdateInformationIcon).not.toHaveBeenCalled();
    });
  });
});
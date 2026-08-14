/**
 * Regression tests for background/browser-action-proxy.js.
 *
 * Scoped deliberately to actionDispatch()'s routing table only - the
 * onConnect/onDisconnect port lifecycle around it is event-plumbing with
 * little logic worth unit testing (see value-for-effort discussion). The
 * risk actionDispatch protects against is real: a typo'd action string or a
 * misordered switch case silently breaks exactly one popup button while
 * everything else keeps working - the kind of regression manual smoke
 * testing easily misses unless that specific button gets clicked.
 *
 * Loading strategy: actionDispatch is declared with `function actionDispatch`
 * inside the Find.register() callback, so it is NOT exposed on `self` and
 * has no external name. To exercise it, we instead register the
 * onConnect listener, capture it, then simulate a full port connection and
 * a single onMessage call per test - this drives execution through
 * actionDispatch exactly as the real popup does, without needing to expose
 * or duplicate its internal switch statement.
 * */

const fs = require('fs');
const path = require('path');

function loadScript(relativePath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  // eslint-disable-next-line no-eval
  eval(code);
}

function makeMockPort() {
  const listeners = { onMessage: null, onDisconnect: null };
  return {
    name: 'popup_to_background_port',
    postMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn((cb) => { listeners.onMessage = cb; })
    },
    onDisconnect: {
      addListener: jest.fn((cb) => { listeners.onDisconnect = cb; })
    },
    // test helper, not part of the real browser API
    _listeners: listeners
  };
}

describe('Background.BrowserActionProxy - actionDispatch routing', () => {
  let onConnectListener;
  let port;
  let tab;

  beforeEach(() => {
    jest.resetModules();
    delete global.Find;
    require('../test/mock-extension-apis.js');

    tab = { id: 1, url: 'https://example.com' };

    global.Find.browser.runtime.onConnect = {
      addListener: jest.fn((cb) => { onConnectListener = cb; })
    };
    global.Find.browser.tabs.query = jest.fn((queryInfo, cb) => cb([tab]));

    global.Find.Background = {
      installationDetails: null,
      options: null,
      updateSearch: jest.fn(),
      seekSearch: jest.fn(),
      replaceNext: jest.fn(),
      replaceAll: jest.fn(),
      followLinkUnderFocus: jest.fn(),
      initializeBrowserAction: jest.fn(),
      extractOccurrences: jest.fn(),
      restorePageState: jest.fn()
    };

    loadScript('background/browser-action-proxy.js');

    port = makeMockPort();
    onConnectListener(port);
  });

  function dispatch(action, extraFields) {
    port._listeners.onMessage(Object.assign({ action }, extraFields));
  }

  test('ignores connections that are not the expected popup port', () => {
    const otherPort = makeMockPort();
    otherPort.name = 'some_other_port';

    onConnectListener(otherPort);

    // Real assertion: none of the popup-port setup happened for this port
    expect(otherPort.onMessage.addListener).not.toHaveBeenCalled();
  });

  test("'update' routes to Background.updateSearch", () => {
    dispatch('update');
    expect(global.Find.Background.updateSearch).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'update' }), tab, expect.any(Function)
    );
  });

  test("'next' routes to Background.seekSearch with seekForward=true", () => {
    dispatch('next');
    expect(global.Find.Background.seekSearch).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'next' }), true, tab, expect.any(Function)
    );
  });

  test("'previous' routes to Background.seekSearch with seekForward=false", () => {
    dispatch('previous');
    expect(global.Find.Background.seekSearch).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'previous' }), false, tab, expect.any(Function)
    );
  });

  test("'replace_next' routes to Background.replaceNext", () => {
    dispatch('replace_next');
    expect(global.Find.Background.replaceNext).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'replace_next' }), tab, expect.any(Function)
    );
  });

  test("'replace_all' routes to Background.replaceAll", () => {
    dispatch('replace_all');
    expect(global.Find.Background.replaceAll).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'replace_all' }), tab, expect.any(Function)
    );
  });

  test("'follow_link' routes to Background.followLinkUnderFocus", () => {
    dispatch('follow_link');
    expect(global.Find.Background.followLinkUnderFocus).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'follow_link' }), tab, expect.any(Function)
    );
  });

  test("'browser_action_init' routes to Background.initializeBrowserAction", () => {
    dispatch('browser_action_init');
    expect(global.Find.Background.initializeBrowserAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'browser_action_init' }), tab, expect.any(Function)
    );
  });

  test("'get_occurrence' routes to Background.extractOccurrences", () => {
    dispatch('get_occurrence');
    expect(global.Find.Background.extractOccurrences).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'get_occurrence' }), tab, expect.any(Function)
    );
  });

  test('the response from the dispatched handler is posted back through the port', () => {
    global.Find.Background.updateSearch = jest.fn((msg, t, sendResponse) => {
      sendResponse({ action: 'index_update', total: 2 });
    });

    dispatch('update');

    expect(port.postMessage).toHaveBeenCalledWith({ action: 'index_update', total: 2 });
  });

  describe('onDisconnect', () => {
    test('restores and clears highlights when persistent_highlights is not set', () => {
      global.Find.Background.options = { persistentHighlights: false };

      port._listeners.onDisconnect();

      expect(global.Find.Background.restorePageState).toHaveBeenCalledWith(tab);
    });

    test('restores page state without clearing highlights when persistent_highlights is true', () => {
      global.Find.Background.options = { persistentHighlights: true };

      port._listeners.onDisconnect();

      expect(global.Find.Background.restorePageState).toHaveBeenCalledWith(tab, false);
    });
  });
});

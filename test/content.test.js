/**
 * Regression tests for content/content.js.
 *
 * content.js registers a single browser.runtime.onMessage listener and delegates
 * to Content.Parser and Content.Highlighter. The listener is captured via the
 * mocked addListener() and invoked manually per test.
 *
 * jsdom (Jest's default test environment) provides real `window` and `document`
 * globals that are not writable via `global.window = {...}` / `global.document = {...}`.
 * Mock the specific methods the source calls instead of replacing the objects.
 */

const fs = require('fs');
const path = require('path');

function loadScript(relativePath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  // eslint-disable-next-line no-eval
  eval(code);
}

describe('Content', () => {
  let capturedMessageListener;
  let sendResponse;
  let sender;

  beforeEach(() => {
    jest.resetModules();
    delete global.Find;
    require('../test/mock-extension-apis.js');

    capturedMessageListener = null;
    sendResponse = jest.fn();
    sender = {};

    global.Find.browser.runtime.onMessage = {
      addListener: jest.fn((cb) => {
        capturedMessageListener = cb;
      })
    };

    global.Find.Content = {
      Parser: {
        buildDOMReferenceObject: jest.fn(() => ({ title: 'test', bodyUUID: 'uuid-body' })),
        restoreWebPage: jest.fn()
      },
      Highlighter: {
        restore: jest.fn(),
        highlightAll: jest.fn(),
        seekHighlight: jest.fn(),
        replace: jest.fn(),
        replaceAll: jest.fn(),
        followLinkUnderFocus: jest.fn()
      }
    };

    window.getSelection = jest.fn(() => ({ toString: () => 'initial selection' }));
    document.getElementsByTagName = jest.fn((tag) => {
      if (tag === 'iframe') return { length: 2 };
      return { length: 0 };
    });

    loadScript('content/content.js');
  });

  describe('message listener', () => {
    test('init captures selection and returns DOM reference model', () => {
      const response = capturedMessageListener({ action: 'init' }, sender, sendResponse);

      expect(window.getSelection).toHaveBeenCalled();
      expect(global.Find.Content.Parser.buildDOMReferenceObject).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({
        model: { title: 'test', bodyUUID: 'uuid-body' }
      });
      expect(response).toBe(true);
    });

    test('fetch returns stored state and iframe count', () => {
      // Simulate prior state set by an 'update' message
      capturedMessageListener(
        {
          action: 'update',
          regex: '\\d+',
          index: 3,
          occurrenceMap: {},
          options: {}
        },
        sender,
        () => { }
      );

      const response = capturedMessageListener({ action: 'fetch' }, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        regex: '\\d+',
        index: 3,
        selection: null, // selection is only set on 'init'
        iframes: 2
      });
      expect(response).toBe(true);
    });

    test('restore clears selection and calls Parser.restoreWebPage', () => {
      // First init to set selection
      capturedMessageListener({ action: 'init' }, sender, () => { });

      const uuids = ['uuid-1', 'uuid-2'];
      const response = capturedMessageListener({ action: 'restore', uuids }, sender, () => { });

      expect(global.Find.Content.Parser.restoreWebPage).toHaveBeenCalledWith(uuids);
      expect(response).toBe(false);
    });
  });

  describe('highlighter actions', () => {
    test('update stores regex/index and calls highlightAll + seekHighlight', () => {
      const occurrenceMap = { 1: [10, 20] };
      const regex = 'test';
      const index = 0;
      const options = { matchCase: true };

      capturedMessageListener(
        {
          action: 'update',
          occurrenceMap,
          regex,
          index,
          options
        },
        sender,
        () => { }
      );

      expect(global.Find.Content.Highlighter.restore).toHaveBeenCalled();
      expect(global.Find.Content.Highlighter.highlightAll).toHaveBeenCalledWith(
        occurrenceMap,
        regex,
        options
      );
      expect(global.Find.Content.Highlighter.seekHighlight).toHaveBeenCalledWith(index, options);
    });

    test('seek updates index and calls seekHighlight', () => {
      const index = 2;
      const options = { matchCase: false };

      capturedMessageListener(
        {
          action: 'seek',
          index,
          options
        },
        sender,
        () => { }
      );

      expect(global.Find.Content.Highlighter.seekHighlight).toHaveBeenCalledWith(index, options);
    });

    test('highlight_restore calls Highlighter.restore', () => {
      capturedMessageListener({ action: 'highlight_restore' }, sender, () => { });

      expect(global.Find.Content.Highlighter.restore).toHaveBeenCalled();
    });

    test('replace calls Highlighter.replace with index and replaceWith', () => {
      const index = 1;
      const replaceWith = 'replacement';

      capturedMessageListener(
        {
          action: 'replace',
          index,
          replaceWith
        },
        sender,
        () => { }
      );

      expect(global.Find.Content.Highlighter.replace).toHaveBeenCalledWith(index, replaceWith);
    });

    test('replace_all calls Highlighter.replaceAll', () => {
      const replaceWith = 'global-replacement';

      capturedMessageListener(
        {
          action: 'replace_all',
          replaceWith
        },
        sender,
        () => { }
      );

      expect(global.Find.Content.Highlighter.replaceAll).toHaveBeenCalledWith(replaceWith);
    });

    test('follow_link calls Highlighter.followLinkUnderFocus', () => {
      capturedMessageListener({ action: 'follow_link' }, sender, () => { });

      expect(global.Find.Content.Highlighter.followLinkUnderFocus).toHaveBeenCalled();
    });
  });
});

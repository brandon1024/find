/**
 * Regression tests for popup/js/background-proxy.js.
 *
 * Popup.BackgroundProxy opens a runtime port to the background script at
 * Find.register() time, and routes incoming port messages to Popup.BrowserAction
 * methods based on `response.action`. The port and its onMessage listener are
 * captured via mocked Find.browser.runtime.connect()/port.onMessage.addListener().
 */

const fs = require('fs');
const path = require('path');

function loadScript(relativePath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  // eslint-disable-next-line no-eval
  eval(code);
}

describe('Popup.BackgroundProxy', () => {
  let BackgroundProxy;
  let mockPort;
  let capturedMessageHandler;

  beforeEach(() => {
    jest.resetModules();
    delete global.Find;
    require('../test/mock-extension-apis.js');

    capturedMessageHandler = null;

    mockPort = {
      postMessage: jest.fn(),
      disconnect: jest.fn(),
      onMessage: {
        addListener: jest.fn((cb) => { capturedMessageHandler = cb; })
      }
    };

    global.Find.browser.runtime.connect = jest.fn(() => mockPort);

    global.Find.Popup = {
      BrowserAction: {
        showInstallUpdateDetails: jest.fn(),
        startExtension: jest.fn(),
        updateIndex: jest.fn(),
        copyTextToClipboard: jest.fn(),
        updateSearch: jest.fn(),
        closeExtension: jest.fn(),
        error: jest.fn()
      }
    };

    loadScript('popup/js/background-proxy.js');
    BackgroundProxy = global.Find.Popup.BackgroundProxy;
  });

  test('connects to the background script under the expected port name at load time', () => {
    expect(global.Find.browser.runtime.connect).toHaveBeenCalledWith({
      name: 'popup_to_background_port'
    });
  });

  describe('openConnection', () => {
    test('registers a message listener on the port', () => {
      BackgroundProxy.openConnection();

      expect(mockPort.onMessage.addListener).toHaveBeenCalledWith(expect.any(Function));
      expect(capturedMessageHandler).not.toBeNull();
    });
  });

  describe('closeConnection', () => {
    test('disconnects the port', () => {
      BackgroundProxy.closeConnection();

      expect(mockPort.disconnect).toHaveBeenCalled();
    });
  });

  describe('postMessage', () => {
    test('forwards the message to the port', () => {
      const message = { action: 'update', regex: 'test' };

      BackgroundProxy.postMessage(message);

      expect(mockPort.postMessage).toHaveBeenCalledWith(message);
    });
  });

  describe('message routing', () => {
    beforeEach(() => {
      BackgroundProxy.openConnection();
    });

    test('"install" routes to BrowserAction.showInstallUpdateDetails with the details payload', () => {
      const details = { version: '2.1.1', reason: 'update' };
      capturedMessageHandler({ action: 'install', details });

      expect(global.Find.Popup.BrowserAction.showInstallUpdateDetails).toHaveBeenCalledWith(details);
    });

    test('"browser_action_init" routes to BrowserAction.startExtension with the response payload', () => {
      const response = { regex: 'foo', index: 1 };
      capturedMessageHandler({ action: 'browser_action_init', response });

      expect(global.Find.Popup.BrowserAction.startExtension).toHaveBeenCalledWith(response);
    });

    test('"index_update" routes to BrowserAction.updateIndex with index and total', () => {
      capturedMessageHandler({ action: 'index_update', index: 2, total: 5 });

      expect(global.Find.Popup.BrowserAction.updateIndex).toHaveBeenCalledWith(2, 5);
    });

    test('"get_occurrence" routes to BrowserAction.copyTextToClipboard with the response payload', () => {
      const response = 'matched text';
      capturedMessageHandler({ action: 'get_occurrence', response });

      expect(global.Find.Popup.BrowserAction.copyTextToClipboard).toHaveBeenCalledWith(response);
    });

    test('"invalidate" routes to BrowserAction.updateSearch with no arguments', () => {
      capturedMessageHandler({ action: 'invalidate' });

      expect(global.Find.Popup.BrowserAction.updateSearch).toHaveBeenCalledWith();
    });

    test('"close" routes to BrowserAction.closeExtension', () => {
      capturedMessageHandler({ action: 'close' });

      expect(global.Find.Popup.BrowserAction.closeExtension).toHaveBeenCalled();
    });

    test('"empty_regex" falls through to BrowserAction.error with the action name', () => {
      capturedMessageHandler({ action: 'empty_regex' });

      expect(global.Find.Popup.BrowserAction.error).toHaveBeenCalledWith('empty_regex');
    });

    test('"invalid_regex" falls through to BrowserAction.error with the action name', () => {
      capturedMessageHandler({ action: 'invalid_regex' });

      expect(global.Find.Popup.BrowserAction.error).toHaveBeenCalledWith('invalid_regex');
    });

    test('an unrecognized action falls through to the default BrowserAction.error handler', () => {
      capturedMessageHandler({ action: 'totally_unknown_action' });

      expect(global.Find.Popup.BrowserAction.error).toHaveBeenCalledWith('totally_unknown_action');
    });
  });
});
/**
 * Regression tests for popup/js/storage.js.
 *
 * Popup.Storage is a thin, lockable facade over Find.browser.storage.local.
 * When locked, reads short-circuit to null and writes are no-ops (but still
 * invoke the optional callback). Find.browser.storage.local.get/set/clear are
 * mocked; only storage.js itself is loaded via eval.
 */

const fs = require('fs');
const path = require('path');

function loadScript(relativePath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  // eslint-disable-next-line no-eval
  eval(code);
}

describe('Popup.Storage', () => {
  let Storage;

  beforeEach(() => {
    jest.resetModules();
    delete global.Find;
    require('../test/mock-extension-apis.js');

    global.Find.browser.storage.local.get = jest.fn();
    global.Find.browser.storage.local.set = jest.fn((payload, cb) => { if (cb) cb(); });
    global.Find.browser.storage.local.clear = jest.fn((cb) => { if (cb) cb(); });

    loadScript('popup/js/storage.js');
    Storage = global.Find.Popup.Storage;
  });

  describe('retrieveSavedExpressions', () => {
    test('reads from the "expressions" key and passes the value to the callback', () => {
      global.Find.browser.storage.local.get.mockImplementation((key, cb) => cb({ expressions: ['a', 'b'] }));

      const callback = jest.fn();
      Storage.retrieveSavedExpressions(callback);

      expect(global.Find.browser.storage.local.get).toHaveBeenCalledWith('expressions', expect.any(Function));
      expect(callback).toHaveBeenCalledWith(['a', 'b']);
    });

    test('returns null immediately without touching storage when locked', () => {
      Storage.lockStorage(true);

      const callback = jest.fn();
      Storage.retrieveSavedExpressions(callback);

      expect(global.Find.browser.storage.local.get).not.toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(null);
    });
  });

  describe('retrieveOptions', () => {
    test('reads from the "options" key and passes the value to the callback', () => {
      global.Find.browser.storage.local.get.mockImplementation((key, cb) => cb({ options: { match_case: true } }));

      const callback = jest.fn();
      Storage.retrieveOptions(callback);

      expect(global.Find.browser.storage.local.get).toHaveBeenCalledWith('options', expect.any(Function));
      expect(callback).toHaveBeenCalledWith({ match_case: true });
    });

    test('returns null immediately without touching storage when locked', () => {
      Storage.lockStorage(true);

      const callback = jest.fn();
      Storage.retrieveOptions(callback);

      expect(global.Find.browser.storage.local.get).not.toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(null);
    });
  });

  describe('retrieveHistory', () => {
    test('reads from the "history" key and passes the value to the callback', () => {
      global.Find.browser.storage.local.get.mockImplementation((key, cb) => cb({ history: { 'example.com': {} } }));

      const callback = jest.fn();
      Storage.retrieveHistory(callback);

      expect(global.Find.browser.storage.local.get).toHaveBeenCalledWith('history', expect.any(Function));
      expect(callback).toHaveBeenCalledWith({ 'example.com': {} });
    });

    test('returns null immediately without touching storage when locked', () => {
      Storage.lockStorage(true);

      const callback = jest.fn();
      Storage.retrieveHistory(callback);

      expect(global.Find.browser.storage.local.get).not.toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(null);
    });

    test('passes undefined to the callback when the key does not exist in storage', () => {
      global.Find.browser.storage.local.get.mockImplementation((key, cb) => cb({}));

      const callback = jest.fn();
      Storage.retrieveHistory(callback);

      expect(callback).toHaveBeenCalledWith(undefined);
    });
  });

  describe('saveExpressions', () => {
    test('writes the data under the "expressions" key', () => {
      const data = ['quick', 'brown'];
      const callback = jest.fn();

      Storage.saveExpressions(data, callback);

      expect(global.Find.browser.storage.local.set).toHaveBeenCalledWith({ expressions: data }, callback);
    });

    test('is a no-op that still invokes the callback when storage is locked', () => {
      Storage.lockStorage(true);
      const callback = jest.fn();

      Storage.saveExpressions(['quick'], callback);

      expect(global.Find.browser.storage.local.set).not.toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });

    test('does not throw when locked and no callback is provided', () => {
      Storage.lockStorage(true);

      expect(() => Storage.saveExpressions(['quick'])).not.toThrow();
    });
  });

  describe('saveOptions', () => {
    test('writes the data under the "options" key', () => {
      const data = { match_case: false };
      const callback = jest.fn();

      Storage.saveOptions(data, callback);

      expect(global.Find.browser.storage.local.set).toHaveBeenCalledWith({ options: data }, callback);
    });

    test('is a no-op that still invokes the callback when storage is locked', () => {
      Storage.lockStorage(true);
      const callback = jest.fn();

      Storage.saveOptions({ match_case: false }, callback);

      expect(global.Find.browser.storage.local.set).not.toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });

    test('does not persist options when locked, even without a callback', () => {
      Storage.lockStorage(true);

      Storage.saveOptions({ match_case: false });

      expect(global.Find.browser.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('saveHistory', () => {
    test('writes the data under the "history" key', () => {
      const data = { 'example.com': { expression: 'quick', timestamp: 123 } };
      const callback = jest.fn();

      Storage.saveHistory(data, callback);

      expect(global.Find.browser.storage.local.set).toHaveBeenCalledWith({ history: data }, callback);
    });

    test('is a no-op that still invokes the callback when storage is locked', () => {
      Storage.lockStorage(true);
      const callback = jest.fn();

      Storage.saveHistory({}, callback);

      expect(global.Find.browser.storage.local.set).not.toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('clearStorage', () => {
    test('clears the underlying browser storage and forwards the callback', () => {
      const callback = jest.fn();

      Storage.clearStorage(callback);

      expect(global.Find.browser.storage.local.clear).toHaveBeenCalledWith(callback);
    });

    test('clearing is unaffected by the lock state', () => {
      Storage.lockStorage(true);
      const callback = jest.fn();

      Storage.clearStorage(callback);

      expect(global.Find.browser.storage.local.clear).toHaveBeenCalledWith(callback);
    });
  });

  describe('lockStorage / isStorageLocked', () => {
    test('storage is unlocked by default', () => {
      expect(Storage.isStorageLocked()).toBe(false);
    });

    test('lockStorage(true) locks the storage', () => {
      Storage.lockStorage(true);

      expect(Storage.isStorageLocked()).toBe(true);
    });

    test('lockStorage(false) unlocks the storage', () => {
      Storage.lockStorage(true);
      Storage.lockStorage(false);

      expect(Storage.isStorageLocked()).toBe(false);
    });

    test('reads and writes succeed again once unlocked', () => {
      Storage.lockStorage(true);
      Storage.lockStorage(false);

      global.Find.browser.storage.local.get.mockImplementation((key, cb) => cb({ options: { match_case: true } }));
      const callback = jest.fn();
      Storage.retrieveOptions(callback);

      expect(global.Find.browser.storage.local.get).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith({ match_case: true });
    });
  });
});

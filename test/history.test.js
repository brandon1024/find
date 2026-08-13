/**
 * Regression tests for popup/js/history.js.
 *
 * Popup.History is a facade over Find.Popup.Storage that caches per-host search
 * history in memory (`cachedHistory`) and prunes entries beyond 100 hosts by
 * oldest timestamp. Find.Popup.Storage.retrieveHistory/saveHistory are mocked;
 * only history.js itself is loaded via eval.
 */

const fs = require('fs');
const path = require('path');

function loadScript(relativePath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  // eslint-disable-next-line no-eval
  eval(code);
}

describe('Popup.History', () => {
  let History;

  beforeEach(() => {
    jest.resetModules();
    delete global.Find;
    require('../test/mock-extension-apis.js');

    global.Find.Popup = {
      Storage: {
        retrieveHistory: jest.fn(),
        saveHistory: jest.fn()
      }
    };

    loadScript('popup/js/history.js');
    History = global.Find.Popup.History;
  });

  describe('retrieveForHost', () => {
    test('calls back with no argument when the hostname has not been set', () => {
      const callback = jest.fn();

      History.retrieveForHost(callback);

      expect(callback).toHaveBeenCalledWith();
      expect(global.Find.Popup.Storage.retrieveHistory).not.toHaveBeenCalled();
    });

    test('calls back with the stored expression when history exists for the host', () => {
      History.setHostname('example.com');
      global.Find.Popup.Storage.retrieveHistory.mockImplementation((cb) => {
        cb({ 'example.com': { expression: 'quick', timestamp: 123 } });
      });

      const callback = jest.fn();
      History.retrieveForHost(callback);

      expect(callback).toHaveBeenCalledWith('quick');
    });

    test('calls back with null when no history entry exists for the host', () => {
      History.setHostname('example.com');
      global.Find.Popup.Storage.retrieveHistory.mockImplementation((cb) => {
        cb({ 'other.com': { expression: 'quick', timestamp: 123 } });
      });

      const callback = jest.fn();
      History.retrieveForHost(callback);

      expect(callback).toHaveBeenCalledWith(null);
    });

    test('calls back with null when there is no history data at all', () => {
      History.setHostname('example.com');
      global.Find.Popup.Storage.retrieveHistory.mockImplementation((cb) => cb(null));

      const callback = jest.fn();
      History.retrieveForHost(callback);

      expect(callback).toHaveBeenCalledWith(null);
    });
  });

  describe('saveForHost', () => {
    test('invokes the callback without fetching storage when the hostname has not been set', () => {
      const callback = jest.fn();

      History.saveForHost('quick', callback);

      expect(callback).toHaveBeenCalledWith();
      expect(global.Find.Popup.Storage.retrieveHistory).not.toHaveBeenCalled();
      expect(global.Find.Popup.Storage.saveHistory).not.toHaveBeenCalled();
    });

    test('does not throw when no callback is provided and the hostname has not been set', () => {
      expect(() => History.saveForHost('quick')).not.toThrow();
    });

    test('fetches from storage on first save and caches the result', () => {
      History.setHostname('example.com');
      global.Find.Popup.Storage.retrieveHistory.mockImplementation((cb) => cb(null));
      global.Find.Popup.Storage.saveHistory.mockImplementation((history, cb) => cb());

      const callback = jest.fn();
      History.saveForHost('quick', callback);

      expect(global.Find.Popup.Storage.retrieveHistory).toHaveBeenCalled();
      expect(global.Find.Popup.Storage.saveHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          'example.com': expect.objectContaining({ expression: 'quick' })
        }),
        expect.any(Function)
      );
      expect(callback).toHaveBeenCalled();
    });

    test('builds a fresh history object when none previously existed in storage', () => {
      History.setHostname('example.com');
      global.Find.Popup.Storage.retrieveHistory.mockImplementation((cb) => cb(undefined));
      global.Find.Popup.Storage.saveHistory.mockImplementation((history, cb) => cb());

      History.saveForHost('quick');

      const savedHistory = global.Find.Popup.Storage.saveHistory.mock.calls[0][0];
      expect(Object.keys(savedHistory)).toEqual(['example.com']);
    });

    test('uses the in-memory cache on subsequent saves, skipping retrieveHistory', () => {
      History.setHostname('example.com');
      global.Find.Popup.Storage.retrieveHistory.mockImplementation((cb) => cb(null));
      global.Find.Popup.Storage.saveHistory.mockImplementation((history, cb) => cb());

      History.saveForHost('first query');
      global.Find.Popup.Storage.retrieveHistory.mockClear();
      global.Find.Popup.Storage.saveHistory.mockClear();

      History.saveForHost('second query');

      expect(global.Find.Popup.Storage.retrieveHistory).not.toHaveBeenCalled();
      expect(global.Find.Popup.Storage.saveHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          'example.com': expect.objectContaining({ expression: 'second query' })
        }),
        expect.any(Function)
      );
    });

    test('overwrites the cached entry for the current host rather than duplicating it', () => {
      History.setHostname('example.com');
      global.Find.Popup.Storage.retrieveHistory.mockImplementation((cb) => cb(null));
      global.Find.Popup.Storage.saveHistory.mockImplementation((history, cb) => cb());

      History.saveForHost('first query');
      History.saveForHost('second query');

      const savedHistory = global.Find.Popup.Storage.saveHistory.mock.calls[1][0];
      expect(Object.keys(savedHistory).length).toBe(1);
      expect(savedHistory['example.com'].expression).toBe('second query');
    });

    test('does not prune when 100 or fewer host entries exist', () => {
      History.setHostname('example.com');
      const existingHistory = {};
      for (let i = 0; i < 99; i++) {
        existingHistory[`host${i}.com`] = { expression: 'x', timestamp: i };
      }

      global.Find.Popup.Storage.retrieveHistory.mockImplementation((cb) => cb(existingHistory));
      global.Find.Popup.Storage.saveHistory.mockImplementation((history, cb) => cb());

      History.saveForHost('quick');

      const savedHistory = global.Find.Popup.Storage.saveHistory.mock.calls[0][0];
      expect(Object.keys(savedHistory).length).toBe(100);
    });

    test('prunes the oldest entries when more than 100 host entries exist', () => {
      History.setHostname('newest.com');
      const existingHistory = {};
      for (let i = 0; i < 100; i++) {
        existingHistory[`host${i}.com`] = { expression: 'x', timestamp: i };
      }

      global.Find.Popup.Storage.retrieveHistory.mockImplementation((cb) => cb(existingHistory));
      global.Find.Popup.Storage.saveHistory.mockImplementation((history, cb) => cb());

      History.saveForHost('quick');

      const savedHistory = global.Find.Popup.Storage.saveHistory.mock.calls[0][0];
      expect(Object.keys(savedHistory).length).toBe(100);
      // the oldest entry (host0.com, timestamp 0) should have been pruned
      expect(savedHistory['host0.com']).toBeUndefined();
      expect(savedHistory['newest.com']).toBeDefined();
    });

    test('invokes a default no-op callback without throwing when none is provided', () => {
      History.setHostname('example.com');
      global.Find.Popup.Storage.retrieveHistory.mockImplementation((cb) => cb(null));
      global.Find.Popup.Storage.saveHistory.mockImplementation((history, cb) => cb());

      expect(() => History.saveForHost('quick')).not.toThrow();
    });
  });
});

/**
 * Minimal browser/chrome extension API mock for use with Jest's setupFiles.
 * Extend the stubbed methods here as your tests need more coverage.
 * Uses jest.fn() so call assertions (toHaveBeenCalledWith, etc.) work out of the box.
 * */

const browserMock = {
  storage: {
    local: {
      get: jest.fn((key, callback) => callback({})),
      set: jest.fn((data, callback) => callback && callback())
    }
  },
  tabs: {
    query: jest.fn((queryInfo, callback) => callback([])),
    create: jest.fn(),
    get: jest.fn()
  },
  runtime: {
    getURL: jest.fn((path) => `chrome-extension://mock-id/${path}`),
    getManifest: jest.fn(() => ({ content_scripts: [{ js: [] }] })),
    onInstalled: { addListener: jest.fn() },
    sendMessage: jest.fn()
  },
  contextMenus: {
    removeAll: jest.fn((callback) => callback && callback()),
    create: jest.fn(),
    onClicked: { addListener: jest.fn() }
  },
  i18n: {
    getMessage: jest.fn((key) => key)
  }
};

global.Find = {
  browser: browserMock,
  browserId: 'Chrome',
  register: (path, callback) => {
    const pathKeys = path.split('.');
    let parent = global.Find;

    for (let keyIndex = 0; keyIndex < pathKeys.length; keyIndex++) {
      const key = pathKeys[keyIndex];
      if (typeof parent[key] === 'undefined') {
        parent[key] = {};
      }
      parent = parent[key];
    }

    callback(parent);
    return parent;
  }
};

/**
 * encode/decode are declared as globals in .eslintrc.json (varsIgnorePattern
 * includes "encode" and "decode"), backed at runtime by lib/html-entity-handler.
 * These are minimal, real HTML-entity implementations (not identity stubs) so
 * tests exercise realistic behavior for text containing &, <, >, etc.
 * @param {string} str - The string to encode or decode.
 * @returns {string} - The encoded or decoded string.
 * */
global.encode = (str) => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

global.decode = (str) => String(str)
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>');

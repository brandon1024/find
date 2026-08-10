/**
 * Regression tests for popup/js/i18n.js.
 *
 * Popup.i18n.init() walks the DOM for elements with data-locale-title,
 * data-locale-placeholder, and data-locale-text attributes, and replaces their
 * title/placeholder/innerText with a localized string looked up via
 * Find.browser.i18n.getMessage().
 *
 * Per project convention, assert on `.innerText` directly (not `.textContent`) -
 * jsdom does not propagate innerText writes to textContent.
 */

const fs = require('fs');
const path = require('path');

function loadScript(relativePath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  // eslint-disable-next-line no-eval
  eval(code);
}

describe('Popup.i18n', () => {
  let i18n;

  beforeEach(() => {
    jest.resetModules();
    delete global.Find;
    require('../test/mock-extension-apis.js');

    document.body.innerHTML = '';

    global.Find.browser.i18n = {
      getMessage: jest.fn((key) => `localized:${key}`)
    };

    loadScript('popup/js/i18n.js');
    i18n = global.Find.Popup.i18n;
  });

  describe('getLocalizedString', () => {
    test('delegates to Find.browser.i18n.getMessage with the given key', () => {
      const result = i18n.getLocalizedString('search_placeholder');

      expect(global.Find.browser.i18n.getMessage).toHaveBeenCalledWith('search_placeholder');
      expect(result).toBe('localized:search_placeholder');
    });
  });

  describe('init', () => {
    test('sets the title attribute for elements with data-locale-title', () => {
      document.body.innerHTML = '<button data-locale-title="close_button_title"></button>';

      i18n.init();

      const el = document.querySelector('button');
      expect(el.title).toBe('localized:close_button_title');
    });

    test('sets the placeholder attribute for elements with data-locale-placeholder', () => {
      document.body.innerHTML = '<input data-locale-placeholder="search_placeholder" />';

      i18n.init();

      const el = document.querySelector('input');
      expect(el.placeholder).toBe('localized:search_placeholder');
    });

    test('sets innerText for elements with data-locale-text', () => {
      document.body.innerHTML = '<span data-locale-text="no_results_label"></span>';

      i18n.init();

      const el = document.querySelector('span');
      expect(el.innerText).toBe('localized:no_results_label');
    });

    test('handles multiple elements of the same locale attribute type', () => {
      document.body.innerHTML = `
        <button data-locale-title="title_one"></button>
        <button data-locale-title="title_two"></button>
      `;

      i18n.init();

      const buttons = document.querySelectorAll('button');
      expect(buttons[0].title).toBe('localized:title_one');
      expect(buttons[1].title).toBe('localized:title_two');
    });

    test('handles all three locale attribute types simultaneously', () => {
      document.body.innerHTML = `
        <button data-locale-title="btn_title"></button>
        <input data-locale-placeholder="input_placeholder" />
        <span data-locale-text="span_text"></span>
      `;

      i18n.init();

      expect(document.querySelector('button').title).toBe('localized:btn_title');
      expect(document.querySelector('input').placeholder).toBe('localized:input_placeholder');
      expect(document.querySelector('span').innerText).toBe('localized:span_text');
    });

    test('does nothing when no localizable elements are present', () => {
      document.body.innerHTML = '<div>static content</div>';

      expect(() => i18n.init()).not.toThrow();
      expect(global.Find.browser.i18n.getMessage).not.toHaveBeenCalled();
    });

    test('uses the dataset key derived from the data-locale-title attribute', () => {
      document.body.innerHTML = '<div data-locale-title="my_custom_key"></div>';

      i18n.init();

      expect(global.Find.browser.i18n.getMessage).toHaveBeenCalledWith('my_custom_key');
    });
  });
});
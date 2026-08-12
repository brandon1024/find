/**
 * Regression tests for popup/js/options-pane.js.
 *
 * Popup.OptionsPane.init() wires up a large number of DOM control listeners
 * (toggles, sliders, hex fields) against an in-memory `options` object, and
 * persists changes via Find.Popup.Storage. SimpleColor and its HSV/RGB/hex
 * conversion helpers are private (not exposed on `self`), so they are
 * exercised indirectly through the color slider/hex-field listeners.
 *
 * Uses jsdom's real DOM. All required DOM elements are built in beforeEach
 * since init() reads them synchronously via getElementById.
 */

const fs = require('fs');
const path = require('path');

function loadScript(relativePath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  // eslint-disable-next-line no-eval
  eval(code);
}

function fireChange(id, checkedOrValue) {
  const el = document.getElementById(id);
  if (typeof checkedOrValue === 'boolean') {
    el.checked = checkedOrValue;
  } else {
    el.value = checkedOrValue;
  }
  el.dispatchEvent(new window.Event('change', { bubbles: true }));
}

function fireInputEvent(id, value) {
  const el = document.getElementById(id);
  el.value = value;
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
}

function buildOptionsPaneDOM() {
  document.body.innerHTML = `
    <div id="options-body" style="display: none;"></div>

    <input type="checkbox" id="regex-option-regex-disable-toggle" />
    <input type="checkbox" id="regex-option-case-insensitive-toggle" />
    <input type="checkbox" id="regex-option-persistent-highlights-toggle" />
    <input type="checkbox" id="regex-option-persistent-storage-incognito-toggle" />
    <input type="checkbox" id="hide-option-pane-toggle-option-toggle" />
    <input type="checkbox" id="hide-saved-expressions-pane-toggle-option-toggle" />
    <input type="checkbox" id="hide-copy-to-clipboard-option-toggle" />
    <input type="checkbox" id="find-replace-toggle-option-toggle" />
    <input type="checkbox" id="scroll-markers-enable-toggle" />

    <input type="range" id="max-results-slider" min="0" max="10" />
    <span id="max-results-slider-value"></span>

    <input type="range" id="index-highlight-hue-slider" min="0" max="360" />
    <input type="range" id="index-highlight-saturation-slider" min="0" max="1" step="0.01" />
    <input type="range" id="index-highlight-value-slider" min="0" max="1" step="0.01" />
    <div id="index-highlight-color-value" contenteditable="true"></div>
    <div id="index-highlight-color-indicator"></div>

    <input type="range" id="all-highlight-hue-slider" min="0" max="360" />
    <input type="range" id="all-highlight-saturation-slider" min="0" max="1" step="0.01" />
    <input type="range" id="all-highlight-value-slider" min="0" max="1" step="0.01" />
    <div id="all-highlight-color-value" contenteditable="true"></div>
    <div id="all-highlight-color-indicator"></div>

    <button id="reset-options-button"></button>
  `;
}

describe('Popup.OptionsPane', () => {
  let OptionsPane;

  beforeEach(() => {
    jest.resetModules();
    delete global.Find;
    require('../test/mock-extension-apis.js');

    buildOptionsPaneDOM();

    global.Find.incognito = false;

    global.Find.Popup = {
      Storage: {
        retrieveOptions: jest.fn((cb) => cb(null)),
        saveOptions: jest.fn(),
        lockStorage: jest.fn()
      },
      BrowserAction: {
        updateSearch: jest.fn()
      },
      SearchPane: {
        hideOptionsPaneToggleButton: jest.fn(),
        hideSavedExpressionsPaneToggleButton: jest.fn(),
        hideCopyOccurrencesToClipboardButton: jest.fn(),
        hideFindReplacePaneToggleButton: jest.fn()
      }
    };

    loadScript('popup/js/options-pane.js');
    OptionsPane = global.Find.Popup.OptionsPane;
  });

  describe('init', () => {
    test('retrieves stored options and applies them to the toggle controls', () => {
      global.Find.Popup.Storage.retrieveOptions.mockImplementation((cb) => cb({
        findByRegex: false,
        matchCase: false,
        persistentHighlights: true
      }));

      OptionsPane.init();

      expect(document.getElementById('regex-option-regex-disable-toggle').checked).toBe(false);
      expect(document.getElementById('regex-option-case-insensitive-toggle').checked).toBe(false);
      expect(document.getElementById('regex-option-persistent-highlights-toggle').checked).toBe(true);
    });

    test('fills in missing fields with defaults when stored options are incomplete', () => {
      global.Find.Popup.Storage.retrieveOptions.mockImplementation((cb) => cb({ matchCase: false }));

      OptionsPane.init();

      // matchCase explicitly overridden
      expect(document.getElementById('regex-option-case-insensitive-toggle').checked).toBe(false);
      // findByRegex falls back to DEFAULT_OPTIONS (true)
      expect(document.getElementById('regex-option-regex-disable-toggle').checked).toBe(true);
    });

    test('saves the adapted options back to storage on load', () => {
      global.Find.Popup.Storage.retrieveOptions.mockImplementation((cb) => cb(null));

      OptionsPane.init();

      expect(global.Find.Popup.Storage.saveOptions).toHaveBeenCalledWith(
        expect.objectContaining({ findByRegex: true, matchCase: true })
      );
    });

    test('locks storage based on persistentStorageIncognito when running in incognito', () => {
      global.Find.incognito = true;
      global.Find.Popup.Storage.retrieveOptions.mockImplementation((cb) => cb({
        persistentStorageIncognito: true
      }));

      OptionsPane.init();

      expect(global.Find.Popup.Storage.lockStorage).toHaveBeenCalledWith(false);
    });

    test('does not touch storage locking when not running in incognito', () => {
      global.Find.incognito = false;

      OptionsPane.init();

      expect(global.Find.Popup.Storage.lockStorage).not.toHaveBeenCalled();
    });

    test('renders the max results slider value as infinity symbol when maxResults is 0', () => {
      global.Find.Popup.Storage.retrieveOptions.mockImplementation((cb) => cb({ maxResults: 0 }));

      OptionsPane.init();

      expect(document.getElementById('max-results-slider-value').innerText).toBe('∞');
    });

    test('renders the max results slider value as a number when maxResults is nonzero', () => {
      global.Find.Popup.Storage.retrieveOptions.mockImplementation((cb) => cb({ maxResults: 50 }));

      OptionsPane.init();

      expect(document.getElementById('max-results-slider-value').innerText).toBe('50');
    });

    test('renders the index and all highlight hex color values from stored options', () => {
      OptionsPane.init();

      expect(document.getElementById('index-highlight-color-value').innerText).toBe('#ff9813');
      expect(document.getElementById('all-highlight-color-value').innerText).toBe('#fff000');
    });
  });

  describe('toggle change listeners', () => {
    beforeEach(() => {
      OptionsPane.init();
      jest.clearAllMocks();
    });

    test('findByRegex toggle saves options and triggers a search update', () => {
      fireChange('regex-option-regex-disable-toggle', false);

      expect(global.Find.Popup.Storage.saveOptions).toHaveBeenCalledWith(
        expect.objectContaining({ findByRegex: false })
      );
      expect(global.Find.Popup.BrowserAction.updateSearch).toHaveBeenCalled();
    });

    test('matchCase toggle saves options and triggers a search update', () => {
      fireChange('regex-option-case-insensitive-toggle', false);

      expect(global.Find.Popup.Storage.saveOptions).toHaveBeenCalledWith(
        expect.objectContaining({ matchCase: false })
      );
      expect(global.Find.Popup.BrowserAction.updateSearch).toHaveBeenCalled();
    });

    test('persistentHighlights toggle saves options and triggers a search update', () => {
      fireChange('regex-option-persistent-highlights-toggle', true);

      expect(global.Find.Popup.Storage.saveOptions).toHaveBeenCalledWith(
        expect.objectContaining({ persistentHighlights: true })
      );
      expect(global.Find.Popup.BrowserAction.updateSearch).toHaveBeenCalled();
    });

    test('persistentStorageIncognito toggle unlocks, saves, then relocks storage', () => {
      fireChange('regex-option-persistent-storage-incognito-toggle', true);

      expect(global.Find.Popup.Storage.lockStorage).toHaveBeenNthCalledWith(1, false);
      expect(global.Find.Popup.Storage.saveOptions).toHaveBeenCalledWith(
        expect.objectContaining({ persistentStorageIncognito: true })
      );
      expect(global.Find.Popup.Storage.lockStorage).toHaveBeenNthCalledWith(2, false);
    });

    test('hideOptionsButton toggle saves options and updates the search pane button visibility', () => {
      fireChange('hide-option-pane-toggle-option-toggle', true);

      expect(global.Find.Popup.Storage.saveOptions).toHaveBeenCalledWith(
        expect.objectContaining({ hideOptionsButton: true })
      );
      expect(global.Find.Popup.SearchPane.hideOptionsPaneToggleButton).toHaveBeenCalledWith(true);
    });

    test('scrollMarkers toggle saves options and triggers a search update', () => {
      fireChange('scroll-markers-enable-toggle', true);

      expect(global.Find.Popup.Storage.saveOptions).toHaveBeenCalledWith(
        expect.objectContaining({ scrollMarkers: true })
      );
      expect(global.Find.Popup.BrowserAction.updateSearch).toHaveBeenCalled();
    });
  });

  describe('max results slider', () => {
    beforeEach(() => {
      OptionsPane.init();
      jest.clearAllMocks();
    });

    test('"change" maps the slider index to the correct maxResults value and persists it', () => {
      fireChange('max-results-slider', '3'); // rangeValues[3] === 50

      expect(global.Find.Popup.Storage.saveOptions).toHaveBeenCalledWith(
        expect.objectContaining({ maxResults: 50 })
      );
      expect(global.Find.Popup.BrowserAction.updateSearch).toHaveBeenCalled();
    });

    test('"input" updates the live preview text without persisting yet', () => {
      fireInputEvent('max-results-slider', '10'); // rangeValues[10] === 0 (infinity)

      expect(document.getElementById('max-results-slider-value').innerText).toBe('∞');
      expect(global.Find.Popup.Storage.saveOptions).not.toHaveBeenCalled();
      expect(global.Find.Popup.BrowserAction.updateSearch).not.toHaveBeenCalled();
    });
  });

  describe('index highlight color controls', () => {
    beforeEach(() => {
      OptionsPane.init();
      jest.clearAllMocks();
    });

    test('changing the hue slider recomputes the hex color and persists it', () => {
      fireChange('index-highlight-hue-slider', '120');

      expect(global.Find.Popup.Storage.saveOptions).toHaveBeenCalled();
      expect(global.Find.Popup.BrowserAction.updateSearch).toHaveBeenCalled();

      const savedOptions = global.Find.Popup.Storage.saveOptions.mock.calls[0][0];
      expect(savedOptions.indexHighlightColor.hue).toBe('120');
      expect(savedOptions.indexHighlightColor.hexColor).toMatch(/^#[0-9a-f]{6}$/);
    });

    test('typing a valid hex code into the hex field updates hue/saturation/value and persists', () => {
      const field = document.getElementById('index-highlight-color-value');
      field.innerText = '#00ff00';
      field.dispatchEvent(new window.Event('input', { bubbles: true }));

      const savedOptions = global.Find.Popup.Storage.saveOptions.mock.calls[0][0];
      expect(savedOptions.indexHighlightColor.hexColor).toBe('#00ff00');
      expect(global.Find.Popup.BrowserAction.updateSearch).toHaveBeenCalled();
    });

    test('typing an invalid hex code into the hex field is ignored', () => {
      const field = document.getElementById('index-highlight-color-value');
      field.innerText = 'not-a-color';
      field.dispatchEvent(new window.Event('input', { bubbles: true }));

      expect(global.Find.Popup.Storage.saveOptions).not.toHaveBeenCalled();
      expect(global.Find.Popup.BrowserAction.updateSearch).not.toHaveBeenCalled();
    });
  });

  describe('all highlight color controls', () => {
    beforeEach(() => {
      OptionsPane.init();
      jest.clearAllMocks();
    });

    test('changing the saturation slider recomputes the hex color and persists it', () => {
      fireChange('all-highlight-saturation-slider', '0.5');

      const savedOptions = global.Find.Popup.Storage.saveOptions.mock.calls[0][0];
      expect(savedOptions.allHighlightColor.saturation).toBe('0.5');
      expect(savedOptions.allHighlightColor.hexColor).toMatch(/^#[0-9a-f]{6}$/);
    });

    test('typing a valid hex code into the hex field updates the stored color', () => {
      const field = document.getElementById('all-highlight-color-value');
      field.innerText = '#123456';
      field.dispatchEvent(new window.Event('input', { bubbles: true }));

      const savedOptions = global.Find.Popup.Storage.saveOptions.mock.calls[0][0];
      expect(savedOptions.allHighlightColor.hexColor).toBe('#123456');
    });
  });

  describe('reset options', () => {
    test('resets options to defaults, re-applies them, saves, and triggers a search update', () => {
      OptionsPane.init();

      fireChange('regex-option-case-insensitive-toggle', false);
      jest.clearAllMocks();

      document.getElementById('reset-options-button').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(document.getElementById('regex-option-case-insensitive-toggle').checked).toBe(true);
      expect(global.Find.Popup.Storage.saveOptions).toHaveBeenCalledWith(
        expect.objectContaining({ matchCase: true, findByRegex: true })
      );
      expect(global.Find.Popup.BrowserAction.updateSearch).toHaveBeenCalled();
    });
  });

  describe('show', () => {
    test('shows the options pane by default when no argument is given', () => {
      OptionsPane.show();

      expect(document.getElementById('options-body').style.display).toBe('inherit');
    });

    test('shows the options pane when true is passed', () => {
      OptionsPane.show(true);

      expect(document.getElementById('options-body').style.display).toBe('inherit');
    });

    test('hides the options pane when false is passed', () => {
      OptionsPane.show(false);

      expect(document.getElementById('options-body').style.display).toBe('none');
    });
  });

  describe('toggle', () => {
    test('shows the pane when it is currently hidden', () => {
      document.getElementById('options-body').style.display = 'none';

      OptionsPane.toggle();

      expect(document.getElementById('options-body').style.display).toBe('inherit');
    });

    test('shows the pane when display is unset (empty string)', () => {
      document.getElementById('options-body').style.display = '';

      OptionsPane.toggle();

      expect(document.getElementById('options-body').style.display).toBe('inherit');
    });

    test('hides the pane when it is currently shown', () => {
      document.getElementById('options-body').style.display = 'inherit';

      OptionsPane.toggle();

      expect(document.getElementById('options-body').style.display).toBe('none');
    });
  });

  describe('getOptions', () => {
    test('returns the current in-memory options object', () => {
      OptionsPane.init();

      const options = OptionsPane.getOptions();

      expect(options).toEqual(expect.objectContaining({
        findByRegex: true,
        matchCase: true,
        maxResults: 0
      }));
    });

    test('reflects changes made via the toggle listeners', () => {
      OptionsPane.init();

      fireChange('regex-option-case-insensitive-toggle', false);

      expect(OptionsPane.getOptions().matchCase).toBe(false);
    });
  });
});

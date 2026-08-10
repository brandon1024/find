/**
 * Regression tests for popup/js/replace-pane.js.
 *
 * Popup.ReplacePane wires click listeners for the replace buttons to
 * Find.Popup.BrowserAction, and exposes simple show/toggle/getters/setters
 * over the replace field and buttons. Uses jsdom's real DOM (Jest's default
 * test environment); Find.Popup.BrowserAction is mocked.
 */

const fs = require('fs');
const path = require('path');

function loadScript(relativePath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  // eslint-disable-next-line no-eval
  eval(code);
}

function buildReplacePaneDOM() {
  document.body.innerHTML = `
    <div id="replace-body" style="display: none;"></div>
    <input type="text" id="replace-field" />
    <button id="replace-next-button"></button>
    <button id="replace-all-button"></button>
  `;
}

describe('Popup.ReplacePane', () => {
  let ReplacePane;

  beforeEach(() => {
    jest.resetModules();
    delete global.Find;
    require('../test/mock-extension-apis.js');

    buildReplacePaneDOM();

    global.Find.Popup = {
      BrowserAction: {
        replaceNext: jest.fn(),
        replaceAll: jest.fn()
      }
    };

    loadScript('popup/js/replace-pane.js');
    ReplacePane = global.Find.Popup.ReplacePane;
  });

  describe('init', () => {
    test('clicking the replace-next button calls BrowserAction.replaceNext', () => {
      ReplacePane.init();

      document.getElementById('replace-next-button').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(global.Find.Popup.BrowserAction.replaceNext).toHaveBeenCalled();
    });

    test('clicking the replace-all button calls BrowserAction.replaceAll', () => {
      ReplacePane.init();

      document.getElementById('replace-all-button').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(global.Find.Popup.BrowserAction.replaceAll).toHaveBeenCalled();
    });
  });

  describe('show', () => {
    test('shows the replace pane by default when no argument is given', () => {
      ReplacePane.show();

      expect(document.getElementById('replace-body').style.display).toBe('inherit');
    });

    test('shows the replace pane when true is passed', () => {
      ReplacePane.show(true);

      expect(document.getElementById('replace-body').style.display).toBe('inherit');
    });

    test('hides the replace pane when false is passed', () => {
      ReplacePane.show(false);

      expect(document.getElementById('replace-body').style.display).toBe('none');
    });
  });

  describe('toggle', () => {
    test('shows the pane when it is currently hidden', () => {
      document.getElementById('replace-body').style.display = 'none';

      ReplacePane.toggle();

      expect(document.getElementById('replace-body').style.display).toBe('inherit');
    });

    test('shows the pane when display is unset (empty string)', () => {
      document.getElementById('replace-body').style.display = '';

      ReplacePane.toggle();

      expect(document.getElementById('replace-body').style.display).toBe('inherit');
    });

    test('hides the pane when it is currently shown', () => {
      document.getElementById('replace-body').style.display = 'inherit';

      ReplacePane.toggle();

      expect(document.getElementById('replace-body').style.display).toBe('none');
    });
  });

  describe('getReplaceFieldText / setReplaceFieldText', () => {
    test('setReplaceFieldText sets the value on the replace field', () => {
      ReplacePane.setReplaceFieldText('replacement text');

      expect(document.getElementById('replace-field').value).toBe('replacement text');
    });

    test('getReplaceFieldText returns the current value of the replace field', () => {
      document.getElementById('replace-field').value = 'existing text';

      expect(ReplacePane.getReplaceFieldText()).toBe('existing text');
    });

    test('getReplaceFieldText reflects a value set via setReplaceFieldText', () => {
      ReplacePane.setReplaceFieldText('round trip');

      expect(ReplacePane.getReplaceFieldText()).toBe('round trip');
    });
  });

  describe('focusSearchField', () => {
    test('focuses the replace field', () => {
      const field = document.getElementById('replace-field');
      const focusSpy = jest.spyOn(field, 'focus');

      ReplacePane.focusSearchField();

      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('selectReplaceField', () => {
    test('selects the text in the replace field', () => {
      const field = document.getElementById('replace-field');
      const selectSpy = jest.spyOn(field, 'select');

      ReplacePane.selectReplaceField();

      expect(selectSpy).toHaveBeenCalled();
    });
  });

  describe('enableButtons', () => {
    test('enables both buttons when called with true', () => {
      ReplacePane.enableButtons(true);

      expect(document.getElementById('replace-next-button').disabled).toBe(false);
      expect(document.getElementById('replace-all-button').disabled).toBe(false);
    });

    test('disables both buttons when called with false', () => {
      ReplacePane.enableButtons(false);

      expect(document.getElementById('replace-next-button').disabled).toBe(true);
      expect(document.getElementById('replace-all-button').disabled).toBe(true);
    });

    test('enables both buttons when called with no argument', () => {
      document.getElementById('replace-next-button').disabled = true;
      document.getElementById('replace-all-button').disabled = true;

      ReplacePane.enableButtons();

      expect(document.getElementById('replace-next-button').disabled).toBe(false);
      expect(document.getElementById('replace-all-button').disabled).toBe(false);
    });
  });
});
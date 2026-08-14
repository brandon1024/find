/**
 * Regression tests for popup/js/search-pane.js.
 *
 * Popup.SearchPane wires keyboard shortcuts and button clicks on the search
 * field to Find.Popup.BrowserAction/ReplacePane/OptionsPane/SavedExpressionsPane,
 * and exposes DOM getters/setters plus timed "flash" notification icons via a
 * private flashElement() helper (not exposed - exercised through the public
 * flash*Icon methods instead).
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

function buildSearchPaneDOM() {
  document.body.innerHTML = `
    <div id="popup-body">
      <input type="text" id="search-field" />
      <button id="search-next-button"></button>
      <button id="search-prev-button"></button>
      <button id="search-toggle-options-button" style="display: initial;"></button>
      <button id="copy-text-to-clipboard-button" style="display: initial;"></button>
      <button id="saved-expressions-toggle-button" style="display: initial;"></button>
      <button id="find-replace-button" style="display: initial;"></button>
      <button id="close-button"></button>
      <span id="index-text"></span>
      <div id="invalid-regex-icon" style="display: none;"></div>
      <div id="offline-file-search-err" style="display: none;"></div>
      <div id="clipboard-copy-icon" style="display: none;"></div>
      <div id="clipboard-copy-error" style="display: none;"></div>
      <div id="iframes-found-icon" style="display: none;"></div>
      <div id="install-information" style="display: none;"></div>
      <div id="update-information" style="display: none;"></div>
    </div>
  `;
}

function fireKeyup(overrides = {}) {
  const event = new window.KeyboardEvent('keyup', { bubbles: true, ...overrides });
  document.getElementById('search-field').dispatchEvent(event);
}

describe('Popup.SearchPane', () => {
  let SearchPane;

  beforeEach(() => {
    jest.resetModules();
    delete global.Find;
    require('../test/mock-extension-apis.js');

    buildSearchPaneDOM();

    global.Find.Popup = {
      BrowserAction: {
        followLink: jest.fn(),
        seekBackwards: jest.fn(),
        seekForwards: jest.fn(),
        closeExtension: jest.fn(),
        getOccurrence: jest.fn(),
        updateSearch: jest.fn()
      },
      ReplacePane: {
        show: jest.fn(),
        toggle: jest.fn()
      },
      SavedExpressionsPane: {
        show: jest.fn(),
        toggle: jest.fn()
      },
      OptionsPane: {
        show: jest.fn(),
        toggle: jest.fn()
      }
    };

    loadScript('popup/js/search-pane.js');
    SearchPane = global.Find.Popup.SearchPane;
  });

  describe('init - search field keyboard shortcuts', () => {
    beforeEach(() => {
      SearchPane.init();
    });

    test('Ctrl+Shift+Enter follows the link under focus', () => {
      fireKeyup({ key: 'Enter', ctrlKey: true, shiftKey: true });

      expect(global.Find.Popup.BrowserAction.followLink).toHaveBeenCalled();
    });

    test('Shift+Enter seeks backwards', () => {
      fireKeyup({ key: 'Enter', shiftKey: true });

      expect(global.Find.Popup.BrowserAction.seekBackwards).toHaveBeenCalled();
    });

    test('Shift+F3 seeks backwards', () => {
      fireKeyup({ key: 'F3', shiftKey: true });

      expect(global.Find.Popup.BrowserAction.seekBackwards).toHaveBeenCalled();
    });

    test('Escape closes the extension', () => {
      fireKeyup({ key: 'Escape' });

      expect(global.Find.Popup.BrowserAction.closeExtension).toHaveBeenCalled();
    });

    test('Ctrl+Enter closes the extension', () => {
      fireKeyup({ key: 'Enter', ctrlKey: true });

      expect(global.Find.Popup.BrowserAction.closeExtension).toHaveBeenCalled();
    });

    test('plain Enter seeks forwards', () => {
      fireKeyup({ key: 'Enter' });

      expect(global.Find.Popup.BrowserAction.seekForwards).toHaveBeenCalled();
    });

    test('plain F3 seeks forwards', () => {
      fireKeyup({ key: 'F3' });

      expect(global.Find.Popup.BrowserAction.seekForwards).toHaveBeenCalled();
    });

    test('Ctrl+Alt+C requests a single occurrence', () => {
      fireKeyup({ ctrlKey: true, altKey: true, code: 'KeyC' });

      expect(global.Find.Popup.BrowserAction.getOccurrence).toHaveBeenCalledWith({ cardinality: 'single' });
    });

    test('Ctrl+Alt+A requests all occurrences', () => {
      fireKeyup({ ctrlKey: true, altKey: true, code: 'KeyA' });

      expect(global.Find.Popup.BrowserAction.getOccurrence).toHaveBeenCalledWith({ cardinality: 'all' });
    });

    test('an unrelated keyup does not trigger any action', () => {
      fireKeyup({ key: 'a' });

      expect(global.Find.Popup.BrowserAction.seekForwards).not.toHaveBeenCalled();
      expect(global.Find.Popup.BrowserAction.seekBackwards).not.toHaveBeenCalled();
      expect(global.Find.Popup.BrowserAction.closeExtension).not.toHaveBeenCalled();
      expect(global.Find.Popup.BrowserAction.followLink).not.toHaveBeenCalled();
      expect(global.Find.Popup.BrowserAction.getOccurrence).not.toHaveBeenCalled();
    });

    test('typing in the search field triggers updateSearch via the input event', () => {
      document.getElementById('search-field').dispatchEvent(new window.Event('input', { bubbles: true }));

      expect(global.Find.Popup.BrowserAction.updateSearch).toHaveBeenCalled();
    });
  });

  describe('init - button click handlers', () => {
    beforeEach(() => {
      SearchPane.init();
    });

    test('search-next-button seeks forwards', () => {
      document.getElementById('search-next-button').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(global.Find.Popup.BrowserAction.seekForwards).toHaveBeenCalled();
    });

    test('search-prev-button seeks backwards', () => {
      document.getElementById('search-prev-button').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(global.Find.Popup.BrowserAction.seekBackwards).toHaveBeenCalled();
    });

    test('search-toggle-options-button hides replace/saved-expressions panes and toggles options', () => {
      document.getElementById('search-toggle-options-button')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(global.Find.Popup.ReplacePane.show).toHaveBeenCalledWith(false);
      expect(global.Find.Popup.SavedExpressionsPane.show).toHaveBeenCalledWith(false);
      expect(global.Find.Popup.OptionsPane.toggle).toHaveBeenCalled();
    });

    test('copy-text-to-clipboard-button requests all occurrences', () => {
      document.getElementById('copy-text-to-clipboard-button')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(global.Find.Popup.BrowserAction.getOccurrence).toHaveBeenCalledWith({ cardinality: 'all' });
    });

    test('saved-expressions-toggle-button hides replace/options panes and toggles saved expressions', () => {
      document.getElementById('saved-expressions-toggle-button')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(global.Find.Popup.ReplacePane.show).toHaveBeenCalledWith(false);
      expect(global.Find.Popup.OptionsPane.show).toHaveBeenCalledWith(false);
      expect(global.Find.Popup.SavedExpressionsPane.toggle).toHaveBeenCalled();
    });

    test('find-replace-button hides saved-expressions/options panes and toggles replace', () => {
      document.getElementById('find-replace-button')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(global.Find.Popup.SavedExpressionsPane.show).toHaveBeenCalledWith(false);
      expect(global.Find.Popup.OptionsPane.show).toHaveBeenCalledWith(false);
      expect(global.Find.Popup.ReplacePane.toggle).toHaveBeenCalled();
    });

    test('close-button closes the extension', () => {
      document.getElementById('close-button').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(global.Find.Popup.BrowserAction.closeExtension).toHaveBeenCalled();
    });
  });

  describe('enableButtons', () => {
    test('enables both buttons when called with true', () => {
      SearchPane.enableButtons(true);

      expect(document.getElementById('search-prev-button').disabled).toBe(false);
      expect(document.getElementById('search-next-button').disabled).toBe(false);
    });

    test('disables both buttons when called with false', () => {
      SearchPane.enableButtons(false);

      expect(document.getElementById('search-prev-button').disabled).toBe(true);
      expect(document.getElementById('search-next-button').disabled).toBe(true);
    });

    test('enables both buttons when called with no argument', () => {
      document.getElementById('search-prev-button').disabled = true;
      document.getElementById('search-next-button').disabled = true;

      SearchPane.enableButtons();

      expect(document.getElementById('search-prev-button').disabled).toBe(false);
      expect(document.getElementById('search-next-button').disabled).toBe(false);
    });
  });

  describe('getSearchFieldText / setSearchFieldText', () => {
    test('setSearchFieldText sets the value on the search field', () => {
      SearchPane.setSearchFieldText('quick brown fox');

      expect(document.getElementById('search-field').value).toBe('quick brown fox');
    });

    test('getSearchFieldText returns the current value of the search field', () => {
      document.getElementById('search-field').value = 'existing text';

      expect(SearchPane.getSearchFieldText()).toBe('existing text');
    });
  });

  describe('focusSearchField / selectSearchField', () => {
    test('focuses the search field', () => {
      const field = document.getElementById('search-field');
      const focusSpy = jest.spyOn(field, 'focus');

      SearchPane.focusSearchField();

      expect(focusSpy).toHaveBeenCalled();
    });

    test('selects the text in the search field', () => {
      const field = document.getElementById('search-field');
      const selectSpy = jest.spyOn(field, 'select');

      SearchPane.selectSearchField();

      expect(selectSpy).toHaveBeenCalled();
    });
  });

  describe('updateIndexText / clearIndexText', () => {
    test('formats small occurrence and count values without separators', () => {
      SearchPane.updateIndexText(1, 5);

      expect(document.getElementById('index-text').innerText).toBe('1 of 5');
    });

    test('formats large values with thousands separators', () => {
      SearchPane.updateIndexText(1234, 98765);

      expect(document.getElementById('index-text').innerText).toBe('1,234 of 98,765');
    });

    test('clearIndexText empties the index text', () => {
      SearchPane.updateIndexText(1, 5);
      SearchPane.clearIndexText();

      expect(document.getElementById('index-text').innerText).toBe('');
    });
  });

  describe('showMalformedRegexIcon / showOfflineFileErrorIcon', () => {
    test('shows the malformed regex icon when flag is true', () => {
      SearchPane.showMalformedRegexIcon(true);

      expect(document.getElementById('invalid-regex-icon').style.display).toBe('initial');
    });

    test('hides the malformed regex icon when flag is false', () => {
      SearchPane.showMalformedRegexIcon(false);

      expect(document.getElementById('invalid-regex-icon').style.display).toBe('none');
    });

    test('shows the offline file error icon when flag is true', () => {
      SearchPane.showOfflineFileErrorIcon(true);

      expect(document.getElementById('offline-file-search-err').style.display).toBe('initial');
    });

    test('hides the offline file error icon when flag is false', () => {
      SearchPane.showOfflineFileErrorIcon(false);

      expect(document.getElementById('offline-file-search-err').style.display).toBe('none');
    });
  });

  describe('flash*Icon methods', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('flashClipboardCopyIcon shows the icon, then hides it after 3 seconds', () => {
      SearchPane.flashClipboardCopyIcon();

      const el = document.getElementById('clipboard-copy-icon');
      expect(el.style.display).toBe('initial');

      jest.advanceTimersByTime(3000);

      expect(el.style.display).toBe('none');
    });

    test('flashClipboardCopyErrorIcon shows the icon, then hides it after 3 seconds', () => {
      SearchPane.flashClipboardCopyErrorIcon();

      const el = document.getElementById('clipboard-copy-error');
      expect(el.style.display).toBe('initial');

      jest.advanceTimersByTime(3000);

      expect(el.style.display).toBe('none');
    });

    test('flashIframesFoundWarningIcon shows the icon, then hides it after 3 seconds', () => {
      SearchPane.flashIframesFoundWarningIcon();

      const el = document.getElementById('iframes-found-icon');
      expect(el.style.display).toBe('initial');

      jest.advanceTimersByTime(3000);

      expect(el.style.display).toBe('none');
    });

    test('flashInstallInformationIcon shows the icon, then hides it after 3 seconds', () => {
      SearchPane.flashInstallInformationIcon();

      const el = document.getElementById('install-information');
      expect(el.style.display).toBe('initial');

      jest.advanceTimersByTime(3000);

      expect(el.style.display).toBe('none');
    });

    test('flashUpdateInformationIcon shows the icon, then hides it after 3 seconds', () => {
      SearchPane.flashUpdateInformationIcon();

      const el = document.getElementById('update-information');
      expect(el.style.display).toBe('initial');

      jest.advanceTimersByTime(3000);

      expect(el.style.display).toBe('none');
    });

    test('hovering the flashed icon resets the auto-hide timer', () => {
      SearchPane.flashClipboardCopyIcon();
      const el = document.getElementById('clipboard-copy-icon');

      jest.advanceTimersByTime(2000);
      el.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
      jest.advanceTimersByTime(2000); // would have hidden by now if not for the hover reset

      expect(el.style.display).toBe('initial');
    });

    test('moving the mouse away after hovering restarts the 3 second countdown', () => {
      SearchPane.flashClipboardCopyIcon();
      const el = document.getElementById('clipboard-copy-icon');

      el.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
      el.dispatchEvent(new window.MouseEvent('mouseout', { bubbles: true }));
      jest.advanceTimersByTime(3000);

      expect(el.style.display).toBe('none');
    });

    test('clicking elsewhere in the popup body immediately dismisses the flashed icon', () => {
      SearchPane.flashClipboardCopyIcon();
      const el = document.getElementById('clipboard-copy-icon');

      document.getElementById('popup-body').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(el.style.display).toBe('none');
    });

    test('clicking the flashed icon itself does not dismiss it', () => {
      SearchPane.flashClipboardCopyIcon();
      const el = document.getElementById('clipboard-copy-icon');

      el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(el.style.display).toBe('initial');
    });
  });

  describe('hide*Button methods', () => {
    test('hideOptionsPaneToggleButton hides the button when true', () => {
      SearchPane.hideOptionsPaneToggleButton(true);

      expect(document.getElementById('search-toggle-options-button').style.display).toBe('none');
    });

    test('hideOptionsPaneToggleButton shows the button when false', () => {
      SearchPane.hideOptionsPaneToggleButton(false);

      expect(document.getElementById('search-toggle-options-button').style.display).toBe('initial');
    });

    test('hideSavedExpressionsPaneToggleButton hides the button when true', () => {
      SearchPane.hideSavedExpressionsPaneToggleButton(true);

      expect(document.getElementById('saved-expressions-toggle-button').style.display).toBe('none');
    });

    test('hideCopyOccurrencesToClipboardButton hides the button when true', () => {
      SearchPane.hideCopyOccurrencesToClipboardButton(true);

      expect(document.getElementById('copy-text-to-clipboard-button').style.display).toBe('none');
    });

    test('hideFindReplacePaneToggleButton hides the button when true', () => {
      SearchPane.hideFindReplacePaneToggleButton(true);

      expect(document.getElementById('find-replace-button').style.display).toBe('none');
    });
  });
});

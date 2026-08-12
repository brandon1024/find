/**
 * Regression tests for popup/js/saved-expressions-pane.js.
 *
 * Popup.SavedExpressionsPane builds/removes DOM entries for saved regex
 * expressions, backed by Find.Popup.Storage. Entry elements are built via a
 * private ElementBuilder helper (not exposed), so structure is verified via
 * the resulting DOM rather than mocking the builder itself.
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

function buildSavedExpressionsPaneDOM() {
  document.body.innerHTML = `
    <div id="saved-expressions-body" style="display: none;"></div>
    <button id="clear-saved-expressions-button"></button>
    <button id="save-expression-entry-button"></button>
    <div id="saved-expressions-entry-list"></div>
  `;
}

function entryTexts() {
  return Array.from(
    document.querySelectorAll('#saved-expressions-entry-list .saved-expression-entry-text')
  )
    .filter((el) => el.id !== 'null-entry-text')
    .map((el) => el.innerText);
}

describe('Popup.SavedExpressionsPane', () => {
  let SavedExpressionsPane;

  beforeEach(() => {
    jest.resetModules();
    delete global.Find;
    require('../test/mock-extension-apis.js');

    buildSavedExpressionsPaneDOM();

    global.Find.Popup = {
      Storage: {
        retrieveSavedExpressions: jest.fn((cb) => cb([])),
        saveExpressions: jest.fn()
      },
      SearchPane: {
        getSearchFieldText: jest.fn(() => ''),
        setSearchFieldText: jest.fn()
      },
      BrowserAction: {
        updateSearch: jest.fn()
      },
      i18n: {
        getLocalizedString: jest.fn((key) => `localized:${key}`)
      }
    };

    loadScript('popup/js/saved-expressions-pane.js');
    SavedExpressionsPane = global.Find.Popup.SavedExpressionsPane;
  });

  describe('init', () => {
    test('renders a null entry when there are no saved expressions', () => {
      global.Find.Popup.Storage.retrieveSavedExpressions.mockImplementation((cb) => cb([]));

      SavedExpressionsPane.init();

      expect(document.getElementById('null-entry')).not.toBeNull();
      expect(document.getElementById('null-entry-text').innerText).toBe('localized:no_expressions_found_text');
    });

    test('renders a null entry when retrieveSavedExpressions returns nothing', () => {
      global.Find.Popup.Storage.retrieveSavedExpressions.mockImplementation((cb) => cb(null));

      SavedExpressionsPane.init();

      expect(document.getElementById('null-entry')).not.toBeNull();
    });

    test('renders one entry per saved expression, in order', () => {
      global.Find.Popup.Storage.retrieveSavedExpressions.mockImplementation((cb) => cb(['first', 'second']));

      SavedExpressionsPane.init();

      expect(entryTexts()).toEqual(['first', 'second']);
      expect(document.getElementById('null-entry')).toBeNull();
    });

    test('sets data-regex on each rendered entry', () => {
      global.Find.Popup.Storage.retrieveSavedExpressions.mockImplementation((cb) => cb(['quick']));

      SavedExpressionsPane.init();

      const entry = document.querySelector('.saved-expression-entry');
      expect(entry.dataset.regex).toBe('quick');
    });

    test('clicking the clear button removes all entries and inserts a null entry', () => {
      global.Find.Popup.Storage.retrieveSavedExpressions.mockImplementation((cb) => cb(['quick']));
      SavedExpressionsPane.init();

      document.getElementById('clear-saved-expressions-button')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(entryTexts()).toEqual([]);
      expect(document.getElementById('null-entry')).not.toBeNull();
      expect(global.Find.Popup.Storage.saveExpressions).toHaveBeenCalledWith([]);
    });

    test('clicking the save button saves the current search field text as a new entry', () => {
      global.Find.Popup.Storage.retrieveSavedExpressions.mockImplementation((cb) => cb([]));
      global.Find.Popup.SearchPane.getSearchFieldText.mockReturnValue('new expr');
      SavedExpressionsPane.init();

      document.getElementById('save-expression-entry-button')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(entryTexts()).toContain('new expr');
    });
  });

  describe('show', () => {
    test('shows the pane by default when no argument is given', () => {
      SavedExpressionsPane.show();

      expect(document.getElementById('saved-expressions-body').style.display).toBe('inherit');
    });

    test('shows the pane when true is passed', () => {
      SavedExpressionsPane.show(true);

      expect(document.getElementById('saved-expressions-body').style.display).toBe('inherit');
    });

    test('hides the pane when false is passed', () => {
      SavedExpressionsPane.show(false);

      expect(document.getElementById('saved-expressions-body').style.display).toBe('none');
    });
  });

  describe('toggle', () => {
    test('shows the pane when it is currently hidden', () => {
      document.getElementById('saved-expressions-body').style.display = 'none';

      SavedExpressionsPane.toggle();

      expect(document.getElementById('saved-expressions-body').style.display).toBe('inherit');
    });

    test('hides the pane when it is currently shown', () => {
      document.getElementById('saved-expressions-body').style.display = 'inherit';

      SavedExpressionsPane.toggle();

      expect(document.getElementById('saved-expressions-body').style.display).toBe('none');
    });
  });

  describe('saveEntry', () => {
    test('does nothing when the search field is empty', () => {
      global.Find.Popup.SearchPane.getSearchFieldText.mockReturnValue('');

      SavedExpressionsPane.saveEntry();

      expect(global.Find.Popup.Storage.retrieveSavedExpressions).not.toHaveBeenCalled();
    });

    test('adds a new entry to the front of the list and persists it', () => {
      global.Find.Popup.SearchPane.getSearchFieldText.mockReturnValue('quick');
      global.Find.Popup.Storage.retrieveSavedExpressions.mockImplementation((cb) => cb([]));

      SavedExpressionsPane.saveEntry();

      expect(global.Find.Popup.Storage.saveExpressions).toHaveBeenCalledWith(['quick']);
      expect(entryTexts()).toEqual(['quick']);
    });

    test('moves an existing entry to the front instead of duplicating it', () => {
      global.Find.Popup.Storage.retrieveSavedExpressions.mockImplementation((cb) => cb(['first', 'second']));
      SavedExpressionsPane.init();

      global.Find.Popup.SearchPane.getSearchFieldText.mockReturnValue('second');
      global.Find.Popup.Storage.retrieveSavedExpressions.mockImplementation((cb) => cb(['first', 'second']));

      SavedExpressionsPane.saveEntry();

      expect(entryTexts()).toEqual(['second', 'first']);
      expect(global.Find.Popup.Storage.saveExpressions).toHaveBeenCalledWith(['second', 'first']);
    });

    test('removes the null entry once a real entry is saved', () => {
      global.Find.Popup.Storage.retrieveSavedExpressions.mockImplementation((cb) => cb([]));
      SavedExpressionsPane.init();
      expect(document.getElementById('null-entry')).not.toBeNull();

      global.Find.Popup.SearchPane.getSearchFieldText.mockReturnValue('quick');
      global.Find.Popup.Storage.retrieveSavedExpressions.mockImplementation((cb) => cb([]));

      SavedExpressionsPane.saveEntry();

      expect(document.getElementById('null-entry')).toBeNull();
    });

    test('using an entry sets the search field, resaves it to the front, and triggers a search', () => {
      global.Find.Popup.Storage.retrieveSavedExpressions.mockImplementation((cb) => cb(['first', 'second']));
      SavedExpressionsPane.init();

      global.Find.Popup.Storage.retrieveSavedExpressions.mockImplementation((cb) => cb(['first', 'second']));
      const secondEntryButton = document.querySelectorAll('.saved-expression-entry-button')[1];
      secondEntryButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(global.Find.Popup.SearchPane.setSearchFieldText).toHaveBeenCalledWith('second');
      expect(global.Find.Popup.BrowserAction.updateSearch).toHaveBeenCalled();
    });
  });

  describe('deleting an entry', () => {
    test('removes the entry from the DOM and persisted storage', () => {
      global.Find.Popup.Storage.retrieveSavedExpressions.mockImplementation((cb) => cb(['first', 'second']));
      SavedExpressionsPane.init();

      global.Find.Popup.Storage.retrieveSavedExpressions.mockImplementation((cb) => cb(['first', 'second']));
      const deleteButtons = document.querySelectorAll('.delete-saved-expression-entry-button');
      deleteButtons[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(entryTexts()).toEqual(['second']);
      expect(global.Find.Popup.Storage.saveExpressions).toHaveBeenCalledWith(['second']);
    });

    test('renders a null entry when the last entry is deleted', () => {
      global.Find.Popup.Storage.retrieveSavedExpressions.mockImplementation((cb) => cb(['only']));
      SavedExpressionsPane.init();

      global.Find.Popup.Storage.retrieveSavedExpressions.mockImplementation((cb) => cb(['only']));
      document.querySelector('.delete-saved-expression-entry-button')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(entryTexts()).toEqual([]);
      expect(document.getElementById('null-entry')).not.toBeNull();
    });
  });

  describe('clearSavedExpressions', () => {
    test('removes all entries, inserts a null entry, and persists an empty list', () => {
      global.Find.Popup.Storage.retrieveSavedExpressions.mockImplementation((cb) => cb(['first', 'second']));
      SavedExpressionsPane.init();

      SavedExpressionsPane.clearSavedExpressions();

      expect(entryTexts()).toEqual([]);
      expect(document.getElementById('null-entry')).not.toBeNull();
      expect(global.Find.Popup.Storage.saveExpressions).toHaveBeenCalledWith([]);
    });
  });
});

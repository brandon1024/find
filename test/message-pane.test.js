/**
 * Regression tests for popup/js/message-pane.js.
 *
 * Popup.MessagePane has three near-identical methods, each showing the shared
 * message body element plus one specific limitation-text element. Uses jsdom's
 * real DOM (Jest's default test environment); no mocking beyond Find.register.
 */

const fs = require('fs');
const path = require('path');

function loadScript(relativePath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  // eslint-disable-next-line no-eval
  eval(code);
}

describe('Popup.MessagePane', () => {
  let MessagePane;

  beforeEach(() => {
    jest.resetModules();
    delete global.Find;
    require('../test/mock-extension-apis.js');

    document.body.innerHTML = `
      <div id="extension-message-body" style="display: none;"></div>
      <div id="extension-limitation-internal-restricted-browser-page-text" style="display: none;"></div>
      <div id="extension-limitation-pdf-fileview-text" style="display: none;"></div>
      <div id="extension-limitation-offline-file-search-text" style="display: none;"></div>
    `;

    loadScript('popup/js/message-pane.js');
    MessagePane = global.Find.Popup.MessagePane;
  });

  describe('showInternalRestrictedBrowserPageErrorMessage', () => {
    test('shows the message body and the internal-restricted-page text', () => {
      MessagePane.showInternalRestrictedBrowserPageErrorMessage();

      expect(document.getElementById('extension-message-body').style.display).toBe('initial');
      expect(
        document.getElementById('extension-limitation-internal-restricted-browser-page-text').style.display
      ).toBe('initial');
    });

    test('does not affect the PDF or offline-file limitation text elements', () => {
      MessagePane.showInternalRestrictedBrowserPageErrorMessage();

      expect(document.getElementById('extension-limitation-pdf-fileview-text').style.display).toBe('none');
      expect(document.getElementById('extension-limitation-offline-file-search-text').style.display).toBe('none');
    });
  });

  describe('showPDFSearchErrorMessage', () => {
    test('shows the message body and the PDF limitation text', () => {
      MessagePane.showPDFSearchErrorMessage();

      expect(document.getElementById('extension-message-body').style.display).toBe('initial');
      expect(document.getElementById('extension-limitation-pdf-fileview-text').style.display).toBe('initial');
    });

    test('does not affect the internal-restricted or offline-file limitation text elements', () => {
      MessagePane.showPDFSearchErrorMessage();

      expect(
        document.getElementById('extension-limitation-internal-restricted-browser-page-text').style.display
      ).toBe('none');
      expect(document.getElementById('extension-limitation-offline-file-search-text').style.display).toBe('none');
    });
  });

  describe('showOfflineFileErrorMessage', () => {
    test('shows the message body and the offline-file limitation text', () => {
      MessagePane.showOfflineFileErrorMessage();

      expect(document.getElementById('extension-message-body').style.display).toBe('initial');
      expect(document.getElementById('extension-limitation-offline-file-search-text').style.display).toBe('initial');
    });

    test('does not affect the internal-restricted or PDF limitation text elements', () => {
      MessagePane.showOfflineFileErrorMessage();

      expect(
        document.getElementById('extension-limitation-internal-restricted-browser-page-text').style.display
      ).toBe('none');
      expect(document.getElementById('extension-limitation-pdf-fileview-text').style.display).toBe('none');
    });
  });
});
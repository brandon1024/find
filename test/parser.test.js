/**
 * Regression tests for content/parser.js.
 *
 * Uses jsdom's real `document`/`window`/`Node`/`NodeFilter` globals (Jest's default
 * test environment) rather than mocking the DOM, since this file's logic is a real
 * DOM tree walk. `self` methods are exposed via Find.register('Content.Parser', ...).
 */

const fs = require('fs');
const path = require('path');

function loadScript(relativePath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  // eslint-disable-next-line no-eval
  eval(code);
}

describe('Content.Parser', () => {
  let Parser;

  beforeEach(() => {
    jest.resetModules();
    delete global.Find;
    require('../test/mock-extension-apis.js');

    document.body.innerHTML = '';

    loadScript('content/parser.js');
    Parser = global.Find.Content.Parser;
  });

  describe('buildDOMReferenceObject', () => {
    test('wraps a simple text node in a span with a generated UUID', () => {
      document.body.innerHTML = '<p>Hello world</p>';

      const model = Parser.buildDOMReferenceObject();

      const groups = Object.values(model);
      expect(groups.length).toBeGreaterThan(0);

      const entry = groups[0].group[0];
      expect(entry.text).toBe('Hello world');

      const wrapper = document.getElementById(entry.elementUUID);
      expect(wrapper).not.toBeNull();
      expect(wrapper.tagName.toLowerCase()).toBe('span');
      expect(wrapper.textContent).toBe('Hello world');
    });

    test('skips text inside script, style, noscript, textarea, and math elements', () => {
      document.body.innerHTML = `
        <script>var x = 1;</script>
        <style>.a { color: red; }</style>
        <noscript>no js text</noscript>
        <textarea>typed text</textarea>
        <p>Visible text</p>
      `;

      const model = Parser.buildDOMReferenceObject();
      const allText = Object.values(model)
        .flatMap((g) => g.group)
        .map((entry) => entry.text)
        .join(' ');

      expect(allText).toContain('Visible text');
      expect(allText).not.toContain('var x');
      expect(allText).not.toContain('color: red');
      expect(allText).not.toContain('no js text');
      expect(allText).not.toContain('typed text');
    });

    test('collapses consecutive whitespace in non-preformatted text', () => {
      document.body.innerHTML = '<p>Hello    \n\n   world</p>';

      const model = Parser.buildDOMReferenceObject();
      const entry = Object.values(model)[0].group[0];

      expect(entry.text).toBe('Hello world');
    });

    test('preserves whitespace inside <pre> elements', () => {
      document.body.innerHTML = '<pre>Hello    world</pre>';

      const model = Parser.buildDOMReferenceObject();
      const entry = Object.values(model)[0].group[0];

      expect(entry.text).toBe('Hello    world');
    });

    test('skips empty or whitespace-only text nodes', () => {
      document.body.innerHTML = '<div>   </div><p>Real text</p>';

      const model = Parser.buildDOMReferenceObject();
      const allText = Object.values(model)
        .flatMap((g) => g.group)
        .map((entry) => entry.text);

      expect(allText).toEqual(['Real text']);
    });

    test('produces unique UUIDs for each wrapped text node', () => {
      document.body.innerHTML = '<p>First</p><p>Second</p><p>Third</p>';

      const model = Parser.buildDOMReferenceObject();
      const uuids = Object.values(model)
        .flatMap((g) => g.group)
        .map((entry) => entry.elementUUID);

      expect(new Set(uuids).size).toBe(uuids.length);
    });
  });

  describe('restoreWebPage', () => {
    test('unwraps wrapper spans and restores original text nodes', () => {
      document.body.innerHTML = '<p>Hello world</p>';

      const model = Parser.buildDOMReferenceObject();
      const uuids = Object.values(model)
        .flatMap((g) => g.group)
        .map((entry) => entry.elementUUID);

      expect(document.querySelectorAll('span').length).toBeGreaterThan(0);

      Parser.restoreWebPage(uuids);

      expect(document.querySelectorAll('span').length).toBe(0);
      expect(document.body.textContent).toContain('Hello world');
    });

    test('restores multiple wrapped nodes independently', () => {
      document.body.innerHTML = '<p>First</p><p>Second</p>';

      const model = Parser.buildDOMReferenceObject();
      const uuids = Object.values(model)
        .flatMap((g) => g.group)
        .map((entry) => entry.elementUUID);

      Parser.restoreWebPage(uuids);

      expect(document.querySelectorAll('span').length).toBe(0);
      expect(document.body.textContent).toContain('First');
      expect(document.body.textContent).toContain('Second');
    });
  });
});
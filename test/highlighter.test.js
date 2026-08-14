/**
 * Regression tests for content/highlighter.js.
 *
 * Built against the actual source (not diff inference). Key confirmed facts
 * used below:
 *  - highlightAll(occurrenceMap, regex, options): `regex` is a STRING, not a
 *    RegExp - the function does regex.replace(/ /g, '\\s') then
 *    `new RegExp(regex, flags)` internally, mirroring background.js.
 *  - occurrenceMap.groups is a count; occurrenceMap[index] = { uuids, preformatted }.
 *  - uuids are DOM element ids resolved via document.getElementById.
 *  - options.allHighlightColor.hexColor is read unconditionally.
 *  - options.indexHighlightColor.hexColor is read by seekHighlight.
 *  - ScrollbarHighlightMaker needs: init, addOccurrence, mount, createMarkers,
 *    setActive, destroy.
 *  - encode/decode are real globals (see mock-extension-apis.js), not Find-namespaced.
 *  - replace()/replaceAll() write to element.innerText, NOT textContent.
 *    jsdom's innerText setter does not propagate to textContent (confirmed via
 *    diagnostic: setting innerText left textContent unchanged). This is a
 *    jsdom limitation, not a bug in highlighter.js - in a real browser
 *    innerText and textContent stay in sync. Tests below assert on
 *    `.innerText` directly for anything replace()/replaceAll() touch.
 * */

const fs = require('fs');
const path = require('path');

function loadScript(relativePath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  // eslint-disable-next-line no-eval
  eval(code);
}

function debugError(fn) {
  try {
    fn();
    return null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('DEBUG thrown error:', e.message, '\n', e.stack);
    return e;
  }
}

function baseOptions(overrides) {
  return Object.assign({
    matchCase: true,
    scrollMarkers: false,
    maxResults: 0,
    allHighlightColor: { hexColor: '#ffff00' },
    indexHighlightColor: { hexColor: '#ff9900' }
  }, overrides);
}

function getOccurrenceIndex(el) {
  const match = el.getAttribute('class').match(/find-ext-occr(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

describe('Content.Highlighter', () => {
  beforeEach(() => {
    jest.resetModules();
    delete global.Find;
    require('../test/mock-extension-apis.js');

    global.Find.Content = global.Find.Content || {};
    global.Find.Content.ScrollbarHighlightMaker = {
      init: jest.fn(),
      addOccurrence: jest.fn(),
      mount: jest.fn(),
      createMarkers: jest.fn(),
      setActive: jest.fn(),
      destroy: jest.fn()
    };

    loadScript('content/highlighter.js');
  });

  function setPageText(id, text) {
    document.body.innerHTML = `<div id="${id}">${text}</div>`;
  }

  function occurrenceMapFor(id) {
    return {
      groups: 1,
      0: { uuids: [id], preformatted: false }
    };
  }

  describe('highlightAll', () => {
    test('wraps a literal (non-metacharacter) match with highlight markup', () => {
      setPageText('node-1', 'the quick brown fox');
      const occurrenceMap = occurrenceMapFor('node-1');

      const err = debugError(() => {
        global.Find.Content.Highlighter.highlightAll(occurrenceMap, 'quick', baseOptions());
      });
      expect(err).toBeNull();

      const highlighted = document.querySelectorAll('[class*="find-ext-occr"]');
      expect(highlighted.length).toBeGreaterThan(0);
      expect(document.getElementById('node-1').textContent).toContain('quick');
    });

    test('treats regex metacharacters as literal when pre-escaped', () => {
      // Regression guard for the no-useless-escape fix: an escaped literal dot
      // (\.) must match only a literal '.', not "any character".
      setPageText('node-1', 'price: 3.99 not 3x99');
      const occurrenceMap = occurrenceMapFor('node-1');
      const escapedLiteral = '3\\.99';

      const err = debugError(() => {
        global.Find.Content.Highlighter.highlightAll(occurrenceMap, escapedLiteral, baseOptions());
      });
      expect(err).toBeNull();

      const highlighted = document.querySelectorAll('[class*="find-ext-occr"]');
      expect(highlighted.length).toBe(1);
      expect(highlighted[0].textContent).toBe('3.99');
    });

    test('is case-insensitive when matchCase option is false', () => {
      setPageText('node-1', 'The Quick Brown Fox');
      const occurrenceMap = occurrenceMapFor('node-1');

      const err = debugError(() => {
        global.Find.Content.Highlighter.highlightAll(
          occurrenceMap, 'quick', baseOptions({ matchCase: false })
        );
      });
      expect(err).toBeNull();

      expect(document.querySelectorAll('[class*="find-ext-occr"]').length).toBeGreaterThan(0);
    });

    test('produces no highlights when the pattern does not match', () => {
      setPageText('node-1', 'the quick brown fox');
      const occurrenceMap = occurrenceMapFor('node-1');

      const err = debugError(() => {
        global.Find.Content.Highlighter.highlightAll(occurrenceMap, 'zzzz', baseOptions());
      });
      expect(err).toBeNull();

      expect(document.querySelectorAll('[class*="find-ext-occr"]').length).toBe(0);
    });

    test('encodes HTML-sensitive characters in the surrounding text', () => {
      setPageText('node-1', 'a &lt;tag&gt; match here');
      const occurrenceMap = occurrenceMapFor('node-1');

      const err = debugError(() => {
        global.Find.Content.Highlighter.highlightAll(occurrenceMap, 'match', baseOptions());
      });
      expect(err).toBeNull();

      expect(document.getElementById('node-1').querySelector('tag')).toBeNull();
    });

    test('does not throw when scrollMarkers is enabled', () => {
      setPageText('node-1', 'the quick brown fox');
      const occurrenceMap = occurrenceMapFor('node-1');

      const err = debugError(() => {
        global.Find.Content.Highlighter.highlightAll(
          occurrenceMap, 'quick', baseOptions({ scrollMarkers: true })
        );
      });
      expect(err).toBeNull();

      expect(global.Find.Content.ScrollbarHighlightMaker.init).toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    test('removes all highlight markup and leaves the original text intact', () => {
      setPageText('node-1', 'the quick brown fox');
      const occurrenceMap = occurrenceMapFor('node-1');

      debugError(() => {
        global.Find.Content.Highlighter.highlightAll(occurrenceMap, 'quick', baseOptions());
      });
      expect(document.querySelectorAll('[class*="find-ext-occr"]').length).toBeGreaterThan(0);

      const err = debugError(() => {
        global.Find.Content.Highlighter.restore();
      });
      expect(err).toBeNull();

      expect(document.querySelectorAll('[class*="find-ext-occr"]').length).toBe(0);
      expect(document.getElementById('node-1').textContent).toBe('the quick brown fox');
    });

    test('calls ScrollbarHighlightMaker.destroy', () => {
      const err = debugError(() => {
        global.Find.Content.Highlighter.restore();
      });
      expect(err).toBeNull();
      expect(global.Find.Content.ScrollbarHighlightMaker.destroy).toHaveBeenCalled();
    });
  });

  describe('seekHighlight', () => {
    test('applies the index highlight class to the target occurrence', () => {
      setPageText('node-1', 'the quick brown fox, a quick fox indeed');
      const occurrenceMap = occurrenceMapFor('node-1');

      debugError(() => {
        global.Find.Content.Highlighter.highlightAll(occurrenceMap, 'quick', baseOptions());
      });

      const err = debugError(() => {
        global.Find.Content.Highlighter.seekHighlight(0, baseOptions());
      });
      expect(err).toBeNull();

      expect(document.querySelectorAll('.find-ext-index-highlight').length).toBeGreaterThan(0);
    });

    test('does nothing and does not throw when index is null', () => {
      const err = debugError(() => {
        global.Find.Content.Highlighter.seekHighlight(null, baseOptions());
      });
      expect(err).toBeNull();
    });

    test('does nothing and does not throw when options is null', () => {
      const err = debugError(() => {
        global.Find.Content.Highlighter.seekHighlight(0, null);
      });
      expect(err).toBeNull();
    });
  });

  describe('replace', () => {
    test('replaces the innerText of the targeted occurrence element', () => {
      setPageText('node-1', 'the quick brown fox');
      const occurrenceMap = occurrenceMapFor('node-1');

      debugError(() => {
        global.Find.Content.Highlighter.highlightAll(occurrenceMap, 'quick', baseOptions());
      });

      const el = document.querySelector('[class*="find-ext-occr"]');
      const index = getOccurrenceIndex(el);
      expect(index).not.toBeNull();

      const err = debugError(() => {
        global.Find.Content.Highlighter.replace(index, 'slow');
      });
      expect(err).toBeNull();

      // jsdom does not propagate innerText writes to textContent, so we
      // assert on innerText directly - the property replace() actually sets.
      expect(el.innerText).toBe('slow');
    });

    test('does nothing and does not throw when no matching elements exist', () => {
      setPageText('node-1', 'no matches here');

      const err = debugError(() => {
        global.Find.Content.Highlighter.replace(0, 'anything');
      });
      expect(err).toBeNull();
    });
  });

  describe('replaceAll', () => {
    test('sets innerText on every occurrence element sharing the same class', () => {
      setPageText('node-1', 'quick fox, quick fox, quick fox');
      const occurrenceMap = occurrenceMapFor('node-1');

      debugError(() => {
        global.Find.Content.Highlighter.highlightAll(occurrenceMap, 'quick', baseOptions());
      });

      const before = document.querySelectorAll('[class*="find-ext-occr"]');
      expect(before.length).toBeGreaterThan(0);

      const err = debugError(() => {
        global.Find.Content.Highlighter.replaceAll('slow');
      });
      expect(err).toBeNull();

      // Per element, replaceAll sets innerText - first element of each
      // occurrence group gets replaceWith, subsequent ones get ''.
      // Assert on innerText, not textContent, per the jsdom limitation above.
      const after = document.querySelectorAll('[class*="find-ext-occr"]');
      const innerTexts = Array.from(after).map((el) => el.innerText);
      expect(innerTexts).toContain('slow');
      expect(innerTexts).not.toContain('quick');
    });
  });

  describe('followLinkUnderFocus', () => {
    test('clicks the ancestor anchor of the currently highlighted element', () => {
      document.body.innerHTML =
        '<a id="link-1" href="#dest"><span id="inner"><em class="find-ext-index-highlight">quick</em></span></a>';

      const clickSpy = jest.fn();
      document.getElementById('link-1').addEventListener('click', clickSpy);

      const err = debugError(() => {
        global.Find.Content.Highlighter.followLinkUnderFocus();
      });
      expect(err).toBeNull();
      expect(clickSpy).toHaveBeenCalled();
    });

    test('does not throw when there is no currently highlighted element', () => {
      document.body.innerHTML = '<div>no highlight here</div>';

      const err = debugError(() => {
        global.Find.Content.Highlighter.followLinkUnderFocus();
      });
      expect(err).toBeNull();
    });
  });
});

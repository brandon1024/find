/**
 * Regression tests for content/scrollbar.js.
 *
 * Uses jsdom's real DOM (Jest's default test environment). Viewport/document
 * dimensions, getBoundingClientRect, and window.scrollTo are not meaningfully
 * implemented by jsdom, so they are stubbed per-test via Object.defineProperty
 * / jest.fn() where the source under test reads or calls them.
 *
 * Public API exercised (exposed via Find.register('Content.ScrollbarHighlightMaker', ...)):
 * init, addOccurrence, mount, createMarkers, setActive, destroy.
 */

const fs = require('fs');
const path = require('path');

function loadScript(relativePath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  // eslint-disable-next-line no-eval
  eval(code);
}

function setViewport({ innerWidth = 1280, innerHeight = 800, clientWidth = 1280, scrollHeight = 800, scrollY = 0
} = {}) {
  Object.defineProperty(window, 'innerWidth', { value: innerWidth, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: innerHeight, configurable: true });
  Object.defineProperty(document.documentElement, 'clientWidth', { value: clientWidth, configurable: true });
  Object.defineProperty(document.documentElement, 'scrollHeight', { value: scrollHeight, configurable: true });
  Object.defineProperty(window, 'scrollY', { value: scrollY, configurable: true, writable: true });
  Object.defineProperty(document.documentElement, 'scrollTop', { value: scrollY, configurable: true, writable: true });
}

function mockElementRect(el, { top = 0, height = 20 } = {}) {
  el.getBoundingClientRect = jest.fn(() => ({ top, height, left: 0, right: 0, bottom: top + height, width: 0 }));
}

const DEFAULT_OPTIONS = {
  index_highlight_color: { hexColor: '#ff9813' },
  all_highlight_color: { hexColor: '#fff000' }
};

describe('Content.ScrollbarHighlightMaker', () => {
  let ScrollbarHighlightMaker;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    delete global.Find;
    require('../test/mock-extension-apis.js');

    document.body.innerHTML = '';
    document.head.innerHTML = '';

    setViewport();
    window.scrollTo = jest.fn();

    // jsdom's `document.scrollingElement` is a getter; stub it to point at documentElement
    // so the dimension stubs above are actually read by the source.
    Object.defineProperty(document, 'scrollingElement', {
      value: document.documentElement,
      configurable: true
    });

    loadScript('content/scrollbar.js');
    ScrollbarHighlightMaker = global.Find.Content.ScrollbarHighlightMaker;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('init', () => {
    test('destroys any previously mounted overlay before applying new options', () => {
      ScrollbarHighlightMaker.init(DEFAULT_OPTIONS);
      ScrollbarHighlightMaker.mount();
      expect(document.getElementById('find-ext-scrollbar-overlay')).not.toBeNull();

      ScrollbarHighlightMaker.init(DEFAULT_OPTIONS);

      expect(document.getElementById('find-ext-scrollbar-overlay')).toBeNull();
    });

    test('is safe to call when nothing has been mounted yet', () => {
      expect(() => ScrollbarHighlightMaker.init(DEFAULT_OPTIONS)).not.toThrow();
    });
  });

  describe('mount', () => {
    beforeEach(() => {
      ScrollbarHighlightMaker.init(DEFAULT_OPTIONS);
    });

    test('injects a global style element suppressing the native scrollbar', () => {
      ScrollbarHighlightMaker.mount();

      const styleEls = Array.from(document.head.querySelectorAll('style'));
      const injected = styleEls.find((el) => el.textContent.includes('scrollbar-width'));
      expect(injected).toBeDefined();
    });

    test('builds the overlay, track, thumb, and marker container', () => {
      ScrollbarHighlightMaker.mount();

      const overlay = document.getElementById('find-ext-scrollbar-overlay');
      const track = document.getElementById('find-ext-scrollbar-track');
      const thumb = document.getElementById('find-ext-scroll-thumb');
      const markerContainer = document.getElementById('find-ext-scroll-marker-container');

      expect(overlay).not.toBeNull();
      expect(track.parentElement).toBe(overlay);
      expect(thumb.parentElement).toBe(track);
      expect(markerContainer.parentElement).toBe(track);
    });

    test('hides the thumb when document height does not exceed the viewport', () => {
      setViewport({ innerHeight: 800, scrollHeight: 800 });

      ScrollbarHighlightMaker.mount();

      const thumb = document.getElementById('find-ext-scroll-thumb');
      expect(thumb.style.display).toBe('none');
    });

    test('sizes and positions the thumb proportionally to scroll position', () => {
      setViewport({ innerHeight: 800, scrollHeight: 1600, scrollY: 400 });

      ScrollbarHighlightMaker.mount();

      const thumb = document.getElementById('find-ext-scroll-thumb');
      expect(thumb.style.display).toBe('block');
      // docInvisibleHeight = 1600 - 800 = 800; scrollRatio = 400 / 800 = 0.5
      // thumbHeight = max(30, 800 * (800/1600)) = 400; maxThumbTop = 800 - 400 = 400
      expect(thumb.style.height).toBe('400px');
      expect(thumb.style.top).toBe('200px');
    });

    test('clicking the track outside the thumb scrolls the page to the clicked position', () => {
      setViewport({ innerHeight: 800, scrollHeight: 1600, scrollY: 0 });
      ScrollbarHighlightMaker.mount();

      const track = document.getElementById('find-ext-scrollbar-track');
      track.getBoundingClientRect = jest.fn(() => ({ top: 0, height: 800 }));
      Object.defineProperty(track, 'clientTop', { value: 0, configurable: true });
      Object.defineProperty(track, 'clientHeight', { value: 800, configurable: true });

      const clickEvent = new window.MouseEvent('click', { clientY: 400, bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: track, configurable: true });
      track.dispatchEvent(clickEvent);

      expect(window.scrollTo).toHaveBeenCalledWith({ top: 400, behavior: 'smooth' });
    });
  });

  describe('addOccurrence and createMarkers', () => {
    beforeEach(() => {
      setViewport({ innerHeight: 800, scrollHeight: 1600 });
      ScrollbarHighlightMaker.init(DEFAULT_OPTIONS);
      ScrollbarHighlightMaker.mount();
    });

    test('records the marker position for a new occurrence', () => {
      const el = document.createElement('span');
      mockElementRect(el, { top: 100, height: 20 });

      ScrollbarHighlightMaker.addOccurrence(0, el);
      ScrollbarHighlightMaker.createMarkers();

      const marker = document.getElementById('find-ext-marker-0');
      expect(marker).not.toBeNull();
      expect(marker.style.backgroundColor).toBe('rgb(255, 240, 0)'); // all_highlight_color #fff000
    });

    test('ignores subsequent addOccurrence calls for an already-recorded occurrence', () => {
      const firstEl = document.createElement('span');
      mockElementRect(firstEl, { top: 100, height: 20 });
      const secondEl = document.createElement('span');
      mockElementRect(secondEl, { top: 700, height: 20 });

      ScrollbarHighlightMaker.addOccurrence(0, firstEl);
      ScrollbarHighlightMaker.addOccurrence(0, secondEl);
      ScrollbarHighlightMaker.createMarkers();

      const markers = document.querySelectorAll('.find-ext-scroll-marker');
      expect(markers.length).toBe(1);
    });

    test('creates one marker per distinct occurrence index', () => {
      const elA = document.createElement('span');
      mockElementRect(elA, { top: 50, height: 20 });
      const elB = document.createElement('span');
      mockElementRect(elB, { top: 500, height: 20 });

      ScrollbarHighlightMaker.addOccurrence(0, elA);
      ScrollbarHighlightMaker.addOccurrence(1, elB);
      ScrollbarHighlightMaker.createMarkers();

      expect(document.getElementById('find-ext-marker-0')).not.toBeNull();
      expect(document.getElementById('find-ext-marker-1')).not.toBeNull();
    });
  });

  describe('setActive', () => {
    beforeEach(() => {
      setViewport({ innerHeight: 800, scrollHeight: 1600 });
      ScrollbarHighlightMaker.init(DEFAULT_OPTIONS);
      ScrollbarHighlightMaker.mount();

      const elA = document.createElement('span');
      mockElementRect(elA, { top: 50, height: 20 });
      const elB = document.createElement('span');
      mockElementRect(elB, { top: 500, height: 20 });

      ScrollbarHighlightMaker.addOccurrence(0, elA);
      ScrollbarHighlightMaker.addOccurrence(1, elB);
      ScrollbarHighlightMaker.createMarkers();
    });

    test('marks the given occurrence as active and colors it with the index highlight color', () => {
      ScrollbarHighlightMaker.setActive(1);

      const activeMarker = document.getElementById('find-ext-marker-1');
      const inactiveMarker = document.getElementById('find-ext-marker-0');

      expect(activeMarker.classList.contains('find-ext-marker-active')).toBe(true);
      expect(activeMarker.style.backgroundColor).toBe('rgb(255, 152, 19)'); // index_highlight_color #ff9813
      expect(inactiveMarker.classList.contains('find-ext-marker-active')).toBe(false);
      expect(inactiveMarker.style.backgroundColor).toBe('rgb(255, 240, 0)'); // all_highlight_color #fff000
    });

    test('clears active state from a previously active marker when a new one is activated', () => {
      ScrollbarHighlightMaker.setActive(0);
      ScrollbarHighlightMaker.setActive(1);

      const firstMarker = document.getElementById('find-ext-marker-0');
      const secondMarker = document.getElementById('find-ext-marker-1');

      expect(firstMarker.classList.contains('find-ext-marker-active')).toBe(false);
      expect(secondMarker.classList.contains('find-ext-marker-active')).toBe(true);
    });
  });

  describe('destroy', () => {
    test('removes the overlay and injected style, and is safe to call again', () => {
      ScrollbarHighlightMaker.init(DEFAULT_OPTIONS);
      ScrollbarHighlightMaker.mount();

      ScrollbarHighlightMaker.destroy();

      expect(document.getElementById('find-ext-scrollbar-overlay')).toBeNull();
      const styleEls = Array.from(document.head.querySelectorAll('style'));
      expect(styleEls.find((el) => el.textContent.includes('scrollbar-width'))).toBeUndefined();

      expect(() => ScrollbarHighlightMaker.destroy()).not.toThrow();
    });

    test('unbinds the scroll listener so it no longer updates the thumb', () => {
      setViewport({ innerHeight: 800, scrollHeight: 1600, scrollY: 0 });
      ScrollbarHighlightMaker.init(DEFAULT_OPTIONS);
      ScrollbarHighlightMaker.mount();

      ScrollbarHighlightMaker.destroy();

      // With everything torn down, dispatching scroll and advancing timers must not throw,
      // since the thumb element (and its listener closure) no longer exist.
      expect(() => {
        window.dispatchEvent(new window.Event('scroll'));
        jest.advanceTimersByTime(20);
      }).not.toThrow();
    });
  });
});
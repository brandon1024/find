'use strict';

/**
 * Create the ScrollbarHighlightMaker namespace. This component renders a
 * custom "fake" scrollbar overlay on the right edge of the page, with
 * markers indicating the position of search occurrences in the document.
 *
 * Native browser scrollbars cannot be styled or overlaid directly by an
 * extension, so this component hides the native scrollbar for the duration
 * of the search and replaces it with a fully interactive substitute
 * (draggable thumb, click-to-jump track) plus one marker per occurrence.
 * */
Find.register('Content.ScrollbarHighlightMaker', function (self) {

    const FALLBACK_SCROLLBAR_WIDTH = 13;
    const MIN_THUMB_HEIGHT = 30;
    const MARKER_HEIGHT = 4;
    const FRAME_INTERVAL = 1000 / 60; // ~60 FPS

    let options = null;
    let globalStyle = null;
    let overlay = null;
    let track = null;
    let thumb = null;
    let markerContainer = null;

    let currentScrollY = 0;
    let docInvisibleHeight = 0;
    let scrollListener = null;
    let scrollTicking = false;

    let occTopPositionMap = new Map();

    /**
     * Compute the native scrollbar width for this page. Falls back to a
     * reasonable default when OS-level overlay scrollbars are in use, since
     * those report a width of 0.
     *
     * @private
     * @returns {number} The scrollbar width, in pixels
     * */
    function getScrollbarWidth() {
        const w = window.innerWidth - document.documentElement.clientWidth;
        return w > 0 ? w : FALLBACK_SCROLLBAR_WIDTH;
    }

    /**
     * Build and inject the overlay DOM structure (native scrollbar
     * suppression style, track, thumb, and marker container) into the page.
     *
     * The scrollbar-suppression rules are injected here as a JS-managed
     * <style> element rather than folded into the static stylesheet
     * (scrollbar.css), because manifest-declared content CSS applies to
     * every page at all times, even when find is not active. Keeping these
     * two rules JS-injected means they are only ever present while this
     * component is mounted, and are removed in destroy().
     *
     * The overlay is appended directly to the light DOM (no Shadow DOM),
     * since manifest-declared CSS cannot pierce a shadow root.
     *
     * @private
     * */
    function addComponents() {
        globalStyle = document.head.appendChild(document.createElement('style'));
        globalStyle.textContent =
            '::-webkit-scrollbar { width: 0px !important; height: 0px !important; }' +
            'html { scrollbar-width: none !important; }';

        overlay = document.body.appendChild(document.createElement('div'));
        overlay.id = 'find-ext-scrollbar-overlay';

        track = overlay.appendChild(document.createElement('div'));
        track.id = 'find-ext-scrollbar-track';
        track.style.width = getScrollbarWidth() + 'px';

        thumb = track.appendChild(document.createElement('div'));
        thumb.id = 'find-ext-scroll-thumb';

        markerContainer = track.appendChild(document.createElement('div'));
        markerContainer.id = 'find-ext-scroll-marker-container';
    }

    /**
     * Recompute the thumb's height and vertical offset based on the current
     * document and viewport dimensions, and the current scroll position.
     *
     * @private
     * */
    function updateThumb() {
        const scrollElement = document.scrollingElement;
        const docHeight = scrollElement.scrollHeight;
        const viewHeight = window.innerHeight;

        if (docHeight <= viewHeight) {
            thumb.style.display = 'none';
            return;
        }
        thumb.style.display = 'block';

        const thumbHeight = Math.max(MIN_THUMB_HEIGHT, (viewHeight / docHeight) * viewHeight);
        const maxThumbTop = viewHeight - thumbHeight;
        currentScrollY = window.scrollY || scrollElement.scrollTop;
        docInvisibleHeight = docHeight - viewHeight;
        const scrollRatio = currentScrollY / docInvisibleHeight;
        thumb.style.height = thumbHeight + 'px';
        thumb.style.top = Math.min(maxThumbTop, scrollRatio * maxThumbTop) + 'px';
    }

    /**
     * Bind a throttled scroll listener that keeps the thumb position in
     * sync with the native page scroll position.
     *
     * Uses setTimeout at a fixed 60 FPS interval rather than
     * requestAnimationFrame, since rAF callbacks can be deferred by the
     * browser during scroll-linked effects (see MDN's guidance on the
     * "scroll" event and asynchronous panning).
     *
     * @private
     * */
    function bindScroll() {
        scrollTicking = false;
        scrollListener = function () {
            if (!scrollTicking) {
                scrollTicking = true;
                setTimeout(function () {
                    updateThumb();
                    scrollTicking = false;
                }, FRAME_INTERVAL);
            }
        };
        window.addEventListener('scroll', scrollListener);
    }

    /**
     * Bind a click listener on the track that scrolls the page to the
     * corresponding position when the user clicks outside the thumb.
     *
     * @private
     * */
    function bindTrackClick() {
        track.addEventListener('click', function (e) {
            if (e.target === thumb) return;
            const ratio = (e.clientY - track.clientTop) / track.clientHeight;
            const targetY = ratio * docInvisibleHeight;
            window.scrollTo({ top: targetY, behavior: 'smooth' });
        });
    }

    /**
     * Bind mouse listeners on the thumb enabling drag-to-scroll behaviour.
     *
     * @private
     * */
    function bindThumbDrag() {
        thumb.addEventListener('mousedown', function (e) {
            e.preventDefault();
            const dragStartScrollY = currentScrollY;
            const dragStartY = e.clientY;

            const onMove = function (e) {
                const ratio = (e.clientY - dragStartY) / (track.clientHeight - thumb.clientHeight);
                const targetY = dragStartScrollY + ratio * docInvisibleHeight;
                window.scrollTo(0, targetY);
            };
            const onUp = function () {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }

    /**
     * Compute the vertical marker position (in pixels, relative to the
     * viewport) for a given highlighted element, proportional to its
     * position in the overall document.
     *
     * @private
     * @param {HTMLElement} el - The highlighted element to compute a marker position for
     * @returns {number} The marker's top offset, in pixels
     * */
    function calculateMarkerPosition(el) {
        const clientRect = el.getBoundingClientRect();
        const docHeight = document.scrollingElement.scrollHeight;
        const elementAbsoluteTop = window.scrollY + clientRect.top + (0.5 * clientRect.height);
        const proportion = elementAbsoluteTop / docHeight;
        const markerTop = proportion * window.innerHeight;
        return Math.max(0, Math.min(window.innerHeight - MARKER_HEIGHT, markerTop));
    }

    /**
     * Create a single marker element for the given occurrence at the given
     * vertical position, wrapped in a document fragment.
     *
     * The marker's background color is sourced from the user's highlight
     * color options and applied inline, since a static stylesheet cannot
     * express a value that depends on runtime user options.
     *
     * @private
     * @param {number} occurrenceId - The occurrence index this marker represents
     * @param {number} topPosition - The marker's top offset, in pixels
     * @returns {DocumentFragment} A fragment containing the marker element
     * */
    function createMarker(occurrenceId, topPosition) {
        const fragment = document.createDocumentFragment();
        const marker = fragment.appendChild(document.createElement('div'));
        marker.id = 'find-ext-marker-' + occurrenceId;
        marker.className = 'find-ext-scroll-marker';
        marker.style.top = topPosition + 'px';
        marker.style.backgroundColor = options.allHighlightColor.hexColor;
        return fragment;
    }

    /**
     * Initialize the component with the given search options, discarding
     * any previously mounted overlay. Must be called before mount().
     *
     * @private
     * @param {object} newOptions - The search and highlight options
     * */
    self.init = function (newOptions) {
        self.destroy();
        options = newOptions;
        occTopPositionMap = new Map();
    };

    /**
     * Record the marker position for a given occurrence, computed once from
     * its first highlighted element. Subsequent calls for an
     * already-recorded occurrence are ignored.
     *
     * @private
     * @param {number} occIndex - The occurrence index
     * @param {HTMLElement} el - The first highlighted element for this occurrence
     * */
    self.addOccurrence = function (occIndex, el) {
        if (!occTopPositionMap.has(occIndex)) {
            occTopPositionMap.set(occIndex, calculateMarkerPosition(el));
        }
    };

    /**
     * Mount the scrollbar overlay, thumb, and marker container into the
     * page, and bind all interaction listeners.
     *
     * @private
     * */
    self.mount = function () {
        addComponents();
        bindTrackClick();
        bindThumbDrag();
        updateThumb();
        bindScroll();
    };

    /**
     * Render markers for every occurrence collected so far via
     * addOccurrence().
     *
     * @private
     * */
    self.createMarkers = function () {
        occTopPositionMap.forEach(function (markerTop, occIndex) {
            markerContainer.appendChild(createMarker(occIndex, markerTop));
        });
    };

    /**
     * Highlight the marker corresponding to the given occurrence index as
     * the active occurrence, clearing the active state from all others.
     *
     * @private
     * @param {number} occIndex - The occurrence index to mark active
     * */
    self.setActive = function (occIndex) {
        Array.from(markerContainer.children).forEach(function (el, index) {
            const isActive = index === occIndex;
            el.classList.toggle('find-ext-marker-active', isActive);
            el.style.backgroundColor = isActive
                ? options.indexHighlightColor.hexColor
                : options.allHighlightColor.hexColor;
        });
    };

    /**
     * Remove the scrollbar overlay and all injected styles from the page,
     * and unbind the scroll listener. Safe to call when nothing is mounted.
     *
     * @private
     * */
    self.destroy = function () {
        if (scrollListener) {
            window.removeEventListener('scroll', scrollListener);
            scrollListener = null;
        }
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
        if (globalStyle && globalStyle.parentNode) {
            globalStyle.parentNode.removeChild(globalStyle);
        }
        overlay = null;
        track = null;
        thumb = null;
        markerContainer = null;
        globalStyle = null;
    };
});

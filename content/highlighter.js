'use strict';

/**
 * Create the Content Highlighter namespace. This component is injected into
 * the page and is used to highlight occurrences of a regex in the page.
 * */
Find.register('Content.Highlighter', function(self) {

    const indexHighlight = 'find-ext-index-highlight';
    const allHighlight = 'find-ext-all-highlight';

    /**
     * Highlight all occurrences of a regex in the page, using an occurrence map and regex.
     *
     * @private
     * @param {object} occurrenceMap - The occurrence map
     * @param {string} regex - The regular expression
     * @param {object} options - The search and highlight options
     * */
    self.highlightAll = function(occurrenceMap, regex, options) {
        const tags = {
            occIndex: null,
            maxIndex: null,
            openingMarkup: '',
            closingMarkup: '',
            update: function (index) {
                if (this.occIndex !== index) {
                    this.occIndex = index;

                    //If reached max number of occurrences to show, don't highlight text
                    if (this.maxIndex == null || this.occIndex <= this.maxIndex) {
                        let style = 'all: unset; background-color: ' + options.all_highlight_color.hexColor + '; color: black;';
                        let classList = 'find-ext-occr' + index + ' ' + allHighlight;
                        this.openingMarkup = '<span style="' + style + '" class="' + classList + '">';
                        this.closingMarkup = '</span>';
                    } else {
                        this.openingMarkup = '';
                        this.closingMarkup = '';
                    }
                }
            }
        };

        if (options && options.max_results !== 0) {
            tags.maxIndex = options.max_results - 1;
        } else {
            tags.maxIndex = null;
        }

        regex = regex.replace(/ /g, '\\s');
        if (!options || options.match_case) {
            regex = new RegExp(regex, 'm');
        } else {
            regex = new RegExp(regex, 'mi');
        }

        //Iterate each text group
        let occIndex = 0;
        for (let index = 0; index < occurrenceMap.groups; index++) {
            let uuids = occurrenceMap[index].uuids;
            let groupText = '';
            let charMap = {};
            let charIndexMap = [];

            //Build groupText, charMap and charIndexMap
            let count = 0;
            for (let uuidIndex = 0; uuidIndex < uuids.length; uuidIndex++) {
                let el = document.getElementById(uuids[uuidIndex]);
                let text = el.childNodes[0].nodeValue;

                if (!text) {
                    continue;
                }

                text = decode(text);
                groupText += text;

                for (let stringIndex = 0; stringIndex < text.length; stringIndex++) {
                    charIndexMap.push(count);
                    charMap[count++] = {
                        char: text.charAt(stringIndex),
                        nodeUUID: uuids[uuidIndex],
                        nodeIndex: stringIndex,
                        ignorable: false,
                        matched: false,
                        boundary: false
                    };
                }
            }
            charMap.length = count;

            //Format text nodes (whitespaces) whilst keeping references to their nodes in the DOM, updating charMap ignorable characters
            if (!occurrenceMap[index].preformatted) {
                let info;

                //Replace all whitespace characters (\t \n\r) with the space character
                while (info = /[\t\n\r]/.exec(groupText)) {
                    charMap[charIndexMap[info.index]].ignorable = true;
                    groupText = groupText.replace(/[\t\n\r]/, ' ');
                }

                //Truncate consecutive whitespaces
                while (info = / {2,}/.exec(groupText)) {
                    let len = info[0].length;
                    let offset = info.index;

                    for (let currIndex = 0; currIndex < len; currIndex++) {
                        charMap[charIndexMap[offset + currIndex]].ignorable = true;
                    }

                    for (let currIndex = 0; currIndex < len - 1; currIndex++) {
                        charIndexMap.splice(offset, 1);
                    }

                    groupText = groupText.replace(/ {2,}/, ' ');
                }

                //Collapse leading or trailing whitespaces
                while (info = /^ | $/.exec(groupText)) {
                    let len = info[0].length;
                    let offset = info.index;

                    for (let currIndex = 0; currIndex < len; currIndex++) {
                        charMap[charIndexMap[offset + currIndex]].ignorable = true;
                    }

                    for (let currIndex = 0; currIndex < len; currIndex++) {
                        charIndexMap.splice(offset, 1);
                    }

                    groupText = groupText.replace(/^ | $/, '');
                }
            }

            //Perform complex regex search, updating charMap matched characters
            let info;
            while (info = regex.exec(groupText)) {
                let len = info[0].length;
                let offset = info.index;

                if (len === 0) {
                    break;
                }

                let first = charIndexMap[offset];
                let last = charIndexMap[offset + len - 1];
                for (let currIndex = first; currIndex <= last; currIndex++) {
                    charMap[currIndex].matched = true;
                    if (currIndex === last) {
                        charMap[currIndex].boundary = true;
                    }
                }

                for (let currIndex = 0; currIndex < offset + len; currIndex++) {
                    charIndexMap.splice(0, 1);
                }

                groupText = groupText.substring(offset + len);
            }

            //Wrap matched characters in an element with class indexHighlight and occurrenceIdentifier
            let matchGroup = {text: '', groupUUID: charMap[0].nodeUUID};
            let inMatch = false;
            for (let key = 0; key < charMap.length; key++) {
                tags.update(occIndex);

                //If Transitioning Into New Text Group
                if (matchGroup.groupUUID !== charMap[key].nodeUUID) {
                    if (inMatch) {
                        matchGroup.text += tags.closingMarkup;
                    }

                    document.getElementById(matchGroup.groupUUID).innerHTML = matchGroup.text;
                    matchGroup.text = '';
                    matchGroup.groupUUID = charMap[key].nodeUUID;

                    if (inMatch) {
                        matchGroup.text += tags.openingMarkup;
                    }
                }

                //If Current Character is Matched
                if (charMap[key].matched) {
                    if (!inMatch) {
                        inMatch = charMap[key].matched;
                        matchGroup.text += tags.openingMarkup;
                    }
                } else {
                    if (inMatch) {
                        inMatch = charMap[key].matched;
                        matchGroup.text += tags.closingMarkup;

                        if (key < charMap.length) {
                            occIndex++;
                        }
                    }
                }

                matchGroup.text += encode(charMap[key].char);

                if (charMap[key].boundary) {
                    inMatch = false;
                    matchGroup.text += tags.closingMarkup;
                    if (key < charMap.length) {
                        occIndex++;
                    }
                }

                //If End of Map Reached
                if (key === charMap.length - 1) {
                    if (inMatch) {
                        matchGroup.text += tags.closingMarkup;
                        occIndex++;
                    }

                    document.getElementById(matchGroup.groupUUID).innerHTML = matchGroup.text;
                }
            }
        }

        if (options && options.scroll_markers) {
            createScrollMarkers(options);
        }
    };

    /**
     * Seek the search to the given index.
     *
     * @private
     * @param {number} index - The index to seek to
     * @param {object} options - The search options
     * */
    self.seekHighlight = function(index, options) {
        if (index === null || options == null) {
            return;
        }

        let previousIndex = Array.from(document.querySelectorAll('.' + indexHighlight));
        if (previousIndex && previousIndex.length) {
            for (let elsIndex = 0; elsIndex < previousIndex.length; elsIndex++) {
                let style = 'all: unset; background-color: ' + options.all_highlight_color.hexColor + '; color: black;';
                previousIndex[elsIndex].classList.remove(indexHighlight);
                previousIndex[elsIndex].setAttribute("style", style);
            }
        }

        let els = Array.from(document.querySelectorAll('.find-ext-occr' + index));
        if (els == null || els.length === 0) {
            return;
        }

        for (let elsIndex = 0; elsIndex < els.length; elsIndex++) {
            let style = 'all: unset; background-color: ' + options.index_highlight_color.hexColor + '; color: black;';
            els[elsIndex].classList.add(indexHighlight);
            els[elsIndex].setAttribute("style", style);
        }

        // only scroll if the element is not in the current viewport
        if (!isElementInViewport(els[0])) {
            els[0].scrollIntoView(true);

            let docHeight = Math.max(document.documentElement.clientHeight, document.documentElement.offsetHeight, document.documentElement.scrollHeight);
            let bottomScrollPos = window.pageYOffset + window.innerHeight;
            if (bottomScrollPos + 100 < docHeight) {
                window.scrollBy(0, -100);
            }
        }

        if (options.scroll_markers) { updateScrollMarkerActive(index, options); }
    };

    /**
     * Replace a given occurrence of a regex with a given string.
     *
     * @private
     * @param {number} index - The index of the occurrence that will be replaced
     * @param {string} replaceWith - The text that will replace the given occurrence of the regex
     * */
    self.replace = function(index, replaceWith) {
        let els = Array.from(document.querySelectorAll('.find-ext-occr' + index));

        if (els.length === 0) {
            return;
        }

        els.shift().innerText = replaceWith;
        for (let elsIndex = 0; elsIndex < els.length; elsIndex++) {
            els[elsIndex].innerText = '';
        }
    };

    /**
     * Replace all occurrences of a regex with a given string.
     *
     * @private
     * @param {string} replaceWith - The text that will replace all occurrences of the regex
     * */
    self.replaceAll = function(replaceWith) {
        let els = Array.from(document.querySelectorAll("[class*='find-ext-occr']"));

        let currentOccurrence = null;
        for (let index = 0; index < els.length; index++) {
            let el = els[index];
            let occrClassName = el.getAttribute('class').match(/find-ext-occr\d*/)[0];
            let occurrenceFromClass = parseInt(occrClassName.replace('find-ext-occr', ''));

            if (occurrenceFromClass !== currentOccurrence) {
                currentOccurrence = occurrenceFromClass;
                el.innerText = replaceWith
            } else {
                el.innerText = '';
            }
        }
    };

    /**
     * Follow the link that is currently highlighted.
     *
     * @private
     * */
    self.followLinkUnderFocus = function() {
        let els = document.getElementsByClassName(indexHighlight);
        for (let index = 0; index < els.length; index++) {
            let el = els[index];
            while (el.parentElement) {
                el = el.parentElement;
                if (el.tagName.toLowerCase() === 'a') {
                    return el.click();
                }
            }
        }
    };

    /**
     * Restore the page by removing any highlighting markup.
     *
     * @private
     * */
    self.restore = function() {
        removeAllScrollMarkers();
        let classes = [indexHighlight, allHighlight];
        for (let classIndex = 0; classIndex < classes.length; classIndex++) {
            let els = Array.from(document.querySelectorAll('.' + classes[classIndex]));

            for (let elsIndex = 0; elsIndex < els.length; elsIndex++) {
                let el = els[elsIndex];
                let parent = el.parentElement;

                while (el.firstChild) {
                    parent.insertBefore(el.firstChild, el);
                }

                parent.removeChild(el);
                parent.normalize();
            }
        }

    };

    // ── Scroll Marker / Fake Scrollbar Helpers ─────────────────────────────────────

    function getNativeScrollbarWidth() {
        const w = window.innerWidth - document.documentElement.clientWidth;
        return w > 0 ? w : 13;
    }
    function isPageDark() {
        const bg = getComputedStyle(document.documentElement).backgroundColor
            || getComputedStyle(document.body).backgroundColor;
        const m = bg.match(/\d+/g);
        if (!m) return window.matchMedia('(prefers-color-scheme: dark)').matches;
        const [r, g, b] = m.map(Number);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance < 0.5;
    }

    function getScrollingElement() {
        // Returns the element that actually scrolls the page
        if (document.scrollingElement) return document.scrollingElement;
        const de = document.documentElement;
        if (de.scrollHeight > de.clientHeight && getComputedStyle(de).overflowY !== 'visible') return de;
        return document.body;
    }

    function injectFakeScrollbar() {
        // Remove any existing overlay first
        removeAllScrollMarkers();
        const dark = isPageDark();
        const trackColor = dark ? '#2b2b2b' : '#f1f1f1';
        const thumbColor = dark ? '#6b6b6b' : '#aaaaaa';
        const thumbHoverColor = dark ? '#888888' : '#888888';
        const sbWidth = getNativeScrollbarWidth();

        // Suppress the native scrollbar
        const styleEl = document.createElement('style');
        styleEl.id = 'find-ext-scrollbar-style';
        styleEl.textContent =
            '::-webkit-scrollbar { width: 0px !important; height: 0px !important; }' +
            'html { scrollbar-width: none !important; }';
        document.head.appendChild(styleEl);

        // Outer track — sits exactly where the native scrollbar was
        const track = document.createElement('div');
        track.id = 'find-ext-scrollbar-overlay';
        track.style.cssText = [
            'position: fixed',
            'top: 0',
            'right: 0',
            'width: ' + sbWidth + 'px',
            'height: 100vh',
            'z-index: 2147483647',
            'pointer-events: auto',
            'background: ' + trackColor,
            'box-sizing: border-box',
            'overflow: hidden'
        ].join('; ');

        // Scroll thumb
        const thumb = document.createElement('div');
        thumb.id = 'find-ext-scroll-thumb';
        thumb.style.cssText = [
            'position: absolute',
            'right: 0',
            'width: 100%',
            'min-height: 30px',
            'background: ' + thumbColor,
            'border-radius: 3px',
            'cursor: pointer',
            'box-sizing: border-box',
            'transition: background 0.15s'
        ].join('; ');
        thumb.addEventListener('mouseenter', function () { thumb.style.background = thumbHoverColor; });
        thumb.addEventListener('mouseleave', function () { thumb.style.background = thumbColor; });
        track.appendChild(thumb);
        document.body.appendChild(track);

        function updateThumb() {
            const scrollEl = getScrollingElement();
            const docHeight = scrollEl.scrollHeight;
            const viewHeight = window.innerHeight;
            if (docHeight <= viewHeight) {
                thumb.style.display = 'none';
                return;
            }
            thumb.style.display = 'block';
            const thumbH = Math.max(30, (viewHeight / docHeight) * viewHeight);
            const maxThumbTop = viewHeight - thumbH;
            const scrollRatio = (window.scrollY || scrollEl.scrollTop) / (docHeight - viewHeight);
            thumb.style.height = thumbH + 'px';
            thumb.style.top = Math.min(maxThumbTop, scrollRatio * maxThumbTop) + 'px';
        }

        updateThumb();
        let scrollRafPending = false;
        const scrollListener = function () {
            if (!scrollRafPending) {
                scrollRafPending = true;
                requestAnimationFrame(function () {
                    updateThumb();
                    scrollRafPending = false;
                });
            }
        };
        window.addEventListener('scroll', scrollListener);
        track._scrollListener = scrollListener;
        track._styleEl = styleEl;

        // Click on track to jump
        track.addEventListener('click', function (e) {
            if (e.target === thumb) return;
            const rect = track.getBoundingClientRect();
            const ratio = (e.clientY - rect.top) / rect.height;
            const scrollEl = getScrollingElement();
            const targetY = ratio * (scrollEl.scrollHeight - window.innerHeight);
            window.scrollTo({ top: targetY, behavior: 'smooth' });
        });

        // Drag thumb
        let dragStartY = 0;
        let dragStartScroll = 0;
        thumb.addEventListener('mousedown', function (e) {
            e.preventDefault();
            dragStartY = e.clientY;
            dragStartScroll = window.scrollY || getScrollingElement().scrollTop;
            const onMove = function (e) {
                const scrollEl = getScrollingElement();
                const docHeight = scrollEl.scrollHeight;
                const viewHeight = window.innerHeight;
                const thumbH = Math.max(30, (viewHeight / docHeight) * viewHeight);
                const trackH = viewHeight - thumbH;
                const delta = e.clientY - dragStartY;
                const scrollDelta = (delta / trackH) * (docHeight - viewHeight);
                window.scrollTo(0, dragStartScroll + scrollDelta);
            };
            const onUp = function () {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        return track;
    }

    function calculateScrollMarkerPosition(highlightedNode) {
        if (!highlightedNode || typeof highlightedNode.getBoundingClientRect !== 'function') return null;
        const clientRect = highlightedNode.getBoundingClientRect();
        if (!clientRect || !clientRect.width || !clientRect.height) return null;
        const scrollEl = getScrollingElement();
        const docHeight = scrollEl.scrollHeight;
        if (!docHeight || !Number.isFinite(docHeight) || docHeight === 0) return null;
        const elementAbsoluteTop = window.scrollY + clientRect.top + (0.5 * clientRect.height);
        const proportion = elementAbsoluteTop / docHeight;
        const markerTop = proportion * window.innerHeight;
        const finalPosition = Math.max(0, Math.min(window.innerHeight - 4, markerTop));
        return Number.isFinite(finalPosition) ? finalPosition : null;
    }

    function createScrollMarker(occurrenceId, topPosition, color, target) {
        if (topPosition === null || topPosition === undefined) return;
        const container = document.getElementById('find-ext-scrollbar-overlay');
        if (!container) return;
        const cssTop = typeof topPosition === 'string' ? topPosition : (topPosition + 'px');
        const marker = document.createElement('div');
        marker.className = 'find-ext-scroll-marker find-ext-marker-' + occurrenceId;
        marker.style.cssText = [
            'display: block',
            'position: absolute',
            'top: ' + cssTop,
            'left: 0',
            'right: 0',
            'width: 100%',
            'height: 4px',
            'min-height: 4px',
            'background-color: ' + (color || '#ffff00'),
            'opacity: 0.85',
            'z-index: 2',
            'box-sizing: border-box',
            'pointer-events: none',
            'margin: 0',
            'padding: 0',
            'border: none',
            'border-radius: 1px'
        ].join('; ');
        (target || container).appendChild(marker);
    }

    function updateScrollMarkerActive(index, options) {
        const markers = Array.from(document.querySelectorAll('.find-ext-scroll-marker'));
        for (let i = 0; i < markers.length; i++) {
            markers[i].style.backgroundColor = options.all_highlight_color.hexColor;
            markers[i].style.zIndex = '2';
        }
        if (index !== null) {
            const activeMarkers = Array.from(document.querySelectorAll('.find-ext-scroll-marker.find-ext-marker-' + index));
            for (let i = 0; i < activeMarkers.length; i++) {
                activeMarkers[i].style.backgroundColor = options.index_highlight_color.hexColor;
                activeMarkers[i].style.zIndex = '3';
            }
        }
    }

    function removeAllScrollMarkers() {
        const track = document.getElementById('find-ext-scrollbar-overlay');
        if (track) {
            if (track._scrollListener) window.removeEventListener('scroll', track._scrollListener);
            if (track._styleEl && track._styleEl.parentNode) track._styleEl.parentNode.removeChild(track._styleEl);
            if (track.parentNode) track.parentNode.removeChild(track);
        }
        // Also remove any injected style that may have been orphaned
        const styleEl = document.getElementById('find-ext-scrollbar-style');
        if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
        // Remove any stray markers
        const strays = Array.from(document.querySelectorAll('.find-ext-scroll-marker'));
        for (const el of strays) { if (el.parentNode) el.parentNode.removeChild(el); }
    }

    function createScrollMarkers(options) {
        if (!options || !options.scroll_markers) return;
        if (!document.body || !document.documentElement) return;

        // Build fake scrollbar track (also clears previous)
        injectFakeScrollbar();

        // Collect unique occurrence IDs from highlight spans
        const occurrenceIds = new Set();
        const allOccurrences = Array.from(document.querySelectorAll("[class*='find-ext-occr']"));
        for (let i = 0; i < allOccurrences.length; i++) {
            const classMatch = allOccurrences[i].getAttribute('class').match(/find-ext-occr(\d+)/);
            if (classMatch && classMatch[1]) occurrenceIds.add(classMatch[1]);
        }

        const fragment = document.createDocumentFragment();
        occurrenceIds.forEach(function (occurrenceId) {
            const occurrenceEl = document.querySelector('.find-ext-occr' + occurrenceId);
            if (occurrenceEl) {
                const markerTop = calculateScrollMarkerPosition(occurrenceEl);
                if (markerTop !== null) {
                    createScrollMarker(occurrenceId, markerTop, options.all_highlight_color.hexColor, fragment);
                }
            }
        });
        const track = document.getElementById('find-ext-scrollbar-overlay');
        if (track) { track.appendChild(fragment); }
    }

    // ── Utility ────────────────────────────────────────────────────────────────────

    function isElementInViewport(element) {
        let elementBoundingRect = element.getBoundingClientRect();
        if (elementBoundingRect.top < 0 || elementBoundingRect.left < 0) {
            return false;
        }

        if (elementBoundingRect.bottom > (window.innerHeight || document.documentElement.clientHeight)) {
            return false;
        }

        if (elementBoundingRect.right > (window.innerWidth || document.documentElement.clientWidth)) {
            return false;
        }

        return true;
    }
});

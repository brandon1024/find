/**
 * Regression tests for background/background.js, focused on the regex
 * escaping logic in self.updateSearch (the code touched by the
 * no-useless-escape fix during the ESLint cleanup pass).
 *
 * Loading strategy: the codebase currently attaches everything to the
 * global `Find` namespace via Find.register(), with no module.exports.
 * We load the raw script text and execute it in this test's context so
 * `self` (the Background namespace) becomes reachable via Find.Background,
 * without needing to modify the source file.
 * */

const fs = require('fs');
const path = require('path');

function loadScript(relativePath) {
    const code = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
    // eslint-disable-next-line no-eval
    eval(code);
}

describe('Background.updateSearch - regex/literal escaping', () => {
    let tab;
    let sendResponse;

    beforeEach(() => {
        jest.resetModules();
        delete global.Find; // force a fresh namespace; previous test's stale closures otherwise persist
        require('../test/mock-extension-apis.js');

        // Full ContentProxy stub - covers every method background.js is known to call.
        // If a test still reports 'invalid_regex', debugLastResponse() below will log the
        // real error (e.g. "X is not a function") so you know exactly what to add here.
        global.Find = global.Find || {};
        global.Find.Background = global.Find.Background || {};
        global.Find.Background.ContentProxy = {
            buildDocumentRepresentation: jest.fn((t, cb) => cb({})),
            clearPageHighlights: jest.fn(),
            fetch: jest.fn(),
            executeScript: jest.fn(),
            seekHighlight: jest.fn(),
            replaceOccurrence: jest.fn(),
            replaceAllOccurrences: jest.fn(),
            restoreWebPage: jest.fn((t, uuids, cb) => cb && cb()),
            followLinkUnderFocus: jest.fn(),
            updatePageHighlights: jest.fn()
        };

        loadScript('background/background.js');

        tab = { id: 1, url: 'https://example.com' };
        sendResponse = jest.fn();
    });

    function debugLastResponse() {
        const response = sendResponse.mock.calls[0] && sendResponse.mock.calls[0][0];
        if (response && response.action === 'invalid_regex') {
            // eslint-disable-next-line no-console
            console.log('DEBUG invalid_regex error:', response.error);
        }
        return response;
    }

    test('literal search escapes regex metacharacters without breaking the match', () => {
        const message = {
            regex: 'a.b*c',
            options: { find_by_regex: false, match_case: true, max_results: 0 }
        };

        global.Find.Background.updateSearch(message, tab, sendResponse);
        const response = debugLastResponse();

        expect(response.action).not.toBe('invalid_regex');
    });

    test('regex mode leaves metacharacters intact for pattern matching', () => {
        const message = {
            regex: 'a.b*c',
            options: { find_by_regex: true, match_case: true, max_results: 0 }
        };

        global.Find.Background.updateSearch(message, tab, sendResponse);
        const response = debugLastResponse();

        expect(response.action).not.toBe('invalid_regex');
    });

    test('every character class metacharacter is escaped correctly in literal mode', () => {
        // Directly exercises the line-160 fix: /[-[\]/{}()*+?.\\^$|]/g
        const metacharacters = '-[]/{}()*+?.\\^$|';
        const message = {
            regex: metacharacters,
            options: { find_by_regex: false, match_case: true, max_results: 0 }
        };

        global.Find.Background.updateSearch(message, tab, sendResponse);
        const response = debugLastResponse();

        expect(response.action).not.toBe('invalid_regex');
    });
});

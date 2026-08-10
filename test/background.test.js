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
        // Fresh Find namespace per test so registrations don't leak across tests
        require('../test/mock-extension-apis.js');
        loadScript('background/background.js');

        tab = { id: 1, url: 'https://example.com' };
        sendResponse = jest.fn();

        // Stub ContentProxy calls used by updateSearch/initializePage
        global.Find.Background.ContentProxy = {
            buildDocumentRepresentation: (t, cb) => cb({}),
            clearPageHighlights: jest.fn(),
            fetch: jest.fn(),
            executeScript: jest.fn()
        };
    });

    test('literal search escapes regex metacharacters without breaking the match', () => {
        const message = {
            regex: 'a.b*c',
            options: { find_by_regex: false, match_case: true, max_results: 0 }
        };

        expect(() => {
            global.Find.Background.updateSearch(message, tab, sendResponse);
        }).not.toThrow();

        // sendResponse should be called with a valid action, not 'invalid_regex'
        const response = sendResponse.mock.calls[0][0];
        expect(response.action).not.toBe('invalid_regex');
    });

    test('regex mode leaves metacharacters intact for pattern matching', () => {
        const message = {
            regex: 'a.b*c',
            options: { find_by_regex: true, match_case: true, max_results: 0 }
        };

        expect(() => {
            global.Find.Background.updateSearch(message, tab, sendResponse);
        }).not.toThrow();

        const response = sendResponse.mock.calls[0][0];
        expect(response.action).not.toBe('invalid_regex');
    });

    test('every character class metacharacter is escaped correctly in literal mode', () => {
        // Directly exercises the line-160 fix: /[-[\]/{}()*+?.\\^$|]/g
        const metacharacters = '-[]/{}()*+?.\\^$|';
        const message = {
            regex: metacharacters,
            options: { find_by_regex: false, match_case: true, max_results: 0 }
        };

        expect(() => {
            global.Find.Background.updateSearch(message, tab, sendResponse);
        }).not.toThrow();

        const response = sendResponse.mock.calls[0][0];
        expect(response.action).not.toBe('invalid_regex');
    });

    test('literal search escapes regex metacharacters without breaking the match', () => {
    const message = {
        regex: 'a.b*c',
        options: { find_by_regex: false, match_case: true, max_results: 0 }
    };

    global.Find.Background.updateSearch(message, tab, sendResponse);

    console.log('DEBUG response:', JSON.stringify(sendResponse.mock.calls[0][0]));

    const response = sendResponse.mock.calls[0][0];
    expect(response.action).not.toBe('invalid_regex');
});
});

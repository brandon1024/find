module.exports = {
    testEnvironment: 'jsdom',
    setupFiles: ['<rootDir>/test/mock-extension-apis.js'],
    testMatch: ['**/test/**/*.test.js'],
    collectCoverageFrom: [
        'background/**/*.js',
        'content/**/*.js',
        'popup/js/**/*.js'
    ]
};

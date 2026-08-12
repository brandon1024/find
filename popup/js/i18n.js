'use strict';

/**
 * Create the Popup BackgroundProxy namespace.
 * */
Find.register('Popup.i18n', function (self) {

    /**
     * Internationalize the browser action popup.
     *
     * Queries all elements with the attributes data-locale-title, data-locale-placeholder and data-locale-text,
     * and replaces the title, placeholder or text with the localized string from the attribute value.
     * */
    self.init = function () {
        const localizedTitles = document.querySelectorAll('[data-locale-title]');
        for (let i = 0; i < localizedTitles.length; i++) {
            const el = localizedTitles[i];
            el.title = self.getLocalizedString(el.dataset.localeTitle);
        }

        const localizedPlaceholders = document.querySelectorAll('[data-locale-placeholder]');
        for (let i = 0; i < localizedPlaceholders.length; i++) {
            const el = localizedPlaceholders[i];
            el.placeholder = self.getLocalizedString(el.dataset.localePlaceholder);
        }

        const localizedText = document.querySelectorAll('[data-locale-text]');
        for (let i = 0; i < localizedText.length; i++) {
            const el = localizedText[i];
            el.innerText = self.getLocalizedString(el.dataset.localeText);
        }
    };

    /**
     * Extract a localized string from the browser i18n util.
     *
     * @param {string} messageKey - The key for the message.
     * @return {string} The localized string.
     * */
    self.getLocalizedString = function (messageKey) {
        return Find.browser.i18n.getMessage(messageKey);
    };
});

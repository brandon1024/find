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
    self.init = function() {
        let localizedTitles = document.querySelectorAll('[data-locale-title]');
        for (let i = 0; i < localizedTitles.length; i++) {
            let el = localizedTitles[i];
            el.title = self.getLocalizedString(el.dataset.localeTitle);
        }

        let localizedPlaceholders = document.querySelectorAll('[data-locale-placeholder]');
        for (let i = 0; i < localizedPlaceholders.length; i++) {
            let el = localizedPlaceholders[i];
            el.placeholder = self.getLocalizedString(el.dataset.localePlaceholder);
        }

        let localizedText = document.querySelectorAll('[data-locale-text]');
        for (let i = 0; i < localizedText.length; i++) {
            let el = localizedText[i];
            el.innerText = self.getLocalizedString(el.dataset.localeText);
        }
    };

    /**
     * Extract a localized string from the browser i18n util.
     *
     * @param {string} messageKey - The key for the message.
     * @return {string} The localized string.
     * */
    self.getLocalizedString = function(messageKey){
        return Find.browser.i18n.getMessage(messageKey);
    };
});
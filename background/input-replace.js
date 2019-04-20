'use strict';

/**
 * Register context menu item for displaying the input-replace tool.
 * */
Find.register('Background.InputReplace', function(self) {

    const INPUT_REPLACE_MENU_ID = 'input-replace';

    Find.browser.contextMenus.create({
        id: INPUT_REPLACE_MENU_ID,
        title: Find.browser.i18n.getMessage('input_replace_tool_context_menu_text'),
        contexts: ['editable']
    });

    Find.browser.contextMenus.onClicked.addListener((info, tab) => {
        if(info.menuItemId === INPUT_REPLACE_MENU_ID) {
            Find.Background.ContentProxy.showInputReplaceDialog(tab);
        }
    });
});

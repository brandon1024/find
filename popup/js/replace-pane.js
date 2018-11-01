'use strict';

/**
 *
 * */
Find.register('Popup.ReplacePane', function (namespace) {

    /**
     *
     * */
    namespace.show = function(value) {
        let el = document.getElementById('replace-body');

        if(value === undefined || value) {
            el.style.display = 'inherit';
        } else {
            el.style.display = 'none';
        }
    };

    /**
     *
     * */
    namespace.enableButtons = function() {
        if(arguments.length === 1 && !arguments[0]) {
            document.getElementById('replace-next-button').disabled = true;
            document.getElementById('replace-all-button').disabled = true;
            return;
        }

        document.getElementById('replace-next-button').disabled = false;
        document.getElementById('replace-all-button').disabled = false;
    }
});
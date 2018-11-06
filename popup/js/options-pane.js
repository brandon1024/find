'use strict';

/**
 * Create the Popup OptionsPane namespace.
 * */
Find.register('Popup.OptionsPane', function (self) {
    let options = {
        find_by_regex: true,
        match_case: true,
        persistent_highlights: false,
        max_results: 0,
        index_highlight_color: {
            hue: 56,
            saturation: 1,
            value: 1,
            hexColor: '#fff000'
        },
        all_highlight_color: {
            hue: 34,
            saturation: 0.925,
            value: 1,
            hexColor: '#ff9813'
        }
    };

    /**
     * Register event handlers.
     * */
    self.init = function() {
        //Toggle switches
        document.getElementById('regex-option-regex-disable-toggle').addEventListener('change', () => {
            options.find_by_regex = document.getElementById('regex-option-regex-disable-toggle').checked;
            notifyBrowserActionOptionsChange();
        });
        document.getElementById('regex-option-case-insensitive-toggle').addEventListener('change', () => {
            options.match_case = document.getElementById('regex-option-case-insensitive-toggle').checked;
            notifyBrowserActionOptionsChange();
        });
        document.getElementById('regex-option-persistent-highlights-toggle').addEventListener('change', () => {
            options.persistent_highlights = document.getElementById('regex-option-persistent-highlights-toggle').checked;
            notifyBrowserActionOptionsChange();
        });

        //Sliders Change Events
        document.getElementById('max-results-slider').addEventListener('change', () => {
            const rangeValues = [1,10,25,50,75,100,150,200,300,400,0];
            let sliderValue = document.getElementById('max-results-slider').value;
            options.max_results = rangeValues[sliderValue];

            notifyBrowserActionOptionsChange();
        });
        document.getElementById('index-highlight-hue-slider').addEventListener('change', () => {
            options.index_highlight_color.hue = document.getElementById('index-highlight-hue-slider').value;

            let RGBColor = HSVToRGB(options.index_highlight_color.hue, options.index_highlight_color.saturation, options.index_highlight_color.value);
            options.index_highlight_color.hexColor = RGBToHexColorCode(RGBColor.red, RGBColor.green, RGBColor.blue);

            notifyBrowserActionOptionsChange();
        });
        document.getElementById('all-highlight-hue-slider').addEventListener('change', () => {
            options.all_highlight_color.hue = document.getElementById('all-highlight-hue-slider').value;

            let RGBColor = HSVToRGB(options.all_highlight_color.hue, options.all_highlight_color.saturation, options.all_highlight_color.value);
            options.all_highlight_color.hexColor = RGBToHexColorCode(RGBColor.red, RGBColor.green, RGBColor.blue);

            notifyBrowserActionOptionsChange();
        });

        //Slider Value Input Events
        document.getElementById('index-highlight-color-value').addEventListener('input', () => {
            let hexColor = document.getElementById('index-highlight-color-value').innerText;
            let RGB = hexColorCodeToRGB(hexColor);
            if(!RGB) {
                return;
            }

            let HSV = RGBToHSV(RGB.red, RGB.green, RGB.blue);
            options.index_highlight_color.hue = HSV.hue;
            options.index_highlight_color.saturation = HSV.saturation;
            options.index_highlight_color.value = HSV.value;
            options.index_highlight_color.hexColor = hexColor;

            applyColorSliderOptions();
            notifyBrowserActionOptionsChange();
        });
        document.getElementById('all-highlight-color-value').addEventListener('input', () => {
            let hexColor = document.getElementById('all-highlight-color-value').innerText;
            let RGB = hexColorCodeToRGB(hexColor);
            if(!RGB) {
                return;
            }

            let HSV = RGBToHSV(RGB.red, RGB.green, RGB.blue);
            options.all_highlight_color.hue = HSV.hue;
            options.all_highlight_color.saturation = HSV.saturation;
            options.all_highlight_color.value = HSV.value;
            options.all_highlight_color.hexColor = hexColor;

            applyColorSliderOptions();
            notifyBrowserActionOptionsChange();
        });

        //Slider Input Events
        document.getElementById('max-results-slider').addEventListener('input', () => {
            const rangeValues = [1,10,25,50,75,100,150,200,300,400,0];
            let sliderValue = document.getElementById('max-results-slider').value;
            options.max_results = rangeValues[sliderValue];
            applyMaxResultsSliderOptions();
        });
        document.getElementById('index-highlight-hue-slider').addEventListener('input', () => {
            options.index_highlight_color.hue = document.getElementById('index-highlight-hue-slider').value;

            let RGBColor = HSVToRGB(options.index_highlight_color.hue, options.index_highlight_color.saturation, options.index_highlight_color.value);
            options.index_highlight_color.hexColor = RGBToHexColorCode(RGBColor.red, RGBColor.green, RGBColor.blue);

            applyColorSliderOptions();
        });
        document.getElementById('all-highlight-hue-slider').addEventListener('input', () => {
            options.all_highlight_color.hue = document.getElementById('all-highlight-hue-slider').value;

            let RGBColor = HSVToRGB(options.all_highlight_color.hue, options.all_highlight_color.saturation, options.all_highlight_color.value);
            options.all_highlight_color.hexColor = RGBToHexColorCode(RGBColor.red, RGBColor.green, RGBColor.blue);

            applyColorSliderOptions();
        });
    };

    /**
     * Show or hide the options pane.
     *
     * @param {boolean} value - Undefined or true to display the options pane, false to hide.
     * */
    self.show = function(value) {
        let el = document.getElementById('regex-options');
        if(value === undefined || value) {
            el.style.display = 'inherit';
        } else {
            el.style.display = 'none';
        }
    };

    /**
     * Toggle the options pane.
     * */
    self.toggle = function() {
        let el = document.getElementById('regex-options');
        if(el.style.display === 'none' || el.style.display === '') {
            self.show(true);
        } else {
            self.show(false);
        }
    };

    /**
     * Return an object of values from the settings fields in the options pane.
     *
     * @return {object} an options object.
     * */
    self.getOptions = function() {
        return options;
    };

    /**
     * Apply an object representing a set of options to the options pane.
     *
     * @param {object} newOptions - The options to apply to the options pane.
     * */
    self.applyOptions = function(newOptions) {
        options = newOptions;
        applyToggleOptions();
        applyMaxResultsSliderOptions();
        applyColorSliderOptions();
    };

    /**
     * Adapt a given object to represent a set of extension options. The main purpose of this function is to ensure
     * that option objects persisted in local storage have all the necessary fields.
     *
     * If a key or value is missing in the object, it is created and assigned a default value.
     *
     * @param {object} [options] - The options object to adapt
     * @return {object} A new object with the fields from the previous object, or default values if missing.
     * */
    self.adaptOptions = function(options) {
        let newOptions = {};
        options = options || {};
        newOptions.find_by_regex = (options.find_by_regex !== undefined) ? options.find_by_regex : true;
        newOptions.match_case = (options.match_case !== undefined) ? options.match_case: true;
        newOptions.persistent_highlights = (options.persistent_highlights !== undefined) ? options.persistent_highlights : false;
        newOptions.max_results = (options.max_results !== undefined) ? options.max_results : 0;

        if(options.index_highlight_color !== undefined) {
            newOptions.index_highlight_color = options.index_highlight_color;
        } else {
            newOptions.index_highlight_color = {hue: 56, saturation: 1, value: 1, hexColor: '#fff000'};
        }

        if(options.all_highlight_color !== undefined) {
            newOptions.all_highlight_color = options.all_highlight_color;
        } else {
            newOptions.all_highlight_color = {hue: 34, saturation: 0.925, value: 1, hexColor: '#ff9813'};
        }

        return newOptions;
    };

    /**
     * Notify the browser action that the user has changed the settings through the options pane.
     * */
    function notifyBrowserActionOptionsChange() {
        Find.Popup.BrowserAction.updateOptions(options);
    }

    /**
     *
     * */
    function applyToggleOptions() {
        document.getElementById('regex-option-regex-disable-toggle').checked = options.find_by_regex;
        document.getElementById('regex-option-case-insensitive-toggle').checked = options.match_case;
        document.getElementById('regex-option-persistent-highlights-toggle').checked = options.persistent_highlights;
    }

    /**
     *
     * */
    function applyMaxResultsSliderOptions() {
        const rangeValues = [1,10,25,50,75,100,150,200,300,400,0];
        document.getElementById('max-results-slider').value = rangeValues.indexOf(options.max_results);
        if(options.max_results === 0) {
            document.getElementById('max-results-slider-value').innerText = '∞';
        } else {
            document.getElementById('max-results-slider-value').innerText = options.max_results.toString();
        }
    }

    /**
     *
     * */
    function applyColorSliderOptions() {
        //Index Highlight Color Options
        document.getElementById('index-highlight-hue-slider').value = options.index_highlight_color.hue;
        document.getElementById('index-highlight-saturation-slider').value = options.index_highlight_color.saturation;

        let lowerColor = HSVToRGB(options.index_highlight_color.hue, 0, options.index_highlight_color.value);
        let lowerHex = RGBToHexColorCode(lowerColor.red, lowerColor.green, lowerColor.blue);
        let upperColor = HSVToRGB(options.index_highlight_color.hue, 1, options.index_highlight_color.value);
        let upperHex = RGBToHexColorCode(upperColor.red, upperColor.green, upperColor.blue);
        document.getElementById('index-highlight-saturation-slider').setAttribute("style", "background: linear-gradient(to right," + lowerHex + "," + upperHex + ");");
        document.getElementById('index-highlight-value-slider').value = options.index_highlight_color.value;

        lowerColor = HSVToRGB(options.index_highlight_color.hue, options.index_highlight_color.saturation, 0);
        lowerHex = RGBToHexColorCode(lowerColor.red, lowerColor.green, lowerColor.blue);
        upperColor = HSVToRGB(options.index_highlight_color.hue, options.index_highlight_color.saturation, 1);
        upperHex = RGBToHexColorCode(upperColor.red, upperColor.green, upperColor.blue);
        document.getElementById('index-highlight-value-slider').setAttribute("style", "background: linear-gradient(to right," + lowerHex + "," + upperHex + ");");
        document.getElementById('index-highlight-color-value').innerText = options.index_highlight_color.hexColor;
        document.getElementById('index-highlight-color-indicator').setAttribute("style", "background: " + options.index_highlight_color.hexColor + ";");

        //All Highlight Color Options
        document.getElementById('all-highlight-hue-slider').value = options.all_highlight_color.hue;
        document.getElementById('all-highlight-saturation-slider').value = options.all_highlight_color.saturation;
        document.getElementById('all-highlight-value-slider').value = options.all_highlight_color.value;
        document.getElementById('all-highlight-color-value').innerText = options.all_highlight_color.hexColor;
        document.getElementById('all-highlight-color-indicator').setAttribute("style", "background: " + options.all_highlight_color.hexColor + ";");
    }

    /**
     * Convert a color in HSV to RGB.
     *
     * @param {number} hue - An integer value from 0 (inclusive) degrees to 360 (exclusive)
     * @param {number} saturation - A value between 0 and 1.
     * @param {number} value - A value between 0 and 1.
     * @return {object} an object with three fields, red green and blue, where each are integers between 0
     * and 255 (inclusive)
     * */
    function HSVToRGB(hue, saturation, value) {
        let chroma = value * saturation;
        let intermediate = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
        let match = value - chroma;

        let rgb = {};
        if (hue >= 0 && hue < 60) {
            rgb.red = chroma;
            rgb.green = intermediate;
            rgb.blue = 0;
        } else if (hue >= 60 && hue < 120) {
            rgb.red = intermediate;
            rgb.green = chroma;
            rgb.blue = 0;
        } else if (hue >= 120 && hue < 180) {
            rgb.red = 0;
            rgb.green = chroma;
            rgb.blue = intermediate;
        } else if (hue >= 180 && hue < 240) {
            rgb.red = 0;
            rgb.green = intermediate;
            rgb.blue = chroma;
        } else if (hue >= 240 && hue < 300) {
            rgb.red = intermediate;
            rgb.green = 0;
            rgb.blue = chroma;
        } else if (hue >= 300 && hue < 360) {
            rgb.red = chroma;
            rgb.green = 0;
            rgb.blue = intermediate;
        }

        rgb.red = Math.floor((rgb.red + match) * 255);
        rgb.green = Math.floor((rgb.green + match) * 255);
        rgb.blue = Math.floor((rgb.blue + match) * 255);

        return rgb;
    }

    /**
     * Convert a color in RGB format to HSV.
     *
     * @param {number} red - An integer between 0 and 255 (inclusive)
     * @param {number} green - An integer between 0 and 255 (inclusive)
     * @param {number} blue - An integer between 0 and 255 (inclusive)
     * @return {object} an object with three keys, hue saturation and value.
     * */
    function RGBToHSV(red, green, blue) {
        red = red / 255;
        green = green / 255;
        blue = blue / 255;

        let maxChroma = Math.max(red, green, blue);
        let minChroma = Math.min(red, green, blue);
        let delta = maxChroma - minChroma;

        let hue;
        if(delta === 0) {
            hue = 0;
        } else if(maxChroma === red) {
            hue = 60 * (((green - blue) / delta) % 6);
        } else if(maxChroma === green) {
            hue = 60 * (((blue - red) / delta) + 2);
        } else if(maxChroma === blue) {
            hue = 60 * (((red - green) / delta) + 4);
        }

        hue = Math.floor(hue);

        return {
            hue: hue < 0 ? hue + 360 : hue,
            saturation: maxChroma !== 0 ? delta / maxChroma : 0,
            value: maxChroma
        }
    }

    /**
     * Convert an RGB triplet in hexadecimal format to their individual RGB components.
     *
     * @param {string} hexCode - A hex color code with a length of 6, optionally preceded by #
     * @return {object} An object with red green and blue keys, or undefined if the hex code is not valid.
     * */
    function hexColorCodeToRGB(hexCode) {
        hexCode = hexCode.replace('#','');
        if(!hexCode.match(/[0-9a-f]{6}/)) {
            return undefined;
        }

        let bigint = parseInt(hexCode, 16);
        return {
            red: (bigint >> 16) & 255,
            green: (bigint >> 8) & 255,
            blue: bigint & 255
        };
    }

    /**
     * Convert RGB components into a hex color code.
     *
     * @param {red} red - An integer between 0 and 255 inclusive
     * @param {red} green - An integer between 0 and 255 inclusive
     * @param {red} blue - An integer between 0 and 255 inclusive
     * @return {string} hex color code from RGB values.
     * */
    function RGBToHexColorCode(red, green, blue) {
        return "#" + ((1 << 24) + (red << 16) + (green << 8) + blue).toString(16).slice(1);
    }
});
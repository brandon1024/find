'use strict';

/**
 * Create the Popup OptionsPane namespace.
 * */
Find.register('Popup.OptionsPane', function (self) {

    /**
     * Default options. This object and all of it's properties are immutable.
     * To use this object, it must be cloned into a mutable object.
     *
     * To clone this object:
     * let mutableOptions = JSON.parse(JSON.stringify(DEFAULT_OPTIONS));
     * */
    const DEFAULT_OPTIONS = Object.freeze({
        find_by_regex: true,
        match_case: true,
        persistent_highlights: false,
        persistent_storage_incognito: false,
        max_results: 0,
        index_highlight_color: Object.freeze({
            hue: 34,
            saturation: 0.925,
            value: 1,
            hexColor: '#ff9813'
        }),
        all_highlight_color: Object.freeze({
            hue: 56,
            saturation: 1,
            value: 1,
            hexColor: '#fff000'
        })
    });

    let options = JSON.parse(JSON.stringify(DEFAULT_OPTIONS));

    /**
     * Register event handlers and initialize options pane.
     * */
    self.init = function() {
        Find.Popup.Storage.retrieveOptions((data) => {
            options = adaptOptions(data);
            applyOptions(options);

            Find.Popup.Storage.saveOptions(options);
            if(Find.incognito) {
                Find.Popup.Storage.lockStorage(!options.persistent_storage_incognito);
            }
        });

        //Add toggle switches event listeners
        document.getElementById('regex-option-regex-disable-toggle').addEventListener('change', (e) => {
            options.find_by_regex = e.target.checked;
            Find.Popup.Storage.saveOptions(options);
            Find.Popup.BrowserAction.updateSearch();
        });
        document.getElementById('regex-option-case-insensitive-toggle').addEventListener('change', (e) => {
            options.match_case = e.target.checked;
            Find.Popup.Storage.saveOptions(options);
            Find.Popup.BrowserAction.updateSearch();
        });
        document.getElementById('regex-option-persistent-highlights-toggle').addEventListener('change', (e) => {
            options.persistent_highlights = e.target.checked;
            Find.Popup.Storage.saveOptions(options);
            Find.Popup.BrowserAction.updateSearch();
        });
        document.getElementById('regex-option-persistent-storage-incognito-toggle').addEventListener('change', (e) => {
            options.persistent_storage_incognito = e.target.checked;

            Find.Popup.Storage.lockStorage(false);
            Find.Popup.Storage.saveOptions(options);
            Find.Popup.Storage.lockStorage(!options.persistent_storage_incognito);
        });

        //Add max results slider event listeners
        let maxResultsSlider = document.getElementById('max-results-slider');
        maxResultsSlider.addEventListener('change', (e) => {
            const rangeValues = [1,10,25,50,75,100,150,200,300,400,0];
            let sliderValue = e.target.value;
            options.max_results = rangeValues[sliderValue];

            Find.Popup.Storage.saveOptions(options);
            Find.Popup.BrowserAction.updateSearch();
        });
        maxResultsSlider.addEventListener('input', (e) => {
            const rangeValues = [1,10,25,50,75,100,150,200,300,400,0];
            let sliderValue = e.target.value;
            options.max_results = rangeValues[sliderValue];

            applyMaxResultsSliderOptions();
        });

        //Add index highlight color slider listeners
        let indexHighlightHueSlider = document.getElementById('index-highlight-hue-slider');
        indexHighlightHueSlider.addEventListener('change', (e) => {
            options.index_highlight_color.hue = e.target.value;
            options.index_highlight_color.hexColor = getIndexHighlightColorCode();

            Find.Popup.Storage.saveOptions(options);
            Find.Popup.BrowserAction.updateSearch();
        });
        indexHighlightHueSlider.addEventListener('input', (e) => {
            options.index_highlight_color.hue = e.target.value;
            options.index_highlight_color.hexColor = getIndexHighlightColorCode();

            applyIndexHighlightColorSliderOptions();
        });
        let indexHighlightSaturationSlider = document.getElementById('index-highlight-saturation-slider');
        indexHighlightSaturationSlider.addEventListener('change', (e) => {
            options.index_highlight_color.saturation = e.target.value;
            options.index_highlight_color.hexColor = getIndexHighlightColorCode();

            Find.Popup.Storage.saveOptions(options);
            Find.Popup.BrowserAction.updateSearch();
        });
        indexHighlightSaturationSlider.addEventListener('input', (e) => {
            options.index_highlight_color.saturation = e.target.value;
            options.index_highlight_color.hexColor = getIndexHighlightColorCode();

            applyIndexHighlightColorSliderOptions();
        });
        let indexHighlightValueSlider = document.getElementById('index-highlight-value-slider');
        indexHighlightValueSlider.addEventListener('change', (e) => {
            options.index_highlight_color.value = e.target.value;
            options.index_highlight_color.hexColor = getIndexHighlightColorCode();

            Find.Popup.Storage.saveOptions(options);
            Find.Popup.BrowserAction.updateSearch();
        });
        indexHighlightValueSlider.addEventListener('input', (e) => {
            options.index_highlight_color.value = e.target.value;
            options.index_highlight_color.hexColor = getIndexHighlightColorCode();

            applyIndexHighlightColorSliderOptions();
        });
        let indexHighlightColorHexCodeField = document.getElementById('index-highlight-color-value');
        indexHighlightColorHexCodeField.addEventListener('input', (e) => {
            let hexColor = e.target.innerText;
            if(!hexColor.match(/#[0-9a-f]{6}/)) {
                return;
            }

            let color = new SimpleColor({hexCode: hexColor});
            options.index_highlight_color.hue = color.getHue();
            options.index_highlight_color.saturation = color.getSaturation();
            options.index_highlight_color.value = color.getValue();
            options.index_highlight_color.hexColor = hexColor;

            applyIndexHighlightColorSliderOptions();
            Find.Popup.Storage.saveOptions(options);
            Find.Popup.BrowserAction.updateSearch();
        });

        //Add all highlight color slider listeners
        let allHighlightHueSlider = document.getElementById('all-highlight-hue-slider');
        allHighlightHueSlider.addEventListener('change', (e) => {
            options.all_highlight_color.hue = e.target.value;
            options.all_highlight_color.hexColor = getAllHighlightColorCode();

            Find.Popup.Storage.saveOptions(options);
            Find.Popup.BrowserAction.updateSearch();
        });
        allHighlightHueSlider.addEventListener('input', (e) => {
            options.all_highlight_color.hue = e.target.value;
            options.all_highlight_color.hexColor = getAllHighlightColorCode();

            applyAllHighlightColorSliderOptions();
        });
        let allHighlightSaturationSlider = document.getElementById('all-highlight-saturation-slider');
        allHighlightSaturationSlider.addEventListener('change', (e) => {
            options.all_highlight_color.saturation = e.target.value;
            options.all_highlight_color.hexColor = getAllHighlightColorCode();

            Find.Popup.Storage.saveOptions(options);
            Find.Popup.BrowserAction.updateSearch();
        });
        allHighlightSaturationSlider.addEventListener('input', (e) => {
            options.all_highlight_color.saturation = e.target.value;
            options.all_highlight_color.hexColor = getAllHighlightColorCode();

            applyAllHighlightColorSliderOptions();
        });
        let allHighlightValueSlider = document.getElementById('all-highlight-value-slider');
        allHighlightValueSlider.addEventListener('change', (e) => {
            options.all_highlight_color.saturation = e.target.value;
            options.all_highlight_color.hexColor = getAllHighlightColorCode();

            Find.Popup.Storage.saveOptions(options);
            Find.Popup.BrowserAction.updateSearch();
        });
        allHighlightValueSlider.addEventListener('input', (e) => {
            options.all_highlight_color.value = e.target.value;
            options.all_highlight_color.hexColor = getAllHighlightColorCode();

            applyAllHighlightColorSliderOptions();
        });
        let allHighlightColorHexCodeField = document.getElementById('all-highlight-color-value');
        allHighlightColorHexCodeField.addEventListener('input', (e) => {
            let hexColor = e.target.innerText;
            if(!hexColor.match(/#[0-9a-f]{6}/)) {
                return;
            }

            let color = new SimpleColor({hexCode: hexColor});
            options.all_highlight_color.hue = color.getHue();
            options.all_highlight_color.saturation = color.getSaturation();
            options.all_highlight_color.value = color.getValue();
            options.all_highlight_color.hexColor = hexColor;

            applyAllHighlightColorSliderOptions();
            Find.Popup.Storage.saveOptions(options);
            Find.Popup.BrowserAction.updateSearch();
        });

        //Add reset all options button listener
        let resetAllOptionsButton = document.getElementById('reset-options-button');
        resetAllOptionsButton.addEventListener('click', () => {
            options = JSON.parse(JSON.stringify(DEFAULT_OPTIONS));
            applyOptions(options);

            Find.Popup.Storage.saveOptions(options);
            Find.Popup.BrowserAction.updateSearch();
        });
    };

    /**
     * Show or hide the options pane.
     *
     * @param {boolean} value - Undefined or true to display the options pane, false to hide.
     * */
    self.show = function(value) {
        let el = document.getElementById('options-body');
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
        let el = document.getElementById('options-body');
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
     * @private
     * @param {object} newOptions - The options to apply to the options pane.
     * */
    function applyOptions(newOptions) {
        applyToggleOptions();
        applyMaxResultsSliderOptions();
        applyIndexHighlightColorSliderOptions();
        applyAllHighlightColorSliderOptions();
    }

    /**
     * Adapt a given object to represent a set of extension options. The main purpose of this function is to ensure
     * that option objects persisted in local storage have all the necessary fields, for backwards compatibility.
     *
     * If a key or value is missing in the object, it is created and assigned a default value. If newOptions
     * is null or undefined, the options object is created.
     *
     * @private
     * @param {object} [newOptions] - The options object to adapt
     * @return {object} A new object with the fields from the previous object, or default values if missing.
     * */
    function adaptOptions(newOptions) {
        const defaultOptions = JSON.parse(JSON.stringify(DEFAULT_OPTIONS));
        newOptions = newOptions || {};

        if(newOptions.find_by_regex === undefined) {
            newOptions.find_by_regex = defaultOptions.find_by_regex;
        }

        if(newOptions.match_case === undefined) {
            newOptions.match_case = defaultOptions.match_case;
        }

        if(newOptions.persistent_highlights === undefined) {
            newOptions.persistent_highlights = defaultOptions.persistent_highlights;
        }

        if(newOptions.persistent_storage_incognito === undefined) {
            newOptions.persistent_storage_incognito = defaultOptions.persistent_storage_incognito;
        }

        if(newOptions.max_results === undefined) {
            newOptions.max_results = defaultOptions.max_results;
        }

        if(newOptions.index_highlight_color === undefined) {
            newOptions.index_highlight_color = defaultOptions.index_highlight_color;
        }

        if(newOptions.all_highlight_color === undefined) {
            newOptions.all_highlight_color = defaultOptions.all_highlight_color;
        }

        return newOptions;
    }

    /**
     * Build a SimpleColor to get the hex color code for the index_highlight_color option.
     *
     * @private
     * @returns {string} A hex color code for the index_highlight_color option.
     * */
    function getIndexHighlightColorCode() {
        return new SimpleColor({
            hue: options.index_highlight_color.hue,
            saturation: options.index_highlight_color.saturation,
            value: options.index_highlight_color.value
        }).getHexColorCode();
    }

    /**
     * Build a SimpleColor to get the hex color code for the all_highlight_color option.
     *
     * @private
     * @returns {string} A hex color code for the all_highlight_color option.
     * */
    function getAllHighlightColorCode() {
        return new SimpleColor({
            hue: options.all_highlight_color.hue,
            saturation: options.all_highlight_color.saturation,
            value: options.all_highlight_color.value
        }).getHexColorCode();
    }

    /**
     * Apply the options for find_by_regex, match_case and persistent_highlights to the various related components.
     *
     * @private
     * */
    function applyToggleOptions() {
        document.getElementById('regex-option-regex-disable-toggle').checked = options.find_by_regex;
        document.getElementById('regex-option-case-insensitive-toggle').checked = options.match_case;
        document.getElementById('regex-option-persistent-highlights-toggle').checked = options.persistent_highlights;
        document.getElementById('regex-option-persistent-storage-incognito-toggle').checked = options.persistent_storage_incognito;
    }

    /**
     * Apply the options for max_results to the various related components.
     *
     * @private
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
     * Apply the options for index_highlight_color to the various related components.
     *
     * @private
     * */
    function applyIndexHighlightColorSliderOptions() {
        //Index Highlight Color Options
        document.getElementById('index-highlight-hue-slider').value = options.index_highlight_color.hue;
        document.getElementById('index-highlight-saturation-slider').value = options.index_highlight_color.saturation;
        document.getElementById('index-highlight-value-slider').value = options.index_highlight_color.value;
        document.getElementById('index-highlight-color-value').innerText = options.index_highlight_color.hexColor;
        document.getElementById('index-highlight-color-indicator').setAttribute("style", "background: " + options.index_highlight_color.hexColor + ";");

        let indexLowerSaturationColor = new SimpleColor({
            hue: options.index_highlight_color.hue,
            saturation: 0,
            value: options.index_highlight_color.value
        });
        let indexUpperSaturationColor = new SimpleColor({
            hue: options.index_highlight_color.hue,
            saturation: 1,
            value: options.index_highlight_color.value
        });
        document.getElementById('index-highlight-saturation-slider').setAttribute("style",
            "background: linear-gradient(to right," + indexLowerSaturationColor.getHexColorCode() + "," + indexUpperSaturationColor.getHexColorCode() + ");");

        let indexLowerValueColor = new SimpleColor({
            hue: options.index_highlight_color.hue,
            saturation: options.index_highlight_color.saturation,
            value: 0
        });
        let indexUpperValueColor = new SimpleColor({
            hue: options.index_highlight_color.hue,
            saturation: options.index_highlight_color.saturation,
            value: 1
        });
        document.getElementById('index-highlight-value-slider').setAttribute("style",
            "background: linear-gradient(to right," + indexLowerValueColor.getHexColorCode() + "," + indexUpperValueColor.getHexColorCode() + ");");
    }

    /**
     * Apply the options for all_highlight_color to the various related components.
     *
     * @private
     * */
    function applyAllHighlightColorSliderOptions() {
        document.getElementById('all-highlight-hue-slider').value = options.all_highlight_color.hue;
        document.getElementById('all-highlight-saturation-slider').value = options.all_highlight_color.saturation;
        document.getElementById('all-highlight-value-slider').value = options.all_highlight_color.value;
        document.getElementById('all-highlight-color-value').innerText = options.all_highlight_color.hexColor;
        document.getElementById('all-highlight-color-indicator').setAttribute("style", "background: " + options.all_highlight_color.hexColor + ";");

        let allLowerSaturationColor = new SimpleColor({
            hue: options.all_highlight_color.hue,
            saturation: 0,
            value: options.all_highlight_color.value
        });
        let allUpperSaturationColor = new SimpleColor({
            hue: options.all_highlight_color.hue,
            saturation: 1,
            value: options.all_highlight_color.value
        });
        document.getElementById('all-highlight-saturation-slider').setAttribute("style",
            "background: linear-gradient(to right," + allLowerSaturationColor.getHexColorCode() + "," + allUpperSaturationColor.getHexColorCode() + ");");

        let allLowerValueColor = new SimpleColor({
            hue: options.all_highlight_color.hue,
            saturation: options.all_highlight_color.saturation,
            value: 0
        });
        let allUpperValueColor = new SimpleColor({
            hue: options.all_highlight_color.hue,
            saturation: options.all_highlight_color.saturation,
            value: 1
        });
        document.getElementById('all-highlight-value-slider').setAttribute("style",
            "background: linear-gradient(to right," + allLowerValueColor.getHexColorCode() + "," + allUpperValueColor.getHexColorCode() + ");");
    }

    /**
     * Constructor for an immutable color object representing an RGB or HSV color.
     *
     * @constructor
     * @param {object} [properties] - Properties used to initialize the color object. If the properties object does not
     * take any of the forms above, it will by default use hue 0, saturation 0 and value 0.
     * */
    let SimpleColor = function(properties) {
        let hue = 0;
        let saturation = 0;
        let value = 0;

        if('hue' in properties && 'saturation' in properties && 'value' in properties) {
            hue = properties.hue;
            saturation = properties.saturation;
            value = properties.value;
        } else if('red' in properties && 'green' in properties && 'blue' in properties) {
            let HSVColor = RGBToHSV(properties.red, properties.green, properties.blue);
            hue = HSVColor.hue;
            saturation = HSVColor.saturation;
            value = HSVColor.value;
        } else if('hexCode' in properties) {
            let RGBColor = hexColorCodeToRGB(properties.hexCode);
            let HSVColor = RGBToHSV(RGBColor.red, RGBColor.green, RGBColor.blue);
            hue = HSVColor.hue;
            saturation = HSVColor.saturation;
            value = HSVColor.value;
        }

        this.getHue = function() {
            return hue;
        };

        this.getSaturation = function() {
            return saturation;
        };

        this.getValue = function() {
            return value;
        };

        this.getHexColorCode = function() {
            let RGBColor = HSVToRGB(hue, saturation, value);
            return RGBToHexColorCode(RGBColor.red, RGBColor.green, RGBColor.blue);
        };

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
    };
});
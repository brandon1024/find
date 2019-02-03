"use strict";

window.browser = (() => {
    return window.chrome || window.browser;
})();

const indexHighlight = "find-ext-index-highlight";
const allHighlight = "find-ext-all-highlight";

browser.runtime.onMessage.addListener((message) => {
    switch(message.action) {
        case 'highlight_update':
            restore(indexHighlight, allHighlight);
            highlightAll(message.occurrenceMap, message.regex, message.options);
            seekHighlight(message.index, message.options);
            break;
        case 'highlight_seek':
            seekHighlight(message.index, message.options);
            break;
        case 'highlight_restore':
            restore(indexHighlight, allHighlight);
            break;
        case 'highlight_replace':
            replace(message.index, message.replaceWith);
            break;
        case 'highlight_replace_all':
            replaceAll(message.replaceWith);
            break;
        case 'follow_link':
            followLinkUnderFocus();
            break;
    }
});

//Highlight all occurrences of regular expression on the page
function highlightAll(occurrenceMap, regex, options) {
    const tags = {
        occIndex: null,
        maxIndex: null,
        openingMarkup: '',
        closingMarkup: '',
        update: function(index) {
            if(this.occIndex !== index) {
                this.occIndex = index;

                //If reached max number of occurrences to show, don't highlight text
                if(this.maxIndex == null || this.occIndex <= this.maxIndex) {
                    let style = 'all: unset; background-color: ' + options.all_highlight_color.hexColor + ';';
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

    if(options && options.max_results !== 0) {
        tags.maxIndex = options.max_results - 1;
    } else {
        tags.maxIndex = null;
    }

    regex = regex.replace(/ /g, '\\s');
    if(!options || options.match_case) {
        regex = new RegExp(regex, 'm');
    } else {
        regex = new RegExp(regex, 'mi');
    }

    //Iterate each text group
    let occIndex = 0;
    for(let index = 0; index < occurrenceMap.groups; index++) {
        let uuids = occurrenceMap[index].uuids;
        let groupText = '';
        let charMap = {};
        let charIndexMap = [];

        //Build groupText, charMap and charIndexMap
        let count = 0;
        for(let uuidIndex = 0; uuidIndex < uuids.length; uuidIndex++) {
            let el = document.getElementById(uuids[uuidIndex]);
            let text = el.childNodes[0].nodeValue;

            if(!text) {
                continue;
            }

            text = decode(text);
            groupText += text;

            for(let stringIndex = 0; stringIndex < text.length; stringIndex++) {
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
        if(!occurrenceMap[index].preformatted) {
            let info;

            //Replace all whitespace characters (\t \n\r) with the space character
            while(info = /[\t\n\r]/.exec(groupText)) {
                charMap[charIndexMap[info.index]].ignorable = true;
                groupText = groupText.replace(/[\t\n\r]/, ' ');
            }

            //Truncate consecutive whitespaces
            while(info = / {2,}/.exec(groupText)) {
                let len = info[0].length;
                let offset = info.index;

                for(let currIndex = 0; currIndex < len; currIndex++) {
                    charMap[charIndexMap[offset + currIndex]].ignorable = true;
                }

                for(let currIndex = 0; currIndex < len-1; currIndex++) {
                    charIndexMap.splice(offset, 1);
                }

                groupText = groupText.replace(/ {2,}/, ' ');
            }

            //Collapse leading or trailing whitespaces
            while(info = /^ | $/.exec(groupText)) {
                let len = info[0].length;
                let offset = info.index;

                for(let currIndex = 0; currIndex < len; currIndex++) {
                    charMap[charIndexMap[offset + currIndex]].ignorable = true;
                }

                for(let currIndex = 0; currIndex < len; currIndex++) {
                    charIndexMap.splice(offset, 1);
                }

                groupText = groupText.replace(/^ | $/, '');
            }
        }

        //Perform complex regex search, updating charMap matched characters
        let info;
        while(info = regex.exec(groupText)) {
            let len = info[0].length;
            let offset = info.index;

            if(len === 0) {
                break;
            }

            let first = charIndexMap[offset];
            let last = charIndexMap[offset + len - 1];
            for(let currIndex = first; currIndex <= last; currIndex++) {
                charMap[currIndex].matched = true;
                if(currIndex === last) {
                    charMap[currIndex].boundary = true;
                }
            }

            for(let currIndex = 0; currIndex < offset+len; currIndex++) {
                charIndexMap.splice(0, 1);
            }

            groupText = groupText.substring(offset+len);
        }

        //Wrap matched characters in an element with class indexHighlight and occurrenceIdentifier
        let matchGroup = {text: '', groupUUID: charMap[0].nodeUUID};
        let inMatch = false;
        for(let key = 0; key < charMap.length; key++) {
            tags.update(occIndex);

            //If Transitioning Into New Text Group
            if(matchGroup.groupUUID !== charMap[key].nodeUUID) {
                if(inMatch) {
                    matchGroup.text += tags.closingMarkup;
                }

                document.getElementById(matchGroup.groupUUID).innerHTML = matchGroup.text;
                matchGroup.text = '';
                matchGroup.groupUUID = charMap[key].nodeUUID;

                if(inMatch) {
                    matchGroup.text += tags.openingMarkup;
                }
            }

            //If Current Character is Matched
            if(charMap[key].matched) {
                if(!inMatch) {
                    inMatch = charMap[key].matched;
                    matchGroup.text += tags.openingMarkup;
                }
            } else {
                if(inMatch) {
                    inMatch = charMap[key].matched;
                    matchGroup.text += tags.closingMarkup;

                    if(key < charMap.length) {
                        occIndex++;
                    }
                }
            }

            matchGroup.text += encode(charMap[key].char);

            if(charMap[key].boundary) {
                inMatch = false;
                matchGroup.text += tags.closingMarkup;
                if(key < charMap.length) {
                    occIndex++;
                }
            }

            //If End of Map Reached
            if(key === charMap.length-1) {
                if(inMatch) {
                    matchGroup.text += tags.closingMarkup;
                    occIndex++;
                }

                document.getElementById(matchGroup.groupUUID).innerHTML = matchGroup.text;
            }
        }
    }
}

//Move highlight focused text to a given occurrence index
function seekHighlight(index, options) {
    if(index === null || options == null) {
        return;
    }

    let previousIndex = Array.from(document.querySelectorAll('.' + indexHighlight));
    if(previousIndex && previousIndex.length) {
        for(let elsIndex = 0; elsIndex < previousIndex.length; elsIndex++) {
            let style = 'all: unset; background-color: ' + options.all_highlight_color.hexColor + ';';
            previousIndex[elsIndex].classList.remove(indexHighlight);
            previousIndex[elsIndex].setAttribute("style", style);
        }
    }

    let els = Array.from(document.querySelectorAll('.find-ext-occr' + index));
    if(els == null || els.length === 0) {
        return;
    }

    for(let elsIndex = 0; elsIndex < els.length; elsIndex++) {
        let style = 'all: unset; background-color: ' + options.index_highlight_color.hexColor + ';';
        els[elsIndex].classList.add(indexHighlight);
        els[elsIndex].setAttribute("style", style);
    }

    els[0].scrollIntoView(true);

    let docHeight = Math.max(document.documentElement.clientHeight, document.documentElement.offsetHeight, document.documentElement.scrollHeight);
    let bottomScrollPos = window.pageYOffset + window.innerHeight;
    if(bottomScrollPos + 100 < docHeight) {
        window.scrollBy(0, -100);
    }
}

function replace(index, replaceWith) {
    let els = Array.from(document.querySelectorAll('.find-ext-occr' + index));

    if(els.length === 0) {
        return;
    }

    els.shift().innerText = replaceWith;
    for(let elsIndex = 0; elsIndex < els.length; elsIndex++) {
        els[elsIndex].innerText = '';
    }
}

function replaceAll(replaceWith) {
    let els = Array.from(document.querySelectorAll("[class*='find-ext-occr']"));

    let currentOccurrence = null;
    for(let index = 0; index < els.length; index++) {
        let el = els[index];
        let occrClassName = el.getAttribute('class').match(/find-ext-occr\d*/)[0];
        let occurrenceFromClass = parseInt(occrClassName.replace('find-ext-occr', ''));

        if(occurrenceFromClass !== currentOccurrence) {
            currentOccurrence = occurrenceFromClass;
            el.innerText = replaceWith
        } else {
            el.innerText = '';
        }
    }
}

//Bubbling up the DOM tree, locate any highlighted anchor element and follow link once found
function followLinkUnderFocus() {
    let els = document.getElementsByClassName(allHighlight);
    for(let index = 0; index < els.length; index ++) {
        let el = els[index];
        while (el.parentElement) {
            el = el.parentElement;
            if (el.tagName.toLowerCase() === 'a') {
                return el.click();
            }
        }
    }
}

//Unwrap all elements that have the indexHighlight/allHighlight class
function restore() {
    for(let argIndex = 0; argIndex < arguments.length; argIndex++) {
        let els = Array.from(document.querySelectorAll('.' + arguments[argIndex]));

        for(let elsIndex = 0; elsIndex < els.length; elsIndex++) {
            let el = els[elsIndex];
            let parent = el.parentElement;

            while(el.firstChild) {
                parent.insertBefore(el.firstChild, el);
            }

            parent.removeChild(el);
            parent.normalize();
        }
    }
}

//Remove class from all element with that class
function restoreClass() {
    for(let argIndex = 0; argIndex < arguments.length; argIndex++) {
        let els = Array.from(document.querySelectorAll('.' + arguments[argIndex]));

        for(let elsIndex = 0; elsIndex < els.length; elsIndex++) {
            els[elsIndex].classList.remove(arguments[argIndex]);
        }
    }
}
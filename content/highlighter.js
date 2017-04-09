//==============================================================================
//HIGHLIGHTER WILL REQUIRE MODIFICATIONS TO REFLECT WORKING CONTENT SCRIPT LOGIC
//On update, will get passed list of UUIDs that will associate with elements in
//the DOM.
//==============================================================================

var uuid = "62ffb48f-be61-480d-9b32-afe9461fb6b5";

/**
 * This function highlights the targeted string in the regex search
 * @param el is the DOM element
 * @param pat is the regex pattern entered in the search bar
 * @returns {void|string|XML} returns the DOM element with values highlighted
 */
function highlightAllMatch(el, pat) {
    return el.replace(pat, function (x){return "<span id='" + uuid + "' style='background-color:#FFFF00'>" + x + "</span>";});
}

/**
 * This function will highlight a marked DOM text selection in orange
 * @param el is the DOM element
 * @returns {string} returns the marked DOM element with orange highlighted
 */
function setHighlightOrange(el) {
    return el.getElementById(uuid).style.backgroundColor = "#FFA500";
}

/**
 * This function will highlight a marked DOM text selection in yellow
 * @param el is the DOM element
 * @returns {string} returns the marked DOM searchable text yellow highlighted
 */
function setHighlightYellow(el) {
    return el.getElementById(uuid).style.backgroundColor = "#FFFF00";
}

/**
 * This function removes all highlighting which contains specific find+ ID
 * @param el is the DOM element
 * @returns {*|jQuery} returns un-highlighted DOM element
 */
function removeAllHighlight(el) {
    return $(uuid, $(el).context).contents().unwrap();
}
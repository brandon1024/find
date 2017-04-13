
window.onload = function() {
    retrieveLastSearch();

    document.getElementById('closeBtn').onclick = closeExtension;
    document.getElementById('searchField').addEventListener('keyup', storeSearchEntry);
};

function closeExtension() {
    window.close();
}

/**
 * retrieves current text from search field and stores it.
 */
function storeSearchEntry() {
    var inputVal =  document.getElementById('searchField').value;

    chrome.storage.sync.set({'previousSearch': inputVal}, function() {
        console.log('Previous search: \"' + inputVal + '\" saved');
    });
}

/**
 * retrieves previous search term from storage and sets is as current
 * value for search field.
 */
function retrieveLastSearch(callback) {
    console.log("Attempting to retrieve last search field entry.");

    chrome.storage.sync.get('previousSearch', function (obj) {
        console.log(obj);
        console.log('Setting input field value to: \"' + obj['previousSearch'] + '\"');
        document.getElementById('searchField').value = obj['previousSearch'];
        inputSelect();
    });
}

/**
 * selects the contects of the search field.
 */
function inputSelect() {
    console.log("Selecting contents of Search Field");
    document.getElementById("searchField").select();
}

window.onload = function() {
    document.getElementById('closeBtn').onclick = closeExtension;
    document.getElementById('searchField').addEventListener('keyup', updateLocalStorage);
    retrieveLastSearch();
};

function closeExtension() {
    window.close();
}

/**
 * Converts current search field text to JSON payload
 * and send to storeDataToLocalStorage() to store.
 */
function updateLocalStorage() {
  //Create a JSON payload to send to local storage
  var payload = {'previousSearch': document.getElementById('searchField').value};
  storeDataToLocalStorage(payload);
}

/**
 * Stores input payload in local storage
 * @param payload JSON object to be stored
 */
function storeDataToLocalStorage(payload) {
  //update a value in storage.
  chrome.storage.local.set({'payload': payload}, function callback() {
    //LOGGING
    console.log('Previous search: \"' + payload.previousSearch + '\" saved');
  });
}

/**
 * Retrieve locally stored payload to be
 * handled by handleDataFromStorage()
 */
function retrieveLastSearch() {
  chrome.storage.local.get('payload', function(data) {
    // LOGGING
    console.log('Receiving Payload:', data, ' from local storage');

    handleDataFromStorage(data)
  });
}

/**
 * Receives payload from storage and gets previousSearch JSON
 * to be sent to changeSearchFieldText()
 * @param data is received payload to parse
 */
function handleDataFromStorage(data) {
  var storagePayload = data.payload;

  //grab data we want from payload
  var previousSearchText = storagePayload.previousSearch;

  changeSearchFieldText(previousSearchText);
}

/**
 * gets previous search text and sets it to search field text,
 * then selects search field
 * @param text to fill search field value
 */
function changeSearchFieldText(text) {
  document.getElementById('searchField').value = text;
  document.getElementById('searchField').select();
}
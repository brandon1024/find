window.onload = function() {
    document.getElementById('SearchNextBtn').onclick = searchText;
};
function searchText() {
    var search = document.getElementById('SearchField').value;
    if(search) {
        chrome.tabs.query({active:true,currentWindow:true},function(tabs) {
            window.alert('sup')
        });
    }
}
window.onload = function() {
    document.getElementById('searchNextBtn').onclick = searchText;
};
function searchText() {
    var search = document.getElementById('searchField').value;
    if(search) {
        chrome.tabs.query({active:true,currentWindow:true},function(tabs) {
            window.alert('sup')
        });
    }
}
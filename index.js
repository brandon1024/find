var occurrenceNumber = 0;
var totalOccurrences = 0;

window.onload = function() {
    document.getElementById('searchField').oninput = update;
    document.getElementById('searchNextBtn').onclick = highlightFirst;
    document.getElementById('closeBtn').onclick = closeExtension;
};

function update() {
    highlightAll();
    updateOccurrencesText();
}

function highlightAll() {
    var regex = document.getElementById('searchField').value;
    var elements = document.getElementsByTagName('*');

    for(index = 0; index < elements.length; index++) {
        var element = elements[index];

        for(childIndex = 0; childIndex < element.childNodes.length; childIndex++) {
            var node = element.childNodes[childIndex];

            if(node.nodeType === 3 && node.nodeValue === regex) {
                node.nodeValue = "<span style=\"background-color: #FFFF00\">" + node.nodeValue + "</span>";
            }
        }
    }
}

function highlightFirst() {

}

function updateOccurrencesText() {
    document.getElementById('occurrences').innerHTML = occurrenceNumber + "/" + totalOccurrences;
}

function searchPageForRegex() {
    //stub
}

function closeExtension() {
    window.close();
}
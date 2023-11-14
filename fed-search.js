// Set this flag to true for local development and false for production
var isDevEnvironment = true;

function performSearch() {
    if (isDevEnvironment) {
        fetch('./example-data/federated-search/bioportal-search-results.json')
            .then(response => response.json())
            .then(data => displayResults(data))
            .catch(error => console.error('Error fetching local data:', error));
    } else {
        // Replace with your actual API URL and parameters
        var apiUrl = 'https://data.bioontology.org/search?q=melanoma&apikey=YOUR_API_KEY';

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => displayResults(data))
            .catch(error => console.error('Error fetching data from API:', error));
    }
}

function displayResults(data) {
    var resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = ''; // Clear existing results

    var table = document.createElement('table');
    table.className = 'search-result-table';
    var headerRow = table.insertRow(-1);
    ['Result', 'Property', 'Value'].forEach(function (headerTitle) {
        var headerCell = document.createElement('th');
        headerCell.textContent = headerTitle;
        headerRow.appendChild(headerCell);
    });

    data.collection.forEach(function (item, index) {
        table.appendChild(renderResult(item, index));
    });

    resultsContainer.appendChild(table);
}

var propertiesToDisplay = ['semanticType', '@id', 'prefLabel', 'cui', 'semanticType', 'ontologyType'];

function renderResult(item, index) {
    var fragment = document.createDocumentFragment();

    propertiesToDisplay.forEach(function (property, propIndex) {
        var row = document.createElement('tr');

        // Add result number in the first row of each result only
        if (propIndex === 0) {
            var resultCell = document.createElement('td');
            resultCell.textContent = index + 1;
            resultCell.rowSpan = propertiesToDisplay.length; // Span through all properties
            row.appendChild(resultCell);
        }

        var propertyCell = document.createElement('td');
        var valueCell = document.createElement('td');


        var contextUrl = item['@context'] && item['@context'][property];
        var propertyElement = document.createElement(contextUrl ? 'a' : 'span');
        if (contextUrl) {
            propertyElement.href = contextUrl;
        }
        propertyElement.textContent = property === '@id' ? 'ID' : property;
        propertyCell.appendChild(propertyElement);

        var value = item[property];
        // create link using property value if property is @id
        if (property === '@id') {
            var idLink = document.createElement('a');
            idLink.href = item[property];
            idLink.textContent = item[property];
            valueCell.appendChild(idLink);
        } else {
            valueCell.textContent = Array.isArray(value) ? value.join(', ') : (value ? value : 'N/A');
        }


        row.appendChild(propertyCell);
        row.appendChild(valueCell);
        fragment.appendChild(row);
    });

    return fragment;
}


// Set this flag to true for local development and false for production
var isDevEnvironment = false;

document.addEventListener('DOMContentLoaded', function () {
    // Call the performSearch function when the page content is fully loaded
    performSearch();
});

function performSearch() {
    // Check if it's a development environment
    if (isDevEnvironment) {
        // Fetch local data for development environment
        fetch('./example-data/federated-search/bioportal-search-results.json')
            .then(response => response.json())
            .then(data => displayResults(data))
            .catch(error => console.error('Error fetching local data:', error));
    } else {
        // Extract 'q' parameter from the URL
        const params = new URLSearchParams(window.location.search);
        const searchTerm = params.get('q');
        const earthPortalAPIKey = params.get('epapikey');
        const bioPortalAPIKey = params.get('bpapikey');

        // Check if searchTerm is not null or empty
        if (searchTerm) {
            // API URLs
            var apiUrl1 = `https://data.bioontology.org/search?q=${encodeURIComponent(searchTerm)}&apikey=${encodeURIComponent(bioPortalAPIKey)}`;
            var apiUrl2 = `https://earthportal.eu:8443/search?q=${encodeURIComponent(searchTerm)}&apikey=${encodeURIComponent(earthPortalAPIKey)}`;
            // Fetch from the first API
            fetch(apiUrl1)
                .then(response => response.json())
                .then(data => displayResults(data, 'left-search-results')) // Display in left pane
                .catch(error => console.error('Error fetching data from first API:', error));

            // Fetch from the second API
            fetch(apiUrl2)
                .then(response => response.json())
                .then(data => displayResults(data, 'right-search-results')) // Display in right pane
                .catch(error => console.error('Error fetching data from second API:', error));
        } else {
            console.error('No search term provided');
            // Handle the case where no search term is provided
        }
    }
}

function displayResults(data, targetId) {
    var resultsContainer = document.getElementById(targetId); // Use targetId to get the correct container
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

var propertiesToDisplay = ['@id', 'prefLabel', 'cui', 'ontologyType'];

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

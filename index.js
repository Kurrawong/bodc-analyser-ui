const useSampleFile = ''
var activeTabId = '#metadata';

// const useSampleFile = './2023-10-03_sample_response.json'

function setElementHeightToFillScreen(elementId) {
    var element = document.getElementById(elementId);
    var screenHeight = window.innerHeight;
    var elementOffsetTop = element.offsetTop;
    var elementHeight = screenHeight - elementOffsetTop - 20;

    element.style.height = elementHeight + "px";
}

function setElementWidthToFillScreen(elementId) {
    var element = document.getElementById(elementId);

    element.style.width = element.clientWidth + "px";
    element.style.maxWidth = element.clientWidth + "px";
}

setElementWidthToFillScreen('xml');

let currentPage = 1;
const resultsPerPage = 10;
let totalResults = 0;
let totalPages = 1;
let currentIds = [];

const loadPageResults = async (page) => {
    const startIndex = (page - 1) * resultsPerPage + 1;
    const response = await fetch(`https://seadatanet.geodab.eu/gs-service/services/essi/view/fair-ease/opensearch/query?si=${startIndex}&ct=${resultsPerPage}&...&sources=${currentIds.join(',')}`);
    const xml = await response.text();

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(xml, 'application/xml');

    const atomNamespace = 'http://www.w3.org/2005/Atom';
    const entryElements = xmlDoc.getElementsByTagNameNS(atomNamespace, 'entry');

    const totalResultsElement = xmlDoc.querySelector('totalResults');
    if (totalResultsElement) {
        totalResults = parseInt(totalResultsElement.textContent);
        totalPages = Math.ceil(totalResults / resultsPerPage);
    }

    const entries = [];
    for (const entryNode of entryElements) {

        const entry = {
            title: entryNode.querySelector('title').textContent,
            summary: entryNode.querySelector('summary').textContent,
            id: entryNode.querySelector('id').textContent,
            // sourceId: entryNode.querySelector('sourceId').textContent,
            // sourceTitle: entryNode.querySelector('sourceTitle').textContent,
            // summary: entryNode.querySelector('summary').textContent,
            // box: entryNode.querySelector('box').textContent,
            logo: entryNode.querySelector('logo') ? entryNode.querySelector('logo').textContent : 'https://api.geodab.eu/docs/assets/img/no_overview_576.png',
            // Add more attributes as needed
        };
        xmlMap[entry.id] = entry.title;
        entries.push(entry);
    }

    document.getElementById('results').innerHTML = `<ul id="xml-list" class="collection">${entries.map(e =>
        `<li data-id="${e.id}" onClick="this.classList.contains('selected') ? this.classList.remove('selected') : this.classList.add('selected');getHtml();" class="collection-item avatar hover">
            <img src="${e.logo}" alt="" class="circle" />
            <div class="title">
                <span class="title"><span title="${e.id}">${e.id}</span><br/><b title="${e.title}">${e.title}</b></span>
                <p title="${e.summary.length > 103 ? e.summary : ''}">${e.summary.length > 103 ? e.summary.substring(0, 100) + '...' : e.summary}</p>
            </div>
        </li>`
    ).join('')}</ul>`;
    updatePaginationControls();
};

const updatePaginationControls = () => {
    document.getElementById('prevButton').disabled = currentPage <= 1;
    document.getElementById('nextButton').disabled = currentPage >= totalPages;
};

const loadResults = async () => {
    checkboxes = document.querySelectorAll('input[type="checkbox"][data-group="datasets"]');
    currentIds = [];
    checkboxes.forEach(function (checkbox) {
        if (checkbox.checked) {
            currentIds.push(checkbox.getAttribute('value'));
        }
    });
    if (currentIds.length == 0) {
        document.getElementById('numResults').innerHTML = ' (select a source)';
        document.getElementById('results').innerHTML = '';
        return;
    }
    currentPage = 1;
    loadPageResults(currentPage);
};

document.getElementById('prevButton').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        loadPageResults(currentPage);
    }
});

document.getElementById('nextButton').addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        loadPageResults(currentPage);
    }
});


function debounce(func, delay) {
    let debounceTimer;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
}

const fetchConfig = async () => {
    try {
        const url = document.getElementById('endpoint').value;
        const response = await fetch(`${url}/config`);
        const data = await response.json();
        return data;
    } catch (ex) {
        console.log(ex);
    }
    return {};
}

const buildConfigOptions = async () => {
    const config = await fetchConfig();
    const optionsContainer = document.getElementById('config-options');

    let str = '';
    Object.keys(config).forEach(optionName => {
        const option = config[optionName];

        if (optionName === 'Methods') {
            str += `<div><b>${optionName}</b></div>`;
            Object.keys(option).forEach(subOptionName => {
                const subOption = option[subOptionName];
                if (subOptionName === activeTabId.replace('#', '')) {
                    Object.keys(subOption).forEach(method => {
                        const methodLabel = subOption[method];
                        str += `
                        <label>
                            <input
                                class="filled-in"
                                data-parent="${optionName}"
                                value="${method}"
                                type="checkbox"
                                checked="checked"
                                data-group="config-options"
                                />
                            <span>${methodLabel}</span>
                        </label>`;
                    });
                }
            });
        } else {
            // For other options like 'Restrict to Themes'
            str += `<div><b>${optionName}</b></div>` +
                Object.keys(option).map(optionLink => {
                    return `
                    <label>
                        <input
                            class="filled-in"
                            data-parent="${optionName}" 
                            value="${optionLink}"
                            type="checkbox"
                            data-group="config-options"
                            />
                        <span>${option[optionLink]}</span>
                    </label>`;
                }).join('');
        }
    });

    optionsContainer.innerHTML = str;
};

// Call this function initially and whenever the active tab changes
buildConfigOptions();

const getConfig = () => {
    const optionsContainer = document.getElementById('config-options');
    const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]:checked');

    const selectedOptions = {};

    checkboxes.forEach(checkbox => {
        const parent = checkbox.getAttribute('data-parent');
        const value = checkbox.value;

        if (!selectedOptions[parent]) {
            selectedOptions[parent] = [];
        }

        selectedOptions[parent].push(value);
    });

    const urlParams = new URLSearchParams();

    for (const key of Object.keys(selectedOptions)) {
        urlParams.append(key, selectedOptions[key].join(','));
    }

    return '?' + urlParams.toString();
};

// Adding event listener to the URL input field
document.getElementById('endpoint').addEventListener('input', debounce(buildConfigOptions, 500));

const analyser = async () => {
    try {
        const url = document.getElementById('endpoint').value;
        const configParams = getConfig();
        const analyserURL = `${url}/process-metadata${configParams}`;

        const xmlfile = document.getElementById('currentFile')?.getAttribute('href');
        const threshold = 1.0 //document.getElementById('threshold').value;

        if (analyserURL == '') {
            throw new Error('Enter an analyser endpoint url');
        }

        if (threshold == '') {
            throw new Error('Select a threshold');
        }

        // Prepare the payload
        const payload = {
            xml: xmlSelected,
            threshold: threshold
        };

        document.getElementById('table-output').innerHTML = `<div class="progress"><div class="indeterminate"></div></div>`;

        let response;
        if (activeTabId === "#netcdf") {
            // Prepare the FormData payload for file upload
            let formData = new FormData();
            formData.append('Methods', 'netcdf'); // Hardcoded to 'netcdf'
            formData.append('threshold', threshold); // Ensure 'threshold' is defined and accessible

            // Append files from uploadedFiles to formData with unique doc IDs
            uploadedFiles.forEach((file) => {
                // const guid = generateGUID();
                formData.append(file.name, file, file.name);
            });

            // Send the data with files
            response = await fetch(analyserURL, {
                method: 'POST',
                body: formData // Sending FormData
            });
            // Handle the response here
        } else {
            if (useSampleFile != '') {
                response = await fetch(useSampleFile, {method: 'GET'});
            } else {
                if (Object.keys(xmlSelected) == 0) {
                    throw new Error('Select a metadata record to analyse');
                }

                response = await fetch(analyserURL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
            }
        }
        const data = await response.json();

        displayTermsNotFound(data);
        displayTable(data);

    } catch (ex) {
        document.getElementById('table-output').textContent = ex.message;
        console.log(ex);
    }
};

function generateGUID() {
    // Simple GUID generator - you can replace it with a more robust version
    return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

String.prototype.hashCode = function () {
    var hash = 0,
        i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
        chr = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}


function displayTable(responseData) {
    console.log("RESULTS", responseData);

    // Mapping each document key to a section with a header and a table.
    const tableOutput = document.getElementById('table-output');

    Object.keys(responseData).forEach(documentKey => {
        const documentData = responseData[documentKey];
        const documentDiv = document.createElement('div');

        const documentTitle = document.createElement('h2');
        documentTitle.innerHTML = `Document: <b>${documentKey in xmlMap ? xmlMap[documentKey] : documentKey}</b>`;
        documentDiv.appendChild(documentTitle);

        Object.keys(documentData).forEach(methodKey => {
            const methodTitle = document.createElement('h2');
            methodTitle.innerHTML = `Analyser Method: <b>${methodKey}</b>`;
            documentDiv.appendChild(methodTitle);

            const methodDiv = document.createElement('div');
            methodDiv.className = 'tbl';
            methodDiv.id = `tbl_${(documentKey + methodKey).hashCode()}`;
            documentDiv.appendChild(methodDiv);
        });

        tableOutput.appendChild(documentDiv);
    });


    const columnsToHide = ["TargetElement", "MethodSubType", "Container", "ContainerLabel"];

    // Iterating over documents.
    for (const documentKey of Object.keys(responseData)) {
        const documentData = responseData[documentKey];

// Iterating over methods within each document.
        for (const methodKey of Object.keys(documentData)) {
            const methodData = documentData[methodKey];
            const data = methodData.results.bindings;
            const columns = methodData.head.vars;

            // Check if the data array is empty
            if (data.length === 0) {
                // Get the specific container where you want to display the message
                const container = document.getElementById(`tbl_${(documentKey + methodKey).hashCode()}`);

                // Set the message in the specific container
                container.innerHTML = `<p><i>No results found for method: ${methodKey}</i></p>`;
                continue; // skip this iteration and continue with the next one
            }

            let metadataElementColumns = [];
            let otherColumns = [];

            columns.forEach(col => {
                const isColumnHidden = columnsToHide.includes(col);

                if (col === 'TargetElement') {
                    metadataElementColumns.push({
                        title: 'TargetElement',
                        field: 'TargetElement',
                        mutator: (value) => value.value,
                        visible: !isColumnHidden
                    });
                } else if (col === 'SearchTerm') {
                    otherColumns.push({
                            title: col,
                            field: col,
                            width: '28%',
                            formatter: function (cell, formatterParams, onRendered) {
                                // Get the value of the cell
                                let value = cell.getValue().value;

                                // Create a container div
                                let container = document.createElement('div');

                                // Create the text span
                                let textSpan = document.createElement('span');
                                textSpan.textContent = value;
                                container.appendChild(textSpan);

                                // Create a link element
                                let link = document.createElement('a');
                                link.href = 'fed-search.html?q=' + encodeURIComponent(value) +
                                    '&epapikey=' + encodeURIComponent(earthPortalAPIKey) +
                                    '&bpapikey=' + encodeURIComponent(bioPortalAPIKey);
                                link.target = '_blank'; // Open in a new tab

                                let img = document.createElement('img');
                                img.src = 'external_search.png'; // Path to your logo image
                                img.alt = 'Search';
                                img.style.marginLeft = '5px'; // Add some space between the text and the image

                                // Resize the image
                                img.style.width = '20px';  // Set the width of the image
                                img.style.height = '20px'; // Set the height of the image

                                // Append the image to the link, then the link to the container
                                link.appendChild(img);
                                container.appendChild(link);

                                return container;
                            },
                            visible: !isColumnHidden
                        }
                    );
                } else if (col === 'MatchURI') {
                    otherColumns.push({
                        title: "Match Concept",
                        field: col,
                        width: "35%",
                        formatter: "link",
                        formatterParams: {
                            label: (cell) => cell.getData().MatchTerm.value,
                            url: (cell) => cell.getData().MatchURI.value,
                            target: "_blank",
                        },
                        visible: !isColumnHidden
                    });
                } else if (col === 'ContainerLabel') {
                    otherColumns.push({
                        title: 'Collection',
                        field: col,
                        width: "12%",
                        formatter: "link",
                        formatterParams: {
                            label: (cell) => {
                                const value = cell.getData().ContainerLabel.value;
                                return value && value.trim() !== "" ? value : "Unknown";
                            },
                            url: (cell) => cell.getData().Container,
                            target: "_blank",
                        },
                        visible: !isColumnHidden
                    });
                } else if (col === 'Categories') {
                    otherColumns.push({
                        title: "Vocab Categories",
                        field: col,
                        width: "13%",
                        mutator: (value) => value ? value.value : null, // Handles null values                        visible: !isColumnHidden
                    });
                } else if (col !== 'MatchTerm') {
                    otherColumns.push({
                        title: col,
                        field: col,
                        width: "12%",
                        mutator: (value) => value ? value.value : null,
                        visible: !isColumnHidden
                    });
                }
            });

            const methodSubTypeFormatter = function (cell, formatterParams, onRendered) {
                // get cell value
                const value = cell.getValue();

                // check if value is "Proximity Match"
                if (value === "Proximity Match") {
                    cell.getElement().setAttribute('title', 'Search terms within N characters of each other');
                }

                return value; // return the value to be displayed in the
            };
            const tableId = `tbl_${(documentKey + methodKey).hashCode()}`;

            const groupOrder = ["URI Match", "Exact Match", "Proximity Match", "Wildcard Match"]; // Define your custom order

            const table = new Tabulator(`#${tableId}`, {
                data: data,
                columns: [...metadataElementColumns, ...otherColumns],
                groupBy: [
                    "TargetElement",
                    "MethodSubType",
                    function (data) {
                        return data.ContainerLabel ? data.ContainerLabel.value : "Unknown";
                    }
                ],
                groupValues: [false, groupOrder, false], // Define the order of the groups
                groupHeader: function (value, count, data, group) {
                    const field = group.getField();
                    const tooltips = {
                        "Proximity Match": "Proximity Matches are only searched for when an Exact Match for a term is not found.",
                        "Exact Match": "An Exact Match is where the search term exactly matches a term in the Knowledge Base",
                    };

                    let tooltipText = tooltips[value] ? `title="${tooltips[value]}"` : "";

                    if (data[0] && data[0].ContainerLabel && data[0].ContainerLabel.value === value) {
                        const url = data[0].Container;
                        const label = value !== "" ? value : "Collection: Unknown";
                        if (value === "") {
                            return `<span ${tooltipText} style='color:#000000'>${label}</span><span style='color:#d00; margin-left:10px;'>(${count} items)</span>`;
                        }
                        return `<a href="${url}" target="_blank">${label}</a> <span style='color:#d00; margin-left:10px;'>(${count} items)</span>`;
                    }

                    return `<span ${tooltipText} style='color:#000000'>${value}</span><span style='color:#d00; margin-left:10px;'>(${count} items)</span>`;
                },


                groupStartOpen: (value, count, data, group) => {
                    const field = group.getField();

                    // Open the group if the field is 'TargetElement'
                    if (field === "TargetElement") {
                        return true;
                    }

                    // Otherwise, keep the group closed
                    return false;
                }
            });
        }
    }
}

function displayTermsNotFound(responseData) {
    const termsNotFoundDiv = document.getElementById('table-output');
    termsNotFoundDiv.innerHTML = ''; // Clear previous content

    // Create a button element that will work as a header
    const headerButton = document.createElement('button');
    headerButton.textContent = 'Terms not found - search in BioPortal and EarthPortal';
    headerButton.className = 'header-button'; // Add your button class for styling

    // Create a span element for the +/- icon
    const twistie = document.createElement('span');
    twistie.className = 'header-twistie';
    twistie.textContent = '+';
    twistie.style.marginLeft = '10px'; // Space between text and icon

    // Append the twistie to the button
    headerButton.appendChild(twistie);

    // Append the button to the termsNotFoundDiv
    termsNotFoundDiv.appendChild(headerButton);

    // Create a twistie (collapsible) container
    const collapsibleContainer = document.createElement('div');
    collapsibleContainer.className = 'collapsible-content';

    // Append the collapsible container to termsNotFoundDiv
    termsNotFoundDiv.appendChild(collapsibleContainer);

    // Event listener for the button click
    headerButton.addEventListener('click', function () {
        collapsibleContainer.classList.toggle('active');
        twistie.textContent = collapsibleContainer.classList.contains('active') ? '-' : '+';
    });

    for (const documentKey of Object.keys(responseData)) {
        const documentData = responseData[documentKey];

        for (const methodKey of Object.keys(documentData)) {
            const methodData = documentData[methodKey];

            // Check if search_terms_not_found exists and is an array
            if (Array.isArray(methodData.search_terms_not_found) && methodData.search_terms_not_found.length > 0) {
                // Transform terms into a format suitable for Tabulator
                let transformedTerms = [];
                const termsPerRow = 5;
                for (let i = 0; i < methodData.search_terms_not_found.length; i += termsPerRow) {
                    let row = {};
                    for (let j = 0; j < termsPerRow; j++) {
                        if (i + j < methodData.search_terms_not_found.length) {
                            row[`term${j + 1}`] = methodData.search_terms_not_found[i + j];
                        }
                    }
                    transformedTerms.push(row);
                }

                // Define columns for the Tabulator table
                // Define columns for the Tabulator table
                let columns = [];
                for (let i = 1; i <= termsPerRow; i++) {
                    columns.push({
                        title: `Term ${i}`,
                        field: `term${i}`,
                        formatter: function (cell, formatterParams, onRendered) {
                            // cell - the cell component
                            // formatterParams - parameters set for the column
                            // onRendered - function to call when the formatter has been rendered

                            let value = cell.getValue();

                            // Create a link element
                            let link = document.createElement('a');
                            link.href = 'fed-search.html?q=' + encodeURIComponent(value) +
                                '&epapikey=' + encodeURIComponent(earthPortalAPIKey) +
                                '&bpapikey=' + encodeURIComponent(bioPortalAPIKey);
                            link.target = '_blank'; // Open in a new tab
                            link.textContent = value; // Set the link text

                            let img = document.createElement('img');
                            img.src = 'external_search.png'; // Path to your logo image
                            img.alt = 'Search';
                            img.style.marginLeft = '5px'; // Add some space between the text and the image

                            // Resize the image
                            img.style.width = '20px';  // Set the width of the image
                            img.style.height = '20px'; // Set the height of the image

                            // Append the image to the link, then the link to the container
                            link.appendChild(img);

                            return link;
                        }
                    });
                }


                // Create a container for each table
                const tableContainerId = `tbl_${(documentKey).hashCode()}`;
                // const tableContainerId = `terms-table-${documentKey}-${methodKey}`;
                let tableContainer = document.createElement('div');
                tableContainer.id = tableContainerId;
                collapsibleContainer.appendChild(tableContainer);

                // Create a Tabulator table
                new Tabulator(`#${tableContainerId}`, {
                    headerVisible: false,
                    data: transformedTerms,
                    columns: columns
                });
            }
        }
    }
}


let xmlResponses = {};
let xmlSelected = {};
let xmlMap = {};

function updateFileStatus(ids) {
    let content = '';
    if (ids.length > 0) {
        content += `<b>${ids.length} files selected:</b> <ul id="files-selected">${Object.keys(xmlSelected).map(xid => {
            let fileContent = xmlSelected[xid];
            let fileName = xid in xmlMap ? xmlMap[xid] : xid;
            let fileInfo = fileContent === undefined ? '' : (fileContent === '' ?
                '<span style="width:100px;margin:0;" class="progress"><span class="indeterminate"/></span>' :
                '<span><small><em>(' + fileContent.length.toString() + ' bytes)</em></small></span>');

            let url = `https://gs-service-production.geodab.eu/gs-service/services/essi/csw?service=CSW&version=2.0.2&request=GetRecordById&id=${xid}&outputschema=http://www.isotc211.org/2005/gmi&elementSetName=full`;
            let openButton = `<button onclick="window.open('${url}', '_blank')">View XML</button>`;

            return `<li>
                        <span class="fn">- ${fileName}</span> 
                        ${fileInfo}
                        ${openButton}
                    </li>`;
        }).join('')}
        </ul>`;
    }
    document.getElementById('loadxml').innerHTML = content;
}


const getHtml = async () => {
    const ids = Array.from(document.getElementById('xml-list').getElementsByTagName('li')).filter(el => el.classList.contains('selected')).map(el => el.getAttribute('data-id'));
    xmlSelected = ids.reduce((obj, item) => ({...obj, [item]: undefined}), {});
    updateFileStatus(ids);
    for (idx in ids) {
        const id = ids[idx];
        xmlSelected[id] = '';
        updateFileStatus(ids);
        if (!(id in xmlResponses)) {
            xmlResponses[id] = '';
            const url = `https://gs-service-production.geodab.eu/gs-service/services/essi/csw?service=CSW&version=2.0.2&request=GetRecordById&id=${id}&outputschema=http://www.isotc211.org/2005/gmi&elementSetName=full`;
            const response = await fetch(url);
            const xml = await response.text();
            xmlResponses[id] = xml;
        }
        xmlSelected[id] = xmlResponses[id];
        updateFileStatus(ids);
    }
}

let earthPortalAPIKey = '';
let bioPortalAPIKey = '';

const init = async () => {

    const urlParams = new URLSearchParams(window.location.search);
    const endpointParam = urlParams.get('endpoint');
    if (endpointParam) {
        document.getElementById('endpoint').value = endpointParam;
        await buildConfigOptions('metadata');
    }
    const earthPortalAPIKeyParam = urlParams.get('epapikey');
    if (earthPortalAPIKeyParam) {
        document.getElementById('earthportal-api-key').value = earthPortalAPIKeyParam;
        earthPortalAPIKey = earthPortalAPIKeyParam;
    }
    const bioPortalAPIKeyParam = urlParams.get('bpapikey');
    if (bioPortalAPIKeyParam) {
        document.getElementById('bioportal-api-key').value = bioPortalAPIKeyParam;
        bioPortalAPIKey = bioPortalAPIKeyParam;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var elems = document.querySelectorAll('select');
        var instances = M.FormSelect.init(elems, {});
    });

    try {
        document.getElementById('search').onclick = loadResults;
        document.getElementById('analyse').onclick = analyser;
//        const response = await fetch('https://gs-service-production.geodab.eu/gs-service/services/essi/view/seadatanet-broker/opensearch/query?si=1&ct=500&st=&kwd=&frmt=&prot=&kwdOrBbox=&sscScore=&instrumentTitle=&platformTitle=&attributeTitle=&organisationName=&searchFields=&bbox=&rel=&tf=&ts=&te=&targetId=&from=&until=&parents=ROOT&subj=&rela=');
        const response = await fetch(`https://seadatanet.geodab.eu/gs-service/services/essi/view/fair-ease/opensearch/query?si=1&ct=500&st=&kwd=&frmt=&prot=&kwdOrBbox=&sscScore=&instrumentTitle=&platformTitle=&attributeTitle=&organisationName=&searchFields=&bbox=&rel=&tf=&ts=&te=&targetId=&from=&until=&parents=ROOT&subj=&rela=`);
        const xml = await response.text();
        const jsonObject = xml2json(xml, {maxCallStackSize: 10000});
        const sources = document.getElementById('sources');//.innerText = JSON.stringify(jsonObject);
        sources.innerHTML = `
                ` + jsonObject.feed.entry.map((dataset, index) => `
                    <label>
                        <input
                            data-group="datasets"
                            data-meta="${JSON.stringify(dataset)}"
                            class="filled-in" ${dataset.title.match(/SeaDataNet/) ? 'checked' : ''} 
                            value="${dataset.id}"
                            type="checkbox" 
                            />
                        <span>${dataset.title}</span>
                    </label>
                `).join('');

// 2. Event listener for the button
        document.getElementById('toggleSelect').addEventListener('click', function () {
            const allCheckboxes = document.querySelectorAll('input[data-group="datasets"]');
            const allChecked = Array.from(allCheckboxes).every(checkbox => checkbox.checked);

            allCheckboxes.forEach(checkbox => {
                checkbox.checked = !allChecked;  // toggle the checked state
            });

            // 3. Update the button's label
            this.textContent = allChecked ? 'Select All' : 'Select None';
        });


        await loadResults();

    } catch (ex) {
        console.log(ex);
    }
};

init()

var tabsInstance;

document.addEventListener('DOMContentLoaded', function () {
    var tabsElement = document.querySelector('.tabs');
    tabsInstance = M.Tabs.init(tabsElement, {});
    const uploadForm = document.getElementById('netcdf').querySelector('form');
    uploadForm.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent the default form submission
        handleFileUpload(); // Call a function to handle the file upload
    });
});


document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function () {
        // Assuming the href attribute of the clicked tab's link contains the tab ID
        activeTabId = this.querySelector('a').getAttribute('href');
        console.log("Active tab changed to: ", activeTabId);
        buildConfigOptions()
    });
});


var uploadedFiles = [];

function handleFileUpload() {
    const fileInput = document.getElementById('fileUpload');
    uploadedFiles = Array.from(fileInput.files); // Store the uploaded files

    // Show feedback message and spinner
    document.getElementById('uploadFeedback').style.display = 'block';
    document.getElementById('feedbackText').textContent = uploadedFiles.length + " file(s) uploaded";

    // Optionally, hide the feedback after a delay
    setTimeout(() => {
        document.getElementById('uploadFeedback').style.display = 'none';
    }, 3000); // Hide after 3 seconds
}

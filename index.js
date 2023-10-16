const useSampleFile = ''

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
    checkboxes = document.querySelectorAll('input[type="checkbox"]');
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


const analyser = async () => {
    try {
        const url = document.getElementById('endpoint').value;
        const xmlfile = document.getElementById('currentFile')?.getAttribute('href');
        const threshold = document.getElementById('threshold').value;

        if (url == '') {
            throw new Error('Enter an analyser endpoint url');
        }
        if (Object.keys(xmlSelected) == 0) {
            throw new Error('Select a result to view');
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
        if (useSampleFile != '') {
            response = await fetch(useSampleFile, {method: 'GET'});
        } else {
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
        }

        const data = await response.json();

        displayTable(data);

    } catch (ex) {
        document.getElementById('table-output').textContent = ex.message;
        console.log(ex);
    }
};

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

    document.getElementById('table-output').innerHTML = Object.keys(responseData).map(key => `<div><h2>${key in xmlMap ? xmlMap[key] : key}</h2><div class="tbl" id="tbl_${key.hashCode()}"></div></div>`).join('');

    const columnsToHide = ["TargetElement", "MethodSubType", "Container", "ContainerLabel"];

    Object.keys(responseData).forEach(key => {
            const tableData = responseData[key];
            const data = tableData.results.bindings;
            const columns = tableData.head.vars;

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
                } else if (col === 'MatchURI') {
                    otherColumns.push({
                        title: "Match Concept",
                        field: col,
                        width: "45%",
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
                } else if (col === 'SearchTerm') {
                    otherColumns.push({
                        title: col,
                        field: col,
                        width: "31%",
                        mutator: (value) => value.value,
                        visible: !isColumnHidden
                    });
                } else if (col !== 'MatchTerm') {
                    otherColumns.push({
                        title: col,
                        field: col,
                        width: "12%",
                        mutator: (value) => value.value,
                        visible: !isColumnHidden
                    });
                }
            });

            const methodSubTypeFormatter = function (cell, formatterParams, onRendered) {
                // get cell value
                const value = cell.getValue();

                // check if value is "Fuzzy Match"
                if (value === "Fuzzy Match") {
                    cell.getElement().setAttribute('title', 'Your tooltip text here'); // set tooltip
                }

                return value; // return the value to be displayed in the
            };


            const table = new Tabulator("#tbl_" + key.hashCode(), {
                data: data,
                columns: [...metadataElementColumns, ...otherColumns],
                groupBy: [
                    "TargetElement",
                    "MethodSubType",
                    function (data) {
                        return data.ContainerLabel ? data.ContainerLabel.value : "Unknown";
                    }
                ],
                groupHeader: function (value, count, data, group) {
                    const field = group.getField();
                    const tooltips = {
                        "Fuzzy Match": "Fuzzy Matches are only searched for when an Exact Match for a term is not found.",
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
    )
    ;
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

const init = async () => {

    const urlParams = new URLSearchParams(window.location.search);
    const endpointParam = urlParams.get('endpoint');
    if (endpointParam) {
        document.getElementById('endpoint').value = endpointParam;
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
                            value="${dataset.id}" type="checkbox" />
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

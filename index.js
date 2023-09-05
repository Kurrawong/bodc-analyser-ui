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

//setElementHeightToFillScreen('xml');
setElementWidthToFillScreen('xml');

const loadResults = async () => {

    checkboxes = document.querySelectorAll('input[type="checkbox"]');
 
    const ids = [];
    // Attach event listeners to checkboxes
    checkboxes.forEach(function(checkbox) {
        if(checkbox.checked) {
            ids.push(checkbox.getAttribute('value'));
        }
    });
    console.log(ids);
    if(ids.length == 0) {
        document.getElementById('numResults').innerHTML = ' (select a source)';
        document.getElementById('results').innerHTML = '';
        return;
    }
    document.getElementById('results').innerHTML = `  <div class="preloader-wrapper small active">
    <div class="spinner-layer spinner-green-only">
      <div class="circle-clipper left">
        <div class="circle"></div>
      </div><div class="gap-patch">
        <div class="circle"></div>
      </div><div class="circle-clipper right">
        <div class="circle"></div>
      </div>
    </div>
  </div>`;

    const response = await fetch(`https://gs-service-production.geodab.eu/gs-service/services/essi/view/seadatanet-broker/opensearch/query?si=1&ct=10&st=&kwd=&frmt=&prot=&kwdOrBbox=&sscScore=&instrumentTitle=&platformTitle=&attributeTitle=&organisationName=&searchFields=&bbox=&rel=CONTAINS&tf=providerID,keyword,format,protocol,instrumentTitle,platformTitle,orgName,attributeTitle&ts=&te=&targetId=&from=&until=&sources=${ids.join(',')}&subj=&rela`); 
    const xml = await response.text();
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(xml, 'application/xml');

    const atomNamespace = 'http://www.w3.org/2005/Atom';

    // Find all <entry> elements using getElementsByTagNameNS
    const entryElements = xmlDoc.getElementsByTagNameNS(atomNamespace, 'entry');

    const entries = [];
    const totalResultsElement = xmlDoc.querySelector('totalResults');

    if (totalResultsElement) {
        document.getElementById('numResults').innerHTML = ' (' + totalResultsElement.textContent + ')';
    } else {
        document.getElementById('numResults').innerHTML = '';
    }
    
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
        entries.push(entry);
    }
    document.getElementById('results').innerHTML = `<ul id="xml-list" class="collection">${entries.map(e=>
        `<li data-id="${e.id}" onClick="this.classList.contains('selected') ? this.classList.remove('selected') : this.classList.add('selected');getHtml();" class="collection-item avatar hover">
            <img src="${e.logo}" alt="" class="circle" />
            <div class="title">
                <span class="title"><span>${e.id}</span><br/><b>${e.title}</b></span>
                <p title="${e.summary.length > 103 ? e.summary : ''}">${e.summary.length > 103 ? e.summary.substring(0, 100) + '...' : e.summary}</p>
            </div>
        </li>`
    ).join('')}</ul>`;
};

const analyser = async() => {
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

        document.getElementById('json-output').innerHTML = `<div class="progress"><div class="indeterminate"></div></div>`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // Render heatmap table
        const tableHTML = createHeatMapTable(data);
        document.getElementById('json-output').innerHTML = tableHTML;

    } catch (ex) {
        document.getElementById('json-output').textContent = ex.message;
        console.log(ex);
    }
};


function createHeatMapTable(data) {
    const tableHeader = `
        <thead>
            <tr>
                <th>Vocabularies</th>
                <th>Keywords (Exact)</th>
                <th>Keywords (Wildcard)</th>
                <th>Instruments (Exact)</th>
                <th>Instruments (Wildcard)</th>
                <th>Variables (Exact)</th>
                <th>Variables (Wildcard)</th>
            </tr>
        </thead>`;

    let tableBody = '<tbody>';

    // Extract all unique concept_schemes
    const allConceptSchemes = [];
    for (const key in data) {
        const bindings = data[key].results.bindings;
        for (const binding of bindings) {
            const scheme = binding.concept_scheme.value;
            if (!allConceptSchemes.includes(scheme)) {
                allConceptSchemes.push(scheme);
            }
        }
    }

    // Iterate over unique concept_schemes and populate table
    for (const scheme of allConceptSchemes) {
        tableBody += '<tr>';
        tableBody += `<td>${scheme}</td>`;
        tableBody += getCellValue(data, 'kws_exact', scheme);
        tableBody += getCellValue(data, 'kws_wildcard', scheme);
        tableBody += getCellValue(data, 'inst_exact', scheme);
        tableBody += getCellValue(data, 'inst_wildcard', scheme);
        tableBody += getCellValue(data, 'var_exact_strings', scheme);
        tableBody += getCellValue(data, 'var_wildcard_strings', scheme);
        tableBody += '</tr>';
    }

    tableBody += '</tbody>';

    return `<table>${tableHeader}${tableBody}</table>`;
}

function getCellValue(data, key, scheme) {
    if (!data[key]) return '<td></td>';

    const bindings = data[key].results.bindings;
    for (const binding of bindings) {
        if (binding.concept_scheme.value === scheme) {
            return `<td>${binding.sum_weight.value}</td>`;
        }
    }

    return '<td></td>';
}

function getColor(value) {
    const intensity = Math.min(255, value * 10);
    return `rgb(${255-intensity}, ${255-intensity}, 255)`;
}


let xmlResponses = {};
let xmlSelected = {};

function updateFileStatus(ids) {
    document.getElementById('loadxml').innerHTML = ``;
    if(ids.length > 0) {
        document.getElementById('loadxml').innerHTML = `<b>${ids.length} files selected:</b> <ul>${Object.keys(xmlSelected).map(xid=>`<li> - ${xid}: 
            ${xmlSelected[xid] == undefined ? '' : (xmlSelected[xid] == '' ? 
            'loading...' : (xmlSelected[xid].length).toString() + ' bytes')}</li>`).join('')}</ul>`;
    }
}

const getHtml = async () => {
    const ids = Array.from(document.getElementById('xml-list').getElementsByTagName('li')).filter(el=>el.classList.contains('selected')).map(el=>el.getAttribute('data-id'));
    xmlSelected = ids.reduce((obj, item) => ({ ...obj, [item]: undefined }), {});
    updateFileStatus(ids);
    for(idx in ids) {
        const id = ids[idx];
        xmlSelected[id] = '';
        updateFileStatus(ids);
        if(!(id in xmlResponses)) {
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

// const getHtml = async () => {
//     try {
//         const ids = Array.from(document.getElementById('xml-list').getElementsByTagName('li')).filter(el=>el.classList.contains('selected')).map(el=>el.getAttribute('data-id'));
//         console.log(ids);
//         xmlResponse = [];
//         let items = []
//         document.getElementById('loadxml').innerHTML = 'Selected items(s): '
//         document.getElementById('xml-output').textContent = '';
//         for(idx in ids) {
//             const id = ids[idx];
//             document.getElementById('xml-output').textContent+= 'ID: ' + id + ':\n\n';
//             const url = `https://gs-service-production.geodab.eu/gs-service/services/essi/csw?service=CSW&version=2.0.2&request=GetRecordById&id=${id}&outputschema=http://www.isotc211.org/2005/gmi&elementSetName=full`;
//             const response = await fetch(url);
//             const xml = await response.text();
//             items.push(`<a id="currentFile" target="_new" href="${url}">${id}</a>`)
//             document.getElementById('loadxml').innerHTML+= items.join(', ');
//             document.getElementById('xml-output').textContent+= xml + "\n\n";

//             document.getElementById('xml-output').textContent+= xml + "\n\n";
//             xmlResponse[id] = xml;
//             hljs.highlightElement(document.getElementById('xml-output'));
//         }
//     } catch (ex) {
//         console.log(ex);
//     }
// }

const init = async () => {

    const urlParams = new URLSearchParams(window.location.search);
    const endpointParam = urlParams.get('endpoint');
    if(endpointParam) {
        document.getElementById('endpoint').value = endpointParam;
    }

    document.addEventListener('DOMContentLoaded', function() {
            var elems = document.querySelectorAll('select');
            var instances = M.FormSelect.init(elems, {});
        });
        
        try {
        const response = await fetch('https://gs-service-production.geodab.eu/gs-service/services/essi/view/seadatanet-broker/opensearch/query?si=1&ct=500&st=&kwd=&frmt=&prot=&kwdOrBbox=&sscScore=&instrumentTitle=&platformTitle=&attributeTitle=&organisationName=&searchFields=&bbox=&rel=&tf=&ts=&te=&targetId=&from=&until=&parents=ROOT&subj=&rela=');
//        const response = await fetch(`https://seadatanet.geodab.eu/gs-service/services/essi/view/fair-ease/opensearch/query?si=1&ct=500&st=&kwd=&frmt=&prot=&kwdOrBbox=&sscScore=&instrumentTitle=&platformTitle=&attributeTitle=&organisationName=&searchFields=&bbox=&rel=&tf=&ts=&te=&targetId=&from=&until=&parents=ROOT&subj=&rela=`);
        const xml = await response.text();
        const jsonObject = xml2json(xml, { maxCallStackSize: 10000 });
        const sources = document.getElementById('sources');//.innerText = JSON.stringify(jsonObject);
        sources.innerHTML = jsonObject.feed.entry.map((dataset, index) => `
            <label>
            <input
                data-group="datasets"
                data-meta="${JSON.stringify(dataset)}"
                class="filled-in" ${true && 'checked'} 
                value="${dataset.id}" type="checkbox" />
            <span>${dataset.title}</span>
            </label>
        `).join('');
        await loadResults();
        document.getElementById('search').onclick = loadResults;
        document.getElementById('analyse').onclick = analyser;

    } catch (ex) {
        console.log(ex);
    }
};

init()

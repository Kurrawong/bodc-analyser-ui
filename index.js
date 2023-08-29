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
    document.getElementById('results').innerHTML = `<ul class="collection">${entries.map(e=>
        `<li onclick="getHtml('${e.id}')" class="collection-item avatar hover">
            <img src="${e.logo}" alt="" class="circle">
            <span class="title">${e.id}</span>
            <span class="title">${e.title}</span>
            <p title="${e.summary.length > 103 ? e.summary : ''}">${e.summary.length > 103 ? e.summary.substring(0, 100) + '...' : e.summary}</p>
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
        if (!xmlfile) {
            throw new Error('Select a result to view');
        }
        if (threshold == '') {
            throw new Error('Select a threshold');
        }
        const aurl = url + `?xml=${encodeURIComponent(xmlfile)}&threshold=${threshold}`;
        document.getElementById('alink').setAttribute('href', aurl);
        document.getElementById('alink').setAttribute('style', 'display:visible;');
        document.getElementById('json-output').innerHTML = `<div class="progress"><div class="indeterminate"></div></div>`;
        const response = await fetch(aurl);
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




const getHtml = async (id) => {
    try {
        document.getElementById('loadxml').innerHTML = `Loading ${id}<div class="progress"><div class="indeterminate"></div></div>`;
        const url = `https://gs-service-production.geodab.eu/gs-service/services/essi/csw?service=CSW&version=2.0.2&request=GetRecordById&id=${id}&outputschema=http://www.isotc211.org/2005/gmi&elementSetName=full`;
        const response = await fetch(url);
        const xml = await response.text();
        document.getElementById('loadxml').innerHTML = `<a id="currentFile" target="_new" href="${url}">Showing ${id}</a>`;
        document.getElementById('xml-output').textContent = xml;
        hljs.highlightElement(document.getElementById('xml-output'));
    } catch (ex) {
        console.log(ex);
    }
}

const init = async () => {
        document.addEventListener('DOMContentLoaded', function() {
            var elems = document.querySelectorAll('select');
            var instances = M.FormSelect.init(elems, {});
        });
        
        try {
        const response = await fetch('https://gs-service-production.geodab.eu/gs-service/services/essi/view/seadatanet-broker/opensearch/query?si=1&ct=500&st=&kwd=&frmt=&prot=&kwdOrBbox=&sscScore=&instrumentTitle=&platformTitle=&attributeTitle=&organisationName=&searchFields=&bbox=&rel=&tf=&ts=&te=&targetId=&from=&until=&parents=ROOT&subj=&rela=');
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

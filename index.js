const useSampleFile = ''
//const useSampleFile = './2023-09-04_23-07-41_output.json'

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

//    const response = await fetch(`https://gs-service-production.geodab.eu/gs-service/services/essi/view/seadatanet-broker/opensearch/query?si=1&ct=10&st=&kwd=&frmt=&prot=&kwdOrBbox=&sscScore=&instrumentTitle=&platformTitle=&attributeTitle=&organisationName=&searchFields=&bbox=&rel=CONTAINS&tf=providerID,keyword,format,protocol,instrumentTitle,platformTitle,orgName,attributeTitle&ts=&te=&targetId=&from=&until=&sources=${ids.join(',')}&subj=&rela`); 
    const response = await fetch(`https://seadatanet.geodab.eu/gs-service/services/essi/view/fair-ease/opensearch/query?si=1&ct=10&st=&kwd=&frmt=&prot=&kwdOrBbox=&sscScore=&instrumentTitle=&platformTitle=&attributeTitle=&organisationName=&searchFields=&bbox=&rel=CONTAINS&tf=providerID,keyword,format,protocol&ts=&te=&targetId=&from=&until=&subj=&rela=&evtOrd=time&sources=${ids.join(',')}`); 
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

    xmlMap = {};
    
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
    
    document.getElementById('results').innerHTML = `<ul id="xml-list" class="collection">${entries.map(e=>
        `<li data-id="${e.id}" onClick="this.classList.contains('selected') ? this.classList.remove('selected') : this.classList.add('selected');getHtml();" class="collection-item avatar hover">
            <img src="${e.logo}" alt="" class="circle" />
            <div class="title">
                <span class="title"><span title="${e.id}">${e.id}</span><br/><b title="${e.title}">${e.title}</b></span>
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

        document.getElementById('table-output').innerHTML = `<div class="progress"><div class="indeterminate"></div></div>`;

        let response;
        if(useSampleFile != '') {
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

String.prototype.hashCode = function() {
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

    document.getElementById('table-output').innerHTML = Object.keys(responseData).map(key=>`<div><h2>${key in xmlMap ? xmlMap[key] : key}</h2><div class="tbl" id="tbl_${key.hashCode()}"></div></div>`).join('');

    Object.keys(responseData).forEach(key=>{
        const tableData = responseData[key];
        const data = tableData.results.bindings;
//        console.log(tableData);
        const columns = tableData.head.vars;
        const table = new Tabulator("#tbl_" + key.hashCode(), {
//            height: 405, // set height of table (in CSS or here), this enables the Virtual DOM and improves render speed dramatically (can be any valid css height value)
            data, //assign data to table
            layout:"fitColumns", //fit columns to width of table (optional)
            columns: columns.map(col=>({title: col, field: col, mutator: (value)=>value.value}))
        });
    });

}


let xmlResponses = {};
let xmlSelected = {};
let xmlMap = {};

function updateFileStatus(ids) {
    document.getElementById('loadxml').innerHTML = ``;
    if(ids.length > 0) {
        document.getElementById('loadxml').innerHTML = `<b>${ids.length} files selected:</b> <ul id="files-selected">${Object.keys(xmlSelected).map(xid=>`<li><span class="fn">- ${xid in xmlMap ? xmlMap[xid] : xid}</span> 
            ${xmlSelected[xid] == undefined ? '' : (xmlSelected[xid] == '' ? 
            '<span style="width:100px;margin:0;" class="progress"><span class="indeterminate"/></span>' : '<span><small><em>(' + (xmlSelected[xid].length).toString() + ' bytes)</em></small></span>')}</li>`).join('')}</ul>`;
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
        document.getElementById('search').onclick = loadResults;
        document.getElementById('analyse').onclick = analyser;
//        const response = await fetch('https://gs-service-production.geodab.eu/gs-service/services/essi/view/seadatanet-broker/opensearch/query?si=1&ct=500&st=&kwd=&frmt=&prot=&kwdOrBbox=&sscScore=&instrumentTitle=&platformTitle=&attributeTitle=&organisationName=&searchFields=&bbox=&rel=&tf=&ts=&te=&targetId=&from=&until=&parents=ROOT&subj=&rela=');
        const response = await fetch(`https://seadatanet.geodab.eu/gs-service/services/essi/view/fair-ease/opensearch/query?si=1&ct=500&st=&kwd=&frmt=&prot=&kwdOrBbox=&sscScore=&instrumentTitle=&platformTitle=&attributeTitle=&organisationName=&searchFields=&bbox=&rel=&tf=&ts=&te=&targetId=&from=&until=&parents=ROOT&subj=&rela=`);
        const xml = await response.text();
        const jsonObject = xml2json(xml, { maxCallStackSize: 10000 });
        const sources = document.getElementById('sources');//.innerText = JSON.stringify(jsonObject);
        sources.innerHTML = jsonObject.feed.entry.map((dataset, index) => `
            <label>
            <input
                data-group="datasets"
                data-meta="${JSON.stringify(dataset)}"
                class="filled-in" ${dataset.title.match(/SeaDataNet/) ? 'checked' : ''} 
                value="${dataset.id}" type="checkbox" />
            <span>${dataset.title}</span>
            </label>
        `).join('');
        await loadResults();

    } catch (ex) {
        console.log(ex);
    }
};

init()

const data = {
    nodes: [
        {id: "term1", group: 1, url: "http://example.com/term1"},
        {id: "term2", group: 1, url: "http://example.com/term2"},
        {id: "identifier1", group: 2, url: "http://example.com/id1"},
        {id: "identifier2", group: 2, url: "http://example.com/id2"},
        {id: "concept1", group: 3, url: "http://example.com/concept1"},
        {id: "concept2", group: 3, url: "http://example.com/concept2"},
        {id: "vocab1", group: 4, url: "http://example.com/vocab1"},
        {id: "vocab2", group: 4, url: "http://example.com/vocab2"}
    ],
    links: [
        {source: "term1", target: "concept1", value: 2},
        {source: "term2", target: "concept2", value: 2},
        {source: "identifier1", target: "concept1", value: 3},
        {source: "identifier2", target: "concept2", value: 3},
        {source: "concept1", target: "vocab1", value: 5},
        {source: "concept2", target: "vocab2", value: 5}
    ]
};

// 1. Create a tooltip div
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "5px")
    .style("border-radius", "3px");

const width = 928;
const height = 600;

// Specify the color scale.
const color = d3.scaleOrdinal(d3.schemeCategory10);

// The force simulation mutates links and nodes, so create a copy
// so that re-evaluating this cell produces the same result.
const links = data.links.map(d => ({...d}));
const nodes = data.nodes.map(d => ({...d}));

// Create a simulation with several forces.
const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2))
    .on("tick", ticked);

// Create the SVG container.
const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto;");

const node = svg.append("g")
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .selectAll()
    .data(nodes)
    .join("circle")
    .attr("r", d => {
        switch (d.group) {
            case 1:
                return 5;
            case 2:
                return 7;
            case 3:
                return 10;
            case 4:
                return 15;
            default:
                return 5;
        }
    })
    .attr("fill", d => color(d.group))
    .on("click", function (event, d) {
        // 2. On node click, show the tooltip
        tooltip.html("<a href='" + d.url + "'>" + d.id + "</a>")
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 15) + "px")
            .style("visibility", "visible");
    });

node.append("title")
    .text(d => d.id + "\n" + d.url);

const link = svg.append("g")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6)
    .selectAll()
    .data(links)
    .join("line")
    .attr("stroke-width", d => d.value); // Adjusted

// Add a drag behavior.
node.call(d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended));

// Set the position attributes of links and nodes each time the simulation ticks.
function ticked()
{
link
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);

node
    .attr("cx", d => d.x)
    .attr("cy", d => d.y);
}

// Reheat the simulation when drag starts, and fix the subject position.
function dragstarted(event) {
if (!event.active) simulation.alphaTarget(0.3).restart();
event.subject.fx = event.subject.x;
event.subject.fy = event.subject.y;
}

// Update the subject (dragged node) position during drag.
function dragged(event) {
event.subject.fx = event.x;
event.subject.fy = event.y;
}

// Restore the target alpha so the simulation cools after dragging ends.
// Unfix the subject position now that it’s no longer being dragged.
function dragended(event) {
if (!event.active) simulation.alphaTarget(0);
event.subject.fx = null;
event.subject.fy = null;
}

d3.select("body").on("click", function () {
tooltip.style("visibility", "hidden");
}, true); //

d3.select("#container").append(() => svg.node());
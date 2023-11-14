d3.json("2023-09-28_sample_response.json").then(data => {

    function processData(inputData) {
        const firstDocumentKey = Object.keys(inputData)[0];
        const documentData = inputData[firstDocumentKey];
        const allSearchElements = documentData["all_search_elements"];
        const results = documentData["results"]["bindings"];

        let processedData = {};

        for (let [elementKey, elementValue] of Object.entries(allSearchElements)) {
            let allTerms = new Set([...elementValue["identifiers"], ...elementValue["strings"], ...elementValue["uris"]]);
            let matchedTerms = new Set(results.filter(res => res.TargetElement.value === elementKey).map(res => res.SearchTerm.value));
            let unmatchedTerms = [...allTerms].filter(term => !matchedTerms.has(term));

            processedData[elementKey] = {
                matched: Array.from(matchedTerms),
                unmatched: unmatchedTerms
            };
        }

        return processedData;
    }

    const processedData = processData(data);
    const instrumentData = processedData["Instrument"];
    const containerCount = data["sdn-open:urn:SDN:CDI:LOCAL:96-2537-96-ds01-4"]["results"]["bindings"].filter(res => res.Container.value).length;

    let pie = d3.pie()
        .sort(null)
        .value(d => d.value);

    let pieData = [
        {label: "Matched", value: instrumentData.matched.length},
        {label: "Unmatched", value: instrumentData.unmatched.length}
    ];

    const width = 500;
    const height = 500;
    const radius = Math.min(width, height) / 2;

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    const svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const centralCircleRadius = containerCount * 5;  // Scaled based on the container count

    svg.append("circle")
        .attr("r", centralCircleRadius)
        .style("fill", "lightblue")
        .on("mouseover", function (event, d) {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`Containers: ${containerCount}`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function (event, d) {
            tooltip.transition().duration(500).style("opacity", 0);
        });

    const arc = d3.arc()
        .innerRadius(centralCircleRadius + 10)  // +10 for a slight gap
        .outerRadius(radius);

    svg.selectAll(".arc")
        .data(pie(pieData))
        .enter().append("path")
        .attr("class", "arc")
        .attr("d", arc)
        .style("fill", d => {
            return d.data.label === "Matched" ? "#4CAF50" : "#FFC107";
        })
        .on("mouseover", function (event, d) {
            let terms = d.data.label === "Matched" ? instrumentData.matched : instrumentData.unmatched;
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(d.data.label + "<br>" + terms.join(", "))
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function (event, d) {
            tooltip.transition().duration(500).style("opacity", 0);
        });

}).catch(error => {
    console.error("Error reading the JSON data: ", error);
});

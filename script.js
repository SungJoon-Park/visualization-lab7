const width = 1000,
    height = 700;

const svg = d3.selectAll(".container")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, -0, width, height]); //simple set of margin convention

// const group = svg.append("g")
//     .attr("transform", "translate(20,20)"); 

const sizeScale = d3.scaleLinear()
    .range([6, 20]);

const drag = (forces) => {
    function started(event) {
        if (!event.active) {
            forces.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
    }

    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    function ended(event) {
        if (!event.active) {
            forces.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
    }

    return d3.drag()
        .filter(event => visType === "Force")
        .on("start", started)
        .on("drag", dragged)
        .on("end", ended);
}
let visType = "Force";


Promise.all([
    d3.json('airports.json'),
    d3.json('world-110m.json')
]).then(data => {
    let airports = data[0];
    let worldMap = data[1];
    sizeScale.domain(d3.extent(airports.nodes, d => d.passengers));

    //map
    console.log("map", worldMap);

    const geoMap = topojson.feature(worldMap, worldMap.objects.countries);
    const features = geoMap.features;
    console.log("geoMap", geoMap);

    const projection = d3.geoMercator()
        .fitExtent([
            [0, 0],
            [width, height]
        ], geoMap);

    const path = d3.geoPath()
        .projection(projection);

    let map = svg.selectAll("path")
        .data(features)
        .join("path")
        .attr("d", path)
        .attr("opacity", 0);

    let boundaries = svg.append("path")
        .datum(topojson.mesh(worldMap, worldMap.objects.countries))
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("class", "subunit-boundary")
        .attr("d", path)
        .attr("opacity", 0);

    //circles for airports
    console.log("airports", airports);
    const forces = d3.forceSimulation(airports.nodes)
        .force('charge', d3.forceManyBody().strength(5))
        .force("link", d3.forceLink(airports.links).distance(100))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide().radius(d =>
            sizeScale(d.passengers) + 20));

    // const drag = d3.drag()
    //     .on("start", (event) => {
    //         forces.alphaTarget(0.3).restart();
    //         event.subject.fx = event.x;
    //         event.subject.fy = event.y;
    //     })
    //     .on("drag", (event) => {
    //         event.subject.fx = event.x;
    //         event.subject.fy = event.y;
    //     })
    //     .on("end", (event) => {
    //         forces.alphaTarget(0.0);
    //         event.subject.fx = null;
    //         event.subject.fy = null;
    //     })


    let lines = svg
        .append("g")
        .style("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(airports.links)
        .join("line");
    // .style("stroke-width", d => Math.sqrt(d));


    let nodes = svg
        .append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(airports.nodes)
        .join("circle")
        .attr("r", d => sizeScale(d.passengers))
        .style("fill", "orange")
        .call(drag(forces));

    nodes.append("title")
        .text(d => d.name);

    forces.on("tick", function () {
        nodes
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
        lines
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
    });


    function switchLayout() {
        if (visType === "Map") {
            forces.stop();
            nodes
                .transition(1200)
                .attr("cx", d => d.x = projection([d.longitude, d.latitude])[0])
                .attr("cy", d => d.y = projection([d.longitude, d.latitude])[1]);
            lines
                .transition(1200)
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
            map.transition(1200).attr("opacity", 1);
            boundaries.transition(1200).attr("opacity", 1);
        } else {
            forces.alpha(1).restart();
            map.attr("opacity", 0);
            boundaries.attr("opacity", 0);
        }
    }
    d3.selectAll("input[name=type]").on("change", event => {
        visType = event.target.value;
        console.log(visType); // selected button
        switchLayout();
    });

});
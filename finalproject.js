var getCharacterCount = function(episode) {
    characters = {}
    episode.scenes.forEach(function(scene) {
	scene.characters.forEach(function(c) {
	    characters[c.name] = 1
	})
    })
    return Object.keys(characters).length

}

var generateCharacterCountPlot = function(data) {

    var margin = {top: 20, right: 20, bottom: 50, left: 80},
	    width = 960 - margin.left - margin.right,
	    height = 480 - margin.top - margin.bottom;

	var plot = d3.select("#characterCountPlot").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)

	var x = d3.scaleLinear().domain([1, data.episodes.length]).range([0, width]);
	var y = d3.scaleLinear().domain([0, 100]).range([height, 0]);

    plot.append("g")
	.attr("transform", "translate(" + margin.left + "," + (height + margin.top) + ")")
	.call(d3.axisBottom(x))

    yAxis = plot.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
	.call(d3.axisLeft(y))

    plot.append("text")
	.attr("transform",
	      "translate(" + (margin.left + width/2) + " ," +
	      (height + 10 + margin.bottom) + ")")
	.style("text-anchor", "middle")
	.text("Episode");

    plot.append("text")
	.attr("transform", "rotate(-90)")
	.attr("y", margin.left/2)
	.attr("x",0 - (height / 2))
	.attr("dy", "1em")
	.style("text-anchor", "middle")
	.text("Character Count");

    plot.append("g").selectAll("rect").data(data.episodes).enter()
	.append("rect")
	.attr("x", function(d,i) {
	    return x(i + 1) })
	.attr("y", function(d,i) {return y(getCharacterCount(d)) })

	.attr("width", x(2) - x(1))
	.attr("height", function(d,i) {  return y(0) - y(getCharacterCount(d))})
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
	.style("fill", "steelblue")
	.style("stroke", "#000000")
	.on("click", function(d,i) {
	    generateGraph(data, i);
	})



}

var getGraphBetweenEpisodes = function(data, episodeStart, episodeEnd) {
    relations = {}
    characterAppearanceTime = {}
    for (var i = episodeStart; i < episodeEnd; i++) {
	data.episodes[i].scenes.forEach(function(scene) {
	    sceneLength =
		(new Date("1970-01-01 " + scene.sceneEnd)) -
		(new Date("1970-01-01 " + scene.sceneStart));

	    scene.characters.forEach(function(c1) {
		if (characterAppearanceTime[c1.name]) {
		    characterAppearanceTime[c1.name] = characterAppearanceTime[c1.name] + sceneLength;
		} else {
		    characterAppearanceTime[c1.name] = sceneLength;
		}

		scene.characters.forEach(function(c2) {
		    if(c1.name != c2.name) {
			var pair = [c1.name, c2.name].sort();
			if (relations[pair]) {
			    relations[pair] = relations[pair] + sceneLength;
			} else {
			    relations[pair] = sceneLength;
			}}})})})
    }

    links = []
    Object.keys(relations).forEach(function(relation) {
	names = relation.split(",")
	links.push({"source": names[0], "target": names[1], "value": relations[relation]})
    })

    nodes = []
    Object.keys(characterAppearanceTime).forEach(function(character) {
	nodes.push({"id": character, "screenTime" : characterAppearanceTime[character]})
    })

    return {"links" : links,
	    "nodes" : nodes};
}


var getGraphForEpisode = function(data, episode) {
    relations = {}
    characterAppearanceTime = {}
    data.episodes[episode].scenes.forEach(function(scene) {
	sceneLength =
	    (new Date("1970-01-01 " + scene.sceneEnd)) -
	    (new Date("1970-01-01 " + scene.sceneStart));

	scene.characters.forEach(function(c1) {
	    if (characterAppearanceTime[c1.name]) {
		characterAppearanceTime[c1.name] = characterAppearanceTime[c1.name] + sceneLength;
	    } else {
		characterAppearanceTime[c1.name] = sceneLength;
	    }

	    scene.characters.forEach(function(c2) {
		if(c1.name != c2.name) {
		    var pair = [c1.name, c2.name].sort();
		    if (relations[pair]) {
			relations[pair] = relations[pair] + sceneLength;
		    } else {
			relations[pair] = sceneLength;
		    }}})})})

    links = []
    Object.keys(relations).forEach(function(relation) {
	names = relation.split(",")
	links.push({"source": names[0], "target": names[1], "value": relations[relation]})
    })

    nodes = []
    Object.keys(characterAppearanceTime).forEach(function(character) {
	nodes.push({"id": character, "screenTime" : characterAppearanceTime[character]})
    })

    return {"links" : links,
	    "nodes" : nodes};
}

var generateGraph = function(data, episode) {
    d3.select("#network").selectAll("svg").remove()
    graphData = getGraphBetweenEpisodes(data, 0, episode);

    var margin = {top: 20, right: 20, bottom: 50, left: 80},
	width = 960 - margin.left - margin.right,
	height = 960 - margin.top - margin.bottom;

    var svg = d3.select("#network").append("svg")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)

    var simulation = d3.forceSimulation()
 	.force("link", d3.forceLink().id(function(d) { return d.id; }))
	.force("charge", d3.forceManyBody())
	.force("center", d3.forceCenter(width / 2, height / 2))
    //	.strength(+this.value)
    ;

    function dragstarted(d) {
	if (!d3.event.active) simulation.alphaTarget(0.3).restart();
	d.fx = d.x;
	d.fy = d.y;
    }

    function dragged(d) {
	d.fx = d3.event.x;
	d.fy = d3.event.y;
    }

    function dragended(d) {
	if (!d3.event.active) simulation.alphaTarget(0);
	d.fx = null;
	d.fy = null;
    }


    console.log(graphData)
    var link = svg.append("g")
	.attr("class", "links")
	.selectAll("line")
	.data(graphData.links)
	.enter().append("line")
	.attr("stroke-width", function(d) { return 1; })
    	.attr("stroke", function(d) { return "#000000"; });


    var node = svg.append("g")
	.attr("class", "nodes")
	.selectAll("g")
	.data(graphData.nodes)
	.enter().append("g")

    var circles = node.append("circle")
	.attr("r", 5)
	.attr("fill", function(d) { return "#ff0000"; })
    	.call(d3.drag()
	      .on("start", dragstarted)
	      .on("drag", dragged)
	      .on("end", dragended));

    var lables = node.append("text")
	.text(function(d) {
	    return d.id;
	})
	.attr('x', 6)
	.attr('y', 3);



    node.append("title")
	.text(function(d) { return d.id; });

    simulation
	.nodes(graphData.nodes)
	.on("tick", ticked);

    simulation.force("link")
	.links(graphData.links);

    function ticked() {
	link
	    .attr("x1", function(d) { return d.source.x; })
	    .attr("y1", function(d) { return d.source.y; })
	    .attr("x2", function(d) { return d.target.x; })
	    .attr("y2", function(d) { return d.target.y; });

	node
	    .attr("transform", function(d) {
		return "translate(" + d.x + "," + d.y + ")";
	    })
    }

}



d3.json("https://raw.githubusercontent.com/jeffreylancaster/game-of-thrones/master/data/episodes.json", function (data) {
    generateCharacterCountPlot(data);
	//	generateGraph(data, 1);
    })

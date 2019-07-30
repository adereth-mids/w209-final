
//BG update helper function to generate lookup table for character houses
var getHouseTable = function() {
    var table = {};
    d3.json("https://raw.githubusercontent.com/jeffreylancaster/game-of-thrones/master/data/characters-houses.json", function (data) {
	data.house.forEach(function(c1) {
	    c1.characters.forEach(function(c2) {
		table[c2]=c1.name;
	    })
	})
    })
    return table
}

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

	console.log(data)

    var margin = {top: 20, right: 20, bottom: 50, left: 80},
	width = 960 - margin.left - margin.right,
	height = 480 - margin.top - margin.bottom;

    var plot = d3.select("#characterCountPlot").append("svg")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)

    var x = d3.scaleLinear().domain([1, data.episodes.length]).range([0, width]);
    var y = d3.scaleLinear().domain([0, 80]).range([height, 0]);

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
	    //BG Update increased to i+1
	    generateGraph(data, i+1);
	})
    // BG update to include tooltip
	.append("plot:title")
	.text(function(d) { return "S" + d.seasonNum + "E" + d.episodeNum + " - " + d.episodeTitle + ": " + d.episodeDescription; });
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
    graphData = getGraphBetweenEpisodes(data, episode - 1, episode);

    var margin = {top: 20, right: 20, bottom: 50, left: 80},
	width = 960 - margin.left - margin.right,
	height = 960 - margin.top - margin.bottom;

    var svg = d3.select("#network").append("svg")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)


	color = d3.scaleOrdinal(d3.schemeCategory20) // Li: add color
    r=8 // Li Add default radius.




    // BG update to not lose nodes outside of box
    //custom force to put stuff in a box
    function box_force() {
	var radius = 50;
	for (var i = 0, n = graphData.nodes.length; i < n; ++i) {
            curr_node = graphData.nodes[i];
            curr_node.x = Math.max(radius, Math.min(width - radius, curr_node.x));
            curr_node.y = Math.max(radius, Math.min(height - radius, curr_node.y));
	}
    }


    var simulation = d3.forceSimulation()
 	.force("link", d3.forceLink().id(function(d) { return d.id; }))
	.force("charge", d3.forceManyBody()
		 .strength(function (d, i) { var a = i == 0 ? -1000 : -500;return a;})
			.distanceMin(90).distanceMax(150)) // Li: add dynamic line distance
	.force("collide", d3.forceCollide(r+1)) // Li: add collide
	.force("center", d3.forceCenter(width / 2, height / 2))
    //	.strength(+this.value)

    // BG update to not lose nodes outside of box
	.force("box_force", box_force)
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

    color = d3.scaleOrdinal(d3.schemeCategory20) // Li: add color

    var link = svg.append("g")
	.attr("class", "links")
	.selectAll("line")
	.data(graphData.links)
	.enter().append("line")
	.attr("stroke-width", function(d) { return 0.5; })
    	//.attr("stroke", function(d) { return "#000000"; })
    	.style("stroke", function(d) { return color(d.id); }) // Li: use color group
	.style("opacity", 0.5);


    // BG update to calculate max screen time for node radius
    maxtime = 0;
    graphData.nodes.forEach(function(d) {
	if (d.screenTime > maxtime) {
	    maxtime = d.screenTime;}
	else{
	    maxtime = maxtime;}
    })

    var node = svg.append("g")
	.attr("class", "nodes")
	.selectAll("g")
	.data(graphData.nodes)
	.enter().append("g")

    var circles = node.append("circle")
    // BG update to radius based on screen time
	.attr("r", function(d) { return 5+30*d.screenTime/maxtime; })
	//Li .attr("fill", function(d) { return "#ff0000"; })
	.attr("fill", function(d) { return color(d.id); })// Li: color per house -->d.house not working 
	.style("opacity", 0.8) // Li: add color opacity 

    // BG update increase radius when mouse over
	.on("mouseover", function(d,i) {d3.select(this)
		.attr("r", 40)
		.style("font-size", 20);})
	.on("mouseout", function(d,i) {
	    d3.select(this).attr("r",function(d) { return 5+30*d.screenTime/maxtime; });})
    	.call(d3.drag()
	      .on("start", dragstarted)
	      .on("drag", dragged)
	      .on("end", dragended));
    
      var lables = node.append("text")
      .text(function(d) {
      return d.id;
      })
      .style("font-size", function(d){return 5+8*d.screenTime/maxtime;}) // Li: add text size
      .attr("fill","grey48") // Li: add text color
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

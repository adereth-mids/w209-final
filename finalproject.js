var episodeData
var characterDetails
var appearances

var toMillis = function(timeString) {
    return (new Date("1970-01-01 " + timeString)) - (new Date("1970-01-01 " + "00:00"))
}

var getCharacterDetailsMap = function(characterData) {
    var result = {}

    characterData.characters.forEach(function(c) {
	result[c.characterName] = c
    })
    return result
}

var populateAppearances = function(episodes) {
    var characterAppearances = {}
    for (var i = 0; i < episodes.length; i++) {
	var sceneCount = episodes[i].scenes.length

	var episodeLength = toMillis(episodes[i].scenes[sceneCount - 1].sceneEnd)
	episodes[i].scenes.forEach(function(scene) {
	    scene.characters.forEach(function(c) {
		if(!characterAppearances[c.name]) {
		    characterAppearances[c.name] = []
		}
		characterAppearances[c.name].push(
		    {"sceneStart" : (toMillis(scene.sceneStart) / episodeLength) + i,
		     "sceneEnd": (toMillis(scene.sceneEnd) / episodeLength) + i,
		     "details" : scene});

	    })
	})}
    return characterAppearances
}


var characterHouseMap = {}

// Color selection informed by http://hauteslides.com/2011/05/game-of-thrones-infographic-illustrated-guide-to-houses-and-character-relationships/
var houseColor =
    {
	"Stark" : "#777777",
	"Targaryen" : "#B22222",
	"Baratheon": "#654321",
	"Lannister" : "#FCC201",
	"Night's Watch" : "#000000",
	"Dothraki" : "#008000",
	"Greyjoy" : "#800080",
	"Tyrell" : "#ff007f",
	"Wildlings": "#cccccc",
	"Martell": "#c2b280",
	"Frey": "#607562",
	"Tully" : "#2d2c69",
	"White Walkers": "#d6ecef",
	"Other": "steelblue"
    }

var populateCharacterHouseMap = function(groups) {
    groups.forEach(function(group) {
	if (group != "Include") {
	    group.characters.forEach(function(character) {
		characterHouseMap[character] = group.name
	    })
	}
    })
}

var generateHouseLegend = function() {
    var margin = {top: 20, right: 20, bottom: 50, left: 80},
	width = 960 - margin.left - margin.right,
	height = 100;


    var legend = d3.select("#houselegend").append("svg")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)
    	.attr("transform", "translate(" + margin.left + "," + margin.top + ")")

    var x = d3.scaleLinear()
	.domain([0, Object.keys(houseColor).length - 1])
	.range([margin.left, width - margin.right]);

    legend.selectAll("circle").data(Object.keys(houseColor))
	.enter()
	.append("circle")
    	.attr("r", 9)
	.attr("cx", function(d,i) {return x(i)})
	.attr("cy", function(d,i) { return height / 2 + (i % 2) * 12})
	.attr("fill", function(d) {return houseColor[d]})

    legend.selectAll("text").data(Object.keys(houseColor))
	.enter()
	.append("text")
	.attr("x", function(d,i) {return x(i)})
    	.attr("y", function(d,i) { return height / 2 + (i % 2) * 12 + 18})

	.text(function(d) { return d.replace(" ", "\n") })
	.attr("text-anchor", "middle")
	.attr("font-size", 8)


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

	var margin = {top: 20, right: 20, bottom: 50, left: 80},
	    width = 960 - margin.left - margin.right,
	    height = 240 - margin.top - margin.bottom;

	var plot = d3.select("#characterCountPlot").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)

	var x = d3.scaleLinear().domain([1, data.episodes.length]).range([0, width]);
	var y = d3.scaleLinear().domain([0, 70]).range([height, 0]);

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
	    .attr("y", margin.left/2 - 10)
	    .attr("x",0 - ((margin.top + height) / 2))
	    .attr("dy", "1em")
	    .style("text-anchor", "middle")
	    .attr("font-size", 14)
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
	    .style("cursor", "pointer")
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
	    height = 480 - margin.top - margin.bottom;

	var svg = d3.select("#network").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	//BG Update

	    .on('click', function(d) {
		_restoreEdges();
	    });

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

	var link = svg.append("g")
	    .attr("class", "links")
	    .selectAll("line")
	    .data(graphData.links)
	    .enter().append("line")
    	    .attr("stroke", function(d) { return "#000000"; })
	    .style("opacity", 0.5);

	var maxtime = d3.max(graphData.nodes, function(d) { return d.screenTime; });

	var node = svg.append("g")
	    .attr("class", "nodes")
	    .selectAll("g")
	    .data(graphData.nodes)
	    .enter().append("g")

	var circles = node.append("circle")
	    .attr("r", function(d) { return 5+30*d.screenTime/maxtime; })
	    .attr("fill", function(d) {
		if (houseColor[characterHouseMap[d.id]]) {
		    return houseColor[characterHouseMap[d.id]];
		} else {
		    return houseColor["Other"]
		}

	    })
	    .style("opacity", 0.8) // Li: add color opacity
	    .style("cursor", "pointer")
	// BG update increase radius when mouse over
	    .on("mouseover", function(d,i) {d3.select(this)
					    .attr("r", 40)
					    .style("font-size", 20);})
	    .on("mouseout", function(d,i) {
		d3.select(this).attr("r",function(d) { return 5+30*d.screenTime/maxtime; });})
    	    .call(d3.drag()
		  .on("start", dragstarted)
		  .on("drag", dragged)
		  .on("end", dragended))
	//BG Update to highlight subnetwork
	    .on('click', function(d) {
		_displayConnections(d.id);
		generateCharacterScenePlot(d.id)
		// d3.event.stopPropagation();
	    });
	//BG Update

	function _restoreEdges()
	{
	    d3.select("#network").selectAll("line")
		.style("opacity", 1);
	}
	//BG Update
	function _displayConnections(id)
	{
	    var edges = d3.select("#network")
		.selectAll("line");
	    edges.transition()
		.style("opacity", function(d) {
		    var source = d.source.id;
		    var target = d.target.id;
		    if (source === id || target === id) return 1;
		    else return 0.05;
		});
	};

	var lables = node.append("text")
	    .text(function(d) {
		return d.id;
	    })
	    .style("font-size", function(d){return 5+8*d.screenTime/maxtime;})
	    .attr("fill","grey48")
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


    var generateCharacterScenePlot = function(mainCharacter) {
	d3.select("#timeline").selectAll("svg").remove()

	var relationCount = 20
	var getRelatedCharacters = function(character) {
	    var r = {}
	    appearances[character].forEach(function(scene) {
		scene.details.characters.forEach(function(c) {
		    if(!r[c.name]) {
			r[c.name] = scene.sceneEnd - scene.sceneStart
		    } else {
			r[c.name] = r[c.name] + scene.sceneEnd - scene.sceneStart
		    }

		})
	    })
	    return Object.keys(r).sort(function(a,b) { return r[b] - r[a] })
	}

	var sceneContainsCharacter = function(scene, character) {
	    for (var i = 0; i < scene.details.characters.length; i++) {
		if (scene.details.characters[i].name == character) {
		    return true;
		}

	    }
	    return false;
	}
	var margin = {top: 20, right: 20, bottom: 50, left: 160},
	    width = 960 - margin.left - margin.right,
	    height = 370 - margin.top - margin.bottom;

	var plot = d3.select("#timeline").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)

	var x = d3.scaleLinear().domain([1, episodeData.episodes.length]).range([0, width]);
	var y = d3.scaleLinear().domain([0, relationCount]).range([height, 0]);

	plot.append("g")
	    .attr("transform", "translate(" + margin.left + "," + (height + margin.top) + ")")
	    .call(d3.axisTop(x))
	plot.append("text")
	    .attr("transform",
		  "translate(" + (margin.left + width/2) + " ," +
		  (height + 10 + margin.bottom) + ")")
	    .style("text-anchor", "middle")
	    .text("Episode");
	related = getRelatedCharacters(mainCharacter).slice(0,relationCount)
	console.log(related)
	plot.append("g").selectAll("text").data(related).enter().append("text")
	    .attr("y", function(d,i) { return 9 + y(relationCount - 0.5 - i) })
	    .attr("x", x(15))
	    .attr("dy", "1em")
    	    .style("text-anchor", "end")
	    .attr("font-size", 9)
	    .text(function(d) { console.log(d); return d})
	    .attr("font-weight", function(d,i) { if (i == 0) {return "bold"} else {return "normal"}});

	for (var j= 0; j < related.length; j++) {
	    plot.append("g").selectAll("circle").data(appearances[related[j]]).enter()
		.append("circle")
		.attr("cx", function(d,i) {
		    return x(1+d.sceneStart) })
		.attr("cy", function(d,i) {return y(relationCount - j) })

		.attr("r", function(d) {
		    if (sceneContainsCharacter(d, mainCharacter)) {
			return x(0.2) - x(0)
		    } else {
			return x(0.15) - x(0)
		    }
		})

		.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
		.style("fill", function(d) {
		    if (sceneContainsCharacter(d, mainCharacter)) {
			return "#000000"
		    } else {
			return "#bbbbbb"
		    }
		})
		.style("opacity",
		       function(d) {
			   if (sceneContainsCharacter(d, mainCharacter)) {
			       return 1
			   } else {
			       return 0.25
			   }
		       })
		.style("cursor", "pointer")


	}

	console.log("done")




    }

var ready = function(_, episodes, groups, characterData) {
    episodeData = episodes
	appearances = populateAppearances(episodeData.episodes)
	characterDetails = getCharacterDetailsMap(characterData)

	console.log(episodes)
	console.log(groups)
	populateCharacterHouseMap(groups.groups)
	generateHouseLegend()
	console.log(characterHouseMap)
	generateCharacterCountPlot(episodes);

    }

    d3.queue()
	.defer(d3.json, 'data/episodes.json')
	.defer(d3.json, 'data/characters-groups.json')
	.defer(d3.json, 'data/characters.json')
	.await(ready);

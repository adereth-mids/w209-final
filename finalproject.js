

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
    graphData = getGraphForEpisode(data, episode);

    var margin = {top: 20, right: 20, bottom: 50, left: 80},
	width = 960 - margin.left - margin.right,
	height = 960 - margin.top - margin.bottom;

    var svg = d3.select("#network").append("svg")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)

    var simulation = d3.forceSimulation()
 	.force("link", d3.forceLink().id(function(d) { return d.id; }))
	.force("charge", d3.forceManyBody())
	.force("center", d3.forceCenter(width / 2, height / 2));

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


var generateTimeLine = function(data) {
    var margin = {top: 20, right: 20, bottom: 50, left: 80},
	width = 960 - margin.left - margin.right,
	height = 960 - margin.top - margin.bottom;


    characterIdMap = {}
    var currId = 0;

    appearances = []
    for (var i in data.episodes) {
	episode = data.episodes[i]
	scenes = episode.scenes

	episodeLengthSeconds =
	    (new Date("1970-01-01 " + scenes[scenes.length-1].sceneEnd)) -
	    (new Date("1970-01-01 00:00"));
	scenes.forEach(function(scene) {
	    sceneStartFraction = (new Date("1970-01-01 " + scene.sceneStart) - new Date("1970-01-01 00:00")) / episodeLengthSeconds
	    sceneEndFraction = (new Date("1970-01-01 " + scene.sceneStart)  - new Date("1970-01-01 00:00")) / episodeLengthSeconds
	    scene.characters.forEach(function(c) {
		if (characterIdMap[c.name]) {

		} else {
		    characterIdMap[c.name] = currId;
		    currId = currId + 1;
		}
		appearances.push(
		    {"character": c.name,
		     "episodeLength": episodeLengthSeconds,
		     "sceneStartTime": (new Date("1970-01-01 " + scene.sceneStart) - new Date("1970-01-01 00:00:00")),
		     "sceneStartFraction": sceneStartFraction,
		     "sceneEndFraction": sceneEndFraction,
		     "sceneLength" : sceneEndFraction - sceneStartFraction,
		     "sceneStart": scene.sceneStart,
		     "sceneEnd": scene.sceneEnd,
		     "episode": +i
		    })
	    })

	})


    }
    console.log(currId)
    var x = d3.scaleLinear().domain([0, 70]).range([0, width]);
    var y = d3.scaleLinear().domain([0, currId]).range([0, height]);

    var svg = d3.select("#timeline").append("svg")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)

    //svg.selectAll("rectangle").data(appearances.slice(0,1000)).enter()
    svg.selectAll("rectangle").data(appearances).enter()
	.append("rect")
	.attr("x", function(d) { return x(d.episode + d.sceneStartFraction) })
	.attr("y", function(d) {  return y(characterIdMap[d.character]) })
	.attr("width", function(d) { return Math.max(1,x(d.sceneLength) - x(0)) })
    //	.attr("width", 5)
	.attr("height", y(0.5))
	.attr("fill", "black")




}
/*
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

*/



d3.json("https://raw.githubusercontent.com/jeffreylancaster/game-of-thrones/master/data/episodes.json", function (data) {
    d = data;
	generateTimeLine(data);
	generateGraph(data, 1);

    })

var MakerViz = {};

MakerViz.CIRCLE_RADIUS = 20;

MakerViz.SCORE_WIDTH = window.innerWidth;
MakerViz.SCORE_HEIGHT = window.innerHeight;

MakerViz.PROGRESS_BAR_WMARGIN = 25;
MakerViz.PROGRESS_BAR_HEIGHT = 25;
MakerViz.MARGIN_BETWEEN_BARS = 5;

//Constant containing render time.
MakerViz.RENDER_INTERVAL_TIME = 300;

MakerViz.adjustSVGArea = function() {
    d3.select(".svg-tag").remove();

    var svg = d3.select("#svg-container").append("svg")
        .attr("width", window.innerWidth)
        .attr("height", window.innerHeight)
        .attr("class", "svg-tag");

    svg.append("g").attr("class", "circle-container");
    svg.append("g").attr("class", "tail-container");

    this.printSafeZone();

    this.printLines(LeapManager.NUMBER_OF_TONES, window.innerWidth, window.innerHeight);
    svg.append("g").attr("class", "speech-ballons");

    //this.printVoronoi();
}

/*MakerViz.redrawVoronoi = function() {
    this.voronoiPaths = this.voronoiPaths
        .data(this.voronoi(this.vertices), polygon);

    this.voronoiPaths.exit().remove();

    this.voronoiPaths.enter().append("path")
        .attr("d", polygon);

    this.voronoiPaths.order();

    function polygon(d) {
      return "M" + d.join("L") + "Z";
    }
}

MakerViz.voronoiPaths = undefined;

MakerViz.vertices = undefined;
MakerViz.voronoi = undefined;

MakerViz.printVoronoi = function() {
    this.vertices = d3.range(2000).map(function(d) {
        return [Math.random() * MakerViz.SCORE_WIDTH, Math.random() * MakerViz.SCORE_HEIGHT];
    });

    var voronoiContainer = d3.select(".svg-tag").append("g")
        .attr("class", "voronoi-area")
        .attr("height", this.SCORE_HEIGHT)
        .attr("width", this.SCORE_WIDTH)
        .on("mousemove", function() { 
            MakerViz.vertices[0] = d3.mouse(this); 
            MakerViz.redrawVoronoi(); }
        );

    this.voronoiPaths = voronoiContainer.selectAll("path");

    this.voronoi = d3.geom.voronoi()
        .clipExtent([[0, 0], [this.SCORE_WIDTH, this.SCORE_HEIGHT]]);

    this.redrawVoronoi();
}*/

MakerViz.printRecordedInstLimits = function(container) {
    //Only if there is not already a rect.
    if(container.select(".recorded-ins-rect").size() === 0)
        container.append("rect")
            .attr("class", "recorded-ins-rect")
            .attr("x", 0)
            .attr("y", -MakerViz.MARGIN_BETWEEN_BARS/2)
            .attr("width", window.innerWidth - MakerViz.PROGRESS_BAR_WMARGIN*2)
            .attr("height", MakerViz.PROGRESS_BAR_HEIGHT + MakerViz.MARGIN_BETWEEN_BARS*2);
}


/**
 * Print current pattern, with recorded tones for each instrument.
 */
MakerViz.printRecordedInstruments = function() {
    var pattern = HandPlayer.activePatterns[0].pattern;

    d3.selectAll(".pattern-bar-group > g.instrument-bar-group").remove();
    var barGroup = d3.select(".pattern-bar-group");

    if(barGroup.size() === 0) {
        var barGroup = d3.select(".svg-tag").append("g")
            .attr("class", "pattern-bar-group")
            .attr("width", window.innerWidth - MakerViz.PROGRESS_BAR_WMARGIN*2)
            .attr("height", pattern.length * (MakerViz.PROGRESS_BAR_HEIGHT + MakerViz.MARGIN_BETWEEN_BARS));
    }

    var x = d3.scale.linear()
        .range([0, window.innerWidth - MakerViz.PROGRESS_BAR_WMARGIN*2]);

    var y = d3.scale.linear()
        .range([MakerViz.PROGRESS_BAR_HEIGHT, 0]);

    var line = d3.svg.line()
        .x(function(d, i) { 
            return x(i); 
        })
        .y(function(d, i) { 
            return y(Math.max(d.tones[0], 0)); 
        });

    var area = d3.svg.area()
        .x(function(d, i) {
            return x(i);
        })
        .y0(MakerViz.PROGRESS_BAR_HEIGHT)
        .y1(function(d, i) {
            return y(Math.max(d.tones[0], 0));
        });

    x.domain([0, HandPlayer.NUM_TONES_PATTERN-1]);
    y.domain([0, LeapManager.NUMBER_OF_TONES]);

    var top = 0;

    for(var inst = 0; inst < pattern.length; ++inst) {
        var color = LeapManager.INSTRUMENT_LIST[inst%LeapManager.INSTRUMENT_LIST.length].color;
        var gContainer = d3.select(".inst-bar-g-" + inst);
        if(gContainer.size() === 0) {
            gContainer = barGroup.append("g")
                .attr("class", "inst-bar-g-" + inst)
                .attr("transform", "translate(" + MakerViz.PROGRESS_BAR_WMARGIN + "," + top + ")");
            this.printRecordedInstLimits(gContainer);

            gContainer.append("path")
                .attr("class", "line")
                .style("stroke", color);
            gContainer.append("path")
                .attr("class", "area")
                .style("fill", color)
                .style("stroke", color);
        }

        gContainer.select(".line")
              .datum(pattern[inst])
              .transition()
              .attr("d", line)
        gContainer.select(".area")
                .datum(pattern[inst])
                .transition()
                .attr("d", area)

        top += MakerViz.PROGRESS_BAR_HEIGHT + MakerViz.MARGIN_BETWEEN_BARS;
    }

    return barGroup;
}


/**
 * Print the bar which informs in what state of pattern recording we are.
 * We could be in the middle of a pattern record or in the finished state when
 * we can decide to add this pattern.
 */
MakerViz.printPattern = function(instrumentBarContainer) {
    d3.select(".pattern-bar-completed").remove();
    d3.select(".pattern-bar-uncompleted").remove();

    var percentage = HandPlayer.activePatterns[0] ? ((HandPlayer.activePatterns[0].index - 1)*100/HandPlayer.NUM_TONES_PATTERN) : 0;

    var coef = percentage/100;

    var barGroup = d3.select(".tempo-line-group");
    if(barGroup.size() !== 0) barGroup.select(".tempo-line")
        .transition()
            .attr("x1", coef * (window.innerWidth - MakerViz.PROGRESS_BAR_WMARGIN))
            .attr("x2", coef * (window.innerWidth - MakerViz.PROGRESS_BAR_WMARGIN))
    else {
        barGroup = instrumentBarContainer.append("g")
            .attr("class", "tempo-line-group")
            .attr("transform", "translate(" + MakerViz.PROGRESS_BAR_WMARGIN + ",0)");

        barGroup.append("svg:line")
            .attr("x1", coef * (window.innerWidth - MakerViz.PROGRESS_BAR_WMARGIN))
            .attr("y1", 0)
            .attr("x2", coef * (window.innerWidth - MakerViz.PROGRESS_BAR_WMARGIN))
            .attr("y2", HandPlayer.activePatterns[0].pattern.length * (MakerViz.PROGRESS_BAR_HEIGHT + MakerViz.MARGIN_BETWEEN_BARS))
            .attr("class","tempo-line");
    }

    var barMargin = 25;
    var height = 40;
    var weightPerc = 10;
    var width = window.innerWidth * weightPerc/100;
    d3.select(".svg-tag").append("rect")
        .attr("class", "pattern-bar-completed")
        .attr("x", barMargin)
        .attr("y", window.innerHeight-barMargin-height)
        .attr("width", width*coef + "px")
        .attr("height", height + "px")
        .style("fill", HandPlayer.patternRecordingEnabled ? "black" : "red");

    d3.select(".svg-tag").append("rect")
        .attr("class", "pattern-bar-uncompleted")
        .attr("x", (barMargin + width*coef) + "px")
        .attr("y", window.innerHeight-barMargin-height)
        .attr("width", width*(100-percentage)/100 + "px")
        .attr("height", height + "px")
        .style("fill", "white");
}

/**
 * In charge of printing the zone where there are no sound.
 */
MakerViz.printSafeZone = function() {
    var marginPercent = Math.max(LeapManager.NO_TONE_MARGIN, 0)*100/(LeapManager.maxValidWidth-LeapManager.minValidWidth);  
    var marginInPixels = marginPercent*window.innerWidth/100;
    d3.select(".svg-tag").append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", marginInPixels + "px")
        .attr("height", window.innerHeight + "px")
        .style("fill", "#BB3E4F");

    d3.select(".svg-tag").append("rect")
        .attr("x", (window.innerWidth - marginInPixels) + "px")
        .attr("y", 0)
        .attr("width", marginInPixels + "px")
        .attr("height", window.innerHeight + "px")
        .style("fill", "#BB3E4F");
}


/**
 * Print numLines horizontal lines simulating a pentagram. Those lines are 
 * equally separated.
 * totalHeight is the total height of all lines.
 * width is the width of each line.
 */
MakerViz.printLines = function(numLines, width, totalHeight) {
    var linesContainer = 
        d3.select(".svg-tag").append("g").attr("class", "lines-container");
    var lineHeight = totalHeight/numLines;

    for(var i = 0; i < numLines; ++i)
        linesContainer.append("svg:line")
            .attr("x1", 0)
            .attr("y1", lineHeight*i)
            .attr("x2", width)
            .attr("y2", lineHeight*i)
            .attr("class","horizontal-line");
}


MakerViz.drawSpeechBallon = function(handid, left, top, instrumentName) {
    d3.selectAll(".speechB.id-" + handid).remove();
    d3.selectAll(".instrumentImg.id-" + handid).remove();
    var speechB = d3.select(".speech-ballons").append("image")
        .attr("href", "./imgs/speechB.png")
        .attr("class", "id-" + handid + " speechB")
        .attr("width", "100px")
        .attr("height", "100px")
        .attr("x", left - 100)
        .attr("y", top - 100);
    var instrumentImg = d3.select(".speech-ballons").append("image")
        .attr("href", "./imgs/" + instrumentName + ".png")
        .attr("class", "id-" + handid + " instrumentImg")
        .attr("width", "40px")
        .attr("height", "40px")
        .attr("x", left - 70)
        .attr("y", top - 82);
    speechB.transition()
        .delay(200)
        .duration(500)
        .attr("x", left - 50)
        .attr("y", top - 50)
        .attr("width", "0")
        .attr("height", "0")
        .style("opacity", "0");
    instrumentImg.transition()
        .delay(200)
        .duration(500)
        .attr("x", left - 35)
        .attr("y", top - 41)
        .attr("width", "0")
        .attr("height", "0")
        .style("opacity", "0");
}


MakerViz.updateHandOnScreen = function(handFrame, handState) {
    var left = Math.max(handFrame.palmPosition[0] - LeapManager.minValidWidth, 0)*100/(LeapManager.maxValidWidth-LeapManager.minValidWidth);
    var top = Math.max(handFrame.palmPosition[1] - LeapManager.minValidHeight, 0)*100/(LeapManager.maxValidHeight-LeapManager.minValidHeight);
    d3.selectAll("circle[cx='" + -this.CIRCLE_RADIUS + "px']").remove();
    d3.selectAll(".no-grabbing.id-" + handFrame.id).remove();
    d3.selectAll("circle[r='0px']").remove();
    var circle = d3.select(".circle-container").append("circle")
        .attr("cx", left*window.innerWidth/100 + "px")
        .attr("cy", (100 - top)*window.innerHeight/100 + "px")
        .attr("r", this.CIRCLE_RADIUS)
        .attr("class", handFrame.type + "-hand-mark " + (LeapManager.isGrabbing(handFrame) ? "grabbing":"no-grabbing") + " id-" + handFrame.id)
    if(LeapManager.isGrabbing(handFrame)) circle.transition()
            .duration(left*20)
            .ease("linear")
            .attr("cx", -this.CIRCLE_RADIUS + "px")
            .attrTween("r", 
                function() { 
                    return function(){ 
                        return Math.max(Math.random()*(MakerViz.CIRCLE_RADIUS-3), 1);
                    } 
                }
            );
    else circle.transition()
            .delay(200)
            .duration(1000)
            .attr("r", "0px");

    this.drawSpeechBallon(handFrame.id, left*window.innerWidth/100, (100 - top)*window.innerHeight/100, LeapManager.INSTRUMENT_LIST[handState.instrumentIndex].name);
}

MakerViz.render = function() {
    var insBarContainer = this.printRecordedInstruments();
    this.printPattern(insBarContainer);
}


MakerViz.adjustSVGArea();
window.addEventListener("resize", MakerViz.adjustSVGArea.bind(MakerViz));
setInterval(MakerViz.render.bind(MakerViz), MakerViz.RENDER_INTERVAL_TIME);
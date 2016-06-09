var MakerViz = {};

MakerViz.CIRCLE_RADIUS = 15;

MakerViz.SCORE_WIDTH = window.innerWidth;
MakerViz.SCORE_HEIGHT = window.innerHeight;

/**
 * Constants containing the percentage used by each instrument change box on the
 * score zone.
 */
MakerViz.INST_CHANGE_HMARGIN_PERCENT = 5;
MakerViz.INST_CHANGE_HEIGHT_PERCENT = 15;

MakerViz.PROGRESS_BAR_WMARGIN = 25;
MakerViz.PROGRESS_BAR_HEIGHT = 25;
MakerViz.MARGIN_BETWEEN_BARS = 3;

MakerViz.TITLE_SPACE = 130;
MakerViz.PROGRESS_BAR_HMARGIN = 25;

MakerViz.LEGEND_WIDTH_PERCENT = 5;

//Constant containing render time.
MakerViz.RENDER_INTERVAL_TIME = 300;

MakerViz.PLAYAREA_HEIGHT = window.innerHeight - LeapManager.INSTRUMENT_LIST.length * (MakerViz.PROGRESS_BAR_HEIGHT + MakerViz.MARGIN_BETWEEN_BARS*2) - MakerViz.TITLE_SPACE - MakerViz.PROGRESS_BAR_HMARGIN*2;

MakerViz.adjustSVGArea = function() {
    d3.select(".svg-tag").remove();

    var svg = d3.select("#svg-container").append("svg")
        .attr("width", window.innerWidth)
        .attr("height", window.innerHeight - MakerViz.TITLE_SPACE)
        .attr("class", "svg-tag");

    var playableHeight = MakerViz.PLAYAREA_HEIGHT;

    var playAreaContainer = svg.append("g")
        .attr("width", window.innerWidth)
        .attr("height", playableHeight)
        .attr("class", "play-area")
        .attr("transform", "translate(0," + (window.innerHeight - MakerViz.TITLE_SPACE - playableHeight) + ")");

    //this.printSafeZone();

    this.printLines(LeapManager.NUMBER_OF_TONES, window.innerWidth, playableHeight);

    playAreaContainer.append("g").attr("class", "circle-container");
    playAreaContainer.append("g").attr("class", "tail-container");

    this.printFinishButton(playAreaContainer);
    this.printInstChangeAreas(playAreaContainer);
    //this.printVoronoi();
    this.drawIndications();
}

MakerViz.printFinishButton = function(playAreaContainer) {
    var margin = MakerViz.PLAYAREA_HEIGHT * MakerViz.INST_CHANGE_HMARGIN_PERCENT / 100;
    var radius = MakerViz.PLAYAREA_HEIGHT * MakerViz.INST_CHANGE_HEIGHT_PERCENT/(2*100);
    playAreaContainer.append("circle")
        .attr("class", "finish-button")
        .attr("cx", margin + radius)
        .attr("cy", margin + radius)
        .attr("r", radius);
    playAreaContainer.append("text")
        .attr("class", "finish-label")
        .attr("x", margin + radius)
        .attr("y", margin + radius)
        .text("Finish!");
};

MakerViz.printInstChangeAreas = function(playAreaContainer) {
    var rectX;
    for(var i = 0; i < LeapManager.INSTRUMENT_LIST.length; ++i) {
        rectX = (i + 1)*MakerViz.PLAYAREA_HEIGHT*(MakerViz.INST_CHANGE_HMARGIN_PERCENT+MakerViz.INST_CHANGE_HEIGHT_PERCENT)/100;
        playAreaContainer.append("rect")
            .attr("class", "change-inst-rect")
            .attr("x", MakerViz.PLAYAREA_HEIGHT * MakerViz.INST_CHANGE_HMARGIN_PERCENT / 100)
            .attr("y", rectX + MakerViz.PLAYAREA_HEIGHT * MakerViz.INST_CHANGE_HMARGIN_PERCENT / 100)
            .attr("width", MakerViz.PLAYAREA_HEIGHT*MakerViz.INST_CHANGE_HEIGHT_PERCENT / 100)
            .attr("height", MakerViz.PLAYAREA_HEIGHT*MakerViz.INST_CHANGE_HEIGHT_PERCENT/100)
            .style("fill", LeapManager.INSTRUMENT_LIST[i].color);
    }
}

/*MakerViz.redrawVoronoi = function() {
    this.voronoiPaths = this.voronoiPaths
        .data(this.voronoi(this.vertices), polygon);

    this.voronoiPaths.exit().transition().attr("fill","blue");

    this.voronoiPaths.enter().append("path")
        .attr("d", polygon);

    this.voronoiPaths.order();

    function polygon(d) {
      return "M" + d.join("L") + "Z";
    }
}

MakerViz.voronoiPaths = undefined;

MakerViz.vertices = undefined;
MakerViz.voronoi = undefined;*/

/*MakerViz.printVoronoi = function() {
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
            .attr("y", 0)
            .attr("width", window.innerWidth - MakerViz.PROGRESS_BAR_WMARGIN*2)
            .attr("height", MakerViz.PROGRESS_BAR_HEIGHT + MakerViz.MARGIN_BETWEEN_BARS*2);
}


/**
 * Given an instrument index returns true if this is the current instrument being
 * used by the user. False otherwise.
 */
MakerViz.isCurrentColor = function(instrumentIndex) {
    return instrumentIndex === LeapManager.currentHandInstrument;
};


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

    var top = MakerViz.PROGRESS_BAR_HMARGIN;

    for(var inst = 0; inst < pattern.length; ++inst) {
        var color = this.isCurrentColor(inst) ? 
            LeapManager.INSTRUMENT_LIST[inst].color : LeapManager.INSTRUMENT_LIST[inst].unselectColor;
        var gContainer = d3.select(".inst-bar-g-" + inst);
        var lContainer = d3.select(".inst-bar-line-g-" + inst);
        if(gContainer.size() === 0) {
            gContainer = barGroup.append("g")
                .attr("class", "inst-bar-g-" + inst)
                .attr("transform", "translate(" + MakerViz.PROGRESS_BAR_WMARGIN + "," + top + ")");
            this.printRecordedInstLimits(gContainer);

            lContainer = gContainer.append("g")
                .attr("class", "inst-bar-line-g-" + inst)
                .attr("transform", "translate(0," + MakerViz.MARGIN_BETWEEN_BARS + ")");

            lContainer.append("path")
                .attr("class", "line")
                .style("stroke", color);
            lContainer.append("path")
                .attr("class", "area")
                .style("fill", color)
                .style("stroke", color);
        }

        lContainer.select(".line")
              .datum(pattern[inst])
              .transition()
              .attr("d", line)
              .style("stroke", color);
        lContainer.select(".area")
                .datum(pattern[inst])
                .transition()
                .attr("d", area)
                .style("fill", color)
                .style("stroke", color);

        //Ensure that it does not contain the class reserver for the current instrument rectangle.
        gContainer.select("rect").classed("current-ints-rect", false);
        //If this is the current selected instrument add the appropriate class to its rect.
        if(this.isCurrentColor(inst)) gContainer.select("rect").classed("current-ints-rect", true);

        top += MakerViz.PROGRESS_BAR_HEIGHT + MakerViz.MARGIN_BETWEEN_BARS*2;
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
    if(barGroup.size() !== 0) {
        barGroup.select(".shader-rect")
            .transition()
                .attr("width", coef * (window.innerWidth - MakerViz.PROGRESS_BAR_WMARGIN))
                .attr("height", HandPlayer.activePatterns[0].pattern.length * (MakerViz.PROGRESS_BAR_HEIGHT + MakerViz.MARGIN_BETWEEN_BARS*2));
        barGroup.select(".tempo-line")
            .transition()
                .attr("x1", coef * (window.innerWidth - MakerViz.PROGRESS_BAR_WMARGIN))
                .attr("x2", coef * (window.innerWidth - MakerViz.PROGRESS_BAR_WMARGIN));
        barGroup.select(".counter")
            .transition()
                .attr("x", coef * (window.innerWidth - MakerViz.PROGRESS_BAR_WMARGIN))
                .text(HandPlayer.activePatterns[0].index);
    }
    else {
        barGroup = instrumentBarContainer.append("g")
            .attr("class", "tempo-line-group")
            .attr("transform", "translate(" + MakerViz.PROGRESS_BAR_WMARGIN + "," + MakerViz.PROGRESS_BAR_HMARGIN + ")");

        barGroup.append("rect")
            .attr("class", "shader-rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", coef * (window.innerWidth - MakerViz.PROGRESS_BAR_WMARGIN))
            .attr("height", HandPlayer.activePatterns[0].pattern.length * (MakerViz.PROGRESS_BAR_HEIGHT + MakerViz.MARGIN_BETWEEN_BARS*2));

        barGroup.append("svg:line")
            .attr("x1", coef * (window.innerWidth - MakerViz.PROGRESS_BAR_WMARGIN))
            .attr("y1", 0)
            .attr("x2", coef * (window.innerWidth - MakerViz.PROGRESS_BAR_WMARGIN))
            .attr("y2", HandPlayer.activePatterns[0].pattern.length * (MakerViz.PROGRESS_BAR_HEIGHT + MakerViz.MARGIN_BETWEEN_BARS*2))
            .attr("class","tempo-line");

        barGroup.append("text")
            .attr("class", "counter")
            .attr("x", coef * (window.innerWidth - MakerViz.PROGRESS_BAR_WMARGIN))
            .attr("y", -5)
            .text(HandPlayer.activePatterns[0].index);
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
/*MakerViz.printSafeZone = function() {
    var leapWidth = LeapManager.MAX_WIDTH - LeapManager.MIN_WIDTH;
    var marginPercent = Math.max(LeapManager.NO_TONE_MARGIN_PERCENT*leapWidth/100, 0)*100/(LeapManager.maxValidWidth-LeapManager.minValidWidth);  
    var marginInPixels = marginPercent*window.innerWidth/100;
    d3.select(".play-area").append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", marginInPixels + "px")
        .attr("height", MakerViz.PLAYAREA_HEIGHT + "px")
        .style("fill", "#BB3E4F");

    d3.select(".play-area").append("rect")
        .attr("x", (window.innerWidth - marginInPixels) + "px")
        .attr("y", 0)
        .attr("width", marginInPixels + "px")
        .attr("height", MakerViz.PLAYAREA_HEIGHT + "px")
        .style("fill", "#BB3E4F");
}*/


/**
 * Print numLines horizontal lines simulating a pentagram. Those lines are 
 * equally separated.
 * totalHeight is the total height of all lines.
 * width is the width of the screen.
 */
MakerViz.printLines = function(numLines, width, totalHeight) {
    var safeZoneWidth = LeapManager.NO_TONE_MARGIN_PERCENT*window.innerWidth/100;
    var linesContainer = 
        d3.select(".play-area").append("g")
            .attr("class", "lines-container")
             .attr("transform", "translate(" + (safeZoneWidth - MakerViz.LEGEND_WIDTH_PERCENT) + ", 0)");
    var lineHeight = totalHeight/numLines;

    linesContainer.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", width - safeZoneWidth*2 - MakerViz.LEGEND_WIDTH_PERCENT)
            .attr("height", lineHeight*(numLines-1))
            .attr("class", "score-rect");

    for(var i = 0; i < numLines; ++i)
        linesContainer.append("svg:line")
            .attr("x1", 0)
            .attr("y1", lineHeight*i)
            .attr("x2", width - safeZoneWidth*2 - MakerViz.LEGEND_WIDTH_PERCENT)
            .attr("y2", lineHeight*i)
            .attr("class", i % 5 === 0 ? "bold-horizontal-line" : "horizontal-line");
}


MakerViz.drawSpeechBallon = function(handid, left, top, instrumentName) {
    d3.selectAll(".speechB.id-" + handid).remove();
    d3.selectAll(".instrumentImg.id-" + handid).remove();
    var speechB = d3.select(".speech-ballons").append("image")
        .attr("href", "imgs/speechB.png")
        .attr("class", "id-" + handid + " speechB")
        .attr("width", "100px")
        .attr("height", "100px")
        .attr("x", left - 100)
        .attr("y", top - 100);
    var instrumentImg = d3.select(".speech-ballons").append("image")
        .attr("href", "imgs/" + instrumentName + ".png")
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

/**
 * Variable containing the id of the timeout set to delete the user pointer
 * when we don't know anything about its hands during a period of time.
 * @type {[type]}
 */
MakerViz.currentHandTimeoutId = undefined;

/**
 * Function in charge of cleaning user pointer.
 */
MakerViz.clearUserPointer = function() {
    var circle = d3.select("circle.hand-mark");
    if(circle.size() === 1) circle.transition()
            .duration(1000)
            .attr("r", "0px");
    ParticleManager.clearUserInformation();
    
    //Show info.
    d3.select("image.main-info-img")
        .transition()
            .duration(2000)
            .attr("opacity", 1);
};

MakerViz.updateHandOnScreen = function(handFrame, handState) {
    //Hide info.
    d3.select("image.main-info-img").attr("opacity", 0);
    
    if(this.currentHandTimeoutId) clearTimeout(this.currentHandTimeoutId);

    var positionPercentage = MusicGenGlobal.getPositionPercentage(handFrame);

    var left = positionPercentage.left;
    var top = positionPercentage.top;
    d3.selectAll("circle.hand-mark").remove();
    var circle = d3.select(".circle-container").append("circle")
        .attr("cx", left*window.innerWidth/100 + "px")
        .attr("cy", top*this.PLAYAREA_HEIGHT/100 + "px")
        .attr("r", this.CIRCLE_RADIUS)
        .attr("class", "hand-mark " + (MusicGenGlobal.isPlaying(handFrame) ? "grabbing":"no-grabbing") + " id-" + handFrame.id)
        .style("fill", LeapManager.INSTRUMENT_LIST[handState.instrumentIndex].color);
    if(MusicGenGlobal.isPlaying(handFrame)) {
        ParticleManager.updateUserInformation(left*window.innerWidth/100, top*this.PLAYAREA_HEIGHT/100, ParticleManager.PLAYING, handState.instrumentIndex);
    }
    else {
        ParticleManager.updateUserInformation(left*window.innerWidth/100, top*this.PLAYAREA_HEIGHT/100, ParticleManager.STOPPED, handState.instrumentIndex);
    }

    if(!MusicGenGlobal.isOnPlayingZone(handFrame)) 
        ParticleManager.updateUserInformation(left*window.innerWidth/100, top*this.PLAYAREA_HEIGHT/100, ParticleManager.ON_SAFE_ZONE, handState.instrumentIndex);

    if(MusicGenGlobal.LEAP_ENABLED)
        this.currentHandTimeoutId = 
            setTimeout(function() { MakerViz.clearUserPointer(); }, 200);

    //this.drawSpeechBallon(handState.handId, left*window.innerWidth/100, top*this.PLAYAREA_HEIGHT/100, LeapManager.INSTRUMENT_LIST[handState.instrumentIndex].name);
};


MakerViz.render = function() {
    var insBarContainer = this.printRecordedInstruments();
    this.printPattern(insBarContainer);
};


MakerViz.drawIndications = function() {
    d3.select(".svg-tag").append("image")
        .attr("href", "imgs/main-info.png")
        .attr("class", "main-info-img")
        .attr("width", window.innerWidth*2/4)
        .attr("height", window.innerHeight*2/4)
        .attr("x", window.innerWidth/4)
        .attr("y", window.innerHeight/4)
        .attr("preserveAspectRatio");
};
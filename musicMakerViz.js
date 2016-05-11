var CIRCLE_RADIUS = 20;

//Constant containing render time.
var RENDER_INTERVAL_TIME = 300;

function adjustSVGArea() {
    d3.select(".svg-tag").remove();

    var svg = d3.select("#svg-container").append("svg")
    .attr("width", window.innerWidth)
    .attr("height", window.innerHeight)
    .attr("class", "svg-tag");

    svg.append("g").attr("class", "circle-container");
    svg.append("g").attr("class", "tail-container");

    printSafeZone();

    printLines(NUMBER_OF_OCTAVES*NUMBER_OF_SEMITONES, window.innerWidth, window.innerHeight);
    svg.append("g").attr("class", "speech-ballons");
}
adjustSVGArea();
window.addEventListener("resize", adjustSVGArea);


/**
 * Print the bar which informs in what state of pattern recording we are.
 * We could be in the middle of a pattern record or in the finished state when
 * we can decide to add this pattern.
 */
function printPattern() {
    d3.select(".pattern-bar-completed").remove();
    d3.select(".pattern-bar-uncompleted").remove();

    var percentage = HandPlayer.patternRecordingEnabled && HandPlayer.currentPatternArray[0] ? (HandPlayer.currentPatternArray[0].length*100/HandPlayer.NUM_TONES_PATTERN) : (!HandPlayer.patternRecordingEnabled ? 100 : 0);

    var barMargin = 25;
    var height = 40;
    var weightPerc = 10;
    var width = window.innerWidth * weightPerc/100;
    d3.select(".svg-tag").append("rect")
        .attr("class", "pattern-bar-completed")
        .attr("x", barMargin)
        .attr("y", window.innerHeight-barMargin-height)
        .attr("width", width*percentage/100 + "px")
        .attr("height", height + "px")
        .style("fill", HandPlayer.patternRecordingEnabled ? "black" : "red");

    d3.select(".svg-tag").append("rect")
        .attr("class", "pattern-bar-uncompleted")
        .attr("x", (barMargin + width*percentage/100) + "px")
        .attr("y", window.innerHeight-barMargin-height)
        .attr("width", width*(100-percentage)/100 + "px")
        .attr("height", height + "px")
        .style("fill", "white");
}

/**
 * In charge of printing the zone where there are no sound.
 */
function printSafeZone() {
    var marginPercent = Math.max(NO_TONE_MARGIN, 0)*100/(maxValidWidth-minValidWidth);  
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
function printLines(numLines, width, totalHeight) {
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


function drawSpeechBallon(handid, left, top, instrumentName) {
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


function updateHandOnScreen(handFrame, handState) {
    var left = Math.max(handFrame.palmPosition[0] - minValidWidth, 0)*100/(maxValidWidth-minValidWidth);
    var top = Math.max(handFrame.palmPosition[1] - minValidHeight, 0)*100/(maxValidHeight-minValidHeight);
    d3.selectAll("circle[cx='" + -CIRCLE_RADIUS + "px']").remove();
    d3.selectAll(".no-grabbing.id-" + handFrame.id).remove();
    d3.selectAll("circle[r='0px']").remove();
    var circle = d3.select(".circle-container").append("circle")
        .attr("cx", left*window.innerWidth/100 + "px")
        .attr("cy", (100 - top)*window.innerHeight/100 + "px")
        .attr("r", CIRCLE_RADIUS)
        .attr("class", handFrame.type + "-hand-mark " + (isGrabbing(handFrame) ? "grabbing":"no-grabbing") + " id-" + handFrame.id)
    if(isGrabbing(handFrame)) circle.transition()
            .duration(left*20)
            .ease("linear")
            .attr("cx", -CIRCLE_RADIUS + "px")
            .attrTween("r", 
                function() { 
                    return function(){ 
                        return Math.max(Math.random()*(CIRCLE_RADIUS-3), 1);
                    } 
                }
            );
    else circle.transition()
            .delay(200)
            .duration(1000)
            .attr("r", "0px");

    drawSpeechBallon(handFrame.id, left*window.innerWidth/100, (100 - top)*window.innerHeight/100, INSTRUMENT_LIST[handState.instrumentIndex].name);
}

function render() {
    printPattern();
}

setInterval(render, RENDER_INTERVAL_TIME);
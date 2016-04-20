d3.select("#svg-container").append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("class", "svg-tag")
    .attr("background-color", "pink");

function updateHandOnScreen(handFrame, handState) {
    var left = Math.max(handFrame.palmPosition[0] - MIN_WIDTH, 0)*100/(MAX_WIDTH-MIN_WIDTH);
    var top = Math.max(handFrame.palmPosition[1] - MIN_HEIGHT, 0)*100/(MAX_HEIGHT-MIN_HEIGHT);
    d3.select(".svg-tag").append("circle")
        .attr("cx", left + "%")
        .attr("cy", (100 - top) + "%")
        .attr("r", 20)
        .style("fill", "black");
}
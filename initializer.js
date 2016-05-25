MakerViz.adjustSVGArea();
window.addEventListener("resize", MakerViz.adjustSVGArea.bind(MakerViz));
setInterval(MakerViz.render.bind(MakerViz), MakerViz.RENDER_INTERVAL_TIME);

//Call this method when loading the website.
LeapManager.adjustLeapValidArea();
window.addEventListener("resize", LeapManager.adjustLeapValidArea.bind(LeapManager));

setInterval(HandPlayer.processTones.bind(HandPlayer), HandPlayer.INTERVAL_TIME);
MusicGenGlobal = {};

MusicGenGlobal.LEAP_ENABLED = false;


/**
 * Returns true if the user is doing the action it requires to play the instrument.
 * @param  {[type]}  handFrame Only necessary when leap_enabled is set to true.
 */
MusicGenGlobal.isPlaying = function(handFrame) {
    if(MusicGenGlobal.LEAP_ENABLED) return LeapManager.isGrabbing(handFrame);
    else return MouseManager.pressed;
};

/**
 * Returns true if the user is on the playing zone, false otherwise.
 * @param  {[type]}  jockerObject Is a handFrame when leap_enabled. A mouseEvent otherwise.
 */
MusicGenGlobal.isOnPlayingZone = function(jockerObject) {
    if(MusicGenGlobal.LEAP_ENABLED) return LeapManager.isOnPlayingZone(jockerObject.palmPosition[0]);
    else return MouseManager.isOnPlayingZone(jockerObject);
};

MusicGenGlobal.getPositionPercentage = function(jockerObject) {
    if(MusicGenGlobal.LEAP_ENABLED) return LeapManager.getPositionPercentage(jockerObject);
    else return MouseManager.getPositionPercentage(jockerObject);
};

/**
 * Given an object with top and left percentages correspondent to the current 
 * user position, returns the instrument id the user is changing, -1 if he is
 * outside of the changing area.
 */
MusicGenGlobal.getInstrumentChange = function(posPerct) {

    if(posPerct.left <= MakerViz.INST_CHANGE_WIDTH_PERCENT) {
        var instHeight = MakerViz.INST_CHANGE_HEIGHT_PERCENT + MakerViz.INST_CHANGE_HMARGIN_PERCENT;
        var instId = parseInt(posPerct.top / instHeight);
        if(posPerct.top >= instId*instHeight+MakerViz.INST_CHANGE_HMARGIN_PERCENT) return instId;
    }
    return -1;
};


MakerViz.adjustSVGArea();
window.addEventListener("resize", MakerViz.adjustSVGArea.bind(MakerViz));
setInterval(MakerViz.render.bind(MakerViz), MakerViz.RENDER_INTERVAL_TIME);

//Call this method when loading the website.
if(MusicGenGlobal.LEAP_ENABLED) {
    LeapManager.adjustLeapValidArea();
    window.addEventListener("resize", LeapManager.adjustLeapValidArea.bind(LeapManager));
}

setInterval(HandPlayer.processTones.bind(HandPlayer), HandPlayer.INTERVAL_TIME);

ParticleManager.loadCanvasParticles();

if(!MusicGenGlobal.LEAP_ENABLED) {
    LeapManager.paused = true;
    MouseManager.loadMouseConfig();
}
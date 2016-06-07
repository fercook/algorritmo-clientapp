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
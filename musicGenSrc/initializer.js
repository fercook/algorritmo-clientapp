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
    var widthChangeArea = MakerViz.PLAYAREA_HEIGHT*
        (MakerViz.INST_CHANGE_SELECTED_HEIGHT_PERCENT+MakerViz.INST_CHANGE_HMARGIN_PERCENT) / 100
    var currentWidth = posPerct.left*window.innerWidth/100;
    if(currentWidth <= widthChangeArea) {
        var instHeight = MakerViz.INST_CHANGE_SELECTED_HEIGHT_PERCENT + (MakerViz.INST_CHANGE_HMARGIN_PERCENT/2);
        var instId = parseInt(Math.max((posPerct.top - MakerViz.INST_CHANGE_LABEL_HEIGHT), 0) / instHeight);
        if(posPerct.top >= instId*instHeight+MakerViz.INST_CHANGE_HMARGIN_PERCENT*1.5+MakerViz.INST_CHANGE_LABEL_HEIGHT) return instId;
    }
    return -1;
};

/**
 * Returns true when the current position matches the "finish" button position.
 */
MusicGenGlobal.isFinishPressed = function(posPerct) {
    var widthComposerArea = window.innerWidth - LeapManager.NO_TONE_MARGIN_PERCENT*window.innerWidth/100;
    var currentWidth = posPerct.left*window.innerWidth/100;
    if(currentWidth >= widthComposerArea) {
        var instHeight = MakerViz.INST_CHANGE_SELECTED_HEIGHT_PERCENT + MakerViz.INST_CHANGE_HMARGIN_PERCENT;
        //We subtract 1, because the first element of the list of boxes is the finish button.
        if((100-posPerct.top) >= MakerViz.INST_CHANGE_HMARGIN_PERCENT &&
            (100-posPerct.top) <= MakerViz.INST_CHANGE_HMARGIN_PERCENT+instHeight) return true;
    }
    return false;
};

/**
 * Method executed when the composition should finish. Manages song generation 
 * and page change.
 */
MusicGenGlobal.finishComposition = function() {
    console.warn("CLAPPIIING!!!");
    HandPlayer.generateMidiFile();

    //Go to vote page.
    window.location.href = window.location.pathname + 'index_HorS.html';
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
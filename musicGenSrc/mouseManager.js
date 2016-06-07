MouseManager = {};

MouseManager.pressed = false;

MouseManager.loadMouseConfig = function() {
    d3.select("body")
        .on("mousedown", function() {
            //If left click.
            //NOTE: button parameter is fill with a number, this number is the sum
            //of all the identifier of the pressed buttons.
            //left button of mouse is the only one that has a odd number (1).
            if(d3.event.buttons%2 === 1) MouseManager.pressed = true;
            console.log("MOUSE DOWN!" + d3.event.buttons + " " + MouseManager.pressed);
            this.mouseoverBehaviour();
        }.bind(this))
        .on("mouseup", function() {
            //IF left click.
            if(d3.event.buttons%2 === 0) MouseManager.pressed = false;
            console.log("MOUSE UP!" + d3.event.buttons + " " + MouseManager.pressed);
            this.mouseoverBehaviour();
        }.bind(this))
        .on("mouseleave", function() {
            MouseManager.pressed = false;
            console.log("MOUSE LEAVE!");
            this.mouseoverBehaviour();
        }.bind(this))
        .on("mousemove", this.mouseoverBehaviour);
};


MouseManager.mouseoverBehaviour = function() {
    var fakeHandState = {
        handId: 0,
        instrumentIndex: LeapManager.currentHandInstrument,
        currentTone: null,
        channel: LeapManager.INSTRUMENT_LIST[LeapManager.currentHandInstrument].channel,
        type: "right",
    };
    LeapManager.handArray[0] = fakeHandState;

    MouseManager.processMouseOver(d3.event, fakeHandState);
};

MouseManager.processMouseOver = function(mouseEvent, handState) {
    if(this.pressed && this.isOnPlayingZone(mouseEvent)) {
        var tone = this.getTone(mouseEvent);
        handState.currentTone = tone;
    }

    else handState.currentTone = null;

    MakerViz.updateHandOnScreen(mouseEvent, handState);
};

/**
 * Given a mouse event comming from a mouse over, returns True if this mouse
 * is on the playable area. False otherwise.
 */
MouseManager.isOnPlayingZone = function(mouseEvent) {
    return (mouseEvent.clientY > window.innerHeight - MakerViz.PLAYAREA_HEIGHT && 
        mouseEvent.clientY < window.innerHeight) && (mouseEvent.clientX > LeapManager.NO_TONE_MARGIN_PERCENT * window.innerWidth/100 &&
        mouseEvent.clientX < window.innerWidth - LeapManager.NO_TONE_MARGIN_PERCENT * window.innerWidth/100);
};

MouseManager.getTone = function(mouseEvent) {
    var posPerct = this.getPositionPercentage(mouseEvent);

    var semitoneHeight = 100/LeapManager.NUMBER_OF_TONES;

    return (100-posPerct.top) / semitoneHeight;
};


/**
 * Given a mouse event, returns percentages for the current mouse point.
 */
MouseManager.getPositionPercentage = function(mouseEvent) {
    var result = {};
    result["left"] = mouseEvent.clientX*100/window.innerWidth;
    result["top"] = Math.max(mouseEvent.clientY - (window.innerHeight - MakerViz.PLAYAREA_HEIGHT), 0)*100/MakerViz.PLAYAREA_HEIGHT;

    return result;
};

//MusicMakerViz.isMouseOnPlayingArea();
////MusicMakerViz.isMouseOnSafeArea();
/////MusicMakerViz.isMouseOnInstChangeArea();
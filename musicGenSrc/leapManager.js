var LeapManager = {};

//Constants containing the palm height range that leap motion is able to recognize.

LeapManager.MIN_HEIGHT = 100;
LeapManager.MAX_HEIGHT = 400;

//Constants containing the palm width range that leap motion is able to recognize.
LeapManager.MIN_WIDTH = -150;
LeapManager.MAX_WIDTH = 150;

//Margin on each side reserved to the non-tone zone.
//This is a zone in which there is no tone played even if we are using the gesture
//to play tones.
//This allows the user to stop and continue playing a tone very fast, without changing
//the playing gesture.
LeapManager.NO_TONE_MARGIN_PERCENT = 10.5;

//Variables containing the palm height range accepted as a input. 
//This range will depend on the screen aspect ratio, defining this way a better 
//user experience.
LeapManager.minValidWidth = LeapManager.MIN_WIDTH;
LeapManager.maxValidWidth = LeapManager.MAX_WIDTH;

//Variables containing the palm width range accepted as a input. 
//This range will depend on the screen aspect ratio, defining this way a better 
//user experience.
LeapManager.minValidHeight = LeapManager.MIN_HEIGHT;
LeapManager.maxValidHeight = LeapManager.MAX_HEIGHT;

//Constants containing threshold at which a gesture starts being identified as valid.
//The leap motion library provides a percentage indicating how possible it's the user
//to be doing a specific gesture. This rate goes from 0 to 1.
LeapManager.GRAB_THRESHOLD = 0.8;
LeapManager.PINCH_THRESHOLD = 0.8;

/**
 * Number of tones used, we will paint as many line intervals as tones, and this
 * will be the playable amount of tones.
 */
LeapManager.NUMBER_OF_TONES = 3*10;


//NOTE: Midi notes and semi-notes goes from 0 to 11. And if we want to specify octave, we 
//      should calculate note + 12 * octave. (octaves goes from 0 to 9, both included).
//Height of each semitone. There are 12 seminotes * 10 octaves.
LeapManager.semitoneHeight = (LeapManager.maxValidHeight-LeapManager.minValidHeight)/(LeapManager.NUMBER_OF_TONES);


LeapManager.INSTRUMENT_LIST = [
    {id: 0,
     name: "acoustic_grand_piano",
     color: "#fe40e0",
     unselectColor: "grey",
     channel: 0},
    {id: 114,
     name: "steel_drums",
     color: "#1efef6",
     unselectColor: "grey",
     channel: 1},
    {id: 33,
     name: "electric_bass_finger",
     color: "#febc1d",
     unselectColor: "grey",
     channel: 2},
];

//Array, for each hand we'll have an array.
LeapManager.handArray = [];

//This variables will contain the last instrument assign to the current
//hand respectively. And this instrument will be the default one when detecting
//a new hand. This way we minimize the effect of losing track of a hand.
LeapManager.currentHandInstrument = 0;

// Store frame for motion functions
LeapManager.previousFrame = null;
LeapManager.paused = false;
var pauseOnGesture = false;

// Setup Leap loop with frame callback function
var controllerOptions = {enableGestures: true};
var handId = -1;
var betweenNotes = false;


/**
 * Given a color with format 0xfe40e0 returns #fe40e0.
 */
LeapManager.hashToHexadecimal = function(color) {
  return "0x" + color.substring(1);
}

/**
 * This method adjust the limits of the valid area. This is the interactive area 
 * when using the leap motion. 
 * This area will be the maximum area possible, the one that matches the screen
 * aspect ratio and not exceeds the box limited by (MIN|MAX_WIDTH, MIN|MAX_HEIGHT).
 */
LeapManager.adjustLeapValidArea = function() {
    var leapWidth = (this.MAX_WIDTH-this.MIN_WIDTH);
    var leapHeight = (this.MAX_HEIGHT-this.MIN_HEIGHT);
    if(window.innerWidth/MakerViz.PLAYAREA_HEIGHT >= leapWidth/leapHeight) {
        LeapManager.minValidWidth = LeapManager.MIN_WIDTH;
        LeapManager.maxValidWidth = LeapManager.MAX_WIDTH;

        var leapValidHeight = MakerViz.PLAYAREA_HEIGHT*leapWidth/window.innerWidth
        var leapUselessMargin = (leapHeight - leapValidHeight)/2;
        this.minValidHeight = this.MIN_HEIGHT+leapUselessMargin;
        this.maxValidHeight = this.MAX_HEIGHT-leapUselessMargin;
    }
    else {
        var leapValidWidth = window.innerWidth*leapHeight/MakerViz.PLAYAREA_HEIGHT
        var leapUselessMargin = (leapWidth - leapValidWidth)/2;
        this.minValidWidth = this.MIN_WIDTH+leapUselessMargin;
        this.maxValidWidth = this.MAX_WIDTH-leapUselessMargin;

        this.minValidHeight = this.MIN_HEIGHT;
        this.maxValidHeight = this.MAX_HEIGHT;
    }
    this.semitoneHeight = (this.maxValidHeight-this.minValidHeight)/(LeapManager.NUMBER_OF_TONES);
}


/**
 * Maps palm height to a tone.
 * @param  {float} palmHeight height at which the user placed its palm.
 * @return {int}            tone this height maps to.
 */
LeapManager.getTone = function(palmHeight) {
    var currentTone = parseInt(Math.max(palmHeight-LeapManager.minValidHeight, 0.1)/LeapManager.semitoneHeight);
    console.log("TONE: " + Math.min(currentTone, LeapManager.NUMBER_OF_TONES - 1));
    return Math.min(currentTone, LeapManager.NUMBER_OF_TONES - 1);
}

/**
 * True if this hand is grabbing, false otherwise.
 * @param  {json}  hand json with a hand information. Format provided by Leap 
 *                      Motion library.
 * @return {Boolean}    True if this hand is grabbing, false otherwise.
 */
LeapManager.isGrabbing = function(hand) {
    return hand.grabStrength >= LeapManager.GRAB_THRESHOLD;
}

LeapManager.isPinching = function(hand) {
    return hand.pinchStrength >= LeapManager.PINCH_THRESHOLD;
}


/**
 * Marks the current hand state as not pinching. This means that the pinching
 * gesture ended.
 * @param  {[type]} hand json containing a hand state.
 */
/*LeapManager.markAsNonPinching = function(hand) {
    if(hand.justPinched) console.log("Pinch gesture ends.");
    hand.justPinched = false;
}*/


/**
 * Removes all hands registered in the handArray.
 */
LeapManager.removeCurrentHands = function() {
    this.handArray = [];
}


/**
 * Given a  json containing a frame for a hand, adds this hand to our system.
 * @param  {json} handFrame json with a hand frame.
 * @return {json}        returns a json containing the new hand state.
 */
LeapManager.replaceHand = function(handFrame) {
    var newHandState = {
        handId: handFrame.id,
        //TODO: What happens if I put a hand out of leap motion scope and
        //put it back? A new hand is created and our current instrument is the
        //default 0 one. So what we should do is assign by default the last 
        //instrument played by a left|right hand.
        instrumentIndex: this.currentHandInstrument,
        currentTone: null,
        justPinched: false,
        //TODO: What happens if our user start putting out and in scope one of 
        //their hands. This hand will end up having the same channel assigned 
        //that the one that is permanent inside of scope.
        //We should use the channel of the hand that stopped being detected for 
        //longer.
        channel: this.INSTRUMENT_LIST[this.currentHandInstrument].channel,
        type: handFrame.type,
    };

    this.handArray[0] = newHandState;
    return newHandState;
}

/**
 * Given a hand id, returns the current state of this hand.
 * undefined if we don't have state for this hand.
 * @param  {int} handId Identifier of a hand.
 * @return {json}        json with hand state. Undefined if this hand has not 
 *                         state (first time that we notice it).
 */
LeapManager.getHandState = function(handId) {
    for(var i = 0; i < this.handArray.length; ++i) {
        if(this.handArray[i].handId === handId) return this.handArray[i];
    }
    return undefined;
}

/**
 * If the user is doing the gesture to throw spiderweb return true.
 * Otherwise false.
 */
LeapManager.isThrowingSpiderWeb = function(handFrame) {
    var passIndex, passMiddle, passRing, passPinky;
    passIndex = passMiddle = passRing = passPinky = false;
    for(var i = 0; i < handFrame.pointables.length; ++i) {
        switch(handFrame.pointables[i].type) {
            //Index finger
            case 1:
                passIndex = handFrame.pointables[i].direction[1] >= -0.25;
                break;
            //Middle finger
            case 2:
                passMiddle = handFrame.pointables[i].direction[1] <= -0.65;
                break;
            //Ring finger
            case 3:
                passRing = handFrame.pointables[i].direction[1] <= -0.65;
                break;
            //Pinky finger
            case 4:
                passPinky = handFrame.pointables[i].direction[1] >= -0.25;
                break;
        };
    }

    return passIndex && passPinky && (passMiddle || passRing);
}

/**
 * Changes the handState instrument to the next one. Instruments are sorted 
 * according to INSTRUMENT_LIST order and rotate accordingly.
 * 
 * @param  {json} handState Current state of the hand that is changing instrument.
 */
LeapManager.changeToNextIntrument = function(handState) {
    handState.instrumentIndex = (++handState.instrumentIndex) % LeapManager.INSTRUMENT_LIST.length;
    handState.justPinched = true;

    this.currentHandInstrument = handState.instrumentIndex;
}

/**
 * Changes the handState instrument to the given one.
 * 
 * @param  {integer} instrumentIndex  Index pointing to the position on 
 *                                    LeapManager.INSTRUMENT_LIST where there is 
 *                                    the instrument we want to assign.
 * @param  {json} handState Current state of the hand that is changing instrument.
 */
LeapManager.changeToGivenInstrument = function(handState, instrumentIndex) {
    if(0 <= instrumentIndex && instrumentIndex < LeapManager.INSTRUMENT_LIST.length) {
       handState.instrumentIndex = instrumentIndex;

       this.currentHandInstrument = handState.instrumentIndex; 
    }
    else console.error("changeToGivenIntrument: Trying to assign an instrument which does not exist.")
}

/**
 * Returns true if the user have its hand into the playing zone. False
 * if this hand is in non-tone zone.
 * @param  {[int]}  palmWidth Width at which the user has the processed hand.
 * @return {Boolean}  
 */
LeapManager.isOnPlayingZone = function(palmWidth) {
  var leapWidth = LeapManager.MAX_WIDTH - LeapManager.MIN_WIDTH;
  if(palmWidth < LeapManager.MIN_WIDTH + LeapManager.NO_TONE_MARGIN_PERCENT*leapWidth/100 || 
    palmWidth > LeapManager.MAX_WIDTH - LeapManager.NO_TONE_MARGIN_PERCENT*leapWidth/100) return false;
  return true;
}

LeapManager.isFlippingHand = function(handFrame, previousFrame) {
    if(handFrame.type === "left")
        return handFrame.rotationAxis(previousFrame, 2)[2] <= -0.7;
    else 
        return handFrame.rotationAxis(previousFrame, 2)[2] >= 0.7;
}

/**
 * Removes all hands in handArray which are not in hands array.
 * @param  {[type]} hands [description]
 * @return {[type]}       [description]
 */
LeapManager.cleanHands = function(hands) {
    var newHandArray = [];
    for(var i = 0; i < this.handArray.length; ++i) {
        var isInFrame = false;
        for(var j = 0; j < hands.length; ++j) {
            if(this.handArray[i].handId === hands[j].id) isInFrame = true;
        }
        if(isInFrame) newHandArray.push(this.handArray[i]); 
    }
    this.handArray = newHandArray;
}

/**
 * Process information about the current hand.
 * @param  {[type]} handFrame json containing a frame information of a specific 
 *                            hand, provided by the leap motion library.
 */
LeapManager.processHand = function(handFrame, handState, previousFrame) {
    var palmHeight = handFrame.palmPosition[1];
    var palmWidth = handFrame.palmPosition[0];
    
    //When grabbing the user is playing a tone.
    //Otherwise no tone is played.
    if(this.isGrabbing(handFrame) && this.isOnPlayingZone(palmWidth)) {
        var tone = this.getTone(palmHeight);
        handState.currentTone = tone;
    }
    else {
        handState.currentTone = null;

        //When pinching we are changing the instrument (if not grabbing).
        /*if(this.isPinching(handFrame) && !handState.justPinched) this.changeToNextIntrument(handState);
        else if(!this.isPinching(handFrame)) this.markAsNonPinching(handState);*/
    }

    //Instrument selection.
    instIndex = MusicGenGlobal.getInstrumentChange(this.getPositionPercentage(handFrame));
    if(instIndex >= 0) this.changeToGivenInstrument(handState, instIndex);

    /*if(this.isFlippingHand(handFrame, previousFrame)) {
        console.log("Hand flipped!!!");
        HandPlayer.activateCurrentPattern();
    }*/

    /*if(this.isThrowingSpiderWeb(handFrame)) {
        console.log("Is Throwing Spider webs!!!")
        if(HandPlayer.isRecording() && HandPlayer.enoughtRecordingTime()) HandPlayer.generateMidiFile();
        else if(!HandPlayer.isRecording()) HandPlayer.startRecording();
    }*/

    MakerViz.updateHandOnScreen(handFrame, handState);
}

//Leap loop. It will receive user interaction using leap motion.
Leap.loop(controllerOptions, function(frame) {
    if(LeapManager.paused) {
        return; // Skip this update
    }

    var handState, handFrame;
    for(var i = 0; i < frame.hands.length; ++i) {
        handFrame = frame.hands[i];
        handState = LeapManager.getHandState(handFrame.id);
        if(handState) break;
    }
    //If the only hand being tracked is in the new frame, let's process it.
    //Otherwise let's start tracking the first hand in the current frame.
    if(handState === undefined && frame.hands.length > 0) {
        handFrame = frame.hands[0]
        handState = LeapManager.replaceHand(handFrame);
    }

    if(handState !== undefined) {
      LeapManager.processHand(handFrame, handState, LeapManager.previousFrame);
    }
    else LeapManager.removeCurrentHands();

    if(LeapManager.isClapping(frame.hands) || 
        MusicGenGlobal.isFinishPressed(this.getPositionPercentage(handFrame))) 
            MusicGenGlobal.finishComposition();

    // Store frame for motion functions
    LeapManager.previousFrame = frame;
});

/**
 * Returns true if the current user is clapping, given an
 * array with every hand of the current frame.
 */
LeapManager.isClapping = function(frameHands) {
    if(frameHands.length === 2 && CommonGestureManager.checkClap(frameHands[0], frameHands[1]))
        return true;
    return false;
}

/**
 * Given a hand frame, returns percentages for the current hand position.
 */
LeapManager.getPositionPercentage = function(handFrame) {
    var result = {};
    result["left"] = Math.max(handFrame.palmPosition[0] - LeapManager.minValidWidth, 0)*100/(LeapManager.maxValidWidth-LeapManager.minValidWidth);
    result["top"] = 100 - Math.min(Math.max(handFrame.palmPosition[1] - LeapManager.minValidHeight, 0)*100/(LeapManager.maxValidHeight-LeapManager.minValidHeight), 100);

    return result;
};
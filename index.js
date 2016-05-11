var LeapManager = {};

//Constants containing the palm height range that leap motion is able to recognize.
LeapManager.MIN_HEIGHT = 80;
LeapManager.MAX_HEIGHT = 400;

//Constants containing the palm width range that leap motion is able to recognize.
LeapManager.MIN_WIDTH = -150;
LeapManager.MAX_WIDTH = 150;

//Margin on each side reserved to the non-tone zone.
//This is a zone in which there is no tone played even if we are using the gesture
//to play tones.
//This allows the user to stop and continue playing a tone very fast, without changing
//the playing gesture.
LeapManager.NO_TONE_MARGIN = 50;

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
LeapManager.PINCH_THRESHOLD = 0.6;

LeapManager.NUMBER_OF_OCTAVES = 7;
LeapManager.NUMBER_OF_SEMITONES = 12;

//NOTE: Midi notes and semi-notes goes from 0 to 11. And if we want to specify octave, we 
//      should calculate note + 12 * octave. (octaves goes from 0 to 9, both included).
//Height of each semitone. There are 12 seminotes * 10 octaves.
LeapManager.semitoneHeight = (LeapManager.maxValidHeight-LeapManager.minValidHeight)/(LeapManager.NUMBER_OF_SEMITONES*LeapManager.NUMBER_OF_OCTAVES);


LeapManager.INSTRUMENT_LIST = [
    {id: 0,
     name: "acoustic_grand_piano"},
    {id: 40,
     name: "violin"},
    {id: 33,
     name: "electric_bass_finger"},
    /*{id: 50,
     name: "synth_strings_1"},*/
]

//Array, for each hand we'll have an array.
LeapManager.handArray = [];

//This variables will contain the last instrument assign to a left and right
//hand respectively. And this instrument will be the default one when detecting
//a new hand. This way we minimize the effect of losing track of a hand.
LeapManager.leftHandInstrument = 0;
LeapManager.rightHandInstrument = 0;

// Store frame for motion functions
LeapManager.previousFrame = null;
var paused = false;
var pauseOnGesture = false;

// Setup Leap loop with frame callback function
var controllerOptions = {enableGestures: true};
var handId = -1;
var betweenNotes = false;

/**
 * This method adjust the limits of the valid area. This is the interactive area 
 * when using the leap motion. 
 * This area will be the maximum area possible, the one that matches the screen
 * aspect ratio and not exceeds the box limited by (MIN|MAX_WIDTH, MIN|MAX_HEIGHT).
 */
LeapManager.adjustLeapValidArea = function() {
    var leapWidth = (this.MAX_WIDTH-this.MIN_WIDTH);
    var leapHeight = (this.MAX_HEIGHT-this.MIN_HEIGHT);
    if(window.innerWidth/window.innerHeight >= leapWidth/leapHeight) {
        LeapManager.minValidWidth = LeapManager.MIN_WIDTH;
        LeapManager.maxValidWidth = LeapManager.MAX_WIDTH;

        var leapValidHeight = window.innerHeight*leapWidth/window.innerWidth
        var leapUselessMargin = (leapHeight - leapValidHeight)/2;
        this.minValidHeight = this.MIN_HEIGHT+leapUselessMargin;
        this.maxValidHeight = this.MAX_HEIGHT-leapUselessMargin;
    }
    else {
        var leapValidWidth = window.innerWidth*leapHeight/window.innerHeight
        var leapUselessMargin = (leapWidth - leapValidWidth)/2;
        this.minValidWidth = this.MIN_WIDTH+leapUselessMargin;
        this.maxValidWidth = this.MAX_WIDTH-leapUselessMargin;

        this.minValidHeight = this.MIN_HEIGHT;
        this.maxValidHeight = this.MAX_HEIGHT;
    }
    this.semitoneHeight = (this.maxValidHeight-this.minValidHeight)/(this.NUMBER_OF_SEMITONES*this.NUMBER_OF_OCTAVES);
}
//Call this method when loading the website.
LeapManager.adjustLeapValidArea();
window.addEventListener("resize", LeapManager.adjustLeapValidArea.bind(LeapManager));

/**
 * Maps palm height to a tone.
 * @param  {float} palmHeight height at which the user placed its palm.
 * @return {int}            tone this height maps to.
 */
LeapManager.getTone = function(palmHeight) {
    var currentTone = parseInt(Math.max(palmHeight-LeapManager.minValidHeight, 0.1)/LeapManager.semitoneHeight);
    console.log("TONE: " + Math.min(currentTone, LeapManager.NUMBER_OF_SEMITONES*LeapManager.NUMBER_OF_OCTAVES - 1));
    return Math.min(currentTone, LeapManager.NUMBER_OF_SEMITONES*LeapManager.NUMBER_OF_OCTAVES - 1);
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
LeapManager.markAsNonPinching = function(hand) {
    if(hand.justPinched) console.log("Pinch gesture ends.");
    hand.justPinched = false;
}

/**
 * Given a json containing a frame for a hand, adds this hand to our system.
 * @param  {json} handFrame json with a hand frame.
 * @return {json}        returns a json containing the new hand state.
 */
LeapManager.addHand = function(handFrame) {
    var newHandState = {
        handId: handFrame.id,
        //TODO: What happens if I put a hand out of leap motion scope and
        //put it back? A new hand is created and our current instrument is the
        //default 0 one. So what we should do is assign by default the last 
        //instrument played by a left|right hand.
        instrumentIndex: handFrame.type === "right" ? this.rightHandInstrument : this.leftHandInstrument,
        currentTone: null,
        justPinched: false,
        //TODO: What happens if our user start putting out and in scope one of 
        //their hands. This hand will end up having the same channel assigned 
        //that the one that is permanent inside of scope.
        //We should use the channel of the hand that stopped being detected for 
        //longer.
        channel: this.handArray.length > 0 ? (this.handArray[this.handArray.length-1].channel+1)%16 : 0,
        type: handFrame.type,
    };

    this.handArray[this.handArray.length] = newHandState;
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
 * @param  {string} handType  If the current hand is a left one or right one.
 * @param  {json} handState Current state of the hand that is changing instrument.
 */
LeapManager.changeToNextIntrument = function(handType, handState) {
    handState.instrumentIndex = (++handState.instrumentIndex) % LeapManager.INSTRUMENT_LIST.length;
    handState.justPinched = true;

    if(handType === "right") this.rightHandInstrument = handState.instrumentIndex;
    else this.leftHandInstrument = handState.instrumentIndex;
}

/**
 * Returns true if the user have its hand into the playing zone. False
 * if this hand is in non-tone zone.
 * @param  {[int]}  palmWidth Width at which the user has the processed hand.
 * @return {Boolean}  
 */
LeapManager.isOnPlayingZone = function(palmWidth) {
  if(palmWidth < LeapManager.MIN_WIDTH + LeapManager.NO_TONE_MARGIN || 
    palmWidth > LeapManager.MAX_WIDTH - LeapManager.NO_TONE_MARGIN) return false;
  return true;
}

LeapManager.isFlippingHand = function(handFrame, previousFrame) {
    if(handFrame.type === "left")
        return handFrame.rotationAxis(previousFrame, 2)[2] <= -0.7;
    else 
        return handFrame.rotationAxis(previousFrame, 2)[2] >= 0.7;
}

/**
 * When we get information about an specific hand, process it.
 * @param  {[type]} handFrame json containing a frame information of a specific 
 *                            hand, provided by the leap motion library.
 */
LeapManager.processHand = function(handFrame, previousFrame) {
    //Get json with current state.
    var handState = this.getHandState(handFrame.id);

    if(handState === undefined) var handState = this.addHand(handFrame);

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
        if(this.isPinching(handFrame) && !handState.justPinched) this.changeToNextIntrument(handFrame.type, handState);
        else if(!this.isPinching(handFrame)) this.markAsNonPinching(handState);
    }

    if(this.isFlippingHand(handFrame, previousFrame)) {
        console.log("Hand flipped!!!");
        HandPlayer.activateCurrentPattern();
    }

    if(this.isThrowingSpiderWeb(handFrame)) {
        console.log("Is Throwing Spider webs!!!")
        if(HandPlayer.isRecording() && HandPlayer.enoughtRecordingTime()) HandPlayer.generateMidiFile();
        else if(!HandPlayer.isRecording()) HandPlayer.startRecording();
    }

    MakerViz.updateHandOnScreen(handFrame, handState);
}

//Leap loop. It will receive user interaction using leap motion.
Leap.loop(controllerOptions, function(frame) {
  if(paused) {
      return; // Skip this update
  }

  for(var i = 0; i < frame.hands.length; ++i) {
      LeapManager.processHand(frame.hands[i], LeapManager.previousFrame);
  }

  var handOutput = document.getElementById("handData");
  var handString = "";
  if (frame.hands.length > 0) {
    for (var i = 0; i < frame.hands.length; i++) {
      var hand = frame.hands[i];

      handString += "<div style='width:300px; float:left; padding:5px'>";
      handString += "Hand ID: " + hand.id + "<br />";
      handString += "Type: " + hand.type + " hand" + "<br />";
      handString += "Direction: " + vectorToString(hand.direction, 2) + "<br />";
      handString += "Palm position: " + vectorToString(hand.palmPosition) + " mm<br />";
      handString += "Grab strength: " + hand.grabStrength + "<br />";
      handString += "Pinch strength: " + hand.pinchStrength + "<br />";
      handString += "Confidence: " + hand.confidence + "<br />";
      handString += "Arm direction: " + vectorToString(hand.arm.direction()) + "<br />";
      handString += "Arm center: " + vectorToString(hand.arm.center()) + "<br />";
      handString += "Arm up vector: " + vectorToString(hand.arm.basis[1]) + "<br />";

      // Hand motion factors
      if (LeapManager.previousFrame && LeapManager.previousFrame.valid) {
        var translation = hand.translation(LeapManager.previousFrame);
        handString += "Translation: " + vectorToString(translation) + " mm<br />";

        var rotationAxis = hand.rotationAxis(LeapManager.previousFrame, 2);
        var rotationAngle = hand.rotationAngle(LeapManager.previousFrame);
        handString += "Rotation axis: " + vectorToString(rotationAxis) + "<br />";
        handString += "Rotation angle: " + rotationAngle.toFixed(2) + " radians<br />";

        var scaleFactor = hand.scaleFactor(LeapManager.previousFrame);
        handString += "Scale factor: " + scaleFactor.toFixed(2) + "<br />";
      }

      // IDs of pointables associated with this hand
      if (hand.pointables.length > 0) {
        var fingerIds = [];
        for (var j = 0; j < hand.pointables.length; j++) {
          var pointable = hand.pointables[j];
            fingerIds.push(pointable.id);
        }
        if (fingerIds.length > 0) {
          handString += "Fingers IDs: " + fingerIds.join(", ") + "<br />";
        }
      }

      handString += "</div>";
    }
  }
  else {
    handString += "No hands";
  }
  handOutput.innerHTML = handString;

  // Display Pointable (finger and tool) object data
  var pointableOutput = document.getElementById("pointableData");
  var pointableString = "";
  if (frame.pointables.length > 0) {
    var fingerTypeMap = ["Thumb", "Index finger", "Middle finger", "Ring finger", "Pinky finger"];
    var boneTypeMap = ["Metacarpal", "Proximal phalanx", "Intermediate phalanx", "Distal phalanx"];
    for (var i = 0; i < frame.pointables.length; i++) {
      var pointable = frame.pointables[i];

      pointableString += "<div style='width:250px; float:left; padding:5px'>";

      if (pointable.tool) {
        pointableString += "Pointable ID: " + pointable.id + "<br />";
        pointableString += "Classified as a tool <br />";
        pointableString += "Length: " + pointable.length.toFixed(1) + " mm<br />";
        pointableString += "Width: "  + pointable.width.toFixed(1) + " mm<br />";
        pointableString += "Direction: " + vectorToString(pointable.direction, 2) + "<br />";
        pointableString += "Tip position: " + vectorToString(pointable.tipPosition) + " mm<br />"
        pointableString += "</div>";
      }
      else {
        pointableString += "Pointable ID: " + pointable.id + "<br />";
        pointableString += "Type: " + fingerTypeMap[pointable.type] + "<br />";
        pointableString += "Belongs to hand with ID: " + pointable.handId + "<br />";
        pointableString += "Classified as a finger<br />";
        pointableString += "Length: " + pointable.length.toFixed(1) + " mm<br />";
        pointableString += "Width: "  + pointable.width.toFixed(1) + " mm<br />";
        pointableString += "Direction: " + vectorToString(pointable.direction, 2) + "<br />";
        pointableString += "Extended?: "  + pointable.extended + "<br />";
        pointable.bones.forEach( function(bone){
          pointableString += boneTypeMap[bone.type] + " bone <br />";
          pointableString += "Center: " + vectorToString(bone.center()) + "<br />";
          pointableString += "Direction: " + vectorToString(bone.direction()) + "<br />";
          pointableString += "Up vector: " + vectorToString(bone.basis[1]) + "<br />";
        });
        pointableString += "Tip position: " + vectorToString(pointable.tipPosition) + " mm<br />";
        pointableString += "</div>";
      }
    }
  }
  else {
    pointableString += "<div>No pointables</div>";
  }
  pointableOutput.innerHTML = pointableString;

  // Display Gesture object data
  var gestureOutput = document.getElementById("gestureData");
  var gestureString = "";
  if (frame.gestures.length > 0) {
    if (pauseOnGesture) {
      togglePause();
    }
    for (var i = 0; i < frame.gestures.length; i++) {
      var gesture = frame.gestures[i];
      gestureString += "Gesture ID: " + gesture.id + ", "
                    + "type: " + gesture.type + ", "
                    + "state: " + gesture.state + ", "
                    + "hand IDs: " + gesture.handIds.join(", ") + ", "
                    + "pointable IDs: " + gesture.pointableIds.join(", ") + ", "
                    + "duration: " + gesture.duration + " &micro;s, ";

      switch (gesture.type) {
        case "circle":
          gestureString += "center: " + vectorToString(gesture.center) + " mm, "
                        + "normal: " + vectorToString(gesture.normal, 2) + ", "
                        + "radius: " + gesture.radius.toFixed(1) + " mm, "
                        + "progress: " + gesture.progress.toFixed(2) + " rotations";
          break;
        case "swipe":
          gestureString += "start position: " + vectorToString(gesture.startPosition) + " mm, "
                        + "current position: " + vectorToString(gesture.position) + " mm, "
                        + "direction: " + vectorToString(gesture.direction, 1) + ", "
                        + "speed: " + gesture.speed.toFixed(1) + " mm/s";
          break;
        case "screenTap":
        case "keyTap":
          gestureString += "position: " + vectorToString(gesture.position) + " mm";
          break;
        default:
          gestureString += "unkown gesture type";
      }
      gestureString += "<br />";
    }
  }
  else {
    gestureString += "No gestures";
  }
  gestureOutput.innerHTML = gestureString;

  // Store frame for motion functions
  LeapManager.previousFrame = frame;
})

function vectorToString(vector, digits) {
  if (typeof digits === "undefined") {
    digits = 1;
  }
  return "(" + vector[0].toFixed(digits) + ", "
             + vector[1].toFixed(digits) + ", "
             + vector[2].toFixed(digits) + ")";
}

function togglePause() {
  paused = !paused;

  if (paused) {
    document.getElementById("pause").innerText = "Resume";
  } else {
    document.getElementById("pause").innerText = "Pause";
  }
}

function pauseForGestures() {
  if (document.getElementById("pauseOnGesture").checked) {
    pauseOnGesture = true;
  } else {
    pauseOnGesture = false;
  }
}

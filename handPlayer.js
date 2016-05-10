//** NOTE: **
//handArray and INSTRUMENT_LIST are variables defined on index.js and used on this file.
//So when importing this file in a html, we should place handPlayer.js below
//index.js.

//Constant containing time between tones.
var INTERVAL_TIME = 300;
var TEMPO = 200; //beats per minute.

var INSTRUMENT_PER_HAND = 5;

var NUM_TONES_PATTERN = 10;

//How hard the note hits, from 0-127.
var VELOCITY = 200;
//How long to hold the note, in seconds.
var DELAY = 0.5;

//The first midi note id is:
var FIRST_NOTE_ID = 21;

var midiStreamerLoaded = false;

var recordEnabled = true;

//Contains the pattern being generated currently.
var currentPatternArray = new Array(INSTRUMENT_PER_HAND*2);

//Are we recording a pattern right now?
var patternRecordingEnabled = true;

/**
 * Array with active patterns.
 */
var activePatterns = [];

var timeoutId = undefined;

/**
 * Contains information about a recorded track.
 * This is an array of arrays. Each sub-array corresponds to one instrument and 
 * hand.
 * We use 8 channels for each hand. We suppose both hands use the same instruments.
 * So left hand will use 0 to 4 channels and right hand will use 5 to 9. 
 * @type {Array}
 */
var recordingArray = new Array(INSTRUMENT_PER_HAND*2);

function onsuccess() {
    midiStreamerLoaded = true;
}

/**
 * Given a hand type and an array of hands returns the first hand of this type.
 * @param  {[Array]} hands 
 * @param  {[string]} type
 */
function getFirstHandWithType(hands, type) {
    for(var i = 0; i < hands.length; ++i) 
        if(hands[i].type == type && hands[i].currentTone !== null) return i;
    return null;
}

/**
 * Given an index of recordingArray and a tone, adds this tone to the indicated 
 * instrument per hand sub-array.
 * @param  {[type]} instrumentIndex [description]
 * @param  {[type]} tone            [description]
 */
function applyCurrentTone(recordingArrayIndex, tone, destArray) {
    if(!destArray[recordingArrayIndex]) destArray[recordingArrayIndex] = [];
    
    var currentInsArray = destArray[recordingArrayIndex];
    currentInsArray[currentInsArray.length] = {tones: [tone], numTimes:1};
}

/**
 * Adds an empty tone, a silence.
 * When our system plays a sound, each channel that is not sounding 
 * at this moment should have a silence. 
 */
function addSilence(recordingArrayIndex, destArray) {
    if(!destArray[recordingArrayIndex]) destArray[recordingArrayIndex] = [];

    var currentInsArray = destArray[recordingArrayIndex];
    currentInsArray[currentInsArray.length] = {tones: [-1], numTimes:1};
}

/**
 * Takes the pattern that was just generated and adds it to the array of active 
 * patterns which will be played in loop.
 * Then order to start recording a new pattern.
 */
function activateCurrentPattern() {
    if(!patternRecordingEnabled) {
        activePatterns[activePatterns.length] = {index: -1, pattern: currentPatternArray};
        if(timeoutId) clearTimeout(timeoutId);
        enablePatternRecording();
    }
}

function enablePatternRecording() {
    if(!patternRecordingEnabled) {
        currentPatternArray = new Array(INSTRUMENT_PER_HAND*2);
        patternRecordingEnabled = true;
    }
}


function recordPattern(hands) {
    if(patternRecordingEnabled && currentPatternArray[0] && currentPatternArray[0].length >= NUM_TONES_PATTERN) {
        patternRecordingEnabled = false;
        timeoutId = setTimeout(enablePatternRecording, 4000);
    }

    if(patternRecordingEnabled) {
        if(currentPatternArray === null) currentPatternArray = [];
        record(hands, currentPatternArray);
    }
}

/**
 * Given a certain point in time, record all notes that are played at this time.
 * @param  {[Array]} hands array of hands. We support just two hands (one right 
 * and one left) if more are provident they will be ignored.
 */
function record(hands, destArray) {
    var lHand = getFirstHandWithType(hands, "left");
    var rHand = getFirstHandWithType(hands, "right");

    for(var i = 0; i < recordingArray.length; ++i) {
        if(lHand !== null && i == hands[lHand].instrumentIndex) 
            applyCurrentTone(i, hands[lHand].currentTone, destArray);
        else if(rHand !== null && i == hands[rHand].instrumentIndex + INSTRUMENT_PER_HAND) 
            applyCurrentTone(i, hands[rHand].currentTone, destArray);
        else addSilence(i, destArray);
    }
}


function isRecording() {
    return recordEnabled;
}

//Load Midi streamer
MIDI.loadPlugin({
    soundfontUrl: "./soundfonts/",
    instruments: _.map(INSTRUMENT_LIST, function(item){return item.name;}),
    onsuccess: onsuccess,
    onprogress: function(state, progress) {
        console.log(state, progress);
    },
});

/**
 * Given a channel, track and array of tones, add this tones to this track on
 * this channels. When a tone is -1 this is a silence, so we add nothing.
 * If all tones are silence we return false, otherwise we return true (tones added).
 * noteOn determines if we are indicating the start of a note or the end.
 */
function addTonesToTrack(track, tones, channel, noteOn) {
    var time=72;
    var wait = 0;
    
    var isSilence = true;
    for(var i = 0; i < tones.length; ++i) {
        if(tones[i] !== -1) {  
            if(noteOn) {
                //If first note.
                if(isSilence) track.noteOn(channel, FIRST_NOTE_ID + tone, wait);
                else track.noteOn(channel, FIRST_NOTE_ID + tone);
            }
            else {
                track.noteOff(channel, FIRST_NOTE_ID + tone, time);
                //If first note.
                if(isSilence) track.noteOff(channel, FIRST_NOTE_ID + tone, time);
                else track.noteOff(channel, FIRST_NOTE_ID + tone);
            }
             isSilence = false;
        }
    }
    return !isSilence;
}

function fillTrackWithArray(track, trackArray) {
    var modifiedTrack = track;
    for(var j = 0; j < trackArray[0].length; ++j) {
        var areTones = false;
        for(var i = 0; i < trackArray.length; ++i) 
            areTones = addTonesToTrack(track, trackArray[i][j].tones, i, true) || areTones;
        for(var i = 0; i < trackArray.length; ++i) 
            areTones = addTonesToTrack(track, trackArray[i][j].tones, i, true) || areTones;
        
        if(!areTones) {
            track.noteOn(channel, FIRST_NOTE_ID + tone, 72);
            track.noteOff(channel, FIRST_NOTE_ID + tone, 0);
        }
    }
}

//generateMidiFile();

function generateMidiFile() {
    //TODO: Erase.
    generateMidi=false;

    var file = new Midi.File();
    var track = new Midi.Track();
    file.addTrack(track);

    track.setTempo(TEMPO);

    for(var i = 0; i < INSTRUMENT_LIST.length; ++i) {
        track.setInstrument(i, INSTRUMENT_LIST[i].id);
        track.setInstrument(i+INSTRUMENT_PER_HAND, INSTRUMENT_LIST[i].id);
    }

    //TODO: Erase.
    //fakeArray = [];
    //fakeArray[fakeArray.length] = [{id: 21, numTimes:2000}];

    fillTrackWithArray(track, recordingArray);
    //fillTrackWithArray(track, fakeArray);

    var str = file.toBytes();
    var bytes = [];

    for (var i = 0; i < str.length; ++i) {
        bytes.push(str.charCodeAt(i));
    }

    var base64String = btoa(String.fromCharCode.apply(null, new Uint8Array(bytes)));

    base64String = "data:image/png;base64," + base64String;

    MIDI.Player.loadFile(base64String, function() {
        console.log("MIDI file generated.");
        //MIDI.Player.start(); // start the MIDI track (you can put this in the loadFile callback)
        /* MIDI.Player.resume(); // resume the MIDI track from pause.
            MIDI.Player.pause(); // pause the MIDI track.
            MIDI.Player.stop();*/
    },
    function() {
        console.log("Generating MIDI file.");
    },
    function() {
        console.log("Error generating MIDI file.");
    }); // load .MIDI from base64 or binary XML request.

    //DonwloadFile
    var a = document.createElement('a');
    a.download = 'sample.mid';
    a.href = base64String;
    a.click();
}

function recordActivePatterns(recordingArray) {
    for(var i = 0; i < activePatterns.length; ++i) {
        var activePattern = activePatterns[i];
        
        for(var j = 0; j < INSTRUMENT_PER_HAND*2; ++j) {
            var cIndex = (activePattern.index + 1) % NUM_TONES_PATTERN;
            recordingArray[j][recordingArray[j].length-1].tones = 
                recordingArray[j][recordingArray[j].length-1].tones.concat(
                    activePattern.pattern[j][cIndex]);
        }
    }
}

function moveActivePatternsForward() {
    for(var i = 0; i < activePatterns.length; ++i) {
        activePatterns[i].index = (activePatterns[i].index + 1) % NUM_TONES_PATTERN;
    }
}

function playActivePatterns() {
    for(var i = 0; i < activePatterns.length; ++i) {
        var activePattern = activePatterns[i];
        cIndex = (activePattern.index + 1) % NUM_TONES_PATTERN;
        for(var j = 0; j < INSTRUMENT_PER_HAND*2; ++j) {
            var tones = activePattern.pattern[j][cIndex].tones;
            for(var k= 0; k < tones-length; ++k) {
                playTone(tones[k], j, INSTRUMENT_LIST[j%INSTRUMENT_PER_HAND].id);
            }
        }
    }
}


function playTone(tone, channel, instrument) {
    MIDI.programChange(channel, instrument);
    MIDI.noteOn(channel, tone, VELOCITY);
    MIDI.noteOff(channel, tone, DELAY);
}

/**
 * When invoke iterate over all registered hands and for each of this hands if
 * it has a toned assigned plays this tones and marks it as played.
 * @return {Boolean}        True if tones are able to be played, false otherwise.
 */
function processTones() {
    if(!midiStreamerLoaded) return false;

    if(isRecording()) {
        record(handArray, recordingArray);
        recordActivePatterns(recordingArray);
    }

    recordPattern(handArray);

    for(var i = 0; i < handArray.length; ++i) {
        console.log("PLAYING TONE: " + handArray[i].currentTone);
        if(handArray[i].currentTone !== null) {
            playTone(FIRST_NOTE_ID + handArray[i].currentTone, handArray[i].channel, INSTRUMENT_LIST[handArray[i].instrumentIndex].id);

            handArray[i].currentTone = null;
        }
    }

    playActivePatterns();
    moveActivePatternsForward();

    return true;
}

setInterval(processTones, INTERVAL_TIME);
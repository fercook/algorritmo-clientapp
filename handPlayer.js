//** NOTE: **
//handArray and INSTRUMENT_LIST are variables defined on index.js and used on this file.
//So when importing this file in a html, we should place handPlayer.js below
//index.js.

//Constant containing time between tones.
var INTERVAL_TIME = 300;
var TEMPO = 200; //beats per minute.

var INSTRUMENT_PER_HAND = 5;

//How hard the note hits, from 0-127.
var VELOCITY = 200;
//How long to hold the note, in seconds.
var DELAY = 0.5;

//The first midi note id is:
var FIRST_NOTE_ID = 21;

var midiStreamerLoaded = false;

var recordEnabled = true;

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
function applyCurrentTone(recordingArrayIndex, tone) {
    if(!recordingArray[recordingArrayIndex]) recordingArray[recordingArrayIndex] = [];
    
    var currentInsArray = recordingArray[recordingArrayIndex];
    currentInsArray[currentInsArray.length] = {id: tone, numTimes:1};
}

/**
 * Adds an empty tone, a silence.
 * When our system plays a sound, each channel that is not sounding 
 * at this moment should have a silence. 
 */
function addSilence(recordingArrayIndex) {
    if(!recordingArray[recordingArrayIndex]) recordingArray[recordingArrayIndex] = [];

    var currentInsArray = recordingArray[recordingArrayIndex];
    currentInsArray[currentInsArray.length] = {id: -1, numTimes:1};
}

/**
 * Given a certain point in time, record all notes that are played at this time.
 * @param  {[Array]} hands array of hands. We support just two hands (one right 
 * and one left) if more are provident they will be ignored.
 */
function record(hands) {
    var lHand = getFirstHandWithType(hands, "left");
    var rHand = getFirstHandWithType(hands, "right");

    for(var i = 0; i < recordingArray.length; ++i) {
        if(lHand !== null && i == hands[lHand].instrumentIndex) 
            applyCurrentTone(i, hands[lHand].currentTone);
        else if(rHand !== null && i == hands[rHand].instrumentIndex + INSTRUMENT_PER_HAND) 
            applyCurrentTone(i, hands[rHand].currentTone);
        else addSilence(i);
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

function fillTrakWithArray(track, trackArray) {
    var modifiedTrack = track;
    for(var j = 0; j < trackArray[0].length; ++j) {
        var firstNote = false;
        for(var i = 0; i < trackArray.length; ++i) {
            var channel = i;
        
            var tone = trackArray[i][j].id;
            var time, wait;
            if(tone !== -1) {
                time = 72;
                wait = 0;
                if(!firstNote)
                    modifiedTrack = modifiedTrack.noteOn(channel, FIRST_NOTE_ID + tone, wait);
                else modifiedTrack = modifiedTrack.noteOn(channel, FIRST_NOTE_ID + tone);
                firstNote = true;
            }
            //128 is one quarter of note, one beat.
        }
        var firstNote = false;
        for(var i = 0; i < trackArray.length; ++i) {
            var channel = i;
        
            var tone = trackArray[i][j].id;
            var time, wait;
            if(tone !== -1) {
                time = 72;
                wait = 0;
                if(!firstNote)
                    modifiedTrack = modifiedTrack.noteOff(channel, FIRST_NOTE_ID + tone, time);
                else modifiedTrack = modifiedTrack.noteOff(channel, FIRST_NOTE_ID + tone);
                firstNote = true;
            }
        }
        if(!firstNote) {
            modifiedTrack = modifiedTrack.noteOn(channel, FIRST_NOTE_ID + tone, 72);
            modifiedTrack = modifiedTrack.noteOff(channel, FIRST_NOTE_ID + tone, 0);
        }
    }
}

//generateMidiFile();

function generateMidiFile() {
    //TODO: Erase.
    generateMidi=false;

    var file = new Midi.File();
    var track = new Midi.Track();
    file.addTrack(track)

    track.setTempo(TEMPO);

    for(var i = 0; i < INSTRUMENT_LIST.length; ++i) {
        track.setInstrument(i, INSTRUMENT_LIST[i].id);
        track.setInstrument(i+INSTRUMENT_PER_HAND, INSTRUMENT_LIST[i].id);
    }

    //TODO: Erase.
    //fakeArray = [];
    //fakeArray[fakeArray.length] = [{id: 21, numTimes:2000}];

    fillTrakWithArray(track, recordingArray);
    //fillTrakWithArray(track, fakeArray);

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


var generateMidi = false;
//var generateMidi = true;
setTimeout(function(){generateMidi = true;}, 10000);
function isTime() {
    return generateMidi;
}

/**
 * When invoke iterate over all registered hands and for each of this hands if
 * it has a toned assigned plays this tones and marks it as played.
 * @return {Boolean}        True if tones are able to be played, false otherwise.
 */
function processTones() {
    if(!midiStreamerLoaded) return false;

    if(isRecording() && !isTime()) record(handArray);
    else if(isTime()) generateMidiFile();

    for(var i = 0; i < handArray.length; ++i) {
        console.log("PLAYING TONE: " + handArray[i].currentTone);
        if(handArray[i].currentTone !== null) {
            MIDI.programChange(
                handArray[i].channel, 
                INSTRUMENT_LIST[handArray[i].instrumentIndex].id);
            MIDI.noteOn(handArray[i].channel, FIRST_NOTE_ID + handArray[i].currentTone, VELOCITY)
            MIDI.noteOff(handArray[i].channel, FIRST_NOTE_ID + handArray[i].currentTone, DELAY)

            handArray[i].currentTone = null;
        }
    }

    return true;
}

setInterval(processTones, INTERVAL_TIME);
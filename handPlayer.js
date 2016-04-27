//** NOTE: **
//handArray and INSTRUMENT_LIST are variables defined on index.js and used on this file.
//So when importing this file in a html, we should place handPlayer.js below
//index.js.

//Constant containing time between tones.
var INTERVAL_TIME = 300;

//How hard the note hits, from 0-127.
var VELOCITY = 127;
//How long to hold the note, in seconds.
var DELAY = 0.5;

//The first midi note id is:
var FIRST_NOTE_ID = 21;

var midiStreamerLoaded = false;

function onsuccess() {
    midiStreamerLoaded = true;
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
 * When invoque iterate over all registered hands and for each of this hands if
 * it has a toned assigned plays this tones and marks it as played.
 * @return {Boolean}        True if tones are able to be played, false otherwise.
 */
function processTones() {
    if(!midiStreamerLoaded) return false;

    for(var i = 0; i < handArray.length; ++i) {
        console.log("PLAYING TONE: " + handArray[i].currentTone);
        if(handArray[i].currentTone) {
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
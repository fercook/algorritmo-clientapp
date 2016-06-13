/**
 * HandlePlayer is in charge of playing the music while generated, generating 
 * the midi file, recording patterns and managing active patterns.
 */
var HandPlayer = {};

//Constant containing time between tones.
HandPlayer.INTERVAL_TIME = 300;
HandPlayer.TEMPO = 200; //beats per minute.

HandPlayer.NUM_TONES_PATTERN = 40;

//How hard the note hits, from 0-127.
HandPlayer.VELOCITY = 127;
//How long to hold the note, in seconds.
HandPlayer.DELAY = 0.5;

//The first midi note id is:
HandPlayer.FIRST_NOTE_ID = 21;

HandPlayer.midiStreamerLoaded = false;

HandPlayer.recordEnabled = false;
HandPlayer.timeSinceStartingToRecord = 0;

//Contains the pattern being generated currently.
HandPlayer.currentPatternArray = new Array(LeapManager.INSTRUMENT_LIST.length);

//Are we recording a pattern right now?
HandPlayer.patternRecordingEnabled = true;

/**
 * Array with active patterns.
 */
HandPlayer.activePatterns = [];

HandPlayer.timeoutId = undefined;

/**
 * One unit in our tone is TONE_GAP units on midi tones.
 * This means that tone 2 is in reality tone 2*HandPlayer.TONE_GAP.
 */
HandPlayer.TONE_GAP = 3;

/**
 * Contains information about a recorded track.
 * This is an array of arrays. Each sub-array corresponds to one instrument and 
 * hand.
 * We use 8 channels for each hand. We suppose both hands use the same instruments.
 * So left hand will use 0 to 4 channels and right hand will use 5 to 9. 
 * @type {Array}
 */
//HandPlayer.recordingArray = new Array(LeapManager.INSTRUMENT_LIST.length);

function onsuccess() {
    HandPlayer.midiStreamerLoaded = true;
}

/**
 * Given a hand type and an array of hands returns the first hand of this type.
 * @param  {[Array]} hands 
 * @param  {[string]} type
 */
HandPlayer.getLastHandWithType = function(hands, type) {
    for(var i =  hands.length-1; i >= 0; --i) 
        if(hands[i].type == type && hands[i].currentTone !== null) return i;
    return null;
}


/**
 * Given an index of recordingArray and a tone, adds this tone to the indicated 
 * instrument per hand sub-array.
 * @param  {[type]} instrumentIndex [description]
 * @param  {[type]} tone            [description]
 */
HandPlayer.applyCurrentTone = function(toneIndex, recordingArrayIndex, tone, destArray) {
    if(!destArray[recordingArrayIndex]) destArray[recordingArrayIndex] = [];
    
    var currentInsArray = destArray[recordingArrayIndex];
    currentInsArray[toneIndex] = {tones: [tone], numTimes:1};
}


/**
 * Adds an empty tone, a silence.
 * When our system plays a sound, each channel that is not sounding 
 * at this moment should have a silence. 
 */
HandPlayer.addSilence = function(toneIndex, recordingArrayIndex, destArray) {
    if(!destArray[recordingArrayIndex]) 
        destArray[recordingArrayIndex] = [];

    var currentInsArray = destArray[recordingArrayIndex];
    currentInsArray[toneIndex] = {tones: [-1], numTimes:1};
}

/**
 * Takes the pattern that was just generated and merge it with the current active
 * pattern. There will be just an active pattern, the one which will conform the 
 * resultant song.
 */
/*HandPlayer.activateCurrentPattern = function() {
    if(!this.patternRecordingEnabled) {
        if(this.activePatterns.length <= 0) this.activePatterns[this.activePatterns.length] = {index: -1, pattern: HandPlayer.currentPatternArray};
        else this.mergePatterns();
        //if(this.timeoutId) clearTimeout(this.timeoutId);
        //this.enablePatternRecording();
    }
}

HandPlayer.enablePatternRecording = function() {
    if(!this.patternRecordingEnabled) {
        this.currentPatternArray = new Array(HandPlayer.INSTRUMENT_PER_HAND*2);
        this.patternRecordingEnabled = true;
    }
}*/


HandPlayer.recordPattern = function(hands) {
    if(!this.activePatterns[0]) this.activePatterns[0] = {index: 0, pattern: new Array(LeapManager.INSTRUMENT_LIST.length)};
    this.record(this.activePatterns[0].index, hands, this.activePatterns[0].pattern);
}


/**
 * Given a certain point in time, record all notes that are played at this time.
 * @param  {[Array]} hands array of hands. We support just two hands (one right 
 * and one left) if more are provident they will be ignored.
 */
HandPlayer.record = function(toneIndex, hands, destArray) {
    for(var i = 0; i < LeapManager.INSTRUMENT_LIST.length; ++i) {
        if(hands.length > 0 && i == hands[0].instrumentIndex && typeof hands[0].currentTone === "number") 
            this.applyCurrentTone(toneIndex, i, hands[0].currentTone, destArray);
        else if(!destArray[i] || !destArray[i][toneIndex]) this.addSilence(toneIndex, i, destArray);
    }
}


HandPlayer.startRecording = function() {
    this.recordEnabled = true;
    this.timeSinceStartingToRecord = performance.now();
}


HandPlayer.isRecording = function() {
    return this.recordEnabled;
}


//Load Midi streamer
MIDI.loadPlugin({
    soundfontUrl: "./soundfonts/",
    instruments: _.map(LeapManager.INSTRUMENT_LIST, function(item){return item.name;}),
    onsuccess: onsuccess,
    onprogress: function(state, progress) {
        console.log(state, progress);
    },
});


/**
 * Given a raw tone (id comming from the hand position) returns its equivalent
 * tone in the MIDI format.
 */
HandPlayer.getValidTone = function(rawTone) {
    return rawTone * HandPlayer.TONE_GAP + HandPlayer.FIRST_NOTE_ID;
}


/**
 * Given a channel, track and array of tones, add this tones to this track on
 * this channels. When a tone is -1 this is a silence, so we add nothing.
 * If all tones are silence we return false, otherwise we return true (tones added).
 * noteOn determines if we are indicating the start of a note or the end.
 *
 * wait is how much time we want to wait before playing the current note. 
 * (only when noteOn is true).
 */
HandPlayer.addTonesToTrack = function(track, tones, channel, noteOn, wait) {
    var time = 128;
    wait = wait || 0;
    
    var isSilence = true;
    for(var i = 0; i < tones.length; ++i) {
        if(tones[i] !== -1) {  
            if(noteOn) {
                //If first note.
                if(isSilence) track.noteOn(channel, this.getValidTone(tones[i]), wait, HandPlayer.VELOCITY);
                else track.noteOn(channel, this.getValidTone(tones[i]));
            }
            else {
                //If first note.
                if(isSilence) track.noteOff(channel, this.getValidTone(tones[i]), time);
                else track.noteOff(channel, this.getValidTone(tones[i]));
            }
             isSilence = false;
        }
    }
    return !isSilence;
}


HandPlayer.fillTrackWithArray = function(track, trackArray) {
    var modifiedTrack = track;
    var wait = 0;
    for(var j = 0; trackArray[0] && j < trackArray[0].length; ++j) {
        var areTones = false;
        for(var i = 0; i < trackArray.length; ++i) 
            areTones = this.addTonesToTrack(track, trackArray[i][j].tones, i, true, wait) || areTones;
        for(var i = 0; i < trackArray.length; ++i) 
            areTones = this.addTonesToTrack(track, trackArray[i][j].tones, i, false) || areTones;
        
        if(!areTones) wait += 128;
        else wait = 0;
    }
}


HandPlayer.generateMidiFile = function() {
    this.recordEnabled = false;

    var file = new Midi.File();
    var track = new Midi.Track();
    file.addTrack(track);

    track.setTempo(this.TEMPO);

    for(var i = 0; i < LeapManager.INSTRUMENT_LIST.length; ++i) {
        track.setInstrument(i, LeapManager.INSTRUMENT_LIST[i].id);
        track.setInstrument(i+LeapManager.INSTRUMENT_LIST.length, LeapManager.INSTRUMENT_LIST[i].id);
    }

    //TODO: Erase.
    //fakeArray = [];
    //fakeArray[fakeArray.length] = [{id: 21, numTimes:2000}];

    this.fillTrackWithArray(track, this.activePatterns[0].pattern);
    //fillTrackWithArray(track, fakeArray);

    var str = file.toBytes();
    var bytes = [];

    for (var i = 0; i < str.length; ++i) {
        bytes.push(str.charCodeAt(i));
    }

    var base64String = btoa(String.fromCharCode.apply(null, new Uint8Array(bytes)));

    base64String = "data:image/png;base64," + base64String;

    /*MIDI.Player.loadFile(base64String, function() {
        console.log("MIDI file generated.");
        //MIDI.Player.start(); // start the MIDI track (you can put this in the loadFile callback)
         MIDI.Player.resume(); // resume the MIDI track from pause.
            MIDI.Player.pause(); // pause the MIDI track.
            MIDI.Player.stop();
    },
    function() {
        console.log("Generating MIDI file.");
    },
    function() {
        console.log("Error generating MIDI file.");
    }); // load .MIDI from base64 or binary XML request.*/

    this.downloadSong(base64String);
    this.saveSongUsingLocalStorage(base64String);
}


HandPlayer.downloadSong = function(base64String) {
    //DonwloadFile
    var a = document.createElement('a');
    a.download = 'sample.mid';
    a.href = base64String;
    a.click();
};


HandPlayer.saveSongUsingLocalStorage = function(base64String) {
    localStorage.setItem("userGeneratedSong", base64String);
};

/*HandPlayer.recordActivePatterns = function(recordingArray) {
    for(var i = 0; i < this.activePatterns.length; ++i) {
        var activePattern = this.activePatterns[i];
        
        for(var j = 0; j < LeapManager.INSTRUMENT_LIST.length; ++j) {
            var cIndex = activePattern.index;
            recordingArray[j][recordingArray[j].length-1].tones = 
                recordingArray[j][recordingArray[j].length-1].tones.concat(
                    activePattern.pattern[j][cIndex].tones);
        }
    }
}*/


HandPlayer.moveActivePatternsForward = function() {
    for(var i = 0; i < this.activePatterns.length; ++i) {
        this.activePatterns[i].index = (this.activePatterns[i].index + 1) % HandPlayer.NUM_TONES_PATTERN;
    }
}


HandPlayer.playActivePatterns = function() {
    for(var i = 0; i < this.activePatterns.length; ++i) {
        var activePattern = this.activePatterns[i];
        cIndex = activePattern.index;
        for(var j = 0; j < LeapManager.INSTRUMENT_LIST.length; ++j) {
            var tones = activePattern.pattern[j][cIndex].tones;
            for(var k= 0; k < tones-length; ++k) {
                this.playTone(this.getValidTone(tones[k]), j, LeapManager.INSTRUMENT_LIST[j%LeapManager.INSTRUMENT_LIST.length].id);
            }
        }
    }
}


HandPlayer.playTone = function(tone, channel, instrument) {
    MIDI.programChange(channel, instrument);
    MIDI.noteOn(channel, tone, HandPlayer.VELOCITY);
    MIDI.noteOff(channel, tone, HandPlayer.DELAY);
}

/**
 * When invoke iterate over all registered hands and for each of this hands if
 * it has a toned assigned plays this tones and marks it as played.
 * @return {Boolean}        True if tones are able to be played, false otherwise.
 */
HandPlayer.processTones = function() {
    if(!this.midiStreamerLoaded) return false;

    /*if(this.isRecording()) {
        this.record(LeapManager.handArray, this.recordingArray);
        this.recordActivePatterns(this.recordingArray);
    }*/

    this.recordPattern(LeapManager.handArray);

    /*for(var i = 0; i < LeapManager.handArray.length; ++i) {
        console.log("PLAYING TONE: " + LeapManager.handArray[i].currentTone);
        if(LeapManager.handArray[i].currentTone !== null) {
            this.playTone(HandPlayer.FIRST_NOTE_ID + LeapManager.handArray[i].currentTone, LeapManager.handArray[i].channel, LeapManager.INSTRUMENT_LIST[LeapManager.handArray[i].instrumentIndex].id);

            LeapManager.handArray[i].currentTone = null;
        }
    }*/

    this.playActivePatterns();
    this.moveActivePatternsForward();

    MakerViz.render();

    return true;
}
//-> Force to use tempo specified by the file.
MIDI.Player.BPM = null;


//We need to redefine this method because it is a private one.
var getLength = function() {
    var data =  MIDI.Player.data;
    var length = data.length;
    var totalTime = 0.5;
    for (var n = 0; n < length; n++) {
        totalTime += data[n][1];
    }
    return totalTime;
};

//Replace method to load instrument from the midi file.
MIDI.Player.loadMidiFile = function(onsuccess, onprogress, onerror) {
    try {
        MIDI.Player.replayer = new Replayer(MidiFile(MIDI.Player.currentData), MIDI.Player.timeWarp, null, MIDI.Player.BPM);
        MIDI.Player.data = MIDI.Player.replayer.getData();
        MIDI.Player.endTime = getLength();
        onsuccess();
        ///
        /*MIDI.loadPlugin({
            //Get instruments from the midi file.
            instruments: MIDI.Player.getFileInstruments(),
            onsuccess: onsuccess,
            onprogress: onprogress,
            onerror: onerror
        });*/
    } catch(event) {
        onerror && onerror(event);
    }
};
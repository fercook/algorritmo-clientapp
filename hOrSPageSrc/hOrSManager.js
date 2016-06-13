var HorSManager = {};

HorSManager.shitIcon = document.getElementById("shiticon");
HorSManager.hitIcon = document.getElementById("hiticon");
HorSManager.songtime = document.getElementById("songtime");

HorSManager.swipeTime= 0;  // If < 0 dialog mode on, the number is the timestamp of the time the dialog gets active

/**
 * This method is in charge of going to the remote server and retrieve a track
 * or list of tracks the user will vote.
 */
HorSManager.getTrackFromRemoteServer = function() {
    //TODO: Implement this method which goes to the server and gets one or more
    //tracks.
    console.error("HorSManager.getTrackFromRemoteServer is not implemented.")
};

HorSManager.getLocalStorageTrack = function() {
    return localStorage.userGeneratedSong;
}

HorSManager.isTrackInLocalStorage = function() {
    return Boolean(this.getLocalStorageTrack());
};

HorSManager.removeLocalStorageTrack = function() {
    localStorage.removeItem("userGeneratedSong");
};

/**
 * Load the track that the user is going to vote, and start playing it in a loop.
 */
HorSManager.loadTrack = function() {
    var track;
    if(this.isTrackInLocalStorage()) {
        track = this.getLocalStorageTrack();
        this.removeLocalStorageTrack();
    }
    else track = this.getTrackFromRemoteServer();

    //Set Instruments in appropriate channels.
    for(var i = 0; i < LeapManager.INSTRUMENT_LIST.length; ++i) {
        MIDI.programChange(i, LeapManager.INSTRUMENT_LIST[i].id);
    }

    //Player.
    MIDI.Player.loadFile(track, function() {
        console.log("MIDI file loaded.");
        //TODO: Differences between MIDI.Player.addListener and MIDI.Player.addAnimation
        MIDI.Player.addListener(function(data) { // set it to your own function!
            //If end of song, start playing from the beginning.
            if(data.now === data.end) {
                   console.log("End of the song.");
                   MIDI.Player.stop();
                   MIDI.Player.start();
            }
            HorSManager.visUpdater(data.note);
            console.log(data.velocity);
            //var now = data.now; // where we are now
            //var end = data.end; // time when song ends
            //var channel = data.channel; // channel note is playing on
            //var message = data.message; // 128 is noteOff, 144 is noteOn
            //var note = data.note; // the note
            //var velocity = data.velocity; // the velocity of the note
            // then do whatever you want with the information!
        });
        MIDI.Player.start(); // start the MIDI track (you can put this in the loadFile callback)
        //MIDI.Player.resume(); // resume the MIDI track from pause.
        //MIDI.Player.pause(); // pause the MIDI track.
        //MIDI.Player.stop();
    },
    function() {
        console.log("Loading MIDI file.");
    },
    function() {
        console.error("Error loading MIDI file.");
    }); // load .MIDI from base64 or binary XML request.
};

HorSManager.activate = function(element, elementToDeactivate){
    element.className= "selectioneffect";//element.setAttribute('width','80%');
    elementToDeactivate.className= 'deactived';
}

/**
 * Method executed when the user finish its interaction with the HorS page.
 */
HorSManager.goToPreviousPage = function() {
    console.log("HorSManager.goToPreviousPage should be redefined with the behaviur" +
        " when the user finish its interaction with HorSPage.");
};

HorSManager.listeningPage = function(frame) {
    var hand= frame.hands[0];

    if (frame.hands.length > 0){ // Any hand detected

    if (Date.now() - this.swipeTime > 1000){
    // console.log("palmVelocity: "+hand.palmVelocity[0]);

        if (hand.palmVelocity[0] < -800){  // console.log("L SWIPE Event");
           this.swipeTime= Date.now();
           this.activate(this.shitIcon, this.hitIcon);

           MIDI.Player.stop();
           //TODO: Send the user vote to the server.
           //serverRequestSaveSong();
           setTimeout(this.goToPreviousPage.bind(this),500);
          }else  if (hand.palmVelocity[0] > 800){  // console.log("R SWIPE Event");
            this.swipeTime= Date.now();
            this.activate(this.hitIcon, this.shitIcon);
            setTimeout(this.showSendingMsg.bind(this), 800);
            setTimeout(this.hideMsg.bind(this), 2000);
            MIDI.Player.stop();
            //TODO: Send the user vote to the server.
            //serverRequestSaveSong();
            setTimeout(this.goToPreviousPage.bind(this), 2000);//setTimeout(hideMsg,2000);
         }
        }
        this.songtime.innerHTML= "HAND";

    }
    else{  // No hand detected
        this.songtime.innerHTML= 'NO HAND';
        this.shitIcon.className= "init";
        this.hitIcon.className= "init";
    }
}

HorSManager.showMsg = function(src){
    console.log("showMsg");
    msgpopup.setAttribute('src',src);
    msgpopup.style.left =  ((document.body.clientWidth - msgpopup.width)/2) +'px';
    msgpopup.style.top= ((document.body.clientHeight - msgpopup.height)/2)+'px';

    msgpopup.style.display= 'block';
    listeningwrapper.style.visibility= 'hidden';
    //outOfFlow= false;
}

HorSManager.showSendingMsg = function(){
    this.showMsg('imgs/hOrS/sendingmsg.jpg');
}

HorSManager.hideMsg = function(){
    msgpopup.style.display= 'none';
    listeningwrapper.style.visibility= 'visible';
}

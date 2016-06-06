var HorSManager = {};

HorSManager.shitIcon = document.getElementById("shiticon");
HorSManager.hitIcon = document.getElementById("hiticon");
HorSManager.songtime = document.getElementById("songtime");

HorSManager.swipeTime= 0;  // If < 0 dialog mode on, the number is the timestamp of the time the dialog gets active


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
          
           setTimeout(this.goToPreviousPage.bind(this),500);
           player.stopPlaying();

          }else  if (hand.palmVelocity[0] > 800){  // console.log("R SWIPE Event");
            this.swipeTime= Date.now();
            this.activate(this.hitIcon, this.shitIcon);
            setTimeout(this.showSendingMsg.bind(this), 800);
            setTimeout(this.hideMsg.bind(this), 2000);
            setTimeout(this.goToPreviousPage.bind(this), 2000);//setTimeout(hideMsg,2000);
            player.stopPlaying();
            serverRequestSaveSong();
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


HorSManager.goToPaintingPage = function(){
    page= "drawing";
    cleanCanvas();
    console.log('cleanCanvas: '+JSON.stringify(notes));
    canvas.style.display= 'block';
    listeningelement.style.display= 'none';
    noDrawingModeImg.style.display= 'block';
    this.shitIcon.className= "init";
    this.hitIcon.className= "init";
}

HorSManager.showSendingMsg = function(){
    this.showMsg('imgs/hOrS/sendingmsg.jpg');
}

HorSManager.hideMsg = function(){
    msgpopup.style.display= 'none';
    listeningwrapper.style.visibility= 'visible';
 
}
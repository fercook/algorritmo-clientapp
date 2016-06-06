/**
 * File containing common methods used in both algorritmo client apps.
 * @type {Object}
 */
var CommonGestureManager = {};

/**
 * Given two hand frames checks if those hands are clapping.
 */
CommonGestureManager.checkClap = function(hand, hand1) {
  var x = Math.abs(hand.palmPosition[0] - hand1.palmPosition[0]);
  var y = Math.abs(hand.palmPosition[1] - hand1.palmPosition[1]);
  var z = Math.abs(hand.palmPosition[2] - hand1.palmPosition[2]);
  return  x<50 && y<50 && z<50;
}

/**
 * Constant containing at what height the instrument selection area ends.
 * This area should be synchronized to other delimited areas (playing area or
 * drawing area) for an optimal user experience.
 */
CommonGestureManager.INSTRUMENT_SELECTION_HEIGHT = 100;

/**
 * Given a hand and a point in the x coordinates. Return true if 
 * x-50 < hand_X_position < x+50 and hand_Y_position < INSTRUMENT_SELECTION_HEIGHT.
 * To keep it simple it creates a virtual rectangle around x and determines if the
 * given hand is in this rectangle.
 */
CommonGestureManager.checkColorSelection = function(hand, x) {
  //console.log('checkPunch: '+index+'  '+middle+'  '+ring); 
 // return hand.palmPosition[0] < (x+50) && hand.palmPosition[0] > (x-50) && hand.palmPosition[1] < 120 &&  hand.palmPosition[2] > 40;
  var indexFinger= hand.fingers[1];
  return indexFinger.dipPosition[0] < (x+50) && 
    indexFinger.dipPosition[0] > (x-50) && 
    indexFinger.dipPosition[1] < this.INSTRUMENT_SELECTION_HEIGHT &&  
    indexFinger.dipPosition[2] > 20;
  
}
// Forked from https://codepen.io/MadeByMike/pen/xrEzC
// A completely frivolous d3 animation for the purpose of learning about force layouts

var counnnt=0;

function startVisualization(divID) {
    containingDiv = document.getElementById(divID);
    //var analyser = audioCtx.createAnalyser(); // We must return this
    var width = containingDiv.clientWidth,
        height = containingDiv.clientHeight,
        stars = 500,
        frame = 1,
        octaves = 7,
        memory_length = 10,
        // This is the hole in the center
        galatic_centre = (height / 20) > (width / 20) ? (width / 20) : (height / 20);

    var drag = 140; // This means the outer edge of a spiral will drag 140 degrees behind the inner
    var spiral_arms = 4; // How many arms, Also fun to change.
    var maxR = 130; // Estimated maximum radius of the last octave -- needs tuning depending on other parameters

    var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    var noteData = new Array(memory_length);

    // 440/( (44100/2)/(2048)) = 40.867 Hz is the bin corresponding to 440 Hz
    // Each bin has 21.53 Hz = 22050 / 2048
    // A4 = 440 hz = f0
    // fn = f0 * (a)^n where n is steps above or below f0 and a=2^(1/12)
    // n of A4 is 57 (starting from 0)
    /*
    var frequencyOfNotes = [];
    var f0 = 440.0;
    var noteStep = Math.pow(2.0, 1.0 / 12.0);
    for (var n = 0; n < octaves * 12; n++) {
        frequencyOfNotes.push(f0 * Math.pow(noteStep, n - 57));
    }
    var binWidth = (44100 / 2.0) / analyser.fftSize;
    var freqsIdx = [];
    frequencyOfNotes.forEach(function(freq, i) {
        freqsIdx.push(Math.floor(freq / binWidth));
    });
*/
    function computeOctave(r){
        var oct = Math.max(0, Math.floor(((r - galatic_centre) / maxR) * octaves));
        return oct;
    }

    var colours = ["#893a00", "#ac4900","#b94e00", "#c65300","#d15800", "#de5e00", "#ed6400", "#f56700", "#ff7e20", "#ff903f","#ffaa55", "#ffbd7c"];
    var fill = d3.scale.ordinal().range(colours.reverse()).domain(d3.range(0, colours.length));
    //var frequencyData = new Uint8Array(freqsIdx[freqsIdx.length - 1] + 1);


    var nodes = d3.range(stars).map(function(i) {
        return {
            index: i
        };
    });
    var force = d3.layout.force()
        .nodes(nodes)
        .size([width, height])
        .charge(-20) // This controls how the particles interact. Adjust to play god!
    .gravity(.05)
        .on("tick", tick)
        .start();

    var svg = d3.select("#" + divID).append("svg")
        .attr("width", width)
        .attr("height", height);

    for (var rad=0; rad<octaves+1;rad++) {
        svg.append("circle")
            .attr("cx", (width / 2))
            .attr("cy", (height / 2))
            .attr("r", galatic_centre+rad*maxR/octaves)//+rad*maxR/octaves.length)
            .style("fill", "none")
            .style("stroke","#e6e6e6");
        svg.append("text")
            .attr("x", (width / 2))
            .attr("y", (height / 2)+galatic_centre+(rad+0.5)*maxR/octaves)
            .attr("dx", 0)
            .attr("dy", "0.35em")
            .style("text-anchor", "middle")
            .style("fill", "#e6e6e6")
            .style("font-size", 9)
            .text(""+rad);

    }

    noteStrings.forEach(function(note,i){
        svg.append("text")
            .attr("x", (20+(1+1/octaves)*maxR)*Math.cos(i*2*Math.PI/12+6*2*Math.PI/12)+(width / 2))
            .attr("y", (20+(1+1/octaves)*maxR)*Math.sin(i*2*Math.PI/12+6*2*Math.PI/12)+(height / 2))
            .attr("dx", 0)
            .attr("dy", "0.35em")
            .style("text-anchor", "middle")
            .style("fill", "#e6e6e6")
        .text(""+ note);

    });

    var node = svg.selectAll(".node")
        .data(nodes)
        .enter().append("circle")
        .attr("class", "node")
        .attr("cx", function(d) {
            return d.x;
        })
        .attr("cy", function(d) {
            return d.y;
        })
        .attr("r", 3)
        .style("fill", function(d, i) {
            return fill(d.speed);
        })
    //.style("stroke", function(d, i) { return d3.rgb(fill(d.speed)).darker(2); })
    .call(force.drag);

    svg.style("opacity", 1e-6)
        .transition()
        .duration(1000)
        .style("opacity", 1);



    function tick(e) {

        force.resume(); // Keep it going!
        var max = 0;
        frame++;
        if (frame > 359) {
            frame = 1;
        }

        nodes.forEach(function(o, i) {

            var dx = o.x || 1;
            var dy = o.y || 1;

            // Speed is equal to the distance from the centre
            o.speed = Math.sqrt(
                ((width / 2) - dx) * ((width / 2) - dx) + // A squared
                ((height / 2) - dy) * ((height / 2) - dy) // B squared
            );

            // We're getting the max so we can apply a range later
            if (o.speed > max) {
                max = o.speed;
            };

            o.angle = (Math.atan2(o.y - height / 2, o.x - width / 2) + Math.PI); // btw 0 and 2 Pi
            o.discreteAngle = Math.floor((((0.5 / colours.length) + o.angle / (2 * Math.PI)) % 1) * colours.length); //half a tone shift

        });

        nodes.forEach(function(o, i) {
            // All layout and animation is calculated here
            layout_galaxy(o, i, e.alpha, frame, max);
        });
        
        if (counnnt<1000) {console.log(noteData);; counnnt++;}
        node
            .attr("cx", function(d) {
                return d.x;
            })
            .attr("cy", function(d) {
                return d.y;
            })
            .attr("r", function(d, i) {
                var x = d.x - width / 2,
                    y = d.y - height / 2;
                var R = Math.sqrt(x * x + y * y);
                var oct = computeOctave(R);
                var note = noteStrings.length * oct + d.discreteAngle;
                //console.log(note+":::");
                var size=0;
                if (noteData.indexOf(note)>=0) {
                    size += Math.round(8* (noteData.length-1-noteData.indexOf(note))/noteData.length);
                }
                //console.log(oct);
                return 2 + size;
            })
            .style("fill", function(d, i) {
                return fill(Math.floor((d.speed / max) * colours.length)); //
                //return fill(d.discreteAngle);
            })
            .style("opacity", function(d, i) {
                return 0.4+0.6*(1-d.speed / max) ; //
            });
    }

    function layout_galaxy(data, index, alpha, frame, max_speed) {
        var D2R = Math.PI / 180;
        spiral_arms = 360 / spiral_arms; // Get the number of deg between each arm
        // Here is where most of the layout happens
        var currentAngle = (spiral_arms * index) + frame - (drag * (data.speed / max_speed));
        // (spiral_arms * index) - Group nodes into the arms around the circle
        // frame - Adjust position depending on the frame 1-360
        // (drag*(data.speed/max_speed) - Adjust position based on distance from centre (speed) (watch what happens when you change the + to a - here!)
        var currentAngleRadians = currentAngle * D2R;
        // Magic positioning
        var radialPoint = {
            x: (width / 2) + galatic_centre * Math.cos(currentAngleRadians),
            y: (height / 2) + galatic_centre * Math.sin(currentAngleRadians)
        };

        // Throttle based on energy in the system this allows other forces like charge to work
        var affectSize = alpha * 0.5;
        data.x += (radialPoint.x - data.x) * affectSize;
        data.y += (radialPoint.y - data.y) * affectSize;

    }

    var update_data = function(new_note) {
        noteData.unshift(new_note);
        //if (count<1000) {console.log(new_note); counnnt++;}
        if (noteData.length>memory_length) {
            noteData.pop()
        };
        return true;
    }
    return update_data;
}

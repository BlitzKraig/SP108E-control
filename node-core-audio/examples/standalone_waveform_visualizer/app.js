// Outputs sine waves panning left & right while showing microphone input on screen

var coreaudio  = require('../../');
// var qt = require('node-qt');


//Create a core audio engine
var engine = coreaudio.createNewAudioEngine();
engine.setOptions({ inputChannels: 1, outputChannels: 1, interleaved: true });

var sample = 0;
var ampBuffer = new Float32Array(4000);

engine.addAudioCallback(function(buffer) {
    // console.log(buffer);

    for (var i = 0; i < buffer.length; i++) {
        //         console.log(ampBuffer[i]);

        if(buffer[i] > 0.4){
        console.log(
            parseInt(255 * Math.abs(buffer[i]))
            );
        }

                // path.lineTo(new qt.QPointF(w * i / ampBuffer.length, h / 2 + ampBuffer[i] * h / 3.0));
                // console.log(w * i / ampBuffer.length, h / 2 + ampBuffer[i] * h / 3.0);

        //         if(i === ampBuffer.length - 1) {
        //             doAudio();
        //         }
            }

            // if(buffer[0] > 0.1){
            //  console.log(
            //     parseInt(255 * Math.abs(buffer[0]))
            //     );
            //  }


    return(buffer);
    // var output = [];
    // for (var i = 0; i < buffer.length; i++, sample++) {
    //     //Pan two sound-waves back and forth, opposing
    //     var val1 = Math.sin(sample * 110.0 * 2 * Math.PI / 44100.0) * 0.25, val2 = Math.sin(sample * 440.0 * 2 * Math.PI / 44100.0) * 0.25;
    //     var pan1 = Math.sin(1 * Math.PI * sample / 44100.0), pan2 = 1 - pan1;

    //     output.push(val1 * pan1 + val2 * pan2); //left channel
    //     output.push(val1 * pan2 + val2 * pan1); //right channel

    //     //Save microphone input into rolling buffer
    //     ampBuffer[sample%ampBuffer.length] = buffer[i];
    // }

    // return output;
});

//Create a qt window
// var app = new qt.QApplication;
// var window = new qt.QWidget;
// global.app = app;
// global.window = window;

// var w = 640, h = 480;
// var lastFPS = '', frames = 0, lastFrameTime = Date.now();

// var backBrush = new qt.QColor(127, 127, 127);
// var linePen = new qt.QPen(new qt.QColor(0, 0, 0));

//Every frame, draw the microphone data


// var doAudio = function() {
//     for (var i = 0; i < ampBuffer.length; i++) {
//         console.log(ampBuffer[i]);

        // path.lineTo(new qt.QPointF(w * i / ampBuffer.length, h / 2 + ampBuffer[i] * h / 3.0));
        // console.log(w * i / ampBuffer.length, h / 2 + ampBuffer[i] * h / 3.0);

//         if(i === ampBuffer.length - 1) {
//             doAudio();
//         }
//     }
// };

// window.resize(w, h);
// window.show();

// setInterval(app.processEvents.bind(app), 0);
// setInterval(function() { window.update(); }, 0); //Update our display as often as possible

// setTimeout(doAudio, 200);
// setInterval(() => {
//     for (var i = 0; i < ampBuffer.length; i++) {
//         // console.log(ampBuffer.length);
//         console.log(ampBuffer[i]);
//     }
// }, 200);

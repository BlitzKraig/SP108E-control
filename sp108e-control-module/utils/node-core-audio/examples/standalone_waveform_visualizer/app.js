// Outputs sine waves panning left & right while showing microphone input on screen

var coreaudio = require('../../');
// var qt = require('node-qt');


//Create a core audio engine
var engine = coreaudio.createNewAudioEngine();
engine.setOptions({
    inputChannels: 1,
    outputChannels: 1,
    interleaved: true
});

var sample = 0;
var ampBuffer = new Float32Array(4000);


var ft = require('fourier-transform');
var db = require('decibels');

var frequency = 440;
var size = 256;
var sampleRate = 44100;

engine.addAudioCallback(function (buffer) {
    // console.log(buffer);


    //get normalized magnitudes for frequencies from 0 to 22050 with interval 44100/1024 ≈ 43Hz
    var spectrum = ft(buffer);
    // console.log(spectrum.length);

    // spectrum.forEach((spec, i) => {
    //     // console.log(spec);
    //     if(spec > 0.1){
    //         // Play tone or music, see which segment lights up
    //         console.log(i);
    //     }
    // });

    spectrum = spectrum.slice(0, spectrum.length / 5);
    var band = [0,0,0,0,0,0,0,0];
    for (var i = 0; i < spectrum.length; i++) {
        if (i < spectrum.length / 8) {
            band[0] += spectrum[i];
        } else if (i < spectrum.length / 8 * 2) {
            band[1] += spectrum[i];
        } else if (i < spectrum.length / 8 * 3) {
            band[2] += spectrum[i];
        } else if (i < spectrum.length / 8 * 4) {
            band[3] += spectrum[i];
        }else if (i < spectrum.length / 8 * 5) {
            band[4] += spectrum[i];
        }else if (i < spectrum.length / 8 * 6) {
            band[5] += spectrum[i];
        }else if (i < spectrum.length / 8 * 7) {
            band[6] += spectrum[i];
        } else {
            band[7] += spectrum[i];
        }
        if (i === spectrum.length - 1) {
            band[0] = (band[0] / (spectrum.length / 8) * 20).toFixed(2);
            band[1] = (band[1] / (spectrum.length / 8) * 20).toFixed(2);
            band[2] = (band[2] / (spectrum.length / 8) * 20).toFixed(2);
            band[3] = (band[3] / (spectrum.length / 8) * 20).toFixed(2);
            band[4] = (band[4] / (spectrum.length / 8) * 20).toFixed(2);
            band[5] = (band[5] / (spectrum.length / 8) * 20).toFixed(2);
            band[6] = (band[6] / (spectrum.length / 8) * 20).toFixed(2);
            band[7] = (band[7] / (spectrum.length / 8) * 20).toFixed(2);
            // * 2 to boost
            // console.log(`First:${band[0].toFixed(2)} Second:${band[1].toFixed(2)} Third:${band[2].toFixed(2)} Fourth:${band[3].toFixed(2)} Fifth:${band[4].toFixed(2)} `);
            console.log(band.join(','));
        }
    }
    //convert to decibels
    // var decibels = spectrum.map((value) => db.fromGain(value));

    // console.log(decibels);
    // for (var i = 0; i < buffer.length; i++) {



        //         console.log(ampBuffer[i]);
        // if(buffer[0][i] > 0.4){


        // console.log(
        //     parseInt(255 * Math.abs(buffer[i]))
        //     );





        // }

        // path.lineTo(new qt.QPointF(w * i / ampBuffer.length, h / 2 + ampBuffer[i] * h / 3.0));
        // console.log(w * i / ampBuffer.length, h / 2 + ampBuffer[i] * h / 3.0);

        //         if(i === ampBuffer.length - 1) {
        //             doAudio();
        //         }
    // }

    // if(buffer[0] > 0.1){
    //  console.log(
    //     parseInt(255 * Math.abs(buffer[0]))
    //     );
    //  }



    // return(buffer);
    return (-1);


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

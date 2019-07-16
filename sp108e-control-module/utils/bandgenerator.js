var coreaudio = require('./node-core-audio');

//Create a core audio engine

var start = (callback, smooth = false, boostBand = [1, 1, 1]) => {
    var engine = coreaudio.createNewAudioEngine();
    engine.setOptions({
        inputChannels: 2,
        outputChannels: 1,
        interleaved: true
    });

    var ft = require('fourier-transform');

    var lowBandFreqMax = 500;
    var midBandFreqMax = 4000;

    var lowBandFreq = [0, 300];
    var midBandFreq = [300, 4000];
    var highBandFreq = [3000, -1];

    // TODO Allow overlap

    var lowMaxIndex = parseInt(lowBandFreqMax / 43); // Each array element is a ~43Hz increase
    var midMaxIndex = parseInt(midBandFreqMax / 43);

    var lowIndex = [lowBandFreq[0] === 0 ? 0 : parseInt(lowBandFreq[0] / 43), parseInt(lowBandFreq[1] / 43)]
    var midIndex = [parseInt(midBandFreq[0] / 43), parseInt(midBandFreq[1] / 43)]
    var highIndex = [parseInt(highBandFreq[0] / 43), highBandFreq[1] === -1 ? 999999 : parseInt(highBandFreq[1] / 43)]

    var frameCount = 0;
    var skipFrames = 3;

    var last = [0, 0, 0];
    engine.addAudioCallback(function (buffer) {

        if (frameCount === 0) {
            frameCount++;
        } else {
            if (++frameCount >= skipFrames) {
                frameCount = 0;
            }
            return (-1);
        }

        //get normalized magnitudes for frequencies from 0 to 22050 with interval 44100/1024 ≈ 43Hz

        // Each array element is an increase by ~ 43hz. Split into 3 bands, based on frequency research for low/mid/hi. Allow freq-band input and calculate so we can tweak it
        var spectrum = ft(buffer);

        var band = [0, 0, 0];

        for (var i = 0; i < spectrum.length; i++) {

            // if (i <= lowMaxIndex) {
            //     if (band[0] < spectrum[i]) {
            //         band[0] = spectrum[i]
            //     }
            // } else if (i <= midMaxIndex) {
            //     if (band[1] < spectrum[i]) {
            //         band[1] = spectrum[i]
            //     }
            // } else {
            //     if (band[2] < spectrum[i]) {
            //         band[2] = spectrum[i]
            //     }
            // }
            if (i >= lowIndex[0] && i <= lowIndex[1]) {
                if (band[0] < spectrum[i]) {
                    band[0] = spectrum[i]
                }
            }
            if (i >= midIndex[0] && i <= midIndex[1]) {
                if (band[1] < spectrum[i]) {
                    band[1] = spectrum[i]
                }
            }
            if (i >= highIndex[0] && i <= highIndex[1]) {
                if (band[2] < spectrum[i]) {
                    band[2] = spectrum[i]
                }
            }

            if (i === spectrum.length - 1) {

                band.forEach((el, k, array) => {

                    array[k] = Math.min(1, array[k] * boostBand[k]);
                    if (smooth) {
                        if (last[k] > array[k]) {
                            array[k] = (Math.min(1, (array[k] + last[k]) / 2));
                        }
                        //  else if(array[k] > last[k]) {
                        //     array[k] = (last[k] + array[k]) / 2
                        // }

                        if (array[k] < 0.0001) {
                            array[k] = 0
                        }
                        last[k] = array[k];


                    }

                });
                callback(band);
            }
        }
        // UNCOMMENT to play to speakers. Causes feedback!
        // return(buffer);
        return (-1);
    });
}


module.exports = start;
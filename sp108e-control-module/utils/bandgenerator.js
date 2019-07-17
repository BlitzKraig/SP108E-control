var coreaudio = require('./node-core-audio');

//Create a core audio engine

var start = (callback, smooth = false, boostBand = [1, 1, 1], stereo = false) => {
    var engine = coreaudio.createNewAudioEngine();

    if (stereo) {
        // TODO Fix stereo mode. Notice behaviour on stereo test video/audio
        engine.setOptions({
            inputChannels: 2,
            outputChannels: 2,
            interleaved: false
        });
    } else {
        engine.setOptions({
            inputChannels: 1,
            outputChannels: 1,
            interleaved: true
        });
    }

    var ft = require('fourier-transform');

    var lowBandFreqMax = 500;
    var midBandFreqMax = 4000;

    var lowBandFreq = [0, 300];
    var midBandFreq = [300, 4000];
    var highBandFreq = [3000, -1];

    // TODO Allow overlap
    // TODO check Hz interval with stereo vs mono mode
    
    var lowMaxIndex = parseInt(lowBandFreqMax / 43); // Each array element is a ~43Hz increase
    var midMaxIndex = parseInt(midBandFreqMax / 43);

    var lowIndex = [lowBandFreq[0] === 0 ? 0 : parseInt(lowBandFreq[0] / 43), parseInt(lowBandFreq[1] / 43)]
    var midIndex = [parseInt(midBandFreq[0] / 43), parseInt(midBandFreq[1] / 43)]
    var highIndex = [parseInt(highBandFreq[0] / 43), highBandFreq[1] === -1 ? 999999 : parseInt(highBandFreq[1] / 43)]

    var frameCount = 0;
    var skipFrames = 3;

    var last = [0, 0, 0];
    var secondaryLast = [0, 0, 0];
    engine.addAudioCallback(function (buffer) {

        if (frameCount === 0) {
            frameCount++;
        } else {
            if (++frameCount >= skipFrames) {
                frameCount = 0;
            }

            return (-1);
        }

        //get normalized magnitudes for frequencies from 0 to 22050 with interval 44100/1024 ≈ 43Hz - sampleRate / framesPerBuffer

        // Each array element is an increase by ~ 43hz. Split into 3 bands, based on frequency research for low/mid/hi. Allow freq-band input and calculate so we can tweak it
        var spectrum;
        var secondarySpectrum;
        if (stereo) {
            spectrum = ft(buffer[0]);
            secondarySpectrum = ft(buffer[1]);
        } else {
            spectrum = ft(buffer);
        }

        var band = [0, 0, 0];
        var secondaryBand = [0, 0, 0];

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
                    band[0] = spectrum[i];
                }
                if (stereo) {
                    if (secondaryBand[0] < secondarySpectrum[i]) {
                        secondaryBand[0] = secondarySpectrum[i];
                    }
                }
            }
            if (i >= midIndex[0] && i <= midIndex[1]) {
                if (band[1] < spectrum[i]) {
                    band[1] = spectrum[i];
                }
                if (stereo) {
                    if (secondaryBand[1] < secondarySpectrum[i]) {
                        secondaryBand[1] = secondarySpectrum[i];
                    }
                }
            }
            if (i >= highIndex[0] && i <= highIndex[1]) {
                if (band[2] < spectrum[i]) {
                    band[2] = spectrum[i];
                }
                if (stereo) {
                    if (secondaryBand[2] < secondarySpectrum[i]) {
                        secondaryBand[2] = secondarySpectrum[i];
                    }
                }
            }

            if (i === spectrum.length - 1) {

                band.forEach((el, k) => {

                    band[k] = Math.min(1, band[k] * boostBand[k]);
                    if (stereo) {
                        secondaryBand[k] = Math.min(1, secondaryBand[k] * boostBand[k]);
                    }
                    if (smooth) {
                        if (last[k] > band[k]) {
                            band[k] = (Math.min(1, (band[k] + last[k]) / 2));
                        }
                        //  else if(band[k] > last[k]) {
                        //     band[k] = (last[k] + band[k]) / 2
                        // }

                        if (band[k] < 0.0001) {
                            band[k] = 0
                        }
                        last[k] = band[k];

                        if (stereo) {
                            if (secondaryLast[k] > secondaryBand[k]) {
                                secondaryBand[k] = (Math.min(1, (secondaryBand[k] + secondaryLast[k]) / 2));
                            }
                            //  else if(secondaryBand[k] > secondaryLast[k]) {
                            //     secondaryBand[k] = (secondaryLast[k] + secondaryBand[k]) / 2
                            // }

                            if (secondaryBand[k] < 0.0001) {
                                secondaryBand[k] = 0;
                            }
                            secondaryLast[k] = secondaryBand[k];
                        }


                    }

                });
                if (stereo) {
                    callback([band, secondaryBand]);
                } else {
                    callback(band);
                }
            }
        }
        // UNCOMMENT to play to speakers. Causes feedback!
        // return(buffer);

        return (-1);
    });
}


module.exports = start;

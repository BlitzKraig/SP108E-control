var coreaudio = require('./node-core-audio');

//Create a core audio engine

var start = (callback, smoothDrop = false, smoothRise = false, boostBand = [1, 1, 1], stereo = false) => {
    var engine = coreaudio.createNewAudioEngine();

    if (stereo) {
        // NOTE: Non-interleaved stereo mode appears to be broken. Workaround using interleaved
        engine.setOptions({
            inputChannels: 2,
            outputChannels: 2,
            interleaved: true,
            framesPerBuffer: 512
        });
    } else {
        engine.setOptions({
            inputChannels: 1,
            outputChannels: 1,
            interleaved: true
        });
    }

    var ft = require('fourier-transform');


    var lowBandFreq = [0, 500];
    var midBandFreq = [500, 4000];
    var highBandFreq = [3000, -1];

    var interval = 43;
    if (stereo) {
        interval = interval * 2;
    }
    var lowIndex = [lowBandFreq[0] === 0 ? 0 : parseInt(lowBandFreq[0] / interval), parseInt(lowBandFreq[1] / interval)]
    var midIndex = [parseInt(midBandFreq[0] / interval), parseInt(midBandFreq[1] / interval)]
    var highIndex = [parseInt(highBandFreq[0] / interval), highBandFreq[1] === -1 ? 999999 : parseInt(highBandFreq[1] / interval)]

    var frameCount = 0;
    var skipFrames = 3;


    // TODO: Rename "secondary" vars to channel (left, right)
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
        var spectrum;
        var secondarySpectrum
        if (stereo) {
            var firstBuffer = [];
            var secondBuffer = [];

            buffer.forEach((element, i) => {
                if (i % 2 == 1) {
                    firstBuffer.push(element);
                } else {
                    secondBuffer.push(element);
                }
            });
            spectrum = ft(firstBuffer);
            secondarySpectrum = ft(secondBuffer);
        } else {
            spectrum = ft(buffer);
        }

        var band = [0, 0, 0];
        var secondaryBand = [0, 0, 0];

        for (var i = 0; i < spectrum.length; i++) {

            if (i >= lowIndex[0] && i <= lowIndex[1]) {
                if (stereo) {
                    if (secondaryBand[0] < secondarySpectrum[i]) {
                        secondaryBand[0] = secondarySpectrum[i];
                    }
                }
                if (band[0] < spectrum[i]) {
                    band[0] = spectrum[i];
                }
            }
            if (i >= midIndex[0] && i <= midIndex[1]) {
                if (stereo) {
                    if (secondaryBand[1] < secondarySpectrum[i]) {
                        secondaryBand[1] = secondarySpectrum[i];
                    }
                }
                if (band[1] < spectrum[i]) {
                    band[1] = spectrum[i];
                }
            }
            if (i >= highIndex[0] && i <= highIndex[1]) {

                if (stereo) {
                    if (secondaryBand[2] < secondarySpectrum[i]) {
                        secondaryBand[2] = secondarySpectrum[i];
                    }
                }
                if (band[2] < spectrum[i]) {
                    band[2] = spectrum[i];

                }
            }

            if (i === spectrum.length - 1) {

                band.forEach((el, k) => {

                    band[k] = Math.min(1, band[k] * boostBand[k]);
                    if (stereo) {
                        secondaryBand[k] = Math.min(1, secondaryBand[k] * boostBand[k]);
                    }
                    if (smoothDrop) {
                        if (last[k] > band[k]) {
                            band[k] = (Math.min(1, (band[k] + last[k]) / 2));
                        }

                        if (band[k] < 0.0001) {
                            band[k] = 0
                        }
                        last[k] = band[k];

                        if (stereo) {
                            if (secondaryLast[k] > secondaryBand[k]) {
                                secondaryBand[k] = (Math.min(1, (secondaryBand[k] + secondaryLast[k]) / 2));
                            }

                            if (secondaryBand[k] < 0.0001) {
                                secondaryBand[k] = 0;
                            }
                            secondaryLast[k] = secondaryBand[k];
                        }


                    }
                    if (smoothDrop) {
                        if (band[k] > last[k]) {
                            band[k] = (last[k] + band[k]) / 2
                        }
                        if (band[k] < 0.0001) {
                            band[k] = 0
                        }
                        last[k] = band[k];

                        if (stereo) {
                            if (secondaryBand[k] > secondaryLast[k]) {
                                secondaryBand[k] = (secondaryLast[k] + secondaryBand[k]) / 2
                            }
                            if (secondaryBand[k] < 0.0001) {
                                secondaryBand[k] = 0;
                            }
                            secondaryLast[k] = secondaryBand[k];
                        }
                    }

                });
                if (stereo) {
                    // var buf1 = 0;
                    // var buf2 = 0;
                    // spectrum.forEach((element, i) => {
                    //     if (i % 2 === 1) {
                    //         buf1 += element;
                    //     } else {
                    //         buf2 += element;
                    //     }
                    // });
                    // // buffer[1].forEach(element => {
                    // //     buf2 += element;
                    // // });
                    // console.log(Math.abs(buf1 / (buffer.length / 2)).toFixed(5) + '\t' + Math.abs(buf2 / (buffer.length / 2)).toFixed(5));
                    callback([band, secondaryBand]);
                } else {

                    // var buf1 = 0;
                    // var buf2 = 0;
                    // buffer.forEach((element, i) => {
                    //     if (i % 2 == 1){
                    //         buf1 += element;
                    //     } else {
                    //         buf2 += element;
                    //     }
                    // });

                    // console.log(Math.abs(buf1 / (buffer.length / 2)).toFixed(3) + '\t' + Math.abs(buf2 / (buffer.length / 2)).toFixed(3));
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
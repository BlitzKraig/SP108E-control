var coreaudio = require('./node-core-audio');

//Create a core audio engine

var start = (callback, smooth = false, boostLow = 2, boostHigh = 2)=>{
var engine = coreaudio.createNewAudioEngine();
engine.setOptions({
    inputChannels: 1,
    outputChannels: 1,
    interleaved: true
});

var ft = require('fourier-transform');
var db = require('decibels');

var frameCount = 0;
var skipFrames = 3;

var last = [0, 0, 0, 0];
engine.addAudioCallback(function (buffer) {
    
    if(frameCount === 0){
        frameCount++;
    } else {
        if(++frameCount >= skipFrames){
            frameCount = 0;
        }
        return(-1);
    }
    
    //get normalized magnitudes for frequencies from 0 to 22050 with interval 44100/1024 ≈ 43Hz
    var spectrum = ft(buffer);

    var highSpectrum = spectrum.slice(spectrum.length / 64);
    var lowSpectrum = spectrum.slice(0, spectrum.length / 64);
    var highSpectrumCount = 0;

    var band = [0, 0, 0, 0];

    for (var i = 0; i < lowSpectrum.length; i++) {
        if (i < lowSpectrum.length / 3) {
            band[0] += lowSpectrum[i];
        } else if (i < lowSpectrum.length / 3 * 2) {
            band[1] += lowSpectrum[i];
        } else {
            band[2] += lowSpectrum[i];
        }

        if (i === lowSpectrum.length - 1) {

            for (var j = 0; j < highSpectrum.length; j++) {
                if (highSpectrum[j] > 0.05) {
                    band[3] += highSpectrum[j];
                    highSpectrumCount++;
                }

                if (j === highSpectrum.length - 1) {
                    band.forEach((el, k, array) => {

                        if (k === array.length - 1 && highSpectrumCount > 0) {
                            array[k] = (array[k] / highSpectrumCount).toFixed(2);
                            array[k] = Math.min(1,array[k] * boostHigh);
                        } else {
                            array[k] = (array[k] / (lowSpectrum.length / 3)).toFixed(2);
                            array[k] = Math.min(1,array[k] * boostLow);

                        }
                        if(smooth){
                            if(last[k] > array[k]){
                                array[k] = (Math.min(1, (array[k] + last[k]) / 2));
                            }
                            //  else if(array[k] > last[k]) {
                            //     array[k] = (last[k] + array[k]) / 3
                            // }

                            if(array[k] < 0.0001){
                                array[k] = 0
                            }
                            last[k] = array[k];
                            
                            //  else {
                            //     array[k] = (last[k] + array[k]) / 10
                            // }
                            
                        }

                        // if(suppressSilence){
                        //     if(array[k] < )
                        // }
                    
                    });
                    callback(band);
                }
            }
        }
    }
    // UNCOMMENT to play to speakers. Causes feedback!
    // return(buffer);
    return (-1);
});
}


// start((band)=>{
//     console.log(band)
// });

module.exports = start;
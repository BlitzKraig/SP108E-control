const fs = require('fs');
const express = require('express');
const app = express();
const net = require('net');
const messages = require('./messages');
const screenRes = require('screenres');
const screenshotnode = require('screenshot-node');
const jimp = require('jimp');
const portAudio = require('naudiodon');
const {
    GifUtil
} = require('gifwrap');

var dataFailureCount = 0;
var connected = false;

var createMessage = (message) => {
    return new Buffer(message, 'hex');
};

var sock = new net.Socket();

var waitingForResponse = false;

sock.on('data', function (d) {
    // console.log('RESPONDED');
    waitingForResponse = false;
});

var sp108e = {
    config: {
        device: [{
            lightCount: 89,
            ip: '192.168.0.23',
            port: 8189
        }],
        // TODO track current color, pattern etc. Serialize to save between sessions.
        // TODO support multiple devices via disconnection and reconnection, or multiple sockets
        addDevice: (ip, lightCount, port = 8189) => {
            sp108e.config.device.push({
                lightCount,
                ip,
                port
            });
        },
        getDevice: (index) => {
            return sp108e.config.device[index];
        }
    },
    connect: (ip = sp108e.config.device[0].ip, port = sp108e.config.device[0].port) => {

        if (connected) {
            sp108e.close();
        }

        sock.connect(port, ip);
        connected = true;
    },
    close: () => {
        sock.end();
        connected = false;
    },
    sendMessage: (message) => {
        if (!message) {
            return console.log('No message to send');
        }
        if (message.length !== 12) {
            console.log(message);

            return console.log('Wrong message length');
        }
        console.log(`Writing message ${message}`);

        if (!connected) {
            sp108e.connect();
        }

        sock.write(createMessage(message));
    },
    sendData: (data) => {
        if (!data) {
            return console.log('No data to send');
        }

        if (!connected) {
            sp108e.connect();
        }

        if (!waitingForResponse) {
            waitingForResponse = true;
            sock.write(createMessage(data));
            dataFailureCount = 0;
        } else {
            console.log('Skipping data packet');
            dataFailureCount++;
            if (dataFailureCount > 20) {
                console.log('Re-establishing live-mode connection');
                dataFailureCount = 0;
                sp108e.sendMessage(messages.triggerLiveMode);
            }
        }
    },
    setSegments: (segmentCount, deviceID = 0) => {
        if (segmentCount < 1 || segmentCount > 30) {
            return console.log('Please use a segmentcount between 1 and 30');
        }

        if (!connected) {
            sp108e.connect();
        }

        var lightsPerSegment = Math.ceil(sp108e.config.getDevice(deviceID).lightCount / segmentCount);

        console.log(lightsPerSegment);
        console.log(segmentCount);

        if (lightsPerSegment < segmentCount) {
            sp108e.sendMessage(messages.setLightsPerSegmentCount(lightsPerSegment));
            sp108e.sendMessage(messages.setSegmentCount(segmentCount));
        } else {
            sp108e.sendMessage(messages.setSegmentCount(segmentCount));
            sp108e.sendMessage(messages.setLightsPerSegmentCount(lightsPerSegment));
        }
    },
    captureDesktop: (yPixel = screenRes.get()[1] / 2, resizeAlgorithm = jimp.RESIZE_BILINEAR) => {

        if (!connected) {
            sp108e.connect();
        }

        sp108e.sendMessage(messages.triggerLiveMode);

        var capture = () => {
            console.time('Image');
            screenshotnode.saveScreenshot(0, yPixel, screenRes.get()[0], 1, '.livecolor', () => {
                jimp.read('.livecolor')
                    .then((image) => {
                        // RESIZE ALGO TESTING
                        // var newImage = image.clone();
                        // newImage.resize(300, image.bitmap.height, jimp.RESIZE_BEZIER).write('bezier.jpg');
                        // newImage = image.clone();
                        // newImage.resize(300, image.bitmap.height, jimp.RESIZE_BICUBIC).write('bicubic.jpg');
                        // newImage = image.clone();
                        // newImage.resize(300, image.bitmap.height, jimp.RESIZE_BILINEAR).write('bilinear.jpg');
                        // newImage = image.clone();
                        // newImage.resize(300, image.bitmap.height, jimp.RESIZE_HERMITE).write('hermite.jpg');
                        // newImage = image.clone();
                        // newImage.resize(300, image.bitmap.height, jimp.RESIZE_NEAREST_NEIGHBOR).write('nearestneighbour.jpg');
                        image.resize(300, image.bitmap.height, resizeAlgorithm);
                        var data = '';
                        image.scan(0, 0, image.bitmap.width, 1, function (x, y, idx) {
                            var red = this.bitmap.data[idx + 0].toString(16);
                            var green = this.bitmap.data[idx + 1].toString(16);
                            var blue = this.bitmap.data[idx + 2].toString(16);

                            data += red.length === 2 ? red : `0${red}`;
                            data += green.length === 2 ? green : `0${green}`;
                            data += blue.length === 2 ? blue : `0${blue}`;
                            if (x === image.bitmap.width - 1) {
                                sp108e.sendData(data);
                                console.timeEnd('Image');
                                capture();
                            }
                        });

                    }).catch((err) => {
                        console.log(err);
                    });
            });

        };
        capture();
    },
    playGif: (gif, time = 50, loop = true) => {
        var ledFrames = [];

        //TODO: Reverse engineer QuitLiveMode
        //TODO: Resize gif?
        //TODO: Transparent pixels should show current lighting color - Could be used for notifications (ie. run a red bar across regular lighting color)

        GifUtil.read(gif).then(inputGif => {

            inputGif.frames.forEach((frame, i) => {

                const buf = frame.bitmap.data;

                var data = '';
                frame.scanAllCoords((x, y, idx) => {

                    var red = buf[idx + 0].toString(16);
                    var green = buf[idx + 1].toString(16);
                    var blue = buf[idx + 2].toString(16);

                    data += red.length === 2 ? red : `0${red}`;
                    data += green.length === 2 ? green : `0${green}`;
                    data += blue.length === 2 ? blue : `0${blue}`;
                    if (x === frame.bitmap.width - 1) {

                        ledFrames.push(data);
                        if (i === inputGif.frames.length - 1) {
                            if (!connected) {
                                sp108e.connect();
                            }

                            sp108e.sendMessage(messages.triggerLiveMode);

                            var frameIndex = 0;
                            var playFrames = setInterval(() => {
                                sp108e.sendData(ledFrames[frameIndex]);
                                frameIndex++;
                                if (frameIndex === ledFrames.length) {
                                    frameIndex = 0;
                                    if (!loop) {
                                        clearInterval(playFrames);
                                    }
                                }
                            }, time);
                        }
                    }

                });
            });

        });
    },
    playVideo: (video, time = 50, loop = true) => {

    },
    audio: {
        listDevices: () => {
            console.log(portAudio.getDevices());
        },
        listHostAPIs: () => {
            console.log(portAudio.getHostAPIs());
        },
        beginDetection: (deviceID = -1) => {
            var ai = new portAudio.AudioIO({
                inOptions: {
                    channelCount: 2,
                    sampleFormat: portAudio.SampleFormat16Bit,
                    sampleRate: 96000,
                    deviceId: deviceID // Use -1 or omit the deviceId to select the default device
                }
            });

            // var AudioBuffer = require('audio-buffer');
            // var audioBuffer = AudioBuffer(ai, {sampleRate: 48000, numberOfChannels: 2});
            function decodeBuffer (buffer) {
                // return Array.from(
                // //   { length: buffer.length / 1024 },
                // {length: 1},
                //   (v, i) => parseInt(255 * Math.abs(buffer.readInt16LE(i * 2) / (2 ** 15)))
                // )[0];
                // console.log(parseInt(255 * Math.abs(buffer.readInt16LE(0) / (2 ** 15))))
                // console.log(parseInt(255 * Math.abs(buffer.readInt16LE(buffer.length / 2) / (2 ** 15))))
                // console.log(parseInt(255 * Math.abs(buffer.readInt16LE(buffer.length - 2) / (2 ** 15))))
                // if(parseInt(255 * Math.abs(buffer.readInt16LE(0) / (2 ** 15))) > 100){
                //     console.log('1');
                // }
                // if(parseInt(255 * Math.abs(buffer.readInt16LE(buffer.length / 2) / (2 ** 15))) > 100){
                //     console.log('2');
                // }
                // if(parseInt(255 * Math.abs(buffer.readInt16LE(buffer.length - 2) / (2 ** 15))) > 100){
                //     console.log('3');
                // }
                // console.log('---');

                // console.log(parseInt(255 * Math.abs(buffer.readInt16LE(buffer.length / 2) / (2 ** 15))))
                // return parseInt(255 * Math.abs(buffer.readInt16LE(0) / (2 ** 15)))
                return parseInt(300 * Math.abs(buffer.readInt16LE(0) / (2 ** 15)))

                //TODO smooth between values
                
              }

            // Create a write stream to write out to a raw audio file
            //   var ws = fs.createWriteStream('rawAudio.raw');

            //Start streaming
            //   ai.pipe(ws);
            //   ai.resume();
            sp108e.sendMessage(messages.triggerLiveMode);
            ai.start();
            

            ai.on('data', (chunk) => {
                // var complete = 0;

                // for (let index = 0; index < 2; index++) {
                //     console.log(index + ': ' + chunk[index]);
                //     complete += chunk[index];

                // }
                //       console.log(complete);
                var amplitude = decodeBuffer(chunk)


                // if(amplitude < 40){
                //     amplitude = 40;
                // }
                // amplitude = amplitude.toString(16);


                // console.log(amplistude);
                // console.log(amplitude.toString(16));

                // var colorString = amplitude.length === 2 ? amplitude : `0${amplitude}`
                // colorString = `${colorString}00FF`
                var colorString = 'FF0000';

                // console.log(colorString * 300);
                
                var secondaryColor = 'FFFFFF';
                
                
                // var repeated = colorString.repeat(300);
                var repeated = colorString.repeat(amplitude);
                repeated += secondaryColor.repeat(300-amplitude);

                console.log(amplitude);

                // console.log(repeated);
                // colorString = `${colorString}${colorString}${colorString}`
                sp108e.sendData(repeated);
                // sp108e.sendMessage(messages.changeColor.custom(`${colorString}${colorString}${colorString}`));
                // console.log(audioBuffer.getChannelData(0));
            });

        }
    },
    notify: (notification) => {

    }
};

module.exports = sp108e;
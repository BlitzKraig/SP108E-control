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

const bandGenerator = require('./utils/bandgenerator');

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
    audioDetection: (type = 'fourcolor', pastel = false) => {


        // var color1 = 'FF0000';
        // var color2 = '00FF00';
        // var color3 = '0000FF';
        // var color4 = 'FF00FF';
        // var background = 'AAAAAA';

        sp108e.sendMessage(messages.triggerLiveMode);

        if (type === 'fourcolor' || type === 'fourcolormix' || type === 'fourcolormixmoving') {
            var moveCounter = 0;

            bandGenerator((band) => {

                // 75 pixels of each color, color intensity decided by band
                // var color1 = `${255 * band[0]}`
                //color1.repeat(75);

                var color1 = parseInt(255 * band[0]).toString(16);
                if (color1.length < 2) {
                    color1 = `0${color1}`;
                }
                // TODO Fix pastel, should reduce from standard (88) or something like that
                color1 = pastel?`${color1}8888`:`${color1}0000`;

                var color2 = parseInt(255 * band[1]).toString(16);
                if (color2.length < 2) {
                    color2 = `0${color2}`;
                }
                color2 = pastel?`88${color2}88`:`00${color2}00`;

                var color3 = parseInt(255 * band[2]).toString(16);
                if (color3.length < 2) {
                    color3 = `0${color3}`;
                }
                color3 = pastel?`8888${color3}`:`0000${color3}`;

                var color4 = parseInt(255 * band[3]).toString(16);
                if (color4.length < 2) {
                    color4 = `0${color4}`;
                }
                color4 = pastel?`${color4}88${color4}`:`${color4}00${color4}`;

                var data;
                if (type === 'fourcolormix' || type === 'fourcolormixmoving') {
                    data = color1.repeat(15) + color2.repeat(15) + color3.repeat(15) + color4.repeat(15);
                    data = data.repeat(5);

                    // console.log(data.length); = 1800

                    if (type === 'fourcolormixmoving') {
                        var movedData = data.substr(1800 - (24 * moveCounter), 1800) + data.substring(0, 1800 - (6 * moveCounter))
                        data = movedData;
                        if(!waitingForResponse){
                            // TODO Send data regularly (incl movement), have this stuff simply update the data separately. Should keep it smoother.
                        moveCounter++;
                        if(moveCounter == 15){
                            moveCounter = 0;
                        }
                    }
                    }

                } else {

                    data = color1.repeat(75) + color2.repeat(75) + color3.repeat(75) + color4.repeat(75);
                }
                // console.log(data);

                sp108e.sendData(data);
            }, true)

        } else if (type === 'twocolor') {
            bandGenerator((band) => {

                // 75 pixels of each color, color intensity decided by band
                // var color1 = `${255 * band[0]}`
                //color1.repeat(75);

                var color1 = parseInt(255 * band[0]).toString(16);
                if (color1.length < 2) {
                    color1 = `0${color1}`;
                }
                color1 = `${color1}0000`;

                var color2 = parseInt(255 * band[1]).toString(16);
                if (color2.length < 2) {
                    color2 = `0${color2}`;
                }
                color2 = `00${color2}00`;

                var color3 = parseInt(255 * band[2]).toString(16);
                if (color3.length < 2) {
                    color3 = `0${color3}`;
                }
                color3 = `0000${color3}`;

                var color4 = parseInt(255 * band[3]).toString(16);
                if (color4.length < 2) {
                    color4 = `0${color4}`;
                }
                color4 = `${color4}00${color4}`;

                var data = color1.repeat(75) + color2.repeat(75) + color3.repeat(75) + color4.repeat(75);
                // console.log(data);

                sp108e.sendData(data);
            }, true)
        }

        // var repeated = colorString.repeat(amplitude);
        // repeated += secondaryColor.repeat(300 - amplitude);

        // console.log(amplitude);

        // sp108e.sendData(repeated);

    },
    notify: (notification) => {

    }
};

module.exports = sp108e;
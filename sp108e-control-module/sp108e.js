const net = require('net');
const messages = require('./messages');
const screenRes = require('screenres');
const screenshotnode = require('screenshot-node');
const jimp = require('jimp');
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
            lightCount: 90,
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
    audioDetection: (type = 'fourcolor', pastel = false, offset = 0) => {


        // var color1 = 'FF0000';
        // var color2 = '00FF00';
        // var color3 = '0000FF';
        // var color4 = 'FF00FF';
        // var background = 'AAAAAA';

        sp108e.sendMessage(messages.triggerLiveMode);

        if (type === 'threecolor' || type === 'threecolormix' || type === 'threecolormixmoving') {
            var moveCounter = 0;

            bandGenerator((band) => {

                // 100 pixels of each color, color intensity decided by band
                // var color1 = `${255 * band[0]}`
                //color1.repeat(75);

                var color1 = parseInt(255 * band[0]).toString(16);
                if (color1.length < 2) {
                    color1 = `0${color1}`;
                }
                // TODO Fix pastel, should reduce from standard (88) or something like that
                color1 = pastel ? `${color1}8888` : `${color1}0000`;

                var color2 = parseInt(255 * band[1]).toString(16);
                if (color2.length < 2) {
                    color2 = `0${color2}`;
                }
                color2 = pastel ? `88${color2}88` : `00${color2}00`;

                var color3 = parseInt(255 * band[2]).toString(16);
                if (color3.length < 2) {
                    color3 = `0${color3}`;
                }
                color3 = pastel ? `8888${color3}` : `0000${color3}`;

                // var color4 = parseInt(255 * band[3]).toString(16);
                // if (color4.length < 2) {
                //     color4 = `0${color4}`;
                // }
                // color4 = pastel ? `${color4}88${color4}` : `${color4}00${color4}`;

                var data;
                if (type === 'threecolormix' || type === 'threecolormixmoving') {
                    data = color1.repeat(20) + color2.repeat(20) + color3.repeat(20);
                    data = data.repeat(5);

                    // console.log(data.length); = 1800

                    if (type === 'threecolormixmoving') {
                        var movedData = data.substr(1800 - (24 * moveCounter), 1800) + data.substring(0, 1800 - (6 * moveCounter));
                        data = movedData;
                        if (!waitingForResponse) {
                            // TODO Send data regularly (incl movement), have this stuff simply update the data separately. Should keep it smoother.
                            moveCounter++;

                            // TODO Update this to match with 3 color instead of 4
                            if (moveCounter === 15) {
                                moveCounter = 0;
                            }
                        }
                    }

                } else {

                    data = color1.repeat(75) + color2.repeat(75) + color3.repeat(75) + color4.repeat(75);
                }
                // console.log(data);

                sp108e.sendData(data);
            }, true, false, 1, 1);

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

                var color2 = parseInt(255 * (band[1] + band[2]) / 2).toString(16);
                if (color2.length < 2) {
                    color2 = `0${color2}`;
                }
                color2 = `00${color2}00`;

                var data = color1.repeat(150) + color2.repeat(150);

                sp108e.sendData(data);
            }, true);
        } else if (type === 'threecolormeter') {
            bandGenerator((band) => {
                var background = 'FFFFFF';
                var colors = [];
                colors.push({
                    color: 'FF0000',
                    count: parseInt(100 * band[0])
                });
                colors.push({
                    color: '00FF00',
                    count: parseInt(100 * band[1])
                });
                colors.push({
                    color: '0000FF',
                    count: parseInt(100 * band[2])
                });
                // colors.push({
                //     color: 'FF00FF',
                //     count: parseInt(75 * band[3])
                // });

                var data = '';
                colors.forEach(color => {
                    data += `${color.color.repeat(color.count)}${background.repeat(100 - color.count)}`;
                });

                sp108e.sendData(data);
            }, true);
        } else if (type === 'hilometer') {
            bandGenerator((band) => {
                var background = 'FF6D26';
                var colors = [];
                colors.push({
                    color: 'FF8844',
                    count: parseInt(150 * band[2])
                });
                colors.push({
                    color: 'DD3311',
                    count: parseInt(150 * band[0])
                });


                var data = `${colors[0].color.repeat(colors[0].count)}`;
                if (colors[1].count > colors[0].count) {
                    data += `${colors[1].color.repeat(colors[1].count - colors[0].count)}`;
                    data += `${background.repeat(150 - colors[1].count)}`;
                } else {
                    data += `${background.repeat(150 - colors[0].count)}`;
                }

                // CHECK THIS LOGIC
                data = data.match(/.{6}/g).reverse().join('') + data;

                sp108e.sendData(data);
            }, false, false, 1, 1);

        } else if (type === 'hilometerlightcount') {

            var lights = sp108e.config.device[0].lightCount;

            lights = lights % 2 === 0 ? lights : lights + 1;

            bandGenerator((band) => {
                var background = 'FF6D26';
                var colors = [];
                colors.push({
                    color: 'FF88FF',
                    // color: '00FFFF',
                    count: parseInt((150 / (lights / 2)) * ((lights / 2) * band[2]))
                });
                colors.push({
                    color: 'DD3311',
                    // color: 'FF0000',
                    count: parseInt((150 / (lights / 2)) * ((lights / 2) * band[0]))
                });


                var data = `${colors[0].color.repeat(colors[0].count)}`;
                if (colors[1].count > colors[0].count) {
                    data += `${colors[1].color.repeat(colors[1].count - colors[0].count)}`;
                    data += `${background.repeat(150 - colors[1].count)}`;
                } else {
                    data += `${background.repeat(150 - colors[0].count)}`;
                }
                if (data.length > 900) {
                    data += '0'.repeat(900 - data.length);
                } else if (data.length < 900) {
                    data = data.substr(0, 900);
                }

                // CHECK THIS LOGIC
                data = data.match(/.{6}/g).reverse().join('') + data;

                sp108e.sendData(data);
            }, true, false, 1, 1);

        } else if (type === 'threebandmeterlightcount') {

            var lights = sp108e.config.device[0].lightCount;

            lights = lights % 2 === 0 ? lights : lights + 1;

            bandGenerator((band) => {
                // var background = '000000';
                var background = 'FF6D26';
                var colors = [];

                colors.push({
                    // color: '0000FF',
                    color: '77FFCC',
                    // color: '0000FF',
                    count: parseInt((150 / (lights / 2)) * ((lights / 2) * band[2]))
                });
                colors.push({
                    // color: 'FF0000',
                    color: 'DDDD22',
                    // color: 'FF0000',
                    count: parseInt((150 / (lights / 2)) * ((lights / 2) * band[1]))
                });
                colors.push({
                    // color: 'FFFFFF',
                    color: 'EE3311',
                    // color: '00FF00',
                    count: parseInt((150 / (lights / 2)) * ((lights / 2) * band[0]))
                });


                var data = `${colors[0].color.repeat(colors[0].count)}`;
                if (colors[1].count > colors[0].count) {
                    data += `${colors[1].color.repeat(colors[1].count - colors[0].count)}`;

                    if (colors[2].count > colors[1].count) {
                        data += `${colors[2].color.repeat(colors[2].count - colors[1].count)}`;
                        data += `${background.repeat(150 - colors[2].count)}`;
                    } else {
                        data += `${background.repeat(150 - colors[1].count)}`;
                    }
                } else if (colors[2].count > colors[0].count) {
                    data += `${colors[2].color.repeat(colors[2].count - colors[0].count)}`;
                    data += `${background.repeat(150 - colors[2].count)}`;
                } else {
                    data += `${background.repeat(150 - colors[0].count)}`;
                }

                // else {
                // }
                if (data.length > 900) {
                    data += '0'.repeat(900 - data.length);
                } else if (data.length < 900) {
                    data = data.substr(0, 900);
                }

                // CHECK THIS LOGIC
                data = data.match(/.{6}/g).reverse().join('') + data;

                sp108e.sendData(data);
            }, true, false, [1, 1, 1]);

        } else if (type === 'threebandmeterlightcountstereo') {

            var lights = sp108e.config.device[0].lightCount;

            lights = lights % 2 === 0 ? lights : lights + 1;

            bandGenerator((bands) => {
                // var background = '000000';
                var background = 'FF6D26';
                var colors = [];

                colors.push({
                    // color: 'FFFFFF',
                    // color: '0000FF',
                    color: '77FFCC',
                    // color: '0000FF',
                    count: parseInt((150 / (lights / 2)) * ((lights / 2) * bands[0][2])),
                    secondaryCount: parseInt((150 / (lights / 2)) * ((lights / 2) * bands[1][2]))
                });
                colors.push({
                    // color: '000000',
                    // color: 'FF0000',
                    color: 'DDDD22',
                    // color: 'FF0000',
                    count: parseInt((150 / (lights / 2)) * ((lights / 2) * bands[0][1])),
                    secondaryCount: parseInt((150 / (lights / 2)) * ((lights / 2) * bands[1][1]))
                });
                colors.push({
                    // color: 'FFFFFF',
                    // color: 'FFFFFF',
                    color: 'EE3311',
                    // color: '00FF00',
                    count: parseInt((150 / (lights / 2)) * ((lights / 2) * bands[0][0])),
                    secondaryCount: parseInt((150 / (lights / 2)) * ((lights / 2) * bands[1][0]))
                });


                var data = `${colors[0].color.repeat(colors[0].count)}`;
                var dataSecondary = `${colors[0].color.repeat(colors[0].secondaryCount)}`;
                if (colors[1].count > colors[0].count) {
                    data += `${colors[1].color.repeat(colors[1].count - colors[0].count)}`;

                    if (colors[2].count > colors[1].count) {
                        data += `${colors[2].color.repeat(colors[2].count - colors[1].count)}`;
                        data += `${background.repeat(150 - colors[2].count)}`;
                    } else {
                        data += `${background.repeat(150 - colors[1].count)}`;
                    }
                } else if (colors[2].count > colors[0].count) {
                    data += `${colors[2].color.repeat(colors[2].count - colors[0].count)}`;
                    data += `${background.repeat(150 - colors[2].count)}`;
                } else {
                    data += `${background.repeat(150 - colors[0].count)}`;
                }

                if (colors[1].secondaryCount > colors[0].secondaryCount) {
                    dataSecondary += `${colors[1].color.repeat(colors[1].secondaryCount - colors[0].secondaryCount)}`;

                    if (colors[2].secondaryCount > colors[1].secondaryCount) {
                        dataSecondary += `${colors[2].color.repeat(colors[2].secondaryCount - colors[1].secondaryCount)}`;
                        dataSecondary += `${background.repeat(150 - colors[2].secondaryCount)}`;
                    } else {
                        dataSecondary += `${background.repeat(150 - colors[1].secondaryCount)}`;
                    }
                } else if (colors[2].secondaryCount > colors[0].secondaryCount) {
                    dataSecondary += `${colors[2].color.repeat(colors[2].secondaryCount - colors[0].secondaryCount)}`;
                    dataSecondary += `${background.repeat(150 - colors[2].secondaryCount)}`;
                } else {
                    dataSecondary += `${background.repeat(150 - colors[0].secondaryCount)}`;
                }

                data = dataSecondary.match(/.{6}/g).reverse().join('') + data;

                if(offset !== 0){
                    // TODO: Improve offset
                    data = background.repeat(offset) + data.substr(0, data.length - (6 * offset));
                }

                sp108e.sendData(data);
            }, true, false, [1, 1, 1.5], true);

        }

    },
    notify: (notification) => {

    }
};

module.exports = sp108e;

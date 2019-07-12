const express = require('express');
const app = express();
const net = require('net');
const messages = require('./messages');
const screenRes = require('screenres');
const screenshotnode = require('screenshot-node');
const jimp = require('jimp');

var dataFailureCount = 0;

var createMessage = (message) => {
  return new Buffer(message, 'hex');
};

var sock = new net.Socket();

var waitingForResponse = false;

sock.on('data', function (d) {
  console.log('RESPONDED');
  waitingForResponse = false;
});

var sp108e = {
  connect: (ip, port) => {
    sock.connect(port || 8189, ip || '192.168.0.23');
  },
  close: () => {
    sock.end();
  },
  config: {
    lightCount: 89
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
    sock.write(createMessage(message));
  },
  sendData: (data) => {
    if (!data) {
      return console.log('No data to send');
    }
    if (!waitingForResponse) {
      waitingForResponse = true;
      sock.write(createMessage(data));
      dataFailureCount = 0;
    } else {
      console.log('Skipping data packet');
      dataFailureCount++;
      if(dataFailureCount > 20){
        console.log('Re-establishing live-mode connection');
        dataFailureCount = 0;
        sp108e.sendMessage(messages.triggerLiveMode);
      }
    }
  },
  setSegments: (segmentCount) => {
    if (segmentCount < 1 || segmentCount > 30) {
      return console.log('Please use a segmentcount between 1 and 30');
    }

    var lightsPerSegment = Math.ceil(sp108e.config.lightCount / segmentCount);

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
  captureDesktop: (yPixel=screenRes.get()[1] / 2, resizeAlgorithm=jimp.RESIZE_BILINEAR) => {
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

  }
};

sp108e.connect();

module.exports = sp108e;

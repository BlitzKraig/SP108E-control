const express = require('express');
const app = express();
const net = require('net');
const messages = require('./messages');
const screenshot = require('screenshot-desktop');
const utils = require('./utils');
const screenRes = require('screenres');

const jimp = require('jimp');

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
    // console.log(`Writing data ${data}`);
    if (!waitingForResponse) {
      waitingForResponse = true;
      sock.write(createMessage(data));
    } else {
      console.log('Skipping data packet');
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
  captureDesktop: () => {
    // var fs = require('fs');
    // var PNG = require('pngjs').PNG;

    screenshot.listDisplays().then((displays) => {
      // Call livemode
      sp108e.sendMessage(messages.triggerLiveMode);


      var capture = () => {
        console.time('Screen');

        //IF Windows:

        // var pixColor = require('pixcolor');
        // var colors = [];
        // var xPixels = utils.distributedCopy(screenRes.get()[0], 300);
        // var yPixel = screenRes.get()[1];


        // xPixels.forEach(xPixel => {
        //   colors.push(pixColor([xPixel,yPixel]));
        // });
        // console.log(colors);

        // for(var i=0; i< 300; i++){
        //   colors.push(pixColor([i, 100], true));
        // }

        //ENDIF Windows:

        //IF other:
        screenshot({
          screen: displays[0].id,
          format: 'jpg'
        }).then((img) => {
          console.timeEnd('Screen');

          jimp.read(img)
            .then((image) => {
              image.resize(300, image.bitmap.height, jimp.RESIZE_NEAREST_NEIGHBOR);
              var data = '';
              image.scan(0, image.bitmap.height / 2, image.bitmap.width, 1, function (x, y, idx) {

                // x, y is the position of this pixel on the image
                // idx is the position start position of this rgba tuple in the bitmap Buffer
                var red = this.bitmap.data[idx + 0].toString(16);
                var green = this.bitmap.data[idx + 1].toString(16);
                var blue = this.bitmap.data[idx + 2].toString(16);

                data += red.length === 2 ? red : `0${red}`;
                data += green.length === 2 ? green : `0${green}`;
                data += blue.length === 2 ? blue : `0${blue}`;
                if (x === image.bitmap.width - 1) {
                  sp108e.sendData(data);
                  capture();
                }
              });

            }).catch((err) => {

            });
        });
        // ENDIF other:




      };
      capture();
    });


  }
};

sp108e.connect();

module.exports = sp108e;

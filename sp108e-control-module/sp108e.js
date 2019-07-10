const express = require('express');
const app = express();
const net = require('net');
const messages = require('./messages');

var createMessage = (message) => {
  return new Buffer(message, 'hex');
};

var sock = new net.Socket();

sock.on('data', function (d) {
  console.log(d.toString());
});

var sp108e = {
  connect: (ip, port) => {
    sock.connect(port||8189, ip||'192.168.0.23');
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
  }
};

sp108e.connect();

module.exports = sp108e;

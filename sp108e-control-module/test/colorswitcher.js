const sp108e = require('../sp108e');
const messages = require('../messages');
var i = 0;
var colors = [];
colors.push(messages.changeColor.red);
colors.push(messages.changeColor.blue);
colors.push(messages.changeColor.green);

setInterval(() => {
    sp108e.sendMessage(colors[i]);
  i++;
  if (i > colors.length - 1) {
    i = 0;
  }
}, 100);

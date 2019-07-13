const sp108e = require('../sp108e');
const messages = require('../messages');

var gif = 'redbar.gif'
var time = 50;
var loop = true;

if (process.argv[2]) {
    console.log(process.argv[2]);
    gif = process.argv[2];
}
if (process.argv[3]) {
    console.log(process.argv[3]);
    time = process.argv[3];
}
if (process.argv[4]) {
    console.log(process.argv[4]);
    loop = process.argv[4];
}

sp108e.playGif(`./input/${gif}`, time, loop);

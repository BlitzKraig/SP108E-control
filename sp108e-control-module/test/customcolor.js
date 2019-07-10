const sp108e = require('../sp108e');
const messages = require('../messages');

var colorHex = 'AAFF66';

if(process.argv[2]){
    console.log(process.argv[2]);
    colorHex = process.argv[2];
}
sp108e.sendMessage(messages.changeColor.custom(colorHex));
sp108e.close();

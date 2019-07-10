// eg. `$ node customcommand.js changeColor.custom FF00FF`

const sp108e = require('../sp108e');
const messages = require('../messages');

var dynamicMessage = messages;

var commandMessage = '';
var arg;

if (process.argv[2]) {
    console.log(process.argv[2]);
    commandMessage = process.argv[2];
}
if(process.argv[3]) {
    console.log(process.argv[3]);
    arg = process.argv[3];
}

if(commandMessage){
commandMessage = commandMessage.split('.');
for (var i = 0, len = commandMessage.length; i < len - 1; i++) {
    dynamicMessage = dynamicMessage[commandMessage[i]];
}


console.log(dynamicMessage[commandMessage[len - 1]]);

sp108e.sendMessage(arg?dynamicMessage[commandMessage[len - 1]](arg):dynamicMessage[commandMessage[len - 1]]);
} else {
    console.log(messages);
}
sp108e.close();

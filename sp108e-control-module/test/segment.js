// Set your light count in the config

const sp108e = require('../sp108e');

var seg = 2;

if (process.argv[2]) {
    console.log(process.argv[2]);
    seg = process.argv[2];
}

sp108e.setSegments(seg);
sp108e.close();

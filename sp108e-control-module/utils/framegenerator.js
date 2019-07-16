var frameGenerator = {};

// 1800 characters, 900 hex bytes, 300 color pixels

frameGenerator.generateSingleColor = (color) => {
    if(color.length !== 6){
        return false;
    }

    return color.repeat(300);
};

module.exports = frameGenerator;

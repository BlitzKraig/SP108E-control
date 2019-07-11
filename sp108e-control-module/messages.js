// TODO Restructure messages
var messages = {
    toggle : '38000000aa83',
    changeColor : {
        red : '38FF00002283',
        blue : '3800FF002283',
        green : '380000FF2283',
        white : '38FFFFFF2283',
        warm : '38FF6D262283',
        custom : (colorHex)=>{
            return `38${colorHex}2283`;
        }
    },
    setBrightness : {
        min:'380000002A83',
        max:'38FF00002A83',
        mid:'388800002A83',
        custom : (brightnessHex)=>{
            return `38${brightnessHex}00002A83`;
        }
    },
    setSpeed : {
        min:'380000000383',
        max:'38FF00000383',
        mid:'388800000383',
        custom : (speedHex)=>{
            return `38${speedHex}00000383`;
        }
    },
    setPattern : {
        meteor:'38CD910E2C83',
        breathing:'38CE00002C83',
        wave:'38D100002C83',
        catchup:'38D100002C83',
        stack:'38CF00002C83',
        flash:'38D200002C83',
        static:'38D300002C83',
        predefined:{

        }
    },
    setSegmentCount: (segmentCount) => {

        console.log(`Segments: ${segmentCount}`);
        var segmentHex = '00';
            segmentHex = parseInt(segmentCount).toString(16);

        if(segmentCount <= 16){
            segmentHex = `0${segmentHex}`;
        }

        console.log(segmentHex);

        return `38${segmentHex}00002E83`;
    },
    setLightsPerSegmentCount: (lightsPerSegment) => {

        console.log(`Lights: ${lightsPerSegment}`);
        var lightsHex = '00';
            lightsHex = parseInt(lightsPerSegment).toString(16);

        if(lightsPerSegment <= 16){
            lightsHex = `0${lightsHex}`;
        }

        console.log(lightsHex);

        return `38${lightsHex}00002D83`;
    },
    triggerLiveMode: '38F800002483'
};

module.exports = messages;

var x = null;
var y = null;

document.addEventListener('mousemove', onMouseUpdate, false);
document.addEventListener('mouseenter', onMouseUpdate, false);

function onMouseUpdate(e) {
    x = e.pageX;
    y = e.pageY;
}

function getMouseX() {
    return x;
}

function getMouseY() {
    return y;
}



const SCALE = [
    new Tone.Buffer('scale-G2.mp3'),
    new Tone.Buffer('scale-A2.mp3'),
    new Tone.Buffer('scale-C3.mp3'),
    new Tone.Buffer('scale-D3.mp3'),
    new Tone.Buffer('scale-E3.mp3'),
    new Tone.Buffer('scale-G3.mp3'),
    new Tone.Buffer('scale-A3.mp3'),
    new Tone.Buffer('scale-C4.mp3'),
    new Tone.Buffer('scale-D4.mp3'),
    new Tone.Buffer('scale-E4.mp3')
];

const RHYTHM_GRAMMAR = {
    pattern: [['#cell#', '#pattern#'], ['#cell#', '#cell#']],
    cell: [['#twoCell#'], ['#threeCell#']],
    twoCell: [['8n', '8n'], ['4n']],
    threeCell: [['8n', '8n', '8n'], ['4n', '8n'], ['8n', '4n']]
};

const compressor = new Tone.Compressor().toMaster();
const trams = new Map();
const stops = new Map();
const incomingMessages = [];
//const showingLabels = SCALE.map(() => []);
/*const timeFormat = new Intl.DateTimeFormat([], {
timeZone: 'Europe/Helsinki',
hour: 'numeric', minute: 'numeric'
});*/
//const effectsEl = document.querySelector('#effects');
//const timeEl = document.querySelector('#current-time');
let rhythmPattern = new Tone.CtrlPattern(expandRhythmPattern(), 'alternateUp');
let latLngBounds;

// console.warn(expandRhythmPattern());
// console.warn(expandRhythmPattern());
// console.warn(expandRhythmPattern());
// console.warn(expandRhythmPattern());
// console.warn(expandRhythmPattern());
function expandRhythmPattern(token = '#pattern#') {
    if (token.startsWith('#') && token.endsWith('#')) {
        const options = RHYTHM_GRAMMAR[token.substring(1, token.length - 1)];
        const choice = options[Math.floor(Math.random() * options.length)];
        var p =  choice.reduce((result, token) => result.concat(expandRhythmPattern(token)), []);
        console.log("Pattern", p);
        //return ["32n", "32n", "32n", "32n", "32n", "32n"];
        return p;
    } else {
        return [token];
    }
}


// Consume the queue following the current rhythm pattern
function dequeNext(time) {
    //console.log("DequeNext", time);
    var next = getFromQ();

    if (next !== null && !(next instanceof Date)) {
        processMessage(time, next);
    }
    Tone.Transport.schedule(dequeNext, '+' + rhythmPattern.next());
}

Tone.Buffer.on('load', () => Tone.Transport.schedule(dequeNext, '+' + rhythmPattern.next()));

function processMessage(time, item) {
    // , { VP: { desi, lat, long, tsi, veh } }
    //console.log("Processed", item);
    console.info(item.data.Destination, "leaving", item.data.LastObservedAt, "at",item.data.TimeTabledDeparture);
    playIntersection(time);
}
function playIntersection(time, tram, stop) {
    const screenWidth = document.documentElement.offsetWidth;

    // todo: use something else than 500 for panning??
    const pan = Math.max(-1, Math.min(1, 500 / screenWidth * 2 - 1));
    //console.log("panner", pan);
    const note = getNote(tram);
    //console.log(note >= 0);
    //console.log("play", time, note);
    if (note >= 0 && note < SCALE.length) {
        const panner = new Tone.Panner(pan).connect(compressor);
        const player = new Tone.Player(SCALE[note]).connect(panner);
        player.volume.value = -6;
        player.start();
        // Courtesy of @quinnirill https://twitter.com/quinnirill/status/907557984460570624
        player._source.playbackRate.linearRampToValueAtTime(1.035, time + 10);
        setTimeout(() => player.dispose(), 10000);
    } else {
        console.log('No note for', note);
    }
}

var i = -1;
function getNote(tram) {

    return Math.floor(Math.random() * SCALE.length);
    //return item;    
    // what note depends on place on map. Just random for us.
    //const screenHeight = document.documentElement.offsetHeight;
    if (i++ < SCALE.length) {
        return SCALE[i];
    } else {
        i = -1;
        return getNote();
    }
    //return Math.floor((screenHeight - tram.pt.y) / screenHeight * SCALE.length);
}


setInterval(() => {

}, 500);

Array.prototype.toObject = function (f) {
    var o = {};
    for (var i = 0; i < this.length; i++) {
        o[f.call(this[i])] = this[i];
    }
    return o;
};


function getData() {
    var urls = [
        "http://localhost:9090/api.sl.se/fordonspositioner/GetData?type=TB1&pp=true",
        "http://localhost:9090/api.sl.se/fordonspositioner/GetData?type=TB3&pp=true",
        "http://localhost:9090/api.sl.se/fordonspositioner/GetData?type=PT&pp=true"];

    urls.forEach((url) => fetch(url)
        .then(res => res.json())
        .then(res => {
            var data = JSON.parse(res);
            return data.Trips.map(x => {
                //x = [ [],[]]
                var o = {};
                x.forEach((kvp) => {
                    //console.log(kvp);
                    o[kvp[0]] = kvp[1];
                });
                return o;
            });
        })
        .then(res => {
            var counter = 0;
            res.forEach(function (element) {
                var today = new Date();
                var timeParts = element.TimeTabledDeparture.split(":");

                //counter += 5;
                //today.setSeconds(today.getSeconds() + counter);


                // this is the correct way
                today.setHours(timeParts[0]);
                today.setMinutes(timeParts[1]);
                today.setSeconds(timeParts[2]);
                addToQ(element, today);
            }, this);
        })
        .catch(e => console.error(e))
    );
}
getData();
setInterval(getData, 55000);
setInterval(() => {
    console.log("Changed rhytm");
    const newPtn = expandRhythmPattern();
    rhythmPattern = new Tone.CtrlPattern(newPtn, 'up');
}, 550000)



// String.prototype.replaceAll = function(search, replacement) {
//     var target = this;
//     return target.replace(new RegExp(search, 'g'), replacement);
// };

// items.forEach((v) => {
//     var int = v.TimeTabledDeparture.replaceAll(/\:/,"");
//     console.log(int);
// });

var timedQueue = [];
var blacklist = [];


function addToQ(item, available) {

    var envelope = {
        available: available,
        data: item
    };

    console.log(item);
    item.LastUpdate = null;
    var json = envelope.data.JourneyNumber + envelope.data.Destination + "leaving" + envelope.data.LastObservedAt + "at" + envelope.data.TimeTabledDeparture;
    if (blacklist.indexOf(json) < 0) {
        timedQueue.push(envelope);
        blacklist.push(json);
        timedQueue.sort((a, b) => {
            return a.available.getTime() - b.available.getTime();
        });
    } else {
        console.log("Blacklisted", json);
    }
}
const throttle = (func, limit) => {
    let inThrottle
    let lastFunc
    let lastRan
    return function () {
        const context = this
        const args = arguments
        if (!inThrottle) {
            func.apply(context, args)
            lastRan = Date.now()
            inThrottle = true
        } else {
            clearTimeout(lastFunc)
            lastFunc = setTimeout(function () {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args)
                    lastRan = Date.now()
                }
            }, limit - (Date.now() - lastRan))
        }
    }
}

function getFromQ() {
    if (timedQueue.length == 0) {
        return null;
    }

    var now = new Date();
    var envelope = timedQueue[0];
    return envelope;
    if (envelope.available <= now) {
        console.log("left in queue", timedQueue.length);
        return timedQueue.shift();
    }

    console.info("Next: ", envelope.data.Destination, "leaving", envelope.data.LastObservedAt, "at",envelope.data.TimeTabledDeparture);
    return envelope.available;
}

Tone.context.latencyHint = 'playback';
Tone.Transport.bpm.value = 50;
Tone.Transport.start();

StartAudioContext(Tone.context, document.documentElement);


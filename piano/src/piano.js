
// StartAudioContext(Tone.context, "#mstart").then(function () {
//     console.log("Started");
//     TonePiano = require("tone-piano");
//     loadPiano(compressor).then(() => {
//         console.log("piano loaded");
//         anders();
//     });
// });

var webAudioTouchUnlock = require('web-audio-touch-unlock');
var Tone = require("tone");

var context = Tone.context;
// var context2 =  new (window.AudioContext || window.webkitAudioContext)();
console.log(webAudioTouchUnlock);
webAudioTouchUnlock.default(context)
    .then(function (unlocked) {
        if(unlocked) {
            
            // AudioContext was unlocked from an explicit user action, sound should start playing now
            
            console.error("audiocontext was unlocked");
            startEverything();
            
        } else {
            
            
            // There was no need for unlocking, devices other than iOS
            console.error("No need to unlock");
            startEverything();
        }
    }, function(reason) {
        console.error(reason);
    });



    document.addEventListener("DOMContentLoaded", function(event) { 
        const playbtn = document.getElementById("playbtn");
        playbtn.addEventListener("click", () => {
            startEverything();
            playbtn.style.display = "none";
        });
      });
function startEverything() {
    if (Tone.context.state !== 'running') {
        Tone.context.resume();
    }
    
    var TonePiano;
    var lodash = require("lodash");
    // var StartAudioContext = require("startaudiocontext");
    Tone.context.latencyHint = "balanced";
    var heldNotes = new Set();
    var piano;

    TonePiano = require("tone-piano");
    
    setTimeout(() => {
        loadPiano(compressor).then(() => {
            console.log("piano loaded");
            anders();
            });
    },0);

    
var BPMDefaults = {
    max: 120,
    default: 90,
    supersonic: 520
};

Tone.Transport.bpm.value = BPMDefaults.default;

var DEBUG = false;

const $ = (selector) => document.querySelector(selector)
const $$ = (selector) => document.querySelectorAll(selector)
const on = (elem, type, listener) => type.split(" ").forEach((et) => elem.addEventListener(et, listener));

var showTravel = $("#showTravel");
var showKeyboards = $("#showKeyboards");
var playExtra = $("#playExtra");
var pauseExtra = $("#pauseExtra");
on(showKeyboards, 'change', () => {
    if (showKeyboards.checked) {
        $("body").classList.add("showKeyboards");
    } else {
        $("body").classList.remove("showKeyboards");
    }
});

on($("#onlyPlayVisible"),"change", (e) => {
    console.log("e",e);
    _state.controls.onlyPlayVisible = e.target.checked;
    filterArrivals();
});


var changeBPMLabel = $("#changeBPMLabel");
setBPMlabel(Tone.Transport.bpm.value);
var changeBPM = $("#changeBPM");

on(changeBPM, 'input', (e) => {
    setBPMlabel(e.target.value);
});

function setBPMlabel(val) {
    changeBPMLabel.innerText = "(" + val + ")";
}


on(changeBPM, 'change', (e) => {
    console.log("change", e);
    Tone.Transport.bpm.rampTo(e.target.value,4);

    if(e.target.value >= 120) {
        $(".supersonic").classList.add("visible");        
    }
});

on($("#enableSuperSonic"),"change", (e) => {
    if(e.target.checked) {
        changeBPM.max = BPMDefaults.supersonic
    } else {
        changeBPM.max = BPMDefaults.max;
        changeBPM.value = BPMDefaults.default;
    }
});



var SCALES = {
    diatonic: {
        intervals: [2, 2, 1, 2, 2, 2, 1],
        voiceSteps: {
            '3': 4,
            '4': 9
        },
        chromaticJump: -0.5,
        chromaticSizeAdjust: -2,
        centerNote: {
            octave: 5,
            pitchClass: 0
        }
    }
};
var PATTERNS = {
    '1': [0, 7, 1, 6, 2, 5, 3, 4, 5, 2, 4, 5, 2, 6, 1, 7]
};
var SURFACE_AREA_SIZE = window.innerHeight; // dont think we really newed this

var GRID = {
    horizontal: window.innerWidth,
    vertical: window.innerHeight
};

function setHarmonicMode(state, harmonicMode, muteChange, currentTime) {
    var newState = setActiveKeys(Object.assign({}, state, {
        controls: Object.assign({}, state.controls, {
            harmonicMode: harmonicMode
        })
    }));
    var scheduling = muteChange ? 'none' : 'allAtOnce';
    var updatedVoices = getUpdatedVoices(newState, currentTime, scheduling);
    if (updatedVoices.length > 0) {
        return Object.assign({}, newState, {
            currentVoices: lodash.unionBy(updatedVoices, newState.currentVoices, function (v) {
                return v.voiceId;
            }),
            currentTime: currentTime
        });
    } else if (!muteChange) {
        return retrigger(newState, currentTime);
    } else {
        return newState;
    }
}

function setVoicing(state, voicing, muteChange, currentTime) {
    return updateVoices(Object.assign({}, state, {
        controls: Object.assign({}, state.controls, {
            voicing: voicing
        }),
        currentTime: currentTime,
        keyboards: state.keyboards.map(function (keyboard) {
            return Object.assign({}, keyboard, {
                voiceAssignments: getVoiceAssignments(voicing, keyboard.orientation)
            });
        })
    }), muteChange ? 'none' : 'allAtOnce');
}

function getVoiceAssignments(voicing, orientation) {
    if (voicing === 'chordMelody') {
        return orientation === 'horizontal' ? ['1'] : ['2', '3', '4'];
    } else {
        return orientation === 'horizontal' ? ['1', '4'] : ['2', '3'];
    }
}

function updateVoices(state, scheduling) {
    var updates = getUpdatedVoices(state, state.currentTime, scheduling);
    return Object.assign({}, state, {
        currentVoices: lodash.unionBy(updates, state.currentVoices, function (v) {
            return v.voiceId;
        })
    });
}
function tickFn(state, currentTime, currentTick) {
    var scale = SCALES[state.controls.harmonicMode];
    var _state$accumulatedDel2 = state.accumulatedDelta
        , deltaX = _state$accumulatedDel2.deltaX
        , deltaY = _state$accumulatedDel2.deltaY;

    var pendingPos = state.pendingMousePosition;



    var lastRealArrival = state.currentArrival || state.lastArrival;
    var newArrival = deque(true);
    //console.log("newarrival", newArrival);
    var arrival = newArrival || lastRealArrival;
    if (arrival) {
        //console.log("has arrival", arrival);

        // only play every-other, and sometimes add extra beats when playing from queue
        var rand = Math.random();
        var isOdd = currentTick % 2 === 0;
        var shouldNotPlay = isOdd == false;
        var shouldNotPlayExtra = rand > playExtra.value; // only play extra beats sometimes
        var shouldPauseExtra = rand < pauseExtra.value; // add extra pauses tometimes

        // make the music interesting
        if (shouldNotPlay && shouldNotPlayExtra) {
            return state;
        } else if (shouldPauseExtra) {
            //console.warn("Extra pause");
            return state;
        }
        // redo dequeue to actually not only peek
        if (newArrival) {
            deque();
        }

        //console.log("Arrival happened", arrival);
        var location = getLocationFromItem(arrival);
        pendingPos = location;
        //pendingPos.horizontal = location.horizontal;
        //pendingPos.vertical = location.vertical;
    } else {
        //console.warn("no arrival");
    }

    var newHoriz = void 0
        , newVert = void 0;
    if (pendingPos) {
        //newHoriz = SURFACE_AREA_SIZE - SURFACE_AREA_SIZE * pendingPos.horizontal;
        //newVert = SURFACE_AREA_SIZE * pendingPos.vertical;
        newHoriz = Math.max(0, Math.min(GRID.horizontal - 1, pendingPos.horizontal));
        newVert = Math.max(0, Math.min(GRID.vertical - 1, pendingPos.vertical));
    } else {
        //console.error("NO PENDINGPOS");
        newHoriz = Math.max(0, Math.min(GRID.horizontal - 1, state.mousePosition.horizontal));
        newVert = Math.max(0, Math.min(GRID.vertical - 1, state.mousePosition.vertical));
    }
    var mousePositionChanged = newHoriz !== state.mousePosition.horizontal || newVert !== state.mousePosition.vertical;
    if (!mousePositionChanged) {
        //console.error("no change", mousePositionChanged);
    }
    var mousePosition = mousePositionChanged ? {
        horizontal: newHoriz,
        vertical: newVert
    } : state.mousePosition;
    //console.warn("POS", mousePosition);
    // we dont user patterns
    // var patternStepCounter =
    //     state.isPlaying &&
    //         state.controls.patternOn &&
    //         !mousePositionChanged &&
    //         Math.max.apply(Math, [...state.currentVoices.map(function (v) {
    //             return v.playOnTick;
    //         })]) - currentTick < 0 ? state.patternStepCounter + 1 : state.patternStepCounter;

    return updateVoices(Object.assign({}, state, {
        currentTime: currentTime,
        currentTick: currentTick,
        mousePosition: mousePosition,
        accumulatedDelta: {
            deltaX: 0,
            deltaY: 0
        },
        pendingMousePosition: undefined,
        //patternStepCounter: patternStepCounter,
        currentArrival: newArrival,
        lastArrival: lastRealArrival
    }), 'treatment');
}

function retrigger(state, currentTime) {
    var maxTick = Math.max.apply(Math, [...state.currentVoices.map(function (v) {
        return v.triggeredOnTick;
    })]);
    var updatesToMake = state.currentVoices.filter(function (v) {
        return v.triggeredOnTick === maxTick;
    }).map(function (voice, index) {
        return Object.assign({}, voice, {
            playOnTick: state.controls.treatment === 'line' ? state.currentTick + index + 1 : state.currentTick,
            triggeredOnTick: state.currentTick
        });
    });
    return Object.assign({}, state, {
        currentTime: currentTime,
        currentVoices: lodash.unionBy(updatesToMake, state.currentVoices, function (v) {
            return v.voiceId;
        })
    });
}


var _state = setVoicing(setHarmonicMode({
    currentTime: 0,
    currentTick: 0,
    currentVoices: [],
    keyboards: [makeKeyboard(50, 3, 9, 'vertical'), makeKeyboard(50, 3, 5, 'horizontal')],
    isPlaying: false,
    mousePosition: {
        horizontal: GRID.horizontal / 2,
        vertical: GRID.vertical / 2
    },
    accumulatedDelta: {
        deltaX: 0,
        deltaY: 0
    },
    isCursorsSuppressed: false,
    patternStepCounter: -1,
    controls: {
        voicesOn: {
            '1': true,
            '2': true,
            '3': true,
            '4': true
        },
        onlyPlayVisible: true,
        harmonicMode: 'diatonic',
        treatment: 'Chord',
        transposition: 0,
        intervalOfTransposition: 1,
        patternOn: false,
        patternId: '1',
        voicing: 'chordMelody',
        articulation: 'legato',
        velocity: 27,
        outputType: 'piano',
        outputControls: {
            piano: {
                loading: true
            }
        }
    }
}, 'diatonic', true, 0), 'chordMelody', true, 0);

// debug render keyboard

var k1 = _state.keyboards[0];
var k2 = _state.keyboards[1];
var xmap = document.getElementById("mapid");
k1.activeKeys.forEach(function (key, index) {
    var d = document.createElement("div");
    d.className = "key1 kh-" + index;
    d.style.position = "absolute";
    d.style.top = key.startPos + "px";
    d.style.right = 0;
    d.style.width = key.height + "px";
    xmap.appendChild(d);
    xmap.style.position = "relative";
}, this);

k2.activeKeys.forEach(function (key, index) {
    var d = document.createElement("div");
    d.className = "key2 kv-" + index;
    d.style.position = "absolute";
    d.style.left = key.startPos + "px";
    d.style.top = 0;
    d.style.width = key.width + "px";
    xmap.appendChild(d);
    xmap.style.position = "relative";
}, this);



//window.state = state;

let repeatToken;
let compressor = new Tone.Gain(1.0).toMaster();
//let compressor = new Tone.Compressor(10,10).toMaster();
function anders() {
    //var activeKeys = setActiveKeys(state);
    //state = setActiveKeys(Object.assign({}, state));
    var tick = 0;
    repeatToken = Tone.Transport.scheduleRepeat(function (time) {
        tick++;
        //console.log("repeattoken", time, tick);
        //updateState(tick, time, _this2.tick);
        //theindex+=1;
        //console.log(state.currentTick);
        //console.log("state", _state);
        updateState(tickFn, time, tick);

    }, "16n");


    Tone.Transport.start("+0.5");
    //this.masterGain = new Tone.Gain(1.0).toMaster();

    function turnOn(state, isCursorsSuppressed, currentTime) {
        var newState = Object.assign({}, state, {
            isCursorsSuppressed: isCursorsSuppressed
        });
        return newState;
        //return retrigger(newState, currentTime);
    }



    setTimeout(() => {
        _state.isPlaying = true;
        updateState(turnOn, false, getCurrentTime(_state));
        // setInterval(() => {
        //     console.log("interval", _state.pendingMousePosition);
        //     var move = Math.random();
        //     var range = 40;
        //     var deltaX = getRandomInt(-range, range + 1);
        //     var deltaY = getRandomInt(-range, range + 1);

        //     if (_state.mousePosition.vertical < 100) {
        //         deltaX = Math.abs(deltaX);
        //     }

        //     if (_state.mousePosition.horizontal > 500) {
        //         deltaY = -Math.abs(deltaY);
        //     }

        //     console.log("Delta", deltaX, deltaY);
        //     updateState(moveCursor, deltaX, deltaY);
        //     // _state.pendingMousePosition = {
        //     //     horizontal: Math.random(),
        //     //     vertical: Math.random()
        //     // }
        //     //_state = moveCursor(_state, Math.random(), Math.random());
        //     //console.log("interval", state.pendingMousePosition);
        // }, 1500);
        // document.getElementById("mapid").onmousemove = function (e) {
        //     var deltaX = e.movementX;
        //     var deltaY = -e.movementY;
        //     //console.log(e);
        //     //_state = retrigger(_state, _state.currentTime);
        //     //_state.isPlaying = true;
        //     //console.log("mouse", deltaX, deltaY);

        //     //updateState(moveCursor2, e.x, e.y);
        //     //_state.isPlaying = false;
        // };
    }, 1);
}

function moveCursor2(state, x, y) {
    return Object.assign({}, state, {
        pendingMousePosition: {
            horizontal: x,
            vertical: y
        }
    });
}

// function test() {
//     var currentPos = { horizonta: 0, vertical: 0 };

//     var grid = { horizontal: 500, vertical: 500 };
//     var target = { horizontal: 100, vertical: 100 };
//     var movement = getMovement(target, currentPos, grid);

//     var location = getNewLocation(movement, currentPos, grid);
// }

function getNewLocation(movement, currentPos, grid) {

    // get new location using boundary check
    return {
        horizontal: Math.max(0, Math.min(grid.horizontal - 1,
            currentPos.horizontal + movement.horizontal)),
        vertical: Math.max(0, Math.min(grid.horizontal - 1,
            currentPos.vertical + movement.vertical))
    };
}

function diff(x, y) {
    return Math.abs(x - y);
}

function getMovement(target, currentPos, grid) {

    //console.log("target", target);
    // go up or down or stay still?
    var verticalMovement = getOneDirection(target.vertical, currentPos.vertical);

    // go right left or stay still
    var horizontalMovement = getOneDirection(target.horizontal, currentPos.horizontal);

    var FACTOR = 20;

    var dynamicFactorHorizontal = 1 + diff(target.horizontal, currentPos.horizontal) / grid.horizontal
    var dynamicFactorVertical = 1 + diff(target.vertical, currentPos.vertical) / grid.vertical;
    //console.warn(dynamicFactorHorizontal, dynamicFactorVertical);
    // Get delta with FACTOR and boundary check within grid
    var deltaHorizontal = horizontalMovement * FACTOR * dynamicFactorHorizontal;

    var deltaVertical = verticalMovement * FACTOR * dynamicFactorVertical;

    var result = { horizontal: deltaHorizontal, vertical: deltaVertical, factor: FACTOR };
    return result;
}

function getOneDirection(target, currentPos, grid) {
    if (target > currentPos) {
        return 1;
    } else if (target < currentPos) {
        return -1;
    }
    else {
        return 0;
    }
}

// (function loop() {
//     var rand = Math.round(Math.random() * (600 - 100)) + 100;

//     //console.log("sleep", rand);
//     setTimeout(function () {
//         ofCourseIStillLoveYou(rand, false);
//         loop();
//     }, rand);
// }());

var target;

/**
 * item from data points
 * @param {object} item 
 */
function getLocationFromItem(item) {
    // resolve coordinates to pos.
    var lat = item[3];
    var lng = item[4];
    const pos = L.latLng(lat, lng);
    //console.log("POS", pos);
    var target = mymap.latLngToContainerPoint(pos);
    target.horizontal = target.x;
    target.vertical = target.y;
    //console.info("target from point on map",target);
    //return ofCourseIStillLoveYou(300 +1, false);

    var grid = GRID;
    //console.log("Y", _state.mousePosition);
    var currentPos = _state.mousePosition || { horizontal: grid.horizontal / 2, vertical: grid.vertical / 2 };
    //console.log("currentPos", currentPos);
    //console.log("sleep", sleep);
    //console.log(target);
    var movement = getMovement(target, currentPos, grid);
    //console.log("movement", movement);
    var newLocation = getNewLocation(movement, currentPos, grid);
    var safeLocation = getSmoothLocation(target, newLocation, movement);
    //console.info("safelocation",safeLocation);
    return safeLocation;
}

function ofCourseIStillLoveYou(sleep, update) {
    console.error("OF COURSE I STILL LOVE YOU CALLED");
    var grid = { horizontal: 600, vertical: 600 };
    var currentPos = _state.mousePosition;
    //console.log("currentPos", currentPos);
    //console.log("sleep", sleep);
    if (!target || sleep > 300) {
        target = {
            horizontal: grid.horizontal * Math.random(),
            vertical: grid.vertical * Math.random()
        };
    }
    //console.log(target);
    var movement = getMovement(target, currentPos, grid);
    //console.log("movement", movement);
    var newLocation = getNewLocation(movement, currentPos, grid);
    var safeLocation = getSmoothLocation(target, newLocation, movement);
    //console.log("new location", newLocation, safeLocation);
    if (update) {
        updateState(moveCursor2, safeLocation.horizontal, safeLocation.vertical);
    } else {
        return safeLocation;
    }
}

function getSmoothLocation(target, newLocation, movement) {
    // smoother to balance movements when we are close enough
    var location = {
        horizontal: smoothValue(target.horizontal, newLocation.horizontal, movement.horizontal),
        vertical: smoothValue(target.vertical, newLocation.vertical, movement.vertical)
    };

    return location;
}

function smoothValue(target, newLocation, movement) {
    // smoother to balance movements when we are close enough
    var diff = Math.abs(target - newLocation);
    // close enough
    if (diff < Math.abs(movement)) {
        return target;
    }
    // just original propsal
    return newLocation;
}

var fakei = 0;
function moveCursor(state, deltaX, deltaY) {
    var _state$accumulatedDel = state.accumulatedDelta
        , prevDeltaX = _state$accumulatedDel.deltaX
        , prevDeltaY = _state$accumulatedDel.deltaY;

    var newDelta = {
        deltaX: prevDeltaX + deltaX,
        deltaY: prevDeltaY + deltaY
    };
    return Object.assign({}, state, {
        accumulatedDelta: newDelta
    });
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}



function loadPiano(dest) {
    piano = new TonePiano.Piano([30, 108], 3, false).connect(dest);
    return piano.load('Salamander/');
}

function updateState(actionFn) {
    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
    }

    _state = actionFn.apply(undefined, [_state].concat(args));
    renderUI(_state);
}

function getVoicesToPlay(state) {
    var voices = getCurrentVoices(state);
    var currentTime = getCurrentTime(state);
    var currentTick = getCurrentTick(state);
    var outputType = getOutputType(state);
    //var treatment = getTreatment(state);

    var voicesToPlay = voices.filter(function (_ref5) {
        var playOnTick = _ref5.playOnTick;
        //console.log("playontick", playOnTick);
        //console.log("currnet tick", currentTick);
        return playOnTick === currentTick;
    });
    return {
        voices: voicesToPlay,
        currentTime: currentTime,
        currentTick: currentTick,
        outputType: outputType
    };
}

function getActiveKeyIdx(keyboard, scale, mousePosition) {
    var mousePos = mousePosition[keyboard.orientation];
    return lodash.sortedIndexBy(keyboard.activeKeys, {
        startPos: mousePos
    }, function (k) {
        return k.startPos;
    }) - 1;
}

function getCurrentVoiceKeys(state) {
    var controls = state.controls
        , keyboards = state.keyboards
        , mousePosition = state.mousePosition
        , patternStepCounter = state.patternStepCounter;

    var scale = SCALES.diatonic;
    var pattern = PATTERNS['1'];
    return lodash.flatMap(keyboards, function (keyboard) {
        var rootKeyIdx = getActiveKeyIdx(keyboard, scale, mousePosition);
        // var contraryMirrorIndex = void 0;

        // var scaleCenterNote = scale.centerNote.octave * 12 + scale.centerNote.pitchClass + controls.transposition;
        // contraryMirrorIndex = (0,
        // _lodash.findIndex)(keyboard.activeKeys, function(k) {
        //     return k.key.note.octave * 12 + k.key.note.pitchClass === scaleCenterNote;
        // });

        return keyboard.voiceAssignments.filter(function (voiceId) {
            return controls.voicesOn[voiceId];
        }).map(function (voiceId) {
            return {
                voiceId: voiceId,
                keyIdx: rootKeyIdx + (scale.voiceSteps[voiceId] || 0)
            };
        }).map(function (_ref4) {
            var voiceId = _ref4.voiceId
                , keyIdx = _ref4.keyIdx;

            var key = keyIdx >= 0 && keyIdx < keyboard.activeKeys.length ? keyboard.activeKeys[keyIdx].key : undefined;
            return {
                voiceId: voiceId,
                key: key,
                keyboard: keyboard
            };
        });
    });
}

function setActiveKeys(state) {
    var scale = SCALES[state.controls.harmonicMode];
    var intervalSum = lodash.sum(scale.intervals);
    var intervalSteps = scale.intervals.reduce(function (steps, interval) {
        return steps.concat(lodash.last(steps) + interval);
    }, [0]);
    var newKeyboards = state.keyboards.map(function (keyboard) {
        var newActiveKeys = keyboard.keys.filter(function (key) {
            var noteValue = key.note.octave * 12 + key.note.pitchClass - state.controls.transposition % 12;
            var valueInCycle = noteValue % intervalSum;
            return lodash.includes(intervalSteps, valueInCycle);
        });

        var gridSize = GRID[keyboard.orientation];

        var keyWidth = gridSize / (newActiveKeys.length + scale.chromaticSizeAdjust);
        //console.log("keywidth", keyWidth)
        var activeKeysWithSizes = newActiveKeys.map(function (key, idx) {
            return {
                key: key,
                startPos: (idx + scale.chromaticJump) * keyWidth,
                width: keyWidth
            };
        });
        return Object.assign({}, keyboard, {
            activeKeys: activeKeysWithSizes
        });
    });
    return Object.assign({}, state, {
        keyboards: newKeyboards
    });
}

function getUpdatedVoices(state, time, scheduling) {
    //console.log("No tick", state.isCursorsSuppressed, scheduling === 'none')
    var noTick = state.isCursorsSuppressed || scheduling === 'none';
    var changedKeys = getChangedVoiceKeys(state);

    var tickMapping = getTickMapping(changedKeys.map(function (k) {
        return k.voiceId;
    }), state.currentTick, state.controls.treatment, scheduling, state.controls.patternOn);

    return changedKeys.map(function (_ref, index) {
        var voiceId = _ref.voiceId
            , keyboard = _ref.keyboard
            , key = _ref.key;

        var previous = lodash.find(state.currentVoices, {
            voiceId: voiceId
        });

        //console.error("NO TICK", noTick, previous);
        var tickx = noTick ? -1 : tickMapping[voiceId];
        return {
            voiceId: voiceId,
            currentKey: key,
            playOnTick: tickx,
            triggeredOnTick: state.currentTick,
            articulation: state.controls.articulation,
            velocity: state.controls.velocity,
            keyboardOrientation: keyboard.orientation,
            keyboardSize: keyboard.keys.length
        };
    });
}

function getTickMapping(voiceIds, currentTick, treatment, scheduling, patternOn) {
    var mapping = {};

    if (treatment === 'line' && scheduling === 'treatment') {
        voiceIds.forEach(function (vid, index) {
            return mapping[vid] = currentTick + index;
        });
    } else {
        voiceIds.forEach(function (vid) {
            return mapping[vid] = currentTick;
        });
    }
    // } else if (treatment === 'improvise' && scheduling === 'treatment' && voiceIds.length > 0) {
    //     var voicePartitions = partitions(voiceIds);
    //     var chosenPartition = voicePartitions[Math.floor(Math.random() * voicePartitions.length)];
    //     var _tick = patternOn && Math.random() < 0.2 ? currentTick + 1 : currentTick;
    //     chosenPartition.forEach(function(voiceIdsForPart) {
    //         voiceIdsForPart.forEach(function(vid) {
    //             return mapping[vid] = _tick;
    //         });
    //         _tick = patternOn && Math.random() < 0.2 ? _tick + 2 : _tick + 1;
    //     });
    // } else {
    //     voiceIds.forEach(function(vid) {
    //         return mapping[vid] = currentTick;
    //     });
    // }
    return mapping;
}

function getChangedVoiceKeys(state) {
    var newVoiceKeys = getCurrentVoiceKeys(state);
    //console.log("n", newVoiceKeys);
    var changedVoiceKeys = newVoiceKeys.filter(function (_ref2) {
        var voiceId = _ref2.voiceId
            , key = _ref2.key;

        var previous = lodash.find(state.currentVoices, {
            voiceId: voiceId
        });
        //console.error("Previous", previous, state.currentVoices);
        return !previous || previous.currentKey !== key;
    });
    //console.log("changed", changedVoiceKeys);
    return changedVoiceKeys;
}

function getCurrentTime(state) {
    return state.currentTime;
};

var getVoicesToDisplay = function (voices, controls) {
    return voices.filter(function (v) {
        return controls.voicesOn[v.voiceId];
    });
}


var markers = [];

function renderUI(state) {
    var voicesToPlay = getVoicesToPlay(state);
    var currentTime = getCurrentTime(state);

    // protect from looping the same play
    var currentplay = "";
    voicesToPlay.voices.forEach(function (voice) {
        if (voice.currentKey) {
            currentplay += voice.currentKey.index;
        }
    }, this);

    // if same as last, don't play it
    if (currentplay === lastPlay) {
        return;
    }
    lastPlay = currentplay;

    voicesToPlay.currentTime += 0.1;
    //console.log(voicesToPlay.voices);
    //console.warn(state.currentTime);
    Tone.Draw.schedule(function () {

        //console.warn("DRAW", state.mousePosition);
        //do drawing or DOM manipulation here
        // var el = getStar();
        // el.style.left = state.mousePosition.horizontal + 'px';
        // el.style.top = state.mousePosition.vertical + 'px';
        // if (els.length > 30) {
        //     var old = els.shift();
        //     zone.removeChild(old);
        // }

        // var latlng = [].concat(sthlm);
        // //latlng[0] = latlng[0] + Math.random() / 10;
        // //latlng[1] = latlng[1] + Math.random() / 10;
        // //console.log("sthlm", sthlm, latlng);
        if (state.currentArrival) {
            var lat = state.currentArrival[3];
            var lng = state.currentArrival[4];

            //mymap.flyTo([lat, lng], 10, {duration:1.5});

            getMarker(markers, [lat, lng], { icon: icon }).addTo(mymap);
        }

        // render markers for travelpath (blue dots)
        if (showTravel.checked && state.mousePosition.horizontal) {
            var p = L.point(state.mousePosition.horizontal, state.mousePosition.vertical);
            var latlng = mymap.containerPointToLatLng(p);
            getMarker(markersTravel, latlng, { icon: iconMousePos }).addTo(mymap);
        }

        // if (markers.length > 70) {
        //     var m = markers.shift();
        //     oldMarkers.push(m);
        //     if (showTravel.checked) {
        //         var m2 = markers.shift();
        //         m2.remove();
        //         //console.log("markers clean up", markers.length);
        //     }
        // }
        // if(document.getElementById("showTarget").checked) {
        //     var targetDot = document.getElementById("targetdot");
        //     targetDot.style.left = target.horizontal + 'px';
        //     targetDot.style.top = target.vertical + 'px';
        // }

    }, voicesToPlay.currentTime);
    playSounds(voicesToPlay);
}

function getMarker(stack, latlng, obj) {
    var m;
    if (stack.length > 30) {
        m = stack.shift();
        var icon = m._icon.children[0];
        icon.style.animation = null;


        var nextM = stack[15];
        var nextIcon = nextM._icon.children[0];


        nextIcon.style.animation = "none"

        // restart css animation
        //icon.style.AnimationPlayState = 'running';
        //icon.style.webkitAnimationPlayState = 'running';

        //icon.style.animation = 'none';
        //icon.style.animation = null; 
        //icon.offsetHeight; /* trigger reflow */
        // setTimeout(function () {
        //     icon.style.animation = null; 
        // },10); 


        m.setLatLng(latlng);
    } else {
        m = L.marker(latlng, obj);
    }

    stack.push(m);
    // if (markers.length > 70) {
    //     stack.push(markers.shift());
    // }

    return m;
}
var markers = [];
var markersTravel = [];

var zone = document.getElementById("zone");
function getStar() {
    var d = document.createElement("div")
    d.className = "mousedot";
    zone.appendChild(d);
    els.push(d);
    return d;
}
var els = [];

function makeKeyboard(size, startOctave, startPitch, orientation, voiceAssignments) {
    var keys = [];
    var start = startOctave * 12 + startPitch;
    var end = start + size;
    for (var index = 0, note = start; note < end; index++ ,
        note++) {
        var octave = Math.floor(note / 12);
        var pitchClass = note - octave * 12;
        keys.push({
            note: {
                octave: octave,
                pitchClass: pitchClass
            },
            index: index
        });
    }
    return {
        keys: keys,
        activeKeys: [],
        orientation: orientation,
        voiceAssignments: voiceAssignments || []
    };
}
var lastPlay = null;
function playSounds(play) {
    //console.log("playsounds");

    if (play.voices.length > 0) {

        var now = Tone.now();
        if (play.currentTime <= now) {
            console.error("time is in Past", play.currentTime, "vs", now);
            //now.dispose();
            return;

        }
        play.voices.forEach(function (voice) {
            playVoice(voice, play.currentTime);
        }, this);
        //now.dispose();

    }
}

var isPlaying = function isPlaying(state) {
    return state.isPlaying;
};
var getCurrentTime = function getCurrentTime(state) {
    return state.currentTime;
};
var getCurrentTick = function getCurrentTick(state) {
    return state.currentTick;
};
var getCurrentVoices = function getCurrentVoices(state) {
    return state.currentVoices;
};
var getKeyboards = function getKeyboards(state) {
    return state.keyboards;
};
var getControls = function getControls(state) {
    return state.controls;
};
var getHarmonicMode = function getHarmonicMode(state) {
    return state.controls.harmonicMode;
};
var getTreatment = function getTreatment(state) {
    return state.controls.treatment;
};
var getMousePosition = function getMousePosition(state) {
    return state.mousePosition;
};
var getPatternStep = function getPatternStep(state) {
    return state.patternStepCounter;
};
var getOutputType = function getOutputType(state) {
    return state.controls.outputType;
};

function playVoice(voice, time) {

    if (voice.currentKey) {

        var note = voice.currentKey.note.octave * 12 + voice.currentKey.note.pitchClass;
        var velocity = voice.velocity / 128;
        //console.log("velocity", velocity);
        if (heldNotes.has(note)) {
            piano.keyUp(note, time);
            heldNotes.delete(note);
        }

        switch (voice.articulation) {
            case 'halfLegato':
                var t = new Tone.Time('16n');
                let duration = t.toSeconds();
                t.dipose();
                piano.keyDown(note, time, velocity);
                piano.keyUp(note, time + duration);
                break;
            case 'staccato':
                piano.keyDown(note, time, velocity);
                piano.keyUp(note, time + 0.002);
                break;
            case 'legato':
                piano.keyDown(note, time, velocity);
                heldNotes.add(note);
                break;
        }
    }
}



/**
 * 
 * 
 * 
 * DATA
 * 
 * Get's the presorted data
 * Adds to queue
 * Queue only allows pulling events that have happened
 * 
 * 
 * item:
 * 0: type (1 = metro, 2 = bus, 3 = other)
 * 1: name
 * 2: time
 * 3: lat
 * 4: lng
 */

function getFilename(date) {
    var now = date || new Date();
    console.log("now", now);
    var target = 5 * 600000000;
    var minute = roundUp(now, target).getMinutes();
    var x = "data/parsed/" + now.getHours() + "_" + minute + ".json";
    console.warn(x);
    return x;
}

var isFetching = false;
async function prepareMoreData() {
    if (!isFetching) {
        var bla = new Date(new Date().getTime() + -15*60000);
        console.log("bla", bla, new Date());
        var res = await fetchData(bla) // -5 minutes;
        enqueu(res.data);
        var res2 = await fetchData();
        enqueu(res2.data);
        var res3 = await fetchData(new Date(new Date().getTime() + 5*60000)) // +5 minutes;
        enqueu(res3.data);
    }
}

async function fetchData(date) {
    isFetching = true;
    const res = await fetch(getFilename(date)).then((response) => {
        return response.json()
    });
    isFetching = false;
    return res;
}

function mockSthlmDelta() {
    //     function getNonZeroRandomNumber(){
    //     var random = Math.floor(Math.random()*199) - 99;
    //     if(random==0) return getNonZeroRandomNumber();
    //     return random;
    // }
    return (Math.random() * 0.06) - 0.03;
}

var _backingQueue = [];
var _filteredArrivals = _backingQueue;
function enqueu(items) {
    _backingQueue = _backingQueue.concat(items);
    filterArrivals();
}

function deque(peekOnly) {
    //console.log(_backingQueue); 
    var item = _backingQueue[0];
    console.log("Left in filtered", _filteredArrivals.length, _backingQueue.length);

    // load more data (controlled by backingqueue only)
    // todo: fix so this is done by filter also? Maybe by checking time.
    if (!item || _backingQueue.length < 300) {
        prepareMoreData();
    }

    item = _filteredArrivals[0];

    // short circuit if no data yet
    if (!item) {
        return null;
    }

    // only return items when they have happened
    if (!isTimeInThePast(item)) {
        // todo: show when next is?
        // todo: Funny help text things like "finding every bus. For optimal sound etc."
        return null;
    }

    // if (onlyPlayVisible) {
    //     for (var index = 0; index < _backingQueue.length; index++) {
    //         var element = _backingQueue[index];
    //         if (isArrivalOnScreen(element, mymap)) {
    //             if (peekOnly) {
    //                 return element
    //             } else {
    //                 //return item;
    //                 return _backingQueue.splice(index, 1);
    //             }
    //         }
    //     }

    //     return null;
    //     // if (isArrivalOnScreen(item, mymap)) {
    //     //     return returnFromQueue(_backingQueue, peekOnly);
    //     // } else {
    //     //     // not optimal
    //     //     _backingQueue.shift();
    //     //     return null;
    //     // }
    // }
    if(peekOnly){
        return _filteredArrivals[0];
    } else {
        _filteredArrivals.shift();
        var ind = _backingQueue.indexOf(item);
        if(ind < 0) console.warn("Could not find item in backing");
        _backingQueue.splice(ind,1);
        return item;
    }



    //console.log("Now Dequeuing", item[2], item);
    return returnFromQueue(_backingQueue, peekOnly);
}

function returnFromQueue(_backingQueue, peekOnly, element) {
    if (peekOnly) {
        return element || _backingQueue[0];
    } else {
        //return item;
        return _backingQueue.shift();
    }
}

function isArrivalOnScreen(item, mymap) {
    var target = L.latLng(item[3], item[4]);
    if (mymap.getBounds().contains(target)) {
        return true;
    } else {
        return false;
    }
}


function filterArrivals() {
    // reset
    _filteredArrivals = _backingQueue;

    // apply filters
    if (_state.controls.onlyPlayVisible) {
        console.log("Refilter");
        _filteredArrivals = _backingQueue.filter((item) => {
            return isArrivalOnScreen(item, mymap);
        });
    }
}

/**
 * 
 * @param {string} time 
 */
function isTimeInThePast(item) {
    var timeparts = item[2].split(":");

    var hour = timeparts[0];
    var minutes = timeparts[1];
    var now = new Date();

    var date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minutes, 0);
    item.date = date;

    if (date < now) {
        return true;
    }

    return false;
}

function roundUp(date, roundupto) {
    // var time = 1000 * 60 * 5;
    // var date = new Date()
    // var minutes = (5 * Math.ceil(date.getMinutes() / 5));
    // date.setMinutes(minutes);

    var b = date.getTime() + 15E4;
    var c = b % 3E5;
    var rounded = new Date(15E4 >= c ? b - c : b + 3E5 - c);
    return rounded;
    //var rounded = new Date(Math.round(date.getTime() / time) * time);
    // var dt = new Date();
    // var ticks = ((dt.getTime() * 10000) + 621355968000000000);

    // return new Date(((ticks + roundupto - 1) / roundupto) * roundupto)
}

// private static DateTime RoundUp(DateTime dt, TimeSpan d)
// {
//     return new DateTime(((dt.Ticks + d.Ticks - 1) / d.Ticks) * d.Ticks);
// }

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

var sthlm = [59.331152, 18.06735];
var sthlm2 = [59.310, 18.04];
var mymap = L.map('mapid').setView(sthlm, 13);
on(mymap, "move", throttle(filterArrivals,200));



// var iconclass = iconclasses[row.iconclass]?row.iconclass:'';
// var iconstyle = iconclass?iconclasses[iconclass]:'';
// var icontext = iconclass?'':row.iconclass;

var icon = L.divIcon({
    className: 'map-marker ' + "xx",
    iconSize: null,
    html: '<div class="icon" style=""></div>'
});

var iconMousePos = L.divIcon({
    className: 'map-marker ' + "xx",
    iconSize: null,
    html: '<div class="icon2" style=""></div>'
});

var marker = L.marker(sthlm, { icon: icon }).addTo(mymap);

var CartoDB_DarkMatter = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    subdomains: 'abcd',
    maxZoom: 19
});
CartoDB_DarkMatter.addTo(mymap);
}

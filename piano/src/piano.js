var Tone = require("Tone");
var TonePiano = require('tone-piano');
var lodash = require("lodash");
Tone.Transport.bpm.value = 120;
Tone.context.latencyHint = "playback";
var heldNotes = new Set();
var piano;

// var state = {
//     keyboards: [makeKeyboard(50, 3, 5, 'vertical',[1]), makeKeyboard(50, 3, 9, 'horizontal',[2,3,4])],
//     controls: {
//         transposition: 0,
//         voicesOn:{
//             "1": true,
//             "2": true,
//             "3": true,
//             "4":true
//         },
//         harmonicMode: 'diatonic',
//         treament: 'chord',
//         patternOn:false
//     },
//     currentTick: 0,
//     mousePosition: 7,
//     isCursorsSuppressed: false
// };

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
var SURFACE_AREA_SIZE = 600; // dont think we really newed this

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
    var newHoriz = void 0
        , newVert = void 0;
    if (pendingPos) {
        newHoriz = SURFACE_AREA_SIZE - SURFACE_AREA_SIZE * pendingPos.horizontal;
        newVert = SURFACE_AREA_SIZE * pendingPos.vertical;
    } else {
        newHoriz = Math.max(0, Math.min(SURFACE_AREA_SIZE - 1, state.mousePosition.horizontal + deltaY));
        newVert = Math.max(0, Math.min(SURFACE_AREA_SIZE - 1, state.mousePosition.vertical + deltaX));
    }
    var mousePositionChanged = newHoriz !== state.mousePosition.horizontal || newVert !== state.mousePosition.vertical;
    var mousePosition = mousePositionChanged ? {
        horizontal: newHoriz,
        vertical: newVert
    } : state.mousePosition;
    //console.log(mousePosition);
    var patternStepCounter =
        state.isPlaying &&
            state.controls.patternOn &&
            !mousePositionChanged &&
            Math.max.apply(Math, [...state.currentVoices.map(function (v) {
                return v.playOnTick;
            })]) - currentTick < 0 ? state.patternStepCounter + 1 : state.patternStepCounter;

    return updateVoices(Object.assign({}, state, {
        currentTime: currentTime,
        currentTick: currentTick,
        mousePosition: mousePosition,
        accumulatedDelta: {
            deltaX: 0,
            deltaY: 0
        },
        pendingMousePosition: undefined,
        patternStepCounter: patternStepCounter
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
    keyboards: [makeKeyboard(50, 3, 5, 'vertical'), makeKeyboard(50, 3, 9, 'horizontal')],
    isPlaying: false,
    mousePosition: {
        horizontal: SURFACE_AREA_SIZE / 2,
        vertical: SURFACE_AREA_SIZE / 2
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
        harmonicMode: 'diatonic',
        treatment: 'Chord',
        transposition: 0,
        intervalOfTransposition: 1,
        patternOn: false,
        patternId: '1',
        voicing: 'chordMelody',
        articulation: 'legato',
        velocity: 20,
        outputType: 'piano',
        outputControls: {
            piano: {
                loading: true
            }
        }
    }
}, 'diatonic', true, 0), 'chordMelody', true, 0);

//window.state = state;

let repeatToken;
let compressor =  new Tone.Gain(1.0).toMaster();
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

    }, '16n');
     

    Tone.Transport.start("+0.1");
    //this.masterGain = new Tone.Gain(1.0).toMaster();

    function turnOn(state, isCursorsSuppressed, currentTime) {
        var newState = Object.assign({}, state, {
            isCursorsSuppressed: isCursorsSuppressed
        });
        return retrigger(newState, currentTime);
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
        document.getElementById("zone").onmousemove = function (e) {
                var deltaX = e.movementX;
                var deltaY = -e.movementY;
                //_state = retrigger(_state, _state.currentTime);
                //_state.isPlaying = true;
                updateState(moveCursor, deltaX, deltaY);
                //_state.isPlaying = false;
        };
    }, 2000);
}

//var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
//StartAudioContext(Tone.context, document.documentElement);
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

//   var f = function () {

//     console.log(1);
//     requestAnimationFrame(f);
// };
//   requestAnimationFrame(f);

loadPiano(compressor).then(() => {
    console.log("piano loaded");
    anders();
});
console.log("after");


//  function start(element) {
//     masterGain = new Tone.Gain(1.0).toMaster();
//     compressor = new Tone.Compressor().connect(masterGain);
//     piano = new TonePiano.Piano([21, 94],1,true).connect(compressor);
//     playing = true;
//     piano.load('./static_assets/Salamander/').then(function() {
//         return begin(element);
//     });
// }

function loadPiano(dest) {
    console.log("Dest", dest);
    piano = new TonePiano.Piano([30, 108], 1, true).connect(dest);
    return piano.load('../piano/');
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
        var keyWidth = SURFACE_AREA_SIZE / (newActiveKeys.length + scale.chromaticSizeAdjust);
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

function renderUI(state) {
    //var keyboards = getKeyboards(state);
    //var _iteratorNormalCompletion = true;
    //var _didIteratorError = false;
    //var _iteratorError = undefined;

    // try {
    //     for (var _iterator = keyboards[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
    //         var k = _step.value;

    //         if (k.orientation === 'horizontal') {
    //             horizontalKeyb.update(k.keys);
    //         } else if (k.orientation === 'vertical') {
    //             verticalKeyb.update(k.keys);
    //         }
    //     }
    // } catch (err) {
    //     _didIteratorError = true;
    //     _iteratorError = err;
    // } finally {
    //     try {
    //         if (!_iteratorNormalCompletion && _iterator.return) {
    //             _iterator.return();
    //         }
    //     } finally {
    //         if (_didIteratorError) {
    //             throw _iteratorError;
    //         }
    //     }
    // }

    var voicesToPlay = getVoicesToPlay(state);
    //console.log(state, voicesToPlay);
    var currentTime = getCurrentTime(state);
    //console.log("play", voicesToPlay.currentTime, currentTime);
    // requestAnimationFrame(() => {
    //     var el = document.getElementById("note");
    //     el.innerText = JSON.stringify(state.currentVoices);
    // });

    // voices.update(getVoicesToDisplay(state).filter(function (v) {
    //     return v.currentKey;
    // }), {
    //         voicesToPlay: voicesToPlay,
    //         currentTime: currentTime
    //     });
    //pointerSurface.update(currentTime, isPlaying(state), getControls(state), voicesToPlay);
    //console.log(voicesToPlay);
    playSounds(voicesToPlay);
}

//50,3,9 horizontal
//50,3,5 vertical
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

    if (play.voices.length > 0 && play !== lastPlay) {
        //console.log("playsounds2");
        if(play.currentTime <= Tone.now()) {
            console.error("time is in Past");
            return;

        }
        play.voices.forEach(function (voice) {
            Tone.Draw.schedule(function(){
                var el = document.getElementById("zone");
                if(voice.currentKey){
                var note = voice.currentKey.note.octave * 12 + voice.currentKey.note.pitchClass;
                //el.innerText += ", " + note;
            }

            }, play.currentTime)
            playVoice(voice, play.currentTime);
        }, this);

        

        lastPlay = play;
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
        //console.log(heldNotes);
        if (heldNotes.has(note)) {
            piano.keyUp(note, time);
            heldNotes.delete(note);
        }

        switch (voice.articulation) {
            case 'halfLegato':
                var duration = new Tone.Time('16n').toSeconds();
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
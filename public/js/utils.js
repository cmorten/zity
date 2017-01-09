/**
 *
 * Reusable set of Tracks that represent an animation.
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 */

THREE.AnimationClip = function (name, duration, tracks) {

    this.name = name || THREE.Math.generateUUID();
    this.tracks = tracks;
    this.duration = (duration !== undefined) ? duration : -1;

    // this means it should figure out its duration by scanning the tracks
    if (this.duration < 0) {

        this.resetDuration();

    }

    // maybe only do these on demand, as doing them here could potentially slow down loading
    // but leaving these here during development as this ensures a lot of testing of these functions
    this.trim();
    this.optimize();

};

THREE.AnimationClip.prototype = {

    constructor: THREE.AnimationClip,

    resetDuration: function () {

        var tracks = this.tracks,
            duration = 0;

        for (var i = 0, n = tracks.length; i !== n; ++i) {

            var track = this.tracks[i];

            duration = Math.max(
                duration, track.times[track.times.length - 1]);

        }

        this.duration = duration;

    },

    trim: function () {

        for (var i = 0; i < this.tracks.length; i++) {

            this.tracks[i].trim(0, this.duration);

        }

        return this;

    },

    optimize: function () {

        for (var i = 0; i < this.tracks.length; i++) {

            this.tracks[i].optimize();

        }

        return this;

    }

};

// Static methods:

Object.assign(THREE.AnimationClip, {

    parse: function (json) {

        var tracks = [],
            jsonTracks = json.tracks,
            frameTime = 1.0 / (json.fps || 1.0);

        for (var i = 0, n = jsonTracks.length; i !== n; ++i) {

            tracks.push(THREE.KeyframeTrack.parse(jsonTracks[i]).scale(frameTime));

        }

        return new THREE.AnimationClip(json.name, json.duration, tracks);

    },


    toJSON: function (clip) {

        var tracks = [],
            clipTracks = clip.tracks;

        var json = {

            'name': clip.name,
            'duration': clip.duration,
            'tracks': tracks

        };

        for (var i = 0, n = clipTracks.length; i !== n; ++i) {

            tracks.push(THREE.KeyframeTrack.toJSON(clipTracks[i]));

        }

        return json;

    },


    CreateFromMorphTargetSequence: function (name, morphTargetSequence, fps) {

        var numMorphTargets = morphTargetSequence.length;
        var tracks = [];

        for (var i = 0; i < numMorphTargets; i++) {

            var times = [];
            var values = [];

            times.push(
                (i + numMorphTargets - 1) % numMorphTargets,
                i, (i + 1) % numMorphTargets);

            values.push(0, 1, 0);

            var order = THREE.AnimationUtils.getKeyframeOrder(times);
            times = THREE.AnimationUtils.sortedArray(times, 1, order);
            values = THREE.AnimationUtils.sortedArray(values, 1, order);

            // if there is a key at the first frame, duplicate it as the
            // last frame as well for perfect loop.
            if (times[0] === 0) {

                times.push(numMorphTargets);
                values.push(values[0]);

            }

            tracks.push(
                new THREE.NumberKeyframeTrack(
                    '.morphTargetInfluences[' + morphTargetSequence[i].name + ']',
                    times, values
                ).scale(1.0 / fps));
        }

        return new THREE.AnimationClip(name, -1, tracks);

    },

    findByName: function (clipArray, name) {

        for (var i = 0; i < clipArray.length; i++) {

            if (clipArray[i].name === name) {

                return clipArray[i];

            }
        }

        return null;

    },

    CreateClipsFromMorphTargetSequences: function (morphTargets, fps) {

        var animationToMorphTargets = {};

        // tested with https://regex101.com/ on trick sequences
        // such flamingo_flyA_003, flamingo_run1_003, crdeath0059
        var pattern = /^([\w-]*?)([\d]+)$/;

        // sort morph target names into animation groups based
        // patterns like Walk_001, Walk_002, Run_001, Run_002
        for (var i = 0, il = morphTargets.length; i < il; i++) {

            var morphTarget = morphTargets[i];
            var parts = morphTarget.name.match(pattern);

            if (parts && parts.length > 1) {

                var name = parts[1];

                var animationMorphTargets = animationToMorphTargets[name];
                if (!animationMorphTargets) {

                    animationToMorphTargets[name] = animationMorphTargets = [];

                }

                animationMorphTargets.push(morphTarget);

            }

        }

        var clips = [];

        for (var name in animationToMorphTargets) {

            clips.push(THREE.AnimationClip.CreateFromMorphTargetSequence(name, animationToMorphTargets[name], fps));

        }

        return clips;

    },

    // parse the animation.hierarchy format
    parseAnimation: function (animation, bones, nodeName) {

        if (!animation) {

            console.error("  no animation in JSONLoader data");
            return null;

        }

        var addNonemptyTrack = function (
            trackType, trackName, animationKeys, propertyName, destTracks) {

            // only return track if there are actually keys.
            if (animationKeys.length !== 0) {

                var times = [];
                var values = [];

                THREE.AnimationUtils.flattenJSON(
                    animationKeys, times, values, propertyName);

                // empty keys are filtered out, so check again
                if (times.length !== 0) {

                    destTracks.push(new trackType(trackName, times, values));

                }

            }

        };

        var tracks = [];

        var clipName = animation.name || 'default';
        // automatic length determination in AnimationClip.
        var duration = animation.length || -1;
        var fps = animation.fps || 30;

        var hierarchyTracks = animation.hierarchy || [];

        for (var h = 0; h < hierarchyTracks.length; h++) {

            var animationKeys = hierarchyTracks[h].keys;

            // skip empty tracks
            if (!animationKeys || animationKeys.length == 0) continue;

            // process morph targets in a way exactly compatible
            // with AnimationHandler.init( animation )
            if (animationKeys[0].morphTargets) {

                // figure out all morph targets used in this track
                var morphTargetNames = {};
                for (var k = 0; k < animationKeys.length; k++) {

                    if (animationKeys[k].morphTargets) {

                        for (var m = 0; m < animationKeys[k].morphTargets.length; m++) {

                            morphTargetNames[animationKeys[k].morphTargets[m]] = -1;
                        }

                    }

                }

                // create a track for each morph target with all zero
                // morphTargetInfluences except for the keys in which
                // the morphTarget is named.
                for (var morphTargetName in morphTargetNames) {

                    var times = [];
                    var values = [];

                    for (var m = 0; m !== animationKeys[k].morphTargets.length; ++m) {

                        var animationKey = animationKeys[k];

                        times.push(animationKey.time);
                        values.push((animationKey.morphTarget === morphTargetName) ? 1 : 0)

                    }

                    tracks.push(new THREE.NumberKeyframeTrack(
                        '.morphTargetInfluence[' + morphTargetName + ']', times, values));

                }

                duration = morphTargetNames.length * (fps || 1.0);

            } else {
                // ...assume skeletal animation

                var boneName = '.bones[' + bones[h].name + ']';

                addNonemptyTrack(
                    THREE.VectorKeyframeTrack, boneName + '.position',
                    animationKeys, 'pos', tracks);

                addNonemptyTrack(
                    THREE.QuaternionKeyframeTrack, boneName + '.quaternion',
                    animationKeys, 'rot', tracks);

                addNonemptyTrack(
                    THREE.VectorKeyframeTrack, boneName + '.scale',
                    animationKeys, 'scl', tracks);

            }

        }

        if (tracks.length === 0) {

            return null;

        }

        var clip = new THREE.AnimationClip(clipName, duration, tracks);

        return clip;

    }

});


/**
 *
 * Player for AnimationClips.
 *
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 * @author tschw
 */

THREE.AnimationMixer = function (root) {

    this._root = root;
    this._initMemoryManager();
    this._accuIndex = 0;

    this.time = 0;

    this.timeScale = 1.0;

};

THREE.AnimationMixer.prototype = {

    constructor: THREE.AnimationMixer,

    // return an action for a clip optionally using a custom root target
    // object (this method allocates a lot of dynamic memory in case a
    // previously unknown clip/root combination is specified)
    clipAction: function (clip, optionalRoot) {

        var root = optionalRoot || this._root,
            rootUuid = root.uuid,
            clipName = (typeof clip === 'string') ? clip : clip.name,
            clipObject = (clip !== clipName) ? clip : null,

            actionsForClip = this._actionsByClip[clipName],
            prototypeAction;

        if (actionsForClip !== undefined) {

            var existingAction =
                actionsForClip.actionByRoot[rootUuid];

            if (existingAction !== undefined) {

                return existingAction;

            }

            // we know the clip, so we don't have to parse all
            // the bindings again but can just copy
            prototypeAction = actionsForClip.knownActions[0];

            // also, take the clip from the prototype action
            clipObject = prototypeAction._clip;

            if (clip !== clipName && clip !== clipObject) {

                throw new Error(
                    "Different clips with the same name detected!");

            }

        }

        // clip must be known when specified via string
        if (clipObject === null) return null;

        // allocate all resources required to run it
        var newAction = new THREE.
        AnimationMixer._Action(this, clipObject, optionalRoot);

        this._bindAction(newAction, prototypeAction);

        // and make the action known to the memory manager
        this._addInactiveAction(newAction, clipName, rootUuid);

        return newAction;

    },

    // get an existing action
    existingAction: function (clip, optionalRoot) {

        var root = optionalRoot || this._root,
            rootUuid = root.uuid,
            clipName = (typeof clip === 'string') ? clip : clip.name,
            actionsForClip = this._actionsByClip[clipName];

        if (actionsForClip !== undefined) {

            return actionsForClip.actionByRoot[rootUuid] || null;

        }

        return null;

    },

    // deactivates all previously scheduled actions
    stopAllAction: function () {

        var actions = this._actions,
            nActions = this._nActiveActions,
            bindings = this._bindings,
            nBindings = this._nActiveBindings;

        this._nActiveActions = 0;
        this._nActiveBindings = 0;

        for (var i = 0; i !== nActions; ++i) {

            actions[i].reset();

        }

        for (var i = 0; i !== nBindings; ++i) {

            bindings[i].useCount = 0;

        }

        return this;

    },

    // advance the time and update apply the animation
    update: function (deltaTime) {

        deltaTime *= this.timeScale;

        var actions = this._actions,
            nActions = this._nActiveActions,

            time = this.time += deltaTime,
            timeDirection = Math.sign(deltaTime),

            accuIndex = this._accuIndex ^= 1;

        // run active actions

        for (var i = 0; i !== nActions; ++i) {

            var action = actions[i];

            if (action.enabled) {

                action._update(time, deltaTime, timeDirection, accuIndex);

            }

        }

        // update scene graph

        var bindings = this._bindings,
            nBindings = this._nActiveBindings;

        for (var i = 0; i !== nBindings; ++i) {

            bindings[i].apply(accuIndex);

        }

        return this;

    },

    // return this mixer's root target object
    getRoot: function () {

        return this._root;

    },

    // free all resources specific to a particular clip
    uncacheClip: function (clip) {

        var actions = this._actions,
            clipName = clip.name,
            actionsByClip = this._actionsByClip,
            actionsForClip = actionsByClip[clipName];

        if (actionsForClip !== undefined) {

            // note: just calling _removeInactiveAction would mess up the
            // iteration state and also require updating the state we can
            // just throw away

            var actionsToRemove = actionsForClip.knownActions;

            for (var i = 0, n = actionsToRemove.length; i !== n; ++i) {

                var action = actionsToRemove[i];

                this._deactivateAction(action);

                var cacheIndex = action._cacheIndex,
                    lastInactiveAction = actions[actions.length - 1];

                action._cacheIndex = null;
                action._byClipCacheIndex = null;

                lastInactiveAction._cacheIndex = cacheIndex;
                actions[cacheIndex] = lastInactiveAction;
                actions.pop();

                this._removeInactiveBindingsForAction(action);

            }

            delete actionsByClip[clipName];

        }

    },

    // free all resources specific to a particular root target object
    uncacheRoot: function (root) {

        var rootUuid = root.uuid,
            actionsByClip = this._actionsByClip;

        for (var clipName in actionsByClip) {

            var actionByRoot = actionsByClip[clipName].actionByRoot,
                action = actionByRoot[rootUuid];

            if (action !== undefined) {

                this._deactivateAction(action);
                this._removeInactiveAction(action);

            }

        }

        var bindingsByRoot = this._bindingsByRootAndName,
            bindingByName = bindingsByRoot[rootUuid];

        if (bindingByName !== undefined) {

            for (var trackName in bindingByName) {

                var binding = bindingByName[trackName];
                binding.restoreOriginalState();
                this._removeInactiveBinding(binding);

            }

        }

    },

    // remove a targeted clip from the cache
    uncacheAction: function (clip, optionalRoot) {

        var action = this.existingAction(clip, optionalRoot);

        if (action !== null) {

            this._deactivateAction(action);
            this._removeInactiveAction(action);

        }

    }

};

THREE.EventDispatcher.prototype.apply(THREE.AnimationMixer.prototype);

THREE.AnimationMixer._Action =
    function (mixer, clip, localRoot) {

        this._mixer = mixer;
        this._clip = clip;
        this._localRoot = localRoot || null;

        var tracks = clip.tracks,
            nTracks = tracks.length,
            interpolants = new Array(nTracks);

        var interpolantSettings = {
            endingStart: THREE.ZeroCurvatureEnding,
            endingEnd: THREE.ZeroCurvatureEnding
        };

        for (var i = 0; i !== nTracks; ++i) {

            var interpolant = tracks[i].createInterpolant(null);
            interpolants[i] = interpolant;
            interpolant.settings = interpolantSettings

        }

        this._interpolantSettings = interpolantSettings;

        this._interpolants = interpolants; // bound by the mixer

        // inside: PropertyMixer (managed by the mixer)
        this._propertyBindings = new Array(nTracks);

        this._cacheIndex = null; // for the memory manager
        this._byClipCacheIndex = null; // for the memory manager

        this._timeScaleInterpolant = null;
        this._weightInterpolant = null;

        this.loop = THREE.LoopRepeat;
        this._loopCount = -1;

        // global mixer time when the action is to be started
        // it's set back to 'null' upon start of the action
        this._startTime = null;

        // scaled local time of the action
        // gets clamped or wrapped to 0..clip.duration according to loop
        this.time = 0;

        this.timeScale = 1;
        this._effectiveTimeScale = 1;

        this.weight = 1;
        this._effectiveWeight = 1;

        this.repetitions = Infinity; // no. of repetitions when looping

        this.paused = false; // false -> zero effective time scale
        this.enabled = true; // true -> zero effective weight

        this.clampWhenFinished = false; // keep feeding the last frame?

        this.zeroSlopeAtStart = true; // for smooth interpolation w/o separate
        this.zeroSlopeAtEnd = true; // clips for start, loop and end

    };

THREE.AnimationMixer._Action.prototype = {

    constructor: THREE.AnimationMixer._Action,

    // State & Scheduling

    play: function () {

        this._mixer._activateAction(this);

        return this;

    },

    stop: function () {

        this._mixer._deactivateAction(this);

        return this.reset();

    },

    reset: function () {

        this.paused = false;
        this.enabled = true;

        this.time = 0; // restart clip
        this._loopCount = -1; // forget previous loops
        this._startTime = null; // forget scheduling

        return this.stopFading().stopWarping();

    },

    isRunning: function () {

        var start = this._startTime;

        return this.enabled && !this.paused && this.timeScale !== 0 &&
            this._startTime === null && this._mixer._isActiveAction(this)

    },

    // return true when play has been called
    isScheduled: function () {

        return this._mixer._isActiveAction(this);

    },

    startAt: function (time) {

        this._startTime = time;

        return this;

    },

    setLoop: function (mode, repetitions) {

        this.loop = mode;
        this.repetitions = repetitions;

        return this;

    },

    // Weight

    // set the weight stopping any scheduled fading
    // although .enabled = false yields an effective weight of zero, this
    // method does *not* change .enabled, because it would be confusing
    setEffectiveWeight: function (weight) {

        this.weight = weight;

        // note: same logic as when updated at runtime
        this._effectiveWeight = this.enabled ? weight : 0;

        return this.stopFading();

    },

    // return the weight considering fading and .enabled
    getEffectiveWeight: function () {

        return this._effectiveWeight;

    },

    fadeIn: function (duration) {

        return this._scheduleFading(duration, 0, 1);

    },

    fadeOut: function (duration) {

        return this._scheduleFading(duration, 1, 0);

    },

    crossFadeFrom: function (fadeOutAction, duration, warp) {

        var mixer = this._mixer;

        fadeOutAction.fadeOut(duration);
        this.fadeIn(duration);

        if (warp) {

            var fadeInDuration = this._clip.duration,
                fadeOutDuration = fadeOutAction._clip.duration,

                startEndRatio = fadeOutDuration / fadeInDuration,
                endStartRatio = fadeInDuration / fadeOutDuration;

            fadeOutAction.warp(1.0, startEndRatio, duration);
            this.warp(endStartRatio, 1.0, duration);

        }

        return this;

    },

    crossFadeTo: function (fadeInAction, duration, warp) {

        return fadeInAction.crossFadeFrom(this, duration, warp);

    },

    stopFading: function () {

        var weightInterpolant = this._weightInterpolant;

        if (weightInterpolant !== null) {

            this._weightInterpolant = null;
            this._mixer._takeBackControlInterpolant(weightInterpolant);

        }

        return this;

    },

    // Time Scale Control

    // set the weight stopping any scheduled warping
    // although .paused = true yields an effective time scale of zero, this
    // method does *not* change .paused, because it would be confusing
    setEffectiveTimeScale: function (timeScale) {

        this.timeScale = timeScale;
        this._effectiveTimeScale = this.paused ? 0 : timeScale;

        return this.stopWarping();

    },

    // return the time scale considering warping and .paused
    getEffectiveTimeScale: function () {

        return this._effectiveTimeScale;

    },

    setDuration: function (duration) {

        this.timeScale = this._clip.duration / duration;

        return this.stopWarping();

    },

    syncWith: function (action) {

        this.time = action.time;
        this.timeScale = action.timeScale;

        return this.stopWarping();

    },

    halt: function (duration) {

        return this.warp(this._currentTimeScale, 0, duration);

    },

    warp: function (startTimeScale, endTimeScale, duration) {

        var mixer = this._mixer,
            now = mixer.time,
            interpolant = this._timeScaleInterpolant,

            timeScale = this.timeScale;

        if (interpolant === null) {

            interpolant = mixer._lendControlInterpolant(),
                this._timeScaleInterpolant = interpolant;

        }

        var times = interpolant.parameterPositions,
            values = interpolant.sampleValues;

        times[0] = now;
        times[1] = now + duration;

        values[0] = startTimeScale / timeScale;
        values[1] = endTimeScale / timeScale;

        return this;

    },

    stopWarping: function () {

        var timeScaleInterpolant = this._timeScaleInterpolant;

        if (timeScaleInterpolant !== null) {

            this._timeScaleInterpolant = null;
            this._mixer._takeBackControlInterpolant(timeScaleInterpolant);

        }

        return this;

    },

    // Object Accessors

    getMixer: function () {

        return this._mixer;

    },

    getClip: function () {

        return this._clip;

    },

    getRoot: function () {

        return this._localRoot || this._mixer._root;

    },

    // Interna

    _update: function (time, deltaTime, timeDirection, accuIndex) {
        // called by the mixer

        var startTime = this._startTime;

        if (startTime !== null) {

            // check for scheduled start of action

            var timeRunning = (time - startTime) * timeDirection;
            if (timeRunning < 0 || timeDirection === 0) {

                return; // yet to come / don't decide when delta = 0

            }

            // start

            this._startTime = null; // unschedule
            deltaTime = timeDirection * timeRunning;

        }

        // apply time scale and advance time

        deltaTime *= this._updateTimeScale(time);
        var clipTime = this._updateTime(deltaTime);

        // note: _updateTime may disable the action resulting in
        // an effective weight of 0

        var weight = this._updateWeight(time);

        if (weight > 0) {

            var interpolants = this._interpolants;
            var propertyMixers = this._propertyBindings;

            for (var j = 0, m = interpolants.length; j !== m; ++j) {

                interpolants[j].evaluate(clipTime);
                propertyMixers[j].accumulate(accuIndex, weight);

            }

        }

    },

    _updateWeight: function (time) {

        var weight = 0;

        if (this.enabled) {

            weight = this.weight;
            var interpolant = this._weightInterpolant;

            if (interpolant !== null) {

                var interpolantValue = interpolant.evaluate(time)[0];

                weight *= interpolantValue;

                if (time > interpolant.parameterPositions[1]) {

                    this.stopFading();

                    if (interpolantValue === 0) {

                        // faded out, disable
                        this.enabled = false;

                    }

                }

            }

        }

        this._effectiveWeight = weight;
        return weight;

    },

    _updateTimeScale: function (time) {

        var timeScale = 0;

        if (!this.paused) {

            timeScale = this.timeScale;

            var interpolant = this._timeScaleInterpolant;

            if (interpolant !== null) {

                var interpolantValue = interpolant.evaluate(time)[0];

                timeScale *= interpolantValue;

                if (time > interpolant.parameterPositions[1]) {

                    this.stopWarping();

                    if (timeScale === 0) {

                        // motion has halted, pause
                        this.pause = true;

                    } else {

                        // warp done - apply final time scale
                        this.timeScale = timeScale;

                    }

                }

            }

        }

        this._effectiveTimeScale = timeScale;
        return timeScale;

    },

    _updateTime: function (deltaTime) {

        var time = this.time + deltaTime;

        if (deltaTime === 0) return time;

        var duration = this._clip.duration,

            loop = this.loop,
            loopCount = this._loopCount,

            pingPong = false;

        switch (loop) {

        case THREE.LoopOnce:

            if (loopCount === -1) {

                // just started

                this.loopCount = 0;
                this._setEndings(true, true, false);

            }

            if (time >= duration) {

                time = duration;

            } else if (time < 0) {

                time = 0;

            } else break;

            // reached the end

            if (this.clampWhenFinished) this.pause = true;
            else this.enabled = false;

            this._mixer.dispatchEvent({
                type: 'finished',
                action: this,
                direction: deltaTime < 0 ? -1 : 1
            });

            break;

        case THREE.LoopPingPong:

            pingPong = true;

        case THREE.LoopRepeat:

            if (loopCount === -1) {

                // just started

                if (deltaTime > 0) {

                    loopCount = 0;

                    this._setEndings(
                        true, this.repetitions === 0, pingPong);

                } else {

                    // when looping in reverse direction, the initial
                    // transition through zero counts as a repetition,
                    // so leave loopCount at -1

                    this._setEndings(
                        this.repetitions === 0, true, pingPong);

                }

            }

            if (time >= duration || time < 0) {

                // wrap around

                var loopDelta = Math.floor(time / duration); // signed
                time -= duration * loopDelta;

                loopCount += Math.abs(loopDelta);

                var pending = this.repetitions - loopCount;

                if (pending < 0) {

                    // stop (switch state, clamp time, fire event)

                    if (this.clampWhenFinished) this.paused = true;
                    else this.enabled = false;

                    time = deltaTime > 0 ? duration : 0;

                    this._mixer.dispatchEvent({
                        type: 'finished',
                        action: this,
                        direction: deltaTime > 0 ? 1 : -1
                    });

                    break;

                } else if (pending === 0) {

                    // transition to last round

                    var atStart = deltaTime < 0;
                    this._setEndings(atStart, !atStart, pingPong);

                } else {

                    this._setEndings(false, false, pingPong);

                }

                this._loopCount = loopCount;

                this._mixer.dispatchEvent({
                    type: 'loop',
                    action: this,
                    loopDelta: loopDelta
                });

            }

            if (loop === THREE.LoopPingPong && (loopCount & 1) === 1) {

                // invert time for the "pong round"

                this.time = time;

                return duration - time;

            }

            break;

        }

        this.time = time;

        return time;

    },

    _setEndings: function (atStart, atEnd, pingPong) {

        var settings = this._interpolantSettings;

        if (pingPong) {

            settings.endingStart = THREE.ZeroSlopeEnding;
            settings.endingEnd = THREE.ZeroSlopeEnding;

        } else {

            // assuming for LoopOnce atStart == atEnd == true

            if (atStart) {

                settings.endingStart = this.zeroSlopeAtStart ?
                    THREE.ZeroSlopeEnding : THREE.ZeroCurvatureEnding;

            } else {

                settings.endingStart = THREE.WrapAroundEnding;

            }

            if (atEnd) {

                settings.endingEnd = this.zeroSlopeAtEnd ?
                    THREE.ZeroSlopeEnding : THREE.ZeroCurvatureEnding;

            } else {

                settings.endingEnd = THREE.WrapAroundEnding;

            }

        }

    },

    _scheduleFading: function (duration, weightNow, weightThen) {

        var mixer = this._mixer,
            now = mixer.time,
            interpolant = this._weightInterpolant;

        if (interpolant === null) {

            interpolant = mixer._lendControlInterpolant(),
                this._weightInterpolant = interpolant;

        }

        var times = interpolant.parameterPositions,
            values = interpolant.sampleValues;

        times[0] = now;
        values[0] = weightNow;
        times[1] = now + duration;
        values[1] = weightThen;

        return this;

    }

};

// Implementation details:

Object.assign(THREE.AnimationMixer.prototype, {

    _bindAction: function (action, prototypeAction) {

        var root = action._localRoot || this._root,
            tracks = action._clip.tracks,
            nTracks = tracks.length,
            bindings = action._propertyBindings,
            interpolants = action._interpolants,
            rootUuid = root.uuid,
            bindingsByRoot = this._bindingsByRootAndName,
            bindingsByName = bindingsByRoot[rootUuid];

        if (bindingsByName === undefined) {

            bindingsByName = {};
            bindingsByRoot[rootUuid] = bindingsByName;

        }

        for (var i = 0; i !== nTracks; ++i) {

            var track = tracks[i],
                trackName = track.name,
                binding = bindingsByName[trackName];

            if (binding !== undefined) {

                bindings[i] = binding;

            } else {

                binding = bindings[i];

                if (binding !== undefined) {

                    // existing binding, make sure the cache knows

                    if (binding._cacheIndex === null) {

                        ++binding.referenceCount;
                        this._addInactiveBinding(binding, rootUuid, trackName);

                    }

                    continue;

                }

                var path = prototypeAction && prototypeAction.
                _propertyBindings[i].binding.parsedPath;

                binding = new THREE.PropertyMixer(
                    THREE.PropertyBinding.create(root, trackName, path),
                    track.ValueTypeName, track.getValueSize());

                ++binding.referenceCount;
                this._addInactiveBinding(binding, rootUuid, trackName);

                bindings[i] = binding;

            }

            interpolants[i].resultBuffer = binding.buffer;

        }

    },

    _activateAction: function (action) {

        if (!this._isActiveAction(action)) {

            if (action._cacheIndex === null) {

                // this action has been forgotten by the cache, but the user
                // appears to be still using it -> rebind

                var rootUuid = (action._localRoot || this._root).uuid,
                    clipName = action._clip.name,
                    actionsForClip = this._actionsByClip[clipName];

                this._bindAction(action,
                    actionsForClip && actionsForClip.knownActions[0]);

                this._addInactiveAction(action, clipName, rootUuid);

            }

            var bindings = action._propertyBindings;

            // increment reference counts / sort out state
            for (var i = 0, n = bindings.length; i !== n; ++i) {

                var binding = bindings[i];

                if (binding.useCount++ === 0) {

                    this._lendBinding(binding);
                    binding.saveOriginalState();

                }

            }

            this._lendAction(action);

        }

    },

    _deactivateAction: function (action) {

        if (this._isActiveAction(action)) {

            var bindings = action._propertyBindings;

            // decrement reference counts / sort out state
            for (var i = 0, n = bindings.length; i !== n; ++i) {

                var binding = bindings[i];

                if (--binding.useCount === 0) {

                    binding.restoreOriginalState();
                    this._takeBackBinding(binding);

                }

            }

            this._takeBackAction(action);

        }

    },

    // Memory manager

    _initMemoryManager: function () {

        this._actions = []; // 'nActiveActions' followed by inactive ones
        this._nActiveActions = 0;

        this._actionsByClip = {};
        // inside:
        // {
        // 		knownActions: Array< _Action >	- used as prototypes
        // 		actionByRoot: _Action			- lookup
        // }


        this._bindings = []; // 'nActiveBindings' followed by inactive ones
        this._nActiveBindings = 0;

        this._bindingsByRootAndName = {}; // inside: Map< name, PropertyMixer >


        this._controlInterpolants = []; // same game as above
        this._nActiveControlInterpolants = 0;

        var scope = this;

        this.stats = {

            actions: {
                get total() {
                    return scope._actions.length;
                },
                get inUse() {
                    return scope._nActiveActions;
                }
            },
            bindings: {
                get total() {
                    return scope._bindings.length;
                },
                get inUse() {
                    return scope._nActiveBindings;
                }
            },
            controlInterpolants: {
                get total() {
                    return scope._controlInterpolants.length;
                },
                get inUse() {
                    return scope._nActiveControlInterpolants;
                }
            }

        };

    },

    // Memory management for _Action objects

    _isActiveAction: function (action) {

        var index = action._cacheIndex;
        return index !== null && index < this._nActiveActions;

    },

    _addInactiveAction: function (action, clipName, rootUuid) {

        var actions = this._actions,
            actionsByClip = this._actionsByClip,
            actionsForClip = actionsByClip[clipName];

        if (actionsForClip === undefined) {

            actionsForClip = {

                knownActions: [action],
                actionByRoot: {}

            };

            action._byClipCacheIndex = 0;

            actionsByClip[clipName] = actionsForClip;

        } else {

            var knownActions = actionsForClip.knownActions;

            action._byClipCacheIndex = knownActions.length;
            knownActions.push(action);

        }

        action._cacheIndex = actions.length;
        actions.push(action);

        actionsForClip.actionByRoot[rootUuid] = action;

    },

    _removeInactiveAction: function (action) {

        var actions = this._actions,
            lastInactiveAction = actions[actions.length - 1],
            cacheIndex = action._cacheIndex;

        lastInactiveAction._cacheIndex = cacheIndex;
        actions[cacheIndex] = lastInactiveAction;
        actions.pop();

        action._cacheIndex = null;


        var clipName = action._clip.name,
            actionsByClip = this._actionsByClip,
            actionsForClip = actionsByClip[clipName],
            knownActionsForClip = actionsForClip.knownActions,

            lastKnownAction =
            knownActionsForClip[knownActionsForClip.length - 1],

            byClipCacheIndex = action._byClipCacheIndex;

        lastKnownAction._byClipCacheIndex = byClipCacheIndex;
        knownActionsForClip[byClipCacheIndex] = lastKnownAction;
        knownActionsForClip.pop();

        action._byClipCacheIndex = null;


        var actionByRoot = actionsForClip.actionByRoot,
            rootUuid = (actions._localRoot || this._root).uuid;

        delete actionByRoot[rootUuid];

        if (knownActionsForClip.length === 0) {

            delete actionsByClip[clipName];

        }

        this._removeInactiveBindingsForAction(action);

    },

    _removeInactiveBindingsForAction: function (action) {

        var bindings = action._propertyBindings;
        for (var i = 0, n = bindings.length; i !== n; ++i) {

            var binding = bindings[i];

            if (--binding.referenceCount === 0) {

                this._removeInactiveBinding(binding);

            }

        }

    },

    _lendAction: function (action) {

        // [ active actions |  inactive actions  ]
        // [  active actions >| inactive actions ]
        //                 s        a
        //                  <-swap->
        //                 a        s

        var actions = this._actions,
            prevIndex = action._cacheIndex,

            lastActiveIndex = this._nActiveActions++,

            firstInactiveAction = actions[lastActiveIndex];

        action._cacheIndex = lastActiveIndex;
        actions[lastActiveIndex] = action;

        firstInactiveAction._cacheIndex = prevIndex;
        actions[prevIndex] = firstInactiveAction;

    },

    _takeBackAction: function (action) {

        // [  active actions  | inactive actions ]
        // [ active actions |< inactive actions  ]
        //        a        s
        //         <-swap->
        //        s        a

        var actions = this._actions,
            prevIndex = action._cacheIndex,

            firstInactiveIndex = --this._nActiveActions,

            lastActiveAction = actions[firstInactiveIndex];

        action._cacheIndex = firstInactiveIndex;
        actions[firstInactiveIndex] = action;

        lastActiveAction._cacheIndex = prevIndex;
        actions[prevIndex] = lastActiveAction;

    },

    // Memory management for PropertyMixer objects

    _addInactiveBinding: function (binding, rootUuid, trackName) {

        var bindingsByRoot = this._bindingsByRootAndName,
            bindingByName = bindingsByRoot[rootUuid],

            bindings = this._bindings;

        if (bindingByName === undefined) {

            bindingByName = {};
            bindingsByRoot[rootUuid] = bindingByName;

        }

        bindingByName[trackName] = binding;

        binding._cacheIndex = bindings.length;
        bindings.push(binding);

    },

    _removeInactiveBinding: function (binding) {

        var bindings = this._bindings,
            propBinding = binding.binding,
            rootUuid = propBinding.rootNode.uuid,
            trackName = propBinding.path,
            bindingsByRoot = this._bindingsByRootAndName,
            bindingByName = bindingsByRoot[rootUuid],

            lastInactiveBinding = bindings[bindings.length - 1],
            cacheIndex = binding._cacheIndex;

        lastInactiveBinding._cacheIndex = cacheIndex;
        bindings[cacheIndex] = lastInactiveBinding;
        bindings.pop();

        delete bindingByName[trackName];

        remove_empty_map: {

            for (var _ in bindingByName) break remove_empty_map;

            delete bindingsByRoot[rootUuid];

        }

    },

    _lendBinding: function (binding) {

        var bindings = this._bindings,
            prevIndex = binding._cacheIndex,

            lastActiveIndex = this._nActiveBindings++,

            firstInactiveBinding = bindings[lastActiveIndex];

        binding._cacheIndex = lastActiveIndex;
        bindings[lastActiveIndex] = binding;

        firstInactiveBinding._cacheIndex = prevIndex;
        bindings[prevIndex] = firstInactiveBinding;

    },

    _takeBackBinding: function (binding) {

        var bindings = this._bindings,
            prevIndex = binding._cacheIndex,

            firstInactiveIndex = --this._nActiveBindings,

            lastActiveBinding = bindings[firstInactiveIndex];

        binding._cacheIndex = firstInactiveIndex;
        bindings[firstInactiveIndex] = binding;

        lastActiveBinding._cacheIndex = prevIndex;
        bindings[prevIndex] = lastActiveBinding;

    },


    // Memory management of Interpolants for weight and time scale

    _lendControlInterpolant: function () {

        var interpolants = this._controlInterpolants,
            lastActiveIndex = this._nActiveControlInterpolants++,
            interpolant = interpolants[lastActiveIndex];

        if (interpolant === undefined) {

            interpolant = new THREE.LinearInterpolant(
                new Float32Array(2), new Float32Array(2),
                1, this._controlInterpolantsResultBuffer);

            interpolant.__cacheIndex = lastActiveIndex;
            interpolants[lastActiveIndex] = interpolant;

        }

        return interpolant;

    },

    _takeBackControlInterpolant: function (interpolant) {

        var interpolants = this._controlInterpolants,
            prevIndex = interpolant.__cacheIndex,

            firstInactiveIndex = --this._nActiveControlInterpolants,

            lastActiveInterpolant = interpolants[firstInactiveIndex];

        interpolant.__cacheIndex = firstInactiveIndex;
        interpolants[firstInactiveIndex] = interpolant;

        lastActiveInterpolant.__cacheIndex = prevIndex;
        interpolants[prevIndex] = lastActiveInterpolant;

    },

    _controlInterpolantsResultBuffer: new Float32Array(1)

});


/**
 *
 * A group of objects that receives a shared animation state.
 *
 * Usage:
 *
 * 	-	Add objects you would otherwise pass as 'root' to the
 * 		constructor or the .clipAction method of AnimationMixer.
 *
 * 	-	Instead pass this object as 'root'.
 *
 * 	-	You can also add and remove objects later when the mixer
 * 		is running.
 *
 * Note:
 *
 *  	Objects of this class appear as one object to the mixer,
 *  	so cache control of the individual objects must be done
 *  	on the group.
 *
 * Limitation:
 *
 * 	- 	The animated properties must be compatible among the
 * 		all objects in the group.
 *
 *  -	A single property can either be controlled through a
 *  	target group or directly, but not both.
 *
 * @author tschw
 */

THREE.AnimationObjectGroup = function (var_args) {

    this.uuid = THREE.Math.generateUUID();

    // cached objects followed by the active ones
    this._objects = Array.prototype.slice.call(arguments);

    this.nCachedObjects_ = 0; // threshold
    // note: read by PropertyBinding.Composite

    var indices = {};
    this._indicesByUUID = indices; // for bookkeeping

    for (var i = 0, n = arguments.length; i !== n; ++i) {

        indices[arguments[i].uuid] = i;

    }

    this._paths = []; // inside: string
    this._parsedPaths = []; // inside: { we don't care, here }
    this._bindings = []; // inside: Array< PropertyBinding >
    this._bindingsIndicesByPath = {}; // inside: indices in these arrays

    var scope = this;

    this.stats = {

        objects: {
            get total() {
                return scope._objects.length;
            },
            get inUse() {
                return this.total - scope.nCachedObjects_;
            }
        },

        get bindingsPerObject() {
            return scope._bindings.length;
        }

    };

};

THREE.AnimationObjectGroup.prototype = {

    constructor: THREE.AnimationObjectGroup,

    add: function (var_args) {

        var objects = this._objects,
            nObjects = objects.length,
            nCachedObjects = this.nCachedObjects_,
            indicesByUUID = this._indicesByUUID,
            paths = this._paths,
            parsedPaths = this._parsedPaths,
            bindings = this._bindings,
            nBindings = bindings.length;

        for (var i = 0, n = arguments.length; i !== n; ++i) {

            var object = arguments[i],
                uuid = object.uuid,
                index = indicesByUUID[uuid];

            if (index === undefined) {

                // unknown object -> add it to the ACTIVE region

                index = nObjects++;
                indicesByUUID[uuid] = index;
                objects.push(object);

                // accounting is done, now do the same for all bindings

                for (var j = 0, m = nBindings; j !== m; ++j) {

                    bindings[j].push(
                        new THREE.PropertyBinding(
                            object, paths[j], parsedPaths[j]));

                }

            } else if (index < nCachedObjects) {

                var knownObject = objects[index];

                // move existing object to the ACTIVE region

                var firstActiveIndex = --nCachedObjects,
                    lastCachedObject = objects[firstActiveIndex];

                indicesByUUID[lastCachedObject.uuid] = index;
                objects[index] = lastCachedObject;

                indicesByUUID[uuid] = firstActiveIndex;
                objects[firstActiveIndex] = object;

                // accounting is done, now do the same for all bindings

                for (var j = 0, m = nBindings; j !== m; ++j) {

                    var bindingsForPath = bindings[j],
                        lastCached = bindingsForPath[firstActiveIndex],
                        binding = bindingsForPath[index];

                    bindingsForPath[index] = lastCached;

                    if (binding === undefined) {

                        // since we do not bother to create new bindings
                        // for objects that are cached, the binding may
                        // or may not exist

                        binding = new THREE.PropertyBinding(
                            object, paths[j], parsedPaths[j]);

                    }

                    bindingsForPath[firstActiveIndex] = binding;

                }

            } else if (objects[index] !== knownObject) {

                console.error("Different objects with the same UUID " +
                    "detected. Clean the caches or recreate your " +
                    "infrastructure when reloading scenes...");

            } // else the object is already where we want it to be

        } // for arguments

        this.nCachedObjects_ = nCachedObjects;

    },

    remove: function (var_args) {

        var objects = this._objects,
            nObjects = objects.length,
            nCachedObjects = this.nCachedObjects_,
            indicesByUUID = this._indicesByUUID,
            bindings = this._bindings,
            nBindings = bindings.length;

        for (var i = 0, n = arguments.length; i !== n; ++i) {

            var object = arguments[i],
                uuid = object.uuid,
                index = indicesByUUID[uuid];

            if (index !== undefined && index >= nCachedObjects) {

                // move existing object into the CACHED region

                var lastCachedIndex = nCachedObjects++,
                    firstActiveObject = objects[lastCachedIndex];

                indicesByUUID[firstActiveObject.uuid] = index;
                objects[index] = firstActiveObject;

                indicesByUUID[uuid] = lastCachedIndex;
                objects[lastCachedIndex] = object;

                // accounting is done, now do the same for all bindings

                for (var j = 0, m = nBindings; j !== m; ++j) {

                    var bindingsForPath = bindings[j],
                        firstActive = bindingsForPath[lastCachedIndex],
                        binding = bindingsForPath[index];

                    bindingsForPath[index] = firstActive;
                    bindingsForPath[lastCachedIndex] = binding;

                }

            }

        } // for arguments

        this.nCachedObjects_ = nCachedObjects;

    },

    // remove & forget
    uncache: function (var_args) {

        var objects = this._objects,
            nObjects = objects.length,
            nCachedObjects = this.nCachedObjects_,
            indicesByUUID = this._indicesByUUID,
            bindings = this._bindings,
            nBindings = bindings.length;

        for (var i = 0, n = arguments.length; i !== n; ++i) {

            var object = arguments[i],
                uuid = object.uuid,
                index = indicesByUUID[uuid];

            if (index !== undefined) {

                delete indicesByUUID[uuid];

                if (index < nCachedObjects) {

                    // object is cached, shrink the CACHED region

                    var firstActiveIndex = --nCachedObjects,
                        lastCachedObject = objects[firstActiveIndex],
                        lastIndex = --nObjects,
                        lastObject = objects[lastIndex];

                    // last cached object takes this object's place
                    indicesByUUID[lastCachedObject.uuid] = index;
                    objects[index] = lastCachedObject;

                    // last object goes to the activated slot and pop
                    indicesByUUID[lastObject.uuid] = firstActiveIndex;
                    objects[firstActiveIndex] = lastObject;
                    objects.pop();

                    // accounting is done, now do the same for all bindings

                    for (var j = 0, m = nBindings; j !== m; ++j) {

                        var bindingsForPath = bindings[j],
                            lastCached = bindingsForPath[firstActiveIndex],
                            last = bindingsForPath[lastIndex];

                        bindingsForPath[index] = lastCached;
                        bindingsForPath[firstActiveIndex] = last;
                        bindingsForPath.pop();

                    }

                } else {

                    // object is active, just swap with the last and pop

                    var lastIndex = --nObjects,
                        lastObject = objects[lastIndex];

                    indicesByUUID[lastObject.uuid] = index;
                    objects[index] = lastObject;
                    objects.pop();

                    // accounting is done, now do the same for all bindings

                    for (var j = 0, m = nBindings; j !== m; ++j) {

                        var bindingsForPath = bindings[j];

                        bindingsForPath[index] = bindingsForPath[lastIndex];
                        bindingsForPath.pop();

                    }

                } // cached or active

            } // if object is known

        } // for arguments

        this.nCachedObjects_ = nCachedObjects;

    },

    // Internal interface used by befriended PropertyBinding.Composite:

    subscribe_: function (path, parsedPath) {
        // returns an array of bindings for the given path that is changed
        // according to the contained objects in the group

        var indicesByPath = this._bindingsIndicesByPath,
            index = indicesByPath[path],
            bindings = this._bindings;

        if (index !== undefined) return bindings[index];

        var paths = this._paths,
            parsedPaths = this._parsedPaths,
            objects = this._objects,
            nObjects = objects.length,
            nCachedObjects = this.nCachedObjects_,
            bindingsForPath = new Array(nObjects);

        index = bindings.length;

        indicesByPath[path] = index;

        paths.push(path);
        parsedPaths.push(parsedPath);
        bindings.push(bindingsForPath);

        for (var i = nCachedObjects,
                n = objects.length; i !== n; ++i) {

            var object = objects[i];

            bindingsForPath[i] =
                new THREE.PropertyBinding(object, path, parsedPath);

        }

        return bindingsForPath;

    },

    unsubscribe_: function (path) {
        // tells the group to forget about a property path and no longer
        // update the array previously obtained with 'subscribe_'

        var indicesByPath = this._bindingsIndicesByPath,
            index = indicesByPath[path];

        if (index !== undefined) {

            var paths = this._paths,
                parsedPaths = this._parsedPaths,
                bindings = this._bindings,
                lastBindingsIndex = bindings.length - 1,
                lastBindings = bindings[lastBindingsIndex],
                lastBindingsPath = path[lastBindingsIndex];

            indicesByPath[lastBindingsPath] = index;

            bindings[index] = lastBindings;
            bindings.pop();

            parsedPaths[index] = parsedPaths[lastBindingsIndex];
            parsedPaths.pop();

            paths[index] = paths[lastBindingsIndex];
            paths.pop();

        }

    }

};


/**
 * @author tschw
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 */

THREE.AnimationUtils = {

    // same as Array.prototype.slice, but also works on typed arrays
    arraySlice: function (array, from, to) {

        if (THREE.AnimationUtils.isTypedArray(array)) {

            return new array.constructor(array.subarray(from, to));

        }

        return array.slice(from, to);

    },

    // converts an array to a specific type
    convertArray: function (array, type, forceClone) {

        if (!array || // let 'undefined' and 'null' pass
            !forceClone && array.constructor === type) return array;

        if (typeof type.BYTES_PER_ELEMENT === 'number') {

            return new type(array); // create typed array

        }

        return Array.prototype.slice.call(array); // create Array

    },

    isTypedArray: function (object) {

        return ArrayBuffer.isView(object) &&
            !(object instanceof DataView);

    },

    // returns an array by which times and values can be sorted
    getKeyframeOrder: function (times) {

        function compareTime(i, j) {

            return times[i] - times[j];

        }

        var n = times.length;
        var result = new Array(n);
        for (var i = 0; i !== n; ++i) result[i] = i;

        result.sort(compareTime);

        return result;

    },

    // uses the array previously returned by 'getKeyframeOrder' to sort data
    sortedArray: function (values, stride, order) {

        var nValues = values.length;
        var result = new values.constructor(nValues);

        for (var i = 0, dstOffset = 0; dstOffset !== nValues; ++i) {

            var srcOffset = order[i] * stride;

            for (var j = 0; j !== stride; ++j) {

                result[dstOffset++] = values[srcOffset + j];

            }

        }

        return result;

    },

    // function for parsing AOS keyframe formats
    flattenJSON: function (jsonKeys, times, values, valuePropertyName) {

        var i = 1,
            key = jsonKeys[0];

        while (key !== undefined && key[valuePropertyName] === undefined) {

            key = jsonKeys[i++];

        }

        if (key === undefined) return; // no data

        var value = key[valuePropertyName];
        if (value === undefined) return; // no data

        if (Array.isArray(value)) {

            do {

                value = key[valuePropertyName];

                if (value !== undefined) {

                    times.push(key.time);
                    values.push.apply(values, value); // push all elements

                }

                key = jsonKeys[i++];

            } while (key !== undefined);

        } else if (value.toArray !== undefined) {
            // ...assume THREE.Math-ish

            do {

                value = key[valuePropertyName];

                if (value !== undefined) {

                    times.push(key.time);
                    value.toArray(values, values.length);

                }

                key = jsonKeys[i++];

            } while (key !== undefined);

        } else {
            // otherwise push as-is

            do {

                value = key[valuePropertyName];

                if (value !== undefined) {

                    times.push(key.time);
                    values.push(value);

                }

                key = jsonKeys[i++];

            } while (key !== undefined);

        }

    }

};

/**
 *
 * A timed sequence of keyframes for a specific property.
 *
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 * @author tschw
 */

THREE.KeyframeTrack = function (name, times, values, interpolation) {

    if (name === undefined) throw new Error("track name is undefined");

    if (times === undefined || times.length === 0) {

        throw new Error("no keyframes in track named " + name);

    }

    this.name = name;

    this.times = THREE.AnimationUtils.convertArray(times, this.TimeBufferType);
    this.values = THREE.AnimationUtils.convertArray(values, this.ValueBufferType);

    this.setInterpolation(interpolation || this.DefaultInterpolation);

    this.validate();
    this.optimize();

};

THREE.KeyframeTrack.prototype = {

    constructor: THREE.KeyframeTrack,

    TimeBufferType: Float32Array,
    ValueBufferType: Float32Array,

    DefaultInterpolation: THREE.InterpolateLinear,

    InterpolantFactoryMethodDiscrete: function (result) {

        return new THREE.DiscreteInterpolant(
            this.times, this.values, this.getValueSize(), result);

    },

    InterpolantFactoryMethodLinear: function (result) {

        return new THREE.LinearInterpolant(
            this.times, this.values, this.getValueSize(), result);

    },

    InterpolantFactoryMethodSmooth: function (result) {

        return new THREE.CubicInterpolant(
            this.times, this.values, this.getValueSize(), result);

    },

    setInterpolation: function (interpolation) {

        var factoryMethod = undefined;

        switch (interpolation) {

        case THREE.InterpolateDiscrete:

            factoryMethod = this.InterpolantFactoryMethodDiscrete;

            break;

        case THREE.InterpolateLinear:

            factoryMethod = this.InterpolantFactoryMethodLinear;

            break;

        case THREE.InterpolateSmooth:

            factoryMethod = this.InterpolantFactoryMethodSmooth;

            break;

        }

        if (factoryMethod === undefined) {

            var message = "unsupported interpolation for " +
                this.ValueTypeName + " keyframe track named " + this.name;

            if (this.createInterpolant === undefined) {

                // fall back to default, unless the default itself is messed up
                if (interpolation !== this.DefaultInterpolation) {

                    this.setInterpolation(this.DefaultInterpolation);

                } else {

                    throw new Error(message); // fatal, in this case

                }

            }

            console.warn(message);
            return;

        }

        this.createInterpolant = factoryMethod;

    },

    getInterpolation: function () {

        switch (this.createInterpolant) {

        case this.InterpolantFactoryMethodDiscrete:

            return THREE.InterpolateDiscrete;

        case this.InterpolantFactoryMethodLinear:

            return THREE.InterpolateLinear;

        case this.InterpolantFactoryMethodSmooth:

            return THREE.InterpolateSmooth;

        }

    },

    getValueSize: function () {

        return this.values.length / this.times.length;

    },

    // move all keyframes either forwards or backwards in time
    shift: function (timeOffset) {

        if (timeOffset !== 0.0) {

            var times = this.times;

            for (var i = 0, n = times.length; i !== n; ++i) {

                times[i] += timeOffset;

            }

        }

        return this;

    },

    // scale all keyframe times by a factor (useful for frame <-> seconds conversions)
    scale: function (timeScale) {

        if (timeScale !== 1.0) {

            var times = this.times;

            for (var i = 0, n = times.length; i !== n; ++i) {

                times[i] *= timeScale;

            }

        }

        return this;

    },

    // removes keyframes before and after animation without changing any values within the range [startTime, endTime].
    // IMPORTANT: We do not shift around keys to the start of the track time, because for interpolated keys this will change their values
    trim: function (startTime, endTime) {

        var times = this.times,
            nKeys = times.length,
            from = 0,
            to = nKeys - 1;

        while (from !== nKeys && times[from] < startTime) ++from;
        while (to !== -1 && times[to] > endTime) --to;

        ++to; // inclusive -> exclusive bound

        if (from !== 0 || to !== nKeys) {

            // empty tracks are forbidden, so keep at least one keyframe
            if (from >= to) to = Math.max(to, 1), from = to - 1;

            var stride = this.getValueSize();
            this.times = THREE.AnimationUtils.arraySlice(times, from, to);
            this.values = THREE.AnimationUtils.
            arraySlice(this.values, from * stride, to * stride);

        }

        return this;

    },

    // ensure we do not get a GarbageInGarbageOut situation, make sure tracks are at least minimally viable
    validate: function () {

        var valid = true;

        var valueSize = this.getValueSize();
        if (valueSize - Math.floor(valueSize) !== 0) {

            console.error("invalid value size in track", this);
            valid = false;

        }

        var times = this.times,
            values = this.values,

            nKeys = times.length;

        if (nKeys === 0) {

            console.error("track is empty", this);
            valid = false;

        }

        var prevTime = null;

        for (var i = 0; i !== nKeys; i++) {

            var currTime = times[i];

            if (typeof currTime === 'number' && isNaN(currTime)) {

                console.error("time is not a valid number", this, i, currTime);
                valid = false;
                break;

            }

            if (prevTime !== null && prevTime > currTime) {

                console.error("out of order keys", this, i, currTime, prevTime);
                valid = false;
                break;

            }

            prevTime = currTime;

        }

        if (values !== undefined) {

            if (THREE.AnimationUtils.isTypedArray(values)) {

                for (var i = 0, n = values.length; i !== n; ++i) {

                    var value = values[i];

                    if (isNaN(value)) {

                        console.error("value is not a valid number", this, i, value);
                        valid = false;
                        break;

                    }

                }

            }

        }

        return valid;

    },

    // removes equivalent sequential keys as common in morph target sequences
    // (0,0,0,0,1,1,1,0,0,0,0,0,0,0) --> (0,0,1,1,0,0)
    optimize: function () {

        var times = this.times,
            values = this.values,
            stride = this.getValueSize(),

            writeIndex = 1;

        for (var i = 1, n = times.length - 1; i <= n; ++i) {

            var keep = false;

            var time = times[i];
            var timeNext = times[i + 1];

            // remove adjacent keyframes scheduled at the same time

            if (time !== timeNext && (i !== 1 || time !== time[0])) {

                // remove unnecessary keyframes same as their neighbors
                var offset = i * stride,
                    offsetP = offset - stride,
                    offsetN = offset + stride;

                for (var j = 0; j !== stride; ++j) {

                    var value = values[offset + j];

                    if (value !== values[offsetP + j] ||
                        value !== values[offsetN + j]) {

                        keep = true;
                        break;

                    }

                }

            }

            // in-place compaction

            if (keep) {

                if (i !== writeIndex) {

                    times[writeIndex] = times[i];

                    var readOffset = i * stride,
                        writeOffset = writeIndex * stride;

                    for (var j = 0; j !== stride; ++j) {

                        values[writeOffset + j] = values[readOffset + j];

                    }


                }

                ++writeIndex;

            }

        }

        if (writeIndex !== times.length) {

            this.times = THREE.AnimationUtils.arraySlice(times, 0, writeIndex);
            this.values = THREE.AnimationUtils.arraySlice(values, 0, writeIndex * stride);

        }

        return this;

    }

};

// Static methods:

Object.assign(THREE.KeyframeTrack, {

    // Serialization (in static context, because of constructor invocation
    // and automatic invocation of .toJSON):

    parse: function (json) {

        if (json.type === undefined) {

            throw new Error("track type undefined, can not parse");

        }

        var trackType = THREE.KeyframeTrack._getTrackTypeForValueTypeName(json.type);

        if (json.times === undefined) {

            console.warn("legacy JSON format detected, converting");

            var times = [],
                values = [];

            THREE.AnimationUtils.flattenJSON(json.keys, times, values, 'value');

            json.times = times;
            json.values = values;

        }

        // derived classes can define a static parse method
        if (trackType.parse !== undefined) {

            return trackType.parse(json);

        } else {

            // by default, we asssume a constructor compatible with the base
            return new trackType(
                json.name, json.times, json.values, json.interpolation);

        }

    },

    toJSON: function (track) {

        var trackType = track.constructor;

        var json;

        // derived classes can define a static toJSON method
        if (trackType.toJSON !== undefined) {

            json = trackType.toJSON(track);

        } else {

            // by default, we assume the data can be serialized as-is
            json = {

                'name': track.name,
                'times': THREE.AnimationUtils.convertArray(track.times, Array),
                'values': THREE.AnimationUtils.convertArray(track.values, Array)

            };

            var interpolation = track.getInterpolation();

            if (interpolation !== track.DefaultInterpolation) {

                json.interpolation = interpolation;

            }

        }

        json.type = track.ValueTypeName; // mandatory

        return json;

    },

    _getTrackTypeForValueTypeName: function (typeName) {

        switch (typeName.toLowerCase()) {

        case "scalar":
        case "double":
        case "float":
        case "number":
        case "integer":

            return THREE.NumberKeyframeTrack;

        case "vector":
        case "vector2":
        case "vector3":
        case "vector4":

            return THREE.VectorKeyframeTrack;

        case "color":

            return THREE.ColorKeyframeTrack;

        case "quaternion":

            return THREE.QuaternionKeyframeTrack;

        case "bool":
        case "boolean":

            return THREE.BooleanKeyframeTrack;

        case "string":

            return THREE.StringKeyframeTrack;

        };

        throw new Error("Unsupported typeName: " + typeName);

    }

});


/**
 *
 * A reference to a real property in the scene graph.
 *
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 * @author tschw
 */

THREE.PropertyBinding = function (rootNode, path, parsedPath) {

    this.path = path;
    this.parsedPath = parsedPath ||
        THREE.PropertyBinding.parseTrackName(path);

    this.node = THREE.PropertyBinding.findNode(
        rootNode, this.parsedPath.nodeName) || rootNode;

    this.rootNode = rootNode;

};

THREE.PropertyBinding.prototype = {

    constructor: THREE.PropertyBinding,

    getValue: function getValue_unbound(targetArray, offset) {

        this.bind();
        this.getValue(targetArray, offset);

        // Note: This class uses a State pattern on a per-method basis:
        // 'bind' sets 'this.getValue' / 'setValue' and shadows the
        // prototype version of these methods with one that represents
        // the bound state. When the property is not found, the methods
        // become no-ops.

    },

    setValue: function getValue_unbound(sourceArray, offset) {

        this.bind();
        this.setValue(sourceArray, offset);

    },

    // create getter / setter pair for a property in the scene graph
    bind: function () {

        var targetObject = this.node,
            parsedPath = this.parsedPath,

            objectName = parsedPath.objectName,
            propertyName = parsedPath.propertyName,
            propertyIndex = parsedPath.propertyIndex;

        if (!targetObject) {

            targetObject = THREE.PropertyBinding.findNode(
                this.rootNode, parsedPath.nodeName) || this.rootNode;

            this.node = targetObject;

        }

        // set fail state so we can just 'return' on error
        this.getValue = this._getValue_unavailable;
        this.setValue = this._setValue_unavailable;

        // ensure there is a value node
        if (!targetObject) {

            console.error("  trying to update node for track: " + this.path + " but it wasn't found.");
            return;

        }

        if (objectName) {

            var objectIndex = parsedPath.objectIndex;

            // special cases were we need to reach deeper into the hierarchy to get the face materials....
            switch (objectName) {

            case 'materials':

                if (!targetObject.material) {

                    console.error('  can not bind to material as node does not have a material', this);
                    return;

                }

                if (!targetObject.material.materials) {

                    console.error('  can not bind to material.materials as node.material does not have a materials array', this);
                    return;

                }

                targetObject = targetObject.material.materials;

                break;

            case 'bones':

                if (!targetObject.skeleton) {

                    console.error('  can not bind to bones as node does not have a skeleton', this);
                    return;

                }

                // potential future optimization: skip this if propertyIndex is already an integer
                // and convert the integer string to a true integer.

                targetObject = targetObject.skeleton.bones;

                // support resolving morphTarget names into indices.
                for (var i = 0; i < targetObject.length; i++) {

                    if (targetObject[i].name === objectIndex) {

                        objectIndex = i;
                        break;

                    }

                }

                break;

            default:

                if (targetObject[objectName] === undefined) {

                    console.error('  can not bind to objectName of node, undefined', this);
                    return;

                }

                targetObject = targetObject[objectName];

            }


            if (objectIndex !== undefined) {

                if (targetObject[objectIndex] === undefined) {

                    console.error("  trying to bind to objectIndex of objectName, but is undefined:", this, targetObject);
                    return;

                }

                targetObject = targetObject[objectIndex];

            }

        }

        // resolve property
        var nodeProperty = targetObject[propertyName];

        if (!nodeProperty) {

            var nodeName = parsedPath.nodeName;

            console.error("  trying to update property for track: " + nodeName +
                '.' + propertyName + " but it wasn't found.", targetObject);
            return;

        }

        // determine versioning scheme
        var versioning = this.Versioning.None;

        if (targetObject.needsUpdate !== undefined) { // material

            versioning = this.Versioning.NeedsUpdate;
            this.targetObject = targetObject;

        } else if (targetObject.matrixWorldNeedsUpdate !== undefined) { // node transform

            versioning = this.Versioning.MatrixWorldNeedsUpdate;
            this.targetObject = targetObject;

        }

        // determine how the property gets bound
        var bindingType = this.BindingType.Direct;

        if (propertyIndex !== undefined) {
            // access a sub element of the property array (only primitives are supported right now)

            if (propertyName === "morphTargetInfluences") {
                // potential optimization, skip this if propertyIndex is already an integer, and convert the integer string to a true integer.

                // support resolving morphTarget names into indices.
                if (!targetObject.geometry) {

                    console.error('  can not bind to morphTargetInfluences becasuse node does not have a geometry', this);
                    return;

                }

                if (!targetObject.geometry.morphTargets) {

                    console.error('  can not bind to morphTargetInfluences becasuse node does not have a geometry.morphTargets', this);
                    return;

                }

                for (var i = 0; i < this.node.geometry.morphTargets.length; i++) {

                    if (targetObject.geometry.morphTargets[i].name === propertyIndex) {

                        propertyIndex = i;
                        break;

                    }

                }

            }

            bindingType = this.BindingType.ArrayElement;

            this.resolvedProperty = nodeProperty;
            this.propertyIndex = propertyIndex;

        } else if (nodeProperty.fromArray !== undefined && nodeProperty.toArray !== undefined) {
            // must use copy for Object3D.Euler/Quaternion

            bindingType = this.BindingType.HasFromToArray;

            this.resolvedProperty = nodeProperty;

        } else if (nodeProperty.length !== undefined) {

            bindingType = this.BindingType.EntireArray;

            this.resolvedProperty = nodeProperty;

        } else {

            this.propertyName = propertyName;

        }

        // select getter / setter
        this.getValue = this.GetterByBindingType[bindingType];
        this.setValue = this.SetterByBindingTypeAndVersioning[bindingType][versioning];

    },

    unbind: function () {

        this.node = null;

        // back to the prototype version of getValue / setValue
        // note: avoiding to mutate the shape of 'this' via 'delete'
        this.getValue = this._getValue_unbound;
        this.setValue = this._setValue_unbound;

    }

};

Object.assign(THREE.PropertyBinding.prototype, { // prototype, continued

    // these are used to "bind" a nonexistent property
    _getValue_unavailable: function () {},
    _setValue_unavailable: function () {},

    // initial state of these methods that calls 'bind'
    _getValue_unbound: THREE.PropertyBinding.prototype.getValue,
    _setValue_unbound: THREE.PropertyBinding.prototype.setValue,

    BindingType: {
        Direct: 0,
        EntireArray: 1,
        ArrayElement: 2,
        HasFromToArray: 3
    },

    Versioning: {
        None: 0,
        NeedsUpdate: 1,
        MatrixWorldNeedsUpdate: 2
    },

    GetterByBindingType: [

		function getValue_direct(buffer, offset) {

            buffer[offset] = this.node[this.propertyName];

		},

		function getValue_array(buffer, offset) {

            var source = this.resolvedProperty;

            for (var i = 0, n = source.length; i !== n; ++i) {

                buffer[offset++] = source[i];

            }

		},

		function getValue_arrayElement(buffer, offset) {

            buffer[offset] = this.resolvedProperty[this.propertyIndex];

		},

		function getValue_toArray(buffer, offset) {

            this.resolvedProperty.toArray(buffer, offset);

		}

	],

    SetterByBindingTypeAndVersioning: [

		[
			// Direct

			function setValue_direct(buffer, offset) {

                this.node[this.propertyName] = buffer[offset];

			},

			function setValue_direct_setNeedsUpdate(buffer, offset) {

                this.node[this.propertyName] = buffer[offset];
                this.targetObject.needsUpdate = true;

			},

			function setValue_direct_setMatrixWorldNeedsUpdate(buffer, offset) {

                this.node[this.propertyName] = buffer[offset];
                this.targetObject.matrixWorldNeedsUpdate = true;

			}

		], [

			// EntireArray

			function setValue_array(buffer, offset) {

                var dest = this.resolvedProperty;

                for (var i = 0, n = dest.length; i !== n; ++i) {

                    dest[i] = buffer[offset++];

                }

			},

			function setValue_array_setNeedsUpdate(buffer, offset) {

                var dest = this.resolvedProperty;

                for (var i = 0, n = dest.length; i !== n; ++i) {

                    dest[i] = buffer[offset++];

                }

                this.targetObject.needsUpdate = true;

			},

			function setValue_array_setMatrixWorldNeedsUpdate(buffer, offset) {

                var dest = this.resolvedProperty;

                for (var i = 0, n = dest.length; i !== n; ++i) {

                    dest[i] = buffer[offset++];

                }

                this.targetObject.matrixWorldNeedsUpdate = true;

			}

		], [

			// ArrayElement

			function setValue_arrayElement(buffer, offset) {

                this.resolvedProperty[this.propertyIndex] = buffer[offset];

			},

			function setValue_arrayElement_setNeedsUpdate(buffer, offset) {

                this.resolvedProperty[this.propertyIndex] = buffer[offset];
                this.targetObject.needsUpdate = true;

			},

			function setValue_arrayElement_setMatrixWorldNeedsUpdate(buffer, offset) {

                this.resolvedProperty[this.propertyIndex] = buffer[offset];
                this.targetObject.matrixWorldNeedsUpdate = true;

			}

		], [

			// HasToFromArray

			function setValue_fromArray(buffer, offset) {

                this.resolvedProperty.fromArray(buffer, offset);

			},

			function setValue_fromArray_setNeedsUpdate(buffer, offset) {

                this.resolvedProperty.fromArray(buffer, offset);
                this.targetObject.needsUpdate = true;

			},

			function setValue_fromArray_setMatrixWorldNeedsUpdate(buffer, offset) {

                this.resolvedProperty.fromArray(buffer, offset);
                this.targetObject.matrixWorldNeedsUpdate = true;

			}

		]

	]

});

THREE.PropertyBinding.Composite =
    function (targetGroup, path, optionalParsedPath) {

        var parsedPath = optionalParsedPath ||
            THREE.PropertyBinding.parseTrackName(path);

        this._targetGroup = targetGroup;
        this._bindings = targetGroup.subscribe_(path, parsedPath);

    };

THREE.PropertyBinding.Composite.prototype = {

    constructor: THREE.PropertyBinding.Composite,

    getValue: function (array, offset) {

        this.bind(); // bind all binding

        var firstValidIndex = this._targetGroup.nCachedObjects_,
            binding = this._bindings[firstValidIndex];

        // and only call .getValue on the first
        if (binding !== undefined) binding.getValue(array, offset);

    },

    setValue: function (array, offset) {

        var bindings = this._bindings;

        for (var i = this._targetGroup.nCachedObjects_,
                n = bindings.length; i !== n; ++i) {

            bindings[i].setValue(array, offset);

        }

    },

    bind: function () {

        var bindings = this._bindings;

        for (var i = this._targetGroup.nCachedObjects_,
                n = bindings.length; i !== n; ++i) {

            bindings[i].bind();

        }

    },

    unbind: function () {

        var bindings = this._bindings;

        for (var i = this._targetGroup.nCachedObjects_,
                n = bindings.length; i !== n; ++i) {

            bindings[i].unbind();

        }

    }

};

THREE.PropertyBinding.create = function (root, path, parsedPath) {

    if (!(root instanceof THREE.AnimationObjectGroup)) {

        return new THREE.PropertyBinding(root, path, parsedPath);

    } else {

        return new THREE.PropertyBinding.Composite(root, path, parsedPath);

    }

};

THREE.PropertyBinding.parseTrackName = function (trackName) {

    // matches strings in the form of:
    //    nodeName.property
    //    nodeName.property[accessor]
    //    nodeName.material.property[accessor]
    //    uuid.property[accessor]
    //    uuid.objectName[objectIndex].propertyName[propertyIndex]
    //    parentName/nodeName.property
    //    parentName/parentName/nodeName.property[index]
    //	  .bone[Armature.DEF_cog].position
    // created and tested via https://regex101.com/#javascript

    var re = /^(([\w]+\/)*)([\w-\d]+)?(\.([\w]+)(\[([\w\d\[\]\_. ]+)\])?)?(\.([\w.]+)(\[([\w\d\[\]\_. ]+)\])?)$/;
    var matches = re.exec(trackName);

    if (!matches) {
        throw new Error("cannot parse trackName at all: " + trackName);
    }

    if (matches.index === re.lastIndex) {
        re.lastIndex++;
    }

    var results = {
        // directoryName: matches[1], // (tschw) currently unused
        nodeName: matches[3], // allowed to be null, specified root node.
        objectName: matches[5],
        objectIndex: matches[7],
        propertyName: matches[9],
        propertyIndex: matches[11] // allowed to be null, specifies that the whole property is set.
    };

    if (results.propertyName === null || results.propertyName.length === 0) {
        throw new Error("can not parse propertyName from trackName: " + trackName);
    }

    return results;

};

THREE.PropertyBinding.findNode = function (root, nodeName) {

    if (!nodeName || nodeName === "" || nodeName === "root" || nodeName === "." || nodeName === -1 || nodeName === root.name || nodeName === root.uuid) {

        return root;

    }

    // search into skeleton bones.
    if (root.skeleton) {

        var searchSkeleton = function (skeleton) {

            for (var i = 0; i < skeleton.bones.length; i++) {

                var bone = skeleton.bones[i];

                if (bone.name === nodeName) {

                    return bone;

                }
            }

            return null;

        };

        var bone = searchSkeleton(root.skeleton);

        if (bone) {

            return bone;

        }
    }

    // search into node subtree.
    if (root.children) {

        var searchNodeSubtree = function (children) {

            for (var i = 0; i < children.length; i++) {

                var childNode = children[i];

                if (childNode.name === nodeName || childNode.uuid === nodeName) {

                    return childNode;

                }

                var result = searchNodeSubtree(childNode.children);

                if (result) return result;

            }

            return null;

        };

        var subTreeNode = searchNodeSubtree(root.children);

        if (subTreeNode) {

            return subTreeNode;

        }

    }

    return null;

}


/**
 *
 * Buffered scene graph property that allows weighted accumulation.
 *
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 * @author tschw
 */

THREE.PropertyMixer = function (binding, typeName, valueSize) {

    this.binding = binding;
    this.valueSize = valueSize;

    var bufferType = Float64Array,
        mixFunction;

    switch (typeName) {

    case 'quaternion':
        mixFunction = this._slerp;
        break;

    case 'string':
    case 'bool':

        bufferType = Array, mixFunction = this._select;
        break;

    default:
        mixFunction = this._lerp;

    }

    this.buffer = new bufferType(valueSize * 4);
    // layout: [ incoming | accu0 | accu1 | orig ]
    //
    // interpolators can use .buffer as their .result
    // the data then goes to 'incoming'
    //
    // 'accu0' and 'accu1' are used frame-interleaved for
    // the cumulative result and are compared to detect
    // changes
    //
    // 'orig' stores the original state of the property

    this._mixBufferRegion = mixFunction;

    this.cumulativeWeight = 0;

    this.useCount = 0;
    this.referenceCount = 0;

};

THREE.PropertyMixer.prototype = {

    constructor: THREE.PropertyMixer,

    // accumulate data in the 'incoming' region into 'accu<i>'
    accumulate: function (accuIndex, weight) {

        // note: happily accumulating nothing when weight = 0, the caller knows
        // the weight and shouldn't have made the call in the first place

        var buffer = this.buffer,
            stride = this.valueSize,
            offset = accuIndex * stride + stride,

            currentWeight = this.cumulativeWeight;

        if (currentWeight === 0) {

            // accuN := incoming * weight

            for (var i = 0; i !== stride; ++i) {

                buffer[offset + i] = buffer[i];

            }

            currentWeight = weight;

        } else {

            // accuN := accuN + incoming * weight

            currentWeight += weight;
            var mix = weight / currentWeight;
            this._mixBufferRegion(buffer, offset, 0, mix, stride);

        }

        this.cumulativeWeight = currentWeight;

    },

    // apply the state of 'accu<i>' to the binding when accus differ
    apply: function (accuIndex) {

        var stride = this.valueSize,
            buffer = this.buffer,
            offset = accuIndex * stride + stride,

            weight = this.cumulativeWeight,

            binding = this.binding;

        this.cumulativeWeight = 0;

        if (weight < 1) {

            // accuN := accuN + original * ( 1 - cumulativeWeight )

            var originalValueOffset = stride * 3;

            this._mixBufferRegion(
                buffer, offset, originalValueOffset, 1 - weight, stride);

        }

        for (var i = stride, e = stride + stride; i !== e; ++i) {

            if (buffer[i] !== buffer[i + stride]) {

                // value has changed -> update scene graph

                binding.setValue(buffer, offset);
                break;

            }

        }

    },

    // remember the state of the bound property and copy it to both accus
    saveOriginalState: function () {

        var binding = this.binding;

        var buffer = this.buffer,
            stride = this.valueSize,

            originalValueOffset = stride * 3;

        binding.getValue(buffer, originalValueOffset);

        // accu[0..1] := orig -- initially detect changes against the original
        for (var i = stride, e = originalValueOffset; i !== e; ++i) {

            buffer[i] = buffer[originalValueOffset + (i % stride)];

        }

        this.cumulativeWeight = 0;

    },

    // apply the state previously taken via 'saveOriginalState' to the binding
    restoreOriginalState: function () {

        var originalValueOffset = this.valueSize * 3;
        this.binding.setValue(this.buffer, originalValueOffset);

    },


    // mix functions

    _select: function (buffer, dstOffset, srcOffset, t, stride) {

        if (t >= 0.5) {

            for (var i = 0; i !== stride; ++i) {

                buffer[dstOffset + i] = buffer[srcOffset + i];

            }

        }

    },

    _slerp: function (buffer, dstOffset, srcOffset, t, stride) {

        THREE.Quaternion.slerpFlat(buffer, dstOffset,
            buffer, dstOffset, buffer, srcOffset, t);

    },

    _lerp: function (buffer, dstOffset, srcOffset, t, stride) {

        var s = 1 - t;

        for (var i = 0; i !== stride; ++i) {

            var j = dstOffset + i;

            buffer[j] = buffer[j] * s + buffer[srcOffset + i] * t;

        }

    }

};

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.Loader = function () {

    this.onLoadStart = function () {};
    this.onLoadProgress = function () {};
    this.onLoadComplete = function () {};

};

THREE.Loader.prototype = {

    constructor: THREE.Loader,

    crossOrigin: undefined,

    extractUrlBase: function (url) {

        var parts = url.split('/');

        if (parts.length === 1) return './';

        parts.pop();

        return parts.join('/') + '/';

    },

    initMaterials: function (materials, texturePath, crossOrigin) {

        var array = [];

        for (var i = 0; i < materials.length; ++i) {

            array[i] = this.createMaterial(materials[i], texturePath, crossOrigin);

        }

        return array;

    },

    createMaterial: (function () {

        var color, textureLoader, materialLoader;

        return function (m, texturePath, crossOrigin) {

            if (color === undefined) color = new THREE.Color();
            if (textureLoader === undefined) textureLoader = new THREE.TextureLoader();
            if (materialLoader === undefined) materialLoader = new THREE.MaterialLoader();

            // convert from old material format

            var textures = {};

            function loadTexture(path, repeat, offset, wrap, anisotropy) {

                var fullPath = texturePath + path;
                var loader = THREE.Loader.Handlers.get(fullPath);

                var texture;

                if (loader !== null) {

                    texture = loader.load(fullPath);

                } else {

                    textureLoader.setCrossOrigin(crossOrigin);
                    texture = textureLoader.load(fullPath);

                }

                if (repeat !== undefined) {

                    texture.repeat.fromArray(repeat);

                    if (repeat[0] !== 1) texture.wrapS = THREE.RepeatWrapping;
                    if (repeat[1] !== 1) texture.wrapT = THREE.RepeatWrapping;

                }

                if (offset !== undefined) {

                    texture.offset.fromArray(offset);

                }

                if (wrap !== undefined) {

                    if (wrap[0] === 'repeat') texture.wrapS = THREE.RepeatWrapping;
                    if (wrap[0] === 'mirror') texture.wrapS = THREE.MirroredRepeatWrapping;

                    if (wrap[1] === 'repeat') texture.wrapT = THREE.RepeatWrapping;
                    if (wrap[1] === 'mirror') texture.wrapT = THREE.MirroredRepeatWrapping;

                }

                if (anisotropy !== undefined) {

                    texture.anisotropy = anisotropy;

                }

                var uuid = THREE.Math.generateUUID();

                textures[uuid] = texture;

                return uuid;

            }

            //

            var json = {
                uuid: THREE.Math.generateUUID(),
                type: 'MeshLambertMaterial'
            };

            for (var name in m) {

                var value = m[name];

                switch (name) {
                case 'DbgColor':
                case 'DbgIndex':
                case 'opticalDensity':
                case 'illumination':
                    break;
                case 'DbgName':
                    json.name = value;
                    break;
                case 'blending':
                    json.blending = THREE[value];
                    break;
                case 'colorAmbient':
                case 'mapAmbient':
                    console.warn('THREE.Loader.createMaterial:', name, 'is no longer supported.');
                    break;
                case 'colorDiffuse':
                    json.color = color.fromArray(value).getHex();
                    break;
                case 'colorSpecular':
                    json.specular = color.fromArray(value).getHex();
                    break;
                case 'colorEmissive':
                    json.emissive = color.fromArray(value).getHex();
                    break;
                case 'specularCoef':
                    json.shininess = value;
                    break;
                case 'shading':
                    if (value.toLowerCase() === 'basic') json.type = 'MeshBasicMaterial';
                    if (value.toLowerCase() === 'phong') json.type = 'MeshPhongMaterial';
                    break;
                case 'mapDiffuse':
                    json.map = loadTexture(value, m.mapDiffuseRepeat, m.mapDiffuseOffset, m.mapDiffuseWrap, m.mapDiffuseAnisotropy);
                    break;
                case 'mapDiffuseRepeat':
                case 'mapDiffuseOffset':
                case 'mapDiffuseWrap':
                case 'mapDiffuseAnisotropy':
                    break;
                case 'mapLight':
                    json.lightMap = loadTexture(value, m.mapLightRepeat, m.mapLightOffset, m.mapLightWrap, m.mapLightAnisotropy);
                    break;
                case 'mapLightRepeat':
                case 'mapLightOffset':
                case 'mapLightWrap':
                case 'mapLightAnisotropy':
                    break;
                case 'mapAO':
                    json.aoMap = loadTexture(value, m.mapAORepeat, m.mapAOOffset, m.mapAOWrap, m.mapAOAnisotropy);
                    break;
                case 'mapAORepeat':
                case 'mapAOOffset':
                case 'mapAOWrap':
                case 'mapAOAnisotropy':
                    break;
                case 'mapBump':
                    json.bumpMap = loadTexture(value, m.mapBumpRepeat, m.mapBumpOffset, m.mapBumpWrap, m.mapBumpAnisotropy);
                    break;
                case 'mapBumpScale':
                    json.bumpScale = value;
                    break;
                case 'mapBumpRepeat':
                case 'mapBumpOffset':
                case 'mapBumpWrap':
                case 'mapBumpAnisotropy':
                    break;
                case 'mapNormal':
                    json.normalMap = loadTexture(value, m.mapNormalRepeat, m.mapNormalOffset, m.mapNormalWrap, m.mapNormalAnisotropy);
                    break;
                case 'mapNormalFactor':
                    json.normalScale = [value, value];
                    break;
                case 'mapNormalRepeat':
                case 'mapNormalOffset':
                case 'mapNormalWrap':
                case 'mapNormalAnisotropy':
                    break;
                case 'mapSpecular':
                    json.specularMap = loadTexture(value, m.mapSpecularRepeat, m.mapSpecularOffset, m.mapSpecularWrap, m.mapSpecularAnisotropy);
                    break;
                case 'mapSpecularRepeat':
                case 'mapSpecularOffset':
                case 'mapSpecularWrap':
                case 'mapSpecularAnisotropy':
                    break;
                case 'mapAlpha':
                    json.alphaMap = loadTexture(value, m.mapAlphaRepeat, m.mapAlphaOffset, m.mapAlphaWrap, m.mapAlphaAnisotropy);
                    break;
                case 'mapAlphaRepeat':
                case 'mapAlphaOffset':
                case 'mapAlphaWrap':
                case 'mapAlphaAnisotropy':
                    break;
                case 'flipSided':
                    json.side = THREE.BackSide;
                    break;
                case 'doubleSided':
                    json.side = THREE.DoubleSide;
                    break;
                case 'transparency':
                    console.warn('THREE.Loader.createMaterial: transparency has been renamed to opacity');
                    json.opacity = value;
                    break;
                case 'depthTest':
                case 'depthWrite':
                case 'colorWrite':
                case 'opacity':
                case 'reflectivity':
                case 'transparent':
                case 'visible':
                case 'wireframe':
                    json[name] = value;
                    break;
                case 'vertexColors':
                    if (value === true) json.vertexColors = THREE.VertexColors;
                    if (value === 'face') json.vertexColors = THREE.FaceColors;
                    break;
                default:
                    console.error('THREE.Loader.createMaterial: Unsupported', name, value);
                    break;
                }

            }

            if (json.type === 'MeshBasicMaterial') delete json.emissive;
            if (json.type !== 'MeshPhongMaterial') delete json.specular;

            if (json.opacity < 1) json.transparent = true;

            materialLoader.setTextures(textures);

            return materialLoader.parse(json);

        };

    })()

};

THREE.Loader.Handlers = {

    handlers: [],

    add: function (regex, loader) {

        this.handlers.push(regex, loader);

    },

    get: function (file) {

        var handlers = this.handlers;

        for (var i = 0, l = handlers.length; i < l; i += 2) {

            var regex = handlers[i];
            var loader = handlers[i + 1];

            if (regex.test(file)) {

                return loader;

            }

        }

        return null;

    }

};


/**
 * @author bhouston / http://clara.io/
 */

THREE.AnimationLoader = function (manager) {

    this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;

};

THREE.AnimationLoader.prototype = {

    constructor: THREE.AnimationLoader,

    load: function (url, onLoad, onProgress, onError) {

        var scope = this;

        var loader = new THREE.XHRLoader(scope.manager);
        loader.load(url, function (text) {

            onLoad(scope.parse(JSON.parse(text)));

        }, onProgress, onError);

    },

    parse: function (json, onLoad) {

        var animations = [];

        for (var i = 0; i < json.length; i++) {

            var clip = THREE.AnimationClip.parse(json[i]);

            animations.push(clip);

        }

        onLoad(animations);

    }

};


/**
 * @author Nikos M. / https://github.com/foo123/
 *
 * Abstract Base class to load generic binary textures formats (rgbe, hdr, ...)
 */

THREE.DataTextureLoader = THREE.BinaryTextureLoader = function (manager) {

    this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;

    // override in sub classes
    this._parser = null;

};

THREE.BinaryTextureLoader.prototype = {

    constructor: THREE.BinaryTextureLoader,

    load: function (url, onLoad, onProgress, onError) {

        var scope = this;

        var texture = new THREE.DataTexture();

        var loader = new THREE.XHRLoader(this.manager);
        loader.setResponseType('arraybuffer');

        loader.load(url, function (buffer) {

            var texData = scope._parser(buffer);

            if (!texData) return;

            if (undefined !== texData.image) {

                texture.image = texData.image;

            } else if (undefined !== texData.data) {

                texture.image.width = texData.width;
                texture.image.height = texData.height;
                texture.image.data = texData.data;

            }

            texture.wrapS = undefined !== texData.wrapS ? texData.wrapS : THREE.ClampToEdgeWrapping;
            texture.wrapT = undefined !== texData.wrapT ? texData.wrapT : THREE.ClampToEdgeWrapping;

            texture.magFilter = undefined !== texData.magFilter ? texData.magFilter : THREE.LinearFilter;
            texture.minFilter = undefined !== texData.minFilter ? texData.minFilter : THREE.LinearMipMapLinearFilter;

            texture.anisotropy = undefined !== texData.anisotropy ? texData.anisotropy : 1;

            if (undefined !== texData.format) {

                texture.format = texData.format;

            }
            if (undefined !== texData.type) {

                texture.type = texData.type;

            }

            if (undefined !== texData.mipmaps) {

                texture.mipmaps = texData.mipmaps;

            }

            if (1 === texData.mipmapCount) {

                texture.minFilter = THREE.LinearFilter;

            }

            texture.needsUpdate = true;

            if (onLoad) onLoad(texture, texData);

        }, onProgress, onError);


        return texture;

    }

};


/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.BufferGeometryLoader = function (manager) {

    this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;

};

THREE.BufferGeometryLoader.prototype = {

    constructor: THREE.BufferGeometryLoader,

    load: function (url, onLoad, onProgress, onError) {

        var scope = this;

        var loader = new THREE.XHRLoader(scope.manager);
        loader.load(url, function (text) {

            onLoad(scope.parse(JSON.parse(text)));

        }, onProgress, onError);

    },

    parse: function (json) {

        var geometry = new THREE.BufferGeometry();

        var index = json.data.index;

        var TYPED_ARRAYS = {
            'Int8Array': Int8Array,
            'Uint8Array': Uint8Array,
            'Uint8ClampedArray': Uint8ClampedArray,
            'Int16Array': Int16Array,
            'Uint16Array': Uint16Array,
            'Int32Array': Int32Array,
            'Uint32Array': Uint32Array,
            'Float32Array': Float32Array,
            'Float64Array': Float64Array
        };

        if (index !== undefined) {

            var typedArray = new TYPED_ARRAYS[index.type](index.array);
            geometry.setIndex(new THREE.BufferAttribute(typedArray, 1));

        }

        var attributes = json.data.attributes;

        for (var key in attributes) {

            var attribute = attributes[key];
            var typedArray = new TYPED_ARRAYS[attribute.type](attribute.array);

            geometry.addAttribute(key, new THREE.BufferAttribute(typedArray, attribute.itemSize));

        }

        var groups = json.data.groups || json.data.drawcalls || json.data.offsets;

        if (groups !== undefined) {

            for (var i = 0, n = groups.length; i !== n; ++i) {

                var group = groups[i];

                geometry.addGroup(group.start, group.count, group.materialIndex);

            }

        }

        var boundingSphere = json.data.boundingSphere;

        if (boundingSphere !== undefined) {

            var center = new THREE.Vector3();

            if (boundingSphere.center !== undefined) {

                center.fromArray(boundingSphere.center);

            }

            geometry.boundingSphere = new THREE.Sphere(center, boundingSphere.radius);

        }

        return geometry;

    }

};


/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.Cache = {

    enabled: false,

    files: {},

    add: function (key, file) {

        if (this.enabled === false) return;

        // console.log( 'THREE.Cache', 'Adding key:', key );

        this.files[key] = file;

    },

    get: function (key) {

        if (this.enabled === false) return;

        // console.log( 'THREE.Cache', 'Checking key:', key );

        return this.files[key];

    },

    remove: function (key) {

        delete this.files[key];

    },

    clear: function () {

        this.files = {};

    }

};


/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 */

THREE.JSONLoader = function (manager) {

    if (typeof manager === 'boolean') {

        console.warn('THREE.JSONLoader: showStatus parameter has been removed from constructor.');
        manager = undefined;

    }

    this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;

    this.withCredentials = false;

};

THREE.JSONLoader.prototype = {

    constructor: THREE.JSONLoader,

    // Deprecated

    get statusDomElement() {

        if (this._statusDomElement === undefined) {

            this._statusDomElement = document.createElement('div');

        }

        console.warn('THREE.JSONLoader: .statusDomElement has been removed.');
        return this._statusDomElement;

    },

    load: function (url, onLoad, onProgress, onError) {

        var scope = this;

        var texturePath = this.texturePath && (typeof this.texturePath === "string") ? this.texturePath : THREE.Loader.prototype.extractUrlBase(url);

        var loader = new THREE.XHRLoader(this.manager);
        loader.setWithCredentials(this.withCredentials);
        loader.load(url, function (text) {

            var json = JSON.parse(text);
            var metadata = json.metadata;

            if (metadata !== undefined) {

                var type = metadata.type;

                if (type !== undefined) {

                    if (type.toLowerCase() === 'object') {

                        console.error('THREE.JSONLoader: ' + url + ' should be loaded with THREE.ObjectLoader instead.');
                        return;

                    }

                    if (type.toLowerCase() === 'scene') {

                        console.error('THREE.JSONLoader: ' + url + ' should be loaded with THREE.SceneLoader instead.');
                        return;

                    }

                }

            }

            var object = scope.parse(json, texturePath);
            onLoad(object.geometry, object.materials);

        }, onProgress, onError);

    },

    setTexturePath: function (value) {

        this.texturePath = value;

    },

    parse: function (json, texturePath) {

        var geometry = new THREE.Geometry(),
            scale = (json.scale !== undefined) ? 1.0 / json.scale : 1.0;

        parseModel(scale);

        parseSkin();
        parseMorphing(scale);
        parseAnimations();

        geometry.computeFaceNormals();
        geometry.computeBoundingSphere();

        function parseModel(scale) {

            function isBitSet(value, position) {

                return value & (1 << position);

            }

            var i, j, fi,

                offset, zLength,

                colorIndex, normalIndex, uvIndex, materialIndex,

                type,
                isQuad,
                hasMaterial,
                hasFaceVertexUv,
                hasFaceNormal, hasFaceVertexNormal,
                hasFaceColor, hasFaceVertexColor,

                vertex, face, faceA, faceB, hex, normal,

                uvLayer, uv, u, v,

                faces = json.faces,
                vertices = json.vertices,
                normals = json.normals,
                colors = json.colors,

                nUvLayers = 0;

            if (json.uvs !== undefined) {

                // disregard empty arrays

                for (i = 0; i < json.uvs.length; i++) {

                    if (json.uvs[i].length) nUvLayers++;

                }

                for (i = 0; i < nUvLayers; i++) {

                    geometry.faceVertexUvs[i] = [];

                }

            }

            offset = 0;
            zLength = vertices.length;

            while (offset < zLength) {

                vertex = new THREE.Vector3();

                vertex.x = vertices[offset++] * scale;
                vertex.y = vertices[offset++] * scale;
                vertex.z = vertices[offset++] * scale;

                geometry.vertices.push(vertex);

            }

            offset = 0;
            zLength = faces.length;

            while (offset < zLength) {

                type = faces[offset++];


                isQuad = isBitSet(type, 0);
                hasMaterial = isBitSet(type, 1);
                hasFaceVertexUv = isBitSet(type, 3);
                hasFaceNormal = isBitSet(type, 4);
                hasFaceVertexNormal = isBitSet(type, 5);
                hasFaceColor = isBitSet(type, 6);
                hasFaceVertexColor = isBitSet(type, 7);

                // console.log("type", type, "bits", isQuad, hasMaterial, hasFaceVertexUv, hasFaceNormal, hasFaceVertexNormal, hasFaceColor, hasFaceVertexColor);

                if (isQuad) {

                    faceA = new THREE.Face3();
                    faceA.a = faces[offset];
                    faceA.b = faces[offset + 1];
                    faceA.c = faces[offset + 3];

                    faceB = new THREE.Face3();
                    faceB.a = faces[offset + 1];
                    faceB.b = faces[offset + 2];
                    faceB.c = faces[offset + 3];

                    offset += 4;

                    if (hasMaterial) {

                        materialIndex = faces[offset++];
                        faceA.materialIndex = materialIndex;
                        faceB.materialIndex = materialIndex;

                    }

                    // to get face <=> uv index correspondence

                    fi = geometry.faces.length;

                    if (hasFaceVertexUv) {

                        for (i = 0; i < nUvLayers; i++) {

                            uvLayer = json.uvs[i];

                            geometry.faceVertexUvs[i][fi] = [];
                            geometry.faceVertexUvs[i][fi + 1] = [];

                            for (j = 0; j < 4; j++) {

                                uvIndex = faces[offset++];

                                u = uvLayer[uvIndex * 2];
                                v = uvLayer[uvIndex * 2 + 1];

                                uv = new THREE.Vector2(u, v);

                                if (j !== 2) geometry.faceVertexUvs[i][fi].push(uv);
                                if (j !== 0) geometry.faceVertexUvs[i][fi + 1].push(uv);

                            }

                        }

                    }

                    if (hasFaceNormal) {

                        normalIndex = faces[offset++] * 3;

                        faceA.normal.set(
                            normals[normalIndex++],
                            normals[normalIndex++],
                            normals[normalIndex]
                        );

                        faceB.normal.copy(faceA.normal);

                    }

                    if (hasFaceVertexNormal) {

                        for (i = 0; i < 4; i++) {

                            normalIndex = faces[offset++] * 3;

                            normal = new THREE.Vector3(
                                normals[normalIndex++],
                                normals[normalIndex++],
                                normals[normalIndex]
                            );


                            if (i !== 2) faceA.vertexNormals.push(normal);
                            if (i !== 0) faceB.vertexNormals.push(normal);

                        }

                    }


                    if (hasFaceColor) {

                        colorIndex = faces[offset++];
                        hex = colors[colorIndex];

                        faceA.color.setHex(hex);
                        faceB.color.setHex(hex);

                    }


                    if (hasFaceVertexColor) {

                        for (i = 0; i < 4; i++) {

                            colorIndex = faces[offset++];
                            hex = colors[colorIndex];

                            if (i !== 2) faceA.vertexColors.push(new THREE.Color(hex));
                            if (i !== 0) faceB.vertexColors.push(new THREE.Color(hex));

                        }

                    }

                    geometry.faces.push(faceA);
                    geometry.faces.push(faceB);

                } else {

                    face = new THREE.Face3();
                    face.a = faces[offset++];
                    face.b = faces[offset++];
                    face.c = faces[offset++];

                    if (hasMaterial) {

                        materialIndex = faces[offset++];
                        face.materialIndex = materialIndex;

                    }

                    // to get face <=> uv index correspondence

                    fi = geometry.faces.length;

                    if (hasFaceVertexUv) {

                        for (i = 0; i < nUvLayers; i++) {

                            uvLayer = json.uvs[i];

                            geometry.faceVertexUvs[i][fi] = [];

                            for (j = 0; j < 3; j++) {

                                uvIndex = faces[offset++];

                                u = uvLayer[uvIndex * 2];
                                v = uvLayer[uvIndex * 2 + 1];

                                uv = new THREE.Vector2(u, v);

                                geometry.faceVertexUvs[i][fi].push(uv);

                            }

                        }

                    }

                    if (hasFaceNormal) {

                        normalIndex = faces[offset++] * 3;

                        face.normal.set(
                            normals[normalIndex++],
                            normals[normalIndex++],
                            normals[normalIndex]
                        );

                    }

                    if (hasFaceVertexNormal) {

                        for (i = 0; i < 3; i++) {

                            normalIndex = faces[offset++] * 3;

                            normal = new THREE.Vector3(
                                normals[normalIndex++],
                                normals[normalIndex++],
                                normals[normalIndex]
                            );

                            face.vertexNormals.push(normal);

                        }

                    }


                    if (hasFaceColor) {

                        colorIndex = faces[offset++];
                        face.color.setHex(colors[colorIndex]);

                    }


                    if (hasFaceVertexColor) {

                        for (i = 0; i < 3; i++) {

                            colorIndex = faces[offset++];
                            face.vertexColors.push(new THREE.Color(colors[colorIndex]));

                        }

                    }

                    geometry.faces.push(face);

                }

            }

        };

        function parseSkin() {

            var influencesPerVertex = (json.influencesPerVertex !== undefined) ? json.influencesPerVertex : 2;

            if (json.skinWeights) {

                for (var i = 0, l = json.skinWeights.length; i < l; i += influencesPerVertex) {

                    var x = json.skinWeights[i];
                    var y = (influencesPerVertex > 1) ? json.skinWeights[i + 1] : 0;
                    var z = (influencesPerVertex > 2) ? json.skinWeights[i + 2] : 0;
                    var w = (influencesPerVertex > 3) ? json.skinWeights[i + 3] : 0;

                    geometry.skinWeights.push(new THREE.Vector4(x, y, z, w));

                }

            }

            if (json.skinIndices) {

                for (var i = 0, l = json.skinIndices.length; i < l; i += influencesPerVertex) {

                    var a = json.skinIndices[i];
                    var b = (influencesPerVertex > 1) ? json.skinIndices[i + 1] : 0;
                    var c = (influencesPerVertex > 2) ? json.skinIndices[i + 2] : 0;
                    var d = (influencesPerVertex > 3) ? json.skinIndices[i + 3] : 0;

                    geometry.skinIndices.push(new THREE.Vector4(a, b, c, d));

                }

            }

            geometry.bones = json.bones;

            if (geometry.bones && geometry.bones.length > 0 && (geometry.skinWeights.length !== geometry.skinIndices.length || geometry.skinIndices.length !== geometry.vertices.length)) {

                console.warn('When skinning, number of vertices (' + geometry.vertices.length + '), skinIndices (' +
                    geometry.skinIndices.length + '), and skinWeights (' + geometry.skinWeights.length + ') should match.');

            }

        };

        function parseMorphing(scale) {

            if (json.morphTargets !== undefined) {

                for (var i = 0, l = json.morphTargets.length; i < l; i++) {

                    geometry.morphTargets[i] = {};
                    geometry.morphTargets[i].name = json.morphTargets[i].name;
                    geometry.morphTargets[i].vertices = [];

                    var dstVertices = geometry.morphTargets[i].vertices;
                    var srcVertices = json.morphTargets[i].vertices;

                    for (var v = 0, vl = srcVertices.length; v < vl; v += 3) {

                        var vertex = new THREE.Vector3();
                        vertex.x = srcVertices[v] * scale;
                        vertex.y = srcVertices[v + 1] * scale;
                        vertex.z = srcVertices[v + 2] * scale;

                        dstVertices.push(vertex);

                    }

                }

            }

            if (json.morphColors !== undefined && json.morphColors.length > 0) {

                console.warn('THREE.JSONLoader: "morphColors" no longer supported. Using them as face colors.');

                var faces = geometry.faces;
                var morphColors = json.morphColors[0].colors;

                for (var i = 0, l = faces.length; i < l; i++) {

                    faces[i].color.fromArray(morphColors, i * 3);

                }

            }

        }

        function parseAnimations() {

            var outputAnimations = [];

            // parse old style Bone/Hierarchy animations
            var animations = [];

            if (json.animation !== undefined) {

                animations.push(json.animation);

            }

            if (json.animations !== undefined) {

                if (json.animations.length) {

                    animations = animations.concat(json.animations);

                } else {

                    animations.push(json.animations);

                }

            }

            for (var i = 0; i < animations.length; i++) {

                var clip = THREE.AnimationClip.parseAnimation(animations[i], geometry.bones);
                if (clip) outputAnimations.push(clip);

            }

            // parse implicit morph animations
            if (geometry.morphTargets) {

                // TODO: Figure out what an appropraite FPS is for morph target animations -- defaulting to 10, but really it is completely arbitrary.
                var morphAnimationClips = THREE.AnimationClip.CreateClipsFromMorphTargetSequences(geometry.morphTargets, 10);
                outputAnimations = outputAnimations.concat(morphAnimationClips);

            }

            if (outputAnimations.length > 0) geometry.animations = outputAnimations;

        };

        if (json.materials === undefined || json.materials.length === 0) {

            return {
                geometry: geometry
            };

        } else {

            var materials = THREE.Loader.prototype.initMaterials(json.materials, texturePath, this.crossOrigin);

            return {
                geometry: geometry,
                materials: materials
            };

        }

    }

};


/**
 * @author mrdoob / http://mrdoob.com/
 *
 * Abstract Base class to block based textures loader (dds, pvr, ...)
 */

THREE.CompressedTextureLoader = function (manager) {

    this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;

    // override in sub classes
    this._parser = null;

};


THREE.CompressedTextureLoader.prototype = {

    constructor: THREE.CompressedTextureLoader,

    load: function (url, onLoad, onProgress, onError) {

        var scope = this;

        var images = [];

        var texture = new THREE.CompressedTexture();
        texture.image = images;

        var loader = new THREE.XHRLoader(this.manager);
        loader.setPath(this.path);
        loader.setResponseType('arraybuffer');

        function loadTexture(i) {

            loader.load(url[i], function (buffer) {

                var texDatas = scope._parser(buffer, true);

                images[i] = {
                    width: texDatas.width,
                    height: texDatas.height,
                    format: texDatas.format,
                    mipmaps: texDatas.mipmaps
                };

                loaded += 1;

                if (loaded === 6) {

                    if (texDatas.mipmapCount === 1)
                        texture.minFilter = THREE.LinearFilter;

                    texture.format = texDatas.format;
                    texture.needsUpdate = true;

                    if (onLoad) onLoad(texture);

                }

            }, onProgress, onError);

        }

        if (Array.isArray(url)) {

            var loaded = 0;

            for (var i = 0, il = url.length; i < il; ++i) {

                loadTexture(i);

            }

        } else {

            // compressed cubemap texture stored in a single DDS file

            loader.load(url, function (buffer) {

                var texDatas = scope._parser(buffer, true);

                if (texDatas.isCubemap) {

                    var faces = texDatas.mipmaps.length / texDatas.mipmapCount;

                    for (var f = 0; f < faces; f++) {

                        images[f] = {
                            mipmaps: []
                        };

                        for (var i = 0; i < texDatas.mipmapCount; i++) {

                            images[f].mipmaps.push(texDatas.mipmaps[f * texDatas.mipmapCount + i]);
                            images[f].format = texDatas.format;
                            images[f].width = texDatas.width;
                            images[f].height = texDatas.height;

                        }

                    }

                } else {

                    texture.image.width = texDatas.width;
                    texture.image.height = texDatas.height;
                    texture.mipmaps = texDatas.mipmaps;

                }

                if (texDatas.mipmapCount === 1) {

                    texture.minFilter = THREE.LinearFilter;

                }

                texture.format = texDatas.format;
                texture.needsUpdate = true;

                if (onLoad) onLoad(texture);

            }, onProgress, onError);

        }

        return texture;

    },

    setPath: function (value) {

        this.path = value;

    }

};


/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.CubeTextureLoader = function (manager) {

    this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;

};

THREE.CubeTextureLoader.prototype = {

    constructor: THREE.CubeTextureLoader,

    load: function (urls, onLoad, onProgress, onError) {

        var texture = new THREE.CubeTexture([]);

        var loader = new THREE.ImageLoader(this.manager);
        loader.setCrossOrigin(this.crossOrigin);
        loader.setPath(this.path);

        var loaded = 0;

        function loadTexture(i) {

            loader.load(urls[i], function (image) {

                texture.images[i] = image;

                loaded++;

                if (loaded === 6) {

                    texture.needsUpdate = true;

                    if (onLoad) onLoad(texture);

                }

            }, undefined, onError);

        }

        for (var i = 0; i < urls.length; ++i) {

            loadTexture(i);

        }

        return texture;

    },

    setCrossOrigin: function (value) {

        this.crossOrigin = value;

    },

    setPath: function (value) {

        this.path = value;

    }

};


/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.FontLoader = function (manager) {

    this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;

};

THREE.FontLoader.prototype = {

    constructor: THREE.FontLoader,

    load: function (url, onLoad, onProgress, onError) {

        var loader = new THREE.XHRLoader(this.manager);
        loader.load(url, function (text) {

            onLoad(new THREE.Font(JSON.parse(text.substring(65, text.length - 2))));

        }, onProgress, onError);

    }

};


/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.ImageLoader = function (manager) {

    this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;

};

THREE.ImageLoader.prototype = {

    constructor: THREE.ImageLoader,

    load: function (url, onLoad, onProgress, onError) {

        if (this.path !== undefined) url = this.path + url;

        var scope = this;

        var cached = THREE.Cache.get(url);

        if (cached !== undefined) {

            scope.manager.itemStart(url);

            if (onLoad) {

                setTimeout(function () {

                    onLoad(cached);

                    scope.manager.itemEnd(url);

                }, 0);

            } else {

                scope.manager.itemEnd(url);

            }

            return cached;

        }

        var image = document.createElement('img');

        image.addEventListener('load', function (event) {

            THREE.Cache.add(url, this);

            if (onLoad) onLoad(this);

            scope.manager.itemEnd(url);

        }, false);

        if (onProgress !== undefined) {

            image.addEventListener('progress', function (event) {

                onProgress(event);

            }, false);

        }

        image.addEventListener('error', function (event) {

            if (onError) onError(event);

            scope.manager.itemError(url);

        }, false);

        if (this.crossOrigin !== undefined) image.crossOrigin = this.crossOrigin;

        scope.manager.itemStart(url);

        image.src = url;

        return image;

    },

    setCrossOrigin: function (value) {

        this.crossOrigin = value;

    },

    setPath: function (value) {

        this.path = value;

    }

};

/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.XHRLoader = function (manager) {

    this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;

};

THREE.XHRLoader.prototype = {

    constructor: THREE.XHRLoader,

    load: function (url, onLoad, onProgress, onError) {

        if (this.path !== undefined) url = this.path + url;

        var scope = this;

        var cached = THREE.Cache.get(url);

        if (cached !== undefined) {

            if (onLoad) {

                setTimeout(function () {

                    onLoad(cached);

                }, 0);

            }

            return cached;

        }

        var request = new XMLHttpRequest();
        request.overrideMimeType('text/plain');
        request.open('GET', url, true);

        request.addEventListener('load', function (event) {

            var response = event.target.response;

            THREE.Cache.add(url, response);

            if (this.status === 200) {

                if (onLoad) onLoad(response);

                scope.manager.itemEnd(url);

            } else if (this.status === 0) {

                // Some browsers return HTTP Status 0 when using non-http protocol
                // e.g. 'file://' or 'data://'. Handle as success.

                console.warn('THREE.XHRLoader: HTTP Status 0 received.');

                if (onLoad) onLoad(response);

                scope.manager.itemEnd(url);

            } else {

                if (onError) onError(event);

                scope.manager.itemError(url);

            }

        }, false);

        if (onProgress !== undefined) {

            request.addEventListener('progress', function (event) {

                onProgress(event);

            }, false);

        }

        request.addEventListener('error', function (event) {

            if (onError) onError(event);

            scope.manager.itemError(url);

        }, false);

        if (this.responseType !== undefined) request.responseType = this.responseType;
        if (this.withCredentials !== undefined) request.withCredentials = this.withCredentials;

        request.send(null);

        scope.manager.itemStart(url);

        return request;

    },

    setPath: function (value) {

        this.path = value;

    },

    setResponseType: function (value) {

        this.responseType = value;

    },

    setWithCredentials: function (value) {

        this.withCredentials = value;

    }

};


/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.LoadingManager = function (onLoad, onProgress, onError) {

    var scope = this;

    var isLoading = false,
        itemsLoaded = 0,
        itemsTotal = 0;

    this.onStart = undefined;
    this.onLoad = onLoad;
    this.onProgress = onProgress;
    this.onError = onError;

    this.itemStart = function (url) {

        itemsTotal++;

        if (isLoading === false) {

            if (scope.onStart !== undefined) {

                scope.onStart(url, itemsLoaded, itemsTotal);

            }

        }

        isLoading = true;

    };

    this.itemEnd = function (url) {

        itemsLoaded++;

        if (scope.onProgress !== undefined) {

            scope.onProgress(url, itemsLoaded, itemsTotal);

        }

        if (itemsLoaded === itemsTotal) {

            isLoading = false;

            if (scope.onLoad !== undefined) {

                scope.onLoad();

            }

        }

    };

    this.itemError = function (url) {

        if (scope.onError !== undefined) {

            scope.onError(url);

        }

    };

};

THREE.DefaultLoadingManager = new THREE.LoadingManager();


/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.MaterialLoader = function (manager) {

    this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;
    this.textures = {};

};

THREE.MaterialLoader.prototype = {

    constructor: THREE.MaterialLoader,

    load: function (url, onLoad, onProgress, onError) {

        var scope = this;

        var loader = new THREE.XHRLoader(scope.manager);
        loader.load(url, function (text) {

            onLoad(scope.parse(JSON.parse(text)));

        }, onProgress, onError);

    },

    setTextures: function (value) {

        this.textures = value;

    },

    getTexture: function (name) {

        var textures = this.textures;

        if (textures[name] === undefined) {

            console.warn('THREE.MaterialLoader: Undefined texture', name);

        }

        return textures[name];

    },

    parse: function (json) {

        var material = new THREE[json.type];

        if (json.uuid !== undefined) material.uuid = json.uuid;
        if (json.name !== undefined) material.name = json.name;
        if (json.color !== undefined) material.color.setHex(json.color);
        if (json.roughness !== undefined) material.roughness = json.roughness;
        if (json.metalness !== undefined) material.metalness = json.metalness;
        if (json.emissive !== undefined) material.emissive.setHex(json.emissive);
        if (json.specular !== undefined) material.specular.setHex(json.specular);
        if (json.shininess !== undefined) material.shininess = json.shininess;
        if (json.uniforms !== undefined) material.uniforms = json.uniforms;
        if (json.vertexShader !== undefined) material.vertexShader = json.vertexShader;
        if (json.fragmentShader !== undefined) material.fragmentShader = json.fragmentShader;
        if (json.vertexColors !== undefined) material.vertexColors = json.vertexColors;
        if (json.shading !== undefined) material.shading = json.shading;
        if (json.blending !== undefined) material.blending = json.blending;
        if (json.side !== undefined) material.side = json.side;
        if (json.opacity !== undefined) material.opacity = json.opacity;
        if (json.transparent !== undefined) material.transparent = json.transparent;
        if (json.alphaTest !== undefined) material.alphaTest = json.alphaTest;
        if (json.depthTest !== undefined) material.depthTest = json.depthTest;
        if (json.depthWrite !== undefined) material.depthWrite = json.depthWrite;
        if (json.colorWrite !== undefined) material.colorWrite = json.colorWrite;
        if (json.wireframe !== undefined) material.wireframe = json.wireframe;
        if (json.wireframeLinewidth !== undefined) material.wireframeLinewidth = json.wireframeLinewidth;

        // for PointsMaterial
        if (json.size !== undefined) material.size = json.size;
        if (json.sizeAttenuation !== undefined) material.sizeAttenuation = json.sizeAttenuation;

        // maps

        if (json.map !== undefined) material.map = this.getTexture(json.map);

        if (json.alphaMap !== undefined) {

            material.alphaMap = this.getTexture(json.alphaMap);
            material.transparent = true;

        }

        if (json.bumpMap !== undefined) material.bumpMap = this.getTexture(json.bumpMap);
        if (json.bumpScale !== undefined) material.bumpScale = json.bumpScale;

        if (json.normalMap !== undefined) material.normalMap = this.getTexture(json.normalMap);
        if (json.normalScale !== undefined) {

            var normalScale = json.normalScale;

            if (Array.isArray(normalScale) === false) {

                // Blender exporter used to export a scalar. See #7459

                normalScale = [normalScale, normalScale];

            }

            material.normalScale = new THREE.Vector2().fromArray(normalScale);

        }

        if (json.displacementMap !== undefined) material.displacementMap = this.getTexture(json.displacementMap);
        if (json.displacementScale !== undefined) material.displacementScale = json.displacementScale;
        if (json.displacementBias !== undefined) material.displacementBias = json.displacementBias;

        if (json.roughnessMap !== undefined) material.roughnessMap = this.getTexture(json.roughnessMap);
        if (json.metalnessMap !== undefined) material.metalnessMap = this.getTexture(json.metalnessMap);

        if (json.emissiveMap !== undefined) material.emissiveMap = this.getTexture(json.emissiveMap);
        if (json.emissiveIntensity !== undefined) material.emissiveIntensity = json.emissiveIntensity;

        if (json.specularMap !== undefined) material.specularMap = this.getTexture(json.specularMap);

        if (json.envMap !== undefined) {

            material.envMap = this.getTexture(json.envMap);
            material.combine = THREE.MultiplyOperation;

        }

        if (json.reflectivity) material.reflectivity = json.reflectivity;

        if (json.lightMap !== undefined) material.lightMap = this.getTexture(json.lightMap);
        if (json.lightMapIntensity !== undefined) material.lightMapIntensity = json.lightMapIntensity;

        if (json.aoMap !== undefined) material.aoMap = this.getTexture(json.aoMap);
        if (json.aoMapIntensity !== undefined) material.aoMapIntensity = json.aoMapIntensity;

        // MultiMaterial

        if (json.materials !== undefined) {

            for (var i = 0, l = json.materials.length; i < l; i++) {

                material.materials.push(this.parse(json.materials[i]));

            }

        }

        return material;

    }

};


/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.ObjectLoader = function (manager) {

    this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;
    this.texturePath = '';

};

THREE.ObjectLoader.prototype = {

    constructor: THREE.ObjectLoader,

    load: function (url, onLoad, onProgress, onError) {

        if (this.texturePath === '') {

            this.texturePath = url.substring(0, url.lastIndexOf('/') + 1);

        }

        var scope = this;

        var loader = new THREE.XHRLoader(scope.manager);
        loader.load(url, function (text) {

            scope.parse(JSON.parse(text), onLoad);

        }, onProgress, onError);

    },

    setTexturePath: function (value) {

        this.texturePath = value;

    },

    setCrossOrigin: function (value) {

        this.crossOrigin = value;

    },

    parse: function (json, onLoad) {

        var geometries = this.parseGeometries(json.geometries);

        var images = this.parseImages(json.images, function () {

            if (onLoad !== undefined) onLoad(object);

        });

        var textures = this.parseTextures(json.textures, images);
        var materials = this.parseMaterials(json.materials, textures);

        var object = this.parseObject(json.object, geometries, materials);

        if (json.animations) {

            object.animations = this.parseAnimations(json.animations);

        }

        if (json.images === undefined || json.images.length === 0) {

            if (onLoad !== undefined) onLoad(object);

        }

        return object;

    },

    parseGeometries: function (json) {

        var geometries = {};

        if (json !== undefined) {

            var geometryLoader = new THREE.JSONLoader();
            var bufferGeometryLoader = new THREE.BufferGeometryLoader();

            for (var i = 0, l = json.length; i < l; i++) {

                var geometry;
                var data = json[i];

                switch (data.type) {

                case 'PlaneGeometry':
                case 'PlaneBufferGeometry':

                    geometry = new THREE[data.type](
                        data.width,
                        data.height,
                        data.widthSegments,
                        data.heightSegments
                    );

                    break;

                case 'BoxGeometry':
                case 'CubeGeometry': // backwards compatible

                    geometry = new THREE.BoxGeometry(
                        data.width,
                        data.height,
                        data.depth,
                        data.widthSegments,
                        data.heightSegments,
                        data.depthSegments
                    );

                    break;

                case 'CircleBufferGeometry':

                    geometry = new THREE.CircleBufferGeometry(
                        data.radius,
                        data.segments,
                        data.thetaStart,
                        data.thetaLength
                    );

                    break;

                case 'CircleGeometry':

                    geometry = new THREE.CircleGeometry(
                        data.radius,
                        data.segments,
                        data.thetaStart,
                        data.thetaLength
                    );

                    break;

                case 'CylinderGeometry':

                    geometry = new THREE.CylinderGeometry(
                        data.radiusTop,
                        data.radiusBottom,
                        data.height,
                        data.radialSegments,
                        data.heightSegments,
                        data.openEnded,
                        data.thetaStart,
                        data.thetaLength
                    );

                    break;

                case 'SphereGeometry':

                    geometry = new THREE.SphereGeometry(
                        data.radius,
                        data.widthSegments,
                        data.heightSegments,
                        data.phiStart,
                        data.phiLength,
                        data.thetaStart,
                        data.thetaLength
                    );

                    break;

                case 'SphereBufferGeometry':

                    geometry = new THREE.SphereBufferGeometry(
                        data.radius,
                        data.widthSegments,
                        data.heightSegments,
                        data.phiStart,
                        data.phiLength,
                        data.thetaStart,
                        data.thetaLength
                    );

                    break;

                case 'DodecahedronGeometry':

                    geometry = new THREE.DodecahedronGeometry(
                        data.radius,
                        data.detail
                    );

                    break;

                case 'IcosahedronGeometry':

                    geometry = new THREE.IcosahedronGeometry(
                        data.radius,
                        data.detail
                    );

                    break;

                case 'OctahedronGeometry':

                    geometry = new THREE.OctahedronGeometry(
                        data.radius,
                        data.detail
                    );

                    break;

                case 'TetrahedronGeometry':

                    geometry = new THREE.TetrahedronGeometry(
                        data.radius,
                        data.detail
                    );

                    break;

                case 'RingGeometry':

                    geometry = new THREE.RingGeometry(
                        data.innerRadius,
                        data.outerRadius,
                        data.thetaSegments,
                        data.phiSegments,
                        data.thetaStart,
                        data.thetaLength
                    );

                    break;

                case 'TorusGeometry':

                    geometry = new THREE.TorusGeometry(
                        data.radius,
                        data.tube,
                        data.radialSegments,
                        data.tubularSegments,
                        data.arc
                    );

                    break;

                case 'TorusKnotGeometry':

                    geometry = new THREE.TorusKnotGeometry(
                        data.radius,
                        data.tube,
                        data.radialSegments,
                        data.tubularSegments,
                        data.p,
                        data.q,
                        data.heightScale
                    );

                    break;

                case 'LatheGeometry':

                    geometry = new THREE.LatheGeometry(
                        data.points,
                        data.segments,
                        data.phiStart,
                        data.phiLength
                    );

                    break;

                case 'BufferGeometry':

                    geometry = bufferGeometryLoader.parse(data);

                    break;

                case 'Geometry':

                    geometry = geometryLoader.parse(data.data, this.texturePath).geometry;

                    break;

                default:

                    console.warn('THREE.ObjectLoader: Unsupported geometry type "' + data.type + '"');

                    continue;

                }

                geometry.uuid = data.uuid;

                if (data.name !== undefined) geometry.name = data.name;

                geometries[data.uuid] = geometry;

            }

        }

        return geometries;

    },

    parseMaterials: function (json, textures) {

        var materials = {};

        if (json !== undefined) {

            var loader = new THREE.MaterialLoader();
            loader.setTextures(textures);

            for (var i = 0, l = json.length; i < l; i++) {

                var material = loader.parse(json[i]);
                materials[material.uuid] = material;

            }

        }

        return materials;

    },

    parseAnimations: function (json) {

        var animations = [];

        for (var i = 0; i < json.length; i++) {

            var clip = THREE.AnimationClip.parse(json[i]);

            animations.push(clip);

        }

        return animations;

    },

    parseImages: function (json, onLoad) {

        var scope = this;
        var images = {};

        function loadImage(url) {

            scope.manager.itemStart(url);

            return loader.load(url, function () {

                scope.manager.itemEnd(url);

            });

        }

        if (json !== undefined && json.length > 0) {

            var manager = new THREE.LoadingManager(onLoad);

            var loader = new THREE.ImageLoader(manager);
            loader.setCrossOrigin(this.crossOrigin);

            for (var i = 0, l = json.length; i < l; i++) {

                var image = json[i];
                var path = /^(\/\/)|([a-z]+:(\/\/)?)/i.test(image.url) ? image.url : scope.texturePath + image.url;

                images[image.uuid] = loadImage(path);

            }

        }

        return images;

    },

    parseTextures: function (json, images) {

        function parseConstant(value) {

            if (typeof (value) === 'number') return value;

            console.warn('THREE.ObjectLoader.parseTexture: Constant should be in numeric form.', value);

            return THREE[value];

        }

        var textures = {};

        if (json !== undefined) {

            for (var i = 0, l = json.length; i < l; i++) {

                var data = json[i];

                if (data.image === undefined) {

                    console.warn('THREE.ObjectLoader: No "image" specified for', data.uuid);

                }

                if (images[data.image] === undefined) {

                    console.warn('THREE.ObjectLoader: Undefined image', data.image);

                }

                var texture = new THREE.Texture(images[data.image]);
                texture.needsUpdate = true;

                texture.uuid = data.uuid;

                if (data.name !== undefined) texture.name = data.name;
                if (data.mapping !== undefined) texture.mapping = parseConstant(data.mapping);
                if (data.offset !== undefined) texture.offset = new THREE.Vector2(data.offset[0], data.offset[1]);
                if (data.repeat !== undefined) texture.repeat = new THREE.Vector2(data.repeat[0], data.repeat[1]);
                if (data.minFilter !== undefined) texture.minFilter = parseConstant(data.minFilter);
                if (data.magFilter !== undefined) texture.magFilter = parseConstant(data.magFilter);
                if (data.anisotropy !== undefined) texture.anisotropy = data.anisotropy;
                if (Array.isArray(data.wrap)) {

                    texture.wrapS = parseConstant(data.wrap[0]);
                    texture.wrapT = parseConstant(data.wrap[1]);

                }

                textures[data.uuid] = texture;

            }

        }

        return textures;

    },

    parseObject: function () {

        var matrix = new THREE.Matrix4();

        return function (data, geometries, materials) {

            var object;

            function getGeometry(name) {

                if (geometries[name] === undefined) {

                    console.warn('THREE.ObjectLoader: Undefined geometry', name);

                }

                return geometries[name];

            }

            function getMaterial(name) {

                if (name === undefined) return undefined;

                if (materials[name] === undefined) {

                    console.warn('THREE.ObjectLoader: Undefined material', name);

                }

                return materials[name];

            }

            switch (data.type) {

            case 'Scene':

                object = new THREE.Scene();

                break;

            case 'PerspectiveCamera':

                object = new THREE.PerspectiveCamera(data.fov, data.aspect, data.near, data.far);

                break;

            case 'OrthographicCamera':

                object = new THREE.OrthographicCamera(data.left, data.right, data.top, data.bottom, data.near, data.far);

                break;

            case 'AmbientLight':

                object = new THREE.AmbientLight(data.color, data.intensity);

                break;

            case 'DirectionalLight':

                object = new THREE.DirectionalLight(data.color, data.intensity);

                break;

            case 'PointLight':

                object = new THREE.PointLight(data.color, data.intensity, data.distance, data.decay);

                break;

            case 'SpotLight':

                object = new THREE.SpotLight(data.color, data.intensity, data.distance, data.angle, data.penumbra, data.decay);

                break;

            case 'HemisphereLight':

                object = new THREE.HemisphereLight(data.color, data.groundColor, data.intensity);

                break;

            case 'Mesh':

                var geometry = getGeometry(data.geometry);
                var material = getMaterial(data.material);

                if (geometry.bones && geometry.bones.length > 0) {

                    object = new THREE.SkinnedMesh(geometry, material);

                } else {

                    object = new THREE.Mesh(geometry, material);

                }

                break;

            case 'LOD':

                object = new THREE.LOD();

                break;

            case 'Line':

                object = new THREE.Line(getGeometry(data.geometry), getMaterial(data.material), data.mode);

                break;

            case 'PointCloud':
            case 'Points':

                object = new THREE.Points(getGeometry(data.geometry), getMaterial(data.material));

                break;

            case 'Sprite':

                object = new THREE.Sprite(getMaterial(data.material));

                break;

            case 'Group':

                object = new THREE.Group();

                break;

            default:

                object = new THREE.Object3D();

            }

            object.uuid = data.uuid;

            if (data.name !== undefined) object.name = data.name;
            if (data.matrix !== undefined) {

                matrix.fromArray(data.matrix);
                matrix.decompose(object.position, object.quaternion, object.scale);

            } else {

                if (data.position !== undefined) object.position.fromArray(data.position);
                if (data.rotation !== undefined) object.rotation.fromArray(data.rotation);
                if (data.scale !== undefined) object.scale.fromArray(data.scale);

            }

            if (data.castShadow !== undefined) object.castShadow = data.castShadow;
            if (data.receiveShadow !== undefined) object.receiveShadow = data.receiveShadow;

            if (data.visible !== undefined) object.visible = data.visible;
            if (data.userData !== undefined) object.userData = data.userData;

            if (data.children !== undefined) {

                for (var child in data.children) {

                    object.add(this.parseObject(data.children[child], geometries, materials));

                }

            }

            if (data.type === 'LOD') {

                var levels = data.levels;

                for (var l = 0; l < levels.length; l++) {

                    var level = levels[l];
                    var child = object.getObjectByProperty('uuid', level.object);

                    if (child !== undefined) {

                        object.addLevel(child, level.distance);

                    }

                }

            }

            return object;

        }

    }()

};


/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.TextureLoader = function (manager) {

    this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;

};

THREE.TextureLoader.prototype = {

    constructor: THREE.TextureLoader,

    load: function (url, onLoad, onProgress, onError) {

        var texture = new THREE.Texture();

        var loader = new THREE.ImageLoader(this.manager);
        loader.setCrossOrigin(this.crossOrigin);
        loader.setPath(this.path);
        loader.load(url, function (image) {

            texture.image = image;
            texture.needsUpdate = true;

            if (onLoad !== undefined) {

                onLoad(texture);

            }

        }, onProgress, onError);

        return texture;

    },

    setCrossOrigin: function (value) {

        this.crossOrigin = value;

    },

    setPath: function (value) {

        this.path = value;

    }

};

/**
 *
 * A Track of vectored keyframe values.
 *
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 * @author tschw
 */

THREE.VectorKeyframeTrack = function (name, times, values, interpolation) {

    THREE.KeyframeTrack.call(this, name, times, values, interpolation);

};

THREE.VectorKeyframeTrack.prototype =
    Object.assign(Object.create(THREE.KeyframeTrack.prototype), {

        constructor: THREE.VectorKeyframeTrack,

        ValueTypeName: 'vector'

        // ValueBufferType is inherited

        // DefaultInterpolation is inherited

    });

/**
 *
 * A Track of Boolean keyframe values.
 *
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 * @author tschw
 */

THREE.BooleanKeyframeTrack = function (name, times, values) {

    THREE.KeyframeTrack.call(this, name, times, values);

};

THREE.BooleanKeyframeTrack.prototype =
    Object.assign(Object.create(THREE.KeyframeTrack.prototype), {

        constructor: THREE.BooleanKeyframeTrack,

        ValueTypeName: 'bool',
        ValueBufferType: Array,

        DefaultInterpolation: THREE.IntepolateDiscrete,

        InterpolantFactoryMethodLinear: undefined,
        InterpolantFactoryMethodSmooth: undefined

        // Note: Actually this track could have a optimized / compressed
        // representation of a single value and a custom interpolant that
        // computes "firstValue ^ isOdd( index )".

    });


/**
 *
 * A Track of keyframe values that represent color.
 *
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 * @author tschw
 */

THREE.ColorKeyframeTrack = function (name, times, values, interpolation) {

    THREE.KeyframeTrack.call(this, name, times, values, interpolation);

};

THREE.ColorKeyframeTrack.prototype =
    Object.assign(Object.create(THREE.KeyframeTrack.prototype), {

        constructor: THREE.ColorKeyframeTrack,

        ValueTypeName: 'color'

        // ValueBufferType is inherited

        // DefaultInterpolation is inherited


        // Note: Very basic implementation and nothing special yet.
        // However, this is the place for color space parameterization.

    });


/**
 *
 * A Track of numeric keyframe values.
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 * @author tschw
 */

THREE.NumberKeyframeTrack = function (name, times, values, interpolation) {

    THREE.KeyframeTrack.call(this, name, times, values, interpolation);

};

THREE.NumberKeyframeTrack.prototype =
    Object.assign(Object.create(THREE.KeyframeTrack.prototype), {

        constructor: THREE.NumberKeyframeTrack,

        ValueTypeName: 'number',

        // ValueBufferType is inherited

        // DefaultInterpolation is inherited

    });


/**
 *
 * A Track of quaternion keyframe values.
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 * @author tschw
 */

THREE.QuaternionKeyframeTrack = function (name, times, values, interpolation) {

    THREE.KeyframeTrack.call(this, name, times, values, interpolation);

};

THREE.QuaternionKeyframeTrack.prototype =
    Object.assign(Object.create(THREE.KeyframeTrack.prototype), {

        constructor: THREE.QuaternionKeyframeTrack,

        ValueTypeName: 'quaternion',

        // ValueBufferType is inherited

        DefaultInterpolation: THREE.InterpolateLinear,

        InterpolantFactoryMethodLinear: function (result) {

            return new THREE.QuaternionLinearInterpolant(
                this.times, this.values, this.getValueSize(), result);

        },

        InterpolantFactoryMethodSmooth: undefined // not yet implemented

    });


/**
 *
 * A Track that interpolates Strings
 *
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 * @author tschw
 */

THREE.StringKeyframeTrack = function (name, times, values, interpolation) {

    THREE.KeyframeTrack.call(this, name, times, values, interpolation);

};

THREE.StringKeyframeTrack.prototype =
    Object.assign(Object.create(THREE.KeyframeTrack.prototype), {

        constructor: THREE.StringKeyframeTrack,

        ValueTypeName: 'string',
        ValueBufferType: Array,

        DefaultInterpolation: THREE.IntepolateDiscrete,

        InterpolantFactoryMethodLinear: undefined,

        InterpolantFactoryMethodSmooth: undefined

    });

/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.MultiMaterial = function (materials) {

    this.uuid = THREE.Math.generateUUID();

    this.type = 'MultiMaterial';

    this.materials = materials instanceof Array ? materials : [];

    this.visible = true;

};

THREE.MultiMaterial.prototype = {

    constructor: THREE.MultiMaterial,

    toJSON: function (meta) {

        var output = {
            metadata: {
                version: 4.2,
                type: 'material',
                generator: 'MaterialExporter'
            },
            uuid: this.uuid,
            type: this.type,
            materials: []
        };

        var materials = this.materials;

        for (var i = 0, l = materials.length; i < l; i++) {

            var material = materials[i].toJSON(meta);
            delete material.metadata;

            output.materials.push(material);

        }

        output.visible = this.visible;

        return output;

    },

    clone: function () {

        var material = new this.constructor();

        for (var i = 0; i < this.materials.length; i++) {

            material.materials.push(this.materials[i].clone());

        }

        material.visible = this.visible;

        return material;

    }

};

THREE.MeshFaceMaterial = THREE.MultiMaterial;

/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.Color = function (color) {

    if (arguments.length === 3) {

        return this.fromArray(arguments);

    }

    return this.set(color);

};

THREE.Color.prototype = {

    constructor: THREE.Color,

    r: 1,
    g: 1,
    b: 1,

    set: function (value) {

        if (value instanceof THREE.Color) {

            this.copy(value);

        } else if (typeof value === 'number') {

            this.setHex(value);

        } else if (typeof value === 'string') {

            this.setStyle(value);

        }

        return this;

    },

    setScalar: function (scalar) {

        this.r = scalar;
        this.g = scalar;
        this.b = scalar;

    },

    setHex: function (hex) {

        hex = Math.floor(hex);

        this.r = (hex >> 16 & 255) / 255;
        this.g = (hex >> 8 & 255) / 255;
        this.b = (hex & 255) / 255;

        return this;

    },

    setRGB: function (r, g, b) {

        this.r = r;
        this.g = g;
        this.b = b;

        return this;

    },

    setHSL: function () {

        function hue2rgb(p, q, t) {

            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * 6 * (2 / 3 - t);
            return p;

        }

        return function (h, s, l) {

            // h,s,l ranges are in 0.0 - 1.0
            h = THREE.Math.euclideanModulo(h, 1);
            s = THREE.Math.clamp(s, 0, 1);
            l = THREE.Math.clamp(l, 0, 1);

            if (s === 0) {

                this.r = this.g = this.b = l;

            } else {

                var p = l <= 0.5 ? l * (1 + s) : l + s - (l * s);
                var q = (2 * l) - p;

                this.r = hue2rgb(q, p, h + 1 / 3);
                this.g = hue2rgb(q, p, h);
                this.b = hue2rgb(q, p, h - 1 / 3);

            }

            return this;

        };

    }(),

    setStyle: function (style) {

        function handleAlpha(string) {

            if (string === undefined) return;

            if (parseFloat(string) < 1) {

                console.warn('THREE.Color: Alpha component of ' + style + ' will be ignored.');

            }

        }


        var m;

        if (m = /^((?:rgb|hsl)a?)\(\s*([^\)]*)\)/.exec(style)) {

            // rgb / hsl

            var color;
            var name = m[1];
            var components = m[2];

            switch (name) {

            case 'rgb':
            case 'rgba':

                if (color = /^(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*([0-9]*\.?[0-9]+)\s*)?$/.exec(components)) {

                    // rgb(255,0,0) rgba(255,0,0,0.5)
                    this.r = Math.min(255, parseInt(color[1], 10)) / 255;
                    this.g = Math.min(255, parseInt(color[2], 10)) / 255;
                    this.b = Math.min(255, parseInt(color[3], 10)) / 255;

                    handleAlpha(color[5]);

                    return this;

                }

                if (color = /^(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(,\s*([0-9]*\.?[0-9]+)\s*)?$/.exec(components)) {

                    // rgb(100%,0%,0%) rgba(100%,0%,0%,0.5)
                    this.r = Math.min(100, parseInt(color[1], 10)) / 100;
                    this.g = Math.min(100, parseInt(color[2], 10)) / 100;
                    this.b = Math.min(100, parseInt(color[3], 10)) / 100;

                    handleAlpha(color[5]);

                    return this;

                }

                break;

            case 'hsl':
            case 'hsla':

                if (color = /^([0-9]*\.?[0-9]+)\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(,\s*([0-9]*\.?[0-9]+)\s*)?$/.exec(components)) {

                    // hsl(120,50%,50%) hsla(120,50%,50%,0.5)
                    var h = parseFloat(color[1]) / 360;
                    var s = parseInt(color[2], 10) / 100;
                    var l = parseInt(color[3], 10) / 100;

                    handleAlpha(color[5]);

                    return this.setHSL(h, s, l);

                }

                break;

            }

        } else if (m = /^\#([A-Fa-f0-9]+)$/.exec(style)) {

            // hex color

            var hex = m[1];
            var size = hex.length;

            if (size === 3) {

                // #ff0
                this.r = parseInt(hex.charAt(0) + hex.charAt(0), 16) / 255;
                this.g = parseInt(hex.charAt(1) + hex.charAt(1), 16) / 255;
                this.b = parseInt(hex.charAt(2) + hex.charAt(2), 16) / 255;

                return this;

            } else if (size === 6) {

                // #ff0000
                this.r = parseInt(hex.charAt(0) + hex.charAt(1), 16) / 255;
                this.g = parseInt(hex.charAt(2) + hex.charAt(3), 16) / 255;
                this.b = parseInt(hex.charAt(4) + hex.charAt(5), 16) / 255;

                return this;

            }

        }

        if (style && style.length > 0) {

            // color keywords
            var hex = THREE.ColorKeywords[style];

            if (hex !== undefined) {

                // red
                this.setHex(hex);

            } else {

                // unknown color
                console.warn('THREE.Color: Unknown color ' + style);

            }

        }

        return this;

    },

    clone: function () {

        return new this.constructor(this.r, this.g, this.b);

    },

    copy: function (color) {

        this.r = color.r;
        this.g = color.g;
        this.b = color.b;

        return this;

    },

    copyGammaToLinear: function (color, gammaFactor) {

        if (gammaFactor === undefined) gammaFactor = 2.0;

        this.r = Math.pow(color.r, gammaFactor);
        this.g = Math.pow(color.g, gammaFactor);
        this.b = Math.pow(color.b, gammaFactor);

        return this;

    },

    copyLinearToGamma: function (color, gammaFactor) {

        if (gammaFactor === undefined) gammaFactor = 2.0;

        var safeInverse = (gammaFactor > 0) ? (1.0 / gammaFactor) : 1.0;

        this.r = Math.pow(color.r, safeInverse);
        this.g = Math.pow(color.g, safeInverse);
        this.b = Math.pow(color.b, safeInverse);

        return this;

    },

    convertGammaToLinear: function () {

        var r = this.r,
            g = this.g,
            b = this.b;

        this.r = r * r;
        this.g = g * g;
        this.b = b * b;

        return this;

    },

    convertLinearToGamma: function () {

        this.r = Math.sqrt(this.r);
        this.g = Math.sqrt(this.g);
        this.b = Math.sqrt(this.b);

        return this;

    },

    getHex: function () {

        return (this.r * 255) << 16 ^ (this.g * 255) << 8 ^ (this.b * 255) << 0;

    },

    getHexString: function () {

        return ('000000' + this.getHex().toString(16)).slice(-6);

    },

    getHSL: function (optionalTarget) {

        // h,s,l ranges are in 0.0 - 1.0

        var hsl = optionalTarget || {
            h: 0,
            s: 0,
            l: 0
        };

        var r = this.r,
            g = this.g,
            b = this.b;

        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);

        var hue, saturation;
        var lightness = (min + max) / 2.0;

        if (min === max) {

            hue = 0;
            saturation = 0;

        } else {

            var delta = max - min;

            saturation = lightness <= 0.5 ? delta / (max + min) : delta / (2 - max - min);

            switch (max) {

            case r:
                hue = (g - b) / delta + (g < b ? 6 : 0);
                break;
            case g:
                hue = (b - r) / delta + 2;
                break;
            case b:
                hue = (r - g) / delta + 4;
                break;

            }

            hue /= 6;

        }

        hsl.h = hue;
        hsl.s = saturation;
        hsl.l = lightness;

        return hsl;

    },

    getStyle: function () {

        return 'rgb(' + ((this.r * 255) | 0) + ',' + ((this.g * 255) | 0) + ',' + ((this.b * 255) | 0) + ')';

    },

    offsetHSL: function (h, s, l) {

        var hsl = this.getHSL();

        hsl.h += h;
        hsl.s += s;
        hsl.l += l;

        this.setHSL(hsl.h, hsl.s, hsl.l);

        return this;

    },

    add: function (color) {

        this.r += color.r;
        this.g += color.g;
        this.b += color.b;

        return this;

    },

    addColors: function (color1, color2) {

        this.r = color1.r + color2.r;
        this.g = color1.g + color2.g;
        this.b = color1.b + color2.b;

        return this;

    },

    addScalar: function (s) {

        this.r += s;
        this.g += s;
        this.b += s;

        return this;

    },

    multiply: function (color) {

        this.r *= color.r;
        this.g *= color.g;
        this.b *= color.b;

        return this;

    },

    multiplyScalar: function (s) {

        this.r *= s;
        this.g *= s;
        this.b *= s;

        return this;

    },

    lerp: function (color, alpha) {

        this.r += (color.r - this.r) * alpha;
        this.g += (color.g - this.g) * alpha;
        this.b += (color.b - this.b) * alpha;

        return this;

    },

    equals: function (c) {

        return (c.r === this.r) && (c.g === this.g) && (c.b === this.b);

    },

    fromArray: function (array, offset) {

        if (offset === undefined) offset = 0;

        this.r = array[offset];
        this.g = array[offset + 1];
        this.b = array[offset + 2];

        return this;

    },

    toArray: function (array, offset) {

        if (array === undefined) array = [];
        if (offset === undefined) offset = 0;

        array[offset] = this.r;
        array[offset + 1] = this.g;
        array[offset + 2] = this.b;

        return array;

    }

};

THREE.ColorKeywords = {
    'aliceblue': 0xF0F8FF,
    'antiquewhite': 0xFAEBD7,
    'aqua': 0x00FFFF,
    'aquamarine': 0x7FFFD4,
    'azure': 0xF0FFFF,
    'beige': 0xF5F5DC,
    'bisque': 0xFFE4C4,
    'black': 0x000000,
    'blanchedalmond': 0xFFEBCD,
    'blue': 0x0000FF,
    'blueviolet': 0x8A2BE2,
    'brown': 0xA52A2A,
    'burlywood': 0xDEB887,
    'cadetblue': 0x5F9EA0,
    'chartreuse': 0x7FFF00,
    'chocolate': 0xD2691E,
    'coral': 0xFF7F50,
    'cornflowerblue': 0x6495ED,
    'cornsilk': 0xFFF8DC,
    'crimson': 0xDC143C,
    'cyan': 0x00FFFF,
    'darkblue': 0x00008B,
    'darkcyan': 0x008B8B,
    'darkgoldenrod': 0xB8860B,
    'darkgray': 0xA9A9A9,
    'darkgreen': 0x006400,
    'darkgrey': 0xA9A9A9,
    'darkkhaki': 0xBDB76B,
    'darkmagenta': 0x8B008B,
    'darkolivegreen': 0x556B2F,
    'darkorange': 0xFF8C00,
    'darkorchid': 0x9932CC,
    'darkred': 0x8B0000,
    'darksalmon': 0xE9967A,
    'darkseagreen': 0x8FBC8F,
    'darkslateblue': 0x483D8B,
    'darkslategray': 0x2F4F4F,
    'darkslategrey': 0x2F4F4F,
    'darkturquoise': 0x00CED1,
    'darkviolet': 0x9400D3,
    'deeppink': 0xFF1493,
    'deepskyblue': 0x00BFFF,
    'dimgray': 0x696969,
    'dimgrey': 0x696969,
    'dodgerblue': 0x1E90FF,
    'firebrick': 0xB22222,
    'floralwhite': 0xFFFAF0,
    'forestgreen': 0x228B22,
    'fuchsia': 0xFF00FF,
    'gainsboro': 0xDCDCDC,
    'ghostwhite': 0xF8F8FF,
    'gold': 0xFFD700,
    'goldenrod': 0xDAA520,
    'gray': 0x808080,
    'green': 0x008000,
    'greenyellow': 0xADFF2F,
    'grey': 0x808080,
    'honeydew': 0xF0FFF0,
    'hotpink': 0xFF69B4,
    'indianred': 0xCD5C5C,
    'indigo': 0x4B0082,
    'ivory': 0xFFFFF0,
    'khaki': 0xF0E68C,
    'lavender': 0xE6E6FA,
    'lavenderblush': 0xFFF0F5,
    'lawngreen': 0x7CFC00,
    'lemonchiffon': 0xFFFACD,
    'lightblue': 0xADD8E6,
    'lightcoral': 0xF08080,
    'lightcyan': 0xE0FFFF,
    'lightgoldenrodyellow': 0xFAFAD2,
    'lightgray': 0xD3D3D3,
    'lightgreen': 0x90EE90,
    'lightgrey': 0xD3D3D3,
    'lightpink': 0xFFB6C1,
    'lightsalmon': 0xFFA07A,
    'lightseagreen': 0x20B2AA,
    'lightskyblue': 0x87CEFA,
    'lightslategray': 0x778899,
    'lightslategrey': 0x778899,
    'lightsteelblue': 0xB0C4DE,
    'lightyellow': 0xFFFFE0,
    'lime': 0x00FF00,
    'limegreen': 0x32CD32,
    'linen': 0xFAF0E6,
    'magenta': 0xFF00FF,
    'maroon': 0x800000,
    'mediumaquamarine': 0x66CDAA,
    'mediumblue': 0x0000CD,
    'mediumorchid': 0xBA55D3,
    'mediumpurple': 0x9370DB,
    'mediumseagreen': 0x3CB371,
    'mediumslateblue': 0x7B68EE,
    'mediumspringgreen': 0x00FA9A,
    'mediumturquoise': 0x48D1CC,
    'mediumvioletred': 0xC71585,
    'midnightblue': 0x191970,
    'mintcream': 0xF5FFFA,
    'mistyrose': 0xFFE4E1,
    'moccasin': 0xFFE4B5,
    'navajowhite': 0xFFDEAD,
    'navy': 0x000080,
    'oldlace': 0xFDF5E6,
    'olive': 0x808000,
    'olivedrab': 0x6B8E23,
    'orange': 0xFFA500,
    'orangered': 0xFF4500,
    'orchid': 0xDA70D6,
    'palegoldenrod': 0xEEE8AA,
    'palegreen': 0x98FB98,
    'paleturquoise': 0xAFEEEE,
    'palevioletred': 0xDB7093,
    'papayawhip': 0xFFEFD5,
    'peachpuff': 0xFFDAB9,
    'peru': 0xCD853F,
    'pink': 0xFFC0CB,
    'plum': 0xDDA0DD,
    'powderblue': 0xB0E0E6,
    'purple': 0x800080,
    'red': 0xFF0000,
    'rosybrown': 0xBC8F8F,
    'royalblue': 0x4169E1,
    'saddlebrown': 0x8B4513,
    'salmon': 0xFA8072,
    'sandybrown': 0xF4A460,
    'seagreen': 0x2E8B57,
    'seashell': 0xFFF5EE,
    'sienna': 0xA0522D,
    'silver': 0xC0C0C0,
    'skyblue': 0x87CEEB,
    'slateblue': 0x6A5ACD,
    'slategray': 0x708090,
    'slategrey': 0x708090,
    'snow': 0xFFFAFA,
    'springgreen': 0x00FF7F,
    'steelblue': 0x4682B4,
    'tan': 0xD2B48C,
    'teal': 0x008080,
    'thistle': 0xD8BFD8,
    'tomato': 0xFF6347,
    'turquoise': 0x40E0D0,
    'violet': 0xEE82EE,
    'wheat': 0xF5DEB3,
    'white': 0xFFFFFF,
    'whitesmoke': 0xF5F5F5,
    'yellow': 0xFFFF00,
    'yellowgreen': 0x9ACD32
};

/**
 * Abstract base class of interpolants over parametric samples.
 *
 * The parameter domain is one dimensional, typically the time or a path
 * along a curve defined by the data.
 *
 * The sample values can have any dimensionality and derived classes may
 * apply special interpretations to the data.
 *
 * This class provides the interval seek in a Template Method, deferring
 * the actual interpolation to derived classes.
 *
 * Time complexity is O(1) for linear access crossing at most two points
 * and O(log N) for random access, where N is the number of positions.
 *
 * References:
 *
 * 		http://www.oodesign.com/template-method-pattern.html
 *
 * @author tschw
 */

THREE.Interpolant = function (
    parameterPositions, sampleValues, sampleSize, resultBuffer) {

    this.parameterPositions = parameterPositions;
    this._cachedIndex = 0;

    this.resultBuffer = resultBuffer !== undefined ?
        resultBuffer : new sampleValues.constructor(sampleSize);
    this.sampleValues = sampleValues;
    this.valueSize = sampleSize;

};

THREE.Interpolant.prototype = {

    constructor: THREE.Interpolant,

    evaluate: function (t) {

        var pp = this.parameterPositions,
            i1 = this._cachedIndex,

            t1 = pp[i1],
            t0 = pp[i1 - 1];

        validate_interval: {

                seek: {

                    var right;

                    linear_scan: {
                            //- See http://jsperf.com/comparison-to-undefined/3
                            //- slower code:
                            //-
                            //- 				if ( t >= t1 || t1 === undefined ) {
                            forward_scan: if (!(t < t1)) {

                                    for (var giveUpAt = i1 + 2;;) {

                                        if (t1 === undefined) {

                                            if (t < t0) break forward_scan;

                                            // after end

                                            i1 = pp.length;
                                            this._cachedIndex = i1;
                                            return this.afterEnd_(i1 - 1, t, t0);

                                        }

                                        if (i1 === giveUpAt) break; // this loop

                                        t0 = t1;
                                        t1 = pp[++i1];

                                        if (t < t1) {

                                            // we have arrived at the sought interval
                                            break seek;

                                        }

                                    }

                                    // prepare binary search on the right side of the index
                                    right = pp.length;
                                    break linear_scan;

                                }

                                //- slower code:
                                //-					if ( t < t0 || t0 === undefined ) {
                            if (!(t >= t0)) {

                                // looping?

                                var t1global = pp[1];

                                if (t < t1global) {

                                    i1 = 2; // + 1, using the scan for the details
                                    t0 = t1global;

                                }

                                // linear reverse scan

                                for (var giveUpAt = i1 - 2;;) {

                                    if (t0 === undefined) {

                                        // before start

                                        this._cachedIndex = 0;
                                        return this.beforeStart_(0, t, t1);

                                    }

                                    if (i1 === giveUpAt) break; // this loop

                                    t1 = t0;
                                    t0 = pp[--i1 - 1];

                                    if (t >= t0) {

                                        // we have arrived at the sought interval
                                        break seek;

                                    }

                                }

                                // prepare binary search on the left side of the index
                                right = i1;
                                i1 = 0;
                                break linear_scan;

                            }

                            // the interval is valid

                            break validate_interval;

                        } // linear scan

                    // binary search

                    while (i1 < right) {

                        var mid = (i1 + right) >>> 1;

                        if (t < pp[mid]) {

                            right = mid;

                        } else {

                            i1 = mid + 1;

                        }

                    }

                    t1 = pp[i1];
                    t0 = pp[i1 - 1];

                    // check boundary cases, again

                    if (t0 === undefined) {

                        this._cachedIndex = 0;
                        return this.beforeStart_(0, t, t1);

                    }

                    if (t1 === undefined) {

                        i1 = pp.length;
                        this._cachedIndex = i1;
                        return this.afterEnd_(i1 - 1, t0, t);

                    }

                } // seek

                this._cachedIndex = i1;

                this.intervalChanged_(i1, t0, t1);

            } // validate_interval

        return this.interpolate_(i1, t0, t, t1);

    },

    settings: null, // optional, subclass-specific settings structure
    // Note: The indirection allows central control of many interpolants.

    // --- Protected interface

    DefaultSettings_: {},

    getSettings_: function () {

        return this.settings || this.DefaultSettings_;

    },

    copySampleValue_: function (index) {

        // copies a sample value to the result buffer

        var result = this.resultBuffer,
            values = this.sampleValues,
            stride = this.valueSize,
            offset = index * stride;

        for (var i = 0; i !== stride; ++i) {

            result[i] = values[offset + i];

        }

        return result;

    },

    // Template methods for derived classes:

    interpolate_: function (i1, t0, t, t1) {

        throw new Error("call to abstract method");
        // implementations shall return this.resultBuffer

    },

    intervalChanged_: function (i1, t0, t1) {

        // empty

    }

};

Object.assign(THREE.Interpolant.prototype, {

    beforeStart_: //( 0, t, t0 ), returns this.resultBuffer
        THREE.Interpolant.prototype.copySampleValue_,

    afterEnd_: //( N-1, tN-1, t ), returns this.resultBuffer
        THREE.Interpolant.prototype.copySampleValue_

});

/**
 *
 * Interpolant that evaluates to the sample value at the position preceeding
 * the parameter.
 *
 * @author tschw
 */

THREE.DiscreteInterpolant = function (
    parameterPositions, sampleValues, sampleSize, resultBuffer) {

    THREE.Interpolant.call(
        this, parameterPositions, sampleValues, sampleSize, resultBuffer);

};

THREE.DiscreteInterpolant.prototype =
    Object.assign(Object.create(THREE.Interpolant.prototype), {

        constructor: THREE.DiscreteInterpolant,

        interpolate_: function (i1, t0, t, t1) {

            return this.copySampleValue_(i1 - 1);

        }

    });

/**
 * @author mikael emtinger / http://gomo.se/
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author bhouston / http://clara.io
 */

THREE.Quaternion = function (x, y, z, w) {

    this._x = x || 0;
    this._y = y || 0;
    this._z = z || 0;
    this._w = (w !== undefined) ? w : 1;

};

THREE.Quaternion.prototype = {

    constructor: THREE.Quaternion,

    get x() {

        return this._x;

    },

    set x(value) {

        this._x = value;
        this.onChangeCallback();

    },

    get y() {

        return this._y;

    },

    set y(value) {

        this._y = value;
        this.onChangeCallback();

    },

    get z() {

        return this._z;

    },

    set z(value) {

        this._z = value;
        this.onChangeCallback();

    },

    get w() {

        return this._w;

    },

    set w(value) {

        this._w = value;
        this.onChangeCallback();

    },

    set: function (x, y, z, w) {

        this._x = x;
        this._y = y;
        this._z = z;
        this._w = w;

        this.onChangeCallback();

        return this;

    },

    clone: function () {

        return new this.constructor(this._x, this._y, this._z, this._w);

    },

    copy: function (quaternion) {

        this._x = quaternion.x;
        this._y = quaternion.y;
        this._z = quaternion.z;
        this._w = quaternion.w;

        this.onChangeCallback();

        return this;

    },

    setFromEuler: function (euler, update) {

        if (euler instanceof THREE.Euler === false) {

            throw new Error('THREE.Quaternion: .setFromEuler() now expects a Euler rotation rather than a Vector3 and order.');

        }

        // http://www.mathworks.com/matlabcentral/fileexchange/
        // 	20696-function-to-convert-between-dcm-euler-angles-quaternions-and-euler-vectors/
        //	content/SpinCalc.m

        var c1 = Math.cos(euler._x / 2);
        var c2 = Math.cos(euler._y / 2);
        var c3 = Math.cos(euler._z / 2);
        var s1 = Math.sin(euler._x / 2);
        var s2 = Math.sin(euler._y / 2);
        var s3 = Math.sin(euler._z / 2);

        var order = euler.order;

        if (order === 'XYZ') {

            this._x = s1 * c2 * c3 + c1 * s2 * s3;
            this._y = c1 * s2 * c3 - s1 * c2 * s3;
            this._z = c1 * c2 * s3 + s1 * s2 * c3;
            this._w = c1 * c2 * c3 - s1 * s2 * s3;

        } else if (order === 'YXZ') {

            this._x = s1 * c2 * c3 + c1 * s2 * s3;
            this._y = c1 * s2 * c3 - s1 * c2 * s3;
            this._z = c1 * c2 * s3 - s1 * s2 * c3;
            this._w = c1 * c2 * c3 + s1 * s2 * s3;

        } else if (order === 'ZXY') {

            this._x = s1 * c2 * c3 - c1 * s2 * s3;
            this._y = c1 * s2 * c3 + s1 * c2 * s3;
            this._z = c1 * c2 * s3 + s1 * s2 * c3;
            this._w = c1 * c2 * c3 - s1 * s2 * s3;

        } else if (order === 'ZYX') {

            this._x = s1 * c2 * c3 - c1 * s2 * s3;
            this._y = c1 * s2 * c3 + s1 * c2 * s3;
            this._z = c1 * c2 * s3 - s1 * s2 * c3;
            this._w = c1 * c2 * c3 + s1 * s2 * s3;

        } else if (order === 'YZX') {

            this._x = s1 * c2 * c3 + c1 * s2 * s3;
            this._y = c1 * s2 * c3 + s1 * c2 * s3;
            this._z = c1 * c2 * s3 - s1 * s2 * c3;
            this._w = c1 * c2 * c3 - s1 * s2 * s3;

        } else if (order === 'XZY') {

            this._x = s1 * c2 * c3 - c1 * s2 * s3;
            this._y = c1 * s2 * c3 - s1 * c2 * s3;
            this._z = c1 * c2 * s3 + s1 * s2 * c3;
            this._w = c1 * c2 * c3 + s1 * s2 * s3;

        }

        if (update !== false) this.onChangeCallback();

        return this;

    },

    setFromAxisAngle: function (axis, angle) {

        // http://www.euclideanspace.com/maths/geometry/rotations/conversions/angleToQuaternion/index.htm

        // assumes axis is normalized

        var halfAngle = angle / 2,
            s = Math.sin(halfAngle);

        this._x = axis.x * s;
        this._y = axis.y * s;
        this._z = axis.z * s;
        this._w = Math.cos(halfAngle);

        this.onChangeCallback();

        return this;

    },

    setFromRotationMatrix: function (m) {

        // http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm

        // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

        var te = m.elements,

            m11 = te[0],
            m12 = te[4],
            m13 = te[8],
            m21 = te[1],
            m22 = te[5],
            m23 = te[9],
            m31 = te[2],
            m32 = te[6],
            m33 = te[10],

            trace = m11 + m22 + m33,
            s;

        if (trace > 0) {

            s = 0.5 / Math.sqrt(trace + 1.0);

            this._w = 0.25 / s;
            this._x = (m32 - m23) * s;
            this._y = (m13 - m31) * s;
            this._z = (m21 - m12) * s;

        } else if (m11 > m22 && m11 > m33) {

            s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33);

            this._w = (m32 - m23) / s;
            this._x = 0.25 * s;
            this._y = (m12 + m21) / s;
            this._z = (m13 + m31) / s;

        } else if (m22 > m33) {

            s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33);

            this._w = (m13 - m31) / s;
            this._x = (m12 + m21) / s;
            this._y = 0.25 * s;
            this._z = (m23 + m32) / s;

        } else {

            s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22);

            this._w = (m21 - m12) / s;
            this._x = (m13 + m31) / s;
            this._y = (m23 + m32) / s;
            this._z = 0.25 * s;

        }

        this.onChangeCallback();

        return this;

    },

    setFromUnitVectors: function () {

        // http://lolengine.net/blog/2014/02/24/quaternion-from-two-vectors-final

        // assumes direction vectors vFrom and vTo are normalized

        var v1, r;

        var EPS = 0.000001;

        return function (vFrom, vTo) {

            if (v1 === undefined) v1 = new THREE.Vector3();

            r = vFrom.dot(vTo) + 1;

            if (r < EPS) {

                r = 0;

                if (Math.abs(vFrom.x) > Math.abs(vFrom.z)) {

                    v1.set(-vFrom.y, vFrom.x, 0);

                } else {

                    v1.set(0, -vFrom.z, vFrom.y);

                }

            } else {

                v1.crossVectors(vFrom, vTo);

            }

            this._x = v1.x;
            this._y = v1.y;
            this._z = v1.z;
            this._w = r;

            this.normalize();

            return this;

        };

    }(),

    inverse: function () {

        this.conjugate().normalize();

        return this;

    },

    conjugate: function () {

        this._x *= -1;
        this._y *= -1;
        this._z *= -1;

        this.onChangeCallback();

        return this;

    },

    dot: function (v) {

        return this._x * v._x + this._y * v._y + this._z * v._z + this._w * v._w;

    },

    lengthSq: function () {

        return this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w;

    },

    length: function () {

        return Math.sqrt(this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w);

    },

    normalize: function () {

        var l = this.length();

        if (l === 0) {

            this._x = 0;
            this._y = 0;
            this._z = 0;
            this._w = 1;

        } else {

            l = 1 / l;

            this._x = this._x * l;
            this._y = this._y * l;
            this._z = this._z * l;
            this._w = this._w * l;

        }

        this.onChangeCallback();

        return this;

    },

    multiply: function (q, p) {

        if (p !== undefined) {

            console.warn('THREE.Quaternion: .multiply() now only accepts one argument. Use .multiplyQuaternions( a, b ) instead.');
            return this.multiplyQuaternions(q, p);

        }

        return this.multiplyQuaternions(this, q);

    },

    multiplyQuaternions: function (a, b) {

        // from http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/code/index.htm

        var qax = a._x,
            qay = a._y,
            qaz = a._z,
            qaw = a._w;
        var qbx = b._x,
            qby = b._y,
            qbz = b._z,
            qbw = b._w;

        this._x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
        this._y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
        this._z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
        this._w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;

        this.onChangeCallback();

        return this;

    },

    slerp: function (qb, t) {

        if (t === 0) return this;
        if (t === 1) return this.copy(qb);

        var x = this._x,
            y = this._y,
            z = this._z,
            w = this._w;

        // http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/slerp/

        var cosHalfTheta = w * qb._w + x * qb._x + y * qb._y + z * qb._z;

        if (cosHalfTheta < 0) {

            this._w = -qb._w;
            this._x = -qb._x;
            this._y = -qb._y;
            this._z = -qb._z;

            cosHalfTheta = -cosHalfTheta;

        } else {

            this.copy(qb);

        }

        if (cosHalfTheta >= 1.0) {

            this._w = w;
            this._x = x;
            this._y = y;
            this._z = z;

            return this;

        }

        var sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

        if (Math.abs(sinHalfTheta) < 0.001) {

            this._w = 0.5 * (w + this._w);
            this._x = 0.5 * (x + this._x);
            this._y = 0.5 * (y + this._y);
            this._z = 0.5 * (z + this._z);

            return this;

        }

        var halfTheta = Math.atan2(sinHalfTheta, cosHalfTheta);
        var ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta,
            ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

        this._w = (w * ratioA + this._w * ratioB);
        this._x = (x * ratioA + this._x * ratioB);
        this._y = (y * ratioA + this._y * ratioB);
        this._z = (z * ratioA + this._z * ratioB);

        this.onChangeCallback();

        return this;

    },

    equals: function (quaternion) {

        return (quaternion._x === this._x) && (quaternion._y === this._y) && (quaternion._z === this._z) && (quaternion._w === this._w);

    },

    fromArray: function (array, offset) {

        if (offset === undefined) offset = 0;

        this._x = array[offset];
        this._y = array[offset + 1];
        this._z = array[offset + 2];
        this._w = array[offset + 3];

        this.onChangeCallback();

        return this;

    },

    toArray: function (array, offset) {

        if (array === undefined) array = [];
        if (offset === undefined) offset = 0;

        array[offset] = this._x;
        array[offset + 1] = this._y;
        array[offset + 2] = this._z;
        array[offset + 3] = this._w;

        return array;

    },

    onChange: function (callback) {

        this.onChangeCallback = callback;

        return this;

    },

    onChangeCallback: function () {}

};

Object.assign(THREE.Quaternion, {

    slerp: function (qa, qb, qm, t) {

        return qm.copy(qa).slerp(qb, t);

    },

    slerpFlat: function (
        dst, dstOffset, src0, srcOffset0, src1, srcOffset1, t) {

        // fuzz-free, array-based Quaternion SLERP operation

        var x0 = src0[srcOffset0 + 0],
            y0 = src0[srcOffset0 + 1],
            z0 = src0[srcOffset0 + 2],
            w0 = src0[srcOffset0 + 3],

            x1 = src1[srcOffset1 + 0],
            y1 = src1[srcOffset1 + 1],
            z1 = src1[srcOffset1 + 2],
            w1 = src1[srcOffset1 + 3];

        if (w0 !== w1 || x0 !== x1 || y0 !== y1 || z0 !== z1) {

            var s = 1 - t,

                cos = x0 * x1 + y0 * y1 + z0 * z1 + w0 * w1,

                dir = (cos >= 0 ? 1 : -1),
                sqrSin = 1 - cos * cos;

            // Skip the Slerp for tiny steps to avoid numeric problems:
            if (sqrSin > Number.EPSILON) {

                var sin = Math.sqrt(sqrSin),
                    len = Math.atan2(sin, cos * dir);

                s = Math.sin(s * len) / sin;
                t = Math.sin(t * len) / sin;

            }

            var tDir = t * dir;

            x0 = x0 * s + x1 * tDir;
            y0 = y0 * s + y1 * tDir;
            z0 = z0 * s + z1 * tDir;
            w0 = w0 * s + w1 * tDir;

            // Normalize in case we just did a lerp:
            if (s === 1 - t) {

                var f = 1 / Math.sqrt(x0 * x0 + y0 * y0 + z0 * z0 + w0 * w0);

                x0 *= f;
                y0 *= f;
                z0 *= f;
                w0 *= f;

            }

        }

        dst[dstOffset] = x0;
        dst[dstOffset + 1] = y0;
        dst[dstOffset + 2] = z0;
        dst[dstOffset + 3] = w0;

    }

});



/**
 * @author mikael emtinger / http://gomo.se/
 * @author alteredq / http://alteredqualia.com/
 * @author ikerr / http://verold.com
 */

THREE.SkinnedMesh = function (geometry, material, useVertexTexture) {

    THREE.Mesh.call(this, geometry, material);

    this.type = 'SkinnedMesh';

    this.bindMode = "attached";
    this.bindMatrix = new THREE.Matrix4();
    this.bindMatrixInverse = new THREE.Matrix4();

    // init bones

    // TODO: remove bone creation as there is no reason (other than
    // convenience) for THREE.SkinnedMesh to do this.

    var bones = [];

    if (this.geometry && this.geometry.bones !== undefined) {

        var bone, gbone;

        for (var b = 0, bl = this.geometry.bones.length; b < bl; ++b) {

            gbone = this.geometry.bones[b];

            bone = new THREE.Bone(this);
            bones.push(bone);

            bone.name = gbone.name;
            bone.position.fromArray(gbone.pos);
            bone.quaternion.fromArray(gbone.rotq);
            if (gbone.scl !== undefined) bone.scale.fromArray(gbone.scl);

        }

        for (var b = 0, bl = this.geometry.bones.length; b < bl; ++b) {

            gbone = this.geometry.bones[b];

            if (gbone.parent !== -1 && gbone.parent !== null) {

                bones[gbone.parent].add(bones[b]);

            } else {

                this.add(bones[b]);

            }

        }

    }

    this.normalizeSkinWeights();

    this.updateMatrixWorld(true);
    this.bind(new THREE.Skeleton(bones, undefined, useVertexTexture), this.matrixWorld);

};


THREE.SkinnedMesh.prototype = Object.create(THREE.Mesh.prototype);
THREE.SkinnedMesh.prototype.constructor = THREE.SkinnedMesh;

THREE.SkinnedMesh.prototype.bind = function (skeleton, bindMatrix) {

    this.skeleton = skeleton;

    if (bindMatrix === undefined) {

        this.updateMatrixWorld(true);

        this.skeleton.calculateInverses();

        bindMatrix = this.matrixWorld;

    }

    this.bindMatrix.copy(bindMatrix);
    this.bindMatrixInverse.getInverse(bindMatrix);

};

THREE.SkinnedMesh.prototype.pose = function () {

    this.skeleton.pose();

};

THREE.SkinnedMesh.prototype.normalizeSkinWeights = function () {

    if (this.geometry instanceof THREE.Geometry) {

        for (var i = 0; i < this.geometry.skinWeights.length; i++) {

            var sw = this.geometry.skinWeights[i];

            var scale = 1.0 / sw.lengthManhattan();

            if (scale !== Infinity) {

                sw.multiplyScalar(scale);

            } else {

                sw.set(1, 0, 0, 0); // do something reasonable

            }

        }

    } else if (this.geometry instanceof THREE.BufferGeometry) {

        var vec = new THREE.Vector4();

        var skinWeight = this.geometry.attributes.skinWeight;

        for (var i = 0; i < skinWeight.count; i++) {

            vec.x = skinWeight.getX(i);
            vec.y = skinWeight.getY(i);
            vec.z = skinWeight.getZ(i);
            vec.w = skinWeight.getW(i);

            var scale = 1.0 / vec.lengthManhattan();

            if (scale !== Infinity) {

                vec.multiplyScalar(scale);

            } else {

                vec.set(1, 0, 0, 0); // do something reasonable

            }

            skinWeight.setXYZW(i, vec.x, vec.y, vec.z, vec.w);

        }

    }

};

THREE.SkinnedMesh.prototype.updateMatrixWorld = function (force) {

    THREE.Mesh.prototype.updateMatrixWorld.call(this, true);

    if (this.bindMode === "attached") {

        this.bindMatrixInverse.getInverse(this.matrixWorld);

    } else if (this.bindMode === "detached") {

        this.bindMatrixInverse.getInverse(this.bindMatrix);

    } else {

        console.warn('THREE.SkinnedMesh unrecognized bindMode: ' + this.bindMode);

    }

};

THREE.SkinnedMesh.prototype.clone = function () {

    return new this.constructor(this.geometry, this.material, this.useVertexTexture).copy(this);

};

/**
 * @author mikael emtinger / http://gomo.se/
 * @author alteredq / http://alteredqualia.com/
 * @author michael guerrero / http://realitymeltdown.com
 * @author ikerr / http://verold.com
 */

THREE.Skeleton = function (bones, boneInverses, useVertexTexture) {

    this.useVertexTexture = useVertexTexture !== undefined ? useVertexTexture : true;

    this.identityMatrix = new THREE.Matrix4();

    // copy the bone array

    bones = bones || [];

    this.bones = bones.slice(0);

    // create a bone texture or an array of floats

    if (this.useVertexTexture) {

        // layout (1 matrix = 4 pixels)
        //      RGBA RGBA RGBA RGBA (=> column1, column2, column3, column4)
        //  with  8x8  pixel texture max   16 bones * 4 pixels =  (8 * 8)
        //       16x16 pixel texture max   64 bones * 4 pixels = (16 * 16)
        //       32x32 pixel texture max  256 bones * 4 pixels = (32 * 32)
        //       64x64 pixel texture max 1024 bones * 4 pixels = (64 * 64)


        var size = Math.sqrt(this.bones.length * 4); // 4 pixels needed for 1 matrix
        size = THREE.Math.nextPowerOfTwo(Math.ceil(size));
        size = Math.max(size, 4);

        this.boneTextureWidth = size;
        this.boneTextureHeight = size;

        this.boneMatrices = new Float32Array(this.boneTextureWidth * this.boneTextureHeight * 4); // 4 floats per RGBA pixel
        this.boneTexture = new THREE.DataTexture(this.boneMatrices, this.boneTextureWidth, this.boneTextureHeight, THREE.RGBAFormat, THREE.FloatType);

    } else {

        this.boneMatrices = new Float32Array(16 * this.bones.length);

    }

    // use the supplied bone inverses or calculate the inverses

    if (boneInverses === undefined) {

        this.calculateInverses();

    } else {

        if (this.bones.length === boneInverses.length) {

            this.boneInverses = boneInverses.slice(0);

        } else {

            console.warn('THREE.Skeleton bonInverses is the wrong length.');

            this.boneInverses = [];

            for (var b = 0, bl = this.bones.length; b < bl; b++) {

                this.boneInverses.push(new THREE.Matrix4());

            }

        }

    }

};

THREE.Skeleton.prototype.calculateInverses = function () {

    this.boneInverses = [];

    for (var b = 0, bl = this.bones.length; b < bl; b++) {

        var inverse = new THREE.Matrix4();

        if (this.bones[b]) {

            inverse.getInverse(this.bones[b].matrixWorld);

        }

        this.boneInverses.push(inverse);

    }

};

THREE.Skeleton.prototype.pose = function () {

    var bone;

    // recover the bind-time world matrices

    for (var b = 0, bl = this.bones.length; b < bl; b++) {

        bone = this.bones[b];

        if (bone) {

            bone.matrixWorld.getInverse(this.boneInverses[b]);

        }

    }

    // compute the local matrices, positions, rotations and scales

    for (var b = 0, bl = this.bones.length; b < bl; b++) {

        bone = this.bones[b];

        if (bone) {

            if (bone.parent) {

                bone.matrix.getInverse(bone.parent.matrixWorld);
                bone.matrix.multiply(bone.matrixWorld);

            } else {

                bone.matrix.copy(bone.matrixWorld);

            }

            bone.matrix.decompose(bone.position, bone.quaternion, bone.scale);

        }

    }

};

THREE.Skeleton.prototype.update = (function () {

    var offsetMatrix = new THREE.Matrix4();

    return function update() {

        // flatten bone matrices to array

        for (var b = 0, bl = this.bones.length; b < bl; b++) {

            // compute the offset between the current and the original transform

            var matrix = this.bones[b] ? this.bones[b].matrixWorld : this.identityMatrix;

            offsetMatrix.multiplyMatrices(matrix, this.boneInverses[b]);
            offsetMatrix.flattenToArrayOffset(this.boneMatrices, b * 16);

        }

        if (this.useVertexTexture) {

            this.boneTexture.needsUpdate = true;

        }

    };

})();

THREE.Skeleton.prototype.clone = function () {

    return new THREE.Skeleton(this.bones, this.boneInverses, this.useVertexTexture);

};

/**
 * @author alteredq / http://alteredqualia.com/
 * @author mrdoob / http://mrdoob.com/
 */

THREE.Math = {

    generateUUID: function () {

        // http://www.broofa.com/Tools/Math.uuid.htm

        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
        var uuid = new Array(36);
        var rnd = 0,
            r;

        return function () {

            for (var i = 0; i < 36; i++) {

                if (i === 8 || i === 13 || i === 18 || i === 23) {

                    uuid[i] = '-';

                } else if (i === 14) {

                    uuid[i] = '4';

                } else {

                    if (rnd <= 0x02) rnd = 0x2000000 + (Math.random() * 0x1000000) | 0;
                    r = rnd & 0xf;
                    rnd = rnd >> 4;
                    uuid[i] = chars[(i === 19) ? (r & 0x3) | 0x8 : r];

                }

            }

            return uuid.join('');

        };

    }(),

    clamp: function (value, min, max) {

        return Math.max(min, Math.min(max, value));

    },

    // compute euclidian modulo of m % n
    // https://en.wikipedia.org/wiki/Modulo_operation

    euclideanModulo: function (n, m) {

        return ((n % m) + m) % m;

    },

    // Linear mapping from range <a1, a2> to range <b1, b2>

    mapLinear: function (x, a1, a2, b1, b2) {

        return b1 + (x - a1) * (b2 - b1) / (a2 - a1);

    },

    // http://en.wikipedia.org/wiki/Smoothstep

    smoothstep: function (x, min, max) {

        if (x <= min) return 0;
        if (x >= max) return 1;

        x = (x - min) / (max - min);

        return x * x * (3 - 2 * x);

    },

    smootherstep: function (x, min, max) {

        if (x <= min) return 0;
        if (x >= max) return 1;

        x = (x - min) / (max - min);

        return x * x * x * (x * (x * 6 - 15) + 10);

    },

    random16: function () {

        console.warn('THREE.Math.random16() has been deprecated. Use Math.random() instead.');
        return Math.random();

    },

    // Random integer from <low, high> interval

    randInt: function (low, high) {

        return low + Math.floor(Math.random() * (high - low + 1));

    },

    // Random float from <low, high> interval

    randFloat: function (low, high) {

        return low + Math.random() * (high - low);

    },

    // Random float from <-range/2, range/2> interval

    randFloatSpread: function (range) {

        return range * (0.5 - Math.random());

    },

    degToRad: function () {

        var degreeToRadiansFactor = Math.PI / 180;

        return function (degrees) {

            return degrees * degreeToRadiansFactor;

        };

    }(),

    radToDeg: function () {

        var radianToDegreesFactor = 180 / Math.PI;

        return function (radians) {

            return radians * radianToDegreesFactor;

        };

    }(),

    isPowerOfTwo: function (value) {

        return (value & (value - 1)) === 0 && value !== 0;

    },

    nearestPowerOfTwo: function (value) {

        return Math.pow(2, Math.round(Math.log(value) / Math.LN2));

    },

    nextPowerOfTwo: function (value) {

        value--;
        value |= value >> 1;
        value |= value >> 2;
        value |= value >> 4;
        value |= value >> 8;
        value |= value >> 16;
        value++;

        return value;

    }

};

/**
 * @author mikael emtinger / http://gomo.se/
 * @author alteredq / http://alteredqualia.com/
 * @author ikerr / http://verold.com
 */

THREE.Bone = function (skin) {

    THREE.Object3D.call(this);

    this.type = 'Bone';

    this.skin = skin;

};

THREE.Bone.prototype = Object.create(THREE.Object3D.prototype);
THREE.Bone.prototype.constructor = THREE.Bone;

THREE.Bone.prototype.copy = function (source) {

    THREE.Object3D.prototype.copy.call(this, source);

    this.skin = source.skin;

    return this;

};

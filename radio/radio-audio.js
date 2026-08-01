/* ==========================================================================
   WHAT IF WE BELIEVED RADIO — WebAudio engine
   Everything is synthesized live: static, clicks, hum, chimes, jingles.
   No audio files are loaded.
   ========================================================================== */
const RadioAudio = (function () {
    'use strict';

    let ctx = null;
    let master = null;
    let volGain = null;
    let noiseBuffer = null;
    let staticSrc = null;
    let staticGain = null;
    let humOsc = null;
    let humGain = null;
    let stationGain = null;
    let stationNodes = [];
    let timers = [];
    let droneOsc = null;
    let droneGain = null;

    function ensure() {
        if (ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();

        master = ctx.createGain();
        master.gain.value = 0.9;
        master.connect(ctx.destination);

        volGain = ctx.createGain();
        volGain.gain.value = 0.8;
        volGain.connect(master);

        // White-noise buffer (2 s) for static & clicks.
        noiseBuffer = buildNoise(2);
        staticSrc = ctx.createBufferSource();
        staticSrc.buffer = noiseBuffer;
        staticSrc.loop = true;
        staticGain = ctx.createGain();
        staticGain.gain.value = 0;
        staticSrc.connect(staticGain);
        staticGain.connect(volGain);
        staticSrc.start();

        // Mains hum.
        humOsc = ctx.createOscillator();
        humOsc.type = 'sine';
        humOsc.frequency.value = 60;
        humGain = ctx.createGain();
        humGain.gain.value = 0;
        humOsc.connect(humGain);
        humGain.connect(volGain);
        humOsc.start();

        // Station broadcast bus.
        stationGain = ctx.createGain();
        stationGain.gain.value = 0;
        stationGain.connect(volGain);
    }

    function buildNoise(seconds) {
        const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        return buffer;
    }

    /* ---------- public API ---------- */

    function resume() {
        ensure();
        if (ctx && ctx.state === 'suspended') ctx.resume();
    }

    function setVolume(v) {
        ensure();
        volGain.gain.setTargetAtTime(v, ctx.currentTime, 0.03);
    }

    function click() {
        if (!ctx) return;
        const t = ctx.currentTime;
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        const f = ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 1400;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.45, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        src.connect(f); f.connect(g); g.connect(volGain);
        src.start(t); src.stop(t + 0.06);
    }

    function power(on) {
        ensure();
        if (!ctx) return;
        const t = ctx.currentTime;
        if (on) {
            click();
            humGain.gain.cancelScheduledValues(t);
            humGain.gain.setValueAtTime(humGain.gain.value, t);
            humGain.gain.linearRampToValueAtTime(0.07, t + 0.5);
        } else {
            setStatic(0);
            stopStation();
            humGain.gain.cancelScheduledValues(t);
            humGain.gain.setValueAtTime(humGain.gain.value, t);
            humGain.gain.linearRampToValueAtTime(0, t + 0.3);
            click();
        }
    }

    function setStatic(level) {
        if (!ctx) return;
        staticGain.gain.setTargetAtTime(level * 0.45, ctx.currentTime, 0.06);
    }

    function chime() {
        if (!ctx) return;
        const f = [523.25, 659.25, 783.99];
        f.forEach((fr, i) => playNote(fr, ctx.currentTime + i * 0.12, 0.6, 'sine', 0.18));
    }

    function playNote(freq, t, dur, type, vol) {
        const o = ctx.createOscillator();
        o.type = type || 'sine';
        o.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g); g.connect(stationGain);
        o.start(t); o.stop(t + dur + 0.05);
        stationNodes.push(o, g);
    }

    function startStation(pattern) {
        if (!ctx) return;
        stopStation();
        stationGain.gain.cancelScheduledValues(ctx.currentTime);
        stationGain.gain.setTargetAtTime(0.32, ctx.currentTime, 0.4);

        switch (pattern.type) {
            case 'pad': {
                // Warm sustained chord, re-struck slowly.
                const every = pattern.every || 1.6;
                const step = function () {
                    const t = ctx.currentTime + 0.05;
                    pattern.chord.forEach((fr) => playNote(fr, t, every * 0.95, 'sine', 0.07));
                };
                step();
                timers.push(setInterval(step, every * 1000));
                break;
            }
            case 'prayer': {
                // Low drone + soft bell every few seconds.
                droneOsc = ctx.createOscillator();
                droneOsc.type = 'sine';
                droneOsc.frequency.value = pattern.drone;
                droneGain = ctx.createGain();
                droneGain.gain.value = 0;
                droneOsc.connect(droneGain);
                droneGain.connect(stationGain);
                droneOsc.start();
                droneGain.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 1.2);
                stationNodes.push(droneOsc, droneGain);
                const every = pattern.bellEvery || 4;
                const bell = function () {
                    const t = ctx.currentTime;
                    playNote(523.25, t, 2.5, 'sine', 0.08);
                    playNote(783.99, t + 0.25, 2.2, 'sine', 0.05);
                };
                bell();
                timers.push(setInterval(bell, every * 1000));
                break;
            }
            case 'kids':
            case 'arp':
            default: {
                // Gentle arpeggio loop.
                const notes = pattern.notes;
                const step = pattern.step || 0.25;
                const type = pattern.type === 'kids' ? 'triangle' : 'sine';
                const vol = pattern.type === 'kids' ? 0.12 : 0.09;
                let i = 0;
                let next = ctx.currentTime + 0.05;
                timers.push(setInterval(function () {
                    while (next < ctx.currentTime + 0.3) {
                        playNote(notes[i % notes.length], next, step * 0.95, type, vol);
                        i++;
                        next += step;
                    }
                }, 60));
                break;
            }
        }
    }

    function stopStation() {
        timers.forEach(clearInterval);
        timers = [];
        if (stationGain && ctx) {
            stationGain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
        }
        stationNodes.forEach(function (node) {
            try { node.stop && node.stop(); } catch (e) { /* already stopped */ }
            try { node.disconnect && node.disconnect(); } catch (e) { /* noop */ }
        });
        stationNodes = [];
        droneOsc = null;
        droneGain = null;
    }

    return {
        resume: resume,
        setVolume: setVolume,
        click: click,
        power: power,
        setStatic: setStatic,
        chime: chime,
        startStation: startStation,
        stopStation: stopStation
    };
})();

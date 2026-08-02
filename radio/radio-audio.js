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
    let hymnGain = null;
    let hymnNodes = [];
    let hymnEndTimer = null;

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

        // Hymn solo bus (sax feature broadcast).
        hymnGain = ctx.createGain();
        hymnGain.gain.value = 0;
        hymnGain.connect(volGain);
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

    /* ---------- sax hymn: "How Great Thou Art" ---------- */
    // O STORE GUD melody in G (alto-sax friendly range G4–E5).
    var HYM = [
        [392.00, 1], [392.00, 1], [392.00, 1], [392.00, 1],
        [440.00, 1], [493.88, 1], [587.33, 2], [493.88, 1], [440.00, 1], [392.00, 2],
        [440.00, 1], [493.88, 1], [587.33, 1], [493.88, 1], [392.00, 1], [329.63, 1], [293.66, 1], [293.66, 1], [293.66, 2],
        [392.00, 1], [440.00, 1], [493.88, 1], [440.00, 1], [392.00, 1], [440.00, 1], [493.88, 1], [440.00, 1], [392.00, 2],
        [493.88, 1], [587.33, 1], [587.33, 1], [523.25, 1], [493.88, 1], [440.00, 1], [493.88, 1], [440.00, 1], [392.00, 2],
        [392.00, 1], [440.00, 1], [493.88, 1], [587.33, 1], [587.33, 1], [523.25, 1], [493.88, 1], [440.00, 1], [493.88, 1], [392.00, 2],
        [523.25, 1], [587.33, 1], [659.26, 1.5], [587.33, 0.5], [523.25, 1], [493.88, 1], [440.00, 1], [392.00, 2]
    ];

    // One synthesized saxophone note with vibrato, breathy attack, soft release.
    function saxNote(freq, t, dur) {
        var vol = 0.16;
        var o1 = ctx.createOscillator();
        o1.type = 'sawtooth';
        o1.frequency.value = freq;
        o1.detune.value = -5;
        var o2 = ctx.createOscillator();
        o2.type = 'sawtooth';
        o2.frequency.value = freq;
        o2.detune.value = 5;
        var o3 = ctx.createOscillator();
        o3.type = 'square';
        o3.frequency.value = freq / 2;
        o3.detune.value = -3;

        var f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(Math.min(3600, freq * 4.5), t);
        f.frequency.exponentialRampToValueAtTime(Math.max(600, freq * 1.8), t + dur * 0.7);
        f.Q.value = 1.1;

        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.07);
        g.gain.setValueAtTime(vol * 0.7, t + dur * 0.55);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);

        var vib = ctx.createOscillator();
        vib.frequency.value = 5.4;
        var vibGain = ctx.createGain();
        vibGain.gain.value = 7;
        vib.connect(vibGain);
        vibGain.connect(o1.frequency);
        vibGain.connect(o2.frequency);
        vibGain.connect(o3.frequency);

        o1.connect(f); o2.connect(f); o3.connect(f);
        f.connect(g); g.connect(hymnGain);
        o1.start(t); o2.start(t); o3.start(t); vib.start(t);
        o1.stop(t + dur + 0.1); o2.stop(t + dur + 0.1); o3.stop(t + dur + 0.1); vib.stop(t + dur + 0.1);
        hymnNodes.push(o1, o2, o3, vib, vibGain, f, g);
    }

    // Broadcast the hymn for a given number of seconds (default 90).
    function playHymn(duration) {
        if (!ctx) return;
        stopHymn();
        var total = duration || 90;
        var t0 = ctx.currentTime + 0.2;
        var beat = 0.62;
        // Duck the station bed so the sax is the featured broadcast.
        stationGain.gain.cancelScheduledValues(t0);
        stationGain.gain.setTargetAtTime(0.06, t0, 0.5);
        hymnGain.gain.cancelScheduledValues(t0);
        hymnGain.gain.setTargetAtTime(0.85, t0, 0.4);

        var t = t0;
        var i = 0;
        while (t < t0 + (total - 5)) {
            var note = HYM[i % HYM.length];
            var dur = note[1] * beat;
            saxNote(note[0], t, dur * 0.92);
            t += dur;
            i++;
        }
        var fadeAt = t0 + total - 5;
        hymnGain.gain.setValueAtTime(0.85, fadeAt);
        hymnGain.gain.linearRampToValueAtTime(0, t0 + total);
        // Restore the station bed once the hymn has ended.
        hymnEndTimer = setTimeout(function () {
            if (ctx && stationGain) {
                stationGain.gain.setTargetAtTime(0.32, ctx.currentTime, 1.2);
            }
        }, total * 1000);
    }

    function stopHymn() {
        if (hymnEndTimer) { clearTimeout(hymnEndTimer); hymnEndTimer = null; }
        if (hymnGain && ctx) {
            hymnGain.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
        }
        hymnNodes.forEach(function (node) {
            try { node.stop && node.stop(); } catch (e) { /* already stopped */ }
            try { node.disconnect && node.disconnect(); } catch (e) { /* noop */ }
        });
        hymnNodes = [];
    }

    return {
        resume: resume,
        setVolume: setVolume,
        click: click,
        power: power,
        setStatic: setStatic,
        chime: chime,
        startStation: startStation,
        stopStation: stopStation,
        playHymn: playHymn,
        stopHymn: stopHymn
    };
})();

/* ==========================================================================
   WHAT IF WE BELIEVED RADIO — WebAudio engine
   Everything is synthesized live: static, clicks, hum, chimes, jingles.
   Now also supports external audio streaming.
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

    // External audio support
    let externalAudio = null;
    let externalAudioSource = null;
    let externalAudioGain = null;
    let externalAudioUrl = null;

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

        // External audio bus
        externalAudioGain = ctx.createGain();
        externalAudioGain.gain.value = 0;
        externalAudioGain.connect(volGain);
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
            // Stop external audio when powering off
            stopExternalAudio();
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
    // O STORE GUD melody in G (alto-sax friendly range F#4–E5).
    // Verified against the hymnary incipit (55535 55664 66665) and published
    // letter-note transcriptions. Each entry is [frequency, beats] where one
    // beat = 0.62 s. The verse+chorus loop repeats for the broadcast duration.
    var HYM = [
        // Verse: "O Lord my God, when I in awesome wonder"
        [587.33, 1], [587.33, 1], [587.33, 1], [493.88, 1],
        [587.33, 1], [587.33, 1], [587.33, 1], [659.26, 1], [659.26, 1], [523.25, 1], [659.26, 2],
        // "Consider all the worlds Thy hands have made"
        [659.26, 1], [659.26, 1], [659.26, 1], [587.33, 1],
        [493.88, 1], [587.33, 1], [587.33, 1], [523.25, 1], [523.25, 1], [493.88, 2],
        // "I see the stars, I hear the rolling thunder"
        [587.33, 1], [587.33, 1], [587.33, 1], [493.88, 1],
        [587.33, 1], [587.33, 1], [587.33, 1], [659.26, 1], [659.26, 1], [523.25, 1], [659.26, 2],
        // "Thy power throughout the universe displayed."
        [659.26, 1], [659.26, 1], [659.26, 1], [587.33, 1],
        [493.88, 1], [587.33, 1], [587.33, 1], [523.25, 1], [523.25, 1], [493.88, 2],
        // Chorus: "Then sings my soul, my Savior God, to Thee"
        [587.33, 1], [587.33, 1], [392.00, 1], [493.88, 1],
        [440.00, 1], [392.00, 1], [369.99, 1], [392.00, 1], [659.26, 1], [587.33, 2],
        // "How great Thou art! How great Thou art!"
        [392.00, 1], [369.99, 1], [392.00, 1], [440.00, 1],
        [523.25, 1], [659.26, 1], [587.33, 1], [493.88, 2],
        // "Then sings my soul, my Savior God, to Thee"
        [587.33, 1], [587.33, 1], [392.00, 1], [493.88, 1],
        [440.00, 1], [392.00, 1], [369.99, 1], [392.00, 1], [659.26, 1], [587.33, 2],
        // "How great Thou art!" (final)
        [493.88, 1], [523.25, 1], [369.99, 1], [392.00, 2]
    ];

    // One shared vibrato LFO for the whole hymn (cheap: avoids per-note
    // oscillators). The sax gets a deeper LFO; reed/strings a gentler one.
    var hymnVibOsc = null;
    var hymnVibGain = null;
    var hymnVibSoftOsc = null;
    var hymnVibSoftGain = null;

    function ensureVibrato(timbre) {
        if ((timbre === 'reed' || timbre === 'strings') && !hymnVibSoftOsc) {
            hymnVibSoftOsc = ctx.createOscillator();
            hymnVibSoftOsc.frequency.value = 5.0;
            hymnVibSoftGain = ctx.createGain();
            hymnVibSoftGain.gain.value = 2.5;
            hymnVibSoftOsc.connect(hymnVibSoftGain);
            hymnVibSoftOsc.start();
            hymnNodes.push(hymnVibSoftOsc, hymnVibSoftGain);
        }
        if (timbre === 'sax' && !hymnVibOsc) {
            hymnVibOsc = ctx.createOscillator();
            hymnVibOsc.frequency.value = 5.4;
            hymnVibGain = ctx.createGain();
            hymnVibGain.gain.value = 6;
            hymnVibOsc.connect(hymnVibGain);
            hymnVibOsc.start();
            hymnNodes.push(hymnVibOsc, hymnVibGain);
        }
    }

    // One synthesized saxophone note with vibrato, breathy attack, soft release.
    function saxNote(freq, t, dur) {
        var vol = 0.18;
        var o1 = ctx.createOscillator();
        o1.type = 'sawtooth';
        o1.frequency.value = freq;
        o1.detune.value = -5;
        var o2 = ctx.createOscillator();
        o2.type = 'sawtooth';
        o2.frequency.value = freq;
        o2.detune.value = 5;

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

        hymnVibGain.connect(o1.frequency);
        hymnVibGain.connect(o2.frequency);

        o1.connect(f); o2.connect(f);
        f.connect(g); g.connect(hymnGain);
        o1.start(t); o2.start(t);
        o1.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
        hymnNodes.push(o1, o2, f, g);
    }

    /* ---------- hymn tune registry (public domain, verified) ---------- */
    // Every tune below is a scale-degree incipit (1-7 = degrees of the major
    // scale, groups of five = bars, '_' = tie) taken from its Hymnary page
    // and cross-checked against independent MIDI arrangements. Looping the
    // incipit plays the tune's opening phrase — its musical identity.
    // HEURISTIC: rhythm (bar-end elongation) and register (octave unfolding)
    // are derived from the incipit, not from the full score.
    var HYMNS = {
        'laudes-domini':      '34561 76567 13217',
        'st-georges-bolton':  '33257 21561 765',
        'nicaea':             '11335 56666 53555',
        'lasst-uns-erfreuen': '11231 34511 23134',
        'lyons':              '51123 14432 51123',
        'story-of-jesus':     '33213 45352 34323',
        'evangel':            { mel: '33455 65511 13455', refr: '21234 43455' },
        'hankey':             '51551 32111 62165',
        'rescue':             '53455 51766 55671',
        'words-of-life':      '33343 32252 23215',
        'need':               '13217 11121 655',
        'sweet-hour':         '13455 67165 33212',
        'erie':               '55653 11651 31532',
        'trusting-jesus':     { mel: '32176 16513 53212', refr: '35532 13235 53212' },
        'nettleton':          '32113 52235 65321',
        'new-britain':        '51313 21655 13132',
        'bethany':            '32116 65132 32116',
        'ville-du-havre':     '55433 23465 43___',
        'crimond':            '53425 42171 33224',
        'jesus-loves-me':     { mel: '53323 55661 66555', refr: '53561 53132' },
        'tryggare':           '12335 33223 46544',
        'shipston':           '13565 43231 13565',
        'royal-oak':          '53432 17653 46767',
        'sweet-story':        '12333 32346 5554',
        'chautauqua':         { mel: '11165 45111 65457', refr: '51531 54211 71651', tonic: 293.66 },
        'eventide':           { mel: '33215 65543 34565', tonic: 293.66 },
        'seymour':            { mel: '32436 53233 33471', tonic: 293.66 },
        'merrial':            { mel: '55555 56656 76111', tonic: 293.66 },
        'st-clement':         { mel: '53435 32126 17655', tonic: 293.66 }
    };

    var SEMI = [0, 2, 4, 5, 7, 9, 11]; // major-scale semitone offsets
    var phraseCache = {};

    // Parse an incipit string into [{deg, beats, barEnd}]. One beat per note,
    // '_' extends the previous note, the last note of each bar and of the
    // phrase gets extra length so the loop breathes like a sung line.
    function parseIncipit(str) {
        var groups = str.trim().split(/\s+/);
        var out = [];
        var cnt = 0;
        for (var i = 0; i < groups.length; i++) {
            var len = groups[i].replace(/[^0-9]/g, '').length;
            if (!len) continue;
            for (var j = 0; j < groups[i].length; j++) {
                var c = groups[i][j];
                if (c === '_') {
                    if (out.length) out[out.length - 1].beats++;
                    continue;
                }
                var deg = parseInt(c, 10);
                if (isNaN(deg) || deg < 1 || deg > 7) continue;
                var note = { deg: deg, beats: 1, barEnd: false };
                out.push(note);
                cnt++;
                if (cnt === len) { note.barEnd = true; cnt = 0; }
            }
        }
        for (i = 0; i < out.length; i++) {
            if (out[i].barEnd && i > 0) out[i].beats++;
        }
        out[out.length - 1].beats++;
        return out;
    }

    // HEURISTIC octave unfolding: place each degree in the octave nearest the
    // previous note, clamped to a comfortable solo register around the tonic.
    // The incipit preserves exact intervals; the register is a production
    // choice, so a tune may sit an octave above or below its printed key.
    function phraseFreqs(notes, tonic) {
        var out = [];
        var prev = 0;
        var LO = -5, HI = 17;
        for (var i = 0; i < notes.length; i++) {
            var base = SEMI[notes[i].deg - 1];
            var best = base, bestD = Infinity;
            for (var k = -1; k <= 1; k++) {
                var s = base + k * 12;
                if (s < LO || s > HI) continue;
                var d = Math.abs(s - prev);
                if (d < bestD) { bestD = d; best = s; }
            }
            out.push({ freq: tonic * Math.pow(2, best / 12), beats: notes[i].beats });
            prev = best;
        }
        return out;
    }

    // The full loop phrase for a tune: incipit, then refrain if it has one.
    function phraseFor(tuneKey) {
        if (phraseCache[tuneKey]) return phraseCache[tuneKey];
        var e = HYMNS[tuneKey];
        if (!e) return null;
        var mel = typeof e === 'string' ? e : e.mel;
        var refr = typeof e === 'string' ? null : e.refr || null;
        var tonic = typeof e === 'string' ? 392.0 : (e.tonic || 392.0);
        var notes = parseIncipit(mel);
        if (refr) notes = notes.concat(parseIncipit(refr));
        phraseCache[tuneKey] = phraseFreqs(notes, tonic);
        return phraseCache[tuneKey];
    }

    // Render one note in any of the station block voices. All voices share
    // the hymnGain bus, so stopHymn() still cleans up everything.
    function toneNote(freq, t, dur, timbre) {
        var vol, o1, o2, f, g;
        freq = freq * (1 + (Math.random() - 0.5) * 0.006); // subtle humanization
        switch (timbre) {
            case 'musicbox': { // Kids' Bible Hour: tinkly music-box pluck
                vol = 0.22;
                o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = freq;
                o2 = ctx.createOscillator(); o2.type = 'sine';     o2.frequency.value = freq * 2;
                f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 700;
                g = ctx.createGain();
                g.gain.setValueAtTime(0.0001, t);
                g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
                g.gain.exponentialRampToValueAtTime(0.001, t + dur);
                break;
            }
            case 'flute': { // Bible Stories: pure recorder-like tone
                vol = 0.2;
                o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = freq;
                o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2;
                f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
                g = ctx.createGain();
                g.gain.setValueAtTime(0.0001, t);
                g.gain.exponentialRampToValueAtTime(vol, t + 0.05);
                g.gain.exponentialRampToValueAtTime(0.001, t + dur);
                break;
            }
            case 'bell': { // Prayer Hour: soft chapel bell
                vol = 0.16;
                o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = freq;
                o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2;
                f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 500;
                g = ctx.createGain();
                g.gain.setValueAtTime(0.0001, t);
                g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
                g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.7);
                break;
            }
            case 'strings': { // Night of Reflection: warm bowed strings
                vol = 0.15;
                o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = freq;
                o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = freq * 1.005;
                f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
                g = ctx.createGain();
                g.gain.setValueAtTime(0.0001, t);
                g.gain.exponentialRampToValueAtTime(vol, t + 0.12);
                g.gain.exponentialRampToValueAtTime(0.001, t + dur);
                if (hymnVibSoftGain) {
                    hymnVibSoftGain.connect(o1.frequency);
                    hymnVibSoftGain.connect(o2.frequency);
                }
                break;
            }
            case 'reed': { // Morning Worship: warm organ-reed swell
                vol = 0.17;
                o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = freq; o1.detune.value = -4;
                o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = freq; o2.detune.value = 4;
                f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = Math.min(2600, freq * 3);
                f.Q.value = 0.8;
                g = ctx.createGain();
                g.gain.setValueAtTime(0.0001, t);
                g.gain.exponentialRampToValueAtTime(vol, t + 0.06);
                g.gain.setValueAtTime(vol * 0.75, t + dur * 0.5);
                g.gain.exponentialRampToValueAtTime(0.001, t + dur);
                if (hymnVibSoftGain) {
                    hymnVibSoftGain.connect(o1.frequency);
                    hymnVibSoftGain.connect(o2.frequency);
                }
                break;
            }
            case 'sax':
            default: {
                saxNote(freq, t, dur);
                return;
            }
        }
        o1.connect(f); o2.connect(f);
        f.connect(g); g.connect(hymnGain);
        o1.start(t); o2.start(t);
        o1.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
        hymnNodes.push(o1, o2, f, g);
    }

    // Broadcast a melody for a given number of seconds. tuneKey 'hymn' (or
    // omitted) plays the full hand-transcribed verse+chorus of the feature
    // track; any other key loops its verified incipit phrase. timbre selects
    // the voice (default sax). Unknown tunes stay silent so the station bed
    // keeps playing — the app-level safety timer advances the ring anyway.
    function playHymn(duration, tuneKey, timbre) {
        if (!ctx) return;
        stopHymn();
        timbre = timbre || 'sax';
        var total = duration || 90;
        var t0 = ctx.currentTime + 0.2;
        var beat = 0.62;

        var phrase;
        var isFeature = !tuneKey || tuneKey === 'hymn';
        if (!isFeature) {
            phrase = phraseFor(tuneKey);
            if (!phrase || !phrase.length) return; // graceful: bed continues
        }

        // Full separation: duck the station bed to silence so the melody is
        // the only featured broadcast (no pad/arp playing underneath).
        stationGain.gain.cancelScheduledValues(t0);
        stationGain.gain.setTargetAtTime(0, t0, 0.3);
        hymnGain.gain.cancelScheduledValues(t0);
        hymnGain.gain.setTargetAtTime(0.85, t0, 0.4);
        ensureVibrato(timbre);

        var t = t0;
        var i = 0;
        if (isFeature) {
            while (t < t0 + (total - 5)) {
                var note = HYM[i % HYM.length];
                var dur = note[1] * beat;
                saxNote(note[0], t, dur * 0.92);
                t += dur;
                i++;
            }
        } else {
            while (t < t0 + (total - 5)) {
                var p = phrase[i % phrase.length];
                var pd = p.beats * beat;
                toneNote(p.freq, t, pd * 0.94, timbre);
                t += pd;
                i++;
            }
        }
        var fadeAt = t0 + total - 5;
        hymnGain.gain.setValueAtTime(0.85, fadeAt);
        hymnGain.gain.linearRampToValueAtTime(0, t0 + total);
        // Restore the station bed once the melody has ended.
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
        hymnVibOsc = null;
        hymnVibGain = null;
        hymnVibSoftOsc = null;
        hymnVibSoftGain = null;
    }

    // External audio functionality
    function setExternalAudio(url) {
        // If URL hasn't changed, do nothing
        if (externalAudioUrl === url) return;

        // Stop current external audio if any
        stopExternalAudio();

        // Store the new URL
        externalAudioUrl = url;

        // If we don't have a context or no URL, nothing to do
        if (!ctx || !url) {
            externalAudioUrl = null;
            return;
        }

        try {
            // Create audio element
            externalAudio = new Audio(url);
            externalAudio.loop = true; // Loop for continuous broadcast

            // Create MediaElementSource to connect to Web Audio API
            externalAudioSource = ctx.createMediaElementSource(externalAudio);

            // Connect to our external audio gain node
            externalAudioSource.connect(externalAudioGain);

            // Start playing
            externalAudio.play().catch(e => {
                console.error('Failed to play external audio:', e);
                stopExternalAudio();
            });
        } catch (e) {
            console.error('Error setting up external audio:', e);
            stopExternalAudio();
        }
    }

    function stopExternalAudio() {
        if (externalAudio) {
            try {
                externalAudio.pause();
                externalAudio.currentTime = 0;
            } catch (e) { /* ignore */ }
            externalAudio = null;
        }
        if (externalAudioSource) {
            try {
                externalAudioSource.disconnect();
            } catch (e) { /* ignore */ }
            externalAudioSource = null;
        }
        externalAudioUrl = null;
    }

    function setExternalAudioVolume(v) {
        if (externalAudioGain) {
            externalAudioGain.gain.setTargetAtTime(v, ctx.currentTime, 0.03);
        }
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
        stopHymn: stopHymn,
        // External audio API
        setExternalAudio: setExternalAudio,
        stopExternalAudio: stopExternalAudio,
        setExternalAudioVolume: setExternalAudioVolume
    };
})();
/* ==========================================================================
   WHAT IF WE BELIEVED RADIO — app logic
   Power, tuning, signal strength, static, announcer voice.
   ========================================================================== */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);

    const MIN_FREQ = 88.0;
    const MAX_FREQ = 108.0;
    const KNOB_SWEEP = 270; // degrees
    const KNOB_START = -135;

    const STATIONS = [
        { freq: 88.5,  emoji: '\u{1F64F}', name: 'Morning Worship',   show: 'Songs & praise to start your day',   pattern: { type: 'pad',    chord: [261.63, 329.63, 392.0, 523.25], every: 1.6 } },
        { freq: 92.1,  emoji: '\u{1F4D6}', name: 'Bible Stories',     show: 'Stories of faith, told aloud',        pattern: { type: 'arp',    notes: [392, 440, 523.25, 587.33, 659.25], step: 0.26 } },
        { freq: 96.7,  emoji: '\u{1F56F}', name: 'Prayer Hour',       show: 'Quiet time & prayer',                 pattern: { type: 'prayer', drone: 130.81, bellEvery: 4 } },
        { freq: 100.3, emoji: '\u{1F3B5}', name: 'Hymns & Praise',    show: 'Timeless hymns, gently played',       pattern: { type: 'arp',    notes: [523.25, 659.25, 783.99, 1046.5], step: 0.3 } },
        { freq: 104.9, emoji: '\u{1F9D2}', name: "Kids' Bible Hour",  show: 'Bible adventures for little ears',    pattern: { type: 'kids',   notes: [523.25, 659.25, 783.99, 659.25, 880], step: 0.18 } },

        // WhatIfWeBelieved Channel — Live Studio & Teaching Archive
        { freq: 89.3,  emoji: '\u{1F3A4}', name: 'LIVE Studio',       show: 'Live broadcast from @paulos1844',     pattern: { type: 'youtube-live', channelId: 'UCnJMpsZg53Rl4FSuL7Ve58A', title: 'Live Studio' } },
        { freq: 93.7,  emoji: '\u{1F4D6}', name: 'Unstoppable',       show: 'The Rebooted Asset',                  pattern: { type: 'youtube', videoId: 'l9V_MDWfUkg', title: 'Unstoppable: The Rebooted Asset' } },
        { freq: 98.1,  emoji: '\u{1F4DA}', name: 'Reprogramming',     show: 'Empire Theology',                     pattern: { type: 'youtube', videoId: 'ea0dtxkE-bw', title: 'Reprogramming an Empire' } },
        { freq: 102.5, emoji: '\u{1F56F}', name: 'No Guardrails',     show: 'Faith Without a Safety Net',          pattern: { type: 'youtube', videoId: 'vfUmeceFEhw', title: 'No Guardrails: Faith Without a Safety Net' } },
        { freq: 107.3, emoji: '\u{1F4DD}', name: 'How a Good Man',    show: 'Loses His Shape',                     pattern: { type: 'youtube', videoId: '881ddNnGCfs', title: 'How a Good Man Loses His Shape' } },
    ];

    const state = {
        power: false,
        volume: 0.8,
        freq: 89.3,
        locked: null,
        isYouTube: false,
        isYouTubeLive: false
    };

    /* ---------- elements ---------- */
    const powerBtn = $('powerBtn');
    const powerIndicator = $('powerIndicator');
    const screenFreq = $('screenFreq');
    const screenStation = $('screenStation');
    const screenShow = $('screenShow');
    const screenStatic = $('screenStatic');
    const onair = $('onair');
    const signal = $('signal');
    const dialReadout = $('dialReadout');
    const dialNeedle = $('dialNeedle');
    const volumeKnob = $('volumeKnob');
    const tuneKnob = $('tuneKnob');
    const stationChips = $('stationChips');
    const announcerToggle = $('announcerToggle');

    /* ---------- helpers ---------- */
    function nearestStation(freq) {
        let best = null;
        let bestD = Infinity;
        STATIONS.forEach((s) => {
            const d = Math.abs(freq - s.freq);
            if (d < bestD) { bestD = d; best = s; }
        });
        return { station: best, distance: bestD };
    }

    function lockThreshold() { return 0.35; }

    function signalLevel(freq) {
        const { distance } = nearestStation(freq);
        if (distance < lockThreshold()) return 1;
        return Math.max(0, 1 - (distance - lockThreshold()) / 2.2);
    }

    function knobAngleFor(freq) {
        return KNOB_START + ((freq - MIN_FREQ) / (MAX_FREQ - MIN_FREQ)) * KNOB_SWEEP;
    }

    /* ---------- natural announcer voice ---------- */
    let utteranceSeq = 0;
    let hymnTriggerTimer = null;
    let hymnPlayedForSeq = 0;
    let hymnRestoreTimer = null;
    let welcomeEndTimer = null;

    function pickVoice() {
        if (!('speechSynthesis' in window)) return null;
        const voices = window.speechSynthesis.getVoices();
        if (!voices || !voices.length) return null;
        const prefs = ['google us english', 'microsoft aria', 'microsoft jenny', 'microsoft guy', 'samantha', 'karen', 'daniel', 'google uk english female', 'natural'];
        for (const p of prefs) {
            const v = voices.find((x) => x && x.name && x.name.toLowerCase().includes(p));
            if (v) return v;
        }
        return voices.find((v) => v && v.lang && v.lang.toLowerCase().startsWith('en')) || null;
    }

    // Natural, unhurried on-air greeting for a station.
    function stationLine(station) {
        let greet = 'Welcome';
        // Morning Worship station always gets "Good morning" regardless of actual time
        if (station.name === 'Morning Worship') {
            greet = 'Good morning';
        } else {
            const h = new Date().getHours();
            if (h < 5) greet = 'Greetings in the quiet hours';
            else if (h < 12) greet = 'Good morning';
            else if (h < 18) greet = 'Good afternoon';
            else greet = 'Good evening';
        }
        return greet + ' to ' + station.name + '. ' + station.show + '. ' +
            'Sit back, take a breath, and enjoy the hour with us.';
    }

    // Rough spoken duration (ms) at rate 0.9 — used as a safety net for the track.
    function estimateSpeechMs(text) {
        const words = (text.trim().match(/\S+/g) || []).length;
        // ~2.2 words per second at a calm pace, plus a short lead-in.
        return Math.min(30000, Math.max(3000, (words / 2.2) * 1000 + 900));
    }

    // At the end of the announcement, broadcast the music track:
    // "Spirit Lead Me Where My Trust Is Without Borders" (Life Illustrated).
    function startHymnIfStillCurrent(seq) {
        if (seq !== utteranceSeq) return; // a newer announcement replaced this one
        if (!(state.power && state.locked)) return;
        if (hymnPlayedForSeq === seq) return; // already started
        hymnPlayedForSeq = seq;
        if (hymnTriggerTimer) { clearTimeout(hymnTriggerTimer); hymnTriggerTimer = null; }
        playSpiritTrack();
        // Visual confirmation on the radio screen so the broadcast is obvious.
        const prevShow = state.locked ? state.locked.show : '';
        screenShow.textContent = 'Now playing: Spirit Lead Me';
        // Restore the station line when the track finishes (or on error),
        // with a safety net for browsers that never fire 'ended'.
        if (hymnRestoreTimer) { clearTimeout(hymnRestoreTimer); hymnRestoreTimer = null; }
        const restore = function () {
            hymnRestoreTimer = null;
            if (state.locked) screenShow.textContent = prevShow;
        };
        spiritAudio.onended = restore;
        spiritAudio.onerror = restore;
        hymnRestoreTimer = setTimeout(restore, 100000); // ~92s track + margin
    }

    // Play the broadcast track from the top at the current volume.
    function playSpiritTrack() {
        try {
            spiritAudio.pause();
            spiritAudio.currentTime = 0;
            spiritAudio.volume = Math.max(0.05, state.volume * 0.9);
            const p = spiritAudio.play();
            if (p && typeof p.catch === 'function') p.catch(function () { /* noop */ });
        } catch (e) { /* ignore */ }
    }

    // Cut the broadcast track (new announcement, tuning away, power off).
    function stopSpiritTrack() {
        try {
            spiritAudio.pause();
            spiritAudio.onended = null;
            spiritAudio.onerror = null;
        } catch (e) { /* ignore */ }
    }

    function announce(text) {
        try {
            RadioAudio.stopHymn(); // never overlap an ongoing hymn
            stopSpiritTrack(); // cut any broadcast track still playing
            if (hymnTriggerTimer) { clearTimeout(hymnTriggerTimer); hymnTriggerTimer = null; }
            // One voice on air: cut any welcome jingle still playing or pending.
            if (welcomeEndTimer) { clearTimeout(welcomeEndTimer); welcomeEndTimer = null; }
            welcomeAudio.onended = null;
            welcomeAudio.onerror = null;
            try { welcomeAudio.pause(); } catch (e) { /* noop */ }

            const seq = ++utteranceSeq;

            // When the announcer is enabled AND speech synthesis is available,
            // speak first, then start the music track when speech finishes.
            // Skip music track for YouTube stations (they have their own audio)
            const pattern = state.locked && state.locked.pattern;
            const isYouTubeStation = pattern && (pattern.type === 'youtube' || pattern.type === 'youtube-live');
            
            if (announcerToggle.checked && 'speechSynthesis' in window) {
                // Cancel the previous announcement, then speak a tick later so
                // Chrome has actually stopped the old voice before the new one
                // starts (prevents two stations talking over each other).
                window.speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance(text);
                const v = pickVoice();
                if (v) u.voice = v;
                u.rate = 0.9;
                u.pitch = 1.0;
                u.volume = 0.85;
                // Primary trigger: when the announcer finishes, broadcast the music track.
                u.onend = function () { 
                    if (!isYouTubeStation) startHymnIfStillCurrent(seq); 
                };
                setTimeout(function () {
                    if (seq === utteranceSeq) window.speechSynthesis.speak(u);
                }, 50);
                // Safety net: if onend never fires (known Chrome issue), the track still plays on schedule.
                hymnTriggerTimer = setTimeout(function () {
                    hymnTriggerTimer = null;
                    if (!isYouTubeStation) startHymnIfStillCurrent(seq);
                }, estimateSpeechMs(text) + 100);
                return;
            }

            // Announcer off (or unsupported): still feature the broadcast —
            // the music track begins after a short pause, no voice required.
            if (!isYouTubeStation) {
                hymnTriggerTimer = setTimeout(function () {
                    hymnTriggerTimer = null;
                    startHymnIfStillCurrent(seq);
                }, 3500);
            }
        } catch (e) { /* ignore */ }
    }

    /* ---------- rendering ---------- */
    function setSignalBars(level) {
        const bars = signal.querySelectorAll('span');
        const lit = Math.round(level * bars.length);
        bars.forEach((b, i) => b.classList.toggle('lit', i < lit));
    }

    function renderScreen() {
        screenStatic.style.opacity = state.power ? String(Math.round((1 - signalLevel(state.freq)) * 0.85 * 100) / 100) : '0';
        setSignalBars(state.power ? signalLevel(state.freq) : 0);
        onair.classList.toggle('off', !state.power || !state.locked);

        if (!state.power) {
            screenFreq.textContent = 'OFF';
            screenStation.textContent = 'Welcome!';
            screenShow.textContent = 'Press the power button to begin';
            dialReadout.textContent = 'POWER OFF';
            return;
        }
        screenFreq.textContent = state.freq.toFixed(1) + ' MHz';
        dialReadout.textContent = state.freq.toFixed(1) + ' MHz';
        if (state.locked) {
            screenStation.textContent = state.locked.emoji + ' ' + state.locked.name;
            screenShow.textContent = state.locked.show;
        } else {
            screenStation.textContent = 'Tuning\u2026';
            screenShow.textContent = 'Searching for signal\u2026';
        }
    }

    function renderKnob(angle, el) {
        el.style.transform = 'rotate(' + angle + 'deg)';
    }

    function renderDial() {
        const pct = ((state.freq - MIN_FREQ) / (MAX_FREQ - MIN_FREQ)) * 100;
        dialNeedle.style.left = pct + '%';
        renderKnob(knobAngleFor(state.freq), tuneKnob);
        renderKnob(knobAngleFor(state.volume * 20 + MIN_FREQ), volumeKnob);
    }

    /* ---------- tuning ---------- */
    function tuneTo(freq, opts) {
        opts = opts || {};
        state.freq = Math.min(MAX_FREQ, Math.max(MIN_FREQ, freq));
        if (!state.power) { renderScreen(); renderDial(); return; }

        const { station, distance } = nearestStation(state.freq);
        const wasLocked = state.locked;
        if (distance < lockThreshold()) {
            if (state.locked !== station) {
                state.locked = station;
                const pattern = station.pattern || {};
                state.isYouTube = pattern.type === 'youtube' || pattern.type === 'youtube-live';
                state.isYouTubeLive = pattern.type === 'youtube-live';
                
                // Stop any existing audio
                RadioAudio.stopStation();
                RadioAudio.stopHymn();
                RadioAudio.stopYouTube();
                
                RadioAudio.chime();
                
                if (state.isYouTube) {
                    if (state.isYouTubeLive) {
                        // Load live stream from channel
                        const channelId = pattern.channelId;
                        screenShow.textContent = 'Connecting to Live Studio...';
                        RadioAudio.loadYouTubeLive(channelId).then(function() {
                            if (state.power && state.locked === station) {
                                RadioAudio.playYouTube();
                                screenShow.textContent = '🔴 LIVE: ' + pattern.title;
                            }
                        }).catch(function(err) {
                            console.warn('Live stream load failed:', err);
                            screenShow.textContent = 'No live broadcast - try recorded teachings';
                        });
                    } else {
                        // Load and play YouTube video
                        const videoId = pattern.videoId;
                        screenShow.textContent = 'Loading: ' + pattern.title + '...';
                        RadioAudio.loadYouTubeVideo(videoId).then(function() {
                            if (state.power && state.locked === station) {
                                RadioAudio.playYouTube();
                                screenShow.textContent = 'Now playing: ' + pattern.title;
                            }
                        }).catch(function(err) {
                            console.warn('YouTube load failed:', err);
                            screenShow.textContent = 'YouTube unavailable - try another station';
                        });
                    }
                } else {
                    RadioAudio.startStation(pattern);
                }
            }
            if (opts.announce !== false) {
                announce(stationLine(station));
            }
        } else {
            if (state.locked) {
                state.locked = null;
                state.isYouTube = false;
                state.isYouTubeLive = false;
                RadioAudio.stopStation();
                RadioAudio.stopHymn();
                RadioAudio.stopYouTube();
            }
            RadioAudio.setStatic(signalLevel(state.freq) < 1 ? 1 : 0);
        }
        if (state.locked) RadioAudio.setStatic(0);
        renderScreen();
        renderDial();
        void wasLocked;
    }

    /* ---------- power ---------- */
    const welcomeAudio = new Audio('welcome.mp3?v=20260808b');
    const spiritAudio = new Audio('spirit-lead-me.mp3?v=20260808b');

    // Play the pre-recorded welcome jingle, then run onEnded when it finishes.
    // A safety timer covers browsers where the jingle never fires 'ended'.
    function playWelcome(onEnded) {
        const done = function () {
            if (welcomeEndTimer) { clearTimeout(welcomeEndTimer); welcomeEndTimer = null; }
            welcomeAudio.onended = null;
            welcomeAudio.onerror = null;
            if (onEnded) onEnded();
        };
        try {
            welcomeAudio.onended = done;
            welcomeAudio.onerror = done;
            welcomeAudio.currentTime = 0;
            welcomeAudio.play();
            if (onEnded) {
                if (welcomeEndTimer) clearTimeout(welcomeEndTimer);
                welcomeEndTimer = setTimeout(done, 17000);
            }
        } catch (e) {
            done();
        }
    }

    function setPower(on) {
        state.power = on;
        RadioAudio.power(on);
        powerIndicator.classList.toggle('on', on);
        powerBtn.classList.toggle('on', on);
        if (on) {
            RadioAudio.setVolume(state.volume);
            tuneTo(state.freq, { announce: false });
            // Sequence voices: welcome jingle first, then the announcer greets,
            // then the hymn follows. Only one voice is ever on air at a time.
            if (state.locked) {
                const welcomeStation = state.locked;
                playWelcome(function () {
                    if (state.power && state.locked === welcomeStation) {
                        announce(stationLine(welcomeStation));
                    }
                });
            } else {
                playWelcome(null);
            }
        } else {
            welcomeAudio.pause();
            if (welcomeEndTimer) { clearTimeout(welcomeEndTimer); welcomeEndTimer = null; }
            window.speechSynthesis.cancel();
            if (hymnTriggerTimer) { clearTimeout(hymnTriggerTimer); hymnTriggerTimer = null; }
            if (hymnRestoreTimer) { clearTimeout(hymnRestoreTimer); hymnRestoreTimer = null; }
            RadioAudio.stopHymn();
            RadioAudio.stopYouTube();
            stopSpiritTrack();
            screenStatic.style.opacity = '0';
            state.locked = null;
            state.isYouTube = false;
            state.isYouTubeLive = false;
            renderScreen();
            renderDial();
        }
    }

    /* ---------- knob drag ---------- */
    function attachKnob(el, onDelta) {
        let dragging = false;
        let lastY = 0;
        el.addEventListener('pointerdown', (e) => {
            dragging = true;
            lastY = e.clientY;
            el.setPointerCapture(e.pointerId);
            RadioAudio.resume();
            RadioAudio.click();
        });
        el.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const dy = lastY - e.clientY;
            lastY = e.clientY;
            onDelta(dy);
        });
        el.addEventListener('pointerup', () => { dragging = false; });
        el.addEventListener('pointercancel', () => { dragging = false; });
        el.addEventListener('keydown', (e) => {
            const step = e.shiftKey ? 1 : 0.2;
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); onDelta(step); }
            if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); onDelta(-step); }
        });
    }

    attachKnob(tuneKnob, (dy) => {
        if (!state.power) return;
        tuneTo(state.freq + dy * 0.35);
        RadioAudio.click();
    });

    attachKnob(volumeKnob, (dy) => {
        state.volume = Math.min(1, Math.max(0, state.volume + dy * 0.02));
        RadioAudio.setVolume(state.volume);
        RadioAudio.setYouTubeVolume(state.volume);
        renderDial();
    });

    /* ---------- buttons & chips ---------- */
    powerBtn.addEventListener('click', () => {
        console.log('Power button clicked, current state:', state.power);
        console.log('powerBtn element:', powerBtn);
        console.log('RadioAudio:', typeof RadioAudio);
        RadioAudio.resume();
        setPower(!state.power);
    });

    STATIONS.forEach((s) => {
        const chip = document.createElement('button');
        chip.className = 'station-chip';
        chip.innerHTML = '<span class="chip-emoji">' + s.emoji + '</span>' +
            '<span class="chip-name">' + s.name + '</span>' +
            '<span class="chip-freq">' + s.freq.toFixed(1) + '</span>';
        chip.title = s.show;
        chip.addEventListener('click', () => {
            RadioAudio.resume();
            if (!state.power) setPower(true);
            tuneTo(s.freq);
        });
        stationChips.appendChild(chip);
    });

    /* ---------- init ---------- */
    console.log('Radio app initialized, powerBtn:', $('powerBtn'));
    if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = function () { /* warm voice cache */ };
    }
    setPower(false);
    renderDial();
})();

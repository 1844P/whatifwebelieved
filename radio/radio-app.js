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
        { freq: 104.9, emoji: '\u{1F9D2}', name: "Kids' Bible Hour",  show: 'Bible adventures for little ears',    pattern: { type: 'kids',   notes: [523.25, 659.25, 783.99, 659.25, 880], step: 0.18 } }
    ];

    const state = {
        power: false,
        volume: 0.8,
        freq: 92.1,
        locked: null
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

    function announce(text) {
        if (!announcerToggle.checked) return;
        try {
            if (!('speechSynthesis' in window)) return;
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.rate = 0.95;
            u.pitch = 1.05;
            u.volume = 0.75;
            window.speechSynthesis.speak(u);
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
                RadioAudio.chime();
                RadioAudio.startStation(station.pattern);
                if (opts.announce !== false) {
                    announce("You're listening to " + station.name + ". " + station.show);
                }
            }
        } else {
            if (state.locked) {
                state.locked = null;
                RadioAudio.stopStation();
            }
            RadioAudio.setStatic(signalLevel(state.freq) < 1 ? 1 : 0);
        }
        if (state.locked) RadioAudio.setStatic(0);
        renderScreen();
        renderDial();
        void wasLocked;
    }

    /* ---------- power ---------- */
    const welcomeAudio = new Audio('welcome.mp3');

    function playWelcome() {
        try {
            welcomeAudio.currentTime = 0;
            welcomeAudio.play();
        } catch (e) { /* autoplay blocked — user clicked, so rare */ }
    }

    function setPower(on) {
        state.power = on;
        RadioAudio.power(on);
        powerIndicator.classList.toggle('on', on);
        powerBtn.classList.toggle('on', on);
        if (on) {
            RadioAudio.setVolume(state.volume);
            playWelcome();
            tuneTo(state.freq, { announce: false });
        } else {
            welcomeAudio.pause();
            screenStatic.style.opacity = '0';
            state.locked = null;
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
        renderDial();
    });

    /* ---------- buttons & chips ---------- */
    powerBtn.addEventListener('click', () => {
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
    setPower(false);
    renderDial();
})();

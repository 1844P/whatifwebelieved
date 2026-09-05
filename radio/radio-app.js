/* ==========================================================================
   WHAT IF WE BELIEVED RADIO — app logic
   Power, tuning, signal strength, static, announcer voice.
Continuous broadcast: playlist ring + intermission that repeats the
    station's opening (welcome jingle + announcer greeting) every few tracks.
    Placeholder programming: with AUTO_RELAY_PROGRAMMING on, the announcer
    introduces the tuned station, then Adventist World Radio (English) fills
    the air — interrupted every half hour for a fresh station greeting.
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
        { freq: 92.1,  emoji: '\u{1F4D6}', name: 'Bible Stories',     show: 'Stories of faith, told aloud',        pattern: { type: 'arp',    notes: [392, 440, 523.25, 587.33, 659.25], step: 0.26 }, voice: 'male' },
        { freq: 96.7,  emoji: '\u{1F56F}', name: 'Prayer Hour',       show: 'Quiet time & prayer',                 pattern: { type: 'prayer', drone: 130.81, bellEvery: 4 } },
        { freq: 100.3, emoji: '\u{1F3B5}', name: 'Hymns & Praise',    show: 'Timeless hymns, gently played',       pattern: { type: 'arp',    notes: [523.25, 659.25, 783.99, 1046.5], step: 0.3 } },
        { freq: 104.9, emoji: '\u{1F9D2}', name: "Kids' Bible Hour",  show: 'Bible adventures for little ears',    pattern: { type: 'kids',   notes: [523.25, 659.25, 783.99, 659.25, 880], step: 0.18 } }
    ];

    const state = {
        power: false,
        volume: 0.8,
        freq: 92.1,
        locked: null,
        externalAudioUrl: null, // New: for external audio streaming
        usingExternalAudio: false, // New: flag to track if we're using external audio
        externalAudioVolume: 0.8 // New: volume for external audio
    };

    /* ---------- internet relay presets ---------- */
    // Live English relays of Adventist World Radio. AWR SID Media (South
    // Africa) is the official AWR English service; its CDN (iono.fm) is
    // fully CORS-enabled for web players, including the Icy-MetaData
    // preflight. Faith FM (Australia) is an Adventist English station as an
    // MP3 alternative. Any https stream URL works via the custom field too.
    const RELAYS = {
        awr: {
            name: 'Adventist World Radio (English)',
            sub:  'AWR SID Media \u00B7 South Africa \u2014 official AWR English service',
            url:  'https://edge.iono.fm/xice/187_medium.aac'
        },
        faithfm: {
            name: 'Faith FM (English)',
            sub:  'Adventist radio \u00B7 Australia \u2014 24/7 English',
            url:  'https://stream1.faithfm.com.au/FaithFM.mp3'
        }
    };

    // Active relay descriptor, or null while the radio runs its own locally
    // generated broadcast. While a relay is live, the radio stops generating
    // sound and becomes a dedicated speaker/tuner for the internet stream.
    let relay = null;

    // Placeholder programming: after the announcer introduces the tuned
    // station, pipe Adventist World Radio (English) through the speaker, and
    // interrupt the relay every half hour so the announcer can re-introduce
    // the station. Flip AUTO_RELAY_PROGRAMMING to false to restore the full
    // local broadcast (playlist ring + intermission) once it is ready.
    const AUTO_RELAY_PROGRAMMING = true;
    const AUTO_RELAY_KEY = 'awr';

    // Half-hour station announcements during auto relay programming. For
    // testing, shrink the wait with ?interrupt=10s (or 5m) in the URL.
    const INTERRUPT_EVERY_MS = (function () {
        try {
            const m = /[?&]interrupt=(\d+)(m|s)/.exec(location.search);
            if (m) return parseInt(m[1], 10) * (m[2] === 'm' ? 60000 : 1000);
        } catch (e) { /* ignore */ }
        return 30 * 60 * 1000;
    })();

    // False when the listener has taken over the radio (a manual relay, or
    // Clear Stream) so the auto relay does not force its way back on air.
    let userSwitchedToLocal = false;
    let relayInterruptTimer = null;

    /* ---------- continuous playlist ring + intermission ---------- */
    // The broadcast loops through TRACKS forever. Every INTERMISSION_EVERY
    // tracks, the station replays its power-on opening: the welcome jingle,
    // then the announcer's spoken greeting for the tuned station, then music.
    const INTERMISSION_EVERY = 3;

    // Voice color per station block for the synthesized hymn ring.
    const TIMBRE = { MW: 'reed', BS: 'flute', PH: 'bell', HP: 'sax', KB: 'musicbox', NR: 'strings' };

    // 31-track ring: Morning Worship -> Bible Stories -> Prayer Hour ->
    // Hymns & Praise -> Kids' Bible Hour -> Night of Reflection -> loop.
    // All 30 public-domain tunes are synthesized in-browser from verified
    // Hymnary incipits (see radio-audio.js HYMNS) in the block's timbre;
    // only Spirit Lead Me is a real recording (licensed station feature).
    const TRACKS = [
        // 06:00 Morning Worship
        { id: 'when-morning-gilds',            title: 'When Morning Gilds the Skies',        block: 'MW', synth: 'laudes-domini',      approxSec: 180 },
        { id: 'dawn-of-sabbath',               title: "The Dawn of God's Dear Sabbath",      block: 'MW', synth: 'st-georges-bolton', approxSec: 180 },
        { id: 'holy-holy-holy',                title: 'Holy, Holy, Holy',                    block: 'MW', synth: 'nicaea',            approxSec: 210 },
        { id: 'all-creatures',                 title: 'All Creatures of Our God and King',   block: 'MW', synth: 'lasst-uns-erfreuen', approxSec: 210 },
        { id: 'o-worship-the-king',            title: 'O Worship the King',                  block: 'MW', synth: 'lyons',             approxSec: 180 },
        // 09:00 Bible Stories
        { id: 'tell-me-the-story-of-jesus',    title: 'Tell Me the Story of Jesus',          block: 'BS', synth: 'story-of-jesus',     approxSec: 195 },
        { id: 'tell-me-the-old-old-story',     title: 'Tell Me the Old, Old Story',          block: 'BS', synth: 'evangel',           approxSec: 195 },
        { id: 'i-love-to-tell-the-story',      title: 'I Love to Tell the Story',            block: 'BS', synth: 'hankey',            approxSec: 195 },
        { id: 'rescue-the-perishing',          title: 'Rescue the Perishing',                block: 'BS', synth: 'rescue',            approxSec: 180 },
        { id: 'wonderful-words-of-life',       title: 'Wonderful Words of Life',             block: 'BS', synth: 'words-of-life',     approxSec: 180 },
        // 12:00 Prayer Hour
        { id: 'i-need-thee-every-hour',        title: 'I Need Thee Every Hour',              block: 'PH', synth: 'need',              approxSec: 180 },
        { id: 'sweet-hour-of-prayer',          title: 'Sweet Hour of Prayer',                block: 'PH', synth: 'sweet-hour',        approxSec: 195 },
        { id: 'what-a-friend',                 title: 'What a Friend We Have in Jesus',      block: 'PH', synth: 'erie',              approxSec: 210 },
        { id: 'tis-so-sweet-to-trust',         title: "'Tis So Sweet to Trust in Jesus",     block: 'PH', synth: 'trusting-jesus',    approxSec: 180 },
        { id: 'come-thou-fount',               title: 'Come, Thou Fount of Every Blessing',  block: 'PH', synth: 'nettleton',         approxSec: 195 },
        // 15:00 Hymns & Praise
        { id: 'how-great-thou-art',            title: 'How Great Thou Art',                  block: 'HP', synth: 'hymn',              approxSec: 90 },
        { id: 'spirit-lead-me',                title: 'Spirit Lead Me',                      block: 'HP', file: 'spirit-lead-me.mp3?v=20260802f', approxSec: 92 },
        { id: 'amazing-grace',                 title: 'Amazing Grace',                       block: 'HP', synth: 'new-britain',       approxSec: 210 },
        { id: 'nearer-my-god-to-thee',         title: 'Nearer, My God, to Thee',             block: 'HP', synth: 'bethany',           approxSec: 210 },
        { id: 'it-is-well',                    title: 'It Is Well with My Soul',             block: 'HP', synth: 'ville-du-havre',    approxSec: 210 },
        { id: 'the-lords-my-shepherd',         title: "The Lord's My Shepherd",              block: 'HP', synth: 'crimond',           approxSec: 180 },
        // 18:00 Kids' Bible Hour
        { id: 'jesus-loves-me',                title: 'Jesus Loves Me',                      block: 'KB', synth: 'jesus-loves-me',    approxSec: 150 },
        { id: 'children-of-the-heavenly-father', title: 'Children of the Heavenly Father',   block: 'KB', synth: 'tryggare',          approxSec: 180 },
        { id: 'jesus-tender-shepherd',         title: 'Jesus, Tender Shepherd, Hear Me',     block: 'KB', synth: 'shipston',          approxSec: 150 },
        { id: 'all-things-bright-and-beautiful', title: 'All Things Bright and Beautiful',   block: 'KB', synth: 'royal-oak',         approxSec: 180 },
        { id: 'i-think-when-i-read',           title: 'I Think When I Read That Sweet Story', block: 'KB', synth: 'sweet-story',       approxSec: 180 },
        // 21:00 Night of Reflection
        { id: 'day-is-dying-in-the-west',      title: 'Day Is Dying in the West',            block: 'NR', synth: 'chautauqua',        approxSec: 210 },
        { id: 'abide-with-me',                 title: 'Abide with Me',                       block: 'NR', synth: 'eventide',          approxSec: 210 },
        { id: 'softly-now-the-light-of-day',   title: 'Softly Now the Light of Day',         block: 'NR', synth: 'seymour',           approxSec: 180 },
        { id: 'now-the-day-is-over',           title: 'Now the Day Is Over',                 block: 'NR', synth: 'merrial',           approxSec: 180 },
        { id: 'the-day-thou-gavest',           title: 'The Day Thou Gavest, Lord, Is Ended', block: 'NR', synth: 'st-clement',        approxSec: 210 }
    ];

    // Owns the broadcast ring: plays one track, then the next, forever.
    // A track is an mp3, or a synthesized hymn (synth:'<tune>') via RadioAudio.
    const Playlist = (function () {
        let idx = 0;
        let seq = -1;
        let intermissionCount = 0;
        let safetyTimer = null;
        let curAudio = null;

        function playNext() {
            stopTrack();
            if (!(state.power && state.locked)) return;
            const entry = TRACKS[idx % TRACKS.length];
            idx++;
            screenShow.textContent = 'Now playing: ' + entry.title;
            if (entry.synth) {
                RadioAudio.playHymn(entry.approxSec, entry.synth, TIMBRE[entry.block] || 'sax');
                safetyTimer = setTimeout(advance, (entry.approxSec + 6) * 1000);
                return;
            }
            try {
                curAudio = new Audio(entry.file);
                curAudio.volume = Math.max(0.05, state.volume * 0.9);
                curAudio.onended = advance;
                curAudio.onerror = advance; // 404 or decode failure: move on
                curAudio.play().catch(function () { /* ignore */ });
                safetyTimer = setTimeout(advance, entry.approxSec * 1000 + 5000);
            } catch (e) {
                advance();
            }
        }

        function advance() {
            if (!(state.power && state.locked)) return;
            intermissionCount++;
            if (intermissionCount % INTERMISSION_EVERY === 0) {
                beginIntermission();
            } else {
                playNext();
            }
        }

        // Repeats the station's power-on opening (welcome jingle, then the
        // announcer's greeting). The playlist resumes when the announcer
        // finishes, via announce() onend -> startHymnIfStillCurrent.
        function beginIntermission() {
            const st = state.locked;
            screenShow.textContent = 'Intermission';
            playWelcome(function () {
                if (state.power && state.locked === st) announce(stationLine(st));
            });
        }

        function stopTrack() {
            if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
            if (curAudio) {
                try { curAudio.pause(); } catch (e) { /* ignore */ }
                curAudio.onended = null;
                curAudio.onerror = null;
                curAudio = null;
            }
            RadioAudio.stopHymn();
        }

        function start(seqNo) {
            seq = seqNo;
            intermissionCount = 0;
            playNext();
        }

        function stop() {
            seq = -1;
            intermissionCount = 0;
            stopTrack();
        }

        return { start: start, stop: stop, stopTrack: stopTrack };
    })();

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

    // External audio UI elements
    const externalAudioConfig = $('externalAudioConfig');
    const configToggle = $('configToggle');
    const configContent = $('configContent');
    const externalAudioSourceSelect = $('externalAudioSource');
    const externalAudioUrlInput = $('externalAudioUrl');
    const customUrlContainer = document.querySelector('.custom-url-container');
    const externalAudioVolumeInput = $('externalAudioVolume');
    const externalAudioVolOut = $('externalAudioVolOut');
    const applyExternalAudioBtn = $('applyExternalAudio');
    const clearExternalAudioBtn = $('clearExternalAudio');
    const externalAudioStatus = $('externalAudioStatus');

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
    let welcomeEndTimer = null;

    // Preferred voices. DEFAULT keeps the original feel (mostly female
    // natural voices); MALE is used for stations that want the male
    // announcer (e.g. Bible Stories — see STATIONS[].voice) and tries male
    // voices first before falling back.
    const DEFAULT_VOICE_PREFS = ['google us english', 'microsoft aria', 'microsoft jenny', 'microsoft guy', 'samantha', 'karen', 'daniel', 'google uk english female', 'natural'];
    const MALE_VOICE_PREFS = ['google uk english male', 'microsoft guy', 'microsoft david', 'microsoft mark', 'microsoft christopher', 'microsoft james', 'daniel'];

    function pickVoice(gender) {
        if (!('speechSynthesis' in window)) return null;
        const voices = window.speechSynthesis.getVoices();
        if (!voices || !voices.length) return null;
        const prefs = gender === 'male' ? MALE_VOICE_PREFS : DEFAULT_VOICE_PREFS;
        for (const p of prefs) {
            const v = voices.find((x) => x && x.name && x.name.toLowerCase().includes(p));
            if (v) return v;
        }
        // Gender-aware fallback before settling for any English voice.
        if (gender === 'male') {
            const anyMale = voices.find((v) => v && v.name && /\b(david|mark|guy|james|christopher|daniel|michael|male)\b/i.test(v.name));
            if (anyMale) return anyMale;
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

    // Professional sign-off when the announcer hands the air over to
    // Adventist World Radio (auto relay placeholder programming). The
    // half-hour return uses the "back over" variant.
    function awrSignOff(again) {
        if (!(AUTO_RELAY_PROGRAMMING && !userSwitchedToLocal)) return '';
        return (again
            ? 'And now, I turn you back over to Adventist World Radio'
            : 'And now, I turn you over to Adventist World Radio') + '. Enjoy the blessing.';
    }

    // Full on-air station introduction: the greeting plus the AWR hand-off
    // whenever the broadcast continues on the relay.
    function stationAnnounceText(st, again) {
        let text = stationLine(st);
        const signOff = awrSignOff(again);
        if (signOff) text += ' ' + signOff;
        return text;
    }

    // Rough spoken duration (ms) at rate 0.9 — used as a safety net for the track.
    function estimateSpeechMs(text) {
        const words = (text.trim().match(/\S+/g) || []).length;
        // ~2.2 words per second at a calm pace, plus a short lead-in.
        return Math.min(30000, Math.max(3000, (words / 2.2) * 1000 + 900));
    }

    // At the end of the announcement, resume the continuous broadcast.
    function startHymnIfStillCurrent(seq) {
        if (seq !== utteranceSeq) return; // a newer announcement replaced this one
        if (!(state.power && state.locked)) return;
        if (hymnPlayedForSeq === seq) return; // already started
        hymnPlayedForSeq = seq;
        if (hymnTriggerTimer) { clearTimeout(hymnTriggerTimer); hymnTriggerTimer = null; }

        // Placeholder programming: once the announcer has said what the
        // station is about, the broadcast continues on Adventist World Radio.
        // resumeAutoRelay() covers the half-hour interrupts; enterAutoRelay()
        // covers the power-on/station greeting. Flip AUTO_RELAY_PROGRAMMING
        // to false to keep the local playlist ring instead.
        if (AUTO_RELAY_PROGRAMMING && !userSwitchedToLocal) {
            if (relay && relay.auto) {
                resumeAutoRelay();
            } else if (!relay) {
                enterAutoRelay();
            } else {
                Playlist.start(seq); // manual relay on air: nothing to do
            }
            return;
        }
        Playlist.start(seq);
    }

    function announce(text) {
        try {
            RadioAudio.stopHymn(); // never overlap an ongoing hymn
            Playlist.stopTrack(); // cut any broadcast track still playing
            if (hymnTriggerTimer) { clearTimeout(hymnTriggerTimer); hymnTriggerTimer = null; }
            // One voice on air: cut any welcome jingle still playing or pending.
            if (welcomeEndTimer) { clearTimeout(welcomeEndTimer); welcomeEndTimer = null; }
            welcomeAudio.onended = null;
            welcomeAudio.onerror = null;
            try { welcomeAudio.pause(); } catch (e) { /* noop */ }

            // During auto relay programming the announcer takes the air over
            // the AWR stream: silence the relay for the station intro, and
            // let startHymnIfStillCurrent -> resumeAutoRelay bring it back.
            if (relay && relay.auto) RadioAudio.pauseExternalAudio();

            const seq = ++utteranceSeq;

            // When the announcer is enabled AND speech synthesis is available,
            // speak first, then start the music track when speech finishes.
            if (announcerToggle.checked && 'speechSynthesis' in window) {
                // Cancel the previous announcement, then speak a tick later so
                // Chrome has actually stopped the old voice before the new one
                // starts (prevents two stations talking over each other).
                window.speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance(text);
                const v = pickVoice(state.locked && state.locked.voice);
                if (v) u.voice = v;
                u.rate = 0.9;
                u.pitch = 1.0;
                u.volume = 0.85;
                // Primary trigger: when the announcer finishes, resume the broadcast.
                u.onend = function () { startHymnIfStillCurrent(seq); };
                setTimeout(function () {
                    if (seq === utteranceSeq) window.speechSynthesis.speak(u);
                }, 50);
                // Safety net: if onend never fires (known Chrome issue), the track still plays on schedule.
                hymnTriggerTimer = setTimeout(function () {
                    hymnTriggerTimer = null;
                    startHymnIfStillCurrent(seq);
                }, estimateSpeechMs(text) + 100);
                return;
            }

            // Announcer off (or unsupported): still feature the broadcast —
            // the music track begins after a short pause, no voice required.
            hymnTriggerTimer = setTimeout(function () {
                hymnTriggerTimer = null;
                startHymnIfStillCurrent(seq);
            }, 3500);
        } catch (e) { /* ignore */ }
    }

    /* ---------- rendering ---------- */
    function setSignalBars(level) {
        const bars = signal.querySelectorAll('span');
        const lit = Math.round(level * bars.length);
        bars.forEach((b, i) => b.classList.toggle('lit', i < lit));
    }

    function renderScreen() {
        if (relay) {
            // Internet relay on air: the dial is cosmetic, the signal is
            // full, and the stream name fills the screen.
            screenStatic.style.opacity = '0';
            setSignalBars(1);
            onair.classList.remove('off');
            screenFreq.textContent = 'RELAY';
            if (relay.station) {
                // Auto relay: the speaker carries AWR but the dial still
                // points at the tuned station, so the screen shows the
                // station's identity with the relay source underneath.
                screenFreq.textContent = state.freq.toFixed(1) + ' MHz';
                screenStation.textContent = relay.station.emoji + ' ' + relay.station.name;
                screenShow.textContent = relay.station.show + ' \u2014 via ' + relay.name;
                dialReadout.textContent = state.freq.toFixed(1) + ' MHz';
            } else {
                screenStation.textContent = relay.name;
                screenShow.textContent = relay.sub;
                dialReadout.textContent = 'RELAY';
            }
            return;
        }
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
            screenStation.textContent = 'Tuning…';
            screenShow.textContent = 'Searching for signal…';
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
        if (relay && !relay.auto) {
            // While a manual relay is on air, tuning stays cosmetic — the
            // external broadcast continues uninterrupted on the speaker.
            renderScreen();
            renderDial();
            return;
        }

        const { station, distance } = nearestStation(state.freq);
        const wasLocked = state.locked;
        if (distance < lockThreshold()) {
            if (state.locked !== station) {
                state.locked = station;
                RadioAudio.chime();
                if (relay && relay.auto) {
                    // Auto relay: keep the AWR stream on the speaker, just
                    // re-brand the on-air identity for the new station. The
                    // announcer intro (and pause/resume of the relay) runs
                    // below exactly like a local re-tune.
                    relay.station = station;
                } else {
                    RadioAudio.startStation(station.pattern);
                }
            }
            if (opts.announce !== false) {
                announce(stationAnnounceText(station, false));
            }
        } else {
            if (state.locked) {
                state.locked = null;
                RadioAudio.stopStation();
                RadioAudio.stopHymn();
                Playlist.stopTrack();
                if (relay && relay.auto) relay.station = null;
            }
            // Keep the AWR stream audible while dialing through static;
            // only the local radio emits static here.
            if (!(relay && relay.auto)) RadioAudio.setStatic(signalLevel(state.freq) < 1 ? 1 : 0);
        }
        if (state.locked) RadioAudio.setStatic(0);
        renderScreen();
        renderDial();
        void wasLocked;
    }

    /* ---------- power ---------- */
    const welcomeAudio = new Audio('welcome.mp3?v=20260802e');

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
            relay = null; // a manual power-on always starts fresh
            userSwitchedToLocal = false; // a power cycle restores auto relay programming
            clearRelayInterrupt();
            RadioAudio.setVolume(state.volume);
            // Set external audio volume if we're using external audio
            if (state.usingExternalAudio) {
                RadioAudio.setExternalAudioVolume(state.externalAudioVolume);
            }
            tuneTo(state.freq, { announce: false });
            // Sequence voices: welcome jingle first, then the announcer greets,
            // then the broadcast follows. Only one voice is ever on air at a time.
            if (state.locked) {
                const welcomeStation = state.locked;
                playWelcome(function () {
                    if (state.power && state.locked === welcomeStation) {
                        announce(stationAnnounceText(welcomeStation, false));
                    }
                });
            } else {
                playWelcome(null);
            }
        } else {
            relay = null;
            clearRelayInterrupt();
            welcomeAudio.pause();
            if (welcomeEndTimer) { clearTimeout(welcomeEndTimer); welcomeEndTimer = null; }
            window.speechSynthesis.cancel();
            if (hymnTriggerTimer) { clearTimeout(hymnTriggerTimer); hymnTriggerTimer = null; }
            Playlist.stop();
            RadioAudio.stopHymn();
            RadioAudio.stopExternalAudio(); // Stop external audio when powering off
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
        // Update external audio volume proportionally if using external audio
        if (state.usingExternalAudio) {
            // External audio volume is independent but we'll keep it in sync with main volume for simplicity
            state.externalAudioVolume = state.volume;
            RadioAudio.setExternalAudioVolume(state.externalAudioVolume);
        }
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

    /* ---------- external audio / internet relay controls ---------- */
    function updateExternalAudioStatus() {
        if (relay) {
            externalAudioStatus.textContent = 'Relaying: ' + relay.name + ' \u2014 ' + relay.url;
            externalAudioStatus.style.color = '#4CAF50'; // Green
        } else {
            externalAudioStatus.textContent = 'No external audio configured';
            externalAudioStatus.style.color = '#ff9800'; // Orange
        }
    }

    function flashButton(btn, text, ms) {
        const old = btn.textContent;
        btn.textContent = text;
        setTimeout(function () { btn.textContent = old; }, ms || 2000);
    }

    // Enter relay mode: stop the locally generated broadcast and pipe the
    // internet stream through the radio instead. keyOrUrl is a RELAYS preset
    // id or a direct stream URL; customLabel names non-preset sources.
    /* ---------- auto relay programming (placeholder broadcast) ---------- */
    // After the announcer introduces the tuned station, the radio pipes the
    // AWR English service through the speaker until the full WIWB broadcast
    // is ready. Every half hour the announcer interrupts the relay to
    // re-introduce the station, then hands the air back to AWR.

    function enterAutoRelay() {
        if (!AUTO_RELAY_PROGRAMMING || userSwitchedToLocal) return;
        if (!(state.power && state.locked)) return;
        const preset = RELAYS[AUTO_RELAY_KEY];
        if (!preset) return;

        // Cut anything the local broadcast was still doing.
        Playlist.stop();
        RadioAudio.stopHymn();
        RadioAudio.stopStation();
        RadioAudio.setStatic(0);

        relay = {
            auto: true,
            station: state.locked,
            key: AUTO_RELAY_KEY,
            name: preset.name,
            sub: preset.sub,
            url: preset.url
        };
        state.externalAudioUrl = preset.url;
        state.usingExternalAudio = true;
        RadioAudio.setExternalAudio(preset.url);
        RadioAudio.setExternalAudioVolume(state.externalAudioVolume);
        RadioAudio.setVolume(state.volume);
        updateExternalAudioStatus();
        renderScreen();
        renderDial();
        scheduleRelayInterrupt();
    }

    function resumeAutoRelay() {
        if (!(state.power && relay && relay.auto)) return;
        // Bring the AWR stream back to full volume after the announcer's
        // station intro (pauseExternalAudio ducked it during the speech).
        RadioAudio.resumeExternalAudio();
        // Self-heal: if the stream dropped while the announcer was talking,
        // reconnect it.
        if (!RadioAudio.isExternalAudioActive() && state.externalAudioUrl) {
            RadioAudio.setExternalAudio(state.externalAudioUrl);
            RadioAudio.setExternalAudioVolume(state.externalAudioVolume);
        }
        updateExternalAudioStatus();
        renderScreen();
        scheduleRelayInterrupt();
    }

    function scheduleRelayInterrupt() {
        clearRelayInterrupt();
        if (!(AUTO_RELAY_PROGRAMMING && !userSwitchedToLocal && relay && relay.auto)) return;
        relayInterruptTimer = setTimeout(function () {
            relayInterruptTimer = null;
            interruptForStationAnnounce();
        }, INTERRUPT_EVERY_MS);
    }

    function clearRelayInterrupt() {
        if (relayInterruptTimer) { clearTimeout(relayInterruptTimer); relayInterruptTimer = null; }
    }

    // The half-hour station announcement: the announcer takes the air over
    // the AWR relay, says what the tuned station is about, then hands the
    // broadcast back to Adventist World Radio.
    function interruptForStationAnnounce() {
        if (!(state.power && relay && relay.auto && !userSwitchedToLocal)) return;
        if (!state.locked) {
            // No station dialed in — keep relaying quietly until next time.
            scheduleRelayInterrupt();
            return;
        }
        const st = state.locked;
        externalAudioStatus.textContent = 'Announcer: interrupting the AWR relay for the ' + st.name + ' station intro';
        RadioAudio.pauseExternalAudio();
        announce(stationAnnounceText(st, true));
    }

    function startRelay(keyOrUrl, customLabel) {
        const preset = RELAYS[keyOrUrl] || null;
        const url = preset ? preset.url : keyOrUrl;
        if (!url) return;

        RadioAudio.resume();

        // A manual relay takes over from the auto relay programming; the
        // half-hour announcements stop until the next power cycle.
        userSwitchedToLocal = true;
        clearRelayInterrupt();

        if (!state.power) {
            state.power = true;
            RadioAudio.power(true);
            powerIndicator.classList.add('on');
            powerBtn.classList.add('on');
            RadioAudio.chime();
        }

        // Kill the locally generated broadcast — the relay is the only
        // thing on the air now.
        Playlist.stop();
        RadioAudio.stopHymn();
        RadioAudio.stopStation();
        RadioAudio.setStatic(0);
        window.speechSynthesis.cancel();
        if (hymnTriggerTimer) { clearTimeout(hymnTriggerTimer); hymnTriggerTimer = null; }
        if (welcomeEndTimer) { clearTimeout(welcomeEndTimer); welcomeEndTimer = null; }
        try { welcomeAudio.pause(); } catch (e) { /* noop */ }
        state.locked = null;

        relay = {
            key: preset ? keyOrUrl : null,
            name: preset ? preset.name : (customLabel || 'External relay'),
            sub:  preset ? preset.sub  : (customLabel || 'Live internet relay'),
            url:  url
        };
        state.externalAudioUrl = url;
        state.usingExternalAudio = true;
        RadioAudio.setExternalAudio(url);
        RadioAudio.setExternalAudioVolume(state.externalAudioVolume);
        RadioAudio.setVolume(state.volume);
        updateExternalAudioStatus();
        renderScreen();
        renderDial();
    }

    // Leave relay mode. If the radio is still powered on, resume the locally
    // generated broadcast (welcome -> announcer -> music) for the tuned
    // station so the radio keeps playing as before.
    function stopRelay() {
        relay = null;
        clearRelayInterrupt();
        // Clearing the stream hands the radio back to the listener: the auto
        // relay programming won't force its way back until a power cycle.
        userSwitchedToLocal = true;
        state.externalAudioUrl = null;
        state.usingExternalAudio = false;
        RadioAudio.stopExternalAudio();
        updateExternalAudioStatus();
        if (state.power) {
            tuneTo(state.freq, { announce: false });
            if (state.locked) announce(stationLine(state.locked));
        }
        renderScreen();
        renderDial();
    }

    // One-click relays.
    $('relayAwrBtn').addEventListener('click', function () {
        flashButton(this, '\u{1F534} AWR ON AIR', 2500);
        startRelay('awr');
    });

    $('relayFaithFmBtn').addEventListener('click', function () {
        flashButton(this, '\u{1F534} FAITH FM ON AIR', 2500);
        startRelay('faithfm');
    });

    // GO LIVE — broadcast the local WIWB Studio feed through the radio.
    const goLiveBtn = $('goLiveBtn');
    goLiveBtn.addEventListener('click', () => {
        // Select the local WIWB Studio option
        externalAudioSourceSelect.value = 'http://127.0.0.1:8000/wiwb';
        // Hide custom URL input
        customUrlContainer.style.display = 'none';
        externalAudioUrlInput.value = '';

        startRelay('http://127.0.0.1:8000/wiwb', 'Local WIWB Studio');
        flashButton(goLiveBtn, '\u{1F534} LIVE!', 2500);
    });

    // Handle dropdown selection
    externalAudioSourceSelect.addEventListener('change', () => {
        const selectedValue = externalAudioSourceSelect.value;
        if (selectedValue === '') {
            // Show custom URL input
            customUrlContainer.style.display = 'block';
            externalAudioUrlInput.focus();
        } else {
            // Hide custom URL input and use selected value
            customUrlContainer.style.display = 'none';
            externalAudioUrlInput.value = '';
        }
    });

    configToggle.addEventListener('click', () => {
        configContent.classList.toggle('open');
        const isOpen = configContent.classList.contains('open');
        configToggle.textContent = isOpen ? '\u{1F527} Hide' : '\u{1F527} Configure';
    });

    externalAudioVolumeInput.addEventListener('input', () => {
        const vol = parseInt(externalAudioVolumeInput.value, 10);
        externalAudioVolOut.textContent = vol;
        state.externalAudioVolume = vol / 100;
        // Update external audio volume if we're using external audio
        if (state.usingExternalAudio) {
            RadioAudio.setExternalAudioVolume(state.externalAudioVolume);
        }
    });

    applyExternalAudioBtn.addEventListener('click', () => {
        let url = '';
        const selectedSource = externalAudioSourceSelect.value;

        if (selectedSource === '') {
            // Use custom URL
            url = externalAudioUrlInput.value.trim();
        } else {
            // Use selected preset URL
            url = selectedSource;
        }

        if (!url) {
            externalAudioStatus.textContent = 'Please select or enter a stream URL';
            externalAudioStatus.style.color = '#f44336'; // Red
            setTimeout(updateExternalAudioStatus, 2000);
            return;
        }

        // Validate URL format (basic check)
        if (!/^https?:\/\//i.test(url)) {
            externalAudioStatus.textContent = 'Please enter a valid URL (http:// or https://)';
            externalAudioStatus.style.color = '#f44336'; // Red
            setTimeout(updateExternalAudioStatus, 2000);
            return;
        }

        // Label known presets by URL, otherwise call it a custom relay.
        let label = 'External relay';
        for (const k in RELAYS) {
            if (RELAYS[k].url === url) label = RELAYS[k].name;
        }
        if (selectedSource === '') label = 'Custom relay: ' + url;

        startRelay(url, label);
        flashButton(applyExternalAudioBtn, 'Applied!', 1500);

        // Reset form
        externalAudioSourceSelect.value = 'http://127.0.0.1:8000/wiwb'; // Reset to default
        customUrlContainer.style.display = 'none';
        externalAudioUrlInput.value = '';
    });

    clearExternalAudioBtn.addEventListener('click', () => {
        stopRelay();
        externalAudioSourceSelect.value = 'http://127.0.0.1:8000/wiwb'; // Reset to default
        customUrlContainer.style.display = 'none';
        externalAudioUrlInput.value = '';
        flashButton(clearExternalAudioBtn, 'Cleared!', 1500);
    });

    /* ---------- init ---------- */
    if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = function () { /* warm voice cache */ };
    }
    setPower(false);
    renderDial();
    updateExternalAudioStatus();
})();
/* ==========================================================================
   BIBLE GAME FOR CHILDREN — audio + confetti helpers
   ========================================================================== */

'use strict';

/* ---------------------------------------------------------------------------
   2. AUDIO — tiny Web Audio engine (no files needed)
--------------------------------------------------------------------------- */
const AudioFX = (() => {
    let ctx = null;
    let musicOn = true;
    let musicTimer = null;

    function ensure() {
        if (!ctx) {
            try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
        }
        if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
        return ctx;
    }

    function tone(freq, start, dur, type = 'sine', vol = 0.25) {
        if (!ctx || !musicOn) return;
        const t0 = ctx.currentTime + start;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
    }

    return {
        setMusic(on) { musicOn = on; if (!on) this.stopMusic(); },
        isMusicOn() { return musicOn; },

        click()   { ensure(); tone(660, 0, 0.08, 'triangle', 0.2); },
        correct() { ensure(); tone(523, 0, 0.15, 'triangle', 0.3); tone(659, 0.12, 0.15, 'triangle', 0.3); tone(784, 0.24, 0.3, 'triangle', 0.3); },
        wrong()   { ensure(); tone(330, 0, 0.2, 'sine', 0.2); tone(262, 0.15, 0.3, 'sine', 0.2); },
        fanfare() { ensure(); [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.28, 'triangle', 0.3)); tone(1319, 0.5, 0.5, 'triangle', 0.25); },
        badge()   { ensure(); [784, 988, 1175].forEach((f, i) => tone(f, i * 0.1, 0.2, 'triangle', 0.3)); },
        tick()    { ensure(); tone(880, 0, 0.05, 'square', 0.08); },
        timeUp()  { ensure(); tone(392, 0, 0.25, 'sine', 0.25); tone(330, 0.2, 0.4, 'sine', 0.25); },

        startMusic() {
            if (!musicOn || !ensure()) return;
            this.stopMusic();
            const melody = [523, 587, 659, 587, 523, 494, 523, 392, 523, 587, 659, 784, 659, 587, 523, 494];
            const bass   = [262, 262, 196, 220, 262, 262, 196, 220];
            let i = 0;
            musicTimer = setInterval(() => {
                if (!musicOn) return;
                const m = melody[i % melody.length];
                const b = bass[Math.floor(i / 2) % bass.length];
                tone(m, 0, 0.42, 'triangle', 0.12);
                tone(b, 0, 0.45, 'sine', 0.1);
                tone(m * 2, 0, 0.2, 'sine', 0.03);
                i = (i + 1) % melody.length;
            }, 420);
        },

        stopMusic() {
            if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
        }
    };
})();

/* ---------------------------------------------------------------------------
   3. CONFETTI — canvas celebration
--------------------------------------------------------------------------- */
const Confetti = (() => {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    let pieces = [];
    let running = false;
    const COLORS = ['#ff5252', '#ffb703', '#3ec46d', '#3a86ff', '#9d4edd', '#ff70a6', '#ffd166'];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    function spawn(n) {
        for (let i = 0; i < n; i++) {
            pieces.push({
                x: Math.random() * canvas.width,
                y: -20 - Math.random() * canvas.height * 0.3,
                w: 6 + Math.random() * 8,
                h: 10 + Math.random() * 10,
                vy: 2 + Math.random() * 4,
                vx: (Math.random() - 0.5) * 2.5,
                rot: Math.random() * Math.PI * 2,
                vr: (Math.random() - 0.5) * 0.2,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                life: 1
            });
        }
        if (!running) { running = true; requestAnimationFrame(frame); }
    }

    function frame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces = pieces.filter(p => p.y < canvas.height + 30 && p.life > 0);
        for (const p of pieces) {
            p.x += p.vx + Math.sin(p.y * 0.02) * 0.6;
            p.y += p.vy;
            p.rot += p.vr;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        }
        if (pieces.length > 0) {
            requestAnimationFrame(frame);
        } else {
            running = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    return { burst: (n) => spawn(n || 80) };
})();

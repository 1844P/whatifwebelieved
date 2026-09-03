/* ==========================================================================
   BIBLE GAME FOR CHILDREN — game core (constants, data prep, state, storage)
   ========================================================================== */

'use strict';

/* ---------------------------------------------------------------------------
   1. CONSTANTS
--------------------------------------------------------------------------- */
const TIER_NAMES = [
    'Genesis & Origins', 'Heroes of Faith', 'Miracles & Signs',
    'Teachings of Jesus', 'Prophets & Kings', 'Psalms & Wisdom',
    'Life of Jesus', 'Acts & the Church', 'Epistles & Doctrine',
    'Revelation & Mastery'
];
const TIER_EMOJI = ['\u{1F30D}', '\u{1F981}', '\u2B50', '\u{1F4D6}', '\u{1F451}', '\u{1F3B5}', '\u2728', '\u{1F54A}\uFE0F', '\u{1F48C}', '\u{1F525}'];
const TIER_TIME  = [60, 55, 50, 45, 40, 38, 36, 34, 32, 30];

const RANKS = [
    { min: 300000, title: 'Bible Champion!', emoji: '\u{1F3C6}' },
    { min: 150000, title: 'Bible Hero!', emoji: '\u{1F9B8}' },
    { min: 60000,  title: 'Wisdom Seeker!', emoji: '\u{1F989}' },
    { min: 20000,  title: 'Story Explorer!', emoji: '\u{1F9ED}' },
    { min: 0,      title: 'Bible Buddy!', emoji: '\u{1F31F}' }
];

const BADGES = [
    { id: 'first_steps',  name: 'First Steps',      emoji: '\u{1F31F}', desc: 'Answer your first question' },
    { id: 'streak_3',     name: 'Flame Starter',    emoji: '\u{1F525}', desc: '3 right in a row' },
    { id: 'streak_5',     name: 'Star Streak',      emoji: '\u26A1', desc: '5 right in a row' },
    { id: 'streak_10',    name: 'Super Streak',     emoji: '\u{1F4AB}', desc: '10 right in a row' },
    { id: 'correct_10',   name: 'Ten Timer',        emoji: '\u{1F3AF}', desc: '10 correct answers' },
    { id: 'correct_25',   name: 'Quarter Scholar',  emoji: '\u{1F3C5}', desc: '25 correct answers' },
    { id: 'correct_50',   name: 'Golden Scholar',   emoji: '\u{1F947}', desc: '50 correct answers' },
    { id: 'correct_100',  name: 'Century of Wisdom', emoji: '\u{1F3C6}', desc: '100 correct answers' },
    { id: 'tier2',  name: 'Adventure 2',  emoji: '\u{1F981}', desc: 'Reach Heroes of Faith' },
    { id: 'tier3',  name: 'Adventure 3',  emoji: '\u2B50', desc: 'Reach Miracles & Signs' },
    { id: 'tier4',  name: 'Adventure 4',  emoji: '\u{1F4D6}', desc: "Reach Jesus' Teachings" },
    { id: 'tier5',  name: 'Adventure 5',  emoji: '\u{1F451}', desc: 'Reach Prophets & Kings' },
    { id: 'tier6',  name: 'Adventure 6',  emoji: '\u{1F3B5}', desc: 'Reach Psalms & Wisdom' },
    { id: 'tier7',  name: 'Adventure 7',  emoji: '\u2728', desc: 'Reach Life of Jesus' },
    { id: 'tier8',  name: 'Adventure 8',  emoji: '\u{1F54A}\uFE0F', desc: 'Reach Acts & the Church' },
    { id: 'tier9',  name: 'Adventure 9',  emoji: '\u{1F48C}', desc: 'Reach Epistles & Doctrine' },
    { id: 'tier10', name: 'Adventure 10', emoji: '\u{1F525}', desc: 'Reach Revelation & Mastery' },
    { id: 'finished', name: 'Quest Complete', emoji: '\u{1F389}', desc: 'Finish all 600 questions' }
];

const ENCOURAGE_RIGHT = ['Great job! \u{1F31F}', 'Wonderful! \u{1F389}', 'You are a Bible star! \u2B50', 'Amazing! \u{1F496}', 'Super duper! \u{1F981}', 'Fantastic! \u{1F388}', 'Hooray! \u{1F38A}', 'You did it! \u{1F64C}'];
const ENCOURAGE_WRONG = ['Good try! You will get the next one! \u{1F4AA}', 'Keep going, you are doing great! \u{1F308}', 'Oops! Learning is part of the adventure! \u{1F4DA}', 'No worries — God loves you! \u2764\uFE0F'];

const STORAGE_KEY = 'bibleGameForChildren_v1';
const LETTERS = ['A', 'B', 'C', 'D'];

/* ---------------------------------------------------------------------------
   2. QUESTION PREP — shuffle choices + shuffle order within each tier
--------------------------------------------------------------------------- */
function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function randomizeQuestion(q) {
    const order = shuffle([0, 1, 2, 3]);
    return {
        tier: q.tier,
        theme: q.theme,
        difficulty: q.difficulty,
        points: q.points,
        q: q.q,
        choices: order.map(i => q.choices[i]),
        correct: order.indexOf(q.correct_idx - 1),   // 0..3 after shuffle
        ref: q.ref
    };
}

function remixTiers(qs) {
    const remixed = qs.map(randomizeQuestion);
    const out = new Array(remixed.length);
    for (let t = 1; t <= 10; t++) {
        const idx = [];
        remixed.forEach((q, i) => { if (q.tier === t) idx.push(i); });
        const shuffled = shuffle(idx);
        shuffled.forEach((orig, pos) => { out[orig] = remixed[idx[pos]]; });
    }
    return out;
}

/* ---------------------------------------------------------------------------
   3. GAME STATE + STORAGE
--------------------------------------------------------------------------- */
function defaultState() {
    return {
        idx: 0,              // current question index (0..599)
        score: 0,
        streak: 0,
        bestStreak: 0,
        correct: 0,
        skips: 3,
        peeks: 3,
        badges: {},          // badgeId -> true
        pendingBadges: [],   // badge popups queued
        answeredCount: 0
    };
}

let QUESTIONS = [];
let state = defaultState();
let timerId = null;
let timeLeft = 0;
let answering = false;      // true between render and answer/submit
let ended = false;

function saveProgress() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            state: state,
            idx: state.idx
        }));
    } catch (e) { /* storage unavailable — ignore */ }
}

function loadProgress() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return data && data.state ? data.state : null;
    } catch (e) { return null; }
}

function clearProgress() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
}

/* ---------------------------------------------------------------------------
   4. DOM HELPERS
--------------------------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }

/* ==========================================================================
   BIBLE GAME FOR CHILDREN — badges, end screen, init
   ========================================================================== */

'use strict';

/* ---------------------------------------------------------------------------
   NEXT QUESTION
--------------------------------------------------------------------------- */
function nextQuestion() {
    stopTimer();
    hide('btn-next');
    hide('scripture-hint');
    state.idx += 1;
    if (state.idx >= QUESTIONS.length) {
        finishGame();
    } else {
        renderQuestion();
        saveProgress();
    }
}

/* ---------------------------------------------------------------------------
   BADGES
--------------------------------------------------------------------------- */
function badgeConditions() {
    return {
        first_steps:  state.correct >= 1,
        streak_3:     state.bestStreak >= 3,
        streak_5:     state.bestStreak >= 5,
        streak_10:    state.bestStreak >= 10,
        correct_10:   state.correct >= 10,
        correct_25:   state.correct >= 25,
        correct_50:   state.correct >= 50,
        correct_100:  state.correct >= 100,
        tier2:        currentTier() >= 2,
        tier3:        currentTier() >= 3,
        tier4:        currentTier() >= 4,
        tier5:        currentTier() >= 5,
        tier6:        currentTier() >= 6,
        tier7:        currentTier() >= 7,
        tier8:        currentTier() >= 8,
        tier9:        currentTier() >= 9,
        tier10:       currentTier() >= 10,
        finished:     state.idx >= QUESTIONS.length - 1
    };
}

function checkBadges() {
    const conds = badgeConditions();
    BADGES.forEach(b => {
        if (conds[b.id] && !state.badges[b.id]) {
            state.badges[b.id] = true;
            state.pendingBadges.push(b);
        }
    });
    if (state.pendingBadges.length > 0) {
        setTimeout(showNextBadgePopup, 650);
    }
}

function showNextBadgePopup() {
    // Wait for the adventure-complete popup to close before showing badges.
    if (!$('tier-popup').classList.contains('hidden')) {
        setTimeout(showNextBadgePopup, 500);
        return;
    }
    const b = state.pendingBadges.shift();
    if (!b) return;
    AudioFX.badge();
    Confetti.burst(60);
    $('badge-popup-emoji').textContent = b.emoji;
    $('badge-popup-name').textContent = b.name;
    show('badge-popup');
}

function closeBadgePopup() {
    if ($('badge-popup').classList.contains('hidden')) return;
    hide('badge-popup');
    if (state.pendingBadges.length > 0) {
        setTimeout(showNextBadgePopup, 300);
    }
}

/* ---------------------------------------------------------------------------
   ADVENTURE-COMPLETE POPUP
--------------------------------------------------------------------------- */
function closeTierPopup() {
    if ($('tier-popup').classList.contains('hidden')) return;
    hide('tier-popup');
    nextQuestion();
}

/* ---------------------------------------------------------------------------
   END SCREEN
--------------------------------------------------------------------------- */
function rankForScore(score) {
    for (const r of RANKS) {
        if (score >= r.min) return r;
    }
    return RANKS[RANKS.length - 1];
}

function finishGame() {
    stopTimer();
    ended = true;
    clearProgress();
    AudioFX.fanfare();
    // Fireworks: several confetti bursts over 3 seconds.
    Confetti.burst(200);
    let bursts = 0;
    const fireworkTimer = setInterval(() => {
        Confetti.burst(120);
        AudioFX.badge();
        bursts += 1;
        if (bursts >= 5) clearInterval(fireworkTimer);
    }, 550);

    const rank = rankForScore(state.score);
    $('end-emoji').textContent = rank.emoji;
    $('end-title').textContent = rank.title;
    $('end-subtitle').textContent =
        state.correct >= 600 ? 'Perfect score! You answered ALL 600 questions correctly! \u{1F607}' :
        'You finished the whole adventure with ' + state.correct + ' correct answers!';
    $('end-score').textContent = state.score.toLocaleString();
    $('end-correct').textContent = state.correct + ' / 600';
    $('end-best-streak').textContent = state.bestStreak;

    const grid = $('end-badges');
    grid.innerHTML = '';
    const won = BADGES.filter(b => state.badges[b.id]);
    if (won.length === 0) {
        grid.innerHTML = '<p class="continue-note">No badges yet — play again to win your first sticker! \u{1F31F}</p>';
    } else {
        won.forEach(b => {
            const chip = document.createElement('span');
            chip.className = 'badge-chip';
            chip.innerHTML = '<span>' + b.emoji + '</span>' + b.name;
            grid.appendChild(chip);
        });
    }

    showScreen('end');
}

/* ---------------------------------------------------------------------------
   GAME START / RESUME
--------------------------------------------------------------------------- */
function startNewGame() {
    QUESTIONS = remixTiers(window.BIBLE_QUESTIONS);
    state = defaultState();
    ended = false;
    clearProgress();
    showScreen('game');
    renderQuestion();
}

function continueGame(saved) {
    QUESTIONS = remixTiers(window.BIBLE_QUESTIONS);
    state = Object.assign(defaultState(), saved);
    state.pendingBadges = [];
    ended = false;
    showScreen('game');
    renderQuestion();
}

/* ---------------------------------------------------------------------------
   SOUND TOGGLE
--------------------------------------------------------------------------- */
function updateSoundButtons() {
    const icon = AudioFX.isMusicOn() ? '\u{1F566}' : '\u{1F507}';
    $('btn-sound').textContent = icon;
    $('btn-sound-game').textContent = icon;
}

function toggleSound() {
    AudioFX.click();
    AudioFX.setMusic(!AudioFX.isMusicOn());
    if (AudioFX.isMusicOn()) AudioFX.startMusic();
    updateSoundButtons();
}

/* ---------------------------------------------------------------------------
   INIT
--------------------------------------------------------------------------- */
function init() {
    if (!window.BIBLE_QUESTIONS || window.BIBLE_QUESTIONS.length !== 600) {
        $('question-text').textContent = 'Oops — the question bank did not load. Please refresh the page.';
        show('screen-game');
        return;
    }

    // "Play" starts the game fresh.
    $('btn-start').addEventListener('click', () => { AudioFX.click(); AudioFX.fanfare(); AudioFX.startMusic(); startNewGame(); });
    $('btn-continue').addEventListener('click', () => { AudioFX.click(); AudioFX.startMusic(); continueGame(loadProgress()); });
    $('btn-play-again').addEventListener('click', () => { AudioFX.click(); AudioFX.startMusic(); startNewGame(); });

    // In-game buttons.
    $('btn-next').addEventListener('click', () => { AudioFX.click(); nextQuestion(); });
    $('btn-skip').addEventListener('click', useSkip);
    $('btn-peek').addEventListener('click', usePeek);
    $('btn-badge-close').addEventListener('click', closeBadgePopup);
    $('btn-tier-next').addEventListener('click', closeTierPopup);

    // Click anywhere on a popup to continue (the buttons work too).
    $('badge-popup').addEventListener('click', closeBadgePopup);
    $('tier-popup').addEventListener('click', closeTierPopup);

    // Sound toggles (both screens).
    $('btn-sound').addEventListener('click', toggleSound);
    $('btn-sound-game').addEventListener('click', toggleSound);

    // Auto-start music on first user interaction anywhere.
    const kickstart = () => {
        AudioFX.ensure && AudioFX.ensure();
        if (AudioFX.isMusicOn()) AudioFX.startMusic();
        window.removeEventListener('pointerdown', kickstart);
    };
    window.addEventListener('pointerdown', kickstart);

    // Show "Continue" if there is saved progress.
    const saved = loadProgress();
    if (saved && saved.idx > 0 && saved.idx < 600) {
        $('continue-info').textContent = saved.idx + 1 + ' of 600 \u{1F31F}';
        show('continue-wrap');
    }

    updateSoundButtons();
    showScreen('start');
}

document.addEventListener('DOMContentLoaded', init);

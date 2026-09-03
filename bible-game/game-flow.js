/* ==========================================================================
   BIBLE GAME FOR CHILDREN — game flow (render, timer, answering)
   ========================================================================== */

'use strict';

/* ---------------------------------------------------------------------------
   SCREEN SWITCHING
--------------------------------------------------------------------------- */
function showScreen(name) {
    hide('screen-start');
    hide('screen-game');
    hide('screen-end');
    show('screen-' + name);
}

/* ---------------------------------------------------------------------------
   RENDERING
--------------------------------------------------------------------------- */
function currentQuestion() { return QUESTIONS[state.idx]; }
function currentTier() { return currentQuestion().tier; }
function tierName(t) { return TIER_NAMES[t - 1]; }
function tierEmoji(t) { return TIER_EMOJI[t - 1]; }
function tierTime(t) { return TIER_TIME[t - 1]; }

function renderProgressDots() {
    const wrap = $('progress-dots');
    wrap.innerHTML = '';
    const t = currentTier();
    for (let i = 1; i <= 10; i++) {
        const d = document.createElement('div');
        d.className = 'dot' + (i === t ? ' active' : (i < t ? ' done' : ''));
        d.textContent = i < t ? '\u2713' : '';
        wrap.appendChild(d);
    }
}

function renderStats() {
    bumpStat('stat-score', state.score);
    bumpStat('stat-streak', state.streak);
    bumpStat('stat-correct', state.correct);
    $('skip-count').textContent = state.skips;
    $('peek-count').textContent = state.peeks;
    const flame = $('stat-streak').closest('.stat');
    flame.classList.toggle('stat-flame', state.streak >= 3);
}

function bumpStat(id, value) {
    const el = $(id);
    if (el.textContent !== value.toLocaleString()) {
        el.textContent = value.toLocaleString();
        el.classList.remove('bump');
        void el.offsetWidth;   // restart animation
        el.classList.add('bump');
    }
}

function renderQuestion() {
    const q = currentQuestion();
    $('adventure-emoji').textContent = tierEmoji(q.tier);
    $('adventure-name').textContent = 'Adventure ' + q.tier + ': ' + tierName(q.tier);
    $('q-counter').textContent = 'Q ' + (state.idx % 60 + 1) + ' / 60';
    $('question-text').textContent = q.q;
    $('scripture-hint').classList.add('hidden');
    $('scripture-ref').textContent = q.ref;
    hide('feedback');
    hide('encouragement');
    hide('btn-next');

    const wrap = $('choices');
    wrap.innerHTML = '';
    q.choices.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.disabled = false;
        btn.innerHTML = '<span class="choice-letter">' + LETTERS[i] + '</span><span>' + choice + '</span>';
        btn.addEventListener('click', () => answer(i, btn));
        wrap.appendChild(btn);
    });

    renderProgressDots();
    renderStats();

    const t = tierTime(q.tier);
    startTimer(t);
    answering = true;
}

/* ---------------------------------------------------------------------------
   TIMER
--------------------------------------------------------------------------- */
function startTimer(seconds) {
    stopTimer();
    timeLeft = seconds;
    updateTimerBar();
    timerId = setInterval(() => {
        timeLeft -= 0.1;
        if (timeLeft <= 0) {
            timeLeft = 0;
            stopTimer();
            onTimeUp();
        } else {
            updateTimerBar();
        }
    }, 100);
}

function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
}

function updateTimerBar() {
    const q = currentQuestion();
    const total = tierTime(q.tier);
    const pct = Math.max(0, (timeLeft / total) * 100);
    const bar = $('timer-bar');
    bar.style.width = pct + '%';
    bar.classList.toggle('warn', timeLeft <= total * 0.33 && timeLeft > total * 0.15);
    bar.classList.toggle('danger', timeLeft <= total * 0.15);
    $('timer-text').textContent = Math.ceil(timeLeft) + 's';
}

/* ---------------------------------------------------------------------------
   ANSWERING
--------------------------------------------------------------------------- */
function starCount(q) {
    const total = tierTime(q.tier);
    const ratio = timeLeft / total;
    if (ratio > 0.6) return 3;
    if (ratio > 0.3) return 2;
    return 1;
}

function answer(choiceIdx, btnEl) {
    if (!answering) return;
    answering = false;
    stopTimer();
    AudioFX.click();

    const q = currentQuestion();
    const allBtns = Array.from(document.querySelectorAll('.choice-btn'));
    const correctBtn = allBtns[q.correct];
    allBtns.forEach(b => { b.disabled = true; });

    if (choiceIdx === q.correct) {
        btnEl.classList.add('correct');
        const stars = starCount(q);
        const mult = multiplierForStreak(state.streak);
        const gained = q.points * mult;
        state.score += gained;
        state.streak += 1;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        state.correct += 1;
        state.answeredCount += 1;

        $('feedback').className = 'feedback right';
        $('feedback').textContent = 'Right! +' + gained + ' points \u{1F389}';
        $('feedback').classList.remove('hidden');
        $('encouragement').textContent = rand(ENCOURAGE_RIGHT);
        show('encouragement');
        const starsEl = document.createElement('div');
        starsEl.className = 'feedback stars';
        starsEl.textContent = '\u2B50'.repeat(stars);
        $('feedback').after(starsEl);

        AudioFX.correct();
        if (stars === 3) Confetti.burst(40);
        else Confetti.burst(20);

        if (isLastInTier()) {
            tierCompleteCelebration();
        }
    } else {
        btnEl.classList.add('wrong');
        correctBtn.classList.add('correct');
        state.streak = 0;
        state.answeredCount += 1;

        $('feedback').className = 'feedback wrong';
        $('feedback').textContent = 'Oops! The answer was: ' + q.choices[q.correct];
        $('feedback').classList.remove('hidden');
        $('encouragement').textContent = rand(ENCOURAGE_WRONG);
        show('encouragement');

        AudioFX.wrong();
    }

    checkBadges();
    renderStats();
    renderProgressDots();
    showNextButton();
    saveProgress();
}

function multiplierForStreak(streak) {
    if (streak >= 7) return 4.0;
    if (streak >= 5) return 3.0;
    if (streak >= 3) return 2.0;
    if (streak >= 2) return 1.5;
    return 1.0;
}

function isLastInTier() {
    return state.idx >= QUESTIONS.length - 1 ||
        QUESTIONS[state.idx].tier !== QUESTIONS[state.idx + 1].tier;
}

function tierCompleteCelebration() {
    const t = currentTier();
    AudioFX.fanfare();
    Confetti.burst(150);
    if (t < 10) {
        $('tier-popup-emoji').textContent = TIER_EMOJI[t - 1];
        $('tier-popup-title').textContent = 'Adventure ' + t + ' Complete!';
        $('tier-popup-name').textContent = tierName(t);
        $('tier-popup-stars').textContent = '\u2B50'.repeat(3);
        $('btn-tier-next').textContent = '\u{1F449} On to Adventure ' + (t + 1) + '!';
    } else {
        $('tier-popup-emoji').textContent = '\u{1F3C6}';
        $('tier-popup-title').textContent = 'Quest Complete!';
        $('tier-popup-name').textContent = 'You conquered all 10 adventures!';
        $('tier-popup-stars').textContent = '\u{1F389} \u2B50 \u{1F389} \u2B50 \u{1F389}';
        $('btn-tier-next').textContent = 'See My Results! \u{1F389}';
    }
    show('tier-popup');
}

function onTimeUp() {
    if (!answering) return;
    answering = false;
    AudioFX.timeUp();

    const q = currentQuestion();
    const allBtns = Array.from(document.querySelectorAll('.choice-btn'));
    allBtns.forEach((b, i) => {
        b.disabled = true;
        if (i === q.correct) b.classList.add('correct');
    });
    state.streak = 0;
    state.answeredCount += 1;

    $('feedback').className = 'feedback wrong';
    $('feedback').textContent = 'Time is up! The answer was: ' + q.choices[q.correct];
    $('feedback').classList.remove('hidden');
    $('encouragement').textContent = 'Time flies! Let us try the next one! \u{1F4A5}';
    show('encouragement');

    checkBadges();
    renderStats();
    showNextButton();
    saveProgress();
}

function showNextButton() {
    const btn = $('btn-next');
    btn.textContent = (state.idx >= QUESTIONS.length - 1) ? 'See My Results! \u{1F3C6}' : 'Next Question! \u{1F449}';
    show('btn-next');
}

/* ---------------------------------------------------------------------------
   LIFELINES
--------------------------------------------------------------------------- */
function useSkip() {
    if (!answering || state.skips <= 0) return;
    AudioFX.click();
    state.skips -= 1;
    nextQuestion();
}

function usePeek() {
    if (!answering || state.peeks <= 0) return;
    AudioFX.click();
    state.peeks -= 1;
    const hint = $('scripture-hint');
    $('scripture-ref').textContent = currentQuestion().ref;
    show('scripture-hint');
    renderStats();
    saveProgress();
}

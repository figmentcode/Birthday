// script.js
// Trivia data
const qa = [
  { q: "Which president was a major whiskey distiller in the U.S.?", a: "Washington" },
  { q: "Buffalo was the first city with widespread ____ in the U.S.?", a: "Electricity" },
  { q: "What Sesame Street character, famous for his Rubber Duckie song, first appeared in 1969?", a: "Ernie" },
  { q: "Which cereal was launched in 1906?", a: "Kellogg’s Corn Flakes" },
  { q: "Which Great Lake is the warmest?", a: "Erie" },
  { q: "The first female flight attendants were also what profession?", a: "Nurses" },
  { q: "Who invented the polio vaccine?", a: "Dr. Jonas Salk" },
  { q: "Finish the line FDR said: 'Yesterday, December 7, 1941 a date which will live in…'", a: "infamy" },
  { q: "James Buchanan was the only U.S. president who…", a: "Never married" },
  { q: "What U.S. president was inducted into Oklahoma’s Wrestling Hall of Fame?", a: "Abraham Lincoln" },
  { q: "What divine notion promoted the westward expansion including the Louisiana Purchase?", a: "Manifest Destiny" },
  { q: "Which U.S. president was president of Columbia University in 1949?", a: "Eisenhower" },
  { q: "What Native American served as a guide for explorers Lewis and Clark?", a: "Sacagawea" }
];

const total = qa.length;
let index = 0;
const userAnswers = new Array(total).fill(null);

// DOM refs (script loaded with defer)
const qIndexEl = document.getElementById('qIndex');
const qTotalEl = document.getElementById('qTotal');
const questionText = document.getElementById('questionText');
const answerInput = document.getElementById('answerInput');
const submitBtn = document.getElementById('submitBtn');
const skipBtn = document.getElementById('skipBtn');
const feedback = document.getElementById('feedback');
const endArea = document.getElementById('endArea');
const questionArea = document.getElementById('questionArea');
const answersList = document.getElementById('answersList');
const acroTarget = document.getElementById('acroTarget');
const replayBtn = document.getElementById('replayBtn');
const progressFill = document.getElementById('progressFill'); // optional; include in HTML if used

qTotalEl.textContent = total;

// Utility: normalize strings for comparison
function normalize(s) {
  return String(s || '').trim().toLowerCase().replace(/[’'"]/g, "'");
}

// Progress update: completedCount is number of completed questions (0..total)
function updateProgress(completedCount) {
  if (!progressFill) return;
  const pct = Math.round((completedCount / total) * 100);
  progressFill.style.width = pct + '%';
  const bar = progressFill.parentElement;
  if (bar && bar.setAttribute) bar.setAttribute('aria-valuenow', String(pct));
}

// Show question i (0-based)
function showQuestion(i) {
  index = i;
  qIndexEl.textContent = i + 1;
  questionText.textContent = qa[i].q;
  answerInput.value = '';
  feedback.textContent = '';
  answerInput.focus();
  updateProgress(i);
}

// Build end screen and start animation
function finishGame() {
  questionArea.classList.add('hidden');
  endArea.classList.remove('hidden');

  // Clear previous content
  answersList.innerHTML = '';
  acroTarget.innerHTML = '';
  acroTarget.classList.remove('show');

  // Populate answers list (these are the source positions)
  qa.forEach((item, i) => {
    const div = document.createElement('div');
    const correct = item.a;
    const isCorrect = userAnswers[i] !== null && normalize(userAnswers[i]) === normalize(correct);
    div.innerHTML = `<strong>Q${i+1}.</strong> ${item.q} — <span class="${isCorrect ? 'correct' : 'wrong'}">${correct}</span>`;
    answersList.appendChild(div);
  });

  // Build the final phrase letters (uppercase) and prepare target spans
  const acro = qa.map(x => (x.a || '').trim()[0] || '').join('').toUpperCase();
  const formatted = acro.slice(0,7) + ' ' + acro.slice(7,9) + ' ' + acro.slice(9);
  formatted.split('').forEach(ch => {
    const span = document.createElement('span');
    span.className = 'acro-letter';
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    acroTarget.appendChild(span);
  });

  // show assembled phrase container and run animation after layout stabilizes
  requestAnimationFrame(() => runAcrosticAnimation());
}

// Animation: letters originate at their corresponding answer rows and arrive left-to-right at top targets
function runAcrosticAnimation() {
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Remove leftover floating letters
  document.querySelectorAll('.floating-letter').forEach(n => n.remove());

  // Ensure target spans exist
  const targetSpans = Array.from(acroTarget.children);
  if (!targetSpans.length) return;

  // Make the top container visible so we can measure positions
  acroTarget.classList.add('show');
  // hide individual letters until they are revealed by animation
  targetSpans.forEach(span => {
    span.classList.remove('revealed');
    span.style.opacity = '0';
    span.style.transform = 'scale(0.95)';
  });

  // Wait a frame so layout is stable and getBoundingClientRect returns correct values
  requestAnimationFrame(() => {
    // Build array of target centers for non-space letters (left-to-right)
    const targetCenters = [];
    targetSpans.forEach(span => {
      if (span.textContent.trim() === '') return;
      const r = span.getBoundingClientRect();
      targetCenters.push({ x: r.left + r.width / 2, y: r.top + r.height / 2, span });
    });

    // Get answer divs (source positions)
    const answerDivs = Array.from(answersList.children);

    // Create floating elements: one per canonical answer; each starts at its answerDiv center
    const floatingEls = [];
    let mappedTargetIndex = 0;
    for (let i = 0; i < qa.length; i++) {
      if (mappedTargetIndex >= targetCenters.length) break;
      const sourceDiv = answerDivs[i];
      if (!sourceDiv) { mappedTargetIndex++; continue; }
      const correct = qa[i].a || '';
      const firstChar = (correct.trim()[0] || '').toUpperCase();

      const mappedTarget = targetCenters[mappedTargetIndex];
      mappedTargetIndex++;

      const fl = document.createElement('div');
      fl.className = 'floating-letter';
      fl.textContent = firstChar;
      document.body.appendChild(fl);

      // compute source position (center of the answerDiv)
      const srcRect = sourceDiv.getBoundingClientRect();
      // place floating letter centered horizontally over the answer text
      const startLeft = Math.round(srcRect.left + srcRect.width / 2 - fl.offsetWidth / 2);
      const startTop = Math.round(srcRect.top + srcRect.height / 2 - 18);
      fl.style.left = `${startLeft}px`;
      fl.style.top = `${startTop}px`;
      fl.style.opacity = '1';

      floatingEls.push({ el: fl, target: mappedTarget, char: firstChar });
    }

    // Sort floating elements by their target.x so they arrive left-to-right
    floatingEls.sort((a, b) => a.target.x - b.target.x);

    // If reduced motion is preferred, reveal immediately and remove floating elements
    if (prefersReduced) {
      floatingEls.forEach(item => item.el.remove());
      targetSpans.forEach(span => {
        if (span.textContent.trim() !== '') {
          span.classList.add('revealed');
          span.style.opacity = '1';
          span.style.transform = 'scale(1)';
        }
      });
      return;
    }

    // Stagger and animate
    const staggerMs = 160;
    const baseDelay = 120;

    // Reveal assembled container (letters still hidden) so flying letters have visible targets
    setTimeout(() => acroTarget.classList.add('show'), baseDelay - 20);

    floatingEls.forEach((item, seq) => {
      const { el, target } = item;
      const delay = baseDelay + seq * staggerMs;

      // small entrance pop at source
      setTimeout(() => {
        el.animate([
          { transform: 'translateY(-6px) scale(0.9)', opacity: 0 },
          { transform: 'translateY(0px) scale(1.08)', opacity: 1 }
        ], { duration: 160, easing: 'ease-out', fill: 'forwards' });
      }, Math.max(0, delay - 60));

      // main flight animation from source to target
      setTimeout(() => {
        const elRect = el.getBoundingClientRect();
        const elCenterX = elRect.left + elRect.width / 2;
        const elCenterY = elRect.top + elRect.height / 2;
        const deltaX = target.x - elCenterX;
        const deltaY = target.y - elCenterY;

        const anim = el.animate([
          { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
          { transform: `translate(${deltaX * 0.45}px, ${deltaY * 0.45}px) scale(1.6)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${deltaX}px, ${deltaY}px) scale(1.0)`, opacity: 1 }
        ], {
          duration: 820,
          easing: 'cubic-bezier(.2,.9,.2,1)',
          fill: 'forwards'
        });

        anim.onfinish = () => {
          el.remove();
          // reveal the target span with a quick pop and lock its final state
          const span = target.span;
          span.classList.add('revealed');
          span.style.opacity = '1';
          span.style.transform = 'scale(1)';
        };
      }, delay);
    });

    // Final cleanup: ensure assembled phrase remains visible and letters stay revealed
    const totalDuration = baseDelay + floatingEls.length * staggerMs + 900;
    setTimeout(() => {
      // remove any stray floating letters
      document.querySelectorAll('.floating-letter').forEach(n => n.remove());

      // ensure the assembled container stays visible
      acroTarget.classList.add('show');
      acroTarget.style.opacity = '1';

      // Force each target span to the final visible state (inline styles override CSS glitches)
      Array.from(acroTarget.children).forEach(span => {
        if (span.textContent.trim() === '') return;
        span.classList.add('revealed');
        span.style.opacity = '1';
        span.style.transform = 'scale(1)';
        span.style.transition = 'transform 160ms ease, opacity 160ms ease';
      });
    }, totalDuration + 200);
  });
}

// Event handlers
submitBtn.addEventListener('click', () => {
  const user = answerInput.value;
  if (!user.trim()) {
    feedback.textContent = 'Please enter an answer or click Skip.';
    feedback.className = 'feedback wrong';
    return;
  }
  const correct = qa[index].a;
  const isCorrect = normalize(user) === normalize(correct);
  userAnswers[index] = user;
  feedback.textContent = isCorrect ? 'Correct!' : `Incorrect — correct answer: ${correct}`;
  feedback.className = 'feedback ' + (isCorrect ? 'correct' : 'wrong');

  setTimeout(() => {
    if (index + 1 < total) showQuestion(index + 1);
    else {
      updateProgress(total);
      finishGame();
    }
  }, 900);
});

skipBtn.addEventListener('click', () => {
  userAnswers[index] = null;
  if (index + 1 < total) showQuestion(index + 1);
  else {
    updateProgress(total);
    finishGame();
  }
});

answerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitBtn.click();
});

// Replay button: only replays the final animation (does not reset the game)
replayBtn.addEventListener('click', () => {
  if (endArea.classList.contains('hidden')) return;
  // Reset revealed state on target letters so animation can replay
  acroTarget.classList.remove('show');
  Array.from(acroTarget.children).forEach(span => {
    span.classList.remove('revealed');
    span.style.opacity = '0';
    span.style.transform = 'scale(0.95)';
    delete span.dataset.revealed;
  });
  // Remove any leftover floating letters
  document.querySelectorAll('.floating-letter').forEach(n => n.remove());
  // Re-run the animation after a frame so positions are accurate
  requestAnimationFrame(() => runAcrosticAnimation());
});

// Initialize first question and progress
showQuestion(0);

document.getElementById("startBtn").addEventListener("click", function () {
  window.location.href = "trivia.html";
});

document.getElementById("startBtn").addEventListener("click", () => {
  confetti({
    particleCount: 200,
    spread: 90,
    origin: { y: 0.6 }
  });

  window.location.href = "trivia.html";
});

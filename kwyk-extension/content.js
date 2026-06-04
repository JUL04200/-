(function () {
  'use strict';

  let lastText = '';
  let debounceTimer = null;
  let panelEl = null;

  // ── Sélecteurs Kwyk (ordre de priorité) ────────────────────────────────────
  const EXERCISE_SELECTORS = [
    '[class*="question"]',
    '[class*="exercice"]',
    '[class*="enonce"]',
    '[class*="statement"]',
    '[class*="problem"]',
    'main',
    '#app',
    '#root',
    '.container'
  ];

  function extractText() {
    for (const sel of EXERCISE_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) {
        const t = el.innerText.trim();
        if (t.length > 30) return t.slice(0, 3000);
      }
    }
    return document.body.innerText.trim().slice(0, 3000);
  }

  // ── Panneau flottant ────────────────────────────────────────────────────────
  function createPanel() {
    const el = document.createElement('div');
    el.id = 'kwykai-panel';
    el.innerHTML = `
      <div id="kwykai-header">
        <span>🧮 Kwyk Assistant</span>
        <button id="kwykai-toggle" title="Réduire">−</button>
      </div>
      <div id="kwykai-body">
        <div id="kwykai-status">En attente d'un exercice…</div>
        <div id="kwykai-answer"></div>
      </div>
    `;
    document.body.appendChild(el);

    document.getElementById('kwykai-toggle').addEventListener('click', () => {
      const body = document.getElementById('kwykai-body');
      const btn  = document.getElementById('kwykai-toggle');
      const hidden = body.style.display === 'none';
      body.style.display = hidden ? 'block' : 'none';
      btn.textContent   = hidden ? '−' : '+';
    });

    return el;
  }

  function setStatus(msg) {
    const el = document.getElementById('kwykai-status');
    if (el) el.textContent = msg;
  }

  function setAnswer(text) {
    const el = document.getElementById('kwykai-answer');
    if (el) el.textContent = text;
  }

  // ── Appel au background ─────────────────────────────────────────────────────
  function solveExercise(text) {
    setStatus('⏳ Analyse en cours…');
    setAnswer('');

    chrome.runtime.sendMessage({ type: 'SOLVE_EXERCISE', text }, (response) => {
      if (chrome.runtime.lastError) {
        setStatus('❌ Erreur de communication');
        return;
      }
      if (response?.answer) {
        setStatus('✅ Réponse :');
        setAnswer(response.answer);
      } else {
        setStatus('❌ ' + (response?.error ?? 'Erreur inconnue'));
        setAnswer('');
      }
    });
  }

  // ── Détection de changement d'exercice ────────────────────────────────────
  function onMutation() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const text = extractText();
      if (text === lastText || text.length < 40) return;
      lastText = text;
      solveExercise(text);
    }, 1800); // attend 1,8 s que la page se stabilise
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    panelEl = createPanel();

    const observer = new MutationObserver(onMutation);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Analyse initiale (page déjà chargée)
    setTimeout(onMutation, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

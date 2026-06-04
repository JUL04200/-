// ==UserScript==
// @name         Kwyk IA
// @namespace    kwyk-ia
// @version      1.3
// @description  Affiche automatiquement les réponses aux exercices Kwyk
// @author       Kwyk Assistant
// @match        https://www.kwyk.fr/*
// @match        https://new.kwyk.fr/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'kwyk_ia_groq_key';
  const GROQ_URL    = 'https://api.groq.com/openai/v1/chat/completions';

  let lastText     = '';
  let debounceTimer = null;

  function getApiKey() {
    let key = localStorage.getItem(STORAGE_KEY);
    if (!key) {
      key = prompt('🧮 Kwyk IA — Colle ta clé API Groq (gsk_…) :');
      if (key) localStorage.setItem(STORAGE_KEY, key);
    }
    return key;
  }

  function createPanel() {
    const el = document.createElement('div');
    el.id = 'kwyk-ia';
    el.style.cssText = [
      'position:fixed', 'bottom:20px', 'right:16px',
      'width:290px', 'max-width:calc(100vw - 32px)',
      'background:#fff', 'border:2px solid #4f46e5',
      'border-radius:14px', 'box-shadow:0 6px 28px rgba(0,0,0,.22)',
      'z-index:2147483647', 'font-family:-apple-system,sans-serif',
      'font-size:13px', 'color:#1e293b'
    ].join(';');

    el.innerHTML = `
      <div style="background:#4f46e5;color:#fff;padding:10px 14px;border-radius:12px 12px 0 0;
                  font-weight:700;display:flex;justify-content:space-between;align-items:center;">
        <span>🧮 Kwyk IA</span>
        <span id="kwyk-ia-x" style="cursor:pointer;font-size:20px;line-height:1;">×</span>
      </div>
      <div id="kwyk-ia-body" style="padding:12px;line-height:1.55;white-space:pre-wrap;
                                    min-height:48px;max-height:220px;overflow-y:auto;">
        En attente d'un exercice…
      </div>
    `;
    document.body.appendChild(el);

    document.getElementById('kwyk-ia-x').onclick = () => el.remove();
    return el;
  }

  function setBody(html) {
    const el = document.getElementById('kwyk-ia-body');
    if (el) el.textContent = html;
  }

  function extractText() {
    const selectors = [
      '[class*="question"]', '[class*="exercice"]', '[class*="enonce"]',
      '[class*="statement"]', '[class*="problem"]', 'main', '#app', '#root'
    ];
    for (const s of selectors) {
      const node = document.querySelector(s);
      if (node) {
        const t = node.innerText.trim();
        if (t.length > 30) return t.slice(0, 3000);
      }
    }
    return document.body.innerText.trim().slice(0, 3000);
  }

  async function solve() {
    const text = extractText();
    if (text === lastText || text.length < 40) return;
    lastText = text;

    const key = getApiKey();
    if (!key) return;

    setBody('⏳ Résolution en cours…');

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{
            role: 'user',
            content: `Tu es un assistant pour un professeur de mathématiques.
Voici le contenu d'une page Kwyk. Identifie l'exercice principal et donne la réponse de façon concise :
- Nombre seul si c'est numérique (avec unité si besoin)
- 2-3 lignes max si c'est un développement
- Si plusieurs questions, réponds à chacune brièvement

Page :
${text}`
          }],
          max_tokens: 350,
          temperature: 0.1
        })
      });

      const data = await res.json();
      const answer = data.choices?.[0]?.message?.content;
      setBody(answer || '❌ ' + (data.error?.message ?? 'Réponse vide'));
    } catch (e) {
      setBody('❌ Erreur réseau : ' + e.message);
    }
  }

  function init() {
    createPanel();

    const obs = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(solve, 1800);
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });

    setTimeout(solve, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

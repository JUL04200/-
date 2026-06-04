chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'SOLVE_EXERCISE') return;

  chrome.storage.sync.get(['apiKey'], async (result) => {
    const apiKey = result.apiKey;

    if (!apiKey) {
      sendResponse({ error: 'Clé API non configurée — ouvre le popup de l\'extension pour la saisir.' });
      return;
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-8',
          max_tokens: 512,
          messages: [
            {
              role: 'user',
              content: `Tu es un assistant pour un professeur de mathématiques qui vérifie des exercices Kwyk.
Voici le contenu visible de la page. Identifie la question principale et donne la réponse de façon très concise.
- Si la réponse est un nombre, donne juste le nombre (et l'unité si applicable).
- Si c'est un développement, résume en 2-3 lignes maximum.
- Si tu ne détectes pas d'exercice clair, réponds "Aucun exercice détecté".

Contenu de la page :
${message.text}`
            }
          ]
        })
      });

      const data = await response.json();

      if (data.content && data.content[0] && data.content[0].text) {
        sendResponse({ answer: data.content[0].text });
      } else if (data.error) {
        sendResponse({ error: data.error.message || 'Erreur API' });
      } else {
        sendResponse({ error: 'Réponse inattendue de l\'API' });
      }
    } catch (err) {
      sendResponse({ error: 'Erreur réseau : ' + err.message });
    }
  });

  return true; // indispensable pour la réponse asynchrone
});

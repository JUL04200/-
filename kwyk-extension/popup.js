document.addEventListener('DOMContentLoaded', () => {
  const input  = document.getElementById('apiKey');
  const btn    = document.getElementById('save');
  const status = document.getElementById('status');

  chrome.storage.sync.get(['apiKey'], (result) => {
    if (result.apiKey) input.value = result.apiKey;
  });

  btn.addEventListener('click', () => {
    const key = input.value.trim();
    if (!key.startsWith('sk-ant-')) {
      status.textContent = '❌ Clé invalide (doit commencer par sk-ant-)';
      status.style.color = '#dc2626';
      return;
    }
    chrome.storage.sync.set({ apiKey: key }, () => {
      status.textContent = '✅ Clé enregistrée !';
      status.style.color = '#16a34a';
      setTimeout(() => { status.textContent = ''; }, 3000);
    });
  });
});

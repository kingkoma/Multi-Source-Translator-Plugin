document.getElementById('translateBtn').addEventListener('click', () => {
  const sourceLang = document.getElementById('sourceLang').value;
  const targetLang = document.getElementById('targetLang').value;
  const source = document.getElementById('source').value;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { sourceLang, targetLang, source });
  });
});

console.log('popup.js loaded');

document.getElementById('translateBtn').addEventListener('click', () => {
  const sourceLang = document.getElementById('sourceLang').value;
  const targetLang = document.getElementById('targetLang').value;
  const source = document.getElementById('source').value;
  const text = document.getElementById('textToTranslate').value; // Add this line to get the text to translate

  console.log('Sending message from popup:', { sourceLang, targetLang, source, text });
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'translate',
      text: text,
      sourceLang: sourceLang,
      targetLang: targetLang,
      source: source
    }, response => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
      } else {
        console.log('Translation response:', response);
      }
    });
  });
});

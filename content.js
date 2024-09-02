chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const selection = window.getSelection().toString();
  
  if (selection) {
    if (request.source === 'deepl') {
      translateWithDeepL(selection, request.sourceLang, request.targetLang);
    } else if (request.source === 'google') {
      translateWithGoogle(selection, request.sourceLang, request.targetLang);
    }
  }
});

function translateWithDeepL(text, sourceLang, targetLang) {
  // Call DeepL API (simplified)
  fetch(`https://api.deepl.com/v2/translate?text=${encodeURIComponent(text)}&source_lang=${sourceLang}&target_lang=${targetLang}`)
    .then(response => response.json())
    .then(data => {
      showTranslation(data.translations[0].text);
    });
}

function translateWithGoogle(text, sourceLang, targetLang) {
  // Call Google Translate API (simplified)
  fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`)
    .then(response => response.json())
    .then(data => {
      showTranslation(data[0][0][0]);
    });
}

function showTranslation(translation) {
  const tooltip = document.createElement('div');
  tooltip.textContent = translation;
  tooltip.style.position = 'absolute';
  tooltip.style.backgroundColor = '#FFF';
  tooltip.style.border = '1px solid #000';
  tooltip.style.padding = '5px';
  document.body.appendChild(tooltip);

  // Position the tooltip near the selection
  const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  tooltip.style.top = `${rect.bottom + window.scrollY}px`;
}

function playAudio(text, lang) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  speechSynthesis.speak(utterance);
}

function showTranslation(translation, lang) {
  const tooltip = document.createElement('div');
  tooltip.textContent = translation;
  tooltip.style.position = 'absolute';
  tooltip.style.backgroundColor = '#FFF';
  tooltip.style.border = '1px solid #000';
  tooltip.style.padding = '5px';
  document.body.appendChild(tooltip);

  // Position the tooltip near the selection
  const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  tooltip.style.top = `${rect.bottom + window.scrollY}px`;

  // Play audio for the translation
  playAudio(translation, lang);
}
function convertToRomaji(text) {
  // 这里可以使用一个第三方库如wanakana进行转换
  return wanakana.toRomaji(text);
}

function showTranslation(translation, targetLang) {
  if (targetLang === 'ja') {
    translation = convertToRomaji(translation);
  }

  const tooltip = document.createElement('div');
  tooltip.textContent = translation;
  tooltip.style.position = 'absolute';
  tooltip.style.backgroundColor = '#FFF';
  tooltip.style.border = '1px solid #000';
  tooltip.style.padding = '5px';
  document.body.appendChild(tooltip);

  const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  tooltip.style.top = `${rect.bottom + window.scrollY}px`;

  playAudio(translation, targetLang);
}


console.log('Content script loaded');

// Constants
const ICON_SIZE = 20;
const QUICK_ICON_ID = 'translation-quick-icon';

// Utility functions
const getConfig = () => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({action: "getConfig"}, (response) => {
      chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(response);
    });
  });
};

const mapLanguageCode = (code, service) => {
  const mapping = {
    // English
    'en': { google: 'en', deepl: 'EN', mymemory: 'eng' },
    
    // Chinese (Simplified)
    'zh': { google: 'zh-CN', deepl: 'ZH', mymemory: 'chi' },
    'zh-CN': { google: 'zh-CN', deepl: 'ZH', mymemory: 'chi' },
    
    // Chinese (Traditional)
    'zh-TW': { google: 'zh-TW', deepl: 'ZH', mymemory: 'cht' },
    
    // Japanese
    'ja': { google: 'ja', deepl: 'JA', mymemory: 'jpn' },
  };

  if (mapping[code] && mapping[code][service]) {
    return mapping[code][service];
  }

  // If no specific mapping is found, return the original code
  return code;
};

// UI-related functions
const createQuickIcon = (iconURL) => {
  const quickIcon = document.createElement('div');
  quickIcon.id = QUICK_ICON_ID;
  
  if (iconURL) {
    quickIcon.innerHTML = `<img src="${iconURL}" width="${ICON_SIZE}" height="${ICON_SIZE}">`;
  } else {
    quickIcon.textContent = '🌐';
  }

  quickIcon.style.cssText = `
    position: fixed !important;
    z-index: 2147483647 !important;
    cursor: pointer !important;
    background: white !important;
    border: 1px solid #ccc !important;
    border-radius: 50% !important;
    width: 25px !important;
    height: 25px !important;
    text-align: center !important;
    line-height: 25px !important;
    font-size: 16px !important;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
    display: none !important;
    top: 0 !important;
    left: 0 !important;
  `;

  document.body.appendChild(quickIcon);
};

const showQuickIcon = (event) => {
  const quickIcon = document.getElementById(QUICK_ICON_ID);
  if (!quickIcon) {
    return;
  }

  const selection = window.getSelection();
  if (selection.toString().trim().length > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    quickIcon.style.top = `${rect.bottom + window.scrollY}px`;
    quickIcon.style.left = `${rect.right + window.scrollX}px`;
    quickIcon.style.setProperty('display', 'block', 'important');
    
    // Force a repaint
    quickIcon.offsetHeight;
  } else {
    quickIcon.style.setProperty('display', 'none', 'important');
  }
};

// Translation-related functions
const detectLanguage = (text) => {
  const apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
  
  return fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      if (data && data[2]) {
        return data[2];
      }
      throw new Error('Unable to detect language');
    });
};

const translateText = async (text, targetLang = 'en') => {
  const quickIcon = document.getElementById(QUICK_ICON_ID);
  if (quickIcon) quickIcon.style.display = 'none !important';

  // Reset translations object for new translation
  const translations = {};

  // First, detect the language
  const detectedLang = await detectLanguage(text);
  console.log('Detected language:', detectedLang);
  
  // Now proceed with translations using the detected language
  await Promise.all([
    translateWithGoogle(text, detectedLang, targetLang, translations),
    translateWithDeepL(text, detectedLang, targetLang, translations),
    translateWithMyMemory(text, detectedLang, targetLang, translations)
  ]);

  showTranslation(translations, targetLang, text, detectedLang);
};

const translateWithGoogle = (text, sourceLang, targetLang, translations) => {
  const mappedSourceLang = mapLanguageCode(sourceLang, 'google');
  const mappedTargetLang = mapLanguageCode(targetLang, 'google');
  
  return fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${mappedSourceLang}&tl=${mappedTargetLang}&dt=t&q=${encodeURIComponent(text)}`)
    .then(response => response.json())
    .then(data => {
      translations['google'] = data[0][0][0];
    })
    .catch(error => {
      console.error('Google translation error:', error);
      translations['google'] = 'Error: ' + error.message;
    });
};

const translateWithDeepL = async (text, sourceLang, targetLang, translations) => {
  const mappedSourceLang = mapLanguageCode(sourceLang, 'deepl');
  const mappedTargetLang = mapLanguageCode(targetLang, 'deepl');
  
  const config = await getConfig();
  const deeplApiKeys = config.DEEPL_API_KEYS;
  const apiKey = getNextDeeplApiKey(deeplApiKeys);
  
  if (!apiKey) {
    translations['deepl'] = 'Error: All API keys exhausted';
    return;
  }

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'translateWithDeepL',
      text,
      sourceLang: mappedSourceLang,
      targetLang: mappedTargetLang,
      apiKey
    }, response => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        translations['deepl'] = 'Error: ' + chrome.runtime.lastError.message;
        reject(chrome.runtime.lastError);
      } else if (response.success) {
        translations['deepl'] = response.translation;
        resolve();
      } else {
        translations['deepl'] = 'Error: ' + response.error;
        reject(new Error(response.error));
      }
    });
  });
};

const translateWithMyMemory = (text, sourceLang, targetLang, translations) => {
  const mappedSourceLang = mapLanguageCode(sourceLang, 'mymemory');
  const mappedTargetLang = mapLanguageCode(targetLang, 'mymemory');
  
  const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${mappedSourceLang}|${mappedTargetLang}`;

  return fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      if (data.responseData && data.responseData.translatedText) {
        translations['mymemory'] = data.responseData.translatedText;
      } else {
        throw new Error('No translation found in the response');
      }
    })
    .catch(error => {
      // console.error('MyMemory translation error:', error);
      translations['mymemory'] = 'Error: ' + error.message;
    });
};

// Audio-related functions
const convertToKatakana = async (text) => {
  const config = await getConfig();
  const apiKey = config.GOO_LABS_API_KEY;
  const apiUrl = 'https://labs.goo.ne.jp/api/hiragana';
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: apiKey,
      sentence: text,
      output_type: 'katakana',
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.converted;
};

const playAudio = (text, lang) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  
  // Find a voice that matches the language
  const voices = speechSynthesis.getVoices();
  const voice = voices.find(voice => voice.lang.startsWith(lang)) || voices[0];
  if (voice) {
    utterance.voice = voice;
  }

  speechSynthesis.speak(utterance);
};

// UI components
const createTooltip = (translations, currentTargetLang, originalText, sourceLang) => {
  const tooltip = document.createElement('div');
  tooltip.className = 'translation-tooltip';
  tooltip.id = 'my-extension-tooltip';
  tooltip.innerHTML = `
  <select class="lang-select">
      <option value="en" ${currentTargetLang === 'en' ? 'selected' : ''}>English</option>
      <option value="zh-CN" ${currentTargetLang === 'zh-CN' ? 'selected' : ''}>Chinese (Simplified)</option>
      <option value="ja" ${currentTargetLang === 'ja' ? 'selected' : ''}>Japanese</option>
    </select>
    <div class="original-container">
    <div class="original-text">${originalText}
      <button class="audio-btn" data-text="${originalText}" data-lang="${sourceLang}">🔊</button></div>
    ${sourceLang === 'ja' ? `<div class="katakana-text">Converting to katakana...</div>` : ''}
    </div>
    <div class="translations">
      ${Object.entries(translations).map(([source, translation]) => `
        <div class="translation-item">
          <h4>${source}</h4>
          <p>
            ${translation}
            <button class="audio-btn" data-text="${translation}" data-lang="${currentTargetLang}">🔊</button>
          </p>
        </div>
      `).join('')}
    </div>
  `;

  // Add event listeners for audio buttons
  const audioButtons = tooltip.querySelectorAll('.audio-btn');
  audioButtons.forEach(button => {
    button.addEventListener('click', () => {
      const text = button.getAttribute('data-text');
      const lang = button.getAttribute('data-lang');
      playAudio(text, lang);
    });
  });


  const langSelect = tooltip.querySelector('.lang-select');
  langSelect.addEventListener('change', (event) => {
    const newTargetLang = event.target.value;
    translateText(originalText, newTargetLang);
  });

  if (sourceLang === 'ja') {
    const katakanaDiv = tooltip.querySelector('.katakana-text');
    convertToKatakana(originalText).then(katakana => {
      katakanaDiv.textContent = katakana;
    }).catch(error => {
      console.error('Error converting to katakana:', error);
      katakanaDiv.textContent = 'Error converting to katakana';
    });
  }

  return tooltip;
};

const showTranslation = (translations, currentTargetLang, originalText, sourceLang) => {
  // Remove any existing tooltips
  const existingTooltips = document.querySelectorAll('.translation-tooltip');
  existingTooltips.forEach(tooltip => tooltip.remove());

  const tooltip = createTooltip(translations, currentTargetLang, originalText, sourceLang);

  document.body.appendChild(tooltip);

  // Position the tooltip near the selected text
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    tooltip.style.left = `${rect.left + scrollX}px`;
    tooltip.style.top = `${rect.bottom + scrollY + 5}px`;

    // Adjust position if tooltip goes off-screen
    const tooltipRect = tooltip.getBoundingClientRect();
    if (tooltipRect.right > window.innerWidth) {
      tooltip.style.left = `${window.innerWidth - tooltipRect.width - 5}px`;
    }
    if (tooltipRect.bottom > window.innerHeight) {
      tooltip.style.top = `${rect.top + scrollY - tooltipRect.height - 5}px`;
    }
  } else {
    // Fallback to center of the viewport if no selection
    tooltip.style.left = '50%';
    tooltip.style.top = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
  }

  // Remove the tooltip after 30 seconds
  // setTimeout(() => {
  //   tooltip.remove();
  // }, 30000);

  // Remove the tooltip when clicking outside of it
  document.addEventListener('click', function removeTooltip(e) {
    if (!tooltip.contains(e.target)) {
      tooltip.remove();
      document.removeEventListener('click', removeTooltip);
    }
  });
};

// DeepL API key management
let currentDeeplKeyIndex = 0;
const getNextDeeplApiKey = (deeplApiKeys) => {
  if (currentDeeplKeyIndex < deeplApiKeys.length) {
    const apiKey = deeplApiKeys[currentDeeplKeyIndex];
    currentDeeplKeyIndex++;
    return apiKey;
  }
  return null;
};

// Event listeners and initialization
document.addEventListener('mouseup', showQuickIcon);

document.addEventListener('click', (event) => {
  const quickIcon = document.getElementById(QUICK_ICON_ID);
  if (quickIcon && event.target.closest(`#${QUICK_ICON_ID}`)) {
    const selectedText = window.getSelection().toString();
    translateText(selectedText);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    console.log('Translating:', request.text);
    translateText(request.text, request.targetLang)
      .then(() => sendResponse({ success: true }))
      .catch(error => {
        console.error('Translation error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

// Initialization
(async () => {
  if (!('speechSynthesis' in window)) {
    alert("Web Speech API not supported :-(");
    return;
  }

  const { iconURL } = await new Promise(resolve => {
    chrome.runtime.sendMessage({action: "getIconURL"}, resolve);
  });

  createQuickIcon(iconURL);

  speechSynthesis.onvoiceschanged = () => {
    speechSynthesis.getVoices();
  };
})();



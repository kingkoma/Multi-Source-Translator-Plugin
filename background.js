import { CONFIG } from './config.js';

// Constants
const CONTEXT_MENU_ID = "translateSelection";
const CONTEXT_MENU_TITLE = "Translate Selection";

// Utility functions
const sendMessageToTab = (tabId, message) => {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
};

const translateWithDeepL = async (text, sourceLang, targetLang, apiKey) => {
  
  const apiUrl = apiKey.type === 'free' 
    ? 'https://api-free.deepl.com/v2/translate' 
    : 'https://api.deepl.com/v2/translate';

  const requestBody = {
    auth_key: apiKey.key,
    text: [text],
    // source_lang: sourceLang.toUpperCase(),
    target_lang: targetLang.toUpperCase()
  };

  return fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `DeepL-Auth-Key ${apiKey.key}`
    },
    body: JSON.stringify(requestBody)
  })
  .then(response => {
    if (!response.ok) {
      return response.text().then(text => {
        throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
      });
    }
    return response.json();
  })
  .then(data => {
    if (data.translations && data.translations.length > 0) {
      return data.translations[0].text;
    } else {
      throw new Error('No translation found in the response');
    }
  });
};

// Event listeners
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: CONTEXT_MENU_TITLE,
    contexts: ["selection"]
  });
  console.log('Context menu created');
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_ID) {
    sendMessageToTab(tab.id, { action: "translate", text: info.selectionText })
      .then(response => {
        if (response && response.success) {
          console.log("Translation initiated successfully");
        }
      })
      .catch(error => {
        console.error("Error sending message:", error.message);
        // Handle the error (e.g., show a notification to the user)
      });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in background script:', request);

  if (request.action === 'translateWithDeepL') {
    translateWithDeepL(request.text, request.sourceLang, request.targetLang, request.apiKey)
      .then(translation => sendResponse({ success: true, translation }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }

  if (request.action === "getIconURL") {
    sendResponse({iconURL: chrome.runtime.getURL("icons/icon16.png")});
  }

  if (request.action === "getConfig") {
    sendResponse(CONFIG);
  }
});

// Tab management
const injectedTabs = new Set();

chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    injectedTabs.delete(tabId);
  }
});



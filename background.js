chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "translateSelection",
    title: "Translate Selection",
    contexts: ["selection"]
  });
  console.log('Context menu created');
});

// Keep track of tabs where content script has been injected
const injectedTabs = new Set();

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translateSelection") {
    chrome.tabs.sendMessage(tab.id, { action: "translate", text: info.selectionText }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError.message);
        // Handle the error (e.g., show a notification to the user)
      } else if (response && response.success) {
        console.log("Translation initiated successfully");
      }
    });
  }
});

function sendTranslationMessage(tabId, text) {
  chrome.tabs.sendMessage(tabId, {
    action: 'translate',
    text: text,
    sourceLang: 'ja',
    targetLang: 'en',
    source: 'google'
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error sending message:', chrome.runtime.lastError.message);
      // If the error is due to the receiving end not existing, try injecting the script again
      if (chrome.runtime.lastError.message.includes("Receiving end does not exist")) {
        injectedTabs.delete(tabId);
        chrome.contextMenus.onClicked.dispatch({ menuItemId: 'translate', selectionText: text }, { id: tabId });
      }
    } else if (response) {
      console.log('Translation response:', response);
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background script:', message);
  if (message.action === 'translate') {
    // Handle the translation logic here if needed
    sendResponse({ result: 'Translation result' });
  }
  return true; // Keep the message channel open for sendResponse
});

// Clean up injectedTabs when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});

// Listen for tab updates and remove from injectedTabs if the tab is refreshed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    injectedTabs.delete(tabId);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translateWithDeepL') {
    translateWithDeepL(request.text, request.sourceLang, request.targetLang, request.apiKey)
      .then(translation => sendResponse({ success: true, translation }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }

});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getIconURL") {
    sendResponse({iconURL: chrome.runtime.getURL("icons/icon16.png")});
  }
  // ... other message handlers ...
});

function translateWithDeepL(text, sourceLang, targetLang, apiKey) {
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
}



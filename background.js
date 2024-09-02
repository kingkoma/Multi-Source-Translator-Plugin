chrome.contextMenus.create({
  id: 'translate',
  title: 'Translate with Multi-Source Translator',
  contexts: ['selection']
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'translate', text: info.selectionText });
});

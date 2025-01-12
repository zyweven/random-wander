chrome.tabs.onCreated.addListener(async (tab) => {
  const { enabled } = await chrome.storage.sync.get(['enabled']);
  if (!enabled) return;

  const { urls } = await chrome.storage.sync.get(['urls']);
  if (!urls || urls.length === 0) return;

  const randomUrl = urls[Math.floor(Math.random() * urls.length)];
  chrome.tabs.update(tab.id, { url: randomUrl });
}); 
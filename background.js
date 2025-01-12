chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.pendingUrl !== 'chrome://newtab/' && tab.pendingUrl !== 'about:blank') {
    return;
  }

  const { packages = {} } = await chrome.storage.sync.get(['packages']);
  
  // 获取所有启用的包中的URL
  const enabledUrls = Object.values(packages)
    .filter(pkg => pkg.enabled)
    .flatMap(pkg => pkg.urls);

  if (enabledUrls.length === 0) return;

  const randomUrl = enabledUrls[Math.floor(Math.random() * enabledUrls.length)];
  chrome.tabs.update(tab.id, { url: randomUrl });
}); 
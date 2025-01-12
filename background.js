// 使用 chrome.storage.session 来存储缓存，这样在 service worker 重启时数据不会丢失
async function updateEnabledUrlsCache() {
  const { packages = {} } = await chrome.storage.sync.get(['packages']);
  const enabledUrls = Object.values(packages)
    .filter(pkg => pkg.enabled)
    .flatMap(pkg => pkg.urls);

  console.log('Enabled URLs:', enabledUrls); // 调试信息

  // 如果没有启用的URL，清空缓存
  if (enabledUrls.length === 0) {
    await chrome.storage.session.clear();
    console.log('Cache cleared'); // 调试信息
    return;
  }

  // 保存到 session storage
  await chrome.storage.session.set({
    enabledUrls,
    unusedIndexes: Array.from({ length: enabledUrls.length }, (_, i) => i)
  });
  
  // 打乱索引顺序
  await shuffleUnusedIndexes();
}

// 打乱索引顺序
async function shuffleUnusedIndexes() {
  const { unusedIndexes = [] } = await chrome.storage.session.get(['unusedIndexes']);
  
  // Fisher-Yates 洗牌算法
  for (let i = unusedIndexes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unusedIndexes[i], unusedIndexes[j]] = [unusedIndexes[j], unusedIndexes[i]];
  }
  
  await chrome.storage.session.set({ unusedIndexes });
}

// 获取下一个随机URL
async function getNextRandomUrl() {
  const { enabledUrls = [], unusedIndexes = [] } = await chrome.storage.session.get(['enabledUrls', 'unusedIndexes']);
  
  console.log('Current enabled URLs:', enabledUrls); // 调试信息
  console.log('Current unused indexes:', unusedIndexes); // 调试信息

  if (enabledUrls.length === 0) return null;
  
  // 如果索引池为空，重新填充并打乱
  if (unusedIndexes.length === 0) {
    await chrome.storage.session.set({
      unusedIndexes: Array.from({ length: enabledUrls.length }, (_, i) => i)
    });
    await shuffleUnusedIndexes();
    return getNextRandomUrl();
  }
  
  // 从索引池中取出一个索引
  const remainingIndexes = unusedIndexes.slice(0, -1);
  const selectedIndex = unusedIndexes[unusedIndexes.length - 1];
  
  await chrome.storage.session.set({ unusedIndexes: remainingIndexes });
  return enabledUrls[selectedIndex];
}

// 监听存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.packages) {
    updateEnabledUrlsCache();
  }
});

// 处理新标签页
chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.pendingUrl !== 'chrome://newtab/' && tab.pendingUrl !== 'about:blank') {
    return;
  }

  const url = await getNextRandomUrl();
  if (url) {
    console.log('Navigating to URL:', url); // 调试信息
    chrome.tabs.update(tab.id, { url });
  }
});

// 添加消息监听
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'updateCache') {
    updateEnabledUrlsCache();
  }
});

// 初始化缓存
updateEnabledUrlsCache(); 
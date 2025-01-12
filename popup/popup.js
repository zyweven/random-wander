document.addEventListener('DOMContentLoaded', () => {
  const enableWander = document.getElementById('enableWander');
  const openOptions = document.getElementById('openOptions');

  // 加载保存的设置
  chrome.storage.sync.get(['enabled'], (result) => {
    enableWander.checked = result.enabled ?? false;
  });

  // 保存设置
  enableWander.addEventListener('change', (e) => {
    chrome.storage.sync.set({ enabled: e.target.checked });
  });

  // 打开选项页面
  openOptions.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}); 
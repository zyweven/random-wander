document.addEventListener('DOMContentLoaded', () => {
  const enableWander = document.getElementById('enableWander');
  const openOptions = document.getElementById('openOptions');

  // 加载保存的设置
  chrome.storage.sync.get(['packages'], (result) => {
    const packages = result.packages || {};
    // 如果有任何包被启用，就显示为启用状态
    enableWander.checked = Object.values(packages).some(pkg => pkg.enabled);
  });

  // 保存设置
  enableWander.addEventListener('change', async (e) => {
    const { packages = {} } = await chrome.storage.sync.get(['packages']);
    // 将所有包的启用状态设置为相同
    Object.keys(packages).forEach(key => {
      packages[key].enabled = e.target.checked;
    });
    await chrome.storage.sync.set({ packages });
  });

  // 打开选项页面
  openOptions.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}); 
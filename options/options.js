document.addEventListener('DOMContentLoaded', () => {
  const newPackageName = document.getElementById('newPackageName');
  const createPackage = document.getElementById('createPackage');
  const newUrl = document.getElementById('newUrl');
  const packageSelect = document.getElementById('packageSelect');
  const addUrl = document.getElementById('addUrl');
  const packageList = document.getElementById('packageList');
  const importBookmarks = document.getElementById('importBookmarks');
  const bookmarkFolder = document.getElementById('bookmarkFolder');
  const importPackageSelect = document.getElementById('importPackageSelect');
  const newImportPackageName = document.getElementById('newImportPackageName');
  const importControls = document.getElementById('importControls');
  const executeImport = document.getElementById('executeImport');

  // 加载所有包
  async function loadPackages() {
    const { packages = {} } = await chrome.storage.sync.get(['packages']);
    packageList.innerHTML = '';
    
    // 更新包选择下拉菜单
    packageSelect.innerHTML = '<option value="">选择包...</option>';
    importPackageSelect.innerHTML = '<option value="">选择导入到的包...</option>';
    importPackageSelect.innerHTML += '<option value="new">创建新包</option>';
    
    Object.entries(packages).forEach(([name, pkg]) => {
      // 添加到下拉菜单
      packageSelect.innerHTML += `<option value="${name}">${name}</option>`;
      importPackageSelect.innerHTML += `<option value="${name}">${name}</option>`;
      
      // 创建包的显示区域
      const div = document.createElement('div');
      div.className = 'package-item';
      div.innerHTML = `
        <div class="package-header">
          <span class="package-title">${name}</span>
          <div class="package-controls">
            <label class="package-switch">
              <input type="checkbox" ${pkg.enabled ? 'checked' : ''} data-package="${name}">
              启用
            </label>
            <button class="delete-package" data-package="${name}">删除包</button>
          </div>
        </div>
        <ul class="url-list">
          ${pkg.urls.map(url => `
            <li class="url-item">
              <span title="${url}">${url}</span>
              <button class="delete" data-package="${name}" data-url="${url}">删除</button>
            </li>
          `).join('')}
        </ul>
      `;
      packageList.appendChild(div);
    });
  }

  // 创建新包
  createPackage.addEventListener('click', async () => {
    const name = newPackageName.value.trim();
    if (!name) return;

    const { packages = {} } = await chrome.storage.sync.get(['packages']);
    if (packages[name]) {
      alert('包名已存在');
      return;
    }

    packages[name] = { urls: [], enabled: true };
    await chrome.storage.sync.set({ packages });
    newPackageName.value = '';
    loadPackages();
  });

  // 添加URL到包
  addUrl.addEventListener('click', async () => {
    const url = newUrl.value.trim();
    const packageName = packageSelect.value;
    if (!url || !packageName) return;

    const { packages = {} } = await chrome.storage.sync.get(['packages']);
    if (!packages[packageName].urls.includes(url)) {
      packages[packageName].urls.push(url);
      await chrome.storage.sync.set({ packages });
      newUrl.value = '';
      loadPackages();
    }
  });

  // 处理包的启用/禁用和删除
  packageList.addEventListener('click', async (e) => {
    const { packages = {} } = await chrome.storage.sync.get(['packages']);
    
    if (e.target.matches('input[type="checkbox"]')) {
      const packageName = e.target.dataset.package;
      packages[packageName].enabled = e.target.checked;
      await chrome.storage.sync.set({ packages });
    }
    
    if (e.target.matches('.delete-package')) {
      const packageName = e.target.dataset.package;
      delete packages[packageName];
      await chrome.storage.sync.set({ packages });
      loadPackages();
    }
    
    if (e.target.matches('.delete')) {
      const { package: packageName, url } = e.target.dataset;
      packages[packageName].urls = packages[packageName].urls.filter(u => u !== url);
      await chrome.storage.sync.set({ packages });
      loadPackages();
    }
  });

  // 处理书签导入按钮点击
  importBookmarks.addEventListener('click', async () => {
    if (importControls.style.display === 'none') {
      try {
        // 清空并重置选项
        bookmarkFolder.innerHTML = '<option value="">选择书签文件夹...</option>';
        importPackageSelect.value = '';
        newImportPackageName.value = '';
        newImportPackageName.style.display = 'none';
        
        // 加载书签文件夹
        const tree = await chrome.bookmarks.getTree();
        await loadBookmarkFolders(tree);
        
        // 如果没有找到任何包含URL的文件夹
        if (bookmarkFolder.options.length <= 1) {
          alert('未找到包含有效URL的书签文件夹');
          return;
        }
        
        importControls.style.display = 'flex';
      } catch (error) {
        console.error('加载书签时出错:', error);
        alert('加载书签时出错，请重试');
      }
    } else {
      // 重置并隐藏所有导入相关的元素
      importControls.style.display = 'none';
      bookmarkFolder.value = '';
      importPackageSelect.value = '';
      newImportPackageName.value = '';
      newImportPackageName.style.display = 'none';
    }
  });

  // 处理导入包选择
  importPackageSelect.addEventListener('change', (e) => {
    const isNewPackage = e.target.value === 'new';
    newImportPackageName.style.display = isNewPackage ? 'block' : 'none';
    if (!isNewPackage) {
      newImportPackageName.value = '';
    }
  });

  // 执行导入操作
  executeImport.addEventListener('click', async () => {
    const folderId = bookmarkFolder.value;
    const packageName = importPackageSelect.value;

    // 验证选择
    if (!folderId) {
      alert('请选择书签文件夹');
      return;
    }
    if (!packageName) {
      alert('请选择要导入到的包或创建新包');
      return;
    }

    try {
      if (packageName === 'new') {
        // 新建包的情况
        const newName = newImportPackageName.value.trim();
        if (!newName) {
          alert('请输入新包名称');
          return;
        }

        const { packages = {} } = await chrome.storage.sync.get(['packages']);
        if (packages[newName]) {
          alert('包名已存在');
          return;
        }

        // 提取书签URL
        const bookmarkUrls = await extractBookmarkUrls(folderId);
        if (bookmarkUrls.length === 0) {
          alert('所选文件夹中没有有效的URL');
          return;
        }

        // 创建新包并添加URL
        packages[newName] = {
          urls: bookmarkUrls,
          enabled: true
        };
        await chrome.storage.sync.set({ packages });
        alert(`成功创建包 "${newName}" 并导入了 ${bookmarkUrls.length} 个URL`);
      } else {
        // 导入到现有包的情况
        const { packages = {} } = await chrome.storage.sync.get(['packages']);
        if (!packages[packageName]) {
          alert('所选包不存在');
          return;
        }

        // 提取书签URL
        const bookmarkUrls = await extractBookmarkUrls(folderId);
        if (bookmarkUrls.length === 0) {
          alert('所选文件夹中没有有效的URL');
          return;
        }

        // 合并URL并去重
        packages[packageName].urls = [...new Set([
          ...packages[packageName].urls,
          ...bookmarkUrls
        ])];
        await chrome.storage.sync.set({ packages });
        alert(`成功导入 ${bookmarkUrls.length} 个URL到包 "${packageName}"`);
      }

      // 重置并隐藏导入控件
      importControls.style.display = 'none';
      bookmarkFolder.value = '';
      importPackageSelect.value = '';
      newImportPackageName.value = '';
      newImportPackageName.style.display = 'none';

      // 刷新显示
      loadPackages();
    } catch (error) {
      console.error('导入书签时出错:', error);
      alert('导入书签时出错，请重试');
    }
  });

  // 从书签文件夹提取URL
  async function extractBookmarkUrls(folderId) {
    try {
      const folder = await chrome.bookmarks.getSubTree(folderId);
      if (!folder || !folder[0]) {
        console.error('无法获取书签文件夹');
        return [];
      }

      const bookmarks = [];
      
      function extractUrls(items) {
        for (const item of items) {
          if (item.url && isValidUrl(item.url)) {
            bookmarks.push(item.url);
          }
          if (item.children) {
            extractUrls(item.children);
          }
        }
      }
      
      extractUrls(folder[0].children || []);
      return [...new Set(bookmarks)]; // 去重
    } catch (error) {
      console.error('提取书签URL时出错:', error);
      return [];
    }
  }

  // 验证URL是否有效
  function isValidUrl(url) {
    try {
      // 排除 chrome:// 和 edge:// 等浏览器内部链接
      if (url.startsWith('chrome://') || 
          url.startsWith('edge://') || 
          url.startsWith('about:') ||
          url.startsWith('javascript:')) {
        return false;
      }
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // 获取书签树
  async function loadBookmarkFolders(bookmarkItems, level = 0) {
    for (const item of bookmarkItems) {
      if (item.children) {
        // 检查此文件夹是否包含任何 URL
        let hasUrls = false;
        function checkUrls(items) {
          for (const i of items) {
            if (i.url) {
              hasUrls = true;
              return;
            }
            if (i.children) {
              checkUrls(i.children);
            }
          }
        }
        checkUrls(item.children);

        if (hasUrls) {
          const option = document.createElement('option');
          option.value = item.id;
          // 添加缩进以显示层级关系
          option.textContent = '  '.repeat(level) + item.title;
          bookmarkFolder.appendChild(option);
        }
        await loadBookmarkFolders(item.children, level + 1);
      }
    }
  }

  loadPackages();
}); 
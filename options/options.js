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
      div.setAttribute('data-enabled', pkg.enabled);
      
      // 创建包的各个元素
      const header = document.createElement('div');
      header.className = 'package-header';
      header.innerHTML = `
        <div class="package-title">
          <span>${name}</span>
          <button class="edit-package-name" title="编辑包名称">✎</button>
          <input type="text" value="${name}" style="display: none;">
        </div>
        <div class="package-controls">
          <label class="package-switch">
            <input type="checkbox" ${pkg.enabled ? 'checked' : ''} data-package="${name}">
            启用
          </label>
          <button class="delete-package" data-package="${name}">删除</button>
        </div>
      `;

      const info = document.createElement('div');
      info.className = 'package-info';
      info.innerHTML = `包含 ${pkg.urls.length} 个网址`;

      const urlListContainer = document.createElement('div');
      urlListContainer.className = 'url-list-container';

      const urlList = document.createElement('ul');
      urlList.className = 'url-list';
      urlList.innerHTML = pkg.urls.map(url => `
        <li class="url-item">
          <img class="url-favicon" src="${getFaviconUrl(url)}" alt="" 
               onerror="this.style.display='none'">
          <div class="url-content">
            <a href="${url}" 
               title="${url}"
               target="_blank" 
               rel="noopener noreferrer" 
               class="url-link">
              <div class="url-text">
                <div class="url-site-name">${getWebsiteName(url)}</div>
                <div class="url-full">${url}</div>
              </div>
            </a>
          </div>
          <button class="delete" data-package="${name}" data-url="${url}">删除</button>
        </li>
      `).join('');

      // 将 URL 列表放入容器
      urlListContainer.appendChild(urlList);

      // 组装包的结构
      div.appendChild(header);
      div.appendChild(info);
      div.appendChild(urlListContainer);
      packageList.appendChild(div);

      // 为信息区域添加点击事件
      info.addEventListener('click', (e) => {
        // 阻止事件冒泡
        e.stopPropagation();
        e.preventDefault();

        // 如果点击的是控制按钮，不触发展开/收起
        if (e.target.matches('button, input, label') || 
            e.target.closest('.package-controls')) {
          return;
        }

        // 获取当前卡片
        const currentCard = div;
        const isExpanded = currentCard.classList.contains('expanded');

        // 先关闭所有卡片
        document.querySelectorAll('.package-item.expanded').forEach(pkg => {
          pkg.classList.remove('expanded');
        });

        // 如果当前卡片未展开，则展开它
        if (!isExpanded) {
          currentCard.classList.add('expanded');
        }
      });

      // 添加编辑包名称的功能
      const titleContainer = header.querySelector('.package-title');
      const titleSpan = titleContainer.querySelector('span');
      const editButton = titleContainer.querySelector('.edit-package-name');
      const titleInput = titleContainer.querySelector('input');

      // 点击编辑按钮进入编辑模式
      editButton.addEventListener('click', (e) => {
        e.stopPropagation();
        titleContainer.classList.add('editing');
        titleInput.value = titleSpan.textContent;
        titleInput.style.display = 'block';
        titleInput.focus();
      });

      // 处理编辑完成
      titleInput.addEventListener('blur', async () => {
        const newName = titleInput.value.trim();
        const oldName = titleSpan.textContent;
        
        if (newName && newName !== oldName) {
          try {
            const { packages = {} } = await chrome.storage.sync.get(['packages']);
            
            // 检查新名称是否已存在
            if (packages[newName]) {
              alert('包名已存在');
              titleInput.value = oldName;
            } else {
              // 创建新的包对象并保持原有数据
              packages[newName] = {
                ...packages[oldName],
                urls: [...packages[oldName].urls]
              };
              // 删除旧的包
              delete packages[oldName];
              
              await chrome.storage.sync.set({ packages });
              // 重新加载包列表
              loadPackages();
            }
          } catch (error) {
            console.error('修改包名称时出错:', error);
            alert('修改包名称时出错，请重试');
          }
        }
        
        titleContainer.classList.remove('editing');
        titleInput.style.display = 'none';
      });

      // 处理按下回车键
      titleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          titleInput.blur();
        }
      });

      // 处理按下 Esc 键取消编辑
      titleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          titleInput.value = titleSpan.textContent;
          titleInput.blur();
        }
      });
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
      const isEnabled = e.target.checked;
      packages[packageName].enabled = isEnabled;
      
      // 更新包的视觉状态
      const packageItem = e.target.closest('.package-item');
      packageItem.setAttribute('data-enabled', isEnabled);
      
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

  // 修改书签文件夹选择的处理
  bookmarkFolder.addEventListener('change', async (e) => {
    if (importPackageSelect.value === 'new') {
      try {
        const folderId = e.target.value;
        if (folderId) {
          // 获取选中的书签文件夹信息
          const [folder] = await chrome.bookmarks.get(folderId);
          if (folder) {
            // 自动填充新包名输入框
            newImportPackageName.value = folder.title;
          }
        }
      } catch (error) {
        console.error('获取书签文件夹信息时出错:', error);
      }
    }
  });

  // 修改导入包选择的处理
  importPackageSelect.addEventListener('change', async (e) => {
    const isNewPackage = e.target.value === 'new';
    newImportPackageName.style.display = isNewPackage ? 'block' : 'none';
    
    if (isNewPackage && bookmarkFolder.value) {
      try {
        // 获取选中的书签文件夹信息
        const [folder] = await chrome.bookmarks.get(bookmarkFolder.value);
        if (folder) {
          // 自动填充新包名输入框
          newImportPackageName.value = folder.title;
        }
      } catch (error) {
        console.error('获取书签文件夹信息时出错:', error);
      }
    } else {
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

  // 添加一个函数来获取网站图标
  function getFaviconUrl(url) {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
    } catch {
      return '';
    }
  }

  // 添加一个函数来获取网站名称
  function getWebsiteName(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  // 点击事件处理
  document.addEventListener('click', (e) => {
    const expandedPackages = document.querySelectorAll('.package-item.expanded');
    if (!Array.from(expandedPackages).some(pkg => pkg.contains(e.target))) {
      expandedPackages.forEach(pkg => {
        pkg.classList.remove('expanded');
      });
    }
  });

  loadPackages();
}); 
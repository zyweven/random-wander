document.addEventListener('DOMContentLoaded', () => {
  const newUrl = document.getElementById('newUrl');
  const addUrl = document.getElementById('addUrl');
  const urlList = document.getElementById('urlList');
  const importBookmarks = document.getElementById('importBookmarks');
  const bookmarkFolder = document.getElementById('bookmarkFolder');

  // 加载保存的网址
  function loadUrls() {
    chrome.storage.sync.get(['urls'], (result) => {
      const urls = result.urls || [];
      urlList.innerHTML = '';
      urls.forEach((url) => {
        const li = document.createElement('li');
        li.className = 'url-item';
        li.innerHTML = `
          <span title="${url}">${url}</span>
          <button class="delete" data-url="${url}">删除</button>
        `;
        urlList.appendChild(li);
      });
    });
  }

  // 添加新网址
  addUrl.addEventListener('click', () => {
    const url = newUrl.value.trim();
    if (!url) return;

    chrome.storage.sync.get(['urls'], (result) => {
      const urls = result.urls || [];
      if (!urls.includes(url)) {
        urls.push(url);
        chrome.storage.sync.set({ urls }, loadUrls);
      }
      newUrl.value = '';
    });
  });

  // 删除网址
  urlList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete')) {
      const urlToDelete = e.target.dataset.url;
      chrome.storage.sync.get(['urls'], (result) => {
        const urls = result.urls.filter(url => url !== urlToDelete);
        chrome.storage.sync.set({ urls }, loadUrls);
      });
    }
  });

  // 获取书签树并填充下拉菜单
  async function loadBookmarkFolders(bookmarkItems) {
    for (const item of bookmarkItems) {
      if (item.children) {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.title;
        bookmarkFolder.appendChild(option);
        await loadBookmarkFolders(item.children);
      }
    }
  }

  // 从选定文件夹导入书签
  async function importFromFolder(folderId) {
    const folder = await chrome.bookmarks.getSubTree(folderId);
    const bookmarks = [];
    
    function extractUrls(items) {
      for (const item of items) {
        if (item.url) {
          bookmarks.push(item.url);
        }
        if (item.children) {
          extractUrls(item.children);
        }
      }
    }
    
    extractUrls(folder);
    
    // 合并现有 URL 和新书签
    const { urls = [] } = await chrome.storage.sync.get(['urls']);
    const newUrls = [...new Set([...urls, ...bookmarks])];
    await chrome.storage.sync.set({ urls: newUrls });
    loadUrls();
  }

  // 处理导入书签按钮点击
  importBookmarks.addEventListener('click', () => {
    if (bookmarkFolder.style.display === 'none') {
      chrome.bookmarks.getTree().then(tree => {
        bookmarkFolder.innerHTML = '<option value="">选择书签文件夹...</option>';
        loadBookmarkFolders(tree);
        bookmarkFolder.style.display = 'block';
      });
    } else {
      bookmarkFolder.style.display = 'none';
    }
  });

  // 处理文件夹选择
  bookmarkFolder.addEventListener('change', (e) => {
    const folderId = e.target.value;
    if (folderId) {
      importFromFolder(folderId);
      bookmarkFolder.style.display = 'none';
      bookmarkFolder.value = '';
    }
  });

  loadUrls();
}); 
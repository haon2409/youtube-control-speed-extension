chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    // Kiểm tra nếu không tìm thấy tab hoặc URL không hợp lệ
    if (!tabs[0] || !tabs[0].url || tabs[0].url.startsWith('chrome://')) {
      document.body.innerHTML = "<div>Không hỗ trợ trang này</div>";
      return;
    }
  
    try {
      const url = new URL(tabs[0].url);
      const domain = url.hostname;
      const toggle = document.getElementById('toggle-status');
      const domainLabel = document.getElementById('domain-name');
  
      domainLabel.textContent = domain;
  
      // Lấy trạng thái lưu trữ
      chrome.storage.sync.get([domain], (result) => {
        toggle.checked = result[domain] || false;
      });
  
      // Lưu trạng thái khi click
      toggle.onchange = () => {
        chrome.storage.sync.set({ [domain]: toggle.checked }, () => {
          // Chỉ reload nếu là trang web hợp lệ
          chrome.tabs.reload(tabs[0].id);
        });
      };
    } catch (e) {
      console.error("Lỗi phân tích URL:", e);
    }
  });
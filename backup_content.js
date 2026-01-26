let currentSpeed = 1;
let lastSpeed = 1;
let lastVideoSrc = '';
let youTubeLiveState = undefined; // Lưu kết quả nhận diện livestream cho YouTube theo từng link

// Phát hiện livestream cho YouTube dựa trên nhãn LIVE ở thanh điều khiển
function isLiveLabelVisibleOnControls() {
  // Chỉ kiểm tra nhãn LIVE đúng trên thanh điều khiển
  // Selector hợp lệ duy nhất
  const badgeCandidates = ['.ytp-chrome-bottom .ytp-live-badge'];

  const isElVisible = (el) => {
    if (!el) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    if (el.hidden === true) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    if (!style) return false;
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') === 0) return false;
    return true;
  };

  const isAllowedLiveBadge = (el) => {
    if (!el || !el.classList) return false;
    // Bắt buộc có ytp-live-badge và một trong các class trạng thái bên dưới
    const hasBase = el.classList.contains('ytp-live-badge');
    const hasLiveState = el.classList.contains('ytp-live-badge-is-live') || el.classList.contains('ytp-live-badge-is-livehead');
    return hasBase && hasLiveState;
  };

  for (const sel of badgeCandidates) {
    const els = document.querySelectorAll(sel);
    for (const el of els) {
      if (!isElVisible(el)) continue;
      if (!isAllowedLiveBadge(el)) continue;
      const text = (el.textContent || '').trim().toUpperCase();
      // Yêu cầu khớp chặt: chính xác là LIVE hoặc bắt đầu bằng LIVE
      if (text === 'LIVE' || text.startsWith('LIVE ')) {
        // Lưu vào window để popup có thể đọc thông tin debug qua response
        window.__ytLiveDetect = {
          matchedSelector: sel,
          className: el.className || '',
          text: (el.textContent || '').trim()
        };
        return true;
      }
    }
  }
  window.__ytLiveDetect = undefined;
  return false;
}

// Helper: xác định có phải livestream không (thay bằng cách của File 2)
function isLiveStream(video) {
  // Chỉ thay đổi phần này – dùng cách kiểm tra của File 2
  return !!document.querySelector(
    '.ytp-live-badge[aria-disabled="false"], .ytp-live, yt-live-chat-renderer'
  );
}

// Đợi một chút để badge LIVE render rồi mới đọc, sau đó cập nhật UI liên quan
function scheduleYouTubeLiveDetect(delayMs) {
  if (!window.location.hostname.includes('youtube.com')) return;
  setTimeout(() => {
    try {
      youTubeLiveState = isLiveStream();   // ← dùng isLiveStream mới (của File 2)
      console.log(`Log: YouTube live state (delayed ${delayMs}ms) = ${youTubeLiveState}`);
      // Cập nhật lại phần hiển thị phụ thuộc live state
      updateTimeRemaining();
      const video = document.querySelector('video');
      if (video) checkLiveCatchUp(video);
    } catch (e) {
      youTubeLiveState = false;
    }
  }, Math.max(0, Number(delayMs) || 0));
}

function updateSpeed(speed) {
  const video = document.querySelector('video');
  if (video) {
    video.playbackRate = speed;
    currentSpeed = speed;
    updateSpeedIndicator();
    checkLiveCatchUp(video);
  } else {
    console.log('Log: Không tìm thấy video để cập nhật tốc độ');
  }
}

function updateSpeedIndicator() {
  let speedIndicator = document.getElementById('speed-indicator');
  const isYouTube = window.location.hostname.includes('youtube.com');

  // Tạo speed indicator nếu chưa có
  if (!speedIndicator) {
    speedIndicator = document.createElement('div');
    speedIndicator.id = 'speed-indicator';

    const speedText = document.createElement('span');
    speedText.id = 'speed-text';

    const timeRemaining = document.createElement('span');
    timeRemaining.id = 'time-remaining';

    const controls = document.createElement('div');
    controls.className = 'controls';

    const decreaseBtn = document.createElement('button');
    decreaseBtn.textContent = '<';
    decreaseBtn.onclick = () => updateSpeed(Math.max(0.25, currentSpeed - 0.25));

    const increaseBtn = document.createElement('button');
    increaseBtn.textContent = '>';
    increaseBtn.onclick = () => updateSpeed(currentSpeed + 0.25);

    controls.appendChild(decreaseBtn);
    controls.appendChild(increaseBtn);
    speedIndicator.appendChild(speedText);
    speedIndicator.appendChild(timeRemaining);
    speedIndicator.appendChild(controls);

    // Luôn append vào body để đơn giản
    document.body.appendChild(speedIndicator);

    speedText.onclick = (e) => {
      e.stopPropagation();
      const newSpeed = currentSpeed === 1 ? lastSpeed : 1;
      lastSpeed = currentSpeed;
      updateSpeed(newSpeed);
    };

    console.log('Log: Tạo mới speed-indicator');
  }

  // Cập nhật nội dung
  const speedText = speedIndicator.querySelector('#speed-text');
  if (speedText) {
    speedText.textContent = `${currentSpeed.toFixed(2)}x`;
    updateTimeRemaining();
  }
  
  // Cập nhật vị trí
  updateSpeedIndicatorPosition();
  
  return true;
}

function updateTimeRemaining() {
  const video = document.querySelector('video');
  const timeRemaining = document.getElementById('time-remaining');
  const live = isLiveStream(video);
  if (video && timeRemaining && !live) {
    const remaining = video.duration - video.currentTime;
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = Math.floor(remaining % 60);
    
    if (hours > 0) {
      timeRemaining.textContent = `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      timeRemaining.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  } else if (timeRemaining) {
    timeRemaining.textContent = ''; // Ẩn nếu là livestream
  }
}

function updateSpeedIndicatorPosition() {
  const speedIndicator = document.getElementById('speed-indicator');
  if (!speedIndicator) return;

  const isYouTube = window.location.hostname.includes('youtube.com');

  speedIndicator.style.display = 'flex';
  speedIndicator.style.visibility = 'visible';
  speedIndicator.style.opacity = '1';
  speedIndicator.style.zIndex = '99999';

  if (isYouTube) {
    speedIndicator.classList.remove('non-youtube');
    
    if (document.fullscreenElement) {
      speedIndicator.classList.remove('youtube-header');
      speedIndicator.classList.add('fullscreen');
    } else {
      speedIndicator.classList.remove('fullscreen');
      speedIndicator.classList.add('youtube-header');
      
      const logoElement = findYouTubeLogo();
      if (logoElement) {
        const logoRect = logoElement.getBoundingClientRect();
        speedIndicator.style.left = `${logoRect.right + 20}px`;
        speedIndicator.style.top = `${logoRect.top + (logoRect.height - speedIndicator.offsetHeight) / 2}px`;
      }
    }
  } else {
    speedIndicator.classList.add('non-youtube');
    speedIndicator.classList.remove('youtube-header', 'fullscreen');
    
    const video = document.querySelector('video');
    if (video && video.parentElement) {
      video.parentElement.style.position = 'relative';
      speedIndicator.style.position = 'absolute';
      speedIndicator.style.left = '10px';
      speedIndicator.style.top = '10px';
    }
  }
}

function checkLiveCatchUp(video) {
  if (currentSpeed <= 1) return;

  const isLive = isLiveStream(video);
  if (!isLive) return;

  const buffered = video.buffered;
  if (buffered.length > 0) {
    const bufferedEnd = buffered.end(buffered.length - 1);
    const currentTime = video.currentTime;
    const timeToEnd = bufferedEnd - currentTime;

    if (timeToEnd < 3) {
      console.log('Log: Livestream bắt kịp real-time, chuyển tốc độ về 1');
      updateSpeed(1);
    }
  }

  video.addEventListener('timeupdate', function handler() {
    const bufferedEnd = video.buffered.end(video.buffered.length - 1);
    const timeToEnd = bufferedEnd - video.currentTime;
    if (currentSpeed > 1 && timeToEnd < 3) {
      console.log('Log: Livestream bắt kịp real-time (timeupdate), chuyển tốc độ về 1');
      updateSpeed(1);
      video.removeEventListener('timeupdate', handler);
    }
  });
}

document.addEventListener('keydown', (e) => {
  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable) {
    return;
  }

  const video = document.querySelector('video');
  if (!video) {
    console.log('Log: Không tìm thấy video khi nhấn phím');
    return;
  }

  if (e.key === ']') {
    updateSpeed(currentSpeed + 0.25);
  } else if (e.key === '[') {
    updateSpeed(Math.max(0.25, currentSpeed - 0.25));
  } else if (e.key === '\\') {
    const newSpeed = currentSpeed === 1 ? lastSpeed : 1;
    lastSpeed = currentSpeed;
    updateSpeed(newSpeed);
  }
});

function monitorVideoChange() {
  const video = document.querySelector('video');
  if (!video) {
    console.log('Log: Không tìm thấy video khi theo dõi');
    setTimeout(monitorVideoChange, 1000);
    return;
  }

  console.log('Log: Bắt đầu theo dõi thay đổi video');

  video.addEventListener('loadedmetadata', () => {
    const currentSrc = video.currentSrc || window.location.href;
    if (currentSrc !== lastVideoSrc) {
      console.log(`Log: Video thay đổi (loadedmetadata) - Nguồn mới: ${currentSrc}`);
      lastVideoSrc = currentSrc;
      if (window.location.hostname.includes('youtube.com')) {
        scheduleYouTubeLiveDetect(500);
      }
      setTimeout(() => {
        updateSpeed(1);
        checkLiveCatchUp(video);
        updateSpeedIndicatorPosition();
      }, 2000);
    }
  });

  video.addEventListener('timeupdate', () => {
    updateTimeRemaining();
  });
}

let speedIndicatorInitialized = false;
let initializationInterval = null;
let backupInterval = null;

function findYouTubeLogo() {
  const logoSelectors = [
    '#logo',
    '#youtube-logo', 
    '.ytd-logo',
    'ytd-logo',
    'a[href="/"]',
    '[class*="logo"]',
    'ytd-topbar-logo-renderer',
    '#masthead-container a[href="/"]',
    'ytd-masthead a[href="/"]'
  ];
  
  for (const selector of logoSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        console.log(`Log: Tìm thấy YouTube logo với selector: ${selector}`);
        return element;
      }
    }
  }
  
  console.log('Log: Không tìm thấy YouTube logo');
  return null;
}

function initializeSpeedIndicator() {
  if (speedIndicatorInitialized) return;

  console.log('Log: Khởi tạo speed indicator');
  updateSpeedIndicator();
  updateSpeed(1);
  
  const createdIndicator = document.getElementById('speed-indicator');
  if (createdIndicator) {
    console.log('Log: Speed indicator đã được tạo thành công');
    speedIndicatorInitialized = true;
    
    if (initializationInterval) {
      clearInterval(initializationInterval);
      initializationInterval = null;
    }
    if (backupInterval) {
      clearInterval(backupInterval);
      backupInterval = null;
    }
  }
}

function startSpeedIndicatorInitialization() {
  if (speedIndicatorInitialized) return;

  console.log('Log: Bắt đầu khởi tạo speed indicator');
  initializeSpeedIndicator();
  
  if (!speedIndicatorInitialized) {
    initializationInterval = setInterval(() => {
      if (speedIndicatorInitialized) {
        clearInterval(initializationInterval);
        initializationInterval = null;
        return;
      }
      initializeSpeedIndicator();
    }, 1000);
    
    setTimeout(() => {
      if (initializationInterval) {
        clearInterval(initializationInterval);
        initializationInterval = null;
      }
    }, 10000);
  }
}

function initializeOnDOMReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOnDOMReady);
    return;
  }
  
  console.log('Log: DOM ready, bắt đầu khởi tạo');
  startSpeedIndicatorInitialization();
}

window.addEventListener('load', () => {
  console.log('Log: Trang tải xong, khởi tạo tốc độ ban đầu');
  if (window.location.hostname.includes('youtube.com')) {
    scheduleYouTubeLiveDetect(500);
  }
  
  startSpeedIndicatorInitialization();
  
  lastVideoSrc = document.querySelector('video')?.currentSrc || window.location.href;
  monitorVideoChange();
});

initializeOnDOMReady();

backupInterval = setInterval(() => {
  const existingIndicator = document.getElementById('speed-indicator');
  if (!existingIndicator) {
    console.log('Log: Backup: Tạo lại speed indicator');
    speedIndicatorInitialized = false;
    startSpeedIndicatorInitialization();
  }
}, 5000);

document.addEventListener('fullscreenchange', updateSpeedIndicatorPosition);

window.addEventListener('resize', updateSpeedIndicatorPosition);

let scrollTimeout = null;
window.addEventListener('scroll', () => {
  const speedIndicator = document.getElementById('speed-indicator');
  if (speedIndicator && !document.fullscreenElement && speedIndicator.classList.contains('youtube-header')) {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      updateSpeedIndicatorPosition();
    }, 16);
  }
});

const observer = new MutationObserver(() => {
  const video = document.querySelector('video');
  if (video && !video.dataset.speedMonitored) {
    video.dataset.speedMonitored = 'true';
    console.log('Log: Phát hiện video mới trong DOM');
    monitorVideoChange();
    updateSpeedIndicatorPosition();
    
    speedIndicatorInitialized = false;
    
    if (!backupInterval) {
      backupInterval = setInterval(() => {
        const existingIndicator = document.getElementById('speed-indicator');
        if (!existingIndicator && !speedIndicatorInitialized) {
          console.log('Log: Backup cuối cùng: Tạo speed indicator (kiểm tra mỗi 5s)');
          speedIndicatorInitialized = false;
          startSpeedIndicatorInitialization();
        }
      }, 5000);
    }
    
    setTimeout(() => {
      startSpeedIndicatorInitialization();
    }, 100);
  }
});
observer.observe(document.body, { childList: true, subtree: true });
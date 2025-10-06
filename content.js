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

// Helper: xác định có phải livestream không (YouTube dùng nhãn LIVE, trang khác fallback duration)
function isLiveStream(video) {
  const isYouTube = window.location.hostname.includes('youtube.com');
  if (isYouTube) return !!youTubeLiveState;
  // Với non-YouTube, giữ nguyên fallback cũ để không ảnh hưởng trang khác
  return !!video && video.duration === Infinity;
}

// Đợi một chút để badge LIVE render rồi mới đọc, sau đó cập nhật UI liên quan
function scheduleYouTubeLiveDetect(delayMs) {
  if (!window.location.hostname.includes('youtube.com')) return;
  setTimeout(() => {
    try {
      youTubeLiveState = isLiveLabelVisibleOnControls();
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
  const video = document.querySelector('video');
  const videoParent = video ? video.parentElement : null;

  if (!speedIndicator && videoParent) {
    speedIndicator = document.createElement('div');
    speedIndicator.id = 'speed-indicator';

    const speedText = document.createElement('span');
    speedText.id = 'speed-text';

    // Thêm phần tử hiển thị thời gian còn lại
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
    speedIndicator.appendChild(timeRemaining); // Thêm timeRemaining
    speedIndicator.appendChild(controls);

    if (!isYouTube) {
      speedIndicator.classList.add('non-youtube');
      videoParent.style.position = 'relative';
      videoParent.appendChild(speedIndicator);
    } else {
      document.body.appendChild(speedIndicator);
    }

    speedText.onclick = (e) => {
      e.stopPropagation();
      const newSpeed = currentSpeed === 1 ? lastSpeed : 1;
      lastSpeed = currentSpeed;
      updateSpeed(newSpeed);
      console.log(`Log: Toggle tốc độ từ ${currentSpeed.toFixed(2)}x sang ${newSpeed.toFixed(2)}`);
    };

    console.log('Log: Tạo mới speed-indicator');
  }

  if (speedIndicator) {
    const speedText = speedIndicator.querySelector('#speed-text');
    speedText.textContent = `${currentSpeed.toFixed(2)}x`;
    updateTimeRemaining(); // Cập nhật thời gian còn lại
    updateSpeedIndicatorPosition();
    console.log(`Log: Cập nhật speed-indicator với tốc độ: ${currentSpeed.toFixed(2)}`);
  }
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
      // Hiển thị giờ:phút:giây nếu có giờ
      timeRemaining.textContent = `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      // Chỉ hiển thị phút:giây nếu không có giờ
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

  if (isYouTube) {
    speedIndicator.classList.remove('non-youtube');
    if (document.fullscreenElement) {
      speedIndicator.classList.add('fullscreen');
      speedIndicator.style.display = 'flex';
    } else {
      speedIndicator.classList.remove('fullscreen');
      const video = document.querySelector('video');
      if (video) {
        const videoRect = video.getBoundingClientRect();
        const parent = video.parentElement;
        const parentRect = parent.getBoundingClientRect();
        speedIndicator.style.position = 'absolute';
        speedIndicator.style.left = `${parentRect.left}px`;
        speedIndicator.style.top = `${parentRect.top - speedIndicator.offsetHeight}px`;
        speedIndicator.style.display = 'flex';
      }
    }
  } else {
    // Non-YouTube: Luôn hiển thị bên trong khung video, top-left 10px
    speedIndicator.classList.add('non-youtube');
    speedIndicator.style.position = 'absolute';
    speedIndicator.style.left = '10px';
    speedIndicator.style.top = '10px';
    speedIndicator.style.display = 'flex';
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

    if (timeToEnd < 2) {
      console.log('Log: Livestream bắt kịp real-time, chuyển tốc độ về 1');
      updateSpeed(1);
    }
  }

  video.addEventListener('timeupdate', function handler() {
    const bufferedEnd = video.buffered.end(video.buffered.length - 1);
    const timeToEnd = bufferedEnd - video.currentTime;
    if (currentSpeed > 1 && timeToEnd < 2) {
      console.log('Log: Livestream bắt kịp real-time (timeupdate), chuyển tốc độ về 1');
      updateSpeed(1);
      video.removeEventListener('timeupdate', handler);
    }
  });
}

document.addEventListener('keydown', (e) => {
  // Kiểm tra nếu phần tử đang focus là input hoặc textarea
  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable) {
    return; // Không xử lý phím nếu đang nhập text
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
      // Khi đổi link/video: xác định lại livestream sau 500ms cho YouTube
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

  // Cập nhật thời gian còn lại mỗi khi video chạy
  video.addEventListener('timeupdate', () => {
    updateTimeRemaining();
  });
}

window.addEventListener('load', () => {
  console.log('Log: Trang tải xong, khởi tạo tốc độ ban đầu');
  // Xác định livestream cho YouTube đúng một lần khi vào trang
  if (window.location.hostname.includes('youtube.com')) {
    // Đợi 500ms để badge LIVE render rồi mới đọc
    scheduleYouTubeLiveDetect(500);
  }
  updateSpeed(1);
  lastVideoSrc = document.querySelector('video')?.currentSrc || window.location.href;
  monitorVideoChange();
});

document.addEventListener('fullscreenchange', updateSpeedIndicatorPosition);

window.addEventListener('resize', updateSpeedIndicatorPosition);

const observer = new MutationObserver(() => {
  const video = document.querySelector('video');
  if (video && !video.dataset.speedMonitored) {
    video.dataset.speedMonitored = 'true';
    console.log('Log: Phát hiện video mới trong DOM');
    monitorVideoChange();
    updateSpeedIndicatorPosition();
  }
});
observer.observe(document.body, { childList: true, subtree: true });
let currentSpeed = 1;
let lastSpeed = 1;
let lastVideoSrc = '';

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

function updateSpeedIndicatorPosition() {
  const speedIndicator = document.getElementById('speed-indicator');
  if (!speedIndicator) return;

  const isYouTube = window.location.hostname.includes('youtube.com');

  if (document.fullscreenElement) {
    speedIndicator.classList.add('fullscreen');
    speedIndicator.style.position = 'fixed';
    speedIndicator.style.left = '10px';
    speedIndicator.style.top = '10px';
    // Giữ class non-youtube nếu không phải YouTube để áp dụng kiểu nền đỏ
    if (!isYouTube) {
      speedIndicator.classList.add('non-youtube');
    } else {
      speedIndicator.classList.remove('non-youtube');
    }
    return;
  }

  speedIndicator.classList.remove('fullscreen');
  if (isYouTube) {
    // Logic hiện tại cho YouTube
    speedIndicator.classList.remove('non-youtube');
    const video = document.querySelector('video');
    if (video) {
      const videoRect = video.getBoundingClientRect();
      const parent = video.parentElement;
      const parentRect = parent.getBoundingClientRect();
      speedIndicator.style.position = 'absolute';
      speedIndicator.style.left = `${parentRect.left}px`;
      speedIndicator.style.top = `${parentRect.top - speedIndicator.offsetHeight}px`;
    }
  } else {
    // Cố định cho non-YouTube
    speedIndicator.classList.add('non-youtube');
    speedIndicator.style.position = 'fixed';
    speedIndicator.style.left = '10px';
    speedIndicator.style.top = '10px';
  }
}

function updateSpeedIndicator() {
  let speedIndicator = document.getElementById('speed-indicator');
  if (!speedIndicator) {
    speedIndicator = document.createElement('div');
    speedIndicator.id = 'speed-indicator';
    
    const speedText = document.createElement('span');
    speedText.id = 'speed-text';
    
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
    speedIndicator.appendChild(controls);
    document.body.appendChild(speedIndicator);
    
    speedText.onclick = (e) => {
      e.stopPropagation();
      const newSpeed = currentSpeed === 1 ? lastSpeed : 1;
      lastSpeed = currentSpeed;
      updateSpeed(newSpeed);
      console.log(`Log: Toggle tốc độ từ ${currentSpeed.toFixed(2)}x sang ${newSpeed.toFixed(2)}`);
    };
    
    console.log('Log: Tạo mới speed-indicator');
  }
  
  const speedText = speedIndicator.querySelector('#speed-text');
  speedText.textContent = `${currentSpeed.toFixed(2)}`;
  updateSpeedIndicatorPosition();
  console.log(`Log: Cập nhật speed-indicator với tốc độ: ${currentSpeed.toFixed(2)}`);
}

function checkLiveCatchUp(video) {
  if (currentSpeed <= 1) return;

  const isLive = video.duration === Infinity || video.duration > 3600;
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

function toggleFullscreenClass() {
  updateSpeedIndicatorPosition();
}

document.addEventListener('keydown', (e) => {
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
      updateSpeed(1);
      checkLiveCatchUp(video);
      updateSpeedIndicatorPosition();
    }
  });
}

window.addEventListener('load', () => {
  console.log('Log: Trang tải xong, khởi tạo tốc độ ban đầu');
  updateSpeed(1);
  lastVideoSrc = document.querySelector('video')?.currentSrc || window.location.href;
  monitorVideoChange();
});

document.addEventListener('fullscreenchange', toggleFullscreenClass);
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
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
  if (video && timeRemaining && video.duration !== Infinity) {
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

  const isLive = video.duration === Infinity;
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
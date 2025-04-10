let currentSpeed = 1;
let lastSpeed = 1;
let lastVideoSrc = '';

function updateSpeed(speed) {
  const video = document.querySelector('video');
  if (video) {
    video.playbackRate = speed;
    currentSpeed = speed;
    updateSpeedIndicator();
    checkLiveCatchUp(video); // Kiểm tra ngay sau khi thay đổi tốc độ
  } else {
    console.log('Log: Không tìm thấy video để cập nhật tốc độ');
  }
}

function updateSpeedIndicator() {
  let speedIndicator = document.getElementById('speed-indicator');
  if (!speedIndicator) {
    speedIndicator = document.createElement('div');
    speedIndicator.id = 'speed-indicator';
    document.body.appendChild(speedIndicator);
    console.log('Log: Tạo mới speed-indicator');
  }
  speedIndicator.textContent = `${currentSpeed.toFixed(2)}x`;
  console.log(`Log: Cập nhật speed-indicator với tốc độ: ${currentSpeed.toFixed(2)}x`);
}

// Kiểm tra livestream bắt kịp real-time
function checkLiveCatchUp(video) {
  if (currentSpeed <= 1) return; // Không cần kiểm tra nếu tốc độ <= 1

  // Livestream thường có duration là Infinity hoặc rất lớn
  const isLive = video.duration === Infinity || video.duration > 3600; // Giả định live nếu > 1 giờ
  if (!isLive) return;

  // Kiểm tra nếu gần real-time
  const buffered = video.buffered;
  if (buffered.length > 0) {
    const bufferedEnd = buffered.end(buffered.length - 1); // Điểm cuối của buffer
    const currentTime = video.currentTime;
    const timeToEnd = bufferedEnd - currentTime;

    // Nếu còn dưới 2 giây để bắt kịp (có thể điều chỉnh)
    if (timeToEnd < 2) {
      console.log('Log: Livestream bắt kịp real-time, chuyển tốc độ về 1');
      updateSpeed(1);
    }
  }

  // Tiếp tục kiểm tra trong lúc phát
  video.addEventListener('timeupdate', function handler() {
    const bufferedEnd = video.buffered.end(video.buffered.length - 1);
    const timeToEnd = bufferedEnd - video.currentTime;
    if (currentSpeed > 1 && timeToEnd < 2) {
      console.log('Log: Livestream bắt kịp real-time (timeupdate), chuyển tốc độ về 1');
      updateSpeed(1);
      video.removeEventListener('timeupdate', handler); // Ngừng kiểm tra sau khi về 1
    }
  });
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
      checkLiveCatchUp(video); // Kiểm tra livestream ngay khi video mới tải
    }
  });
}

window.addEventListener('load', () => {
  console.log('Log: Trang tải xong, khởi tạo tốc độ ban đầu');
  updateSpeed(1);
  lastVideoSrc = document.querySelector('video')?.currentSrc || window.location.href;
  monitorVideoChange();
});

const observer = new MutationObserver(() => {
  const video = document.querySelector('video');
  if (video && !video.dataset.speedMonitored) {
    video.dataset.speedMonitored = 'true';
    console.log('Log: Phát hiện video mới trong DOM');
    monitorVideoChange();
  }
});
observer.observe(document.body, { childList: true, subtree: true });
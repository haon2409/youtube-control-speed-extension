let currentSpeed = 1;
let lastSpeed = 1;
let lastVideoSrc = ''; // Theo dõi nguồn video thay vì URL trang

function updateSpeed(speed) {
  const video = document.querySelector('video');
  if (video) {
    video.playbackRate = speed;
    currentSpeed = speed;
    updateSpeedIndicator();
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

// Theo dõi thay đổi video qua loadedmetadata
function monitorVideoChange() {
  const video = document.querySelector('video');
  if (!video) {
    console.log('Log: Không tìm thấy video khi theo dõi');
    // Thử lại sau nếu video chưa tải
    setTimeout(monitorVideoChange, 1000);
    return;
  }

  console.log('Log: Bắt đầu theo dõi thay đổi video');

  video.addEventListener('loadedmetadata', () => {
    const currentSrc = video.currentSrc || window.location.href; // Dùng currentSrc nếu có
    if (currentSrc !== lastVideoSrc) {
      console.log(`Log: Video thay đổi (loadedmetadata) - Nguồn mới: ${currentSrc}`);
      lastVideoSrc = currentSrc;
      updateSpeed(1); // Reset tốc độ
    }
  });
}

// Khởi tạo
window.addEventListener('load', () => {
  console.log('Log: Trang tải xong, khởi tạo tốc độ ban đầu');
  updateSpeed(1);
  lastVideoSrc = document.querySelector('video')?.currentSrc || window.location.href;
  monitorVideoChange();
});

// Theo dõi video động (nếu được thêm vào sau)
const observer = new MutationObserver(() => {
  const video = document.querySelector('video');
  if (video && !video.dataset.speedMonitored) {
    video.dataset.speedMonitored = 'true'; // Đánh dấu để tránh lặp
    console.log('Log: Phát hiện video mới trong DOM');
    monitorVideoChange();
  }
});
observer.observe(document.body, { childList: true, subtree: true });
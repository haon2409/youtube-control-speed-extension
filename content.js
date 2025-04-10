let currentSpeed = 1;
let lastSpeed = 1;

function updateSpeed(speed) {
  const video = document.querySelector('video');
  if (video) {
    video.playbackRate = speed;
    currentSpeed = speed;
    updateSpeedDisplay();
    if (document.fullscreenElement) updateSpeedEffect(speed); // Cập nhật hiệu ứng khi fullscreen
  }
}

function updateSpeedDisplay() {
  let speedDisplay = document.getElementById('speed-display');
  if (!speedDisplay) {
    speedDisplay = document.createElement('div');
    speedDisplay.id = 'speed-display';
    document.body.appendChild(speedDisplay);
  }

  const playButton = document.querySelector('.ytp-play-button');
  if (playButton && playButton.parentNode) {
    playButton.parentNode.insertBefore(speedDisplay, playButton);
  }

  speedDisplay.textContent = `${currentSpeed.toFixed(2)}x`;
}

function updateSpeedEffect(speed) {
  let effectDisplay = document.getElementById('speed-effect');
  if (!effectDisplay) {
    effectDisplay = document.createElement('div');
    effectDisplay.id = 'speed-effect';
    document.body.appendChild(effectDisplay);
  }
  effectDisplay.textContent = `${speed.toFixed(2)}x`; // Luôn cập nhật tốc độ
}

// Theo dõi fullscreen để hiển thị/xóa hiệu ứng
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    updateSpeedEffect(currentSpeed); // Hiển thị khi vào fullscreen
  } else {
    const effectDisplay = document.getElementById('speed-effect');
    if (effectDisplay) effectDisplay.remove(); // Xóa khi thoát fullscreen
  }
});

document.addEventListener('keydown', (e) => {
  const video = document.querySelector('video');
  if (!video) return;

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

window.addEventListener('load', () => updateSpeed(1));
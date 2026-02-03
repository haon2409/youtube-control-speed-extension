(function() {
    'use strict';
  
    let currentSpeed = 1, lastSpeed = 1, lastVideoId = null, youTubeLiveState = false, isInitialized = false, initInterval = null;
    let indicator = null;
    let timeUpdateInterval = null; // Biến quản lý bộ đếm thời gian
  
    function isLiveStream() {
        return !!document.querySelector('.ytp-live-badge[aria-disabled="false"], .ytp-live, yt-live-chat-renderer');
    }
  
    function scheduleYouTubeLiveDetect(delayMs) {
        setTimeout(() => {
            youTubeLiveState = isLiveStream();
            updateTimeRemaining();
            const video = document.querySelector('video');
            if (video) checkLiveCatchUp(video);
        }, Math.max(0, Number(delayMs) || 0));
    }
  
    function updateSpeed(speed) {
        const video = document.querySelector('video');
        if (!video) return;
        video.playbackRate = speed;
        currentSpeed = speed;
        updateSpeedIndicator();
        checkLiveCatchUp(video);
    }
  
    function createIndicator() {
        if (indicator) return;
        indicator = document.createElement('div');
        indicator.id = 'speed-indicator';
        indicator.classList.add('time-short');
  
        const speedText = document.createElement('span');
        speedText.id = 'speed-text';
        speedText.onclick = e => {
            e.stopPropagation();
            const newSpeed = currentSpeed === 1 ? lastSpeed : 1;
            lastSpeed = currentSpeed;
            updateSpeed(newSpeed);
        };
  
        const timeRemaining = document.createElement('span');
        timeRemaining.id = 'time-remaining';
  
        const controls = document.createElement('div');
        controls.className = 'controls';
  
        const dec = document.createElement('button');
        dec.textContent = '<';
        dec.onclick = () => updateSpeed(Math.max(0.25, currentSpeed - 0.25));
  
        const inc = document.createElement('button');
        inc.textContent = '>';
        inc.onclick = () => updateSpeed(currentSpeed + 0.25);
  
        controls.append(dec, inc);
        indicator.append(speedText, timeRemaining, controls);
  
        const style = document.createElement('style');
        style.textContent = `
            #speed-indicator {all:unset!important;position:fixed!important;top:45px!important;left:20px!important;z-index:2147483647!important;background:rgba(40,40,40,.9)!important;color:#fff!important;padding:6px 12px!important;border-radius:8px!important;font-family:sans-serif!important;font-size:14px!important;display:flex!important;align-items:center!important;gap:10px!important;box-shadow:0 4px 15px rgba(0,0,0,.5)!important;backdrop-filter:blur(5px)!important;cursor:move!important;visibility:visible!important;opacity:1!important;}
            #speed-indicator .controls {display:flex!important;gap:5px!important;}
            #speed-indicator button {all:unset!important;background:#555!important;width:26px!important;height:22px!important;text-align:center!important;border-radius:4px!important;cursor:pointer!important;font-weight:bold!important;}
            #speed-indicator button:hover {background:#888!important;}
            #time-remaining {font-variant-numeric:tabular-nums!important;display:inline-block!important;text-align:right!important;}
            #speed-indicator.time-short #time-remaining {min-width:5ch!important;}
            #speed-indicator.time-long #time-remaining {min-width:8ch!important;}
        `;
        document.head.appendChild(style);
    }
  
    function updateSpeedIndicator() {
        createIndicator();
        if (!indicator.parentElement) document.body.appendChild(indicator);
        indicator.querySelector('#speed-text').textContent = `${currentSpeed.toFixed(2)}x`;
        updateTimeRemaining();
    }
  
    function updateTimeRemaining() {
        const el = document.getElementById('time-remaining');
        if (!el) return;
        const video = document.querySelector('video');
        if (!video || youTubeLiveState) return el.textContent = '';
        const remain = (video.duration - video.currentTime) / video.playbackRate; // Đã tính theo tốc độ đang phát
        if (!isFinite(remain) || remain <= 0) return el.textContent = '';
        const m = Math.floor(remain / 60), s = Math.floor(remain % 60);
        if (m < 60) {
            indicator?.classList.add('time-short');
            indicator?.classList.remove('time-long');
            el.textContent = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        } else {
            indicator?.classList.add('time-long');
            indicator?.classList.remove('time-short');
            const h = Math.floor(m / 60);
            el.textContent = `${h.toString().padStart(2,'0')}:${(m%60).toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        }
    }
  
    function checkLiveCatchUp(video) {
        if (currentSpeed <= 1 || !youTubeLiveState) return;
        const handler = () => {
            if (video.buffered.length && video.buffered.end(video.buffered.length - 1) - video.currentTime < 3) {
                updateSpeed(1);
                video.removeEventListener('timeupdate', handler);
            }
        };
        video.addEventListener('timeupdate', handler);
    }
  
    function initializeCurrentVideo() {
        const video = document.querySelector('video');
        if (!video || isInitialized) return;
        isInitialized = true;
        updateSpeed(1);

        // Tối ưu mục 4: Dùng Interval thay vì Event Listener liên tục
        if (timeUpdateInterval) clearInterval(timeUpdateInterval);
        timeUpdateInterval = setInterval(() => {
            if (!youTubeLiveState) updateTimeRemaining();
        }, 1000);

        if (initInterval) clearInterval(initInterval);
    }
  
    function handleFullscreenChange() {
        if (!indicator) return;
        const fsElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
        if (fsElement && fsElement !== document.body && !fsElement.contains(indicator)) {
            fsElement.appendChild(indicator);
        } else if (!fsElement && indicator.parentElement !== document.body) {
            document.body.appendChild(indicator);
        }
    }
  
    function runLogicOnce() {
        if (timeUpdateInterval) clearInterval(timeUpdateInterval);
        const isYouTube = /youtube\.com|youtu\.be/.test(location.hostname);
        if (isYouTube) {
            const vid = new URLSearchParams(location.search).get('v');
            if (!vid || vid === lastVideoId) return;
            lastVideoId = vid;
            isInitialized = false;
        } else if (isInitialized) return;
        scheduleYouTubeLiveDetect(600);
        setTimeout(initializeCurrentVideo, isYouTube ? 800 : 1000);
        if (!isYouTube && !document.querySelector('video')) {
            if (initInterval) clearInterval(initInterval);
            initInterval = setInterval(() => document.querySelector('video') && initializeCurrentVideo(), 500);
        }
    }
  
    document.addEventListener('keydown', e => {
        if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return;
        if (e.key === ']') updateSpeed(currentSpeed + 0.25);
        else if (e.key === '[') updateSpeed(Math.max(0.25, currentSpeed - 0.25));
        else if (e.key === '\\') {
            const ns = currentSpeed === 1 ? lastSpeed : 1;
            lastSpeed = currentSpeed;
            updateSpeed(ns);
        }
    });
  
    ['fullscreenchange', 'mozfullscreenchange', 'webkitfullscreenchange', 'MSFullscreenChange'].forEach(event => {
        document.addEventListener(event, handleFullscreenChange);
    });
  
    runLogicOnce();
    window.addEventListener('yt-navigate-finish', runLogicOnce);
    window.addEventListener('popstate', runLogicOnce);
})();

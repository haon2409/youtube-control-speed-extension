(function() {
    'use strict';

    const currentDomain = window.location.hostname;
    const isYouTube = /youtube\.com|youtu\.be/.test(currentDomain);

    chrome.storage.sync.get([currentDomain], (result) => {
        const isEnabled = result[currentDomain] || false;
        if (isEnabled) {
            initExtension();
        }
    });

    function initExtension() {
        let currentSpeed = 1, lastSpeed = 1, lastVideoId = null, youTubeLiveState = false, isInitialized = false, initInterval = null;
        let indicator = null;
        let timeUpdateInterval = null;

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
            
            if (!isYouTube) {
                indicator.classList.add('non-youtube');
            }

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
            // Cập nhật SVG trực quan cho nút Giảm
            dec.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" width="18" height="18"><path d="M200-440v-80h560v80H200Z"/></svg>`;
            dec.onclick = () => updateSpeed(Math.max(0.25, currentSpeed - 0.25));

            const inc = document.createElement('button');
            // Cập nhật SVG trực quan cho nút Tăng
            inc.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" width="18" height="18"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>`;
            inc.onclick = () => updateSpeed(currentSpeed + 0.25);

            controls.append(dec, inc);
            indicator.append(speedText, timeRemaining, controls);
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
            if (!video || youTubeLiveState) {
                el.textContent = '';
                indicator?.classList.add('time-empty');
                return;
            }
            const remain = (video.duration - video.currentTime) / video.playbackRate;
            if (!isFinite(remain) || remain <= 0) {
                el.textContent = '';
                indicator?.classList.add('time-empty');
                return;
            }
            const m = Math.floor(remain / 60), s = Math.floor(remain % 60);
            indicator?.classList.remove('time-empty');
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

            if (timeUpdateInterval) clearInterval(timeUpdateInterval);
            timeUpdateInterval = setInterval(() => {
                if (!youTubeLiveState) updateTimeRemaining();
            }, 1000);

            if (initInterval) clearInterval(initInterval);
        }

        function handleFullscreenChange() {
            if (!indicator) return;
            const fsElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
            
            if (fsElement) {
                indicator.classList.add('fullscreen');
            } else {
                indicator.classList.remove('fullscreen');
            }

            if (fsElement && fsElement !== document.body && !fsElement.contains(indicator)) {
                fsElement.appendChild(indicator);
            } else if (!fsElement && indicator.parentElement !== document.body) {
                document.body.appendChild(indicator);
            }
        }

        function runLogicOnce() {
            if (timeUpdateInterval) clearInterval(timeUpdateInterval);
            
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
                
                let attempts = 0;
                const maxAttempts = 20; 
                
                initInterval = setInterval(() => {
                    attempts++;
                    if (document.querySelector('video')) {
                        initializeCurrentVideo();
                    } else if (attempts >= maxAttempts) {
                        clearInterval(initInterval);
                    }
                }, 500);
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
    }
})();
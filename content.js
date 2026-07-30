(function() {
    'use strict';

    const currentDomain = window.location.hostname;
    const isYouTube = /youtube\.com|youtu\.be/.test(currentDomain);

    chrome.storage.sync.get([currentDomain], (result) => {
        if (result[currentDomain]) {
            initExtension();
        }
    });

    function initExtension() {
        let currentSpeed = 1, lastSpeed = 1, lastVideoId = null, youTubeLiveState = false, isInitialized = false, initInterval = null;
        let indicator = null;
        let timeUpdateInterval = null;
        let activeCatchUpHandler = null; // Quản lý listener để tránh rò rỉ bộ nhớ

        function isLiveStream() {
            return !!document.querySelector('.ytp-live-badge[aria-disabled="false"], .ytp-live, yt-live-chat-renderer');
        }

        function scheduleYouTubeLiveDetect(delayMs) {
            setTimeout(() => {
                youTubeLiveState = isLiveStream();
                updateTimeRemaining();
                const video = document.querySelector('video');
                if (video) checkLiveCatchUp(video);
            }, delayMs || 0);
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
            dec.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
            dec.onclick = () => updateSpeed(Math.max(0.25, currentSpeed - 0.25));

            const inc = document.createElement('button');
            inc.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;
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
            // Hủy listener cũ trước khi tạo listener mới
            if (activeCatchUpHandler) {
                video.removeEventListener('timeupdate', activeCatchUpHandler);
                activeCatchUpHandler = null;
            }
            if (currentSpeed <= 1 || !youTubeLiveState) return;

            activeCatchUpHandler = () => {
                if (video.buffered.length && video.buffered.end(video.buffered.length - 1) - video.currentTime < 3) {
                    updateSpeed(1);
                    video.removeEventListener('timeupdate', activeCatchUpHandler);
                    activeCatchUpHandler = null;
                }
            };
            video.addEventListener('timeupdate', activeCatchUpHandler);
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
            const fsElement = document.fullscreenElement;
            
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

        // --- EVENT LISTENERS ---
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

        document.addEventListener('fullscreenchange', handleFullscreenChange);

        runLogicOnce();
        window.addEventListener('yt-navigate-finish', runLogicOnce);
        window.addEventListener('popstate', runLogicOnce);
    }
})();
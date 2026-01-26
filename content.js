(function() {
    'use strict';
  
    let currentSpeed = 1;
    let lastSpeed = 1;
    let lastVideoId = null;
    let youTubeLiveState = false;
    let isInitialized = false;
    let initInterval = null;
  
    function isLiveStream() {
        return !!document.querySelector(
            '.ytp-live-badge[aria-disabled="false"], .ytp-live, yt-live-chat-renderer'
        );
    }
  
    function scheduleYouTubeLiveDetect(delayMs) {
        setTimeout(() => {
            try {
                youTubeLiveState = isLiveStream();
                console.log(`Live state updated after ${delayMs}ms: ${youTubeLiveState}`);
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
        if (!video) return;
  
        video.playbackRate = speed;
        currentSpeed = speed;
        updateSpeedIndicator();
        checkLiveCatchUp(video);
    }
  
    function updateSpeedIndicator() {
        let indicator = document.getElementById('speed-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'speed-indicator';
  
            const speedText = document.createElement('span');
            speedText.id = 'speed-text';
  
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
  
            document.body.appendChild(indicator);
  
            speedText.onclick = e => {
                e.stopPropagation();
                const newSpeed = currentSpeed === 1 ? lastSpeed : 1;
                lastSpeed = currentSpeed;
                updateSpeed(newSpeed);
            };
              
            const style = document.createElement('style');
            style.textContent = `
                #speed-indicator {
                all: unset !important;
                position: fixed !important;
                top: 45px !important;
                left: 20px !important;
                z-index: 2147483647 !important;
                background: rgba(40, 40, 40, 0.9) !important;
                color: #fff !important;
                padding: 6px 12px !important;
                border-radius: 8px !important;
                font-family: sans-serif !important;
                font-size: 14px !important;
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
                box-shadow: 0 4px 15px rgba(0,0,0,0.5) !important;
                backdrop-filter: blur(5px) !important;
                cursor: move !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            #speed-indicator .controls { display: flex !important; gap: 5px !important; }
            #speed-indicator button {
                all: unset !important;
                background: #555 !important;
                width: 26px !important;
                height: 22px !important;
                text-align: center !important;
                border-radius: 4px !important;
                cursor: pointer !important;
                font-weight: bold !important;
            }
            #speed-indicator button:hover { background: #888 !important; }   
            `;
            document.head.appendChild(style);
        }
  
        indicator.querySelector('#speed-text').textContent = `${currentSpeed.toFixed(2)}x`;
        updateTimeRemaining();        
    }
  
    function updateTimeRemaining() {
        const el = document.getElementById('time-remaining');
        if (!el) return;
  
        const video = document.querySelector('video');
        if (!video || youTubeLiveState) {
            el.textContent = '';
            return;
        }
  
        const remain = video.duration - video.currentTime;
        if (!isFinite(remain) || remain <= 0) {
            el.textContent = '';
            return;
        }
  
        const m = Math.floor(remain / 60);
        const s = Math.floor(remain % 60);
        el.textContent = m < 60 ? `${m}:${s.toString().padStart(2,'0')}` : 
            `${Math.floor(m/60)}:${(m%60).toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }
  
    function checkLiveCatchUp(video) {
        if (currentSpeed <= 1 || !youTubeLiveState) return;
  
        const handler = () => {
            if (video.buffered.length === 0) return;
            const end = video.buffered.end(video.buffered.length - 1);
            if (end - video.currentTime < 3) {
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
        updateSpeedIndicator();
  
        const timeHandler = () => {
            if (!youTubeLiveState) updateTimeRemaining();
        };
        video.addEventListener('timeupdate', timeHandler);
  
        video.addEventListener('loadedmetadata', () => {
            video.removeEventListener('timeupdate', timeHandler);
        }, { once: true });
  
        if (initInterval) clearInterval(initInterval);
    }
  
    function runLogicOnce() {
        const isYouTube = location.hostname.includes('youtube.com') || location.hostname.includes('youtu.be');
        let vid;
  
        if (isYouTube) {
            vid = new URLSearchParams(location.search).get('v');
            if (!vid || vid === lastVideoId) return;
            lastVideoId = vid;
            isInitialized = false;
        } else {
            if (isInitialized) return;
        }
  
        scheduleYouTubeLiveDetect(600);
  
        setTimeout(() => {
            initializeCurrentVideo();
        }, isYouTube ? 800 : 1000);
  
        if (!isYouTube && !document.querySelector('video')) {
            if (initInterval) clearInterval(initInterval);
            initInterval = setInterval(() => {
                if (document.querySelector('video')) {
                    initializeCurrentVideo();
                }
            }, 500);
        }
    }
  
    document.addEventListener('keydown', e => {
        if (['INPUT','TEXTAREA'].includes(document.activeElement?.tagName) || 
            document.activeElement?.isContentEditable) return;
  
        if (e.key === ']')      updateSpeed(currentSpeed + 0.25);
        else if (e.key === '[') updateSpeed(Math.max(0.25, currentSpeed - 0.25));
        else if (e.key === '\\') {
            const ns = currentSpeed === 1 ? lastSpeed : 1;
            lastSpeed = currentSpeed;
            updateSpeed(ns);
        }
    });
  
    runLogicOnce();
    window.addEventListener('yt-navigate-finish', runLogicOnce);
    window.addEventListener('popstate', runLogicOnce);
  })();
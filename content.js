// ==UserScript==
// @name         YouTube Speed Control + Live Detection (Cleaned v3 - Fixed Fullscreen)
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Tăng/giảm tốc độ video YouTube, hiển thị indicator, tự về 1x khi catch up live. Fix fullscreen UI (nút dài, animation thiếu)
// @author       Adapted & cleaned & fixed
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
  
    let currentSpeed = 1;
    let lastSpeed = 1;
    let lastVideoId = null;
    let youTubeLiveState = false;
  
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
  
    // ────────────────────────────────────────────────
    // Tốc độ & indicator
    // ────────────────────────────────────────────────
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
  
            // CSS inline – đã fix fullscreen
            const style = document.createElement('style');
            style.textContent = `
                div#speed-indicator {
                all: unset !important;
                position: fixed !important;
                z-index: 2147483647 !important;
                background: rgba(0, 0, 0, 0.8) !important;
                color: #ffffff !important;
                padding: 5px 12px !important;
                border-radius: 7px !important;
                font-family: Arial, sans-serif !important;
                font-size: 13px !important;
                display: flex !important;
                flex-direction: row !important;      /* Ép nằm trên một hàng */
                flex-wrap: nowrap !important;        /* Tuyệt đối không cho xuống dòng */
                align-items: center !important;
                gap: 8px !important;
                user-select: none !important;
                pointer-events: auto !important;
                box-sizing: border-box !important;
                transition: all 0.2s ease !important;
                backdrop-filter: blur(4px) !important;
                white-space: nowrap !important;      /* Chống ngắt dòng văn bản */
            }

            div#speed-indicator .controls {
                display: flex !important;
                gap: 4px !important;
                flex-shrink: 0 !important;           /* Không cho phép cụm nút bị co lại */
            }

            div#speed-indicator button {
                all: unset !important;
                background: #444 !important;
                color: white !important;
                padding: 3px 0 !important;           /* Reset padding ngang */
                width: 28px !important;              /* Dùng width cố định cho nút */
                height: 22px !important;
                border-radius: 4px !important;
                cursor: pointer !important;
                font-weight: bold !important;
                font-size: 12px !important;
                text-align: center !important;
                display: flex !important;            /* Để căn giữa dấu < > */
                justify-content: center !important;
                align-items: center !important;
                transition: all 0.15s ease !important;
            }

            div#speed-indicator button:hover {
                background: #666 !important;
                transform: scale(1.1) !important;
            }   
            `;
            document.head.appendChild(style);
        }
  
        indicator.querySelector('#speed-text').textContent = `${currentSpeed.toFixed(2)}x`;
        updateTimeRemaining();
        updateSpeedIndicatorPosition();
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
  
    function updateSpeedIndicatorPosition() {
        const ind = document.getElementById('speed-indicator');
        if (!ind) return;
  
        const isYT = location.hostname.includes('youtube.com');
        if (!isYT) {
            ind.classList.remove('youtube-header', 'fullscreen');
            ind.style.position = 'absolute';
            ind.style.left = '10px';
            ind.style.top = '10px';
            ind.style.right = '';
            return;
        }
  
        const logo = document.querySelector('#logo, ytd-logo, .ytd-logo, a[href="/"], #masthead-container a[href="/"]');
        if (document.fullscreenElement) {
            ind.classList.remove('youtube-header');
            ind.classList.add('fullscreen');
            ind.style.left = '';
            ind.style.right = '16px';
            ind.style.top = '16px';
            ind.style.transform = 'none';
        } else {
            ind.classList.remove('fullscreen');
            ind.classList.add('youtube-header');
            if (logo) {
                const r = logo.getBoundingClientRect();
                ind.style.left = `${r.right + 16}px`;
                ind.style.top = `${r.top + (r.height - ind.offsetHeight)/2}px`;
                ind.style.right = '';
                ind.style.transform = 'none';
            } else {
                ind.style.left = '80px';
                ind.style.top = '56px';
                ind.style.right = '';
            }
        }
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
  
    // ────────────────────────────────────────────────
    // Khởi tạo cho video hiện tại
    // ────────────────────────────────────────────────
    function initializeCurrentVideo() {
        const video = document.querySelector('video');
        if (!video) return;
  
        updateSpeed(1);
        updateSpeedIndicator();
  
        const timeHandler = () => {
            if (!youTubeLiveState) updateTimeRemaining();
        };
        video.addEventListener('timeupdate', timeHandler);
  
        video.addEventListener('loadedmetadata', () => {
            video.removeEventListener('timeupdate', timeHandler);
        }, { once: true });
    }
  
    // ────────────────────────────────────────────────
    // Chạy logic mỗi video mới
    // ────────────────────────────────────────────────
    function runLogicOnce() {
        const vid = new URLSearchParams(location.search).get('v');
        if (!vid || vid === lastVideoId) return;
  
        lastVideoId = vid;
  
        setTimeout(() => {
            scheduleYouTubeLiveDetect(600);
            initializeCurrentVideo();
        }, 800);
    }
  
    // ────────────────────────────────────────────────
    // Phím tắt
    // ────────────────────────────────────────────────
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
  
    // ────────────────────────────────────────────────
    // Khởi động
    // ────────────────────────────────────────────────
    runLogicOnce();
    window.addEventListener('yt-navigate-finish', runLogicOnce);
    window.addEventListener('popstate', runLogicOnce);
  
    document.addEventListener('fullscreenchange', updateSpeedIndicatorPosition);
    window.addEventListener('resize', updateSpeedIndicatorPosition);
  
    let scrollTimer;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(updateSpeedIndicatorPosition, 100);
    });
  
  })();
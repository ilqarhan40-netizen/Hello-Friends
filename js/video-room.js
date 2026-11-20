// ==========================================
// ФАЙЛ: js/video-room.js (CLEAN v2)
// ЕДИНЫЙ ДВИЖОК ВКЛАДКИ 1 (ВИДЕО + АУДИО):
// БЕСКОНЕЧНАЯ БЕГУЩАЯ СТРОКА + 13 ЯЗЫКОВ + БЕСКОНЕЧНЫЙ МИКРОФОН
// ==========================================

(function () {
    'use strict';

    window.videoRoomQueue = [];
    window.videoRoomActiveDbPath = null;
    window.videoRoomActiveListener = null;
    window.videoRoomListenerStartedAt = 0;
    window.videoRoomServerOffset = 0;
    window.videoRoomSeenKeys = new Set();

    window.videoRoomRecognition = null;
    window.videoRoomMicActive = false;
    window.videoRoomMicMode = 'text'; // 'text' | 'ai-audio'
    window.videoRoomMicRestartTimer = null;
    window.videoRoomMicWatchdog = null;
    window.videoRoomManualLang = null;
    window.videoRoomMicLangOverride = null;
    window.isVoiceMarqueeEnabled = true;

    let lastMicTranscript = '';
    let lastMicTranscriptAt = 0;

    // --- 1. СПРАВОЧНИК 13 ЯЗЫКОВ ---
    window.VIDEO_LANG_MAP = {
        en: { flagCode: 'gb', flag: '🇬🇧', speech: 'en-US', label: 'EN' },
        ru: { flagCode: 'ru', flag: '🇷🇺', speech: 'ru-RU', label: 'RU' },
        az: { flagCode: 'az', flag: '🇦🇿', speech: 'az-AZ', label: 'AZ' },
        tr: { flagCode: 'tr', flag: '🇹🇷', speech: 'tr-TR', label: 'TR' },
        de: { flagCode: 'de', flag: '🇩🇪', speech: 'de-DE', label: 'DE' },
        kk: { flagCode: 'kz', flag: '🇰🇿', speech: 'kk-KZ', label: 'KK' },
        ar: { flagCode: 'ae', flag: '🇦🇪', speech: 'ar-AE', label: 'AR' },
        it: { flagCode: 'it', flag: '🇮🇹', speech: 'it-IT', label: 'IT' },
        es: { flagCode: 'es', flag: '🇪🇸', speech: 'es-ES', label: 'ES' },
        fr: { flagCode: 'fr', flag: '🇫🇷', speech: 'fr-FR', label: 'FR' },
        pt: { flagCode: 'pt', flag: '🇵🇹', speech: 'pt-PT', label: 'PT' },
        ja: { flagCode: 'jp', flag: '🇯🇵', speech: 'ja-JP', label: 'JA' },
        zh: { flagCode: 'cn', flag: '🇨🇳', speech: 'zh-CN', label: 'ZH' }
    };

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    window.videoRoomFixLang = function (code) {
        if (!code) return '';
        const raw = String(code).trim().toLowerCase();
        if (!raw || raw === 'auto' || raw === 'un') return '';
        const tl = raw.split(/[-_]/)[0].substring(0, 2);
        const codeFix = {
            us: 'en', gb: 'en', uk: 'en',
            kz: 'kk', cn: 'zh', jp: 'ja',
            ae: 'ar', sa: 'ar', eg: 'ar',
            br: 'pt', mx: 'es'
        };
        const fixed = codeFix[tl] || tl;
        return window.VIDEO_LANG_MAP[fixed] ? fixed : fixed;
    };

    window.videoRoomLangFromFlagEmoji = function (flag) {
        if (!flag) return '';
        const emojiMap = {
            '🇬🇧': 'en', '🇺🇸': 'en', '🇷🇺': 'ru', '🇦🇿': 'az',
            '🇹🇷': 'tr', '🇩🇪': 'de', '🇰🇿': 'kk', '🇦🇪': 'ar',
            '🇸🇦': 'ar', '🇮🇹': 'it', '🇪🇸': 'es', '🇫🇷': 'fr',
            '🇵🇹': 'pt', '🇧🇷': 'pt', '🇯🇵': 'ja', '🇨🇳': 'zh'
        };
        return emojiMap[String(flag).trim()] || '';
    };

    window.videoRoomLangFromPhone = function (phone) {
        if (!phone) return '';
        const digits = String(phone).replace(/\D/g, '');
        if (!digits) return '';
        const prefixes = [
            ['994', 'az'], ['971', 'ar'], ['966', 'ar'], ['351', 'pt'],
            ['77', 'kk'], ['76', 'kk'], ['90', 'tr'], ['49', 'de'],
            ['44', 'en'], ['39', 'it'], ['34', 'es'], ['33', 'fr'],
            ['81', 'ja'], ['86', 'zh'], ['55', 'pt'], ['20', 'ar'],
            ['7', 'ru'], ['1', 'en']
        ];
        for (const [pref, lang] of prefixes) {
            if (digits.startsWith(pref)) return lang;
        }
        return '';
    };

    // Приоритет языка: 1) Вручную в панели -> 2) Флаг -> 3) Телефон -> 4) langCode -> en
    window.videoRoomResolveLang = function (userObj, manualPref = null) {
        const manualTl = window.videoRoomFixLang(manualPref);
        if (manualTl) return manualTl;

        if (userObj) {
            const byFlagCode = window.videoRoomFixLang(userObj.flagCode);
            if (byFlagCode) return byFlagCode;

            const byFlagEmoji = window.videoRoomLangFromFlagEmoji(userObj.flag);
            if (byFlagEmoji) return byFlagEmoji;

            const byPhone = window.videoRoomLangFromPhone(userObj.phone || userObj.phoneNumber || userObj.tel);
            if (byPhone) return byPhone;

            const byProfileCode = window.videoRoomFixLang(userObj.langCode || userObj.lang);
            if (byProfileCode) return byProfileCode;
        }

        if (typeof window.getSmartLang === 'function' && userObj) {
            const smart = window.videoRoomFixLang(window.getSmartLang(userObj));
            if (smart) return smart;
        }

        return 'en';
    };

    window.videoRoomGetManualPanelLang = function () {
        if (window.videoRoomManualLang && window.videoRoomManualLang !== 'auto') {
            return window.videoRoomManualLang;
        }
        if (typeof window.getManualLangPref === 'function') {
            const pref = window.getManualLangPref(true, false);
            if (pref && pref !== 'auto') return window.videoRoomFixLang(pref);
        }
        return null;
    };

    window.setVideoRoomLang = function (langCode) {
        window.videoRoomManualLang = (!langCode || langCode === 'auto') ? null : window.videoRoomFixLang(langCode);
    };

    // Стыковка с js/microphones.js (#video-mic-lang и localStorage 'hf_video_mic_lang')
    window.saveVideoMicLang = function (langCode) {
        window.videoRoomMicLangOverride = (!langCode || langCode === 'auto') ? null : window.videoRoomFixLang(langCode);
        updateMicIndicatorPill();
        if (window.videoRoomMicActive) {
            const currentMode = window.videoRoomMicMode || 'text';
            window.stopVideoRoomMic(true).then(() => {
                setTimeout(() => window.startVideoRoomMic(currentMode), 220);
            });
        }
    };
    window.setVideoRoomMicLang = window.saveVideoMicLang;

    window.videoRoomGetMicLang = function () {
        if (window.videoRoomMicLangOverride) return window.videoRoomMicLangOverride;

        const saved = localStorage.getItem('hf_video_mic_lang');
        if (saved && saved !== 'auto') {
            const parsedSaved = window.videoRoomFixLang(saved);
            if (parsedSaved) return parsedSaved;
        }

        const sel = document.getElementById('video-mic-lang');
        if (sel && sel.value && sel.value !== 'auto') {
            const parsedSel = window.videoRoomFixLang(sel.value);
            if (parsedSel) return parsedSel;
        }

        // Если стоит "Авто (профиль)" — берём родной язык пользователя
        return window.videoRoomResolveLang(window.myProfileInfo, null) || 'en';
    };

    window.videoRoomIsMicManual = function () {
        if (window.videoRoomMicLangOverride) return true;
        const saved = localStorage.getItem('hf_video_mic_lang');
        if (saved && saved !== 'auto') return true;
        const sel = document.getElementById('video-mic-lang');
        return Boolean(sel && sel.value && sel.value !== 'auto');
    };

    // Чистый переводчик (1 запрос напрямую от оригинала к нужному языку)
    window.videoRoomTranslate = async function (text, targetTl) {
        const cleanText = String(text || '').trim();
        if (!cleanText || !targetTl) return { text: cleanText, detectedLang: '' };
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetTl)}&dt=t&q=${encodeURIComponent(cleanText)}`;
            const res = await fetch(url);
            const data = await res.json();
            const translated = (data && Array.isArray(data[0]))
                ? data[0].map(part => (part && part[0]) ? part[0] : '').join('')
                : cleanText;
            const detectedLang = (data && typeof data[2] === 'string')
                ? window.videoRoomFixLang(data[2])
                : '';
            return { text: translated || cleanText, detectedLang };
        } catch (e) {
            console.warn('VideoRoom translate fallback:', e);
            return { text: cleanText, detectedLang: '' };
        }
    };

    // Активный собеседник вкладки 1
    window.getVideoRoomPartner = function () {
        if (window.voiceFriend && window.voiceFriend.id) return window.voiceFriend;
        if (window.currentTargetUser && window.currentTargetUser.id) return window.currentTargetUser;
        if (window.currentCallerId && Array.isArray(window.participants)) {
            const found = window.participants.find(p => String(p.id) === String(window.currentCallerId));
            if (found) return found;
        }
        if (window.currentCallerFallback && window.currentCallerFallback.id) return window.currentCallerFallback;
        return null;
    };

    window.isDirectVideoCallActive = function () {
        return window.currentIndex === 1;
    };

    // ==========================================
    // 2. БЕСКОНЕЧНАЯ ПЛАВНАЯ БЕГУЩАЯ СТРОКА (НЕ ОСТАНАВЛИВАЕТСЯ НИКОГДА)
    // ==========================================
    const marqueeState = {
        rafId: null,
        lastTs: 0,
        offsetX: 0,
        speedPxPerSec: 65,
        currentHtml: '',
        passCount: 0,
        initialized: false
    };

    function injectVideoRoomStyles() {
        if (document.getElementById('hf-video-room-v2-styles')) return;
        const style = document.createElement('style');
        style.id = 'hf-video-room-v2-styles';
        style.textContent = `
            #voice-marquee-container-anim {
                position: relative;
                overflow: hidden !important;
                display: flex !important;
                align-items: center !important;
            }
            #voice-info-marquee {
                display: inline-flex !important;
                align-items: center !important;
                white-space: nowrap !important;
                animation: none !important;
                transition: none !important;
                padding-left: 0 !important;
                will-change: transform;
            }
            #hf-video-mic-pill {
                position: fixed;
                bottom: 76px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9998;
                display: none;
                align-items: center;
                gap: 10px;
                background: rgba(17, 27, 33, 0.96);
                border: 1.5px solid #ef4444;
                color: #ffffff;
                padding: 8px 14px;
                border-radius: 999px;
                box-shadow: 0 8px 28px rgba(239, 68, 68, 0.35);
                font-size: 0.78rem;
                font-weight: 700;
                backdrop-filter: blur(8px);
            }
            #hf-video-mic-pill.active {
                display: flex;
            }
            #hf-video-mic-pill .hf-mic-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #ef4444;
                animation: hfMicPulse 1s infinite;
            }
            #hf-video-mic-pill .hf-mic-stop-btn {
                background: #ef4444;
                color: #ffffff;
                border: none;
                border-radius: 999px;
                padding: 4px 12px;
                font-size: 0.72rem;
                font-weight: 800;
                cursor: pointer;
            }
            @keyframes hfMicPulse {
                0% { transform: scale(0.85); opacity: 0.6; }
                50% { transform: scale(1.25); opacity: 1; }
                100% { transform: scale(0.85); opacity: 0.6; }
            }
        `;
        document.head.appendChild(style);
    }

    function getMarqueeNodes() {
        const container = document.getElementById('voice-marquee-container-anim');
        const textEl = document.getElementById('voice-info-marquee');
        return { container, textEl };
    }

    function loadNextMarqueeItem(resetToRight = true) {
        const { container, textEl } = getMarqueeNodes();
        if (!container || !textEl) return;

        if (window.videoRoomQueue.length > 0) {
            const next = window.videoRoomQueue.shift();
            marqueeState.currentHtml = next.text;
            marqueeState.passCount = 0;
            textEl.innerHTML = marqueeState.currentHtml;
        } else if (!marqueeState.currentHtml) {
            marqueeState.currentHtml = textEl.innerHTML || 'Waiting for voice input...';
        }

        if (resetToRight) {
            const containerWidth = container.clientWidth || 300;
            marqueeState.offsetX = containerWidth + 16;
            textEl.style.transform = `translate3d(${marqueeState.offsetX}px, 0, 0)`;
        }
    }

    function marqueeLoop(ts) {
        marqueeState.rafId = requestAnimationFrame(marqueeLoop);

        if (!marqueeState.lastTs) {
            marqueeState.lastTs = ts;
            return;
        }

        const dt = Math.min((ts - marqueeState.lastTs) / 1000, 0.1);
        marqueeState.lastTs = ts;

        if (window.isVoiceMarqueeEnabled === false) return;

        const { container, textEl } = getMarqueeNodes();
        if (!container || !textEl) return;

        const containerWidth = container.clientWidth;
        const textWidth = textEl.scrollWidth;

        // Если вкладка сейчас скрыта (ширина 0) — просто ждём
        if (containerWidth <= 0 || textWidth <= 0) return;

        if (!marqueeState.initialized) {
            marqueeState.initialized = true;
            marqueeState.currentHtml = textEl.innerHTML;
            marqueeState.offsetX = containerWidth;
        }

        // Двигаем строку влево с постоянной скоростью
        marqueeState.offsetX -= marqueeState.speedPxPerSec * dt;

        // Если строка полностью прошла за левый край — бесконечный цикл!
        if (marqueeState.offsetX < -(textWidth + 24)) {
            marqueeState.passCount += 1;
            if (window.videoRoomQueue.length > 0) {
                loadNextMarqueeItem(true);
            } else {
                // Повторяем текущую фразу бесконечно без пауз и остановок
                marqueeState.offsetX = containerWidth + 16;
            }
        }

        textEl.style.transform = `translate3d(${marqueeState.offsetX}px, 0, 0)`;
    }

    function startInfiniteMarqueeEngine() {
        injectVideoRoomStyles();
        if (marqueeState.rafId) return;
        marqueeState.lastTs = 0;
        marqueeState.rafId = requestAnimationFrame(marqueeLoop);
    }

    window.pushToVideoMarquee = function (htmlText, type = 'text') {
        if (!htmlText) return;
        startInfiniteMarqueeEngine();

        window.videoRoomQueue.push({ text: htmlText, type: type });

        // Если сейчас крутится старая фраза (уже прошла минимум 1 круг) или заглушка —
        // показываем новое сообщение сразу, не заставляя ждать
        const isPlaceholder = !marqueeState.currentHtml || marqueeState.currentHtml.indexOf('img src=') === -1;
        if (isPlaceholder || marqueeState.passCount >= 1) {
            loadNextMarqueeItem(true);
        }
    };

    window.toggleVoiceMarquee = function () {
        window.isVoiceMarqueeEnabled = (window.isVoiceMarqueeEnabled === false);
        const { container } = getMarqueeNodes();
        if (container) {
            container.style.opacity = window.isVoiceMarqueeEnabled ? '1' : '0';
        }
    };

    // ==========================================
    // 3. ЕДИНЫЙ ПУТЬ FIREBASE И ОТПРАВКА СООБЩЕНИЙ
    // ==========================================
    window.getVideoRoomDbPath = function () {
        const partner = window.getVideoRoomPartner();
        if (partner && partner.id && window.myProfileInfo && window.myProfileInfo.id) {
            const pair = [String(window.myProfileInfo.id), String(partner.id)].sort();
            return `video_rooms/${pair[0]}_${pair[1]}`;
        }
        return null;
    };

    window.sendVideoRoomPayload = async function (rawText, sourceType = 'keyboard', isAIAudio = false) {
        const cleanText = String(rawText || '').trim();
        if (!cleanText) return;

        window.syncVideoRoomListener();

        const targetDbRoom = window.getVideoRoomDbPath();
        if (!targetDbRoom) {
            if (window.showToast) window.showToast('Video Room', 'Выберите собеседника для звонка', '', '');
            return;
        }

        const partner = window.getVideoRoomPartner();
        const isVoice = (sourceType === 'voice');
        const manualLang = isVoice
            ? (window.videoRoomIsMicManual() ? window.videoRoomGetMicLang() : null)
            : window.videoRoomGetManualPanelLang();

        const myTl = isVoice
            ? window.videoRoomGetMicLang()
            : window.videoRoomResolveLang(window.myProfileInfo, manualLang);
        const targetTl = window.videoRoomResolveLang(partner, null);

        const safeId = (window.myProfileInfo && window.myProfileInfo.id) ? String(window.myProfileInfo.id) : 'guest';
        const safeName = window.myUsername || (window.myProfileInfo && window.myProfileInfo.name) || 'User';
        const safePhoto = (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : 'https://ui-avatars.com/api/?name=U';

        const myMeta = window.VIDEO_LANG_MAP[myTl];
        const activeFlag = (manualLang && myMeta)
            ? myMeta.flag
            : ((window.myProfileInfo && window.myProfileInfo.flag) || (myMeta ? myMeta.flag : '🌐'));
        const activeFlagCode = (manualLang && myMeta)
            ? myMeta.flagCode
            : ((window.myProfileInfo && window.myProfileInfo.flagCode) || (myMeta ? myMeta.flagCode : 'un'));

        // Переводим ОДИН РАЗ напрямую из оригинала на язык собеседника
        let translatedText = cleanText;
        let detectedLang = myTl;

        if (targetTl && targetTl !== myTl) {
            const res = await window.videoRoomTranslate(cleanText, targetTl);
            translatedText = res.text || cleanText;
            if (res.detectedLang) detectedLang = res.detectedLang;
        }

        try {
            firebase.database().ref(targetDbRoom).push({
                userId: safeId,
                name: safeName,
                originalText: cleanText,
                text: translatedText || cleanText,
                sourceType: sourceType, // 'keyboard' | 'voice'
                isAIAudio: Boolean(isAIAudio),
                langCode: detectedLang || myTl,
                targetLang: targetTl,
                sessionId: window.mySessionId || 'sess',
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                photo: safePhoto,
                flag: activeFlag,
                flagCode: activeFlagCode,
                isVideoRoomMsg: true
            });
        } catch (err) {
            console.error('Video Room send error:', err);
        }
    };

    window.sendVideoRoomMsg = async function () {
        const inputField =
            document.getElementById('voice-chat-input') ||
            document.getElementById('video-chat-input');
        if (!inputField) return;

        const rawText = inputField.value.trim();
        if (!rawText) return;
        inputField.value = '';

        await window.sendVideoRoomPayload(rawText, 'keyboard', false);
    };

    // ==========================================
    // 4. БЕСКОНЕЧНЫЙ НИЖНИЙ МИКРОФОН ПЕРЕВОДА (TEXT + AI-AUDIO)
    // ==========================================
    function ensureMicIndicatorPill() {
        injectVideoRoomStyles();
        let pill = document.getElementById('hf-video-mic-pill');
        if (!pill) {
            pill = document.createElement('div');
            pill.id = 'hf-video-mic-pill';
            pill.innerHTML = `
                <span class="hf-mic-dot"></span>
                <span id="hf-video-mic-pill-label">Listening...</span>
                <button type="button" class="hf-mic-stop-btn" onclick="window.stopVideoRoomMic()">STOP</button>
            `;
            document.body.appendChild(pill);
        }
        return pill;
    }

    function updateMicIndicatorPill() {
        const pill = ensureMicIndicatorPill();
        const label = document.getElementById('hf-video-mic-pill-label');
        if (!window.videoRoomMicActive) {
            pill.classList.remove('active');
            return;
        }
        const micTl = window.videoRoomGetMicLang();
        const meta = window.VIDEO_LANG_MAP[micTl];
        const flag = meta ? meta.flag : '🌐';
        const modeLabel = (window.videoRoomMicMode === 'ai-audio') ? 'AI Voice' : 'Text';
        if (label) {
            label.textContent = `${flag} ${modeLabel} • ON`;
        }
        pill.classList.add('active');
    }

    function launchRecognitionCycle() {
        if (!window.videoRoomMicActive) return;

        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;

        if (window.videoRoomRecognition) {
            try { window.videoRoomRecognition.onend = null; } catch (e) {}
            try { window.videoRoomRecognition.abort(); } catch (e) {}
            window.videoRoomRecognition = null;
        }

        try {
            const rec = new SpeechRec();
            const micTl = window.videoRoomGetMicLang();
            const meta = window.VIDEO_LANG_MAP[micTl];

            rec.lang = meta ? meta.speech : (navigator.language || 'ru-RU');
            // На Android/планшетах false + быстрый автоперезапуск не дублирует слова и работает бесконечно
            rec.continuous = false;
            rec.interimResults = false;
            rec.maxAlternatives = 1;

            rec.onresult = (event) => {
                if (!event.results || !event.results.length) return;
                let spokenText = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal && event.results[i][0]) {
                        spokenText += ' ' + event.results[i][0].transcript;
                    }
                }
                spokenText = spokenText.trim();
                if (!spokenText) return;

                // Антидубль от двойных срабатываний Android Speech API
                const now = Date.now();
                if (spokenText === lastMicTranscript && (now - lastMicTranscriptAt) < 1200) return;
                lastMicTranscript = spokenText;
                lastMicTranscriptAt = now;

                const isAI = (window.videoRoomMicMode === 'ai-audio');
                window.sendVideoRoomPayload(spokenText, 'voice', isAI);
            };

            rec.onerror = (event) => {
                const err = event && event.error;
                if (err === 'not-allowed' || err === 'service-not-allowed') {
                    console.warn('VideoRoom Mic blocked:', err);
                    if (window.showToast) window.showToast('Микрофон', 'Разрешите доступ к микрофону в браузере', '', '');
                    window.stopVideoRoomMic();
                }
                // Все остальные ошибки (no-speech, network, audio-capture, aborted) перезапустятся в onend
            };

            rec.onend = () => {
                window.videoRoomRecognition = null;
                if (window.videoRoomMicActive) {
                    clearTimeout(window.videoRoomMicRestartTimer);
                    window.videoRoomMicRestartTimer = setTimeout(launchRecognitionCycle, 180);
                }
            };

            window.videoRoomRecognition = rec;
            rec.start();
        } catch (e) {
            window.videoRoomRecognition = null;
            if (window.videoRoomMicActive) {
                clearTimeout(window.videoRoomMicRestartTimer);
                window.videoRoomMicRestartTimer = setTimeout(launchRecognitionCycle, 500);
            }
        }
    }

    window.startVideoRoomMic = async function (mode = 'text') {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            alert('Ваш браузер не поддерживает распознавание речи.');
            return;
        }

        window.videoRoomMicMode = (mode === 'ai-audio') ? 'ai-audio' : 'text';

        // Если уже активен — просто обновляем режим и индикатор без перезапуска
        if (window.videoRoomMicActive) {
            updateMicIndicatorPill();
            return;
        }

        window.videoRoomMicActive = true;
        window.syncVideoRoomListener();
        updateMicIndicatorPill();

        // Физически освобождаем микрофон Agora на мобильном, чтобы SpeechRecognition не глох
        if (typeof window.pauseAgoraMicForTranslation === 'function') {
            await window.pauseAgoraMicForTranslation();
            await new Promise(r => setTimeout(r, 150));
        }

        if (!window.videoRoomMicActive) return;

        launchRecognitionCycle();

        // Сторож: если браузер тихо сбросил сессию без onend — поднимаем обратно
        clearInterval(window.videoRoomMicWatchdog);
        window.videoRoomMicWatchdog = setInterval(() => {
            if (window.videoRoomMicActive && !window.videoRoomRecognition && !window.videoRoomMicRestartTimer) {
                launchRecognitionCycle();
            }
        }, 3500);
    };

    window.stopVideoRoomMic = async function (skipResumeAgora = false) {
        window.videoRoomMicActive = false;

        if (window.videoRoomMicRestartTimer) {
            clearTimeout(window.videoRoomMicRestartTimer);
            window.videoRoomMicRestartTimer = null;
        }
        if (window.videoRoomMicWatchdog) {
            clearInterval(window.videoRoomMicWatchdog);
            window.videoRoomMicWatchdog = null;
        }
        if (window.videoRoomRecognition) {
            try { window.videoRoomRecognition.onend = null; } catch (e) {}
            try { window.videoRoomRecognition.onerror = null; } catch (e) {}
            try { window.videoRoomRecognition.stop(); } catch (e) {}
            window.videoRoomRecognition = null;
        }

        updateMicIndicatorPill();

        // Возвращаем живой голос обратно в звонок Agora
        if (!skipResumeAgora && typeof window.resumeAgoraMicAfterTranslation === 'function') {
            await window.resumeAgoraMicAfterTranslation();
        }
    };

    window.toggleVideoRoomMic = function (mode = 'text') {
        if (window.videoRoomMicActive) {
            window.stopVideoRoomMic();
        } else {
            window.startVideoRoomMic(mode);
        }
    };

    // Псевдонимы для полной совместимости с microphones.js и voice.js
    window.startVoiceRoomMic = window.startVideoRoomMic;
    window.startAudioRoomMic = window.startVideoRoomMic;
    window.stopAudioRoomMic = window.stopVideoRoomMic;

    // ==========================================
    // 5. СЛУШАТЕЛЬ FIREBASE И ВЫВОД В БЕГУЩУЮ СТРОКУ
    // ==========================================
    window.handleVideoRoomMessage = async function (snapshot) {
        const data = snapshot.val();
        if (!data || !data.isVideoRoomMsg) return;

        if (window.videoRoomSeenKeys.has(snapshot.key)) return;
        window.videoRoomSeenKeys.add(snapshot.key);

        const serverNow = Date.now() + (window.videoRoomServerOffset || 0);
        if (data.timestamp) {
            if (window.videoRoomListenerStartedAt && data.timestamp < (window.videoRoomListenerStartedAt - 5000)) return;
            if ((serverNow - data.timestamp) > 60000) return;
        }

        const myId = window.myProfileInfo ? String(window.myProfileInfo.id) : '';
        const isMe = (data.sessionId && data.sessionId === window.mySessionId) || (myId && String(data.userId) === myId);
        const partner = window.getVideoRoomPartner();

        const senderText = String(data.originalText || data.text || '').trim();
        let receiverText = String(data.text || senderText).trim();

        let senderPhoto, senderFlag, senderName;
        let receiverPhoto, receiverFlag, receiverName;
        let myReadTl = 'en';

        if (isMe) {
            senderPhoto = (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=U';
            senderFlag = data.flag || (window.myProfileInfo && window.myProfileInfo.flag) || '🌐';
            senderName = (window.myUsername || 'Me').split(' ')[0];

            const targetTl = data.targetLang || window.videoRoomResolveLang(partner, null);
            const targetMeta = window.VIDEO_LANG_MAP[targetTl];
            receiverPhoto = partner ? (partner.photo || 'https://ui-avatars.com/api/?name=U') : 'https://ui-avatars.com/api/?name=U';
            receiverFlag = (partner && partner.flag) || (targetMeta ? targetMeta.flag : '🌐');
            receiverName = partner ? (partner.name || 'User').split(' ')[0] : 'Partner';
        } else {
            senderPhoto = data.photo || (partner && partner.photo) || 'https://ui-avatars.com/api/?name=U';
            senderFlag = data.flag || (partner && partner.flag) || '🌐';
            senderName = (data.name || (partner && partner.name) || 'User').split(' ')[0];

            receiverPhoto = (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=U';
            receiverName = (window.myUsername || 'Me').split(' ')[0];

            // Язык чтения на моём устройстве: Панель -> Флаг -> Телефон -> Профиль
            const manualPanel = window.videoRoomGetManualPanelLang();
            myReadTl = window.videoRoomResolveLang(window.myProfileInfo, manualPanel);
            const myReadMeta = window.VIDEO_LANG_MAP[myReadTl];

            receiverFlag = (manualPanel && myReadMeta)
                ? myReadMeta.flag
                : ((window.myProfileInfo && window.myProfileInfo.flag) || (myReadMeta ? myReadMeta.flag : '🌐'));

            const sourceTl = window.videoRoomFixLang(data.langCode);
            const sentTargetTl = window.videoRoomFixLang(data.targetLang);

            if (sourceTl && sourceTl === myReadTl) {
                receiverText = senderText;
            } else if (sentTargetTl && sentTargetTl === myReadTl && data.text) {
                receiverText = data.text;
            } else if (senderText) {
                const res = await window.videoRoomTranslate(senderText, myReadTl);
                receiverText = res.text || receiverText;
            }
        }

        const modeIcon = data.sourceType === 'voice'
            ? (data.isAIAudio
                ? '<i class="fa-solid fa-robot text-[#00a884] mx-2 text-[0.7rem]"></i>'
                : '<i class="fa-solid fa-microphone text-yellow-400 mx-2 text-[0.65rem]"></i>')
            : '<i class="fa-solid fa-arrow-right text-[#00a884] mx-2 text-[0.65rem]"></i>';

        const html =
            `<span class="inline-flex items-center">` +
                `<img src="${escapeHtml(senderPhoto)}" class="w-5 h-5 rounded-full border border-[#2a3942] mr-1 object-cover shadow-sm">` +
                `<span class="text-white font-bold mr-1">${escapeHtml(senderName)}:</span>` +
                `<span class="text-[#e9edef] mr-1">${escapeHtml(senderFlag)} ${escapeHtml(senderText)}</span>` +
                `${modeIcon}` +
                `<img src="${escapeHtml(receiverPhoto)}" class="w-5 h-5 rounded-full border border-yellow-400 mr-1 object-cover">` +
                `<span class="text-white font-bold mr-1">${escapeHtml(receiverName)}:</span>` +
                `<span class="text-yellow-400 font-bold">${escapeHtml(receiverFlag)} ${escapeHtml(receiverText)}</span>` +
            `</span>`;

        window.pushToVideoMarquee(html, data.sourceType || 'keyboard');

        // Озвучка переведённой фразы для получателя в режиме AI Voice
        if (!isMe && data.isAIAudio && receiverText && typeof window.playAIVoice === 'function') {
            window.playAIVoice(encodeURIComponent(receiverText), myReadTl);
        }
    };

    window.syncVideoRoomListener = function () {
        if (typeof firebase === 'undefined' || !firebase.database) return;

        if (!window._videoRoomOffsetSynced) {
            window._videoRoomOffsetSynced = true;
            firebase.database().ref('.info/serverTimeOffset').on('value', (snap) => {
                window.videoRoomServerOffset = snap.val() || 0;
            });
        }

        const desiredPath = window.getVideoRoomDbPath();
        if (!desiredPath) return;
        if (window.videoRoomActiveDbPath === desiredPath && window.videoRoomActiveListener) return;

        if (window.videoRoomActiveDbPath && window.videoRoomActiveListener) {
            firebase.database().ref(window.videoRoomActiveDbPath).off('child_added', window.videoRoomActiveListener);
        }

        window.videoRoomSeenKeys.clear();
        window.videoRoomActiveDbPath = desiredPath;
        window.videoRoomListenerStartedAt = Date.now() + (window.videoRoomServerOffset || 0);
        window.videoRoomActiveListener = firebase.database()
            .ref(desiredPath)
            .limitToLast(10)
            .on('child_added', window.handleVideoRoomMessage);
    };

    // ==========================================
    // 6. ЧИСТЫЕ ПЕРЕХВАТЫ СТРОГО ДЛЯ ВКЛАДКИ 1 (БЕЗ КОНФЛИКТОВ С ЧАТОМ И КОНФЕРЕНЦИЕЙ)
    // ==========================================
    function initVideoRoomEngine() {
        startInfiniteMarqueeEngine();
        ensureMicIndicatorPill();

        setInterval(() => {
            if (window.currentIndex === 1) {
                window.syncVideoRoomListener();
            }
        }, 1000);

        // Enter в поле ввода вкладки 1
        document.addEventListener('keydown', (e) => {
            if (!e.key || e.key !== 'Enter' || !document.activeElement) return;
            const activeId = document.activeElement.id;
            if (window.currentIndex === 1 && (activeId === 'voice-chat-input' || activeId === 'video-chat-input')) {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (window.playSafeSound && window.sndMsg) window.playSafeSound(window.sndMsg);
                window.sendVideoRoomMsg();
            }
        }, true);

        // Самолётик отправки: перехватываем СТРОГО на вкладке 1
        const hookSend = setInterval(() => {
            if (typeof window.sendFirebaseMsg === 'function' && !window._tab1UnifiedSendHooked) {
                const origSend = window.sendFirebaseMsg;
                window.sendFirebaseMsg = function () {
                    if (window.currentIndex === 1) {
                        return window.sendVideoRoomMsg();
                    }
                    return origSend.apply(this, arguments);
                };
                window._tab1UnifiedSendHooked = true;
                clearInterval(hookSend);
            }
        }, 400);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVideoRoomEngine);
    } else {
        initVideoRoomEngine();
    }
})();

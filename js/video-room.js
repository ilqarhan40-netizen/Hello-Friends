// ==========================================
// ФАЙЛ: js/video-room.js (CLEAN v7)
// ВКЛАДКА 1 (ВИДЕОКОМНАТА + ЧИСТАЯ АУДИОКОМНАТА):
// БЕСКОНЕЧНЫЙ ТЕКСТ ГОЛОСОМ + БЕСКОНЕЧНЫЙ ИИ-ГОЛОС + ЗАЩИТА ОТ ЭХА
// АВТО СТРОГО ОТ ПРОФИЛЯ + БЕСКОНЕЧНАЯ БЕГУЩАЯ СТРОКА
// ==========================================

(function () {
    'use strict';

    window.videoRoomQueue = [];
    window.videoRoomActiveDbPath = null;
    window.videoRoomActiveListener = null;
    window._vrActiveMetaPath = null;
    window._vrActiveMetaListener = null;
    window.videoRoomPartnerMeta = null;
    window._vrLastMetaSig = '';
    window.videoRoomListenerStartedAt = 0;
    window.videoRoomServerOffset = 0;
    window.videoRoomSeenKeys = new Set();

    window.videoRoomRecognition = null;
    window.videoRoomMicActive = false;
    window.videoRoomMicMode = 'text'; // 'text' | 'ai-audio'
    window.videoRoomMicRestartTimer = null;
    window.videoRoomMicWatchdog = null;
    window._vrPopupCloseWatcher = null;
    window._isPausedForAITTS = false;

    window.videoRoomManualLang = null;
    window.videoRoomMicLangOverride = null;
    window.isVoiceMarqueeEnabled = true;

    let lastMicTranscript = '';
    let lastMicTranscriptAt = 0;

    // 13 языков приложения
    window.VIDEO_LANG_MAP = {
        en: { flagCode: 'gb', flag: '🇬🇧', speech: 'en-US' },
        ru: { flagCode: 'ru', flag: '🇷🇺', speech: 'ru-RU' },
        az: { flagCode: 'az', flag: '🇦🇿', speech: 'az-AZ' },
        tr: { flagCode: 'tr', flag: '🇹🇷', speech: 'tr-TR' },
        de: { flagCode: 'de', flag: '🇩🇪', speech: 'de-DE' },
        kk: { flagCode: 'kz', flag: '🇰🇿', speech: 'kk-KZ' },
        ar: { flagCode: 'ae', flag: '🇦🇪', speech: 'ar-AE' },
        it: { flagCode: 'it', flag: '🇮🇹', speech: 'it-IT' },
        es: { flagCode: 'es', flag: '🇪🇸', speech: 'es-ES' },
        fr: { flagCode: 'fr', flag: '🇫🇷', speech: 'fr-FR' },
        pt: { flagCode: 'pt', flag: '🇵🇹', speech: 'pt-PT' },
        ja: { flagCode: 'jp', flag: '🇯🇵', speech: 'ja-JP' },
        zh: { flagCode: 'cn', flag: '🇨🇳', speech: 'zh-CN' }
    };

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function isRealFlag(flag) {
        const f = String(flag || '').trim();
        return Boolean(f && f !== '🌐' && f !== '🏳️' && f !== 'un');
    }

    function getTab1InputBar() {
        const input = document.getElementById('voice-chat-input') || document.getElementById('video-chat-input');
        return input ? input.closest('.chat-input-area') : null;
    }

    function getTab1MicButton() {
        const bar = getTab1InputBar();
        if (!bar) return null;
        return bar.querySelector('button[onclick*="toggleUniversalMic"]');
    }

    function getTab1SendButton() {
        const bar = getTab1InputBar();
        if (!bar) return null;
        return bar.querySelector('button[onclick*="sendFirebaseMsg"]');
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
        return codeFix[tl] || tl;
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

    // АВТООПРЕДЕЛЕНИЕ СТРОГО ОТ ПРОФИЛЯ
    window.videoRoomResolveLang = function (userObj, manualPref = null) {
        const manualTl = window.videoRoomFixLang(manualPref);
        if (manualTl) return manualTl;

        if (userObj) {
            const byFlagEmoji = window.videoRoomLangFromFlagEmoji(userObj.flag);
            if (byFlagEmoji) return byFlagEmoji;

            const byFlagCode = window.videoRoomFixLang(userObj.flagCode);
            if (byFlagCode) return byFlagCode;

            const byPhone = window.videoRoomLangFromPhone(userObj.phone || userObj.phoneNumber || userObj.tel);
            if (byPhone) return byPhone;

            const byProfileCode = window.videoRoomFixLang(userObj.langCode || userObj.lang);
            if (byProfileCode) return byProfileCode;
        }

        const isMeObj = Boolean(userObj && window.myProfileInfo && String(userObj.id) === String(window.myProfileInfo.id));
        if (isMeObj) {
            const meFlagEl = document.getElementById('voice-me-flag');
            const byDomFlag = meFlagEl ? window.videoRoomLangFromFlagEmoji(meFlagEl.textContent) : '';
            if (byDomFlag) return byDomFlag;
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
        const path = window.getVideoRoomDbPath();
        if (path) publishMyProfileMeta(path);
    };

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

        return window.videoRoomResolveLang(window.myProfileInfo, null) || 'en';
    };

    window.videoRoomIsMicManual = function () {
        if (window.videoRoomMicLangOverride) return true;
        const saved = localStorage.getItem('hf_video_mic_lang');
        if (saved && saved !== 'auto') return true;
        const sel = document.getElementById('video-mic-lang');
        return Boolean(sel && sel.value && sel.value !== 'auto');
    };

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

    function applyPartnerFooterUI(partner) {
        if (!partner || !partner.id) return;
        const pEl = document.getElementById('voice-friend-photo');
        const fEl = document.getElementById('voice-friend-flag');
        const nEl = document.getElementById('voice-friend-name');

        if (pEl && partner.photo) pEl.src = partner.photo;
        if (fEl && isRealFlag(partner.flag)) fEl.innerText = partner.flag;
        if (nEl && partner.name) {
            nEl.removeAttribute('data-i18n');
            nEl.innerText = String(partner.name).split(' ')[0];
        }
    }

    function publishMyProfileMeta(roomPath) {
        if (!roomPath || !window.myProfileInfo || !window.myProfileInfo.id || typeof firebase === 'undefined') return;
        const me = window.myProfileInfo;
        const manualPanel = window.videoRoomGetManualPanelLang();
        const myLang = window.videoRoomResolveLang(me, manualPanel);
        const domFlagEl = document.getElementById('voice-me-flag');
        const domFlag = domFlagEl ? domFlagEl.textContent.trim() : '';

        let myFlag = '';
        if (manualPanel && window.VIDEO_LANG_MAP[manualPanel]) {
            myFlag = window.VIDEO_LANG_MAP[manualPanel].flag;
        } else if (isRealFlag(me.flag)) {
            myFlag = me.flag;
        } else if (isRealFlag(domFlag)) {
            myFlag = domFlag;
        }

        const sig = `${roomPath}|${me.id}|${myFlag}|${myLang}`;
        if (window._vrLastMetaSig === sig) return;
        window._vrLastMetaSig = sig;

        firebase.database().ref(`${roomPath}_meta/${String(me.id)}`).set({
            id: String(me.id),
            name: window.myUsername || me.name || 'User',
            photo: me.photo || '',
            flag: myFlag,
            flagCode: me.flagCode || '',
            langCode: myLang,
            phone: me.phone || me.phoneNumber || '',
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        }).catch(() => {});
    }

    window.getVideoRoomPartner = function () {
        let base = null;
        if (window.voiceFriend && window.voiceFriend.id) base = window.voiceFriend;
        else if (window.currentTargetUser && window.currentTargetUser.id) base = window.currentTargetUser;
        else if (window.currentCallerId && Array.isArray(window.participants)) {
            base = window.participants.find(p => String(p.id) === String(window.currentCallerId)) || null;
        }
        if (!base && window.currentCallerFallback && window.currentCallerFallback.id) {
            base = window.currentCallerFallback;
        }
        if (!base) return null;

        const pid = String(base.id);
        const fromList = Array.isArray(window.participants)
            ? window.participants.find(p => String(p.id) === pid)
            : null;
        const liveMeta = (window.videoRoomPartnerMeta && String(window.videoRoomPartnerMeta.id) === pid)
            ? window.videoRoomPartnerMeta
            : null;

        const merged = Object.assign({}, fromList || {}, base);
        if (liveMeta) {
            if (liveMeta.name) merged.name = liveMeta.name;
            if (liveMeta.photo) merged.photo = liveMeta.photo;
            if (isRealFlag(liveMeta.flag)) merged.flag = liveMeta.flag;
            if (liveMeta.flagCode) merged.flagCode = liveMeta.flagCode;
            if (liveMeta.langCode) merged.langCode = liveMeta.langCode;
            if (liveMeta.phone) merged.phone = liveMeta.phone;
        } else if (fromList) {
            if (!isRealFlag(merged.flag) && isRealFlag(fromList.flag)) merged.flag = fromList.flag;
            if (!merged.flagCode && fromList.flagCode) merged.flagCode = fromList.flagCode;
            if (!merged.langCode && fromList.langCode) merged.langCode = fromList.langCode;
            if (!merged.phone && (fromList.phone || fromList.phoneNumber)) {
                merged.phone = fromList.phone || fromList.phoneNumber;
            }
        }
        return merged;
    };

    window.isDirectVideoCallActive = function () {
        return window.currentActiveCallType === 'video';
    };

    // ==========================================
    // 2. БЕСКОНЕЧНАЯ ПЛАВНАЯ БЕГУЩАЯ СТРОКА
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
        if (document.getElementById('hf-video-room-v7-styles')) return;
        const style = document.createElement('style');
        style.id = 'hf-video-room-v7-styles';
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
            #hf-video-mic-slot {
                width: 100%;
                flex: 1 1 auto;
                min-height: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                pointer-events: none;
                padding: 4px 12px;
                z-index: 30;
            }
            #hf-video-mic-pill {
                position: relative;
                display: none;
                align-items: center;
                gap: 8px;
                pointer-events: auto;
                background: rgba(17, 27, 33, 0.96);
                border: 1.5px solid #ef4444;
                color: #ffffff;
                padding: 7px 14px;
                border-radius: 999px;
                box-shadow: 0 8px 26px rgba(239, 68, 68, 0.4);
                font-size: 0.76rem;
                font-weight: 700;
                max-width: 94%;
                white-space: nowrap;
            }
            #hf-video-mic-pill.active {
                display: inline-flex;
            }
            #hf-video-mic-pill .hf-mic-dot {
                width: 9px;
                height: 9px;
                border-radius: 50%;
                background: #ef4444;
                flex-shrink: 0;
                animation: hfMicPulse 1s infinite;
            }
            #hf-video-mic-pill #hf-video-mic-pill-label {
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 185px;
            }
            #hf-video-mic-pill .hf-mic-stop-btn {
                background: #ef4444;
                color: #ffffff;
                border: none;
                border-radius: 999px;
                padding: 3px 11px;
                font-size: 0.72rem;
                font-weight: 800;
                cursor: pointer;
                flex-shrink: 0;
            }
            .hf-tab1-mic-live {
                background: #dc2626 !important;
                color: #ffffff !important;
                border-color: #ef4444 !important;
                box-shadow: 0 0 14px rgba(239, 68, 68, 0.7);
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
        if (containerWidth <= 0 || textWidth <= 0) return;

        if (!marqueeState.initialized) {
            marqueeState.initialized = true;
            marqueeState.currentHtml = textEl.innerHTML;
            marqueeState.offsetX = containerWidth;
        }

        marqueeState.offsetX -= marqueeState.speedPxPerSec * dt;

        if (marqueeState.offsetX < -(textWidth + 24)) {
            marqueeState.passCount += 1;
            if (window.videoRoomQueue.length > 0) {
                loadNextMarqueeItem(true);
            } else {
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
    // 3. РАЗДЕЛЬНЫЕ ВЕТКИ FIREBASE (video_rooms / audio_rooms) И ОТПРАВКА
    // ==========================================
    window.getVideoRoomDbPath = function () {
        const partner = window.getVideoRoomPartner();
        if (partner && partner.id && window.myProfileInfo && window.myProfileInfo.id) {
            const pair = [String(window.myProfileInfo.id), String(partner.id)].sort();
            const prefix = (window.currentActiveCallType === 'video') ? 'video_rooms' : 'audio_rooms';
            return `${prefix}/${pair[0]}_${pair[1]}`;
        }
        return null;
    };

    window.sendVideoRoomPayload = async function (rawText, sourceType = 'keyboard', isAIAudio = false) {
        const cleanText = String(rawText || '').trim();
        if (!cleanText) return;

        window.syncVideoRoomListener();

        const targetDbRoom = window.getVideoRoomDbPath();
        if (!targetDbRoom) {
            if (window.showToast) window.showToast('Звонок', 'Выберите собеседника для перевода', '', '');
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

        const domFlagEl = document.getElementById('voice-me-flag');
        const domFlag = domFlagEl ? domFlagEl.textContent.trim() : '';
        const manualMeta = manualLang ? window.VIDEO_LANG_MAP[manualLang] : null;

        const activeFlag = manualMeta
            ? manualMeta.flag
            : (isRealFlag(window.myProfileInfo && window.myProfileInfo.flag)
                ? window.myProfileInfo.flag
                : (isRealFlag(domFlag) ? domFlag : ''));
        const activeFlagCode = manualMeta
            ? manualMeta.flagCode
            : ((window.myProfileInfo && window.myProfileInfo.flagCode) || '');

        let translatedText = cleanText;
        let detectedLang = myTl;

        if (targetTl) {
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
                sourceType: sourceType,
                isAIAudio: Boolean(isAIAudio),
                langCode: detectedLang || myTl,
                profileLang: window.videoRoomResolveLang(window.myProfileInfo, null),
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

        if (window.playSafeSound && window.sndMsg) {
            window.playSafeSound(window.sndMsg);
        }

        await window.sendVideoRoomPayload(rawText, 'keyboard', false);
    };

    // ==========================================
    // 4. БЕСКОНЕЧНЫЕ МИКРОФОНЫ (TEXT + AI-AUDIO) + АНТИ-ЭХО
    // ==========================================
    function ensureVideoMicPopupInsideTab1() {
        const bar = getTab1InputBar();
        const popup = document.getElementById('video-mic-popup');
        if (!bar || !popup) return;
        if (popup.parentNode !== bar) {
            bar.appendChild(popup);
        }
        popup.style.position = 'absolute';
        popup.style.bottom = '62px';
        popup.style.right = '10px';
        popup.style.zIndex = '99999';
    }

    function ensureMicIndicatorPill() {
        injectVideoRoomStyles();
        let pill = document.getElementById('hf-video-mic-pill');
        if (!pill) {
            pill = document.createElement('div');
            pill.id = 'hf-video-mic-pill';
            pill.innerHTML = `
                <span class="hf-mic-dot"></span>
                <span id="hf-video-mic-pill-label">Listening...</span>
                <button type="button" class="hf-mic-stop-btn" onclick="event.stopPropagation(); window.stopVideoRoomMic(false)">STOP</button>
            `;
        }

        const remoteVid = document.getElementById('direct-remote-video');
        const friendPhoto = document.getElementById('voice-friend-photo');
        const videoRow = (remoteVid && remoteVid.parentElement) ? remoteVid.parentElement.parentElement : null;

        let avatarsFooter = friendPhoto ? friendPhoto.closest('.mt-auto') : null;
        if (!avatarsFooter && friendPhoto && videoRow && videoRow.parentNode) {
            let cur = friendPhoto;
            while (cur && cur.parentNode && cur.parentNode !== videoRow.parentNode) {
                cur = cur.parentNode;
            }
            if (cur && cur.parentNode === videoRow.parentNode) {
                avatarsFooter = cur;
            }
        }

        if (videoRow && avatarsFooter && videoRow.parentNode === avatarsFooter.parentNode) {
            const tabContainer = videoRow.parentNode;
            let slot = document.getElementById('hf-video-mic-slot');
            if (!slot) {
                slot = document.createElement('div');
                slot.id = 'hf-video-mic-slot';
            }
            if (slot.parentNode !== tabContainer) {
                tabContainer.insertBefore(slot, avatarsFooter);
            }
            if (pill.parentNode !== slot) slot.appendChild(pill);
            return pill;
        }

        const bar = getTab1InputBar() || document.body;
        if (pill.parentNode !== bar) bar.appendChild(pill);
        return pill;
    }

    function updateMicIndicatorPill(livePreview = '') {
        const pill = ensureMicIndicatorPill();
        const label = document.getElementById('hf-video-mic-pill-label');
        const micBtn = getTab1MicButton();

        if (!window.videoRoomMicActive) {
            pill.classList.remove('active');
            if (micBtn) micBtn.classList.remove('hf-tab1-mic-live');
            return;
        }

        const micTl = window.videoRoomGetMicLang();
        const isManual = window.videoRoomIsMicManual();
        const manualMeta = isManual ? window.VIDEO_LANG_MAP[micTl] : null;
        const flag = manualMeta
            ? manualMeta.flag
            : (isRealFlag(window.myProfileInfo && window.myProfileInfo.flag)
                ? window.myProfileInfo.flag
                : ((window.VIDEO_LANG_MAP[micTl] && window.VIDEO_LANG_MAP[micTl].flag) || ''));
        const modeLabel = (window.videoRoomMicMode === 'ai-audio') ? 'AI' : 'Text';

        if (label) {
            if (window._isPausedForAITTS) {
                label.textContent = `${flag} 🔊 AI...`.trim();
            } else {
                label.textContent = livePreview
                    ? `${flag} ${livePreview}`.trim()
                    : `${flag} ${modeLabel} • ON`.trim();
            }
        }
        pill.classList.add('active');
        if (micBtn) micBtn.classList.add('hf-tab1-mic-live');
    }

    function scheduleRecognitionRestart(delayMs = 180) {
        if (!window.videoRoomMicActive || window._isPausedForAITTS) return;
        clearTimeout(window.videoRoomMicRestartTimer);
        window.videoRoomMicRestartTimer = setTimeout(() => {
            window.videoRoomMicRestartTimer = null;
            launchRecognitionCycle();
        }, delayMs);
    }

    // Защита от эха: короткая пауза на время озвучки перевода, затем мгновенное продолжение бесконечного цикла
    window.onAIVoiceStart = function () {
        if (!window.videoRoomMicActive) return;
        window._isPausedForAITTS = true;
        clearTimeout(window.videoRoomMicRestartTimer);
        window.videoRoomMicRestartTimer = null;

        if (window.videoRoomRecognition) {
            try { window.videoRoomRecognition.onend = null; } catch (e) {}
            try { window.videoRoomRecognition.abort(); } catch (e) {}
            window.videoRoomRecognition = null;
        }
        updateMicIndicatorPill();
    };

    window.onAIVoiceEnd = function () {
        const wasPaused = window._isPausedForAITTS;
        window._isPausedForAITTS = false;
        if (!window.videoRoomMicActive) return;

        updateMicIndicatorPill();
        if (wasPaused && !window.videoRoomRecognition) {
            scheduleRecognitionRestart(260);
        }
    };

    function launchRecognitionCycle() {
        window.videoRoomMicRestartTimer = null;
        if (!window.videoRoomMicActive || window._isPausedForAITTS) return;

        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;

        if (window.videoRoomRecognition) {
            try { window.videoRoomRecognition.onend = null; } catch (e) {}
            try { window.videoRoomRecognition.onerror = null; } catch (e) {}
            try { window.videoRoomRecognition.abort(); } catch (e) {}
            window.videoRoomRecognition = null;
        }

        try {
            const rec = new SpeechRec();
            const micTl = window.videoRoomGetMicLang();
            const meta = window.VIDEO_LANG_MAP[micTl];

            rec.lang = meta ? meta.speech : (navigator.language || 'ru-RU');
            rec.continuous = false;
            rec.interimResults = true;
            rec.maxAlternatives = 1;

            rec.onresult = (event) => {
                if (window._isPausedForAITTS) return;
                if (!event.results || !event.results.length) return;
                let finalText = '';
                let interimText = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const chunk = (event.results[i][0] && event.results[i][0].transcript) || '';
                    if (event.results[i].isFinal) {
                        finalText += ' ' + chunk;
                    } else {
                        interimText += ' ' + chunk;
                    }
                }

                interimText = interimText.trim();
                finalText = finalText.trim();

                if (interimText) {
                    updateMicIndicatorPill(interimText);
                }

                if (finalText) {
                    updateMicIndicatorPill('');
                    const now = Date.now();
                    if (finalText === lastMicTranscript && (now - lastMicTranscriptAt) < 1200) return;
                    lastMicTranscript = finalText;
                    lastMicTranscriptAt = now;

                    const isAI = (window.videoRoomMicMode === 'ai-audio');
                    window.sendVideoRoomPayload(finalText, 'voice', isAI);
                }
            };

            rec.onerror = (event) => {
                const err = event && event.error;
                if (err === 'not-allowed' || err === 'service-not-allowed') {
                    if (window.showToast) window.showToast('Микрофон', 'Разрешите доступ к микрофону в браузере', '', '');
                    window.stopVideoRoomMic(false);
                    return;
                }
                // Все временные ошибки (no-speech, network, audio-capture, aborted) — мягко перезапускаем цикл
                if (window.videoRoomMicActive && !window._isPausedForAITTS) {
                    window.videoRoomRecognition = null;
                    scheduleRecognitionRestart(err === 'audio-capture' ? 450 : 220);
                }
            };

            rec.onend = () => {
                window.videoRoomRecognition = null;
                if (window.videoRoomMicActive && !window._isPausedForAITTS) {
                    updateMicIndicatorPill('');
                    scheduleRecognitionRestart(160);
                }
            };

            window.videoRoomRecognition = rec;
            rec.start();
        } catch (e) {
            window.videoRoomRecognition = null;
            if (window.videoRoomMicActive && !window._isPausedForAITTS) {
                scheduleRecognitionRestart(420);
            }
        }
    }

    window.startVideoRoomMic = async function (mode = 'text') {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            alert('Этот браузер не поддерживает распознавание речи.');
            return;
        }

        clearInterval(window._vrPopupCloseWatcher);
        window.videoRoomMicMode = (mode === 'ai-audio') ? 'ai-audio' : 'text';

        if (window.videoRoomMicActive) {
            updateMicIndicatorPill();
            return;
        }

        window.videoRoomMicActive = true;
        window._isPausedForAITTS = false;
        window.syncVideoRoomListener();
        updateMicIndicatorPill();

        const wasAlreadyPaused = Boolean(window._agoraPausedForTranslation);
        if (typeof window.pauseAgoraMicForTranslation === 'function') {
            await window.pauseAgoraMicForTranslation();
            await new Promise(r => setTimeout(r, wasAlreadyPaused ? 120 : 380));
        }

        if (!window.videoRoomMicActive) return;

        launchRecognitionCycle();

        // Страховочный watchdog: держит бесконечный микрофон живым при любых паузах на мобильных
        clearInterval(window.videoRoomMicWatchdog);
        window.videoRoomMicWatchdog = setInterval(() => {
            if (window.videoRoomMicActive && !window._isPausedForAITTS && !window.videoRoomRecognition && !window.videoRoomMicRestartTimer) {
                launchRecognitionCycle();
            }
        }, 2500);
    };

    window.stopVideoRoomMic = async function (skipResumeAgora = false) {
        window.videoRoomMicActive = false;
        window._isPausedForAITTS = false;
        clearInterval(window._vrPopupCloseWatcher);

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

        if (skipResumeAgora) {
            window._agoraPausedForTranslation = false;
        } else if (typeof window.resumeAgoraMicAfterTranslation === 'function') {
            await window.resumeAgoraMicAfterTranslation();
        }
    };

    window.toggleVideoRoomMic = function (mode = 'text') {
        if (window.videoRoomMicActive) {
            window.stopVideoRoomMic(false);
        } else {
            window.startVideoRoomMic(mode);
        }
    };

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

        if (!isMe && data.userId) {
            const incomingLang = window.videoRoomFixLang(data.profileLang || data.flagCode || window.videoRoomLangFromFlagEmoji(data.flag));
            if (incomingLang || isRealFlag(data.flag)) {
                const updatedMeta = Object.assign({}, window.videoRoomPartnerMeta || {}, {
                    id: String(data.userId),
                    name: data.name || (partner && partner.name) || 'User',
                    photo: data.photo || (partner && partner.photo) || '',
                    langCode: incomingLang || (window.videoRoomPartnerMeta && window.videoRoomPartnerMeta.langCode) || '',
                    flag: isRealFlag(data.flag) ? data.flag : ((window.videoRoomPartnerMeta && window.videoRoomPartnerMeta.flag) || ''),
                    flagCode: data.flagCode || ''
                });
                window.videoRoomPartnerMeta = updatedMeta;
                applyPartnerFooterUI(updatedMeta);
            }
        }

        const senderText = String(data.originalText || data.text || '').trim();
        let receiverText = String(data.text || senderText).trim();

        let senderPhoto, senderFlag, senderName;
        let receiverPhoto, receiverFlag, receiverName;
        let myReadTl = 'en';

        if (isMe) {
            senderPhoto = (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=U';
            senderFlag = isRealFlag(data.flag) ? data.flag : ((window.myProfileInfo && isRealFlag(window.myProfileInfo.flag)) ? window.myProfileInfo.flag : '');
            senderName = (window.myUsername || 'Me').split(' ')[0];

            receiverPhoto = partner ? (partner.photo || 'https://ui-avatars.com/api/?name=U') : 'https://ui-avatars.com/api/?name=U';
            receiverFlag = (partner && isRealFlag(partner.flag)) ? partner.flag : '';
            receiverName = partner ? (partner.name || 'User').split(' ')[0] : 'Partner';
        } else {
            senderPhoto = data.photo || (partner && partner.photo) || 'https://ui-avatars.com/api/?name=U';
            senderFlag = isRealFlag(data.flag) ? data.flag : ((partner && isRealFlag(partner.flag)) ? partner.flag : '');
            senderName = (data.name || (partner && partner.name) || 'User').split(' ')[0];

            receiverPhoto = (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=U';
            receiverName = (window.myUsername || 'Me').split(' ')[0];

            const manualPanel = window.videoRoomGetManualPanelLang();
            myReadTl = window.videoRoomResolveLang(window.myProfileInfo, manualPanel);
            const manualMeta = manualPanel ? window.VIDEO_LANG_MAP[manualPanel] : null;
            const domFlagEl = document.getElementById('voice-me-flag');
            const domFlag = domFlagEl ? domFlagEl.textContent.trim() : '';

            receiverFlag = manualMeta
                ? manualMeta.flag
                : (isRealFlag(window.myProfileInfo && window.myProfileInfo.flag)
                    ? window.myProfileInfo.flag
                    : (isRealFlag(domFlag) ? domFlag : ''));

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

        const senderFlagPart = senderFlag ? `${escapeHtml(senderFlag)} ` : '';
        const receiverFlagPart = receiverFlag ? `${escapeHtml(receiverFlag)} ` : '';

        const html =
            `<span class="inline-flex items-center">` +
                `<img src="${escapeHtml(senderPhoto)}" class="w-5 h-5 rounded-full border border-[#2a3942] mr-1 object-cover shadow-sm">` +
                `<span class="text-white font-bold mr-1">${escapeHtml(senderName)}:</span>` +
                `<span class="text-[#e9edef] mr-1">${senderFlagPart}${escapeHtml(senderText)}</span>` +
                `${modeIcon}` +
                `<img src="${escapeHtml(receiverPhoto)}" class="w-5 h-5 rounded-full border border-yellow-400 mr-1 object-cover">` +
                `<span class="text-white font-bold mr-1">${escapeHtml(receiverName)}:</span>` +
                `<span class="text-yellow-400 font-bold">${receiverFlagPart}${escapeHtml(receiverText)}</span>` +
            `</span>`;

        window.pushToVideoMarquee(html, data.sourceType || 'keyboard');

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

        publishMyProfileMeta(desiredPath);

        const livePartner = window.getVideoRoomPartner();
        if (livePartner && livePartner.id) {
            applyPartnerFooterUI(livePartner);

            const metaPath = `${desiredPath}_meta/${String(livePartner.id)}`;
            if (window._vrActiveMetaPath !== metaPath) {
                if (window._vrActiveMetaPath && window._vrActiveMetaListener) {
                    firebase.database().ref(window._vrActiveMetaPath).off('value', window._vrActiveMetaListener);
                }
                window.videoRoomPartnerMeta = null;
                window._vrActiveMetaPath = metaPath;
                window._vrActiveMetaListener = firebase.database().ref(metaPath).on('value', (snap) => {
                    const meta = snap.val();
                    if (!meta || !meta.id) return;
                    window.videoRoomPartnerMeta = meta;
                    applyPartnerFooterUI(meta);
                });
            }
        }

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
    // 6. ПРЯМАЯ ПРИВЯЗКА К КНОПКАМ ВКЛАДКИ 1
    // ==========================================
    function bindTab1DirectControls() {
        const sendBtn = getTab1SendButton();
        if (sendBtn && !sendBtn.dataset.hfTab1Bound) {
            sendBtn.dataset.hfTab1Bound = '1';
            sendBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                window.sendVideoRoomMsg();
            }, true);
        }

        const micBtn = getTab1MicButton();
        if (micBtn && !micBtn.dataset.hfTab1Bound) {
            micBtn.dataset.hfTab1Bound = '1';
            micBtn.addEventListener('click', (e) => {
                if (window.videoRoomMicActive) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    window.stopVideoRoomMic(false);
                    return;
                }
                ensureVideoMicPopupInsideTab1();

                if (typeof window.pauseAgoraMicForTranslation === 'function') {
                    window.pauseAgoraMicForTranslation();
                }

                clearInterval(window._vrPopupCloseWatcher);
                const openedAt = Date.now();
                window._vrPopupCloseWatcher = setInterval(() => {
                    if (window.videoRoomMicActive) {
                        clearInterval(window._vrPopupCloseWatcher);
                        return;
                    }
                    if (Date.now() - openedAt < 450) return;
                    const popup = document.getElementById('video-mic-popup');
                    const cs = popup ? getComputedStyle(popup) : null;
                    const isHidden = !popup || !cs || cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0 || cs.pointerEvents === 'none';
                    if (isHidden) {
                        clearInterval(window._vrPopupCloseWatcher);
                        if (typeof window.resumeAgoraMicAfterTranslation === 'function') {
                            window.resumeAgoraMicAfterTranslation();
                        }
                    }
                }, 350);
            }, true);
        }

        ensureVideoMicPopupInsideTab1();
        ensureMicIndicatorPill();
    }

    function initVideoRoomEngine() {
        startInfiniteMarqueeEngine();
        bindTab1DirectControls();

        if (typeof window.applyCallRoomModeUI === 'function') {
            window.applyCallRoomModeUI(window.currentActiveCallType === 'video');
        }

        setInterval(() => {
            window.syncVideoRoomListener();
            bindTab1DirectControls();
        }, 1000);

        document.addEventListener('keydown', (e) => {
            if (!e.key || e.key !== 'Enter' || !document.activeElement) return;
            const activeId = document.activeElement.id;
            if (activeId === 'voice-chat-input' || activeId === 'video-chat-input') {
                e.preventDefault();
                e.stopImmediatePropagation();
                window.sendVideoRoomMsg();
            }
        }, true);

        const hookSend = setInterval(() => {
            if (typeof window.sendFirebaseMsg === 'function' && !window._tab1UnifiedSendHooked) {
                const origSend = window.sendFirebaseMsg;
                window.sendFirebaseMsg = function () {
                    if (window.currentMicInputTarget === 'voice-chat-input' || window.currentMicInputTarget === 'video-chat-input') {
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

    window.addEventListener('load', () => {
        setTimeout(bindTab1DirectControls, 700);
    });
})();

// ==========================================
// ФАЙЛ: video-room.js
// АВТОНОМНЫЙ МОДУЛЬ ВИДЕОКОМНАТЫ 1-НА-1 (ТОЛЬКО ВИДЕО)
// ==========================================

window.videoRoomQueue = [];
window.isVideoMarqueeBusy = false;
window.videoRoomActiveDbPath = null;
window.videoRoomActiveListener = null;
window.videoRoomListenerStartedAt = 0;
window.videoRoomServerOffset = 0;
window.videoRoomSeenKeys = new Set();

window.videoRoomRecognition = null;
window.videoRoomMicActive = false;
window.videoRoomMicRestartTimer = null;
window.videoRoomManualLang = null;
window.videoRoomMicLangOverride = null;

// --- СПРАВОЧНИК 13 ЯЗЫКОВ (ФЛАГИ, ТЕЛЕФОННЫЕ КОДЫ, ЛОКАЛИ РЕЧИ) ---
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

window.videoRoomFixLang = function(code) {
    if (!code) return 'en';
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

window.videoRoomLangFromFlagEmoji = function(flag) {
    if (!flag) return '';
    const emojiMap = {
        '🇬🇧': 'en', '🇺🇸': 'en', '🇷🇺': 'ru', '🇦🇿': 'az',
        '🇹🇷': 'tr', '🇩🇪': 'de', '🇰🇿': 'kk', '🇦🇪': 'ar',
        '🇸🇦': 'ar', '🇮🇹': 'it', '🇪🇸': 'es', '🇫🇷': 'fr',
        '🇵🇹': 'pt', '🇧🇷': 'pt', '🇯🇵': 'ja', '🇨🇳': 'zh'
    };
    return emojiMap[String(flag).trim()] || '';
};

window.videoRoomLangFromPhone = function(phone) {
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

// ПРИОРИТЕТ ЯЗЫКА: 1) Панель (если вручную) -> 2) Флаг -> 3) Телефон -> 4) langCode -> en
window.videoRoomResolveLang = function(userObj, manualPref = null) {
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

    if (window.getSmartLang && userObj) {
        const smart = window.videoRoomFixLang(window.getSmartLang(userObj));
        if (smart) return smart;
    }

    return 'en';
};

window.videoRoomGetManualPanelLang = function() {
    if (window.videoRoomManualLang && window.videoRoomManualLang !== 'auto') {
        return window.videoRoomManualLang;
    }
    if (typeof window.getManualLangPref === 'function') {
        const pref = window.getManualLangPref(true, false);
        if (pref && pref !== 'auto') return pref;
    }
    return null;
};

window.setVideoRoomLang = function(langCode) {
    window.videoRoomManualLang = (!langCode || langCode === 'auto') ? null : window.videoRoomFixLang(langCode);
};

window.setVideoRoomMicLang = function(langCode) {
    window.videoRoomMicLangOverride = (!langCode || langCode === 'auto') ? null : window.videoRoomFixLang(langCode);
    if (window.videoRoomMicActive) {
        window.stopVideoRoomMic();
        setTimeout(() => window.startVideoRoomMic(), 250);
    }
};

// Язык микрофона — СТРОГО из своего меню (#plus-mic-lang), без профиля и экосистемы
window.videoRoomGetMicLang = function() {
    if (window.videoRoomMicLangOverride) return window.videoRoomMicLangOverride;

    const selectors = [
        '#plus-mic-lang', '#video-mic-lang', '#mic-lang-select',
        '#voice-mic-lang', '#micLangSelect', 'select[data-mic-lang]'
    ];
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.value && el.value !== 'auto') {
            const parsed = window.videoRoomFixLang(el.value);
            if (parsed) return parsed;
        }
    }
    if (window.selectedMicLang && window.selectedMicLang !== 'auto') {
        const parsed = window.videoRoomFixLang(window.selectedMicLang);
        if (parsed) return parsed;
    }
    return window.videoRoomFixLang(navigator.language) || 'ru';
};

// Единый чистый переводчик без двойного перевода
window.videoRoomTranslate = async function(text, targetTl) {
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

// Определяем активного собеседника видеокомнаты
window.getVideoRoomPartner = function() {
    if (window.voiceFriend && window.voiceFriend.id) return window.voiceFriend;
    if (window.currentTargetUser && window.currentTargetUser.id) return window.currentTargetUser;
    if (window.currentCallerId && Array.isArray(window.participants)) {
        const found = window.participants.find(p => String(p.id) === String(window.currentCallerId));
        if (found) return found;
    }
    if (window.currentCallerFallback && window.currentCallerFallback.id) return window.currentCallerFallback;
    return null;
};

// Активен ли сейчас режим видеокомнаты 1-на-1
window.isDirectVideoCallActive = function() {
    const remoteVid = document.getElementById('direct-remote-video');
    const localVid = document.getElementById('direct-local-video');
    const hasVisibleVideo =
        (remoteVid && !remoteVid.classList.contains('hidden')) ||
        (localVid && !localVid.classList.contains('hidden'));
    const hasVideoMode = Boolean(
        window.localVideoTrack ||
        window.myLastOutgoingCallType === 'video' ||
        window.currentIncomingCallType === 'video'
    );
    const hasVideoInputFocused = document.activeElement && document.activeElement.id === 'video-chat-input';
    return hasVisibleVideo || hasVideoInputFocused || (window.currentIndex === 1 && hasVideoMode);
};

// --- 1. ОЧЕРЕДЬ БЕГУЩЕЙ СТРОКИ ВИДЕОКОМНАТЫ ---
window.pushToVideoMarquee = function(htmlText, type = 'text') {
    if (!htmlText) return;
    window.videoRoomQueue.push({ text: htmlText, type: type });
    window.processVideoMarquee();
};

window.processVideoMarquee = function() {
    if (window.isVideoMarqueeBusy || window.videoRoomQueue.length === 0) return;

    window.isVideoMarqueeBusy = true;
    const nextMessage = window.videoRoomQueue.shift();

    const marqueeElement =
        document.getElementById('video-info-marquee') ||
        document.getElementById('voice-info-marquee');

    if (marqueeElement && window.isVoiceMarqueeEnabled !== false) {
        marqueeElement.innerHTML = nextMessage.text;
        marqueeElement.style.animation = 'none';
        void marqueeElement.offsetWidth;
        marqueeElement.style.animation = 'scroll-text 8s linear forwards';

        setTimeout(() => {
            window.isVideoMarqueeBusy = false;
            window.processVideoMarquee();
        }, 8000);
    } else {
        window.isVideoMarqueeBusy = false;
    }
};

// --- 2. ОБЩИЙ ПУТЬ КОМНАТЫ ПО ДВУМ ID (ОДИНАКОВЫЙ У ОБОИХ УЧАСТНИКОВ) ---
window.getVideoRoomDbPath = function() {
    const partner = window.getVideoRoomPartner();
    if (partner && partner.id && window.myProfileInfo && window.myProfileInfo.id) {
        const pair = [String(window.myProfileInfo.id), String(partner.id)].sort();
        return `video_rooms/${pair[0]}_${pair[1]}`;
    }
    return null;
};

// --- 3. ОБЩИЙ ОТПРАВЩИК (РАЗДЕЛЬНО ДЛЯ КЛАВИАТУРЫ И МИКРОФОНА) ---
window.sendVideoRoomPayload = async function(rawText, sourceType = 'keyboard') {
    const cleanText = String(rawText || '').trim();
    if (!cleanText) return;

    const targetDbRoom = window.getVideoRoomDbPath();
    if (!targetDbRoom) {
        console.warn('VideoRoom: не выбран собеседник для стыковки ID.');
        return;
    }

    const partner = window.getVideoRoomPartner();
    const manualLang = (sourceType === 'voice')
        ? window.videoRoomGetMicLang()
        : window.videoRoomGetManualPanelLang();

    const myTl = window.videoRoomResolveLang(window.myProfileInfo, manualLang);
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

    // Переводим ОДИН РАЗ напрямую из оригинала в язык собеседника (sl=auto)
    const { text: translatedText, detectedLang } = await window.videoRoomTranslate(cleanText, targetTl);

    try {
        firebase.database().ref(targetDbRoom).push({
            userId: safeId,
            name: safeName,
            originalText: cleanText,
            text: translatedText || cleanText,
            sourceType: sourceType, // 'keyboard' или 'voice'
            langCode: detectedLang || myTl,
            targetLang: targetTl,
            sessionId: window.mySessionId || 'sess',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            photo: safePhoto,
            flag: activeFlag,
            flagCode: activeFlagCode,
            isVoiceRoomMsg: false,
            isVideoRoomMsg: true,
            isConfMsg: false
        });
    } catch (err) {
        console.error('Video Room send error:', err);
    }
};

// ОТПРАВКА С КЛАВИАТУРЫ В БЕГУЩУЮ СТРОКУ ВИДЕОКОМНАТЫ
window.sendVideoRoomMsg = async function() {
    const inputField =
        document.getElementById('video-chat-input') ||
        document.getElementById('voice-chat-input');
    if (!inputField) return;

    const rawText = inputField.value.trim();
    if (!rawText) return;
    inputField.value = '';

    await window.sendVideoRoomPayload(rawText, 'keyboard');
};

// --- 4. ГОЛОСОВОЙ МИКРОФОН ВИДЕОКОМНАТЫ (АВТОНОМНЫЙ + ОБХОД AGORA) ---
window.startVideoRoomMic = async function() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
        console.warn('VideoRoom Mic: SpeechRecognition не поддерживается в этом браузере.');
        return;
    }
    if (window.videoRoomMicActive) return;

    // Временно глушим микрофон Agora, чтобы Android/планшет отдал канал распознаванию речи
    if (window.localAudioTrack) {
        try { await window.localAudioTrack.setMuted(true); } catch (e) {}
    }

    window.videoRoomMicActive = true;
    window.syncVideoRoomListener();

    const launchRecognition = () => {
        if (!window.videoRoomMicActive) return;
        if (window.isMyMicMuted) {
            window.videoRoomMicRestartTimer = setTimeout(launchRecognition, 800);
            return;
        }

        try {
            const rec = new SpeechRec();
            const micTl = window.videoRoomGetMicLang();
            const meta = window.VIDEO_LANG_MAP[micTl];

            rec.lang = meta ? meta.speech : (navigator.language || 'ru-RU');
            rec.continuous = false; // На Android/планшетах без continuous работает стабильнее
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
                if (spokenText && !window.isMyMicMuted) {
                    window.sendVideoRoomPayload(spokenText, 'voice');
                }
            };

            rec.onerror = (event) => {
                const err = event && event.error;
                if (err === 'not-allowed' || err === 'service-not-allowed') {
                    console.warn('VideoRoom Mic: нет доступа к микрофону:', err);
                    window.videoRoomMicActive = false;
                }
            };

            rec.onend = () => {
                window.videoRoomRecognition = null;
                if (window.videoRoomMicActive) {
                    clearTimeout(window.videoRoomMicRestartTimer);
                    window.videoRoomMicRestartTimer = setTimeout(launchRecognition, 350);
                }
            };

            window.videoRoomRecognition = rec;
            rec.start();
        } catch (e) {
            console.warn('VideoRoom Mic start error:', e);
            if (window.videoRoomMicActive) {
                clearTimeout(window.videoRoomMicRestartTimer);
                window.videoRoomMicRestartTimer = setTimeout(launchRecognition, 1000);
            }
        }
    };

    launchRecognition();
};

window.stopVideoRoomMic = async function() {
    window.videoRoomMicActive = false;
    if (window.videoRoomMicRestartTimer) {
        clearTimeout(window.videoRoomMicRestartTimer);
        window.videoRoomMicRestartTimer = null;
    }
    if (window.videoRoomRecognition) {
        try { window.videoRoomRecognition.onend = null; } catch (e) {}
        try { window.videoRoomRecognition.stop(); } catch (e) {}
        window.videoRoomRecognition = null;
    }
    // Возвращаем микрофон обратно в Agora
    if (window.localAudioTrack && !window.isMyMicMuted) {
        try { await window.localAudioTrack.setMuted(false); } catch (e) {}
    }
};

window.toggleVideoRoomMic = function() {
    if (window.videoRoomMicActive) {
        window.stopVideoRoomMic();
    } else {
        window.startVideoRoomMic();
    }
};

// --- 5. СЛУШАТЕЛЬ FIREBASE ВИДЕОКОМНАТЫ 1-НА-1 ---
window.handleVideoRoomMessage = async function(snapshot) {
    const data = snapshot.val();
    if (!data || !data.isVideoRoomMsg) return;

    if (window.videoRoomSeenKeys.has(snapshot.key)) return;
    window.videoRoomSeenKeys.add(snapshot.key);

    // Защита от старых сообщений с учетом сдвига часов сервера
    const serverNow = Date.now() + (window.videoRoomServerOffset || 0);
    if (data.timestamp) {
        if (window.videoRoomListenerStartedAt && data.timestamp < (window.videoRoomListenerStartedAt - 5000)) return;
        if ((serverNow - data.timestamp) > 60000) return;
    }

    const myId = window.myProfileInfo ? String(window.myProfileInfo.id) : '';
    const isMe = (data.sessionId && data.sessionId === window.mySessionId) || (myId && String(data.userId) === myId);
    const partner = window.getVideoRoomPartner();

    const senderText = data.originalText || data.text || '';
    let receiverText = data.text || senderText;

    let senderPhoto, senderFlag, senderName;
    let receiverPhoto, receiverFlag, receiverName;

    if (isMe) {
        senderPhoto = (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=U';
        senderFlag = data.flag || (window.myProfileInfo && window.myProfileInfo.flag) || '🌐';
        senderName = (window.myUsername || 'Me').split(' ')[0];

        const targetTl = data.targetLang || window.videoRoomResolveLang(partner, null);
        const targetMeta = window.VIDEO_LANG_MAP[targetTl];
        receiverPhoto = partner ? (partner.photo || 'https://ui-avatars.com/api/?name=U') : 'https://ui-avatars.com/api/?name=U';
        receiverFlag = (partner && partner.flag) || (targetMeta ? targetMeta.flag : '🌐');
        receiverName = partner ? (partner.name || 'User').split(' ')[0] : 'Video';
    } else {
        senderPhoto = data.photo || (partner && partner.photo) || 'https://ui-avatars.com/api/?name=U';
        senderFlag = data.flag || (partner && partner.flag) || '🌐';
        senderName = (data.name || (partner && partner.name) || 'User').split(' ')[0];

        receiverPhoto = (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=U';
        receiverName = (window.myUsername || 'Me').split(' ')[0];

        // Язык чтения на моем устройстве: Панель -> Флаг -> Телефон
        const manualPanel = window.videoRoomGetManualPanelLang();
        const myReadTl = window.videoRoomResolveLang(window.myProfileInfo, manualPanel);
        const myReadMeta = window.VIDEO_LANG_MAP[myReadTl];

        receiverFlag = (manualPanel && myReadMeta)
            ? myReadMeta.flag
            : ((window.myProfileInfo && window.myProfileInfo.flag) || (myReadMeta ? myReadMeta.flag : '🌐'));

        // Если отправитель перевел не на мой текущий язык панели — переводим на лету под мою панель
        const alreadyInMyLang = data.targetLang && window.videoRoomFixLang(data.targetLang) === myReadTl && data.text;
        const sourceSameAsMyLang = data.langCode && window.videoRoomFixLang(data.langCode) === myReadTl;

        if (sourceSameAsMyLang) {
            receiverText = senderText;
        } else if (!alreadyInMyLang && senderText) {
            const res = await window.videoRoomTranslate(senderText, myReadTl);
            receiverText = res.text || receiverText;
        }
    }

    const modeIcon = data.sourceType === 'voice'
        ? '<i class="fa-solid fa-microphone text-yellow-400 mx-2 text-[0.65rem] animate-pulse"></i>'
        : '<i class="fa-solid fa-video text-yellow-400 mx-2 text-[0.65rem] animate-pulse"></i>';

    const html = `<div class="flex items-center"><img src="${senderPhoto}" class="w-5 h-5 rounded-full border border-[#2a3942] mr-1 object-cover shadow-sm"><span class="text-white font-bold mr-1">${senderName}:</span><span class="text-[#e9edef] mr-2">${senderFlag} ${senderText}</span> ${modeIcon} <img src="${receiverPhoto}" class="w-5 h-5 rounded-full border border-yellow-400 mr-1 object-cover"><span class="text-white font-bold mr-1">${receiverName}:</span><span class="text-yellow-400 font-bold">${receiverFlag} ${receiverText}</span></div>`;

    window.pushToVideoMarquee(html, data.sourceType || 'keyboard');
};

window.syncVideoRoomListener = function() {
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

// --- 6. АВТОНОМНЫЕ ПЕРЕХВАТЫ ДЛЯ ВИДЕОКОМНАТЫ (КЛАВИАТУРА + ГОЛОСОВОЙ МИКРОФОН) ---
(function initVideoRoomAutonomousHooks() {
    setInterval(() => { window.syncVideoRoomListener(); }, 1000);

    // Перехват Enter в строке ввода видеокомнаты
    document.addEventListener('keydown', (e) => {
        if (!e.key || e.key !== 'Enter' || !document.activeElement) return;
        const activeId = document.activeElement.id;
        if (activeId === 'video-chat-input' || (activeId === 'voice-chat-input' && window.isDirectVideoCallActive())) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (window.playSafeSound && window.sndMsg) window.playSafeSound(window.sndMsg);
            window.sendVideoRoomMsg();
        }
    }, true);

    // Перехват кнопки отправки (sendFirebaseMsg) только когда активна видеокомната
    const hookSend = setInterval(() => {
        if (typeof window.sendFirebaseMsg === 'function' && !window._videoOnlySendHooked) {
            const origSend = window.sendFirebaseMsg;
            window.sendFirebaseMsg = function() {
                if (window.currentIndex === 1 && window.isDirectVideoCallActive()) {
                    return window.sendVideoRoomMsg();
                }
                return origSend.apply(this, arguments);
            };
            window._videoOnlySendHooked = true;
            clearInterval(hookSend);
        }
    }, 500);

    // Перехват запуска/остановки голосового ИИ-микрофона из calls.js только для видеозвонка
    const hookVoiceAI = setInterval(() => {
        if (typeof window.startVoiceAI === 'function' && !window._videoOnlyMicHooked) {
            const origStart = window.startVoiceAI;
            const origStop = window.stopVoiceAI;

            window.startVoiceAI = function() {
                if (window.isDirectVideoCallActive()) {
                    return window.startVideoRoomMic();
                }
                return origStart ? origStart.apply(this, arguments) : undefined;
            };

            window.stopVoiceAI = function() {
                window.stopVideoRoomMic();
                return origStop ? origStop.apply(this, arguments) : undefined;
            };

            window._videoOnlyMicHooked = true;
            clearInterval(hookVoiceAI);
        }
    }, 500);

    // Перехват нижнего микрофона (startUniversalMic) в видеокомнате
    const hookUniversalMic = setInterval(() => {
        if (typeof window.startUniversalMic === 'function' && !window._videoOnlyUniversalMicHooked) {
            const origStartUni = window.startUniversalMic;
            const origStopUni = window.stopUniversalMic;

            window.startUniversalMic = function() {
                if (window.currentMicInputTarget === 'video-chat-input' || window.isDirectVideoCallActive()) {
                    return window.startVideoRoomMic();
                }
                return origStartUni.apply(this, arguments);
            };

            if (typeof origStopUni === 'function') {
                window.stopUniversalMic = function() {
                    window.stopVideoRoomMic();
                    return origStopUni.apply(this, arguments);
                };
            }

            window._videoOnlyUniversalMicHooked = true;
            clearInterval(hookUniversalMic);
        }
    }, 500);
})();

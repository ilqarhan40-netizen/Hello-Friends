// ==========================================
// MODULE: VOICE, MIC, AI AUDIO & LIVE AUDIO CALL TRANSLATOR
// ==========================================

window.currentMicInputTarget = 'chat-input';

window.VOICE_LANG_MAP = {
    en: { speech: 'en-US', flagCode: 'gb', flag: '🇬🇧' },
    ru: { speech: 'ru-RU', flagCode: 'ru', flag: '🇷🇺' },
    az: { speech: 'az-AZ', flagCode: 'az', flag: '🇦🇿' },
    tr: { speech: 'tr-TR', flagCode: 'tr', flag: '🇹🇷' },
    de: { speech: 'de-DE', flagCode: 'de', flag: '🇩🇪' },
    kk: { speech: 'kk-KZ', flagCode: 'kz', flag: '🇰🇿' },
    ar: { speech: 'ar-AE', flagCode: 'ae', flag: '🇦🇪' },
    it: { speech: 'it-IT', flagCode: 'it', flag: '🇮🇹' },
    es: { speech: 'es-ES', flagCode: 'es', flag: '🇪🇸' },
    fr: { speech: 'fr-FR', flagCode: 'fr', flag: '🇫🇷' },
    pt: { speech: 'pt-PT', flagCode: 'pt', flag: '🇵🇹' },
    ja: { speech: 'ja-JP', flagCode: 'jp', flag: '🇯🇵' },
    zh: { speech: 'zh-CN', flagCode: 'cn', flag: '🇨🇳' }
};

window.normalizeMicLang = function(raw) {
    if (!raw) return 'auto';
    const val = String(raw).trim().toLowerCase();
    if (!val || val === 'auto') return 'auto';
    const base = val.split(/[-_]/)[0].substring(0, 2);
    const fix = { kz: 'kk', cn: 'zh', jp: 'ja', ae: 'ar', gb: 'en', us: 'en' };
    return fix[base] || base;
};

// Читает язык СТРОГО из собственного меню микрофона (#plus-mic-lang / hf_mic_lang_*)
window.getSelectedMicMenuLang = function() {
    const langSelect = document.getElementById('plus-mic-lang');
    if (langSelect && langSelect.value) {
        return window.normalizeMicLang(langSelect.value);
    }
    const storageKey = (typeof window.getMicLangKey === 'function') ? window.getMicLangKey() : 'hf_mic_lang_chat_global';
    const saved = localStorage.getItem(storageKey);
    return window.normalizeMicLang(saved || 'auto');
};

window.toggleUniversalMic = function(e, inputId) {
    e.stopPropagation();
    window.currentMicInputTarget = inputId;
    const popup = document.getElementById('universal-mic-popup');
    if (popup) popup.classList.toggle('active');
};

window.handleSmartCall = function() {
    if (window.currentRoomId === 'global' || window.currentRoomId.startsWith('private_me') || window.currentRoomId === 'private_ai_bot') {
        alert("Please select a user from the Contacts list to make a call.");
    } else {
        if (window.startInAppCall) window.startInAppCall();
    }
};

// Не перезаписываем полную версию getSmartLang из chat.js
if (typeof window.getSmartLang !== 'function') {
    window.getSmartLang = function(userProfile) {
        if (!userProfile) return 'en';
        let flag = (userProfile.flagCode || 'un').toLowerCase();
        const flagToLang = {
            ru: 'ru', kz: 'kk', az: 'az', tr: 'tr', it: 'it', de: 'de',
            fr: 'fr', jp: 'ja', es: 'es', cn: 'zh', pt: 'pt', gb: 'en', us: 'en', ae: 'ar'
        };
        if (flagToLang[flag]) return flagToLang[flag];

        let phone = String(userProfile.phone || '').replace(/\s+/g, '');
        if (phone.startsWith('+7')) return 'ru';
        if (phone.startsWith('+994')) return 'az';
        if (phone.startsWith('+90')) return 'tr';
        if (phone.startsWith('+39')) return 'it';
        if (phone.startsWith('+49')) return 'de';
        if (phone.startsWith('+33')) return 'fr';
        if (phone.startsWith('+81')) return 'ja';
        if (phone.startsWith('+34')) return 'es';
        if (phone.startsWith('+86')) return 'zh';
        if (phone.startsWith('+351')) return 'pt';
        if (phone.startsWith('+1') || phone.startsWith('+44')) return 'en';
        if (phone.startsWith('+971')) return 'ar';

        return userProfile.langCode || 'en';
    };
}

// --- ФУНКЦИЯ 1: ГОЛОСОВОЙ МИКРОФОН (Безлимитка + Обход Agora, БЕЗ экосистемы и профиля) ---
window.universalMicRec = null;
window.isManualMicStop = false;

window.startUniversalMic = async function(mode) {
    if (window.closeAllMenus) window.closeAllMenus();

    window.speechRecognizedText = "";
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return alert("Browser does not support Speech Recognition.");

    // 1. ОБХОД КОНФЛИКТА: временно глушим микрофон Agora
    if (window.localAudioTrack) {
        try { await window.localAudioTrack.setMuted(true); } catch (e) {}
    }

    // Останавливаем предыдущую сессию, если была активна
    if (window.universalMicRec) {
        window.isManualMicStop = true;
        try { window.universalMicRec.stop(); } catch (e) {}
    }

    window.isManualMicStop = false;
    let rec = new SpeechRec();
    window.universalMicRec = rec;

    // 2. БЕЗЛИМИТКА
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    // Язык диктовки берётся СТРОГО из меню микрофона (#plus-mic-lang).
    // Никакой привязки к window.appLang (три точки) и window.myProfileInfo (профиль).
    const selectedMicLang = window.getSelectedMicMenuLang();
    const isMicManual = selectedMicLang !== 'auto';

    if (isMicManual) {
        const meta = window.VOICE_LANG_MAP[selectedMicLang];
        rec.lang = meta ? meta.speech : selectedMicLang;
    } else {
        rec.lang = navigator.language || 'ru-RU';
    }

    if (window.showToast) window.showToast("Listening...", "Speak into the microphone", "", "");

    rec.onresult = async (e) => {
        const transcript = (e.results[e.results.length - 1][0].transcript || '').trim();
        if (!transcript) return;
        window.speechRecognizedText = transcript;

        const isConf = (window.currentMicInputTarget === 'conf-chat-input' || window.currentIndex === 2);
        const isAudioRoom = (window.currentMicInputTarget === 'voice-chat-input' || window.currentIndex === 1);

        let targetDbRoom = window.currentRoomId || 'global';
        if (isConf && targetDbRoom === 'global') {
            targetDbRoom = 'video_room_global';
        }

        const spokenLangCode = window.normalizeMicLang(rec.lang);
        let textToShip = transcript;
        let payloadLangCode = (spokenLangCode !== 'auto') ? spokenLangCode : 'ru';

        // В Глобальном чате и конференции НЕ переводим текст в язык экосистемы/профиля —
        // отправляем чистый распознанный текст, а веер переводов в chat.js переведёт каждому по его флагу.
        // В личном чате переводим только на язык собеседника.
        if (!isConf && window.currentTargetUser && targetDbRoom !== 'global' && targetDbRoom !== 'video_room_global' && targetDbRoom !== 'private_ai_bot') {
            const partnerLang = (window.currentTargetUser.langCode && window.currentTargetUser.langCode !== 'auto')
                ? window.normalizeMicLang(window.currentTargetUser.langCode)
                : window.normalizeMicLang(window.getSmartLang(window.currentTargetUser));

            if (partnerLang && partnerLang !== 'auto' && partnerLang !== payloadLangCode) {
                if (window.showToast) window.showToast("Translating...", "Processing your voice...", "", "");
                try {
                    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${partnerLang}&dt=t&q=${encodeURIComponent(transcript)}`);
                    const data = await res.json();
                    if (data && data[0]) {
                        textToShip = data[0].map(s => (s && s[0]) ? s[0] : '').join('');
                    }
                } catch (err) {}
            }
        }

        const safeId = (window.myProfileInfo && window.myProfileInfo.id) ? window.myProfileInfo.id : 'guest';
        const safeName = window.myUsername || 'User';
        const safePhoto = (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : 'https://ui-avatars.com/api/?name=U';

        let activeFlag = (window.myProfileInfo && window.myProfileInfo.flag) ? window.myProfileInfo.flag : '🌐';
        let activeFlagCode = (window.myProfileInfo && window.myProfileInfo.flagCode) ? window.myProfileInfo.flagCode : 'un';

        if (isMicManual && window.VOICE_LANG_MAP[selectedMicLang]) {
            activeFlag = window.VOICE_LANG_MAP[selectedMicLang].flag;
            activeFlagCode = window.VOICE_LANG_MAP[selectedMicLang].flagCode;
        }

        const payload = {
            userId: safeId,
            name: safeName,
            text: textToShip,
            originalText: transcript,
            sessionId: window.mySessionId || 'sess',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            photo: safePhoto,
            flag: activeFlag,
            flagCode: activeFlagCode,
            langCode: payloadLangCode,
            isVoiceRoomMsg: isAudioRoom,
            isConfMsg: isConf
        };

        if (mode === 'text') {
            firebase.database().ref(targetDbRoom).push(payload);
        } else if (mode === 'ai-audio') {
            payload.isAIAudio = true;
            firebase.database().ref(targetDbRoom).push(payload);
        }
    };

    // Автоперезапуск при паузе
    rec.onend = () => {
        if (!window.isManualMicStop && window.universalMicRec) {
            try { window.universalMicRec.start(); } catch (err) {}
        }
    };

    rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'aborted') {
            window.isManualMicStop = true;
        }
    };

    try { rec.start(); } catch (e) {}
};

// --- ФУНКЦИЯ РУЧНОЙ ОСТАНОВКИ ---
window.stopUniversalMic = async function() {
    window.isManualMicStop = true;

    if (window.universalMicRec) {
        try { window.universalMicRec.stop(); } catch (e) {}
        window.universalMicRec = null;
    }

    if (window.localAudioTrack) {
        try { await window.localAudioTrack.setMuted(false); } catch (e) {}
    }

    if (window.showToast) window.showToast("Stopped", "Voice recording finished.", "", "");
};

window.playAIVoice = function(encodedText, langCode) {
    if (!window.speechSynthesis) return alert("Your browser does not support AI Voice.");
    window.speechSynthesis.cancel();

    let text = "";
    try { text = decodeURIComponent(encodedText); } catch (e) { text = unescape(encodedText); }

    const utterance = new SpeechSynthesisUtterance(text);
    const norm = window.normalizeMicLang(langCode);
    const voiceMap = {
        en: 'en-US', ru: 'ru-RU', az: 'tr-TR', tr: 'tr-TR', de: 'de-DE',
        kk: 'kk-KZ', ar: 'ar-AE', it: 'it-IT', es: 'es-ES', fr: 'fr-FR',
        pt: 'pt-PT', ja: 'ja-JP', zh: 'zh-CN'
    };
    utterance.lang = voiceMap[norm] || langCode || 'en-US';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
};

window.autoSetMicLang = function() {
    if (typeof window.syncMicLangUI === 'function') {
        window.syncMicLangUI();
        return;
    }
    let rMic = document.getElementById('plus-mic-lang');
    if (rMic && !rMic.value) rMic.value = 'auto';
};

// =========================================================================
// ФУНКЦИЯ 2: ЖИВОЙ ПЕРЕВОДЧИК ТОЛЬКО ДЛЯ АУДИОКОМНАТЫ (1-на-1)
// (Видеокомната обслуживается отдельно в js/video-room.js)
// =========================================================================
window.liveCallRec = null;
window.isManualLiveCallStop = false;

window.startVoiceAI = function() {
    // Если активен видеозвонок — передаём управление отдельному модулю video-room.js
    const isVideoCall = (window.myLastOutgoingCallType === 'video' || window.currentIncomingCallType === 'video');
    if (isVideoCall) {
        if (typeof window.startVideoRoomMic === 'function') window.startVideoRoomMic();
        return;
    }

    if (window.liveCallRec) {
        window.isManualLiveCallStop = true;
        try { window.liveCallRec.stop(); } catch (e) {}
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return console.warn("Speech Recognition not supported.");

    window.isManualLiveCallStop = false;
    window.liveCallRec = new SpeechRec();
    window.liveCallRec.continuous = true;
    window.liveCallRec.interimResults = false;

    // Язык микрофона аудиокомнаты — СТРОГО из своего меню микрофона (без профиля и экосистемы)
    const selectedMicLang = window.getSelectedMicMenuLang();
    const isMicManual = selectedMicLang !== 'auto';
    if (isMicManual) {
        const meta = window.VOICE_LANG_MAP[selectedMicLang];
        window.liveCallRec.lang = meta ? meta.speech : selectedMicLang;
    } else {
        window.liveCallRec.lang = navigator.language || 'ru-RU';
    }

    window.liveCallRec.onresult = async (e) => {
        let transcript = (e.results[e.results.length - 1][0].transcript || '').trim();
        if (!transcript) return;

        let targetLang = window.currentTargetUser
            ? window.normalizeMicLang(window.getSmartLang(window.currentTargetUser))
            : 'en';
        let textToShip = transcript;
        let spokenLangCode = window.normalizeMicLang(window.liveCallRec.lang);

        try {
            if (targetLang && targetLang !== 'auto' && spokenLangCode !== targetLang) {
                const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(transcript)}`);
                const data = await res.json();
                if (data && data[0]) {
                    textToShip = data[0].map(s => (s && s[0]) ? s[0] : '').join('');
                }
            }

            let activeFlagCode = (window.myProfileInfo && window.myProfileInfo.flagCode) ? window.myProfileInfo.flagCode : 'un';
            let activeFlag = (window.myProfileInfo && window.myProfileInfo.flag) ? window.myProfileInfo.flag : '🌐';

            if (isMicManual && window.VOICE_LANG_MAP[selectedMicLang]) {
                activeFlagCode = window.VOICE_LANG_MAP[selectedMicLang].flagCode;
                activeFlag = window.VOICE_LANG_MAP[selectedMicLang].flag;
            }

            let targetDbRoom = 'global';
            if (window.currentTargetUser && window.myProfileInfo) {
                let id1 = String(window.myProfileInfo.id);
                let id2 = String(window.currentTargetUser.id);
                targetDbRoom = (id1 < id2) ? ("private_" + id1 + "_" + id2) : ("private_" + id2 + "_" + id1);
            } else if (window.currentRoomId && window.currentRoomId !== 'global') {
                targetDbRoom = window.currentRoomId;
            }

            firebase.database().ref(targetDbRoom).push({
                userId: window.myProfileInfo.id,
                name: window.myUsername || 'User',
                text: textToShip,
                originalText: transcript,
                sessionId: window.mySessionId || 'sess',
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                photo: window.myProfileInfo.photo || 'https://ui-avatars.com/api/?name=U',
                flag: activeFlag,
                flagCode: activeFlagCode,
                langCode: targetLang,
                isVoiceRoomMsg: true,
                isConfMsg: false
            });
        } catch (err) {
            console.error("Ошибка перевода аудиозвонка:", err);
        }
    };

    window.liveCallRec.onend = () => {
        if (!window.isManualLiveCallStop && window.liveCallRec) {
            try { window.liveCallRec.start(); } catch (err) {}
        }
    };

    window.liveCallRec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'aborted') {
            window.isManualLiveCallStop = true;
        }
    };

    try { window.liveCallRec.start(); } catch (err) {}
};

window.stopVoiceAI = function() {
    window.isManualLiveCallStop = true;
    if (window.liveCallRec) {
        try { window.liveCallRec.stop(); } catch (err) {}
        window.liveCallRec = null;
    }
    if (typeof window.stopVideoRoomMic === 'function') {
        window.stopVideoRoomMic();
    }
};

window.handleIncomingSpeech = function(payload) {
    if (window.currentIncomingCallType === 'video' || window.myLastOutgoingCallType === 'video') return;

    let voiceMarquee = document.getElementById('voice-info-marquee');
    if (voiceMarquee) voiceMarquee.innerText = `[Перевод]: ${payload.text}`;

    let langToPlay = payload.langCode || payload.lang || 'en';
    window.playAIVoice(encodeURIComponent(payload.text), langToPlay);
};

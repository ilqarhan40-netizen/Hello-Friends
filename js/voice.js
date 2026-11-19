// ==========================================
// MODULE: AUDIO ROOM & UNIVERSAL MIC (13 LANGUAGES, ISOLATED)
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

// Язык микрофона берётся СТРОГО из своего меню (#plus-mic-lang), без профиля и экосистемы
window.getSelectedMicMenuLang = function() {
    const langSelect = document.getElementById('plus-mic-lang');
    if (langSelect && langSelect.value) {
        return window.normalizeMicLang(langSelect.value);
    }
    const storageKey = (typeof window.getMicLangKey === 'function') ? window.getMicLangKey() : 'hf_mic_lang_chat_global';
    return window.normalizeMicLang(localStorage.getItem(storageKey) || 'auto');
};

window.toggleUniversalMic = function(e, inputId) {
    if (e) e.stopPropagation();
    window.currentMicInputTarget = inputId || 'chat-input';
    const popup = document.getElementById('universal-mic-popup');
    if (popup) popup.classList.toggle('active');
};

window.handleSmartCall = function() {
    if (!window.currentRoomId || window.currentRoomId === 'global' || window.currentRoomId.startsWith('private_me') || window.currentRoomId === 'private_ai_bot') {
        alert("Please select a user from the Contacts list to make a call.");
    } else if (window.startInAppCall) {
        window.startInAppCall();
    }
};

// ==========================================
// 1. АВТОНОМНАЯ ВЕТКА И ПЕРЕВОД АУДИОКОМНАТЫ
// ==========================================
window.activeAudioRoomRef = null;
window.activeAudioRoomHandler = null;

window.getAudioRoomDbPath = function() {
    if (window.currentTargetUser && window.myProfileInfo && window.myProfileInfo.id && window.currentTargetUser.id) {
        const id1 = String(window.myProfileInfo.id);
        const id2 = String(window.currentTargetUser.id);
        return (id1 < id2) ? `audio_rooms/${id1}_${id2}` : `audio_rooms/${id2}_${id1}`;
    }
    return 'audio_rooms/global';
};

window.translateAudioText = async function(text, targetLang) {
    if (!text || !targetLang || targetLang === 'auto') return text;
    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
        const data = await res.json();
        if (data && data[0]) {
            return data[0].map(s => (s && s[0]) ? s[0] : '').join('');
        }
    } catch (e) {}
    return text;
};

window.syncAudioRoomListener = function() {
    if (typeof firebase === 'undefined' || !firebase.database) return;
    const dbPath = window.getAudioRoomDbPath();

    if (window.activeAudioRoomRef && window.activeAudioRoomHandler) {
        window.activeAudioRoomRef.off('child_added', window.activeAudioRoomHandler);
    }

    const ref = firebase.database().ref(dbPath).limitToLast(1);
    const handler = (snapshot) => window.handleAudioRoomMessage(snapshot);
    window.activeAudioRoomRef = ref;
    window.activeAudioRoomHandler = handler;
    ref.on('child_added', handler);
};

window.handleAudioRoomMessage = function(snapshot) {
    const data = snapshot.val();
    if (!data) return;
    if (data.timestamp && (Date.now() - data.timestamp) > 15000) return;

    const isMe = data.sessionId === window.mySessionId || (window.myProfileInfo && String(data.userId) === String(window.myProfileInfo.id));
    const senderName = isMe ? (window.myUsername || 'You') : (data.name || 'User').split(' ')[0];
    const senderFlag = data.flag || '🌐';
    const origText = data.originalText || data.text || '';
    const transText = data.text || origText;

    const vMarquee = document.getElementById('voice-info-marquee');
    if (vMarquee && window.isVoiceMarqueeEnabled !== false) {
        const receiverName = isMe
            ? (window.currentTargetUser ? (window.currentTargetUser.name || 'User').split(' ')[0] : 'Partner')
            : (window.myUsername || 'You');
        const receiverFlag = isMe
            ? (window.currentTargetUser ? (window.currentTargetUser.flag || '🌐') : '🌐')
            : ((window.myProfileInfo && window.myProfileInfo.flag) || '🌐');

        let html = `<span class="text-white font-bold mr-1">${senderFlag} ${senderName}:</span> <span class="text-[#e9edef] mr-2">${origText}</span>`;
        if (transText && transText.toLowerCase() !== origText.toLowerCase()) {
            html += `<span class="text-[#00a884] font-bold ml-2">➔ ${receiverFlag} ${receiverName}: ${transText}</span>`;
        }
        vMarquee.innerHTML = html;
        vMarquee.style.animation = 'none';
        void vMarquee.offsetWidth;
        vMarquee.style.animation = null;
    }

    if (!isMe && data.isAIAudio && transText) {
        window.playAIVoice(encodeURIComponent(transText), data.targetLang || data.langCode || 'en');
    }
};

window.sendAudioRoomText = async function(rawText, isAIAudio = false, forcedMicLang = null) {
    const text = (rawText || '').trim();
    if (!text) return;

    window.syncAudioRoomListener();

    const selectedLang = forcedMicLang ? window.normalizeMicLang(forcedMicLang) : window.getSelectedMicMenuLang();
    const isManual = selectedLang !== 'auto';
    const spokenLang = isManual ? selectedLang : window.normalizeMicLang(navigator.language || 'ru');

    const partnerLang = window.currentTargetUser
        ? window.normalizeMicLang((window.currentTargetUser.langCode && window.currentTargetUser.langCode !== 'auto') ? window.currentTargetUser.langCode : window.getSmartLang(window.currentTargetUser))
        : 'en';

    let translatedText = text;
    if (partnerLang && partnerLang !== 'auto' && partnerLang !== spokenLang) {
        translatedText = await window.translateAudioText(text, partnerLang);
    }

    let activeFlag = (window.myProfileInfo && window.myProfileInfo.flag) ? window.myProfileInfo.flag : '🌐';
    let activeFlagCode = (window.myProfileInfo && window.myProfileInfo.flagCode) ? window.myProfileInfo.flagCode : 'un';
    if (isManual && window.VOICE_LANG_MAP[selectedLang]) {
        activeFlag = window.VOICE_LANG_MAP[selectedLang].flag;
        activeFlagCode = window.VOICE_LANG_MAP[selectedLang].flagCode;
    }

    firebase.database().ref(window.getAudioRoomDbPath()).push({
        userId: (window.myProfileInfo && window.myProfileInfo.id) ? window.myProfileInfo.id : 'guest',
        name: window.myUsername || 'User',
        text: translatedText,
        originalText: text,
        sessionId: window.mySessionId || 'sess',
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        photo: (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : 'https://ui-avatars.com/api/?name=U',
        flag: activeFlag,
        flagCode: activeFlagCode,
        langCode: spokenLang,
        targetLang: partnerLang,
        isAIAudio: Boolean(isAIAudio),
        isVoiceRoomMsg: true
    });
};

window.sendAudioRoomMsg = async function() {
    const input = document.getElementById('voice-chat-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    input.value = '';
    await window.sendAudioRoomText(val, false);
};

// ==========================================
// 2. УНИВЕРСАЛЬНЫЙ МИКРОФОН (БЕЗЛИМИТКА + РОУТИНГ ПО КОМНАТАМ)
// ==========================================
window.universalMicRec = null;
window.isManualMicStop = false;

window.startUniversalMic = async function(mode) {
    if (window.closeAllMenus) window.closeAllMenus();

    // Если нажали микрофон в нижнем баре видеокомнаты — отдаём в video-room.js
    if (window.currentMicInputTarget === 'video-chat-input' && typeof window.startVideoRoomMic === 'function') {
        window.startVideoRoomMic(mode);
        return;
    }

    window.speechRecognizedText = "";
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return alert("Browser does not support Speech Recognition.");

    if (window.localAudioTrack) {
        try { await window.localAudioTrack.setMuted(true); } catch (e) {}
    }

    if (window.universalMicRec) {
        window.isManualMicStop = true;
        try { window.universalMicRec.stop(); } catch (e) {}
    }

    window.isManualMicStop = false;
    const rec = new SpeechRec();
    window.universalMicRec = rec;
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    const selectedMicLang = window.getSelectedMicMenuLang();
    const isMicManual = selectedMicLang !== 'auto';
    rec.lang = isMicManual
        ? (window.VOICE_LANG_MAP[selectedMicLang]?.speech || selectedMicLang)
        : (navigator.language || 'ru-RU');

    if (window.showToast) window.showToast("Listening...", "Speak into the microphone", "", "");

    rec.onresult = async (e) => {
        const transcript = (e.results[e.results.length - 1][0].transcript || '').trim();
        if (!transcript) return;
        window.speechRecognizedText = transcript;

        // Аудиокомната — шлём строго в её изолированную ветку
        if (window.currentMicInputTarget === 'voice-chat-input') {
            await window.sendAudioRoomText(transcript, mode === 'ai-audio', selectedMicLang);
            return;
        }

        const isConf = (window.currentMicInputTarget === 'conf-chat-input' || window.currentIndex === 2);
        let targetDbRoom = window.currentRoomId || 'global';
        if (isConf && targetDbRoom === 'global') targetDbRoom = 'video_room_global';

        const spokenLangCode = window.normalizeMicLang(rec.lang);
        let textToShip = transcript;

        // В личном чате переводим на язык собеседника; в глобальном — оставляем оригинал для веера
        if (!isConf && window.currentTargetUser && targetDbRoom !== 'global' && targetDbRoom !== 'video_room_global' && targetDbRoom !== 'private_ai_bot') {
            const partnerLang = window.normalizeMicLang(
                (window.currentTargetUser.langCode && window.currentTargetUser.langCode !== 'auto')
                    ? window.currentTargetUser.langCode
                    : window.getSmartLang(window.currentTargetUser)
            );
            if (partnerLang && partnerLang !== 'auto' && partnerLang !== spokenLangCode) {
                textToShip = await window.translateAudioText(transcript, partnerLang);
            }
        }

        let activeFlag = (window.myProfileInfo && window.myProfileInfo.flag) ? window.myProfileInfo.flag : '🌐';
        let activeFlagCode = (window.myProfileInfo && window.myProfileInfo.flagCode) ? window.myProfileInfo.flagCode : 'un';
        if (isMicManual && window.VOICE_LANG_MAP[selectedMicLang]) {
            activeFlag = window.VOICE_LANG_MAP[selectedMicLang].flag;
            activeFlagCode = window.VOICE_LANG_MAP[selectedMicLang].flagCode;
        }

        const payload = {
            userId: (window.myProfileInfo && window.myProfileInfo.id) ? window.myProfileInfo.id : 'guest',
            name: window.myUsername || 'User',
            text: textToShip,
            originalText: transcript,
            sessionId: window.mySessionId || 'sess',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            photo: (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : 'https://ui-avatars.com/api/?name=U',
            flag: activeFlag,
            flagCode: activeFlagCode,
            langCode: (spokenLangCode !== 'auto') ? spokenLangCode : 'ru',
            isConfMsg: isConf
        };

        if (mode === 'ai-audio') payload.isAIAudio = true;
        firebase.database().ref(targetDbRoom).push(payload);
    };

    rec.onend = () => {
        if (!window.isManualMicStop && window.universalMicRec) {
            try { window.universalMicRec.start(); } catch (err) {}
        }
    };

    rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'aborted') window.isManualMicStop = true;
    };

    try { rec.start(); } catch (e) {}
};

window.stopUniversalMic = async function() {
    window.isManualMicStop = true;
    if (window.universalMicRec) {
        try { window.universalMicRec.stop(); } catch (e) {}
        window.universalMicRec = null;
    }
    if (typeof window.stopVideoRoomMic === 'function') {
        window.stopVideoRoomMic();
    }
    if (window.localAudioTrack) {
        try { await window.localAudioTrack.setMuted(false); } catch (e) {}
    }
    if (window.showToast) window.showToast("Stopped", "Voice recording finished.", "", "");
};

window.playAIVoice = function(encodedText, langCode) {
    if (!window.speechSynthesis) return;
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

// ==========================================
// 3. ЖИВОЙ ПЕРЕВОДЧИК АУДИОЗВОНКА
// ==========================================
window.liveCallRec = null;
window.isManualLiveCallStop = false;

window.startVoiceAI = function() {
    window.syncAudioRoomListener();

    if (window.liveCallRec) {
        window.isManualLiveCallStop = true;
        try { window.liveCallRec.stop(); } catch (e) {}
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    window.isManualLiveCallStop = false;
    window.liveCallRec = new SpeechRec();
    window.liveCallRec.continuous = true;
    window.liveCallRec.interimResults = false;

    const selectedMicLang = window.getSelectedMicMenuLang();
    window.liveCallRec.lang = (selectedMicLang !== 'auto')
        ? (window.VOICE_LANG_MAP[selectedMicLang]?.speech || selectedMicLang)
        : (navigator.language || 'ru-RU');

    window.liveCallRec.onresult = async (e) => {
        const transcript = (e.results[e.results.length - 1][0].transcript || '').trim();
        if (!transcript) return;
        await window.sendAudioRoomText(transcript, false, selectedMicLang);
    };

    window.liveCallRec.onend = () => {
        if (!window.isManualLiveCallStop && window.liveCallRec) {
            try { window.liveCallRec.start(); } catch (err) {}
        }
    };

    window.liveCallRec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'aborted') window.isManualLiveCallStop = true;
    };

    try { window.liveCallRec.start(); } catch (err) {}
};

window.stopVoiceAI = function() {
    window.isManualLiveCallStop = true;
    if (window.liveCallRec) {
        try { window.liveCallRec.stop(); } catch (err) {}
        window.liveCallRec = null;
    }
};

// Привязка Enter на поле ввода аудиокомнаты
document.addEventListener('DOMContentLoaded', () => {
    const vInput = document.getElementById('voice-chat-input');
    if (vInput) {
        vInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                window.sendAudioRoomMsg();
            }
        });
    }
});

// ==========================================
// MODULE: 1-ON-1 VIDEO ROOM (ISOLATED FIREBASE, TRANSLATION & BOTTOM MIC)
// ==========================================

window.VIDEO_LANG_MAP = {
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

window.videoRoomFixLang = function(raw) {
    if (!raw) return null;
    const val = String(raw).trim().toLowerCase();
    if (!val || val === 'auto' || val === 'un') return null;
    const base = val.split(/[-_]/)[0].substring(0, 2);
    const fix = { kz: 'kk', cn: 'zh', jp: 'ja', ae: 'ar', gb: 'en', us: 'en' };
    return fix[base] || base;
};

// Язык микрофона видеокомнаты — СТРОГО из своего меню (#plus-mic-lang), без профиля и экосистемы
window.videoRoomGetMicLang = function() {
    if (window.videoRoomMicLangOverride) {
        const parsed = window.videoRoomFixLang(window.videoRoomMicLangOverride);
        if (parsed) return parsed;
    }
    const micPanel = document.getElementById('plus-mic-lang');
    if (micPanel && micPanel.value && micPanel.value !== 'auto') {
        const parsed = window.videoRoomFixLang(micPanel.value);
        if (parsed) return parsed;
    }
    return null; // null = auto (язык устройства)
};

window.getVideoRoomDbPath = function() {
    if (window.currentTargetUser && window.myProfileInfo && window.myProfileInfo.id && window.currentTargetUser.id) {
        const id1 = String(window.myProfileInfo.id);
        const id2 = String(window.currentTargetUser.id);
        return (id1 < id2) ? `video_rooms/${id1}_${id2}` : `video_rooms/${id2}_${id1}`;
    }
    return 'video_rooms/global';
};

window.videoRoomTranslate = async function(text, targetLang) {
    if (!text || !targetLang) return text;
    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
        const data = await res.json();
        if (data && data[0]) {
            return data[0].map(s => (s && s[0]) ? s[0] : '').join('');
        }
    } catch (e) {}
    return text;
};

// ==========================================
// 1. СЛУШАТЕЛЬ FIREBASE И БЕГУЩАЯ СТРОКА ВИДЕОКОМНАТЫ
// ==========================================
window.activeVideoRoomRef = null;
window.activeVideoRoomHandler = null;

window.syncVideoRoomListener = function() {
    if (typeof firebase === 'undefined' || !firebase.database) return;
    const dbPath = window.getVideoRoomDbPath();

    if (window.activeVideoRoomRef && window.activeVideoRoomHandler) {
        window.activeVideoRoomRef.off('child_added', window.activeVideoRoomHandler);
    }

    const ref = firebase.database().ref(dbPath).limitToLast(1);
    const handler = (snapshot) => window.handleVideoRoomMessage(snapshot);
    window.activeVideoRoomRef = ref;
    window.activeVideoRoomHandler = handler;
    ref.on('child_added', handler);
};

window.handleVideoRoomMessage = function(snapshot) {
    const data = snapshot.val();
    if (!data) return;
    if (data.timestamp && (Date.now() - data.timestamp) > 15000) return;

    const isMe = data.sessionId === window.mySessionId || (window.myProfileInfo && String(data.userId) === String(window.myProfileInfo.id));
    const senderName = isMe ? (window.myUsername || 'You') : (data.name || 'User').split(' ')[0];
    const senderFlag = data.flag || '🌐';
    const origText = data.originalText || data.text || '';
    const transText = data.text || origText;

    const marquee = document.getElementById('video-info-marquee');
    if (marquee) {
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
        marquee.innerHTML = html;
        marquee.style.animation = 'none';
        void marquee.offsetWidth;
        marquee.style.animation = null;
    }

    if (!isMe && data.isAIAudio && transText && typeof window.playAIVoice === 'function') {
        window.playAIVoice(encodeURIComponent(transText), data.targetLang || data.langCode || 'en');
    }
};

// ==========================================
// 2. ОТПРАВКА ТЕКСТА И ГОЛОСА В ВИДЕОКОМНАТУ
// ==========================================
window.sendVideoRoomPayload = async function(rawText, isAIAudio = false) {
    const text = (rawText || '').trim();
    if (!text) return;

    window.syncVideoRoomListener();

    const manualLang = window.videoRoomGetMicLang();
    const spokenLang = manualLang || window.videoRoomFixLang(navigator.language) || 'ru';

    let partnerLang = 'en';
    if (window.currentTargetUser) {
        const rawPartner = (window.currentTargetUser.langCode && window.currentTargetUser.langCode !== 'auto')
            ? window.currentTargetUser.langCode
            : (typeof window.getSmartLang === 'function' ? window.getSmartLang(window.currentTargetUser) : 'en');
        partnerLang = window.videoRoomFixLang(rawPartner) || 'en';
    }

    let translatedText = text;
    if (partnerLang && partnerLang !== spokenLang) {
        translatedText = await window.videoRoomTranslate(text, partnerLang);
    }

    let activeFlag = (window.myProfileInfo && window.myProfileInfo.flag) ? window.myProfileInfo.flag : '🌐';
    let activeFlagCode = (window.myProfileInfo && window.myProfileInfo.flagCode) ? window.myProfileInfo.flagCode : 'un';
    if (manualLang && window.VIDEO_LANG_MAP[manualLang]) {
        activeFlag = window.VIDEO_LANG_MAP[manualLang].flag;
        activeFlagCode = window.VIDEO_LANG_MAP[manualLang].flagCode;
    }

    firebase.database().ref(window.getVideoRoomDbPath()).push({
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
        isVideoRoomMsg: true
    });
};

window.sendVideoRoomMsg = async function() {
    const input = document.getElementById('video-chat-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    input.value = '';
    await window.sendVideoRoomPayload(val, false);
};

// ==========================================
// 3. НИЖНИЙ МИКРОФОН ВИДЕОКОМНАТЫ (СТАБИЛЬНЫЙ, БЕЗ ЭКОСИСТЕМЫ)
// ==========================================
window.videoRoomRec = null;
window.isManualVideoMicStop = false;

window.startVideoRoomMic = async function(mode = 'text') {
    window.syncVideoRoomListener();

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return alert("Голосовой ввод не поддерживается браузером.");

    if (window.localAudioTrack) {
        try { await window.localAudioTrack.setMuted(true); } catch (e) {}
    }

    if (window.videoRoomRec) {
        window.isManualVideoMicStop = true;
        try { window.videoRoomRec.stop(); } catch (e) {}
    }

    window.isManualVideoMicStop = false;
    const rec = new SpeechRec();
    window.videoRoomRec = rec;
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    const manualLang = window.videoRoomGetMicLang();
    rec.lang = manualLang
        ? (window.VIDEO_LANG_MAP[manualLang]?.speech || manualLang)
        : (navigator.language || 'ru-RU');

    if (window.showToast) window.showToast("Video Mic", "Говорите...", "", "");

    rec.onresult = async (e) => {
        const transcript = (e.results[e.results.length - 1][0].transcript || '').trim();
        if (!transcript) return;
        await window.sendVideoRoomPayload(transcript, mode === 'ai-audio');
    };

    rec.onend = () => {
        if (!window.isManualVideoMicStop && window.videoRoomRec) {
            try { window.videoRoomRec.start(); } catch (err) {}
        }
    };

    rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'aborted') {
            window.isManualVideoMicStop = true;
        }
    };

    try { rec.start(); } catch (e) {}
};

window.stopVideoRoomMic = async function() {
    window.isManualVideoMicStop = true;
    if (window.videoRoomRec) {
        try { window.videoRoomRec.stop(); } catch (e) {}
        window.videoRoomRec = null;
    }
    if (window.localAudioTrack) {
        try { await window.localAudioTrack.setMuted(false); } catch (e) {}
    }
};

// Привязка Enter на поле ввода видеокомнаты
document.addEventListener('DOMContentLoaded', () => {
    const vidInput = document.getElementById('video-chat-input');
    if (vidInput) {
        vidInput.addEventListener('keydown', (e) => 
            if (e.key === 'Enter') {
                e.preventDefault();
                window.sendVideoRoomMsg();
            }
        });
    }
});


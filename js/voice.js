// ==========================================
// MODULE: AUDIO ROOM ONLY (13 LANGUAGES, STRICTLY ISOLATED TO TAB 1)
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

window.getAutoMicLang = function() {
    if (typeof window.getSmartLang === 'function' && window.myProfileInfo) {
        const smart = window.normalizeMicLang(window.getSmartLang(window.myProfileInfo));
        if (smart && smart !== 'auto') return smart;
    }
    return 'en';
};

window.getSelectedMicMenuLang = function() {
    if (typeof window.getMicLangKey === 'function') {
        const saved = localStorage.getItem(window.getMicLangKey());
        if (saved && saved !== 'auto') return window.normalizeMicLang(saved);
    }
    const langSelect = document.getElementById('plus-mic-lang');
    if (langSelect && langSelect.value && langSelect.value !== 'auto') {
        return window.normalizeMicLang(langSelect.value);
    }
    return 'auto';
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
// 1. АВТОНОМНАЯ ВЕТКА, СЛУШАТЕЛЬ И ПЕРЕВОД АУДИОКОМНАТЫ
// ==========================================
window.activeAudioRoomRef = null;
window.activeAudioRoomHandler = null;
window.audioRoomActiveDbPath = null;
window.audioRoomServerOffset = 0;
window.audioRoomSeenKeys = new Set();

window.getAudioRoomPartner = function() {
    if (window.voiceFriend && window.voiceFriend.id) return window.voiceFriend;
    if (window.currentTargetUser && window.currentTargetUser.id) return window.currentTargetUser;
    if (window.currentCallerId && Array.isArray(window.participants)) {
        const found = window.participants.find(p => String(p.id) === String(window.currentCallerId));
        if (found) return found;
    }
    if (window.currentCallerFallback && window.currentCallerFallback.id) return window.currentCallerFallback;
    return null;
};

window.getAudioRoomDbPath = function() {
    const partner = window.getAudioRoomPartner();
    if (partner && partner.id && window.myProfileInfo && window.myProfileInfo.id) {
        const pair = [String(window.myProfileInfo.id), String(partner.id)].sort();
        return `audio_rooms/${pair[0]}_${pair[1]}`;
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

    if (!window._audioRoomOffsetSynced) {
        window._audioRoomOffsetSynced = true;
        firebase.database().ref('.info/serverTimeOffset').on('value', (snap) => {
            window.audioRoomServerOffset = snap.val() || 0;
        });
    }

    const dbPath = window.getAudioRoomDbPath();
    if (window.audioRoomActiveDbPath === dbPath && window.activeAudioRoomHandler) return;

    if (window.activeAudioRoomRef && window.activeAudioRoomHandler) {
        window.activeAudioRoomRef.off('child_added', window.activeAudioRoomHandler);
    }

    window.audioRoomSeenKeys.clear();
    window.audioRoomActiveDbPath = dbPath;

    const ref = firebase.database().ref(dbPath).limitToLast(5);
    const handler = (snapshot) => {
        const data = snapshot.val();
        if (!data || window.audioRoomSeenKeys.has(snapshot.key)) return;
        window.audioRoomSeenKeys.add(snapshot.key);

        const serverNow = Date.now() + (window.audioRoomServerOffset || 0);
        if (data.timestamp && (serverNow - data.timestamp) > 60000) return;

        window.handleAudioRoomMessage(snapshot);
    };

    window.activeAudioRoomRef = ref;
    window.activeAudioRoomHandler = handler;
    ref.on('child_added', handler);
};

window.handleAudioRoomMessage = function(snapshot) {
    const data = snapshot.val();
    if (!data) return;

    const partner = window.getAudioRoomPartner();
    const isMe = data.sessionId === window.mySessionId || (window.myProfileInfo && String(data.userId) === String(window.myProfileInfo.id));
    const senderName = isMe ? (window.myUsername || 'You') : (data.name || 'User').split(' ')[0];
    const senderFlag = data.flag || '🌐';
    const origText = data.originalText || data.text || '';
    const transText = data.text || origText;

    const vMarquee = document.getElementById('voice-info-marquee');
    if (vMarquee && window.isVoiceMarqueeEnabled !== false) {
        const receiverName = isMe
            ? (partner ? (partner.name || 'User').split(' ')[0] : 'Partner')
            : (window.myUsername || 'You');
        const receiverFlag = isMe
            ? (partner ? (partner.flag || '🌐') : '🌐')
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

    const partner = window.getAudioRoomPartner();
    const selectedLang = forcedMicLang ? window.normalizeMicLang(forcedMicLang) : window.getSelectedMicMenuLang();
    const isManual = selectedLang !== 'auto';
    const spokenLang = isManual ? selectedLang : window.getAutoMicLang();

    const partnerLang = partner
        ? window.normalizeMicLang((partner.langCode && partner.langCode !== 'auto') ? partner.langCode : (typeof window.getSmartLang === 'function' ? window.getSmartLang(partner) : 'en'))
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
// 2. МИКРОФОН СТРОГО ДЛЯ АУДИОКОМНАТЫ (НЕ ТРОГАЕТ ЧАТ И КОНФЕРЕНЦИЮ)
// ==========================================
window.audioRoomMicRec = null;
window.isManualAudioMicStop = false;

window.startAudioRoomMic = async function(mode) {
    if (window.closeAllMenus) window.closeAllMenus();

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return alert("Browser does not support Speech Recognition.");

    if (window.localAudioTrack) {
        try { await window.localAudioTrack.setMuted(true); } catch (e) {}
    }

    if (window.audioRoomMicRec) {
        window.isManualAudioMicStop = true;
        try { window.audioRoomMicRec.stop(); } catch (e) {}
    }

    window.isManualAudioMicStop = false;
    const rec = new SpeechRec();
    window.audioRoomMicRec = rec;
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    const selectedMicLang = window.getSelectedMicMenuLang();
    const effectiveLang = (selectedMicLang !== 'auto') ? selectedMicLang : window.getAutoMicLang();
    rec.lang = (window.VOICE_LANG_MAP[effectiveLang] && window.VOICE_LANG_MAP[effectiveLang].speech) || 'en-US';

    if (window.showToast) window.showToast("Audio Mic", "Listening...", "", "");

    rec.onresult = async (e) => {
        const transcript = (e.results[e.results.length - 1][0].transcript || '').trim();
        if (!transcript) return;
        await window.sendAudioRoomText(transcript, mode === 'ai-audio', selectedMicLang);
    };

    rec.onend = () => {
        if (!window.isManualAudioMicStop && window.audioRoomMicRec) {
            try { window.audioRoomMicRec.start(); } catch (err) {}
        }
    };

    rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'aborted') window.isManualAudioMicStop = true;
    };

    try { rec.start(); } catch (e) {}
};

window.stopAudioRoomMic = async function() {
    window.isManualAudioMicStop = true;
    if (window.audioRoomMicRec) {
        try { window.audioRoomMicRec.stop(); } catch (e) {}
        window.audioRoomMicRec = null;
    }
    if (window.localAudioTrack && !window.isMyMicMuted) {
        try { await window.localAudioTrack.setMuted(false); } catch (e) {}
    }
};

window.stopUniversalMic = async function() {
    await window.stopAudioRoomMic();
    if (typeof window.stopVideoRoomMic === 'function') {
        window.stopVideoRoomMic();
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
    const effectiveLang = (selectedMicLang !== 'auto') ? selectedMicLang : window.getAutoMicLang();
    window.liveCallRec.lang = (window.VOICE_LANG_MAP[effectiveLang] && window.VOICE_LANG_MAP[effectiveLang].speech) || 'en-US';

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

window.handleIncomingSpeech = function(payload) {
    if (!payload || !payload.text) return;
    const voiceMarquee = document.getElementById('voice-info-marquee');
    if (voiceMarquee) {
        voiceMarquee.innerText = `[Перевод]: ${payload.text}`;
        voiceMarquee.style.animation = 'none';
        void voiceMarquee.offsetWidth;
        voiceMarquee.style.animation = null;
    }
    const langToPlay = payload.langCode || payload.lang || 'en';
    window.playAIVoice(encodeURIComponent(payload.text), langToPlay);
};

// ==========================================
// 4. ИЗОЛИРОВАННЫЕ ПЕРЕХВАТЫ ТОЛЬКО ДЛЯ TAB 1 (АУДИОКОМНАТА)
// ==========================================
(function initAudioRoomHooks() {
    setInterval(() => {
        if (window.currentIndex === 1) {
            window.syncAudioRoomListener();
        }
    }, 1000);

    // Enter в поле ввода аудиокомнаты
    document.addEventListener('keydown', (e) => {
        if (!e.key || e.key !== 'Enter' || !document.activeElement) return;
        const isVideo = (typeof window.isDirectVideoCallActive === 'function' && window.isDirectVideoCallActive());
        if (window.currentIndex === 1 && document.activeElement.id === 'voice-chat-input' && !isVideo) {
            e.preventDefault();
            e.stopImmediatePropagation();
            window.sendAudioRoomMsg();
        }
    }, true);

    // Самолётик: перехват ТОЛЬКО на вкладке 1 (аудиокомната)
    const hookSend = setInterval(() => {
        if (typeof window.sendFirebaseMsg === 'function' && !window._audioRoomSendHooked) {
            const origSend = window.sendFirebaseMsg;
            window.sendFirebaseMsg = function() {
                const isVideo = (typeof window.isDirectVideoCallActive === 'function' && window.isDirectVideoCallActive());
                if (window.currentIndex === 1 && !isVideo) {
                    return window.sendAudioRoomMsg();
                }
                return origSend.apply(this, arguments);
            };
            window._audioRoomSendHooked = true;
            clearInterval(hookSend);
        }
    }, 300);

    // Микрофон: перехват ТОЛЬКО на вкладке 1 (аудиокомната); Чат (0) и Конференцию (2) не трогаем вообще
    const hookMic = setInterval(() => {
        if (typeof window.startUniversalMic === 'function' && !window._audioRoomMicHooked) {
            const origStartMic = window.startUniversalMic;
            window.startUniversalMic = function(mode) {
                const isVideo = (typeof window.isDirectVideoCallActive === 'function' && window.isDirectVideoCallActive());
                if (window.currentIndex === 1 && !isVideo) {
                    return window.startAudioRoomMic(mode);
                }
                return origStartMic.apply(this, arguments);
            };
            window._audioRoomMicHooked = true;
            clearInterval(hookMic);
        }
    }, 300);
})();

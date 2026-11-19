// ==========================================
// MODULE: VOICE, MIC, AI AUDIO & LIVE CALL TRANSLATOR
// ==========================================

window.currentMicInputTarget = 'chat-input';

window.normalizeLangCode = function(code) {
    let tl = String(code || 'en').substring(0, 2).toLowerCase();
    const codeFix = { 'us': 'en', 'gb': 'en', 'kz': 'kk', 'cn': 'zh', 'jp': 'ja', 'ae': 'ar' };
    return codeFix[tl] || tl;
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

window.getSmartLang = function(userProfile) {
    if (!userProfile) return 'en';
    let phone = String(userProfile.phone || "").replace(/[\s\-()]/g, "");
    let flag = String(userProfile.flagCode || "un").toLowerCase();

    // Сначала проверяем флаг Казахстана (чтобы +7 не перебивал казахский на русский)
    if (flag === 'kz') return 'kk';

    if (phone.startsWith('+77') || phone.startsWith('+76')) return 'kk';
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

    const flagToLang = {
        'kz': 'kk', 'ru': 'ru', 'az': 'az', 'tr': 'tr', 'it': 'it', 'de': 'de',
        'fr': 'fr', 'jp': 'ja', 'es': 'es', 'cn': 'zh', 'pt': 'pt', 'gb': 'en',
        'us': 'en', 'ae': 'ar'
    };
    if (flagToLang[flag]) return flagToLang[flag];

    return window.normalizeLangCode(userProfile.langCode || 'en');
};

window.toSpeechLocale = function(shortLang) {
    const map = {
        'kk': 'kk-KZ', 'ru': 'ru-RU', 'az': 'az-AZ', 'tr': 'tr-TR',
        'en': 'en-US', 'it': 'it-IT', 'de': 'de-DE', 'fr': 'fr-FR',
        'ja': 'ja-JP', 'es': 'es-ES', 'zh': 'zh-CN', 'pt': 'pt-PT', 'ar': 'ar-AE'
    };
    let clean = window.normalizeLangCode(shortLang);
    return map[clean] || 'en-US';
};

// --- ФУНКЦИЯ 1: ОДИНОЧНОЕ ГОЛОСОВОЕ СООБЩЕНИЕ (Безлимитка + Обход Agora) ---
window.universalMicRec = null;
window.isManualMicStop = false;

window.startUniversalMic = async function(mode) {
    window.speechRecognizedText = "";
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return alert("Browser does not support Speech Recognition.");

    // 1. ОБХОД КОНФЛИКТА: Временно "глушим" микрофон Агоры
    if (window.localAudioTrack) {
        try { await window.localAudioTrack.setMuted(true); } catch(e){}
    }

    if (window.universalMicRec) {
        window.isManualMicStop = true;
        try { window.universalMicRec.stop(); } catch(e){}
    }

    window.isManualMicStop = false;
    let rec = new SpeechRec();
    window.universalMicRec = rec;

    // 2. БЕЗЛИМИТКА
    rec.continuous = true;
    rec.interimResults = false;

    let langSelect = document.getElementById('plus-mic-lang');
    let selectedMicLang = langSelect ? langSelect.value : 'auto';

    if (selectedMicLang === 'auto') {
        rec.lang = window.toSpeechLocale(window.getSmartLang(window.myProfileInfo));
    } else {
        rec.lang = selectedMicLang;
    }

    if (window.showToast) window.showToast("Listening...", "Speak into the microphone", "", "");

    rec.onresult = async (e) => {
        window.speechRecognizedText = e.results[e.results.length - 1][0].transcript;
        if (!window.speechRecognizedText.trim()) return;

        let targetLang = 'en';
        if (selectedMicLang !== 'auto') {
            targetLang = window.normalizeLangCode(selectedMicLang.split('-')[0]);
        } else {
            if (window.currentTargetUser && window.currentRoomId !== 'global') {
                targetLang = window.getSmartLang(window.currentTargetUser);
            } else {
                targetLang = window.normalizeLangCode(window.appLang || window.getSmartLang(window.myProfileInfo));
            }
        }

        if (window.showToast) window.showToast("Translating...", "Processing your voice...", "", "");
        let textToShip = window.speechRecognizedText;

        try {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(window.speechRecognizedText)}`);
            const data = await res.json();
            if (data && data[0]) {
                textToShip = data[0].map(item => item[0]).join('');
            }
        } catch (err) {}

        let isVoice = window.currentMicInputTarget === 'voice-chat-input';
        let isConf = window.currentMicInputTarget === 'conf-chat-input';

        const payload = {
            userId: window.myProfileInfo.id,
            name: window.myUsername,
            text: textToShip,
            originalText: window.speechRecognizedText,
            sessionId: window.mySessionId,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            photo: window.myProfileInfo.photo,
            flag: window.myProfileInfo.flag,
            flagCode: window.myProfileInfo.flagCode,
            langCode: targetLang,
            isVoiceRoomMsg: isVoice,
            isConfMsg: isConf
        };

        if (mode === 'ai-audio') payload.isAIAudio = true;
        firebase.database().ref(window.currentRoomId).push(payload);
    };

    // === ХАК АВТОПЕРЕЗАПУСКА ПРИ ТИШИНЕ ===
    rec.onend = () => {
        if (!window.isManualMicStop && window.universalMicRec) {
            try { window.universalMicRec.start(); } catch(err) {}
        }
    };

    rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'aborted') {
            window.isManualMicStop = true;
        }
    };

    try { rec.start(); } catch(e){}
};

// --- ФУНКЦИЯ РУЧНОЙ ОСТАНОВКИ ---
window.stopUniversalMic = async function() {
    window.isManualMicStop = true;

    if (window.universalMicRec) {
        try { window.universalMicRec.stop(); } catch(e){}
        window.universalMicRec = null;
    }

    if (window.localAudioTrack) {
        try { await window.localAudioTrack.setMuted(false); } catch(e){}
    }

    if (window.showToast) window.showToast("Stopped", "Voice recording finished.", "", "");
};

window.playAIVoice = function(encodedText, langCode) {
    if (!window.speechSynthesis) return alert("Your browser does not support AI Voice.");
    window.speechSynthesis.cancel();

    let text = "";
    try { text = decodeURIComponent(encodedText); } catch(e) { text = unescape(encodedText); }

    const utterance = new SpeechSynthesisUtterance(text);
    const voiceMap = {
        'en': 'en-US', 'ru': 'ru-RU', 'kk': 'kk-KZ', 'az': 'tr-TR', 'tr': 'tr-TR',
        'de': 'de-DE', 'ar': 'ar-AE', 'it': 'it-IT', 'es': 'es-ES',
        'fr': 'fr-FR', 'pt': 'pt-PT', 'ja': 'ja-JP', 'zh': 'zh-CN'
    };
    let cleanCode = window.normalizeLangCode(langCode);
    utterance.lang = voiceMap[cleanCode] || cleanCode;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
};

window.autoSetMicLang = function() {
    let rMic = document.getElementById('plus-mic-lang');
    if(rMic && !rMic.value) rMic.value = 'auto';
};

// =========================================================================
// ФУНКЦИЯ 2: ЖИВОЙ ПЕРЕВОДЧИК ДЛЯ АУДИО/ВИДЕО ЗВОНКОВ (Через Firebase)
// =========================================================================
window.liveCallRec = null;
window.isManualLiveCallStop = false;

window.startVoiceAI = function() {
    if (window.liveCallRec) {
        window.isManualLiveCallStop = true;
        try { window.liveCallRec.stop(); } catch(e){}
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return console.warn("Speech Recognition not supported.");

    window.isManualLiveCallStop = false;
    window.liveCallRec = new SpeechRec();
    window.liveCallRec.continuous = true;
    window.liveCallRec.interimResults = false;

    let manualMicLang = localStorage.getItem(window.getMicLangKey ? window.getMicLangKey() : 'hf_mic_lang') || 'auto';
    let mySpokenLang = window.getSmartLang(window.myProfileInfo);
    window.liveCallRec.lang = (manualMicLang !== 'auto') ? manualMicLang : window.toSpeechLocale(mySpokenLang);

    window.liveCallRec.onresult = async (e) => {
        let transcript = e.results[e.results.length - 1][0].transcript;
        if (!transcript.trim()) return;

        let targetLang = window.currentTargetUser ? window.getSmartLang(window.currentTargetUser) : 'en';
        targetLang = window.normalizeLangCode(targetLang);

        let textToShip = transcript;
        let spokenLangCode = window.normalizeLangCode(window.liveCallRec.lang);

        try {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(transcript)}`);
            const data = await res.json();
            if (data && data[0]) {
                textToShip = data[0].map(item => item[0]).join('');
            }

            let activeFlagCode = window.myProfileInfo.flagCode || 'un';
            let activeFlag = window.myProfileInfo.flag || '🌐';

            if (manualMicLang !== 'auto') {
                const revLangMap = {
                    'en': ['gb', '🇬🇧'], 'kk': ['kz', '🇰🇿'], 'ru': ['ru', '🇷🇺'],
                    'az': ['az', '🇦🇿'], 'de': ['de', '🇩🇪'], 'tr': ['tr', '🇹🇷'],
                    'ar': ['ae', '🇦🇪'], 'it': ['it', '🇮🇹'], 'es': ['es', '🇪🇸'],
                    'fr': ['fr', '🇫🇷'], 'pt': ['pt', '🇵🇹'], 'ja': ['jp', '🇯🇵'],
                    'zh': ['cn', '🇨🇳']
                };
                if (revLangMap[spokenLangCode]) {
                    activeFlagCode = revLangMap[spokenLangCode][0];
                    activeFlag = revLangMap[spokenLangCode][1];
                }
            }

            let isVideoCall = (window.myLastOutgoingCallType === 'video' || window.currentIncomingCallType === 'video');

            let targetDbRoom = 'global';
            if (window.currentTargetUser) {
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
                isVoiceRoomMsg: !isVideoCall,
                isConfMsg: isVideoCall
            });

        } catch(err) { console.error("Ошибка перевода звонка:", err); }
    };

    // === ХАК АВТОПЕРЕЗАПУСКА ДЛЯ ЗВОНКОВ ===
    window.liveCallRec.onend = () => {
        if (!window.isManualLiveCallStop && window.liveCallRec) {
            try { window.liveCallRec.start(); } catch(err) {}
        }
    };

    window.liveCallRec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'aborted') {
            window.isManualLiveCallStop = true;
        }
    };

    try { window.liveCallRec.start(); } catch(err){}
};

window.stopVoiceAI = function() {
    window.isManualLiveCallStop = true;
    if (window.liveCallRec) {
        try { window.liveCallRec.stop(); } catch(err){}
        window.liveCallRec = null;
    }
};

window.handleIncomingSpeech = function(payload) {
    console.log("Входящий перевод:", payload.text);

    if (window.currentIncomingCallType === 'video' || window.myLastOutgoingCallType === 'video') {
        let callerId = window.currentTargetUser ? window.currentTargetUser.id : 'speaker';
        let marquee = document.getElementById(`conf-marquee-${callerId}`) || document.getElementById('speaker-marquee');
        if (marquee) {
            let callerName = window.currentTargetUser ? window.currentTargetUser.name.split(' ')[0] : 'Собеседник';
            marquee.innerText = `[${callerName}]: ${payload.text}`;
            marquee.style.animation = 'none';
            marquee.offsetHeight;
            marquee.style.animation = null;
        }
    } else {
        let voiceMarquee = document.getElementById('voice-info-marquee');
        if (voiceMarquee) voiceMarquee.innerText = `[Перевод]: ${payload.text}`;

        let langToPlay = payload.langCode || payload.lang || 'en';
        window.playAIVoice(encodeURIComponent(payload.text), langToPlay);
    }
};

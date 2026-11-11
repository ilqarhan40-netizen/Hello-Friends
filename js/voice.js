// ==========================================
// MODULE: VOICE, MIC, AI AUDIO & LIVE CALL TRANSLATOR
// ==========================================

window.currentMicInputTarget = 'chat-input';

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
    let phone = userProfile.phone || "";
    let flag = userProfile.flagCode || "un";
    
    if (phone.startsWith('+7')) return 'ru';
    if (phone.startsWith('+994')) return 'az';
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
        'ru': 'ru', 'az': 'az', 'it': 'it', 'de': 'de', 'fr': 'fr', 
        'jp': 'ja', 'es': 'es', 'cn': 'zh', 'pt': 'pt', 'gb': 'en', 'us': 'en', 'ae': 'ar'
    };
    if (flagToLang[flag]) return flagToLang[flag];
    
    return userProfile.langCode || 'en';
};

// --- ФУНКЦИЯ 1: ОДИНОЧНОЕ ГОЛОСОВОЕ СООБЩЕНИЕ (Безлимитка + Обход Agora) ---
window.universalMicRec = null; 
window.isManualMicStop = false; // <-- ФЛАГ БЕЗЛИМИТА

window.startUniversalMic = async function(mode) {
    window.speechRecognizedText = "";
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return alert("Browser does not support Speech Recognition.");
    
    // 1. ОБХОД КОНФЛИКТА: Временно "глушим" микрофон Агоры
    if (window.localAudioTrack) {
        try { await window.localAudioTrack.setMuted(true); } catch(e){}
    }

    // Если микрофон уже работал — убиваем старый процесс
    if (window.universalMicRec) {
        window.isManualMicStop = true;
        try { window.universalMicRec.stop(); } catch(e){}
    }

    window.isManualMicStop = false; // Сбрасываем флаг перед стартом
    let rec = new SpeechRec();
    window.universalMicRec = rec;

    // 2. БЕЗЛИМИТКА
    rec.continuous = true; 
    rec.interimResults = false;
    
    let langSelect = document.getElementById('plus-mic-lang');
    let selectedMicLang = langSelect ? langSelect.value : 'auto';
    
    if (selectedMicLang === 'auto') {
        let phone = window.myProfileInfo.phone || ""; 
        let flag = window.myProfileInfo.flagCode || "un"; 
        let autoLang = 'en-US'; 
        if (phone.startsWith('+7')) autoLang = 'ru-RU'; 
        else if (phone.startsWith('+994')) autoLang = 'az-AZ'; 
        else if (phone.startsWith('+39')) autoLang = 'it-IT'; 
        else if (phone.startsWith('+49')) autoLang = 'de-DE'; 
        else if (phone.startsWith('+33')) autoLang = 'fr-FR'; 
        else if (phone.startsWith('+81')) autoLang = 'ja-JP'; 
        else if (phone.startsWith('+34')) autoLang = 'es-ES'; 
        else if (phone.startsWith('+86')) autoLang = 'zh-CN'; 
        else if (phone.startsWith('+351')) autoLang = 'pt-PT'; 
        else if (flag === 'ru') autoLang = 'ru-RU'; 
        else if (flag === 'az') autoLang = 'az-AZ'; 
        else if (flag === 'it') autoLang = 'it-IT'; 
        else if (flag === 'de') autoLang = 'de-DE'; 
        else if (flag === 'fr') autoLang = 'fr-FR'; 
        else if (flag === 'jp') autoLang = 'ja-JP'; 
        else if (flag === 'es') autoLang = 'es-ES'; 
        else if (flag === 'cn') autoLang = 'zh-CN'; 
        else if (flag === 'pt') autoLang = 'pt-PT';
        rec.lang = autoLang;
    } else {
        rec.lang = selectedMicLang;
    }
    
    if (window.showToast) window.showToast("Listening...", "Speak into the microphone", "", "");
    
    rec.onresult = async (e) => { 
        window.speechRecognizedText = e.results[e.results.length - 1][0].transcript; 
        let targetLang = 'en'; 
        
        if (selectedMicLang !== 'auto') {
            targetLang = selectedMicLang.split('-')[0]; 
        } else {
            if (window.currentTargetUser && window.currentRoomId !== 'global') {
                targetLang = window.getSmartLang(window.currentTargetUser);
            } else {
                targetLang = window.appLang || window.getSmartLang(window.myProfileInfo);
            }
        }

        if (window.showToast) window.showToast("Translating...", "Processing your voice...", "", "");
        let textToShip = window.speechRecognizedText;
        
        try { 
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(window.speechRecognizedText)}`); 
            const data = await res.json(); 
            if (data && data[0] && data[0][0][0]) textToShip = data[0][0][0]; 
        } catch (err) {}

        let isVoice = window.currentMicInputTarget === 'voice-chat-input';
        let isConf = window.currentMicInputTarget === 'conf-chat-input';

        if (mode === 'text') {
            firebase.database().ref(window.currentRoomId).push({ userId: window.myProfileInfo.id, name: window.myUsername, text: textToShip, originalText: window.speechRecognizedText, sessionId: window.mySessionId, timestamp: firebase.database.ServerValue.TIMESTAMP, photo: window.myProfileInfo.photo, flag: window.myProfileInfo.flag, flagCode: window.myProfileInfo.flagCode, langCode: targetLang, isVoiceRoomMsg: isVoice, isConfMsg: isConf });
        } else if (mode === 'ai-audio') {
            firebase.database().ref(window.currentRoomId).push({ userId: window.myProfileInfo.id, name: window.myUsername, text: textToShip, isAIAudio: true, originalText: window.speechRecognizedText, sessionId: window.mySessionId, timestamp: firebase.database.ServerValue.TIMESTAMP, photo: window.myProfileInfo.photo, flag: window.myProfileInfo.flag, flagCode: window.myProfileInfo.flagCode, langCode: targetLang, isVoiceRoomMsg: isVoice, isConfMsg: isConf });
        }
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
    window.isManualMicStop = true; // Отключаем автоперезапуск

    if (window.universalMicRec) {
        try { window.universalMicRec.stop(); } catch(e){}
        window.universalMicRec = null;
    }
    
    // Возвращаем микрофон Агоре, чтобы собеседник снова начал тебя слышать
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
    const voiceMap = { 'en': 'en-US', 'ru': 'ru-RU', 'az': 'tr-TR', 'it': 'it-IT', 'es': 'es-ES', 'fr': 'fr-FR', 'pt': 'pt-PT', 'ja': 'ja-JP', 'zh': 'zh-CN' };
    utterance.lang = voiceMap[langCode] || langCode; 
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
window.isManualLiveCallStop = false; // <-- ФЛАГ ДЛЯ ЗВОНКОВ

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
    window.liveCallRec.lang = (manualMicLang !== 'auto') ? manualMicLang : mySpokenLang;

    window.liveCallRec.onresult = async (e) => {
        let transcript = e.results[e.results.length - 1][0].transcript;
        if (!transcript.trim()) return;

        let targetLang = window.currentTargetUser ? window.getSmartLang(window.currentTargetUser) : 'en';
        let textToShip = transcript;
        let spokenLangCode = window.liveCallRec.lang.substring(0, 2);
        
        try {
            if (spokenLangCode !== targetLang.substring(0, 2)) {
                const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${spokenLangCode}&tl=${targetLang.substring(0,2)}&dt=t&q=${encodeURIComponent(transcript)}`);
                const data = await res.json();
                if (data && data[0] && data[0][0][0]) textToShip = data[0][0][0];
            }
            
            let activeFlagCode = window.myProfileInfo.flagCode || 'un';
            let activeFlag = window.myProfileInfo.flag || '🌐';
            
            if (manualMicLang !== 'auto') {
                const revLangMap = { 'en':['gb','🇬🇧'], 'kk':['kz','🇰🇿'], 'ru':['ru','🇷🇺'], 'az':['az','🇦🇿'], 'de':['de','🇩🇪'], 'tr':['tr','🇹🇷'], 'ar':['ae','🇦🇪'], 'it':['it','🇮🇹'], 'es':['es','🇪🇸'], 'fr':['fr','🇫🇷'], 'pt':['pt','🇵🇹'], 'ja':['jp','🇯🇵'], 'zh':['cn','🇨🇳'] };
                if (revLangMap[spokenLangCode]) {
                    activeFlagCode = revLangMap[spokenLangCode][0];
                    activeFlag = revLangMap[spokenLangCode][1];
                }
            }
            
                        // 1. Узнаем тип текущего звонка (видео или аудио)
            let isVideoCall = (window.myLastOutgoingCallType === 'video' || window.currentIncomingCallType === 'video');

            // 2. Находим правильную приватную комнату для вас двоих
            let targetDbRoom = 'global';
            if (window.currentTargetUser) {
                let id1 = String(window.myProfileInfo.id); 
                let id2 = String(window.currentTargetUser.id);
                targetDbRoom = (id1 < id2) ? ("private_" + id1 + "_" + id2) : ("private_" + id2 + "_" + id1);
            } else if (window.currentRoomId && window.currentRoomId !== 'global') {
                targetDbRoom = window.currentRoomId;
            }

            // 3. Отправляем в Firebase
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
                langCode: targetLang.substring(0,2),
                isVoiceRoomMsg: !isVideoCall, // true если аудио, false если видео
                isConfMsg: isVideoCall        // true если ВИДЕО
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

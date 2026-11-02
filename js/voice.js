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

// --- ФУНКЦИЯ 1: ОДИНОЧНОЕ ГОЛОСОВОЕ СООБЩЕНИЕ (Твоя оригинальная) ---
window.startUniversalMic = async function(mode) {
    window.speechRecognizedText = "";
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    let rec = SpeechRec ? new SpeechRec() : null;
    if (!rec) return alert("Browser does not support Speech Recognition.");
    
    rec.continuous = false; rec.interimResults = false;
    
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
        window.speechRecognizedText = e.results[0][0].transcript; 
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
    try { rec.start(); } catch(e){}
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
// ФУНКЦИЯ 2: ЖИВОЙ ПЕРЕВОДЧИК ДЛЯ АУДИО/ВИДЕО ЗВОНКОВ (WebRTC DataChannel)
// =========================================================================
window.liveCallRec = null;

window.startVoiceAI = function() {
    if (window.liveCallRec) return; // Уже запущен
    
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return console.warn("Speech Recognition not supported.");

    window.liveCallRec = new SpeechRec();
    window.liveCallRec.continuous = true; // Слушаем постоянно, пока идет звонок
    window.liveCallRec.interimResults = false;

    // Мой язык
    let myLangCode = window.getSmartLang(window.myProfileInfo);
    window.liveCallRec.lang = myLangCode === 'ru' ? 'ru-RU' : 'en-US'; // Можно расширить

    window.liveCallRec.onresult = async (e) => {
        let transcript = e.results[e.results.length - 1][0].transcript;
        if (!transcript.trim()) return;

        // Если звонок идет, шлем текст через быстрый DataChannel
        if (window.webrtcDataChannel && window.webrtcDataChannel.readyState === 'open') {
            
            // Язык собеседника
            let targetLang = window.currentTargetUser ? window.getSmartLang(window.currentTargetUser) : 'en';

            try {
                // Переводим МОЙ голос на язык СОБЕСЕДНИКА перед отправкой
                let textToShip = transcript;
                if (myLangCode !== targetLang) {
                    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${myLangCode}&tl=${targetLang}&dt=t&q=${encodeURIComponent(transcript)}`);
                    const data = await res.json();
                    if (data && data[0] && data[0][0][0]) textToShip = data[0][0][0];
                }

                // Отправляем переведенный текст собеседнику
                window.webrtcDataChannel.send(JSON.stringify({
                    type: 'speech',
                    text: textToShip,
                    lang: targetLang
                }));
            } catch(err) { console.error("Ошибка живого перевода:", err); }
        }
    };

    window.liveCallRec.onend = () => {
        // Если звонок еще идет, перезапускаем микрофон
        if (window.peerConnection && window.liveCallRec) {
            try { window.liveCallRec.start(); } catch(err) {}
        }
    };

    try { window.liveCallRec.start(); } catch(err){}
};

window.stopVoiceAI = function() {
    if (window.liveCallRec) {
        window.liveCallRec.onend = null; // Отключаем перезапуск
        try { window.liveCallRec.stop(); } catch(err){}
        window.liveCallRec = null;
    }
};

window.handleIncomingSpeech = function(payload) {
    console.log("Входящий перевод:", payload.text);
    
    // Если это ВИДЕОЗВОНОК - показываем субтитры
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
    } 
    // Если это АУДИОЗВОНОК - озвучиваем роботом
    else {
        let voiceMarquee = document.getElementById('voice-info-marquee');
        if (voiceMarquee) voiceMarquee.innerText = `[Перевод]: ${payload.text}`;
        
        window.playAIVoice(encodeURIComponent(payload.text), payload.lang);
    }
};

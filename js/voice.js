// ==========================================
// MODULE: VOICE, MIC & AI AUDIO
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
        let targetLang = window.currentTargetUser ? window.getSmartLang(window.currentTargetUser) : window.getSmartLang(window.myProfileInfo);

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
            firebase.database().ref(window.currentRoomId).push({ userId: window.myProfileInfo.id, name: window.myUsername, text: textToShip, originalText: window.speechRecognizedText, sessionId: window.mySessionId, timestamp: firebase.database.ServerValue.TIMESTAMP, photo: window.myProfileInfo.photo, flag: window.myProfileInfo.flag, flagCode: window.myProfileInfo.flagCode, langCode: window.myProfileInfo.langCode, isVoiceRoomMsg: isVoice, isConfMsg: isConf });
        } else if (mode === 'ai-audio') {
            firebase.database().ref(window.currentRoomId).push({ userId: window.myProfileInfo.id, name: window.myUsername, text: textToShip, isAIAudio: true, originalText: window.speechRecognizedText, sessionId: window.mySessionId, timestamp: firebase.database.ServerValue.TIMESTAMP, photo: window.myProfileInfo.photo, flag: window.myProfileInfo.flag, flagCode: window.myProfileInfo.flagCode, langCode: window.myProfileInfo.langCode, isVoiceRoomMsg: isVoice, isConfMsg: isConf });
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

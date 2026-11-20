// ==========================================
// MODULE: AI VOICE SYNTHESIS & COMPATIBILITY (CLEAN v2)
// Озвучка текста на 13 языках + совместимость без конфликтов с video-room.js
// ==========================================

window.currentMicInputTarget = window.currentMicInputTarget || 'chat-input';

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
    if (!val || val === 'auto' || val === 'un') return 'auto';
    const base = val.split(/[-_]/)[0].substring(0, 2);
    const fix = { kz: 'kk', cn: 'zh', jp: 'ja', ae: 'ar', sa: 'ar', eg: 'ar', gb: 'en', us: 'en', uk: 'en', br: 'pt', mx: 'es' };
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
    if (window.currentIndex === 1) {
        const savedVideo = localStorage.getItem('hf_video_mic_lang');
        if (savedVideo && savedVideo !== 'auto') return window.normalizeMicLang(savedVideo);
    }
    if (typeof window.getMicLangKey === 'function') {
        const saved = localStorage.getItem(window.getMicLangKey());
        if (saved && saved !== 'auto') return window.normalizeMicLang(saved);
    }
    return 'auto';
};

// Не перезаписываем обработчик microphones.js, если он уже подключён
if (typeof window.toggleUniversalMic !== 'function') {
    window.toggleUniversalMic = function(e, inputId) {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        window.currentMicInputTarget = inputId || 'chat-input';
        if (typeof window.hfOpenRoomMic === 'function') {
            window.hfOpenRoomMic(window.currentIndex === 1 ? 'video' : 'global', e, inputId);
        }
    };
}

window.handleSmartCall = function() {
    if (!window.currentRoomId || window.currentRoomId === 'global' || window.currentRoomId.startsWith('private_me') || window.currentRoomId === 'private_ai_bot') {
        alert("Please select a user from the Contacts list to make a call.");
    } else if (typeof window.startInAppCall === 'function') {
        window.startInAppCall();
    }
};

// ==========================================
// 1. ДВИЖОК ОЗВУЧКИ ТЕКСТА (AI VOICE TTS — 13 ЯЗЫКОВ)
// ==========================================
window.playAIVoice = function(encodedText, langCode) {
    if (!window.speechSynthesis || !encodedText) return;

    let text = '';
    try {
        text = decodeURIComponent(encodedText);
    } catch (e) {
        text = String(encodedText);
    }
    text = text.trim();
    if (!text) return;

    try { window.speechSynthesis.cancel(); } catch (e) {}

    const norm = window.normalizeMicLang(langCode);
    const voiceMap = {
        en: 'en-US',
        ru: 'ru-RU',
        az: 'az-AZ',
        tr: 'tr-TR',
        de: 'de-DE',
        kk: 'kk-KZ',
        ar: 'ar-AE',
        it: 'it-IT',
        es: 'es-ES',
        fr: 'fr-FR',
        pt: 'pt-PT',
        ja: 'ja-JP',
        zh: 'zh-CN'
    };

    let targetBcp = voiceMap[norm] || (langCode && langCode !== 'auto' ? langCode : 'en-US');

    // Если в системе нет голоса az-AZ — мягкий фолбэк на tr-TR, чтобы озвучка не молчала
    const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
    if (norm === 'az' && voices.length > 0) {
        const hasAz = voices.some(v => v.lang && v.lang.toLowerCase().startsWith('az'));
        if (!hasAz) targetBcp = 'tr-TR';
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetBcp;
    utterance.rate = 1.0;

    if (voices.length > 0) {
        const prefix = targetBcp.split('-')[0].toLowerCase();
        const match = voices.find(v => v.lang && v.lang.toLowerCase() === targetBcp.toLowerCase()) ||
                      voices.find(v => v.lang && v.lang.toLowerCase().startsWith(prefix));
        if (match) utterance.voice = match;
    }

    try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.warn('AI Voice speak error:', e);
    }
};

// ==========================================
// 2. БЕЗОПАСНЫЕ ОБЁРТКИ СОВМЕСТИМОСТИ ДЛЯ ВКЛАДКИ 1
// (Вся логика комнаты, микрофона и бегущей строки теперь в js/video-room.js)
// ==========================================
window.startAudioRoomMic = function(mode) {
    if (typeof window.startVideoRoomMic === 'function') {
        return window.startVideoRoomMic(mode || 'text');
    }
};

window.stopAudioRoomMic = function(skipResumeAgora) {
    if (typeof window.stopVideoRoomMic === 'function') {
        return window.stopVideoRoomMic(Boolean(skipResumeAgora));
    }
};

window.stopUniversalMic = async function() {
    if (window.videoRoomMicActive && typeof window.stopVideoRoomMic === 'function') {
        await window.stopVideoRoomMic(false);
    }
    if (window.showToast) window.showToast("Stopped", "Voice recording finished.", "", "");
};

window.startVoiceAI = function() {
    if (typeof window.startVideoRoomMic === 'function') {
        return window.startVideoRoomMic('text');
    }
};

window.stopVoiceAI = function(skipResumeAgora) {
    if (window.videoRoomMicActive && typeof window.stopVideoRoomMic === 'function') {
        return window.stopVideoRoomMic(Boolean(skipResumeAgora));
    }
};

window.sendAudioRoomMsg = function() {
    if (typeof window.sendVideoRoomMsg === 'function') {
        return window.sendVideoRoomMsg();
    }
};

window.sendAudioRoomText = function(rawText, isAIAudio) {
    if (typeof window.sendVideoRoomPayload === 'function') {
        return window.sendVideoRoomPayload(rawText, 'voice', Boolean(isAIAudio));
    }
};

window.handleIncomingSpeech = function(payload) {
    if (!payload || !payload.text) return;
    if (typeof window.pushToVideoMarquee === 'function') {
        window.pushToVideoMarquee(`<span class="text-yellow-400 font-bold">${payload.text}</span>`, 'voice');
    }
    window.playAIVoice(encodeURIComponent(payload.text), payload.langCode || payload.lang || 'en');
};

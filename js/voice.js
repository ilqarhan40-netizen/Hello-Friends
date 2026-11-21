// ==========================================
// MODULE: AI VOICE SYNTHESIS & ECHO GUARD (CLEAN v3)
// Озвучка текста на 13 языках + защита бесконечного микрофона от эха
// ==========================================

window.currentMicInputTarget = window.currentMicInputTarget || 'chat-input';
window._currentUtterance = null;
window._aiVoiceEndFallbackTimer = null;

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
// 1. ДВИЖОК ОЗВУЧКИ ТЕКСТА (13 ЯЗЫКОВ + АНТИ-ЭХО)
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

    clearTimeout(window._aiVoiceEndFallbackTimer);
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

    const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
    if (norm === 'az' && voices.length > 0) {
        const hasAz = voices.some(v => v.lang && v.lang

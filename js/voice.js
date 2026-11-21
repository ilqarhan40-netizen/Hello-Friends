// ==========================================
// MODULE: AI VOICE SYNTHESIS (CLEAN v4)
// Озвучка текста на 13 языках + защита от эха
// ==========================================

window._currentUtterance = null;
window._aiVoiceEndFallbackTimer = null;

window.normalizeMicLang = function (raw) {
    if (!raw) return 'auto';
    const val = String(raw).trim().toLowerCase();
    if (!val || val === 'auto' || val === 'un') return 'auto';
    const base = val.split(/[-_]/)[0].substring(0, 2);
    const fix = { kz: 'kk', cn: 'zh', jp: 'ja', ae: 'ar', sa: 'ar', eg: 'ar', gb: 'en', us: 'en', uk: 'en', br: 'pt', mx: 'es' };
    return fix[base] || base;
};

window.handleSmartCall = function () {
    if (!window.currentRoomId || window.currentRoomId === 'global' || window.currentRoomId.startsWith('private_me') || window.currentRoomId === 'private_ai_bot') {
        alert("Please select a user from the Contacts list to make a call.");
    } else if (typeof window.startInAppCall === 'function') {
        window.startInAppCall();
    }
};

window.playAIVoice = function (encodedText, langCode) {
    if (!window.speechSynthesis || !encodedText) return;

    let text = '';
    try { text = decodeURIComponent(encodedText); } catch (e) { text = String(encodedText); }
    text = text.trim();
    if (!text) return;

    clearTimeout(window._aiVoiceEndFallbackTimer);
    try { window.speechSynthesis.cancel(); } catch (e) {}

    const norm = window.normalizeMicLang(langCode);
    const voiceMap = {
        en: 'en-US', ru: 'ru-RU', az: 'az-AZ', tr: 'tr-TR', de: 'de-DE',
        kk: 'kk-KZ', ar: 'ar-AE', it: 'it-IT', es: 'es-ES', fr: 'fr-FR',
        pt: 'pt-PT', ja: 'ja-JP', zh: 'zh-CN'
    };

    let targetBcp = voiceMap[norm] || 'en-US';
    const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];

    if (norm === 'az' && voices.length > 0) {
        const hasAz = voices.some(v => v.lang && v.lang.toLowerCase().startsWith('az'));
        if (!hasAz) targetBcp = 'tr-TR';
    }

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = targetBcp;
    utter.rate = 1.0;

    if (voices.length > 0) {
        const prefix = targetBcp.split('-')[0].toLowerCase();
        const match = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(prefix));
        if (match) utter.voice = match;
    }

    const finish = () => {
        clearTimeout(window._aiVoiceEndFallbackTimer);
        window._currentUtterance = null;
        if (typeof window.onAIVoiceEnd === 'function') window.onAIVoiceEnd();
    };

    utter.onstart = () => {
        if (typeof window.onAIVoiceStart === 'function') window.onAIVoiceStart();
    };
    utter.onend = finish;
    utter.onerror = finish;

    window._currentUtterance = utter;
    window._aiVoiceEndFallbackTimer = setTimeout(finish, Math.max(4000, text.length * 120));
    window.speechSynthesis.speak(utter);
};

window.stopVoiceAI = function () {
    clearTimeout(window._aiVoiceEndFallbackTimer);
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
    window._currentUtterance = null;
};

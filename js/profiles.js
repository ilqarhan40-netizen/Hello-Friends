// ==========================================
// 1. БАЗОВЫЙ ЯЗЫК ПРИЛОЖЕНИЯ И ПРОФИЛЯ (СТРОГО ПО ФЛАГУ И СТРАНЕ)
// ==========================================
window.getLangByFlag = function(flagCode, flagEmoji) {
    const codeMap = { 'ru':'ru', 'kz':'kk', 'az':'az', 'it':'it', 'de':'de', 'fr':'fr', 'jp':'ja', 'es':'es', 'cn':'zh', 'pt':'pt', 'gb':'en', 'us':'en', 'ae':'ar', 'tr':'tr' };
    const emojiMap = { '🇷🇺':'ru', '🇰🇿':'kk', '🇦🇿':'az', '🇮🇹':'it', '🇩🇪':'de', '🇫🇷':'fr', '🇯🇵':'ja', '🇪🇸':'es', '🇨🇳':'zh', '🇵🇹':'pt', '🇬🇧':'en', '🇺🇸':'en', '🇦🇪':'ar', '🇹🇷':'tr' };
    let c = flagCode ? String(flagCode).toLowerCase().trim() : '';
    if (c && c !== 'un' && codeMap[c]) return codeMap[c];
    if (flagEmoji && flagEmoji !== '🌐' && emojiMap[flagEmoji]) return emojiMap[flagEmoji];
    return null;
};

window.getSmartLang = function(userData) {
    if (!userData) return navigator.language ? navigator.language.slice(0, 2) : 'en';

    // Приоритет №1: строго Флаг и Страна
    if (typeof userData === 'object') {
        let langFromFlag = window.getLangByFlag(userData.flagCode, userData.flag);
        if (langFromFlag) return langFromFlag;
    }

    // Приоритет №2: сохранённый langCode профиля
    let langPref = typeof userData === 'object' ? userData.langCode : null;
    if (langPref === 'kz') langPref = 'kk';
    if (langPref === 'cn') langPref = 'zh';
    if (langPref === 'jp') langPref = 'ja';
    if (langPref === 'ae') langPref = 'ar';
    if (langPref && langPref !== 'auto' && langPref !== 'un') return langPref;

    // Резерв: язык устройства
    return navigator.language ? navigator.language.slice(0, 2) : 'en';
};

window.changeAppLanguage = function(langCode) {
    localStorage.setItem('hf_app_lang', langCode);

    if (langCode === 'auto') {
        let smartLang = null;
        if (window.myProfileInfo) {
            smartLang = window.getLangByFlag(window.myProfileInfo.flagCode, window.myProfileInfo.flag);
            if (!smartLang) {
                let pLang = window.myProfileInfo.langCode;
                if (pLang === 'kz') pLang = 'kk';
                if (pLang === 'cn') pLang = 'zh';
                if (pLang === 'jp') pLang = 'ja';
                if (pLang === 'ae') pLang = 'ar';
                if (pLang && pLang !== 'auto' && pLang !== 'un') smartLang = pLang;
            }
        }
        window.appLang = smartLang || (navigator.language ? navigator.language.slice(0, 2) : 'en');
    } else {
        window.appLang = langCode;
    }

    if (typeof window.applyTranslations === 'function') window.applyTranslations();
    if (typeof window.closeDropdown === 'function') window.closeDropdown();
    const langSelect = document.getElementById('app-lang-select');
    if (langSelect) langSelect.value = langCode;
};

if (!window.profileLangHooked) {
    const originalSaveProfile = window.saveProfileData;
    window.saveProfileData = function() {
        if (originalSaveProfile) originalSaveProfile();
        let currentSetting = localStorage.getItem('hf_app_lang') || 'auto';
        if (currentSetting === 'auto') {
            setTimeout(() => { window.changeAppLanguage('auto'); }, 300);
        }
    };
    window.profileLangHooked = true;
}

setTimeout(() => {
    let saved = localStorage.getItem('hf_app_lang') || 'auto';
    window.changeAppLanguage(saved);
}, 1000);

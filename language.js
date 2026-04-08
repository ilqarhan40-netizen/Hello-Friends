// ==========================================
// MODULE: LANGUAGE & TRANSLATION SETTINGS
// ==========================================

window.personalLangs = [
    { val: 'auto', label: '🤖 Auto (Profile)' },
    { val: 'en', label: '🇬🇧 English' },
    { val: 'ru', label: '🇷🇺 Русский' },
    { val: 'az', label: '🇦🇿 Azərbaycanca' },
    { val: 'de', label: '🇩🇪 Deutsch' },
    { val: 'tr', label: '🇹🇷 Türkçe' },
    { val: 'ar', label: '🇦🇪 العربية' },
    { val: 'it', label: '🇮🇹 Italiano' },
    { val: 'es', label: '🇪🇸 Español' },
    { val: 'fr', label: '🇫🇷 Français' },
    { val: 'pt', label: '🇵🇹 Português' },
    { val: 'ja', label: '🇯🇵 日本語' },
    { val: 'zh', label: '🇨🇳 中文' }
];

// Получить текущий язык для активной комнаты
window.getCurrentRoomLang = function() {
    let roomLang = localStorage.getItem('hf_lang_' + window.currentRoomId);
    if (!roomLang || roomLang === 'auto') {
        return window.myProfileInfo ? (window.myProfileInfo.langCode || 'en') : 'en';
    }
    return roomLang;
};

// Открыть модальное окно выбора языка
window.openPersonalLangModal = function() {
    if (window.closeDropdown) window.closeDropdown();
    
    // Читаем язык именно для текущей комнаты
    let current = localStorage.getItem('hf_lang_' + window.currentRoomId) || 'auto';
    let html = '';
    
    window.personalLangs.forEach(l => {
        let isActive = current === l.val;
        let btnClass = isActive ? 'bg-[#00a884] text-[#111b21] shadow-[0_0_15px_rgba(0,168,132,0.4)]' : 'bg-[#202c33] text-white border border-[#2a3942] hover:bg-[#2a3942]';
        html += `<button onclick="window.setPersonalLang('${l.val}')" class="w-full py-3 px-4 rounded-xl font-bold text-left transition ${btnClass}">${l.label}${isActive ? '<i class="fa-solid fa-check float-right mt-1 text-lg"></i>' : ''}</button>`;
    });
    
    document.getElementById('personal-lang-list').innerHTML = html;
    document.getElementById('personal-lang-modal').classList.add('active');
};

// Закрыть модальное окно
window.closePersonalLangModal = function() {
    document.getElementById('personal-lang-modal').classList.remove('active');
};

// Установить язык и привязать к ID комнаты
window.setPersonalLang = function(val) {
    localStorage.setItem('hf_lang_' + window.currentRoomId, val);
    window.closePersonalLangModal();
    
    let labelObj = window.personalLangs.find(l => l.val === val);
    let roomName = window.currentTargetUser ? window.currentTargetUser.name.split(' ')[0] : window.currentRoomId;
    
    if (window.showToast) {
        window.showToast('Language Changed', 'Room: ' + roomName + '\nSet to: ' + (labelObj ? labelObj.label : val), '', '');
    }
};

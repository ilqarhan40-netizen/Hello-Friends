// ==========================================
// MODULE: LANGUAGE & TRANSLATION SETTINGS
// ==========================================

window.personalLangs = [
    { val: 'auto', label: '🤖 Auto (Profile)' },
    { val: 'en', label: '🇬🇧 English' },
    { val: 'ru', label: '🇷🇺 Русский' },
    { val: 'kk', label: '🇰🇿 Қазақша' }, // Добавлен казахский язык
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

// ==========================================
// ПЕРЕВОДЫ БАННЕРОВ ПОЧТЫ И ПРОПУЩЕННЫХ ВЫЗОВОВ (13 ЯЗЫКОВ)
// ==========================================
window.HF_BANNER_I18N = {
    en: {
        new_mail_title: 'NEW EMAIL',
        new_mail_text: 'You have a new email',
        btn_open_mail: 'Open',
        missed_audio_title: 'MISSED AUDIO CALL',
        missed_audio_text: 'Missed audio call from',
        missed_video_title: 'MISSED VIDEO CALL',
        missed_video_text: 'Missed video call from',
        btn_later: 'Later',
        btn_callback: 'Call back'
    },
    ru: {
        new_mail_title: 'НОВОЕ ПИСЬМО',
        new_mail_text: 'Вам пришло новое письмо',
        btn_open_mail: 'Открыть',
        missed_audio_title: 'ПРОПУЩЕННЫЙ АУДИОВЫЗОВ',
        missed_audio_text: 'Пропущенный аудиозвонок от',
        missed_video_title: 'ПРОПУЩЕННЫЙ ВИДЕОВЫЗОВ',
        missed_video_text: 'Пропущенный видеозвонок от',
        btn_later: 'Позже',
        btn_callback: 'Перезвонить'
    },
    az: {
        new_mail_title: 'YENİ MƏKTUB',
        new_mail_text: 'Yeni e-poçtunuz var',
        btn_open_mail: 'Açmaq',
        missed_audio_title: 'BURAXILMIŞ AUDİO ZƏNG',
        missed_audio_text: 'Buraxılmış audio zəng:',
        missed_video_title: 'BURAXILMIŞ VİDEO ZƏNG',
        missed_video_text: 'Buraxılmış video zəng:',
        btn_later: 'Sonra',
        btn_callback: 'Geri zəng et'
    },
    kk: {
        new_mail_title: 'ЖАҢА ХАТ',
        new_mail_text: 'Сізге жаңа хат келді',
        btn_open_mail: 'Ашу',
        missed_audio_title: 'ҚАБЫЛДАНБАҒАН АУДИО ҚОҢЫРАУ',
        missed_audio_text: 'Қабылданбаған аудио қоңырау:',
        missed_video_title: 'ҚАБЫЛДАНБАҒАН БЕЙНЕ ҚОҢЫРАУ',
        missed_video_text: 'Қабылданбаған бейне қоңырау:',
        btn_later: 'Кейінірек',
        btn_callback: 'Қайта қоңырау'
    },
    tr: {
        new_mail_title: 'YENİ E-POSTA',
        new_mail_text: 'Yeni bir e-postanız var',
        btn_open_mail: 'Aç',
        missed_audio_title: 'CEVAPSIZ SESLİ ARAMA',
        missed_audio_text: 'Cevapsız sesli arama:',
        missed_video_title: 'CEVAPSIZ GÖRÜNTÜLÜ ARAMA',
        missed_video_text: 'Cevapsız görüntülü arama:',
        btn_later: 'Sonra',
        btn_callback: 'Geri ara'
    },
    de: {
        new_mail_title: 'NEUE E-MAIL',
        new_mail_text: 'Sie haben eine neue E-Mail',
        btn_open_mail: 'Öffnen',
        missed_audio_title: 'VERPASSTER AUDIOANRUF',
        missed_audio_text: 'Verpasster Audioanruf von',
        missed_video_title: 'VERPASSTER VIDEOANRUF',
        missed_video_text: 'Verpasster Videoanruf von',
        btn_later: 'Später',
        btn_callback: 'Zurückrufen'
    },
    ar: {
        new_mail_title: 'بريد جديد',
        new_mail_text: 'لديك رسالة بريد جديدة',
        btn_open_mail: 'فتح',
        missed_audio_title: 'مكالمة صوتية فائتة',
        missed_audio_text: 'مكالمة صوتية فائتة من',
        missed_video_title: 'مكالمة فيديو فائتة',
        missed_video_text: 'مكالمة فيديو فائتة من',
        btn_later: 'لاحقاً',
        btn_callback: 'معاودة الاتصال'
    },
    it: {
        new_mail_title: 'NUOVA EMAIL',
        new_mail_text: 'Hai una nuova email',
        btn_open_mail: 'Apri',
        missed_audio_title: 'CHIAMATA AUDIO PERSA',
        missed_audio_text: 'Chiamata audio persa da',
        missed_video_title: 'VIDEOCHIAMATA PERSA',
        missed_video_text: 'Videochiamata persa da',
        btn_later: 'Più tardi',
        btn_callback: 'Richiama'
    },
    es: {
        new_mail_title: 'NUEVO CORREO',
        new_mail_text: 'Tienes un nuevo correo',
        btn_open_mail: 'Abrir',
        missed_audio_title: 'LLAMADA DE AUDIO PERDIDA',
        missed_audio_text: 'Llamada de audio perdida de',
        missed_video_title: 'VIDEOLLAMADA PERDIDA',
        missed_video_text: 'Videollamada perdida de',
        btn_later: 'Más tarde',
        btn_callback: 'Devolver llamada'
    },
    fr: {
        new_mail_title: 'NOUVEL E-MAIL',
        new_mail_text: 'Vous avez un nouvel e-mail',
        btn_open_mail: 'Ouvrir',
        missed_audio_title: 'APPEL AUDIO MANQUÉ',
        missed_audio_text: 'Appel audio manqué de',
        missed_video_title: 'APPEL VIDÉO MANQUÉ',
        missed_video_text: 'Appel vidéo manqué de',
        btn_later: 'Plus tard',
        btn_callback: 'Rappeler'
    },
    pt: {
        new_mail_title: 'NOVO E-MAIL',
        new_mail_text: 'Você tem um novo e-mail',
        btn_open_mail: 'Abrir',
        missed_audio_title: 'CHAMADA DE ÁUDIO PERDIDA',
        missed_audio_text: 'Chamada de áudio perdida de',
        missed_video_title: 'CHAMADA DE VÍDEO PERDIDA',
        missed_video_text: 'Chamada de vídeo perdida de',
        btn_later: 'Mais tarde',
        btn_callback: 'Retornar'
    },
    ja: {
        new_mail_title: '新着メール',
        new_mail_text: '新しいメールが届きました',
        btn_open_mail: '開く',
        missed_audio_title: '不在着信（音声）',
        missed_audio_text: '音声通話の不在着信:',
        missed_video_title: '不在着信（ビデオ）',
        missed_video_text: 'ビデオ通話の不在着信:',
        btn_later: 'あとで',
        btn_callback: '折り返す'
    },
    zh: {
        new_mail_title: '新邮件',
        new_mail_text: '您有一封新邮件',
        btn_open_mail: '打开',
        missed_audio_title: '未接语音来电',
        missed_audio_text: '未接语音来电:',
        missed_video_title: '未接视频来电',
        missed_video_text: '未接视频来电:',
        btn_later: '稍后',
        btn_callback: '回拨'
    }
};

window.mergeBannerI18n = function() {
    window.i18n = window.i18n || {};
    Object.keys(window.HF_BANNER_I18N).forEach((code) => {
        window.i18n[code] = Object.assign({}, window.i18n[code] || {}, window.HF_BANNER_I18N[code]);
    });
};

window.mergeBannerI18n();
document.addEventListener('DOMContentLoaded', window.mergeBannerI18n);
window.addEventListener('load', window.mergeBannerI18n);

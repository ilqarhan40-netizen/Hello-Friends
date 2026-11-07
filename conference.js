// =======================================================
// УНИВЕРСАЛЬНАЯ СИСТЕМА УВЕДОМЛЕНИЙ И КОНФЕРЕНЦИЙ
// =======================================================

// 1. Встроенный словарь на 13 языков (база для конференций)
window.confDict = {
    'ru': { title: 'ПРИГЛАШЕНИЕ', desc: 'ждет вас в видеокомнату!', btn: 'Войти', no: 'Позже' },
    'en': { title: 'INVITATION', desc: 'is waiting for you in the video room!', btn: 'Join', no: 'Later' },
    'it': { title: 'INVITO', desc: 'ti aspetta nella stanza video!', btn: 'Entra', no: 'Più tardi' },
    'es': { title: 'INVITACIÓN', desc: 'te espera en la sala de video!', btn: 'Unirse', no: 'Más tarde' },
    'fr': { title: 'INVITATION', desc: 'vous attend dans le salon vidéo!', btn: 'Rejoindre', no: 'Plus tard' },
    'de': { title: 'EINLADUNG', desc: 'wartet auf dich im Videoraum!', btn: 'Beitreten', no: 'Später' },
    'pt': { title: 'CONVITE', desc: 'espera por você na sala de vídeo!', btn: 'Entrar', no: 'Mais tarde' },
    'tr': { title: 'DAVET', desc: 'seni video odasında bekliyor!', btn: 'Katıl', no: 'Sonra' },
    'az': { title: 'DƏVƏT', desc: 'sizi video otaqda gözləyir!', btn: 'Qoşul', no: 'Sonra' },
    'kk': { title: 'ШАҚЫРУ', desc: 'сізді бейнебөлмеде күтуде!', btn: 'Қосылу', no: 'Кейін' }, // Нативное казахское
    'ar': { title: 'دعوة', desc: 'ينتظرك في غرفة الفيديو!', btn: 'انضمام', no: 'لاحقاً' },
    'ja': { title: '招待', desc: 'ビデオ会議でお待ちしています！', btn: '参加', no: '後で' },
    'zh': { title: '邀请', desc: '在视频房间等您！', btn: '加入', no: '稍后' }
};

// 2. Функция умного определения языка
window.getConfTranslation = function(key) {
    let uiLang = document.documentElement.lang || 'en';
    if (typeof window.getLangPref === 'function') {
        uiLang = window.getLangPref(false, false) || uiLang;
    }
    uiLang = uiLang.substring(0, 2).toLowerCase();
    if (uiLang === 'kz') uiLang = 'kk';

    if (typeof i18next !== 'undefined' && typeof i18next.t === 'function') {
        let globalText = i18next.t(`conference.${key}`);
        if (globalText && globalText !== `conference.${key}`) return globalText;
    }

    let dict = window.confDict[uiLang] || window.confDict['en'];
    return dict[key] || '';
};

// 3. ОТПРАВКА ПРИГЛАШЕНИЙ В КОНФЕРЕНЦИЮ
window.sendGroupInvites = function() {
    const checkboxes = document.querySelectorAll('#group-invite-list input[type="checkbox"]:checked');
    if (checkboxes.length === 0) return;

    const myId = window.myProfileInfo.id;
    
    checkboxes.forEach(cb => {
        const targetId = cb.value;
        const inviteData = {
            type: 'conference',
            senderId: myId,
            name: window.myUsername || 'User',
            photo: window.myProfileInfo.photo || 'https://ui-avatars.com/api/?name=U',
            flag: window.myProfileInfo.flag || '🌐',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        firebase.database().ref('user_notifications/' + targetId).push(inviteData);
    });

    if (window.showToast) window.showToast("Успех", "Приглашения доставлены адресатам!", "", "");
    if (typeof window.closeGroupInviteModal === 'function') window.closeGroupInviteModal();
};

// 4. УНИВЕРСАЛЬНЫЙ ПРИЕМНИК (Статичный, с вибрацией, ждет клика)
window.listenForDirectInvites = function() {
    if (!window.myProfileInfo || !window.myProfileInfo.id) {
        setTimeout(window.listenForDirectInvites, 1000);
        return;
    }

    const myId = window.myProfileInfo.id;
    
    firebase.database().ref('user_notifications/' + myId).on('child_added', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // Звук и мощная вибрация
        if (window.sndMsg) window.sndMsg.play().catch(e=>{});
        if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 400]); 

        const notifType = data.type || 'conference'; 
        let senderFirstName = (data.name || 'User').split(' ')[0];

        // СТАТИЧНЫЙ КОНТЕЙНЕР (абсолютное позиционирование внутри рамок телефона)
        let popup = document.createElement('div');
        popup.className = "absolute top-4 left-4 right-4 mx-auto z-[9999] max-w-[280px]";
        
        let contentHTML = '';

        // --- ВАРИАНТ 1: КОНФЕРЕНЦИЯ ---
        if (notifType === 'conference') {
            let tTitle = window.getConfTranslation('title');
            let tDesc = window.getConfTranslation('desc');
            let tBtn = window.getConfTranslation('btn');
            let tNo = window.getConfTranslation('no');

            popup.classList.add('bg-[#111b21]', 'border', 'border-[#00a884]', 'rounded-xl', 'p-2.5', 'shadow-[0_0_15px_rgba(0,168,132,0.4)]');
            contentHTML = `
                <div class="flex items-center gap-3">
                    <img src="${data.photo}" class="w-10 h-10 shrink-0 rounded-full border border-[#00a884] object-cover shadow-md">
                    <div class="flex flex-col flex-1">
                        <span data-i18n="conf_popup_title" class="text-[0.65rem] text-[#00a884] font-bold uppercase tracking-widest leading-none mb-1">${tTitle}</span>
                        <span class="text-white text-[0.8rem] leading-tight"><b>${data.flag} ${senderFirstName}</b> <span data-i18n="conf_popup_desc">${tDesc}</span></span>
                    </div>
                </div>
                <div class="flex gap-2 mt-1">
                    <button id="btn-no-${snapshot.key}" data-i18n="conf_popup_no" class="flex-1 bg-[#202c33] text-[#8696a0] py-1.5 rounded-lg font-bold text-[0.7rem] hover:text-white transition shadow-sm">${tNo}</button>
                    <button id="btn-yes-${snapshot.key}" class="flex-1 bg-[#00a884] text-[#111b21] py-1.5 rounded-lg font-bold text-[0.7rem] hover:scale-95 transition shadow-sm flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-video"></i> <span data-i18n="conf_invite_btn">${tBtn}</span>
                    </button>
                </div>
            `;
        } 
        // --- ВАРИАНТ 2: ПРОПУЩЕННЫЙ ЗВОНОК (Аудио и Видео) ---
        else if (notifType === 'missed_call') {
            let callIcon = data.isVideo ? 'fa-video-slash' : 'fa-phone-slash';
            let titleText = data.isVideo ? 'ВИДЕОЗВОНОК' : 'АУДИОЗВОНОК';
            let titleKey = data.isVideo ? 'missed_video_title' : 'missed_audio_title';
            let descText = data.isVideo ? 'пропущенный видеовызов' : 'пропущенный аудиовызов';
            let descKey = data.isVideo ? 'missed_video_desc' : 'missed_audio_desc';

            popup.classList.add('bg-[#111b21]', 'border', 'border-red-500', 'rounded-xl', 'p-3', 'shadow-[0_0_15px_rgba(239,68,68,0.3)]', 'cursor-pointer');
            contentHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500 shrink-0 shadow-md">
                        <i class="fa-solid ${callIcon} text-lg"></i>
                    </div>
                    <div class="flex flex-col flex-1">
                        <span data-i18n="${titleKey}" class="text-[0.65rem] text-red-500 font-bold uppercase tracking-widest leading-none mb-1">${titleText}</span>
                        <span class="text-white text-[0.8rem] leading-tight"><b>${data.flag || '🌐'} ${senderFirstName}</b> <span data-i18n="${descKey}">${descText}</span></span>
                    </div>
                </div>
            `;
        }
        // --- ВАРИАНТ 3: НОВОЕ ПИСЬМО ---
        else if (notifType === 'email') {
            popup.classList.add('bg-[#111b21]', 'border', 'border-[#3b82f6]', 'rounded-xl', 'p-3', 'shadow-[0_0_15px_rgba(59,130,246,0.3)]', 'cursor-pointer');
            contentHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500 shrink-0 shadow-md">
                        <i class="fa-solid fa-envelope text-lg"></i>
                    </div>
                    <div class="flex flex-col flex-1">
                        <span data-i18n="new_email_title" class="text-[0.65rem] text-blue-400 font-bold uppercase tracking-widest leading-none mb-1">НОВОЕ ПИСЬМО</span>
                        <span class="text-white text-[0.8rem] leading-tight">От: <b>${data.flag || '📧'} ${senderFirstName}</b></span>
                    </div>
                </div>
            `;
        }

        popup.innerHTML = contentHTML;
        
        // Привязываем внутрь телефона
        let appContainer = document.querySelector('.app-wrap') || document.querySelector('#app') || document.body;
        appContainer.appendChild(popup);

        // Обновляем переводы для добавленных элементов data-i18n
        if (typeof window.updateTranslations === 'function') window.updateTranslations();
        else if (typeof window.applyTranslations === 'function') window.applyTranslations();

        // --- ЛОГИКА ЗАКРЫТИЯ (Только ручная по клику) ---
        if (notifType === 'conference') {
            document.getElementById(`btn-no-${snapshot.key}`).onclick = () => { 
                if (navigator.vibrate) navigator.vibrate(0);
                popup.remove(); snapshot.ref.remove(); 
            };
            document.getElementById(`btn-yes-${snapshot.key}`).onclick = () => { 
                if (navigator.vibrate) navigator.vibrate(0);
                popup.remove(); snapshot.ref.remove(); 
                if (window.switchTab) window.switchTab(2); 
            };
        } else {
            // Для звонков и писем закрывается кликом по всей плашке
            popup.onclick = () => {
                if (navigator.vibrate) navigator.vibrate(0);
                popup.remove(); snapshot.ref.remove();
                if (notifType === 'email' && window.switchTab) window.switchTab(4); 
            };
        }
    });
};

// Запуск слушателя при загрузке приложения
window.addEventListener('load', () => { setTimeout(window.listenForDirectInvites, 2500); });


// =======================================================
// УМНАЯ СИСТЕМА ПРИГЛАШЕНИЙ В КОНФЕРЕНЦИЮ (ИЗОЛИРОВАННАЯ)
// =======================================================

// 1. Встроенный словарь на 13 языков экосистемы
window.confDict = {
    'ru': { title: 'ПРИГЛАШЕНИЕ', desc: 'ждет вас в видеокомнату!', btn: 'Войти', no: 'Позже' },
    'en': { title: 'INVITATION', desc: 'is waiting for you in the video room!', btn: 'Join', no: 'Later' },
    'it': { title: 'INVITO', desc: 'ti aspetta nella stanza video!', btn: 'Entra', no: 'Più tardi' },
    'es': { title: 'INVITACIÓN', desc: 'te espera en la sala de video!', btn: 'Unirse', no: 'Más tarde' },
    'fr': { title: 'INVITATION', desc: 'vous attend dans le salon vidéo!', btn: 'Rejoindre', no: 'Plus tard' },
    'de': { title: 'EINLADUNG', desc: 'wartet auf dich im Videoraum!', btn: 'Beitreten', no: 'Später' },
    'pt': { title: 'CONVITE', desc: 'está esperando por você na sala de vídeo!', btn: 'Entrar', no: 'Mais tarde' },
    'tr': { title: 'DAVET', desc: 'seni video odasında bekliyor!', btn: 'Katıl', no: 'Daha sonra' },
    'az': { title: 'DƏVƏT', desc: 'sizi video otaqda gözləyir!', btn: 'Qoşul', no: 'Sonra' },
    'kk': { title: 'ШАҚЫРУ', desc: 'сізді бейнебөлмеде күтуде!', btn: 'Қосылу', no: 'Кейін' }, // Нативное казахское
    'ar': { title: 'دعوة', desc: 'ينتظرك في غرفة الفيديو!', btn: 'انضمام', no: 'لاحقاً' },
    'ja': { title: '招待', desc: 'ビデオ会議でお待ちしています！', btn: '参加', no: '後で' },
    'zh': { title: '邀请', desc: '在视频房间等您！', btn: '加入', no: '稍后' }
};

// 2. Функция, которая умно отдает язык (проверяя твой глобальный i18n)
window.getConfTranslation = function(key) {
    // Читаем текущий язык приложения
    let uiLang = document.documentElement.lang || 'en';
    if (typeof window.getLangPref === 'function') {
        uiLang = window.getLangPref(false, false) || uiLang;
    }
    uiLang = uiLang.substring(0, 2).toLowerCase();
    if (uiLang === 'kz') uiLang = 'kk';

    // Шаг на будущее: если ключ есть в глобальном i18n, берем оттуда (мост с экосистемой)
    if (typeof i18next !== 'undefined' && typeof i18next.t === 'function') {
        let globalText = i18next.t(`conference.${key}`);
        if (globalText && globalText !== `conference.${key}`) return globalText;
    }

    // Иначе берем из нашего словаря 13 языков
    let dict = window.confDict[uiLang] || window.confDict['en'];
    return dict[key] || '';
};

// 3. ОТПРАВКА: Бьет прямо в личную базу адресата (минуя чат)
window.sendGroupInvites = function() {
    const checkboxes = document.querySelectorAll('#group-invite-list input[type="checkbox"]:checked');
    if (checkboxes.length === 0) return;

    const myId = window.myProfileInfo.id;
    
    checkboxes.forEach(cb => {
        const targetId = cb.value;
        const inviteData = {
            senderId: myId,
            name: window.myUsername || 'User',
            photo: window.myProfileInfo.photo,
            flag: window.myProfileInfo.flag,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        // Отправляем прямо в папку уведомлений пользователя
        firebase.database().ref('user_notifications/' + targetId).push(inviteData);
    });

    if (window.showToast) window.showToast("Успех", "Приглашения доставлены адресатам!", "", "");
    if (typeof window.closeGroupInviteModal === 'function') window.closeGroupInviteModal();
};

// 4. ПРИЕМНИК: Ловит пуш и рисует поп-ап поверх всех окон
window.listenForDirectInvites = function() {
    if (!window.myProfileInfo || !window.myProfileInfo.id) {
        setTimeout(window.listenForDirectInvites, 1000);
        return;
    }

    const myId = window.myProfileInfo.id;
    
    // Слушаем личную очередь уведомлений
    firebase.database().ref('user_notifications/' + myId).on('child_added', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        if (window.sndMsg) window.sndMsg.play().catch(e=>{});

        // Получаем переводы на лету!
        let tTitle = window.getConfTranslation('title');
        let tDesc = window.getConfTranslation('desc');
        let tBtn = window.getConfTranslation('btn');
        let tNo = window.getConfTranslation('no');

        // Рисуем карточку (fixed, поверх всего)
        let popup = document.createElement('div');
        popup.className = "fixed top-1/4 left-1/2 transform -translate-x-1/2 bg-[#111b21] border-2 border-[#00a884] rounded-2xl p-4 shadow-[0_0_30px_rgba(0,168,132,0.6)] z-[9999] flex flex-col gap-3 w-[90%] max-w-[320px] animate-bounce";
        
        let senderFirstName = (data.name || 'User').split(' ')[0];
        
        popup.innerHTML = `
            <div class="flex items-center gap-4">
                <img src="${data.photo}" class="w-12 h-12 rounded-full border-2 border-[#00a884] object-cover shadow-lg">
                <div class="flex flex-col">
                    <span class="text-[#00a884] text-[0.7rem] font-bold uppercase tracking-widest mb-1">${tTitle}</span>
                    <span class="text-white text-[0.9rem] leading-tight"><b>${data.flag || '🌐'} ${senderFirstName}</b> ${tDesc}</span>
                </div>
            </div>
            <div class="flex gap-2 mt-2">
                <button id="decline-inv-${snapshot.key}" class="flex-1 bg-[#202c33] text-[#8696a0] py-2 rounded-xl font-bold text-xs hover:text-white transition">${tNo}</button>
                <button id="accept-inv-${snapshot.key}" class="flex-1 bg-[#00a884] text-[#111b21] py-2 rounded-xl font-bold text-xs shadow-[0_0_15px_rgba(0,168,132,0.4)] hover:scale-95 transition flex items-center justify-center gap-2">
                    <i class="fa-solid fa-video"></i> ${tBtn}
                </button>
            </div>
        `;
        document.body.appendChild(popup);

        // Кнопка: Позже
        document.getElementById(`decline-inv-${snapshot.key}`).onclick = () => { 
            popup.remove(); 
            snapshot.ref.remove(); // Удаляем из базы
        };
        
        // Кнопка: Войти
        document.getElementById(`accept-inv-${snapshot.key}`).onclick = () => { 
            popup.remove(); 
            snapshot.ref.remove(); // Удаляем из базы
            if (window.switchTab) window.switchTab(2); // Закидываем в конфу
        };
    });
};

// Запускаем ловца при входе в приложение
window.addEventListener('load', () => { setTimeout(window.listenForDirectInvites, 2500); });

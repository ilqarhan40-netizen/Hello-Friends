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

// --- 3. ИЗОЛИРОВАННАЯ ВИДЕОКОНФЕРЕНЦИЯ С УМНОЙ ЛОГИКОЙ (12 СТРАН) ---
window.initConference = function() {
    const confGrid = document.getElementById('conference-grid'); if(!confGrid) return;
    
    let myReadLang = window.getLangPref(false, true); 
    let myReadFlag = window.myProfileInfo.flag || '🌐';
    
        const smartLanguages = [
        { code: 'kz', flag: '🇰🇿', lang: 'KK' }, // Добавили Казахстан (язык - казахский)
        { code: 'az', flag: '🇦🇿', lang: 'AZ' }, { code: 'ru', flag: '🇷🇺', lang: 'RU' },
        { code: 'us', flag: '🇺🇸', lang: 'EN' }, { code: 'tr', flag: '🇹🇷', lang: 'TR' },
        { code: 'es', flag: '🇪🇸', lang: 'ES' }, { code: 'fr', flag: '🇫🇷', lang: 'FR' },
        { code: 'de', flag: '🇩🇪', lang: 'DE' }, { code: 'it', flag: '🇮🇹', lang: 'IT' },
        { code: 'pt', flag: '🇵🇹', lang: 'PT' }, { code: 'ae', flag: '🇦🇪', lang: 'AR' },
        { code: 'cn', flag: '🇨🇳', lang: 'ZH' }, { code: 'jp', flag: '🇯🇵', lang: 'JA' }
    ];


    let confHtml = `
    <div class="video-frame main" id="my-video-container">
       <video id="my-live-video" class="mirror-video cursor-pointer" playsinline autoplay muted onclick="window.openPersonalLangModal()"></video>
        <div class="video-overlay">${window.myUsername}</div>
        <div class="flag-overlay" style="top:10px; right:10px;"><img src="https://flagcdn.com/w40/${window.myProfileInfo.flagCode || 'un'}.png" class="w-6 rounded-sm"></div>
        <div class="translation-bar"><div id="speaker-marquee" class="conf-marquee-text conf-listener-marquee" data-lang="${myReadLang}" data-flag="${myReadFlag}" style="animation-duration: 30s;">➔ [AUTO] Связь защищена...</div></div>
    </div>`;
    
    let activeUsers = [];
    if (window.currentRoomId === 'global' || window.currentRoomId === 'video_room_global') {
        activeUsers = (window.participants || []).filter(p => p.id !== 'ai' && p.id !== window.myProfileInfo.id); 
    } else if (window.currentTargetUser) {
        activeUsers = [window.currentTargetUser];
    }

    smartLanguages.forEach(langArea => {
        let usersInThisLang = activeUsers.filter(p => p.flagCode === langArea.code);
        
        if (usersInThisLang.length > 0) {
            usersInThisLang.forEach(p => {
                let userLangStr = p.flagCode ? p.flagCode.toUpperCase() : 'AUTO';
                confHtml += `
                <div class="video-frame">
                    <video id="remote-video-${p.id}" class="absolute inset-0 w-full h-full object-cover z-20 hidden" autoplay playsinline></video>
                    <div class="absolute inset-0 flex items-center justify-center bg-[#111b21] z-10"><i class="fa-solid fa-user text-4xl text-[#2a3942]"></i></div>
                    <div class="video-overlay z-30">${(p.name||'User').split(' ')[0]}</div>
                    <div class="flag-overlay z-30" style="top:10px; right:10px;"><img src="https://flagcdn.com/w40/${p.flagCode || 'un'}.png" class="w-6 rounded-sm border border-[#2a3942]"></div>
                    <div class="translation-bar z-30"><div id="conf-marquee-${p.id}" class="conf-marquee-text conf-listener-marquee" data-lang="${myReadLang}" data-flag="${myReadFlag}" style="animation-duration: 30s;">${p.flag || '🌐'} Канал ${userLangStr} активен...</div></div>
                </div>`;
            });
        } else {
            confHtml += `
            <div class="video-frame opacity-50">
                <div class="absolute inset-0 flex flex-col items-center justify-center bg-[#0b141a]">
                    <span class="text-4xl mb-2">${langArea.flag}</span>
                    <span class="text-xs text-[#8696a0]">Ожидание (${langArea.lang})</span>
                </div>
                <div class="translation-bar"><div class="conf-marquee-text conf-listener-marquee" data-lang="${langArea.code}" data-flag="${langArea.flag}" style="animation-duration: 40s;">${langArea.flag} Канал ${langArea.lang} свободен...</div></div>
            </div>`;
        }
    });

    let otherUsers = activeUsers.filter(p => !smartLanguages.some(l => l.code === p.flagCode));
    otherUsers.forEach(p => {
        let userLangStr = p.flagCode ? p.flagCode.toUpperCase() : 'AUTO';
        confHtml += `
        <div class="video-frame">
            <video id="remote-video-${p.id}" class="absolute inset-0 w-full h-full object-cover z-20 hidden" autoplay playsinline></video>
            <div class="absolute inset-0 flex items-center justify-center bg-[#111b21] z-10"><i class="fa-solid fa-user text-4xl text-[#2a3942]"></i></div>
            <div class="video-overlay z-30">${(p.name||'User').split(' ')[0]}</div>
            <div class="flag-overlay z-30" style="top:10px; right:10px;"><img src="https://flagcdn.com/w40/${p.flagCode || 'un'}.png" class="w-6 rounded-sm border border-[#2a3942]"></div>
            <div class="translation-bar z-30"><div id="conf-marquee-${p.id}" class="conf-marquee-text conf-listener-marquee" data-lang="${myReadLang}" data-flag="${myReadFlag}" style="animation-duration: 30s;">${p.flag || '🌐'} Перевод с ${userLangStr} активен...</div></div>
        </div>`;
    });

    confGrid.innerHTML = confHtml; 
    
        setTimeout(() => {
        if (window.startConferenceWebRTC) window.startConferenceWebRTC();
    }, 500);
    
};

// --- БОЕВОЙ ДВИЖОК СВЯЗИ ДЛЯ КОНФЕРЕНЦИИ ---
window.startConferenceWebRTC = async function() {
    if (typeof AgoraRTC === 'undefined') return console.error("Agora SDK не загружен");
    try {
        if (!window.confClient) window.confClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        
        window.confClient.on("user-published", async (user, mediaType) => {
            await window.confClient.subscribe(user, mediaType);
            if (mediaType === "video") {
                let gridVideo = document.getElementById(`remote-video-${user.uid}`);
                if (gridVideo) {
                    gridVideo.srcObject = new MediaStream([user.videoTrack.getMediaStreamTrack()]);
                    gridVideo.classList.remove('hidden');
                    gridVideo.play().catch(e => {});
                }
            }
            if (mediaType === "audio") user.audioTrack.play();
        });

        window.confClient.on("user-unpublished", (user, mediaType) => {
             if (mediaType === "video") {
                let gridVideo = document.getElementById(`remote-video-${user.uid}`);
                if (gridVideo) { gridVideo.srcObject = null; gridVideo.classList.add('hidden'); }
             }
        });

        await window.confClient.join(AGORA_APP_ID, "global_conference", AGORA_TEMP_TOKEN, window.myProfileInfo.id);

        let tracks = [];
        if (!window.confAudioTrack) window.confAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        tracks.push(window.confAudioTrack);

        if (!window.confVideoTrack) {
            window.confVideoTrack = await AgoraRTC.createCameraVideoTrack();
            let myVideo = document.getElementById('my-live-video');
            if (myVideo) {
                myVideo.src = ""; myVideo.removeAttribute('src'); 
                myVideo.srcObject = new MediaStream([window.confVideoTrack.getMediaStreamTrack()]);
                myVideo.play().catch(e=>{});
            }
        }
        tracks.push(window.confVideoTrack);
        await window.confClient.publish(tracks);
        
    } catch (e) { console.error("Ошибка камеры: ", e); }
};


window.isMeetMarqueeEnabled = true; 
window.toggleMeetMarquee = function() { 
    window.isMeetMarqueeEnabled = !window.isMeetMarqueeEnabled; 
    document.querySelectorAll('.translation-bar').forEach(b => { b.style.opacity = window.isMeetMarqueeEnabled ? "1" : "0"; }); 
};

// 4. ОТПРАВКА ПРИГЛАШЕНИЙ В КОНФЕРЕНЦИЮ
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

// 5. УНИВЕРСАЛЬНЫЙ ПРИЕМНИК (Статичный, с вибрацией, ждет клика)
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

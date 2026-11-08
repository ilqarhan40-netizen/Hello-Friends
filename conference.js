// ==========================================
// MODULE: SMART CONFERENCE ROOM (ISOLATED)
// Файл: conference.js
// ==========================================

// 1. БОЕВОЙ ДВИЖОК СВЯЗИ ДЛЯ КОМНАТЫ
window.startConferenceWebRTC = async function() {
    if (typeof AgoraRTC === 'undefined') {
        console.error("Agora SDK не загружен. Конференция ждет модули.");
        return;
    }

    try {
        if (!window.confClient) {
            window.confClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        }

        window.confClient.on("user-published", async (user, mediaType) => {
            await window.confClient.subscribe(user, mediaType);
            
            if (mediaType === "video") {
                let gridVideo = document.getElementById(`remote-video-${user.uid}`);
                if (gridVideo) {
                    gridVideo.srcObject = new MediaStream([user.videoTrack.getMediaStreamTrack()]);
                    gridVideo.style.display = 'block';
                    gridVideo.classList.remove('hidden');
                    gridVideo.play().catch(e => console.warn(e));
                } else {
                    console.warn(`Фрейм для юзера ${user.uid} не найден.`);
                }
            }
            if (mediaType === "audio") {
                user.audioTrack.play();
            }
        });

        window.confClient.on("user-unpublished", (user, mediaType) => {
             if (mediaType === "video") {
                let gridVideo = document.getElementById(`remote-video-${user.uid}`);
                if (gridVideo) {
                    gridVideo.srcObject = null;
                    gridVideo.classList.add('hidden');
                }
             }
        });

        const confChannelName = "global_conference"; 
        await window.confClient.join(AGORA_APP_ID, confChannelName, AGORA_TEMP_TOKEN, window.myProfileInfo.id);

        let tracksToPublish = [];

        if (!window.confAudioTrack) window.confAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        tracksToPublish.push(window.confAudioTrack);

        if (!window.confVideoTrack) {
            window.confVideoTrack = await AgoraRTC.createCameraVideoTrack();
            
            let myVideo = document.getElementById('my-live-video');
            if (myVideo) {
                myVideo.src = ""; 
                myVideo.removeAttribute('src');
                myVideo.srcObject = new MediaStream([window.confVideoTrack.getMediaStreamTrack()]);
                myVideo.muted = true;
                myVideo.play().catch(e=>{});
            }

            const camBtn = document.getElementById('conf-cam-btn');
            if (camBtn) {
                camBtn.classList.replace('bg-[#202c33]', 'bg-red-500'); 
                camBtn.innerHTML = '<i class="fa-solid fa-video text-white"></i>'; 
            }
        }
        tracksToPublish.push(window.confVideoTrack);

        await window.confClient.publish(tracksToPublish);
        console.log("Конференция успешно запущена: Камера активна!");

    } catch (e) {
        console.error("Ошибка входа в конференцию: ", e);
    }
};

// 2. ОТРИСОВКА МАТРИЦЫ И ВЫЗОВ КАМЕРЫ
window.initConference = function() {
    const confGrid = document.getElementById('conference-grid'); if(!confGrid) return;
    
    let myReadLang = 'en'; 
    if (window.getLangPref) myReadLang = window.getLangPref(false, true); 
    let myReadFlag = window.myProfileInfo.flag || '🌐';
    
    const smartLanguages = [
        { code: 'kz', flag: '🇰🇿', lang: 'KK' }, { code: 'az', flag: '🇦🇿', lang: 'AZ' }, { code: 'ru', flag: '🇷🇺', lang: 'RU' },
        { code: 'us', flag: '🇺🇸', lang: 'EN' }, { code: 'tr', flag: '🇹🇷', lang: 'TR' }, { code: 'es', flag: '🇪🇸', lang: 'ES' },
        { code: 'fr', flag: '🇫🇷', lang: 'FR' }, { code: 'de', flag: '🇩🇪', lang: 'DE' }, { code: 'it', flag: '🇮🇹', lang: 'IT' },
        { code: 'pt', flag: '🇵🇹', lang: 'PT' }, { code: 'ae', flag: '🇦🇪', lang: 'AR' }, { code: 'cn', flag: '🇨🇳', lang: 'ZH' },
        { code: 'jp', flag: '🇯🇵', lang: 'JA' }
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
        if (window.startConferenceWebRTC) {
            window.startConferenceWebRTC();
        }
    }, 300);
};

// 3. УПРАВЛЕНИЕ КАМЕРОЙ В КОНФЕРЕНЦИИ И БЕГУЩАЯ СТРОКА
window.toggleMyCamera = async function(btn) { 
    if (window.confVideoTrack) { 
        const isEnabled = window.confVideoTrack.isPlaying;
        await window.confVideoTrack.setEnabled(!isEnabled);
        
        if (!isEnabled) {
            btn.classList.replace('bg-[#202c33]', 'bg-red-500'); 
            btn.innerHTML = '<i class="fa-solid fa-video text-white"></i>'; 
        } else {
            btn.classList.replace('bg-red-500', 'bg-[#202c33]'); 
            btn.innerHTML = '<i class="fa-solid fa-video-slash text-[#8696a0]"></i>'; 
        }
    } 
};

window.isMeetMarqueeEnabled = true; 
window.toggleMeetMarquee = function() { 
    window.isMeetMarqueeEnabled = !window.isMeetMarqueeEnabled; 
    document.querySelectorAll('#conference .translation-bar').forEach(b => { 
        b.style.opacity = window.isMeetMarqueeEnabled ? "1" : "0"; 
    }); 
};

// ==========================================
// 4. ЛОГИКА ПРИГЛАШЕНИЯ В КОНФЕРЕНЦИЮ
// ==========================================
window.openGroupInviteModal = function() {
    if (window.closeDropdown) window.closeDropdown();
    
    const listCont = document.getElementById('group-invite-list');
    if (!listCont) return;
    
    listCont.innerHTML = '';
    const users = (window.participants || []).filter(p => p.id !== 'ai' && p.id !== window.myProfileInfo.id);
    
    if (users.length === 0) {
        listCont.innerHTML = '<p class="text-[#8696a0] text-center text-sm mt-4">Нет доступных контактов.</p>';
    } else {
        users.forEach(p => {
            let name = (p.name || 'User').split(' ')[0];
            listCont.innerHTML += `
            <label class="flex items-center justify-between p-2 hover:bg-[#2a3942] rounded-xl cursor-pointer transition">
                <div class="flex items-center gap-3">
                    <img src="${p.photo}" class="w-10 h-10 rounded-full border border-[#00a884] object-cover shadow-sm">
                    <div>
                        <p class="text-white font-bold text-sm">${name} ${p.flag}</p>
                        <p class="text-[#8696a0] text-xs">${p.profession || 'User'}</p>
                    </div>
                </div>
                <input type="checkbox" value="${p.id}" class="invite-checkbox w-5 h-5 accent-[#00a884] cursor-pointer">
            </label>`;
        });
    }
    
    const modal = document.getElementById('group-invite-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            const content = document.getElementById('group-invite-content');
            if (content) {
                content.classList.remove('scale-95');
                content.classList.add('scale-100');
            }
        }, 10);
    }
};

window.closeGroupInviteModal = function() {
    const modal = document.getElementById('group-invite-modal');
    const content = document.getElementById('group-invite-content');
    if (content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
    setTimeout(() => {
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }, 200);
};

window.selectAllForInvite = function() {
    const checkboxes = document.querySelectorAll('.invite-checkbox');
    let allChecked = true;
    checkboxes.forEach(cb => { if (!cb.checked) allChecked = false; });
    checkboxes.forEach(cb => { cb.checked = !allChecked; });
};

// ==========================================
// 5. ОТПРАВКА И СЛУШАТЕЛЬ INVITE-ПОПАПОВ
// ==========================================
window.sendGroupInvites = function() {
    const checkboxes = document.querySelectorAll('.invite-checkbox:checked');
    if (checkboxes.length === 0) {
        if (window.showToast) window.showToast("Error", "Выберите пользователей для приглашения", "", "");
        return;
    }
    
    let count = 0;
    checkboxes.forEach(cb => {
        const targetId = cb.value;
        // 1. Отправляем фоновый пуш (если свернуто)
        if (window.sendPushToUser) {
            window.sendPushToUser(targetId, 
                "Global Conference", 
                `${window.myUsername} приглашает вас в видеокомнату!`,
                { type: "conference_invite", room: "global_conference" }
            );
        }
        // 2. Бьем напрямую в Firebase (для мгновенного in-app поп-апа)
        firebase.database().ref('users/' + targetId + '/confInvite').set({
            fromName: window.myUsername,
            fromPhoto: window.myProfileInfo.photo,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        count++;
    });
    
    if (window.showToast) window.showToast("Success", `Приглашения отправлены (${count})`, "https://ui-avatars.com/api/?name=OK&background=00a884&color=111b21", "");
    window.closeGroupInviteModal();
};

window.listenForConferenceInvites = function() {
    if (window.isGuest || !window.myProfileInfo || !window.myProfileInfo.id) return;

    const inviteRef = firebase.database().ref('users/' + window.myProfileInfo.id + '/confInvite');
    inviteRef.on('value', (snap) => {
        const data = snap.val();
        if (data && data.timestamp) {
            // Защита от зависших старых сигналов (старше 1 минуты)
            if (Date.now() - data.timestamp > 60000) {
                inviteRef.remove();
                return;
            }
            
            showIncomingConfModal(data.fromName, data.fromPhoto);
            inviteRef.remove(); // Сразу удаляем сигнал из базы
        }
    });
};

function showIncomingConfModal(name, photo) {
    let modal = document.getElementById('incoming-conf-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'incoming-conf-modal';
        modal.className = 'fixed inset-0 bg-black/95 z-[99999] hidden flex-col items-center justify-center backdrop-blur-lg transition-opacity duration-300';
        modal.innerHTML = `
            <h2 class="text-[#00a884] font-bold text-xl mb-10 tracking-widest uppercase animate-pulse">Conference Invite</h2>
            <div class="relative w-32 h-32 mb-4">
                <div class="absolute inset-0 rounded-full border-4 border-[#00a884] animate-ping opacity-50"></div>
                <img id="incoming-conf-photo" src="" class="w-full h-full rounded-full object-cover relative z-10 border-4 border-[#111b21] shadow-[0_0_30px_rgba(0,168,132,0.6)]">
            </div>
            <h3 id="incoming-conf-name" class="text-white font-bold text-3xl mb-2">User</h3>
            <span class="text-[#8696a0] text-sm mb-16">Invites you to the Global Room</span>
            
            <div class="flex gap-12 w-full max-w-[300px] justify-center">
                <button onclick="document.getElementById('incoming-conf-modal').classList.remove('flex'); document.getElementById('incoming-conf-modal').classList.add('hidden');" class="w-16 h-16 rounded-full bg-[#ef4444] text-white flex justify-center items-center text-2xl shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:scale-110 transition"><i class="fa-solid fa-xmark"></i></button>
                <button onclick="acceptConfInvite()" class="w-16 h-16 rounded-full bg-[#00a884] text-[#111b21] flex justify-center items-center text-2xl shadow-[0_0_20px_rgba(0,168,132,0.5)] hover:scale-110 transition animate-bounce"><i class="fa-solid fa-video"></i></button>
            </div>
        `;
        document.body.appendChild(modal);

        window.acceptConfInvite = function() {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
            if (window.switchTab) window.switchTab(2);
        };
    }

    document.getElementById('incoming-conf-photo').src = photo;
    document.getElementById('incoming-conf-name').innerText = name;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    if (window.sndMsg) window.sndMsg.play().catch(()=>{});
}

// Запускаем слушатель входящих инвайтов при загрузке скрипта
setTimeout(window.listenForConferenceInvites, 2000);

// =======================================================
// УНИВЕРСАЛЬНАЯ СИСТЕМА УВЕДОМЛЕНИЙ И КОНФЕРЕНЦИЙ
// ПОЛНОСТЬЮ ИЗОЛИРОВАННЫЙ МИР (СВОИ КЛЮЧИ, МИКРОФОН, БЕГУЩИЕ СТРОКИ)
// =======================================================

const CONF_LANG_MAP = {
    en: ['gb', '🇬🇧'], kk: ['kz', '🇰🇿'], ru: ['ru', '🇷🇺'], az: ['az', '🇦🇿'],
    de: ['de', '🇩🇪'], tr: ['tr', '🇹🇷'], ar: ['ae', '🇦🇪'], it: ['it', '🇮🇹'],
    es: ['es', '🇪🇸'], fr: ['fr', '🇫🇷'], pt: ['pt', '🇵🇹'], ja: ['jp', '🇯🇵'], zh: ['cn', '🇨🇳']
};

const CONF_SPEECH_LOCALE = {
    en: 'en-US', ru: 'ru-RU', az: 'az-AZ', tr: 'tr-TR', de: 'de-DE', kk: 'kk-KZ',
    ar: 'ar-AE', it: 'it-IT', es: 'es-ES', fr: 'fr-FR', pt: 'pt-PT', ja: 'ja-JP', zh: 'zh-CN'
};

function confNormLang(code) {
    if (!code || code === 'auto' || code === 'un') return null;
    let c = String(code).substring(0, 2).toLowerCase();
    const fix = { kz: 'kk', cn: 'zh', jp: 'ja', ae: 'ar', us: 'en', gb: 'en' };
    return fix[c] || c;
}

function getConfNativeLang() {
    if (window.myProfileInfo) {
        if (typeof window.getLangByFlag === 'function') {
            const byFlag = confNormLang(window.getLangByFlag(window.myProfileInfo.flagCode, window.myProfileInfo.flag));
            if (byFlag) return byFlag;
        }
        if (typeof window.getSmartLang === 'function') {
            const smart = confNormLang(window.getSmartLang(window.myProfileInfo));
            if (smart) return smart;
        }
    }
    return 'en';
}

function getConfAvatarLang() {
    return confNormLang(localStorage.getItem('hf_conf_avatar_lang'));
}

function getConfMicLang() {
    return confNormLang(localStorage.getItem('hf_conf_mic_lang'));
}

function getConfReadLang() {
    return confNormLang(localStorage.getItem('hf_conf_read_lang')) || getConfNativeLang();
}

function getConfReadFlag() {
    const manualRead = confNormLang(localStorage.getItem('hf_conf_read_lang'));
    if (manualRead && CONF_LANG_MAP[manualRead]) return CONF_LANG_MAP[manualRead][1];
    return (window.myProfileInfo && window.myProfileInfo.flag) ? window.myProfileInfo.flag : '🌐';
}

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
    'kk': { title: 'ШАҚЫРУ', desc: 'сізді бейнебөлмеде күтуде!', btn: 'Қосылу', no: 'Кейін' },
    'ar': { title: 'دعوة', desc: 'ينتظرك في غرفة الفيديو!', btn: 'انضمام', no: 'لاحقاً' },
    'ja': { title: '招待', desc: 'ビデオ会議でお待ちしています！', btn: '参加', no: '後で' },
    'zh': { title: '邀请', desc: '在视频房间等您！', btn: '加入', no: '稍后' }
};

// 2. Функция умного определения языка баннера приглашения
window.getConfTranslation = function(key) {
    let uiLang = confNormLang(window.appLang) || getConfNativeLang() || confNormLang(document.documentElement.lang) || 'en';

    if (typeof i18next !== 'undefined' && typeof i18next.t === 'function') {
        let globalText = i18next.t(`conference.${key}`);
        if (globalText && globalText !== `conference.${key}`) return globalText;
    }

    let dict = window.confDict[uiLang] || window.confDict['en'];
    return dict[key] || '';
};

// --- 3. ИЗОЛИРОВАННАЯ ВИДЕОКОНФЕРЕНЦИЯ С УМНОЙ ЛОГИКОЙ (13 ЯЗЫКОВ) ---
window.initConference = function() {
    const confGrid = document.getElementById('conference-grid');
    if (!confGrid) return;

    let myReadLang = getConfReadLang();
    let myReadFlag = getConfReadFlag();

    const smartLanguages = [
        { code: 'kz', flag: '🇰🇿', lang: 'KK' },
        { code: 'az', flag: '🇦🇿', lang: 'AZ' }, { code: 'ru', flag: '🇷🇺', lang: 'RU' },
        { code: 'us', flag: '🇺🇸', lang: 'EN' }, { code: 'tr', flag: '🇹🇷', lang: 'TR' },
        { code: 'es', flag: '🇪🇸', lang: 'ES' }, { code: 'fr', flag: '🇫🇷', lang: 'FR' },
        { code: 'de', flag: '🇩🇪', lang: 'DE' }, { code: 'it', flag: '🇮🇹', lang: 'IT' },
        { code: 'pt', flag: '🇵🇹', lang: 'PT' }, { code: 'ae', flag: '🇦🇪', lang: 'AR' },
        { code: 'cn', flag: '🇨🇳', lang: 'ZH' }, { code: 'jp', flag: '🇯🇵', lang: 'JA' }
    ];

    let confHtml = `
    <div class="video-frame main" id="my-video-container">
       <video id="my-live-video" class="mirror-video cursor-pointer" playsinline autoplay muted onclick="window.openConfLangModal()"></video>
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
                    <div class="video-overlay z-30">${(p.name || 'User').split(' ')[0]}</div>
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
            <div class="video-overlay z-30">${(p.name || 'User').split(' ')[0]}</div>
            <div class="flag-overlay z-30" style="top:10px; right:10px;"><img src="https://flagcdn.com/w40/${p.flagCode || 'un'}.png" class="w-6 rounded-sm border border-[#2a3942]"></div>
            <div class="translation-bar z-30"><div id="conf-marquee-${p.id}" class="conf-marquee-text conf-listener-marquee" data-lang="${myReadLang}" data-flag="${myReadFlag}" style="animation-duration: 30s;">${p.flag || '🌐'} Перевод с ${userLangStr} активен...</div></div>
        </div>`;
    });

    confGrid.innerHTML = confHtml;

    window.bindConfControls();
    window.startConfChatListener();
    window.syncConfMicLangUI();

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
                myVideo.play().catch(e => {});
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

// =======================================================
// 4. МОДАЛКА ПРИГЛАШЕНИЙ И ОТПРАВКА УВЕДОМЛЕНИЙ
// =======================================================
window.openGroupInviteModal = function() {
    const list = document.getElementById('group-invite-list');
    if (!list) return;
    list.innerHTML = '';

    const myId = window.myProfileInfo ? String(window.myProfileInfo.id) : '';
    (window.participants || []).forEach(p => {
        if (!p || String(p.id) === myId || p.id === 'ai') return;
        list.innerHTML += `
            <label class="flex items-center justify-between p-3 bg-[#202c33] rounded-xl border border-[#2a3942] cursor-pointer hover:border-[#00a884] transition">
                <div class="flex items-center gap-3">
                    <img src="${p.photo || 'https://ui-avatars.com/api/?name=U'}" class="w-10 h-10 rounded-full object-cover">
                    <span class="text-white font-bold">${p.name ? p.name.split(' ')[0] : 'User'}</span>
                </div>
                <input type="checkbox" value="${p.id}" class="w-5 h-5 accent-[#00a884] invite-checkbox">
            </label>
        `;
    });

    const modal = document.getElementById('group-invite-modal');
    const content = document.getElementById('group-invite-content');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    if (content) {
        setTimeout(() => {
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
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
    if (modal) {
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 200);
    }
};

window.selectAllForInvite = function() {
    document.querySelectorAll('.invite-checkbox').forEach(cb => cb.checked = true);
};

window.sendGroupInvites = function() {
    const checkboxes = document.querySelectorAll('#group-invite-list input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        if (window.showToast) window.showToast("Ошибка", "Выберите пользователей!", "", "");
        return;
    }

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

        if (window.sndMsg) window.sndMsg.play().catch(e => {});
        if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 400]);

        const notifType = data.type || 'conference';
        let senderFirstName = (data.name || 'User').split(' ')[0];

        let popup = document.createElement('div');
        popup.className = "absolute top-4 left-4 right-4 mx-auto z-[9999] max-w-[280px]";

        let contentHTML = '';

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
        } else if (notifType === 'missed_call') {
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
        } else if (notifType === 'email') {
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

        let appContainer = document.querySelector('.app-wrap') || document.querySelector('#app') || document.body;
        appContainer.appendChild(popup);

        if (typeof window.updateTranslations === 'function') window.updateTranslations();
        else if (typeof window.applyTranslations === 'function') window.applyTranslations();

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
            popup.onclick = () => {
                if (navigator.vibrate) navigator.vibrate(0);
                popup.remove(); snapshot.ref.remove();
                if (notifType === 'email' && window.switchTab) window.switchTab(4);
            };
        }
    });
};

window.addEventListener('load', () => { setTimeout(window.listenForDirectInvites, 2500); });

// =======================================================
// 6. ИЗОЛИРОВАННЫЕ ЯЗЫКИ, МИКРОФОН И БЕГУЩИЕ СТРОКИ КОНФЕРЕНЦИИ
// =======================================================

window.openConfLangModal = function() {
    const listContainer = document.getElementById('personal-lang-list');
    if (!listContainer) return;

    const currentPref = localStorage.getItem('hf_conf_avatar_lang') || 'auto';
    const langs = [
        { code: 'auto', name: '🤖 Auto (Profile)', flag: '🌐' }, { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'kk', name: 'Қазақша', flag: '🇰🇿' }, { code: 'pt', name: 'Português', flag: '🇵🇹' },
        { code: 'ru', name: 'Русский', flag: '🇷🇺' }, { code: 'az', name: 'Azərbaycanca', flag: '🇦🇿' },
        { code: 'de', name: 'Deutsch', flag: '🇩🇪' }, { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
        { code: 'ar', name: 'العربية', flag: '🇦🇪' }, { code: 'it', name: 'Italiano', flag: '🇮🇹' },
        { code: 'es', name: 'Español', flag: '🇪🇸' }, { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'ja', name: '日本語', flag: '🇯🇵' }, { code: 'zh', name: '中文', flag: '🇨🇳' }
    ];

    let html = `<div class="text-[0.7rem] text-[#00a884] mb-3 text-center uppercase tracking-widest border-b border-[#2a3942] pb-2">Settings strictly for:<br><b class="text-white text-sm">📹 Conference</b></div>`;
    langs.forEach(l => {
        const isActive = (currentPref === l.code) ? 'border-[#00a884] bg-[#202c33]' : 'border-[#2a3942] bg-[#111b21]';
        html += `<div onclick="window.saveConfAvatarLang('${l.code}')" class="flex items-center p-3 rounded-xl border ${isActive} cursor-pointer mb-2 hover:border-[#00a884] transition shadow-sm"><span class="text-white font-bold text-[0.9rem] flex gap-3 items-center"><span class="text-xl">${l.flag}</span> ${l.name}</span></div>`;
    });

    listContainer.innerHTML = html;
    document.getElementById('personal-lang-modal')?.classList.add('active');
};

window.saveConfAvatarLang = function(langCode) {
    if (langCode === 'auto') {
        localStorage.removeItem('hf_conf_avatar_lang');
        const micFallback = localStorage.getItem('hf_conf_mic_lang');
        if (micFallback) localStorage.setItem('hf_conf_read_lang', micFallback);
        else localStorage.removeItem('hf_conf_read_lang');
    } else {
        localStorage.setItem('hf_conf_avatar_lang', langCode);
        localStorage.setItem('hf_conf_read_lang', langCode);
    }

    const speakerMarquee = document.getElementById('speaker-marquee');
    if (speakerMarquee) {
        speakerMarquee.setAttribute('data-lang', getConfReadLang());
        speakerMarquee.setAttribute('data-flag', getConfReadFlag());
    }

    document.getElementById('personal-lang-modal')?.classList.remove('active');
    if (window.showToast) window.showToast("Language Saved", "Applied strictly to Conference.", "", "");
};

window.saveConfMicLang = function(val) {
    if (!val || val === 'auto') {
        localStorage.removeItem('hf_conf_mic_lang');
        const avatarFallback = localStorage.getItem('hf_conf_avatar_lang');
        if (avatarFallback) localStorage.setItem('hf_conf_read_lang', avatarFallback);
        else localStorage.removeItem('hf_conf_read_lang');
    } else {
        localStorage.setItem('hf_conf_mic_lang', val);
        localStorage.setItem('hf_conf_read_lang', val);
    }

    const speakerMarquee = document.getElementById('speaker-marquee');
    if (speakerMarquee) {
        speakerMarquee.setAttribute('data-lang', getConfReadLang());
        speakerMarquee.setAttribute('data-flag', getConfReadFlag());
    }

    if (window.showToast) window.showToast("Mic Language", "Saved strictly for Conference", "", "");
};

window.syncConfMicLangUI = function() {
    const sel = document.getElementById('plus-mic-lang');
    if (!sel) return;
    sel.value = localStorage.getItem('hf_conf_mic_lang') || 'auto';
};

window.bindConfControls = function() {
    const inputField = document.getElementById('conf-chat-input');
    if (!inputField || inputField.dataset.confBound) return;
    inputField.dataset.confBound = '1';

    inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopImmediatePropagation();
            window.sendConfMsg();
        }
    }, true);

    const bar = inputField.parentElement ? (inputField.parentElement.parentElement || inputField.parentElement) : document;
    bar.querySelectorAll('button').forEach(btn => {
        const attr = btn.getAttribute('onclick') || '';
        if (attr.includes('sendFirebaseMsg')) {
            btn.removeAttribute('onclick');
            btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); window.sendConfMsg(); };
        } else if (attr.includes('startUniversalMic')) {
            btn.removeAttribute('onclick');
            btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); window.startConfMic(); };
        }
    });
};

const processedConfKeys = new Set();

window.startConfChatListener = function() {
    if (window.confChatListener) {
        firebase.database().ref('video_room_global').off('child_added', window.confChatListener);
    }
    window.confChatListener = firebase.database().ref('video_room_global').on('child_added', window.handleConfMessage);
};

window.addEventListener('load', () => { setTimeout(window.bindConfControls, 1500); });

// Отправка с клавиатуры конференции (#conf-chat-input)
window.sendConfMsg = async function() {
    const inputField = document.getElementById('conf-chat-input');
    if (!inputField) return;
    const rawText = inputField.value.trim();
    if (!rawText) return;
    inputField.value = '';

    let manualLang = getConfAvatarLang();
    let myActiveLang = manualLang || getConfNativeLang();

    let activeFlag = (window.myProfileInfo && window.myProfileInfo.flag) ? window.myProfileInfo.flag : '🌐';
    let activeFlagCode = (window.myProfileInfo && window.myProfileInfo.flagCode) ? window.myProfileInfo.flagCode : 'un';

    if (manualLang && CONF_LANG_MAP[manualLang]) {
        activeFlagCode = CONF_LANG_MAP[manualLang][0];
        activeFlag = CONF_LANG_MAP[manualLang][1];
    }

    let myBaseText = rawText;
    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${myActiveLang}&dt=t&q=${encodeURIComponent(rawText)}`);
        const data = await res.json();
        if (data && data[0]) myBaseText = data[0].map(s => (s && s[0]) ? s[0] : '').join('');
    } catch (e) {}

    firebase.database().ref('video_room_global').push({
        userId: (window.myProfileInfo && window.myProfileInfo.id) ? window.myProfileInfo.id : 'guest',
        name: window.myUsername || 'User',
        text: myBaseText,
        originalText: myBaseText,
        sessionId: window.mySessionId || 'sess',
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        photo: (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : '',
        flag: activeFlag,
        flagCode: activeFlagCode,
        langCode: myActiveLang,
        isConfMsg: true
    });
};

// Отправка с микрофона конференции
window.startConfMic = function() {
    if (window.closeAllMenus) window.closeAllMenus();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Голосовой ввод не поддерживается браузером.");

    let manualMic = getConfMicLang();
    let isManual = Boolean(manualMic);
    let recBase = isManual ? manualMic : getConfNativeLang();

    const rec = new SpeechRecognition();
    rec.lang = CONF_SPEECH_LOCALE[recBase] || recBase;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => { if (window.showToast) window.showToast("Conf Mic", "Говорите...", "", ""); };
    rec.onerror = (e) => { if (window.showToast) window.showToast("Mic Error", e.error, "", ""); };

    rec.onresult = (e) => {
        let spokenText = e.results[0][0].transcript;
        let spokenCode = confNormLang(rec.lang) || recBase;

        let activeFlag = (window.myProfileInfo && window.myProfileInfo.flag) ? window.myProfileInfo.flag : '🌐';
        let activeFlagCode = (window.myProfileInfo && window.myProfileInfo.flagCode) ? window.myProfileInfo.flagCode : 'un';

        if (isManual && CONF_LANG_MAP[spokenCode]) {
            activeFlagCode = CONF_LANG_MAP[spokenCode][0];
            activeFlag = CONF_LANG_MAP[spokenCode][1];
        }

        firebase.database().ref('video_room_global').push({
            userId: (window.myProfileInfo && window.myProfileInfo.id) ? window.myProfileInfo.id : 'guest',
            name: window.myUsername || 'User',
            text: spokenText,
            originalText: spokenText,
            sessionId: window.mySessionId || 'sess',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            photo: (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : '',
            flag: activeFlag,
            flagCode: activeFlagCode,
            langCode: spokenCode,
            isConfMsg: true
        });
    };
    try { rec.start(); } catch (e) {}
};

// Приём и перевод бегущих строк конференции
window.handleConfMessage = function(snapshot) {
    const data = snapshot.val();
    if (!data || !data.isConfMsg) return;
    if (data.timestamp && (Date.now() - data.timestamp) > 8000) return;

    // Защита от повторной обработки одного и того же сообщения
    if (snapshot.key) {
        if (processedConfKeys.has(snapshot.key)) return;
        processedConfKeys.add(snapshot.key);
        if (processedConfKeys.size > 100) {
            const firstKey = processedConfKeys.values().next().value;
            processedConfKeys.delete(firstKey);
        }
    }

    const myId = window.myProfileInfo ? String(window.myProfileInfo.id) : '';
    const isMe = data.sessionId === window.mySessionId || (myId && String(data.userId) === myId);
    const senderDisplayName = isMe ? window.myUsername : (data.name || 'User').split(' ')[0];
    const originalText = data.originalText || data.text || '';
    if (!originalText) return;

    const senderMarqueeId = isMe ? 'speaker-marquee' : `conf-marquee-${data.userId}`;
    const speakerMarquee = document.getElementById(senderMarqueeId);
    if (speakerMarquee) {
        speakerMarquee.innerHTML = `<span class="text-white font-bold">${senderDisplayName}:</span> <span class="text-[#00a884] ml-2">${data.flag || '🌐'} ${originalText}</span>`;
        speakerMarquee.style.animation = 'none'; void speakerMarquee.offsetWidth; speakerMarquee.style.animation = null;
    }

    document.querySelectorAll('.conf-listener-marquee').forEach(listenerMarquee => {
        if (listenerMarquee.id === senderMarqueeId) return;

        let targetLang = listenerMarquee.getAttribute('data-lang') || 'en';
        let targetFlag = listenerMarquee.getAttribute('data-flag') || '🌐';

        if (listenerMarquee.id === 'speaker-marquee') {
            targetLang = getConfReadLang();
            targetFlag = getConfReadFlag();
        } else if (listenerMarquee.id && listenerMarquee.id.startsWith('conf-marquee-')) {
            let pId = listenerMarquee.id.replace('conf-marquee-', '');
            let part = (window.participants || []).find(x => String(x.id) === String(pId));
            if (part) {
                targetLang = (typeof window.getSmartLang === 'function') ? window.getSmartLang(part) : 'en';
                targetFlag = part.flag || '🌐';
            }
        }

        let tl = confNormLang(targetLang) || 'en';

        fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(originalText)}`)
            .then(r => r.json())
            .then(resData => {
                let translatedText = (resData && resData[0]) ? resData[0].map(s => (s && s[0]) ? s[0] : '').join('') : originalText;
                listenerMarquee.innerHTML = `<span class="text-[#8696a0] text-[0.65rem] uppercase tracking-widest">${senderDisplayName}:</span> <span class="text-yellow-400 font-bold ml-2">${targetFlag} ${translatedText}</span>`;
                listenerMarquee.style.animation = 'none'; void listenerMarquee.offsetWidth; listenerMarquee.style.animation = null;
            }).catch(() => {});
    });
};

// ==========================================
// MODULE: CALLS, VIDEO & WebRTC ENGINE (CALL.JS)
// Финальная исправленная версия: Вибрация звонка + Перевод бегущей строки спикера
// ==========================================

window.localStream = null;
window.peerConnection = null;
window.currentCallerId = null;
window.currentIncomingSignalKey = null;

// ИЗОЛЯЦИЯ И СОХРАНЕНИЕ: Загружаем язык встречи из памяти или ставим auto
window.meetSpeakerLang = JSON.parse(localStorage.getItem('hf_meet_speaker_lang') || JSON.stringify({ code: 'auto', flag: '🌐', name: 'Auto (Авто)', lang: 'auto' }));

// --- 0. ЗВУКОВОЙ ДВИЖОК ---
window.sndMsg = new Audio('message.mp3.wav');
window.sndCash = new Audio('cash.mp3.wav');
window.sndEmail = new Audio('email.mp3.wav'); 
window.sndMissed = new Audio('missed.mp3.wav'); 
window.sndRing = new Audio('ringtone.mp3.wav');
window.sndCallOut = new Audio('calling.mp3.wav'); 

window.sndRing.loop = true; 
window.sndCallOut.loop = true;

window.playSafeSound = function(audioElement, vibratePattern) {
    if (!audioElement) return;
    audioElement.currentTime = 0; 
    let playPromise = audioElement.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => { console.warn("Звук заблокирован до клика по экрану."); });
    }
    if (vibratePattern && "vibrate" in navigator) {
        try { navigator.vibrate(vibratePattern); } catch(e){}
    }
};

window.stopAllRings = function() {
    if(window.sndRing) { window.sndRing.pause(); window.sndRing.currentTime = 0; }
    if(window.sndCallOut) { window.sndCallOut.pause(); window.sndCallOut.currentTime = 0; }
    if ("vibrate" in navigator) { try { navigator.vibrate(0); } catch(e){} }
};

document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', function unlockAudio() {
        const allSounds = [window.sndMsg, window.sndCash, window.sndEmail, window.sndMissed, window.sndRing, window.sndCallOut];
        allSounds.forEach(snd => { snd.play().then(() => snd.pause()).catch(e => {}); });
        document.body.removeEventListener('click', unlockAudio);
    }, { once: true });
});

// --- 1. ПЕРЕДАЧА ГОЛОСА (WebRTC) ---
window.startWebRTC = async function(isCaller, targetId) {
    try {
        window.localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    } catch (e) {
        alert("Для общения нужен доступ к микрофону! Убедитесь, что сайт открыт по HTTPS.");
        return;
    }
    
    const servers = { 
        iceServers: [ 
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
        ] 
    };
    window.peerConnection = new RTCPeerConnection(servers);
    
    window.localStream.getTracks().forEach(track => window.peerConnection.addTrack(track, window.localStream));

    window.peerConnection.ontrack = (event) => {
        let remoteAudio = document.getElementById('remote-audio-player');
        if (!remoteAudio) {
            remoteAudio = document.createElement('audio');
            remoteAudio.id = 'remote-audio-player';
            remoteAudio.autoplay = true;
            remoteAudio.playsInline = true;
            document.body.appendChild(remoteAudio);
        }
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.onloadedmetadata = () => { remoteAudio.play().catch(e => {}); };
    };

    const callRoomId = isCaller ? (window.myProfileInfo.id + '_' + targetId) : (targetId + '_' + window.myProfileInfo.id);
    const callDoc = db.ref('calls/' + callRoomId);

    window.peerConnection.onicecandidate = event => {
        if (event.candidate) {
            callDoc.child(isCaller ? 'callerCandidates' : 'calleeCandidates').push(event.candidate.toJSON());
        }
    };

    if (isCaller) {
        await callDoc.remove(); 
        const offer = await window.peerConnection.createOffer();
        await window.peerConnection.setLocalDescription(offer);
        await callDoc.child('offer').set({ type: offer.type, sdp: offer.sdp });

        callDoc.child('answer').on('value', snap => {
            const answer = snap.val();
            if (answer && !window.peerConnection.currentRemoteDescription) {
                window.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });

        callDoc.child('calleeCandidates').on('child_added', snap => {
            window.peerConnection.addIceCandidate(new RTCIceCandidate(snap.val()));
        });
    } else {
        callDoc.child('offer').on('value', async snap => {
            const offer = snap.val();
            if (offer && !window.peerConnection.currentRemoteDescription) {
                await window.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await window.peerConnection.createAnswer();
                await window.peerConnection.setLocalDescription(answer);
                await callDoc.child('answer').set({ type: answer.type, sdp: answer.sdp });
            }
        });

        callDoc.child('callerCandidates').on('child_added', snap => {
            window.peerConnection.addIceCandidate(new RTCIceCandidate(snap.val()));
        });
    }
};

window.endWebRTCCall = function() {
    if (window.peerConnection) { window.peerConnection.close(); window.peerConnection = null; }
    if (window.localStream) { window.localStream.getTracks().forEach(t => t.stop()); window.localStream = null; }
    const remoteAudio = document.getElementById('remote-audio-player'); if (remoteAudio) remoteAudio.remove();
};

// --- 2. ЛОГИКА ЗВОНКОВ И СИГНАЛОВ (ЖЕЛЕЗНЫЙ ПЕРЕХОД + ВИБРАЦИЯ) ---
window.openPhoneChoiceModal = function() { if(window.closeDropdown) window.closeDropdown(); document.getElementById('phone-choice-modal').classList.add('active'); };
window.closePhoneChoiceModal = function() { document.getElementById('phone-choice-modal').classList.remove('active'); };

window.startInAppCall = function() { 
    if (!window.currentTargetUser) { 
        alert("Выберите контакт для звонка!"); 
        if (window.closePhoneChoiceModal) window.closePhoneChoiceModal(); 
        return; 
    } 
    const target = window.currentTargetUser; 
    if (window.closePhoneChoiceModal) window.closePhoneChoiceModal(); 
    
    let callRef = db.ref('signals/' + target.id).push();
    callRef.set({ 
        type: 'call', 
        callerId: window.myProfileInfo.id, 
        callerName: window.myUsername, 
        callerPhoto: window.myProfileInfo.photo, 
        timestamp: firebase.database.ServerValue.TIMESTAMP 
    }); 
    
    if (window.sendPushToUser) {
        window.sendPushToUser(target.id, "Входящий вызов 📞", `${window.myUsername} звонит вам!`); 
    }
    
    const photoEl = document.getElementById('voice-friend-photo'); 
    const flagEl = document.getElementById('voice-friend-flag'); 
    const nameEl = document.getElementById('voice-friend-name');
    
    if (photoEl) photoEl.src = target.photo; 
    if (flagEl) flagEl.innerText = target.flag || '🌐'; 
    if (nameEl) nameEl.innerText = (target.name || 'User').split(' ')[0]; 
    
    window.voiceFriend = target; 

    // Принудительное скрытие чата и открытие голосового экрана
    const chatScreen = document.getElementById('chat-screen') || document.getElementById('chat-container');
    if (chatScreen) {
        chatScreen.classList.remove('active', 'block', 'flex');
        chatScreen.classList.add('hidden');
    }

    const voiceScreen = document.getElementById('voice-screen') || document.getElementById('audio-call-screen') || document.getElementById('call-screen');
    if (voiceScreen) {
        document.querySelectorAll('.app-screen, .tab-content').forEach(el => {
            el.classList.remove('active', 'block', 'flex');
            el.classList.add('hidden');
        });
        voiceScreen.classList.remove('hidden');
        voiceScreen.classList.add('active', 'block', 'flex');
    }

    if (typeof window.switchTab === 'function') {
        window.switchTab(1);
    }

    if (window.showToast) {
        window.showToast("Звонок...", `Вызываем ${(target.name || 'User').split(' ')[0]}...`, target.photo, ""); 
    }
    
    // Звук гудков + ВИБРАЦИЯ
    window.playSafeSound(window.sndCallOut, [800, 1200, 800, 1200, 800, 1200]);
    
    if (window.callTimeout) clearTimeout(window.callTimeout);
    window.callTimeout = setTimeout(() => {
        db.ref('signals/' + target.id).push({ type: 'missed', callerName: window.myUsername });
        callRef.remove(); 
        window.callTimeout = null;
        window.stopAllRings();
        window.playSafeSound(window.sndMissed, [200, 100, 200]); 
        if (window.showToast) window.showToast("Нет ответа", "Абонент недоступен", "", "");
    }, 30000);
};

window.showIncomingCall = function(callerId, callerName, callerPhoto, signalKey) { 
    window.currentIncomingSignalKey = signalKey; 
    window.currentCallerId = callerId; 
    const nameEl = document.getElementById('incoming-call-name'); const photoEl = document.getElementById('incoming-call-photo');
    if (nameEl) nameEl.innerText = callerName || 'User'; 
    if (photoEl) photoEl.src = callerPhoto || 'https://ui-avatars.com/api/?name=U'; 
    document.getElementById('incoming-call-modal').classList.add('active'); 
    window.playSafeSound(window.sndRing, [1000, 500, 1000, 500, 1000, 500, 1000]);
};

window.acceptCall = function() { 
    window.stopAllRings();
    document.getElementById('incoming-call-modal').classList.remove('active'); 
    db.ref('signals/' + window.currentCallerId).push({ type: 'answered' });
    db.ref('signals/' + window.myProfileInfo.id + '/' + window.currentIncomingSignalKey).remove(); 

    let target = window.participants.find(p => p.id === window.currentCallerId); 
    if (target) { 
        window.currentTargetUser = target; 
        const pEl = document.getElementById('voice-friend-photo'); const fEl = document.getElementById('voice-friend-flag'); const nEl = document.getElementById('voice-friend-name');
        if (pEl) pEl.src = target.photo; if (fEl) fEl.innerText = target.flag; if (nEl) nEl.innerText = (target.name || 'User').split(' ')[0]; 
        window.voiceFriend = target; 
        if (window.switchChatRoom) window.switchChatRoom(target.id); 
        
        if (typeof window.switchTab === 'function') {
            window.switchTab(1); 
        }

        window.startWebRTC(false, window.currentCallerId); 
    } 
};

window.declineCall = function() { 
    window.stopAllRings();
    document.getElementById('incoming-call-modal').classList.remove('active'); 
    db.ref('signals/' + window.currentCallerId).push({ type: 'reject', callerName: window.myUsername });
    db.ref('signals/' + window.myProfileInfo.id + '/' + window.currentIncomingSignalKey).remove(); 
    window.endWebRTCCall();
};

window.hangUpCall = function() {
    window.stopAllRings();
    window.endWebRTCCall();
    if (window.currentTargetUser) {
        db.ref('signals/' + window.currentTargetUser.id).push({ type: 'reject', callerName: window.myUsername });
    }
    if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
    if (window.showToast) window.showToast("Call Ended", "Разговор завершен", "", "");
    if (window.switchTab) window.switchTab(0);
};

window.initSignalListener = function() { 
    if (!window.myProfileInfo || !window.myProfileInfo.id || window.isGuest) return; 
    db.ref('signals/' + window.myProfileInfo.id).on('child_added', (snap) => { 
        const sig = snap.val(); if (!sig) return; 
        if (sig.type === 'call') { 
            if (Date.now() - sig.timestamp < 30000) window.showIncomingCall(sig.callerId, sig.callerName, sig.callerPhoto, snap.key); 
            else db.ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
        } 
        else if (sig.type === 'reject') {
            window.stopAllRings();
            window.playSafeSound(window.sndMissed, [200, 100, 200]);
            if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
            db.ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
            window.endWebRTCCall();
            if (window.switchTab) window.switchTab(0);
        }
        else if (sig.type === 'answered') {
            window.stopAllRings(); 
            if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
            db.ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
            window.startWebRTC(true, window.currentTargetUser.id);
        }
        else if (sig.type === 'missed') {
            window.stopAllRings();
            document.getElementById('incoming-call-modal').classList.remove('active');
            db.ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
        }
    }); 
};

// --- 3. AUTO + 13 СТРАН СПИСОК И МЕНЮ ЯЗЫКОВ ---
window.confLanguages = [
    { code: 'auto', flag: '🌐', name: 'Auto (Авто)', lang: 'auto' },
    { code: 'az', flag: '🇦🇿', name: 'Azərbaycanca', lang: 'az' },
    { code: 'ru', flag: '🇷🇺', name: 'Русский', lang: 'ru' },
    { code: 'us', flag: '🇺🇸', name: 'English', lang: 'en' },
    { code: 'kz', flag: '🇰🇿', name: 'Қазақша', lang: 'kk' },
    { code: 'tr', flag: '🇹🇷', name: 'Türkçe', lang: 'tr' },
    { code: 'de', flag: '🇩🇪', name: 'Deutsch', lang: 'de' },
    { code: 'it', flag: '🇮🇹', name: 'Italiano', lang: 'it' },
    { code: 'fr', flag: '🇫🇷', name: 'Français', lang: 'fr' },
    { code: 'es', flag: '🇪🇸', name: 'Español', lang: 'es' },
    { code: 'pt', flag: '🇵🇹', name: 'Português', lang: 'pt' },
    { code: 'ae', flag: '🇦🇪', name: 'العربية', lang: 'ar' },
    { code: 'cn', flag: '🇨🇳', name: '中文', lang: 'zh' },
    { code: 'in', flag: '🇮🇳', name: 'हिन्दी', lang: 'hi' }
];

window.toggleSpeakerLangMenu = function(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('speaker-lang-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
};

window.setSpeakerLanguage = function(code, flag, lang) {
    window.meetSpeakerLang = { code: code, flag: flag, lang: lang };
    localStorage.setItem('hf_meet_speaker_lang', JSON.stringify(window.meetSpeakerLang));
    window.toggleSpeakerLangMenu();
    if (typeof window.initConference === 'function') window.initConference();
    if (window.showToast) window.showToast("Язык встречи изменен", `Установлен язык: ${flag} ${lang.toUpperCase()}`, "", "");
};

document.addEventListener('click', () => {
    const dropdown = document.getElementById('speaker-lang-dropdown');
    if (dropdown && !dropdown.classList.contains('hidden')) {
        dropdown.classList.add('hidden');
    }
});

// --- 4. ВИДЕОКОНФЕРЕНЦИЯ С СЕТКОЙ И ПЕРЕВОДОМ ---
window.initConference = function() {
    const confGrid = document.getElementById('conference-grid'); 
    if(!confGrid) return;

    let myName = (window.myProfileInfo && window.myProfileInfo.name) ? window.myProfileInfo.name.split(' (')[0] : 'You';
    
    let currentFlagCode = (window.meetSpeakerLang && window.meetSpeakerLang.code !== 'auto') ? window.meetSpeakerLang.code : (window.myProfileInfo?.flagCode || 'un');
    let currentFlagIcon = (window.meetSpeakerLang) ? window.meetSpeakerLang.flag : '🌐';
    let currentLangCode = (window.meetSpeakerLang && window.meetSpeakerLang.lang) ? window.meetSpeakerLang.lang.toUpperCase() : 'AUTO';

    let confHtml = `
    <div class="video-frame main relative cursor-pointer" id="my-video-container">
        <div onclick="window.toggleSpeakerLangMenu(event)" class="absolute inset-0 z-10"></div>
        <video id="my-live-video" class="mirror-video" playsinline autoplay muted></video>
        <div class="video-overlay z-20 pointer-events-none">${myName} (${currentFlagIcon} ${currentLangCode})</div>
        <div class="flag-overlay z-20 pointer-events-none" style="top:10px; right:10px;"><img src="https://flagcdn.com/w40/${currentFlagCode}.png" class="w-6 rounded-sm shadow"></div>
        
        <div id="speaker-lang-dropdown" class="absolute top-12 left-3 right-3 bg-[#111b21]/95 border border-[#2a3942] rounded-2xl p-2 shadow-2xl hidden z-50 grid grid-cols-2 gap-1.5 backdrop-blur-md max-h-[300px] overflow-y-auto">
            <div class="col-span-2 text-[0.7rem] text-[#00a884] font-bold uppercase px-2 py-1 border-b border-[#2a3942] mb-1">Выберите язык встречи:</div>
    `;

    window.confLanguages.forEach(l => {
        confHtml += `
            <button onclick="window.setSpeakerLanguage('${l.code}', '${l.flag}', '${l.lang}')" class="flex items-center gap-2 p-2 rounded-xl bg-[#202c33] hover:bg-[#00a884] hover:text-[#111b21] text-white text-xs transition text-left">
                <span class="text-base">${l.flag}</span>
                <span class="truncate font-semibold">${l.name}</span>
            </button>
        `;
    });

    confHtml += `
        </div>
        <div class="translation-bar z-20 pointer-events-none">
            <div class="conf-marquee-text" id="speaker-marquee" style="animation-duration: 15s;">➔ [${currentLangCode}] Нажмите на видео для смены языка</div>
        </div>
    </div>`;
    
    let activeUsers = [];
    if (window.currentRoomId === 'global' || window.currentRoomId === 'video_room_global') {
        activeUsers = (window.participants || []).filter(p => p.id !== 'ai' && p.id !== window.myProfileInfo?.id); 
    } else if (window.currentTargetUser) {
        activeUsers = [window.currentTargetUser];
    }

    window.confLanguages.filter(l => l.code !== 'auto').forEach(langArea => {
        let usersInThisLang = activeUsers.filter(p => p.flagCode === langArea.code);
        if (usersInThisLang.length > 0) {
            usersInThisLang.forEach(p => {
                let userLangStr = p.flagCode ? p.flagCode.toUpperCase() : 'AUTO';
                confHtml += `
                <div class="video-frame">
                    <div class="absolute inset-0 flex items-center justify-center bg-[#111b21]"><i class="fa-solid fa-user text-4xl text-[#2a3942]"></i></div>
                    <div class="video-overlay">${(p.name||'User').split(' ')[0]}</div>
                    <div class="flag-overlay" style="top:10px; right:10px;"><img src="https://flagcdn.com/w40/${p.flagCode || 'un'}.png" class="w-6 rounded-sm border border-[#2a3942]"></div>
                    <div class="translation-bar"><div class="conf-marquee-text conf-listener-marquee" data-lang="${langArea.code}" data-flag="${langArea.flag}">${p.flag || '🌐'} Перевод с ${userLangStr} активен...</div></div>
                </div>`;
            });
        } else {
            confHtml += `
            <div class="video-frame opacity-50">
                <div class="absolute inset-0 flex flex-col items-center justify-center bg-[#0b141a]">
                    <span class="text-4xl mb-2">${langArea.flag}</span>
                    <span class="text-xs text-[#8696a0]">Ожидание (${langArea.lang.toUpperCase()})</span>
                </div>
                <div class="translation-bar"><div class="conf-marquee-text">${langArea.flag} Канал свободен...</div></div>
            </div>`;
        }
    });

    confGrid.innerHTML = confHtml; 
    
    const videoEl = document.getElementById('my-live-video'); 
    let myVideoSrc = (window.myProfileInfo && window.myProfileInfo.video) ? window.myProfileInfo.video : '';
    if (videoEl) { 
        videoEl.src = myVideoSrc || 'https://assets.mixkit.co/videos/preview/mixkit-young-man-having-a-video-call-with-his-friends-41212-large.mp4'; 
        videoEl.loop = true; videoEl.muted = true; videoEl.autoplay = true; 
    }
};

window.toggleMyCamera = async function(btn) { 
    const videoEl = document.getElementById('my-live-video'); 
    if (window.myVideoStream) { 
        window.myVideoStream.getTracks().forEach(t => t.stop()); window.myVideoStream = null; 
        if (videoEl) { videoEl.srcObject = null; videoEl.src = window.myProfileInfo?.video || 'https://assets.mixkit.co/videos/preview/mixkit-young-man-having-a-video-call-with-his-friends-41212-large.mp4'; videoEl.play(); } 
        btn.classList.replace('bg-red-500', 'bg-[#202c33]'); btn.querySelector('i').className = 'fa-solid fa-video-slash text-[#8696a0]'; 
    } else { 
        try { 
            window.myVideoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false }); 
            if (videoEl) { videoEl.srcObject = window.myVideoStream; videoEl.play(); } 
            btn.classList.replace('bg-[#202c33]', 'bg-red-500'); btn.querySelector('i').className = 'fa-solid fa-video text-white'; 
        } catch(e) { alert("Доступ к камере запрещен! Убедитесь, что сайт открыт по HTTPS."); } 
    } 
};

// Отправка сообщений конференции с переводом бегущей строки спикера на выбранный в меню язык
window.sendConfMsg = async function() {
    const inputEl = document.getElementById('conf-chat-input');
    if (!inputEl) return;
    const text = inputEl.value.trim();
    if(!text) return;
    inputEl.value = '';

    const speakerLang = (window.meetSpeakerLang && window.meetSpeakerLang.lang && window.meetSpeakerLang.lang !== 'auto') 
        ? window.meetSpeakerLang.lang 
        : 'auto';
    const speakerFlag = (window.meetSpeakerLang && window.meetSpeakerLang.flag) ? window.meetSpeakerLang.flag : '🌐';

    // Переводим текст для бегущей строки спикера НА ВЫБРАННЫЙ ЯЗЫК
    let displayText = text;
    if (speakerLang !== 'auto') {
        try {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${speakerLang}&dt=t&q=${encodeURIComponent(text)}`).then(r => r.json());
            if (res && res[0] && res[0][0] && res[0][0][0]) {
                displayText = res[0][0][0];
            }
        } catch(e) {}
    }

    const myMarquee = document.getElementById('speaker-marquee');
    if (myMarquee) { 
        myMarquee.innerHTML = `<span class="text-white">You (${speakerLang.toUpperCase()}):</span> ${speakerFlag} ${displayText}`; 
        myMarquee.style.animation = 'none'; void myMarquee.offsetWidth; myMarquee.style.animation = null;
    }

    const listenerMarquees = document.querySelectorAll('.conf-listener-marquee');
    listenerMarquees.forEach(async (el) => {
        const tLang = el.getAttribute('data-lang') || 'en';
        const tFlag = el.getAttribute('data-flag') || '🌐';
        if (tLang === speakerLang) return;

        try {
            const slParam = speakerLang !== 'auto' ? speakerLang : 'auto';
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${slParam}&tl=${tLang}&dt=t&q=${encodeURIComponent(text)}`).then(r => r.json());
            const translated = (res && res[0] && res[0][0] && res[0][0][0]) ? res[0][0][0] : text;
            el.innerHTML = `<span class="text-white">Translate:</span> ${tFlag} ${translated}`;
            el.style.animation = 'none'; void el.offsetWidth; el.style.animation = null;
        } catch(e) {}
    });
};

window.isMeetMarqueeEnabled = true; 
window.toggleMeetMarquee = function() { 
    window.isMeetMarqueeEnabled = !window.isMeetMarqueeEnabled; 
    document.querySelectorAll('.translation-bar').forEach(b => { b.style.opacity = window.isMeetMarqueeEnabled ? "1" : "0"; }); 
};

const originalSwitchTab = window.switchTab;
window.switchTab = function(index) {
    if (originalSwitchTab) originalSwitchTab(index);
    if (index === 2) {
        setTimeout(() => {
            if (typeof window.initConference === 'function') {
                window.initConference();
            }
        }, 50);
    }
};

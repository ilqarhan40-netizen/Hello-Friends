//==========================================
// MODULE: CALLS, VIDEO & AGORA ENGINE
//==========================================

if (typeof AgoraRTC === 'undefined') {
    const script = document.createElement('script');
    script.src = "https://download.agora.io/sdk/release/AgoraRTC_N-4.22.0.js";
    document.head.appendChild(script);
}

window.agoraClient = null;
window.localAudioTrack = null;
window.localVideoTrack = null;
const AGORA_APP_ID = "913f13a6b8104d34b03695acdc0d79b7";

window.currentCallerId = null;
window.currentIncomingSignalKey = null;
window.currentIncomingCallType = 'voice';
window.myLastOutgoingCallType = 'voice';


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
    audioElement.muted = false;
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


          // --- ФУНКЦИИ AGORA (ВИДЕО И АУДИО) ---
window.startWebRTC = async function(isCaller, targetId, isVideo = false) {
    if (typeof AgoraRTC === 'undefined') {
        alert("Модуль связи загружается, подождите секунду...");
        window.hangUpCall();
        return;
    }

    try {
        window.agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

        // Прием потока от собеседника в твою мультиязычную сетку
        window.agoraClient.on("user-published", async (user, mediaType) => {
            await window.agoraClient.subscribe(user, mediaType);
            
            if (mediaType === "video") {
                let gridVideo = document.getElementById(`remote-video-${targetId}`);
                if (gridVideo) {
                    gridVideo.srcObject = new MediaStream([user.videoTrack.getMediaStreamTrack()]);
                    gridVideo.style.display = 'block';
                    gridVideo.classList.remove('hidden');
                    gridVideo.play().catch(e => console.warn(e));
                }
            }
            if (mediaType === "audio") {
                user.audioTrack.play();
            }
        });

        // Название комнаты жестко привязано к токену
        const channelName = "hello"; 
        
        // Подключение к серверу с токеном
        await window.agoraClient.join(AGORA_APP_ID, channelName, AGORA_TEMP_TOKEN, window.myProfileInfo.id);

        let tracksToPublish = [];

        if (!window.localAudioTrack) window.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        tracksToPublish.push(window.localAudioTrack);

        if (isVideo) {
            if (!window.localVideoTrack) {
                window.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
                let myVideo = document.getElementById('my-live-video');
                if (myVideo) {
                    myVideo.srcObject = new MediaStream([window.localVideoTrack.getMediaStreamTrack()]);
                    myVideo.play().catch(e=>{});
                }
            }
            tracksToPublish.push(window.localVideoTrack);
        }

        await window.agoraClient.publish(tracksToPublish);

    } catch (e) {
        console.error("Ошибка Agora: ", e);
        alert("Ошибка подключения! Проверьте консоль.");
        window.hangUpCall();
    }
};

window.endWebRTCCall = async function() {
    if (window.localAudioTrack) { window.localAudioTrack.close(); window.localAudioTrack = null; }
    if (window.localVideoTrack) { window.localVideoTrack.close(); window.localVideoTrack = null; }
    if (window.agoraClient) {
        try { await window.agoraClient.leave(); } catch (e) {}
        window.agoraClient = null;
    }
    
    document.querySelectorAll('[id^="remote-video-"]').forEach(v => {
        v.srcObject = null;
        v.classList.add('hidden');
        v.style.display = 'none';
    });

    const myVideo = document.getElementById('my-live-video');
    if (myVideo) {
        myVideo.srcObject = null;
        myVideo.src = window.myProfileInfo?.video || 'https://assets.mixkit.co/videos/preview/mixkit-young-man-having-a-video-call-with-his-friends-41212-large.mp4';
    }
    
    const camBtn = document.getElementById('conf-cam-btn');
    if (camBtn) {
        camBtn.classList.replace('bg-red-500', 'bg-[#202c33]');
        camBtn.querySelector('i').className = 'fa-solid fa-video-slash text-[#8696a0]';
    }
    
    window.currentCallerId = null;
    window.currentTargetUser = null;
};

window.toggleMyCamera = async function(btn) { 
    if (window.localVideoTrack) { 
        const isEnabled = window.localVideoTrack.isPlaying;
        await window.localVideoTrack.setEnabled(!isEnabled);
        
        if (!isEnabled) {
            btn.classList.replace('bg-[#202c33]', 'bg-red-500'); 
            btn.innerHTML = '<i class="fa-solid fa-video text-white"></i>'; 
        } else {
            btn.classList.replace('bg-red-500', 'bg-[#202c33]'); 
            btn.innerHTML = '<i class="fa-solid fa-video-slash text-[#8696a0]"></i>'; 
        }
    } 
};
      

// --- 2. ЛОГИКА ЗВОНКОВ (АУДИО И ВИДЕО) ---
window.openPhoneChoiceModal = function() { if(window.closeDropdown) window.closeDropdown(); document.getElementById('phone-choice-modal').classList.add('active'); };
window.closePhoneChoiceModal = function() { document.getElementById('phone-choice-modal').classList.remove('active'); };

window.startInAppCall = function(callType = 'voice') { 
    if (!window.currentTargetUser) { 
        alert("Выберите контакт для звонка!"); window.closePhoneChoiceModal(); return; 
    } 
    const target = window.currentTargetUser; 
    window.closePhoneChoiceModal(); 
    
    window.myLastOutgoingCallType = callType;
    firebase.database().ref('calls/' + window.myProfileInfo.id + '_' + target.id).remove();

    let callRef = firebase.database().ref('signals/' + target.id).push();
    callRef.set({ 
        type: 'call', 
        callType: callType,
        callerId: window.myProfileInfo.id, 
        callerName: window.myUsername, 
        callerPhoto: window.myProfileInfo.photo, 
        timestamp: firebase.database.ServerValue.TIMESTAMP 
    }); 
    
    let pushTitle = callType === 'video' ? "📹 Входящий видеозвонок" : "📞 Входящий аудиозвонок";
    if (window.sendPushNotification) {
        window.sendPushNotification(
            target.id, 
            { type: 'call', callerName: window.myUsername, callType: callType }, 
            pushTitle, 
            `${window.myUsername} звонит вам!`
        );
    }
    
    const photoEl = document.getElementById('voice-friend-photo'); const flagEl = document.getElementById('voice-friend-flag'); const nameEl = document.getElementById('voice-friend-name');
    if(photoEl) photoEl.src = target.photo; if(flagEl) flagEl.innerText = target.flag; if(nameEl) nameEl.innerText = target.name.split(' ')[0]; 
    
    window.voiceFriend = target; 
    if (window.switchTab) window.switchTab(callType === 'video' ? 2 : 1); 
    if(window.showToast) window.showToast("Calling...", `Звоним ${target.name.split(' ')[0]}...`, target.photo, ""); 
    
    window.stopAllRings();
    window.playSafeSound(window.sndCallOut);
    
    if (window.callTimeout) clearTimeout(window.callTimeout);
    window.callTimeout = setTimeout(() => {
        firebase.database().ref('signals/' + target.id).push({ type: 'missed', callerName: window.myUsername });
        callRef.remove(); window.callTimeout = null;
        window.stopAllRings();
        window.playSafeSound(window.sndMissed, [200, 100, 200]); 
        if(window.showToast) window.showToast("Нет ответа", "Абонент недоступен", "", "");
        
        let missedTitle = callType === 'video' ? "📵 Пропущенный видеозвонок" : "📵 Пропущенный вызов";
        if (window.sendPushNotification) {
            window.sendPushNotification(
                target.id, 
                { type: 'missed', callerName: window.myUsername }, 
                missedTitle, 
                `Вы пропустили вызов от ${window.myUsername}`
            );
        }
    }, 30000);
};

window.showIncomingCall = function(callerId, callerName, callerPhoto, signalKey, callType) { 
    window.currentIncomingSignalKey = signalKey; 
    window.currentCallerId = callerId; 
    window.currentIncomingCallType = callType || 'voice';

    const nameEl = document.getElementById('incoming-call-name'); 
    const photoEl = document.getElementById('incoming-call-photo');
    const typeLabel = document.getElementById('incoming-call-type'); 

    if(nameEl) nameEl.innerText = callerName || 'User'; 
    if(photoEl) photoEl.src = callerPhoto || 'https://ui-avatars.com/api/?name=U'; 
    if(typeLabel) typeLabel.innerText = callType === 'video' ? '📹 Входящий видеозвонок' : '📞 Входящий аудиозвонок';

    document.getElementById('incoming-call-modal').classList.add('active'); 
    
    window.stopAllRings();
    window.playSafeSound(window.sndRing, [1000, 500, 1000, 500, 1000, 500, 1000]);
};

window.acceptCall = function() { 
    window.stopAllRings();
    document.getElementById('incoming-call-modal').classList.remove('active'); 
    firebase.database().ref('signals/' + window.currentCallerId).push({ type: 'answered' });
    firebase.database().ref('signals/' + window.myProfileInfo.id + '/' + window.currentIncomingSignalKey).remove(); 

    let target = window.participants.find(p => p.id === window.currentCallerId); 
    if(target) { 
        window.currentTargetUser = target; 
        const pEl = document.getElementById('voice-friend-photo'); const fEl = document.getElementById('voice-friend-flag'); const nEl = document.getElementById('voice-friend-name');
        if(pEl) pEl.src = target.photo; if(fEl) fEl.innerText = target.flag; if(nEl) nEl.innerText = target.name.split(' ')[0]; 
        
        window.voiceFriend = target; 
        if(window.switchChatRoom) window.switchChatRoom(target.id); 
        if (window.switchTab) window.switchTab(window.currentIncomingCallType === 'video' ? 2 : 1); 
        
        window.startWebRTC(false, window.currentCallerId, window.currentIncomingCallType === 'video'); 
    } 
};

window.declineCall = function() { 
    window.stopAllRings();
    document.getElementById('incoming-call-modal').classList.remove('active'); 
    firebase.database().ref('signals/' + window.currentCallerId).push({ type: 'reject', callerName: window.myUsername });
    firebase.database().ref('signals/' + window.myProfileInfo.id + '/' + window.currentIncomingSignalKey).remove(); 
    window.endWebRTCCall();
};

window.hangUpCall = function() {
    window.stopAllRings();
    window.endWebRTCCall();
    
    if (window.currentTargetUser) {
        firebase.database().ref('signals/' + window.currentTargetUser.id).push({ type: 'reject', callerName: window.myUsername });
    }
    
    if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
    if (window.showToast) window.showToast("Call Ended", "Разговор завершен", "", "");
    
    if (window.switchTab) window.switchTab(0);
};

window.initSignalListener = function() { 
    if (!window.myProfileInfo || !window.myProfileInfo.id || window.isGuest) return; 
    
    // Предотвращаем двойной запуск слушателя
    if (window.isSignalListenerActive) return;
    window.isSignalListenerActive = true;

    firebase.database().ref('signals/' + window.myProfileInfo.id).on('child_added', (snap) => { 
        const sig = snap.val(); if (!sig) return; 
        
        if (sig.type === 'call') { 
            if (Date.now() - sig.timestamp < 30000) window.showIncomingCall(sig.callerId, sig.callerName, sig.callerPhoto, snap.key, sig.callType); 
            else firebase.database().ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
        } 
        else if (sig.type === 'reject') {
            window.stopAllRings();
            window.playSafeSound(window.sndMissed, [200, 100, 200]);
            if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
            firebase.database().ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
            window.endWebRTCCall();
            if (window.switchTab) window.switchTab(0);
        }
        else if (sig.type === 'answered') {
            window.stopAllRings(); 
            if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
            firebase.database().ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
            window.startWebRTC(true, window.currentTargetUser.id, window.myLastOutgoingCallType === 'video');
        }
        else if (sig.type === 'missed') {
            window.stopAllRings();
            document.getElementById('incoming-call-modal').classList.remove('active');
            firebase.database().ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
        }
    }); 
};

// --- АВТОМАТИЧЕСКИЙ ЗАПУСК ПРИЕМА ЗВОНКОВ ---
let signalInitCheck = setInterval(() => {
    if (window.myProfileInfo && window.myProfileInfo.id && typeof firebase !== 'undefined') {
        window.initSignalListener();
        clearInterval(signalInitCheck);
    }
}, 1000);

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
    
    const videoEl = document.getElementById('my-live-video'); 
    if(videoEl) { 
        videoEl.src = window.myProfileInfo.video || 'https://assets.mixkit.co/videos/preview/mixkit-young-man-having-a-video-call-with-his-friends-41212-large.mp4'; 
        videoEl.loop = true; videoEl.muted = true; videoEl.autoplay = true; 
    }
};

window.toggleMyCamera = async function(btn) { 
    const videoEl = document.getElementById('my-live-video'); 
    if (window.myVideoStream) { 
        window.myVideoStream.getTracks().forEach(t => t.stop()); window.myVideoStream = null; 
        if(videoEl) { videoEl.srcObject = null; videoEl.src = window.myProfileInfo.video || ''; videoEl.play(); } 
        btn.classList.replace('bg-red-500', 'bg-[#202c33]'); btn.querySelector('i').className = 'fa-solid fa-video-slash text-[#8696a0]'; 
    } else { 
        try { 
            window.myVideoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false }); 
            if(videoEl) { videoEl.srcObject = window.myVideoStream; videoEl.play(); } 
            btn.classList.replace('bg-[#202c33]', 'bg-red-500'); btn.querySelector('i').className = 'fa-solid fa-video text-white'; 
        } catch(e) { alert("Доступ к камере запрещен!"); } 
    } 
};

window.isMeetMarqueeEnabled = true; 
window.toggleMeetMarquee = function() { 
    window.isMeetMarqueeEnabled = !window.isMeetMarqueeEnabled; 
    document.querySelectorAll('.translation-bar').forEach(b => { b.style.opacity = window.isMeetMarqueeEnabled ? "1" : "0"; }); 
};

// --- ВЫЗОВ ИЗ КОНТАКТОВ ---
window.makeCallFromContact = function(userId, type = 'voice') {
    const target = (window.participants || []).find(p => p.id === userId);
    if (!target) return console.error("Юзер не найден");

    window.currentTargetUser = target;

    if ("vibrate" in navigator) navigator.vibrate([500, 200, 500]);
    
    window.startInAppCall(type);
};

// --- ФИКС ЗВУКА ОТПРАВКИ СООБЩЕНИЙ ВО ВСЕХ ЧАТАХ ---
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.sendFirebaseMsg) {
            const originalSend = window.sendFirebaseMsg;
            window.sendFirebaseMsg = function() {
                const inputId = window.currentMicInputTarget || 'chat-input';
                const inputEl = document.getElementById(inputId);
                
                if (inputEl && inputEl.value.trim() !== "") {
                    window.playSafeSound(window.sndMsg);
                }
                originalSend(); 
            };
        }
    }, 2000);
});

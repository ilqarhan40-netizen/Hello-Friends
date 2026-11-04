//==========================================
// MODULE: CALLS, VIDEO & WebRTC ENGINE (FINAL V2.0 - PUSH ENABLED)
// ==========================================

window.localStream = null;
window.peerConnection = null;
window.currentCallerId = null;
window.currentIncomingSignalKey = null;
window.currentIncomingCallType = 'voice'; 
window.myLastOutgoingCallType = 'voice';

// --- 0. ЗВУКОВОЙ ДВИЖОК (ОДИНАКОВЫЕ ГУДКИ) ---
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

// --- 1. ЛОГИКА ДОЗВОНА И ПРИЕМА СИГНАЛОВ (С ПУШАМИ) ---
window.openPhoneChoiceModal = function() { if(window.closeDropdown) window.closeDropdown(); document.getElementById('phone-choice-modal').classList.add('active'); };
window.closePhoneChoiceModal = function() { document.getElementById('phone-choice-modal').classList.remove('active'); };

window.startInAppCall = async function(callType = 'voice') { 
    if (!window.currentTargetUser) { 
        alert("Выберите контакт для звонка!"); window.closePhoneChoiceModal(); return; 
    } 
    const target = window.currentTargetUser; 
    window.closePhoneChoiceModal(); 
    window.myLastOutgoingCallType = callType;
    
    // Включаем свою камеру СРАЗУ во время дозвона
    if (callType === 'video') {
        try {
            window.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const myVideo = document.getElementById('my-live-video');
            if (myVideo) { 
                myVideo.src = ""; 
                myVideo.srcObject = window.localStream; 
                myVideo.play().catch(e=>{}); 
            }
            const camBtn = document.getElementById('conf-cam-btn');
            if (camBtn) { 
                camBtn.classList.replace('bg-[#202c33]', 'bg-red-500'); 
                camBtn.innerHTML = '<i class="fa-solid fa-video text-white"></i>'; 
            }
        } catch (e) {
            console.error("Ошибка камеры:", e);
            alert("Нет доступа к камере или микрофону! Проверьте разрешения браузера.");
            if (window.switchTab) window.switchTab(0);
            return; 
        }
    }

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
    
    // ОТПРАВКА PUSH-УВЕДОМЛЕНИЯ спящему собеседнику
    let pushTitle = callType === 'video' ? "📹 Входящий видеозвонок" : "📞 Входящий аудиозвонок";
    let pushBody = `${window.myUsername} звонит вам! Нажмите, чтобы ответить.`;
    if (window.sendPushToUser) {
        window.sendPushToUser(target.id, pushTitle, pushBody, { type: 'call', callerName: window.myUsername, callType: callType });
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
        window.endWebRTCCall(); 
        if (window.switchTab) window.switchTab(0);
    }, 30000); // 30 секунд ожидания
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
    
    if (window.isSignalListenerActive) return;
    window.isSignalListenerActive = true;

    firebase.database().ref('signals/' + window.myProfileInfo.id).on('child_added', (snap) => { 
        const sig = snap.val(); if (!sig) return; 
        
        if (sig.type === 'call') { 
            window.showIncomingCall(sig.callerId, sig.callerName, sig.callerPhoto, snap.key, sig.callType); 
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

let signalInitCheck = setInterval(() => {
    if (window.myProfileInfo && window.myProfileInfo.id && typeof firebase !== 'undefined') {
        window.initSignalListener();
        clearInterval(signalInitCheck);
    }
}, 1000);


// --- 2. ПЕРЕДАЧА ГОЛОСА И ВИДЕО (WebRTC) ---
window.startWebRTC = async function(isCaller, targetId, isVideo = false) {
    try {
        if (!window.localStream) {
            window.localStream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
        }
    } catch (e) {
        alert("ОШИБКА КАМЕРЫ при ответе: Убедитесь, что дано разрешение.");
        window.endWebRTCCall();
        if (window.switchTab) window.switchTab(0);
        return;
    }
    
    const servers = { iceServers: [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' } ] };
    window.peerConnection = new RTCPeerConnection(servers);
    
    window.localStream.getTracks().forEach(track => window.peerConnection.addTrack(track, window.localStream));

    if (isVideo) {
        let myVideo = document.getElementById('my-live-video');
        if (myVideo) {
            myVideo.src = ""; 
            myVideo.srcObject = window.localStream;
            myVideo.play().catch(e=>{});
            const camBtn = document.getElementById('conf-cam-btn');
            if (camBtn) { 
                camBtn.classList.replace('bg-[#202c33]', 'bg-red-500'); 
                camBtn.innerHTML = '<i class="fa-solid fa-video text-white"></i>'; 
            }
        }
    }

    window.peerConnection.ontrack = (event) => {
        if (isVideo) {
            let gridVideo = document.getElementById(`remote-video-${targetId}`);
            if (gridVideo) {
                gridVideo.srcObject = event.streams[0];
                gridVideo.classList.remove('hidden');
            }
        } else {
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
        }
    };

    const callRoomId = isCaller ? (window.myProfileInfo.id + '_' + targetId) : (targetId + '_' + window.myProfileInfo.id);
    const callDoc = firebase.database().ref('calls/' + callRoomId);

    window.peerConnection.onicecandidate = event => {
        if (event.candidate) callDoc.child(isCaller ? 'callerCandidates' : 'calleeCandidates').push(event.candidate.toJSON());
    };

    if (isCaller) {
        try {
            const offer = await window.peerConnection.createOffer();
            await window.peerConnection.setLocalDescription(offer);
            await callDoc.child('offer').set({ type: offer.type, sdp: offer.sdp });

            callDoc.child('answer').on('value', async snap => {
                const answer = snap.val();
                if (answer && !window.peerConnection.currentRemoteDescription) {
                    await window.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                    callDoc.child('calleeCandidates').on('child_added', snap => {
                        if(snap.val()) window.peerConnection.addIceCandidate(new RTCIceCandidate(snap.val())).catch(e=>{});
                    });
                }
            });
        } catch (e) { console.error(e); }
    } else {
        callDoc.child('offer').on('value', async snap => {
            const offer = snap.val();
            if (offer && !window.peerConnection.currentRemoteDescription) {
                try {
                    await window.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await window.peerConnection.createAnswer();
                    await window.peerConnection.setLocalDescription(answer);
                    await callDoc.child('answer').set({ type: answer.type, sdp: answer.sdp });
                    callDoc.child('callerCandidates').on('child_added', snap => {
                        if(snap.val()) window.peerConnection.addIceCandidate(new RTCIceCandidate(snap.val())).catch(e=>{});
                    });
                } catch(e) { console.error(e); }
            }
        });
    }
};

window.endWebRTCCall = function() {
    if (window.peerConnection) { window.peerConnection.close(); window.peerConnection = null; }
    if (window.localStream) { window.localStream.getTracks().forEach(t => t.stop()); window.localStream = null; }
    
    const remoteAudio = document.getElementById('remote-audio-player'); if (remoteAudio) remoteAudio.remove();
    
    document.querySelectorAll('[id^="remote-video-"]').forEach(v => {
        v.srcObject = null;
        v.classList.add('hidden');
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
};


// --- 3. UI И ИНТЕГРАЦИЯ С HTML ---
window.initConference = function() {
    const confGrid = document.getElementById('conference-grid'); if(!confGrid) return;
    
    let myReadLang = (typeof window.getLangPref === 'function') ? window.getLangPref(false, true) : (window.myProfileInfo.langCode || 'en'); 
    let myReadFlag = window.myProfileInfo.flag || '🌐';
    
    const smartLanguages = [
        { code: 'kz', flag: '🇰🇿', lang: 'KK' }, { code: 'az', flag: '🇦🇿', lang: 'AZ' }, { code: 'ru', flag: '🇷🇺', lang: 'RU' },
        { code: 'us', flag: '🇺🇸', lang: 'EN' }, { code: 'tr', flag: '🇹🇷', lang: 'TR' }, { code: 'es', flag: '🇪🇸', lang: 'ES' }, 
        { code: 'fr', flag: '🇫🇷', lang: 'FR' }, { code: 'de', flag: '🇩🇪', lang: 'DE' }, { code: 'it', flag: '🇮🇹', lang: 'IT' },
        { code: 'pt', flag: '🇵🇹', lang: 'PT' }, { code: 'ae', flag: '🇦🇪', lang: 'AR' }, { code: 'cn', flag: '🇨🇳', lang: 'ZH' }, { code: 'jp', flag: '🇯🇵', lang: 'JA' }
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
                    <video id="remote-video-${p.id}" class="absolute inset-0 w-full h-full object-cover z-20" autoplay playsinline></video>
                    <div class="absolute inset-0 flex items-center justify-center bg-[#111b21] z-10"><i class="fa-solid fa-user text-4xl text-[#2a3942]"></i></div>
                    <div class="video-overlay z-30">${(p.name||'User').split(' ')[0]}</div>
                    <div class="flag-overlay z-30" style="top:10px; right:10px;"><img src="https://flagcdn.com/w40/${p.flagCode || 'un'}.png" class="w-6 rounded-sm border border-[#2a3942]"></div>
                    <div class="translation-bar z-30"><div id="conf-marquee-${p.id}" class="conf-marquee-text conf-listener-marquee" data-lang="${myReadLang}" data-flag="${myReadFlag}" style="animation-duration: 30s;">${p.flag || '🌐'} Канал ${userLangStr} активен...</div></div>
                </div>`;
            });
        }
    });

    confGrid.innerHTML = confHtml; 
    
    const videoEl = document.getElementById('my-live-video'); 
    if(videoEl) { 
        videoEl.src = window.myProfileInfo.video || 'https://assets.mixkit.co/videos/preview/mixkit-young-man-having-a-video-call-with-his-friends-41212-large.mp4'; 
        videoEl.loop = true; videoEl.muted = true; videoEl.autoplay = true; 
    }
};

window.toggleMyCamera = async function(btn) { 
    if (window.localStream) { 
        window.endWebRTCCall(); 
        if (window.currentTargetUser) {
            firebase.database().ref('signals/' + window.currentTargetUser.id).push({ type: 'reject', callerName: window.myUsername });
        }
        if (window.switchTab) window.switchTab(0);
    } else { 
        if (window.currentTargetUser) {
            window.startInAppCall('video');
        } else {
            alert("Выберите контакт для звонка (Контакты -> Профиль -> App Video)");
        }
    } 
};

window.isMeetMarqueeEnabled = true; 
window.toggleMeetMarquee = function() { 
    window.isMeetMarqueeEnabled = !window.isMeetMarqueeEnabled; 
    document.querySelectorAll('.translation-bar').forEach(b => { b.style.opacity = window.isMeetMarqueeEnabled ? "1" : "0"; }); 
};

window.makeCallFromContact = function(userId, type = 'voice') {
    const target = (window.participants || []).find(p => p.id === userId);
    if (!target) return console.error("Юзер не найден");
    window.currentTargetUser = target;
    if ("vibrate" in navigator) navigator.vibrate([500, 200, 500]);
    window.startInAppCall(type);
};

// --- ПАТЧ: ПЕРЕОПРЕДЕЛЕНИЕ СЛОМАННЫХ КНОПОК В HTML ---
setTimeout(() => {
    window.openAvatarModal = function(id, fromSidebar = false) {
        if(window.closeDropdown) window.closeDropdown(); 
        if (id === 'me' || (window.myProfileInfo && id === window.myProfileInfo.id)) {
            if (window.openPersonalLangModal) window.openPersonalLangModal();
            return;
        }
        let p = window.participants.find(part => part.id === id); 
        if (!p) p = { id: id, name: 'User', photo: 'https://ui-avatars.com/api/?name=U&background=202c33&color=fff', flag: '🌐', flagCode: 'un', profession: 'Guest' };
        
        const modalImg = document.getElementById('modal-img'); if(modalImg) modalImg.src = p.flag === '🤖' ? 'https://ui-avatars.com/api/?name=AI&background=6b21a8&color=fff' : p.photo; 
        const modalName = document.getElementById('modal-name'); if(modalName) modalName.innerText = (p.name||'User').split(' ')[0]; 
        const modalProf = document.getElementById('modal-prof'); if(modalProf) modalProf.innerText = p.profession || 'User';

        const actionButtons = document.getElementById('modal-action-buttons');
        if(actionButtons && id !== 'ai') {
            const dict = (typeof i18n !== 'undefined' && window.appLang) ? (i18n[window.appLang] || i18n['en']) : {};
            actionButtons.innerHTML = `
            <div class="grid grid-cols-2 gap-2 w-full mt-1">
                <button onclick="window.closeAvatarModal(); window.currentIndex = null; window.switchTab(0); window.switchChatRoom('${p.id}');" class="py-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-white font-bold hover:border-[#00a884] text-[0.7rem] transition flex flex-col items-center justify-center gap-1.5 active:scale-95 shadow-sm">
                    <i class="fa-solid fa-lock text-[#00a884] text-lg"></i> ${dict['btn_private_chat'] || "Private Chat"}
                </button>
                <button onclick="window.closeAvatarModal(); window.currentTargetUser = window.participants.find(x=>x.id==='${p.id}'); window.currentIndex = null; window.switchTab(1); window.switchChatRoom('${p.id}');" class="py-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-white font-bold hover:border-blue-400 text-[0.7rem] transition flex flex-col items-center justify-center gap-1.5 active:scale-95 shadow-sm">
                    <i class="fa-solid fa-microphone-lines text-blue-400 text-lg"></i> ${dict['btn_voice_msg'] || "Voice Msg"}
                </button>
                <button onclick="window.closeAvatarModal(); window.switchChatRoom('${p.id}'); if(window.makeCallFromContact) window.makeCallFromContact('${p.id}', 'voice');" class="py-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-white font-bold hover:border-[#a29bfe] text-[0.7rem] transition flex flex-col items-center justify-center gap-1.5 active:scale-95 shadow-sm">
                    <i class="fa-solid fa-headset text-[#a29bfe] text-lg"></i> ${dict['btn_app_audio'] || "App Audio"}
                </button>
                <button onclick="window.closeAvatarModal(); window.switchChatRoom('${p.id}'); if(window.makeCallFromContact) window.makeCallFromContact('${p.id}', 'video');" class="py-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-white font-bold hover:border-pink-400 text-[0.7rem] transition flex flex-col items-center justify-center gap-1.5 active:scale-95 shadow-sm">
                    <i class="fa-solid fa-video text-pink-400 text-lg"></i> ${dict['btn_app_video'] || "App Video"}
                </button>
                <button onclick="window.closeAvatarModal(); window.location.href='tel:${(p.phone || '').replace(/\s+/g, '')}';" class="col-span-2 py-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-white font-bold hover:border-green-400 text-[0.7rem] transition flex flex-col items-center justify-center gap-1.5 active:scale-95 shadow-sm">
                    <i class="fa-solid fa-mobile-screen text-green-400 text-lg"></i> ${dict['btn_phone_call'] || "Phone Call"}
                </button>
            </div>`;
            actionButtons.style.display = 'block'; 
        }
        document.getElementById('avatar-modal').classList.add('active');
    };
}, 1000);

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

//==========================================
// MODULE: CALLS, VIDEO & WebRTC ENGINE (FINAL & INTEGRATED)
// ==========================================

window.localStream = null;
window.peerConnection = null;
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
        playPromise.catch(error => { console.warn("Audio blocked by browser."); });
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

// --- 1. ПЕРЕДАЧА ГОЛОСА И ВИДЕО (WebRTC) ---
window.startWebRTC = async function(isCaller, targetId, isVideo = false) {
    try {
        if (!window.localStream) {
            window.localStream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
        }
    } catch (e) {
        console.warn("Нет доступа к камере");
        return;
    }
    
    const servers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };
    window.peerConnection = new RTCPeerConnection(servers);
    
    window.localStream.getTracks().forEach(track => window.peerConnection.addTrack(track, window.localStream));

    if (isVideo) {
        let myVideo = document.getElementById('my-live-video');
        if (myVideo) {
            myVideo.src = ""; myVideo.srcObject = window.localStream; myVideo.play().catch(e=>{});
        }
    }

    window.peerConnection.ontrack = (event) => {
        if (isVideo) {
            let gridVideo = document.getElementById(`remote-video-${targetId}`);
            if (gridVideo) {
                gridVideo.srcObject = event.streams[0]; gridVideo.classList.remove('hidden'); gridVideo.play().catch(e=>{});
            } else {
                let remoteVideo = document.getElementById('remote-video-player');
                if (!remoteVideo) {
                    remoteVideo = document.createElement('video');
                    remoteVideo.id = 'remote-video-player';
                    remoteVideo.autoplay = true; remoteVideo.playsInline = true;
                    remoteVideo.className = "fixed inset-0 w-full h-full object-cover z-[9999] bg-black";
                    document.body.appendChild(remoteVideo);
                }
                remoteVideo.srcObject = event.streams[0];
            }
        } else {
            let remoteAudio = document.getElementById('remote-audio-player');
            if (!remoteAudio) {
                remoteAudio = document.createElement('audio');
                remoteAudio.id = 'remote-audio-player'; remoteAudio.autoplay = true; remoteAudio.playsInline = true;
                document.body.appendChild(remoteAudio);
            }
            remoteAudio.srcObject = event.streams[0]; remoteAudio.onloadedmetadata = () => { remoteAudio.play().catch(e => {}); };
        }
    };

    const callRoomId = isCaller ? (window.myProfileInfo.id + '_' + targetId) : (targetId + '_' + window.myProfileInfo.id);
    const callDoc = firebase.database().ref('calls/' + callRoomId);

    window.peerConnection.onicecandidate = event => {
        if (event.candidate) callDoc.child(isCaller ? 'callerCandidates' : 'calleeCandidates').push(event.candidate.toJSON());
    };

    if (isCaller) {
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
    } else {
        callDoc.child('offer').on('value', async snap => {
            const offer = snap.val();
            if (offer && !window.peerConnection.currentRemoteDescription) {
                await window.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await window.peerConnection.createAnswer();
                await window.peerConnection.setLocalDescription(answer);
                await callDoc.child('answer').set({ type: answer.type, sdp: answer.sdp });
                callDoc.child('callerCandidates').on('child_added', snap => {
                    if(snap.val()) window.peerConnection.addIceCandidate(new RTCIceCandidate(snap.val())).catch(e=>{});
                });
            }
        });
    }
};

window.endWebRTCCall = function() {
    if (window.peerConnection) { window.peerConnection.close(); window.peerConnection = null; }
    if (window.localStream) { window.localStream.getTracks().forEach(t => t.stop()); window.localStream = null; }
    
    const remoteAudio = document.getElementById('remote-audio-player'); if (remoteAudio) remoteAudio.remove();
    const remoteVideo = document.getElementById('remote-video-player'); if (remoteVideo) remoteVideo.remove();
    
    document.querySelectorAll('[id^="remote-video-"]').forEach(v => { v.srcObject = null; v.classList.add('hidden'); });

    const myVideo = document.getElementById('my-live-video');
    if (myVideo) {
        myVideo.srcObject = null;
        myVideo.src = (window.myProfileInfo && window.myProfileInfo.video) ? window.myProfileInfo.video : 'https://assets.mixkit.co/videos/preview/mixkit-young-man-having-a-video-call-with-his-friends-41212-large.mp4';
    }
    
    let camBtn = document.getElementById('conf-cam-btn');
    if(camBtn) {
        camBtn.classList.replace('bg-red-500', 'bg-[#202c33]');
        camBtn.querySelector('i').className = 'fa-solid fa-video-slash text-[#8696a0]';
    }
};

// --- 2. ЕДИНЫЙ СЛУШАТЕЛЬ (Звонки 1-на-1 и Групповые Инвайты) ---
window.initSignalListener = function() { 
    if (!window.myProfileInfo || !window.myProfileInfo.id || window.isGuest) return; 
    if (window.isSignalListenerActive) return;
    window.isSignalListenerActive = true;

    firebase.database().ref('signals/' + window.myProfileInfo.id).on('child_added', (snap) => { 
        const sig = snap.val(); if (!sig) return; 
        
        if (sig.type === 'call') { 
            if (Date.now() - sig.timestamp < 30000) window.showIncomingCall(sig.callerId, sig.callerName, sig.callerPhoto, snap.key, sig.callType); 
            else firebase.database().ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
        } 
        else if (sig.type === 'group_invite') {
            if (Date.now() - sig.timestamp < 60000) {
                window.playSafeSound(window.sndMsg, [200, 100, 200]);
                if (window.showToast) {
                    window.showToast(
                        "🎥 Видеоконференция", 
                        `${sig.callerName} зовет вас в видеочат! Нажмите здесь.`, 
                        sig.callerPhoto, 
                        `window.switchTab(2); if(window.initConference) window.initConference();`
                    );
                }
            }
            firebase.database().ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
        }
        else if (sig.type === 'reject') {
            window.stopAllRings(); window.playSafeSound(window.sndMissed, [200, 100, 200]);
            if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
            firebase.database().ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
            window.endWebRTCCall(); if (window.switchTab) window.switchTab(0);
        }
        else if (sig.type === 'answered') {
            window.stopAllRings(); 
            if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
            firebase.database().ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
            
            try {
                if (window.myLastOutgoingCallType === 'video' && window.initConference) window.initConference();
            } catch(e) {}

            setTimeout(() => { window.startWebRTC(true, window.currentTargetUser.id, window.myLastOutgoingCallType === 'video'); }, 500);
        }
        else if (sig.type === 'missed') {
            window.stopAllRings(); document.getElementById('incoming-call-modal').classList.remove('active');
            firebase.database().ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
        }
    }); 
};

let signalInitCheck = setInterval(() => {
    if (window.myProfileInfo && window.myProfileInfo.id && typeof firebase !== 'undefined') {
        window.initSignalListener(); clearInterval(signalInitCheck);
    }
}, 1000);


// --- 3. ИСХОДЯЩИЕ ЗВОНКИ 1-НА-1 ---
window.openPhoneChoiceModal = function() { if(window.closeDropdown) window.closeDropdown(); document.getElementById('phone-choice-modal').classList.add('active'); };
window.closePhoneChoiceModal = function() { document.getElementById('phone-choice-modal').classList.remove('active'); };

window.startInAppCall = function(callType = 'voice') { 
    if (!window.currentTargetUser) { 
        if(window.closePhoneChoiceModal) window.closePhoneChoiceModal(); return; 
    } 
    const target = window.currentTargetUser; 
    
    if(window.closePhoneChoiceModal) window.closePhoneChoiceModal();
    if(window.closeAllMenus) window.closeAllMenus();
    
    window.myLastOutgoingCallType = callType;
    let myId = (window.myProfileInfo && window.myProfileInfo.id) ? window.myProfileInfo.id : 'unknown';
    
    firebase.database().ref('calls/' + myId + '_' + target.id).remove();
    let callRef = firebase.database().ref('signals/' + target.id).push();
    
    // ОТПРАВКА СИГНАЛА СРАЗУ
    callRef.set({ 
        type: 'call', 
        callType: callType,
        callerId: myId, 
        callerName: window.myUsername || 'User', 
        callerPhoto: (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : '', 
        timestamp: firebase.database.ServerValue.TIMESTAMP 
    }); 
    
    let pushTitle = callType === 'video' ? "📹 Входящий видеозвонок" : "📞 Входящий аудиозвонок";
    if (window.sendPushNotification) {
        window.sendPushNotification(target.id, { type: 'call', callerName: window.myUsername, callType: callType }, pushTitle, `Входящий звонок...`);
    }
    
    window.stopAllRings();
    window.playSafeSound(window.sndCallOut, [500, 500, 500]);
    
    try {
        const photoEl = document.getElementById('voice-friend-photo'); const flagEl = document.getElementById('voice-friend-flag'); const nameEl = document.getElementById('voice-friend-name');
        if(photoEl) photoEl.src = target.photo; if(flagEl) flagEl.innerText = target.flag || '🌐'; if(nameEl) nameEl.innerText = target.name.split(' ')[0]; 
        
        window.voiceFriend = target; 
        
        if (callType === 'video' && window.initConference) window.initConference();
        if (window.switchTab) window.switchTab(callType === 'video' ? 2 : 1); 
        if (window.showToast) window.showToast("Calling...", `Звоним ${target.name.split(' ')[0]}...`, target.photo, ""); 
    } catch(err) {}
    
    if (callType === 'video') {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                window.localStream = stream; 
                let myVideo = document.getElementById('my-live-video');
                if (myVideo) {
                    myVideo.src = ""; myVideo.srcObject = window.localStream; myVideo.play().catch(e=>{});
                }
                let camBtn = document.getElementById('conf-cam-btn');
                if(camBtn) { camBtn.classList.replace('bg-[#202c33]', 'bg-red-500'); camBtn.querySelector('i').className = 'fa-solid fa-video text-white'; }
            }).catch(e => { console.warn("Камера заблокирована"); });
        }
    }
    
    if (window.callTimeout) clearTimeout(window.callTimeout);
    window.callTimeout = setTimeout(() => {
        firebase.database().ref('signals/' + target.id).push({ type: 'missed', callerName: window.myUsername });
        callRef.remove(); window.callTimeout = null;
        window.stopAllRings(); window.playSafeSound(window.sndMissed, [200, 100, 200]); 
        if(window.showToast) window.showToast("Нет ответа", "Абонент недоступен", "", "");
        window.endWebRTCCall();
    }, 30000);
};

window.showIncomingCall = function(callerId, callerName, callerPhoto, signalKey, callType) { 
    window.currentIncomingSignalKey = signalKey; window.currentCallerId = callerId; window.currentIncomingCallType = callType || 'voice';
    const nameEl = document.getElementById('incoming-call-name'); const photoEl = document.getElementById('incoming-call-photo'); const typeLabel = document.getElementById('incoming-call-type'); 
    if(nameEl) nameEl.innerText = callerName || 'User'; 
    if(photoEl) photoEl.src = callerPhoto || 'https://ui-avatars.com/api/?name=U'; 
    if(typeLabel) typeLabel.innerText = callType === 'video' ? '📹 Входящий видеозвонок' : '📞 Входящий аудиозвонок';
    document.getElementById('incoming-call-modal').classList.add('active'); 
    window.stopAllRings(); window.playSafeSound(window.sndRing, [1000, 500, 1000, 500, 1000]);
};

window.acceptCall = function() { 
    window.stopAllRings(); document.getElementById('incoming-call-modal').classList.remove('active'); 
    let myId = (window.myProfileInfo && window.myProfileInfo.id) ? window.myProfileInfo.id : 'unknown';
    firebase.database().ref('signals/' + window.currentCallerId).push({ type: 'answered' });
    firebase.database().ref('signals/' + myId + '/' + window.currentIncomingSignalKey).remove(); 

    let target = (window.participants || []).find(p => p.id === window.currentCallerId); 
    if(target) { 
        window.currentTargetUser = target; 
        const pEl = document.getElementById('voice-friend-photo'); const fEl = document.getElementById('voice-friend-flag'); const nEl = document.getElementById('voice-friend-name');
        if(pEl) pEl.src = target.photo; if(fEl) fEl.innerText = target.flag; if(nEl) nEl.innerText = target.name.split(' ')[0]; 
        
        window.voiceFriend = target; 
        if(window.switchChatRoom) window.switchChatRoom(target.id); 
        
        try {
            if (window.currentIncomingCallType === 'video' && window.initConference) window.initConference();
            if (window.switchTab) window.switchTab(window.currentIncomingCallType === 'video' ? 2 : 1); 
        } catch(e) {}
        
        setTimeout(() => { window.startWebRTC(false, window.currentCallerId, window.currentIncomingCallType === 'video'); }, 500);
    } 
};

window.declineCall = function() { 
    window.stopAllRings(); document.getElementById('incoming-call-modal').classList.remove('active'); 
    let myId = (window.myProfileInfo && window.myProfileInfo.id) ? window.myProfileInfo.id : 'unknown';
    firebase.database().ref('signals/' + window.currentCallerId).push({ type: 'reject', callerName: window.myUsername });
    firebase.database().ref('signals/' + myId + '/' + window.currentIncomingSignalKey).remove(); 
    window.endWebRTCCall();
};

window.hangUpCall = function() {
    window.stopAllRings(); window.endWebRTCCall();
    if (window.currentTargetUser) firebase.database().ref('signals/' + window.currentTargetUser.id).push({ type: 'reject', callerName: window.myUsername });
    if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
    if (window.showToast) window.showToast("Call Ended", "Разговор завершен", "", "");
    if (window.switchTab) window.switchTab(0);
};

// --- 4. ВИДЕОКОНФЕРЕНЦИЯ С ПЕРЕВОДОМ (chat.js ИНТЕГРАЦИЯ) ---
window.initConference = function() {
    try {
        const confGrid = document.getElementById('conference-grid'); if(!confGrid) return;
        
        let myReadLang = (typeof window.getLangPref === 'function') ? window.getLangPref(false, true) : 'en'; 
        let myReadFlag = (window.myProfileInfo && window.myProfileInfo.flag) ? window.myProfileInfo.flag : '🌐';
        let myName = window.myUsername || 'User';
        let myFlagCode = (window.myProfileInfo && window.myProfileInfo.flagCode) ? window.myProfileInfo.flagCode : 'un';
        
        // ПОЛНЫЕ МЕЖДУНАРОДНЫЕ КОДЫ ДЛЯ ПЕРЕВОДЧИКА
        const smartLanguages = [
            { code: 'kz', flag: '🇰🇿', lang: 'kk-KZ' }, { code: 'az', flag: '🇦🇿', lang: 'az-AZ' }, { code: 'ru', flag: '🇷🇺', lang: 'ru-RU' },
            { code: 'us', flag: '🇺🇸', lang: 'en-US' }, { code: 'tr', flag: '🇹🇷', lang: 'tr-TR' }, { code: 'es', flag: '🇪🇸', lang: 'es-ES' },
            { code: 'fr', flag: '🇫🇷', lang: 'fr-FR' }, { code: 'de', flag: '🇩🇪', lang: 'de-DE' }, { code: 'it', flag: '🇮🇹', lang: 'it-IT' },
            { code: 'pt', flag: '🇵🇹', lang: 'pt-PT' }, { code: 'ae', flag: '🇦🇪', lang: 'ar-AE' }, { code: 'cn', flag: '🇨🇳', lang: 'zh-CN' }, 
            { code: 'jp', flag: '🇯🇵', lang: 'ja-JP' }
        ];

        let confHtml = `
        <div class="video-frame main" id="my-video-container">
           <video id="my-live-video" class="mirror-video cursor-pointer" playsinline autoplay muted onclick="if(window.openPersonalLangModal) window.openPersonalLangModal()"></video>
            <div class="video-overlay">${myName}</div>
            <div class="flag-overlay" style="top:10px; right:10px;"><img src="https://flagcdn.com/w40/${myFlagCode}.png" class="w-6 rounded-sm"></div>
            <div class="translation-bar"><div id="speaker-marquee" class="conf-marquee-text conf-listener-marquee" data-lang="${myReadLang}" data-flag="${myReadFlag}" style="animation-duration: 30s;">➔ [AUTO] Связь защищена...</div></div>
        </div>`;
        
        let activeUsers = [];
        if (window.currentRoomId === 'global' || window.currentRoomId === 'video_room_global') {
            let myId = window.myProfileInfo ? window.myProfileInfo.id : '';
            activeUsers = (window.participants || []).filter(p => p.id !== 'ai' && p.id !== myId); 
        } else if (window.currentTargetUser) {
            activeUsers = [window.currentTargetUser];
        }

        smartLanguages.forEach(langArea => {
            let usersInThisLang = activeUsers.filter(p => p.flagCode === langArea.code);
            if (usersInThisLang.length > 0) {
                confHtml += `<div class="video-frame">
                    <img src="${usersInThisLang[0].photo}" class="placeholder-bg opacity-30">
                    <video id="remote-video-${usersInThisLang[0].id}" class="hidden" playsinline autoplay></video>
                    <div class="video-overlay">${(usersInThisLang[0].name || 'User').split(' ')[0]}</div>
                    <div class="flag-overlay" style="top:5px; right:5px;"><img src="https://flagcdn.com/w20/${langArea.code}.png" class="w-4 rounded-sm"></div>
                    <div class="translation-bar"><div id="conf-marquee-${usersInThisLang[0].id}" class="conf-marquee-text conf-listener-marquee" data-lang="${langArea.lang}" data-flag="${langArea.flag}" style="animation-duration: 25s;">➔ [AUTO] Translating...</div></div>
                </div>`;
            }
        });
        
        confGrid.innerHTML = confHtml;
    } catch (err) {}
};

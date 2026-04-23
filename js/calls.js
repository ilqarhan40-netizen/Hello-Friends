// ==========================================
// MODULE: CALLS, VIDEO & WebRTC ENGINE
// ==========================================

window.localStream = null;
window.peerConnection = null;
window.currentCallerId = null;
window.currentIncomingSignalKey = null;

// --- 0. ПОЛНЫЙ ЗВУКОВОЙ ДВИЖОК И ВИБРАЦИЯ ---
window.sndMsg = new Audio('sounds/message.mp3');
window.sndCash = new Audio('sounds/cash.mp3');
window.sndEmail = new Audio('sounds/email.mp3'); 
window.sndMissed = new Audio('sounds/missed.mp3'); 
window.sndRing = new Audio('sounds/ringtone.mp3');
window.sndCallOut = new Audio('sounds/calling.mp3'); 

window.sndRing.loop = true; 
window.sndCallOut.loop = true;

window.playSafeSound = function(audioElement, vibratePattern) {
    if (!audioElement) return;
    audioElement.currentTime = 0; 
    let playPromise = audioElement.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => { console.warn("Звук заблокирован. Нужен клик по экрану."); });
    }
    if (vibratePattern && "vibrate" in navigator) {
        navigator.vibrate(vibratePattern);
    }
};

window.stopAllRings = function() {
    if(window.sndRing) { window.sndRing.pause(); window.sndRing.currentTime = 0; }
    if(window.sndCallOut) { window.sndCallOut.pause(); window.sndCallOut.currentTime = 0; }
    if ("vibrate" in navigator) navigator.vibrate(0);
};

// ЗАЩИТА ОТ КРАША: Ждем загрузки <body>, прежде чем вешать клик
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
        alert("Для общения нужен доступ к микрофону!");
        return;
    }
    
    const servers = { iceServers: [ { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] } ] };
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
        
        remoteAudio.onloadedmetadata = () => {
            remoteAudio.play().catch(e => {
                if(window.showToast) window.showToast("Внимание", "Нажмите на экран, чтобы включить звук собеседника", "", "");
            });
        };
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
    
    const marquee = document.getElementById('voice-info-marquee');
    if (marquee) marquee.innerText = "🟢 СВЯЗЬ УСТАНОВЛЕНА - ГОВОРИТЕ";
};

window.endWebRTCCall = function() {
    if (window.peerConnection) { window.peerConnection.close(); window.peerConnection = null; }
    if (window.localStream) { window.localStream.getTracks().forEach(t => t.stop()); window.localStream = null; }
    const remoteAudio = document.getElementById('remote-audio-player'); if (remoteAudio) remoteAudio.remove();
    const marquee = document.getElementById('voice-info-marquee'); if (marquee) marquee.innerText = "Ожидание собеседника...";
};

// --- 2. ЛОГИКА ЗВОНКОВ ---
window.openPhoneChoiceModal = function() { if(window.closeDropdown) window.closeDropdown(); document.getElementById('phone-choice-modal').classList.add('active'); };
window.closePhoneChoiceModal = function() { document.getElementById('phone-choice-modal').classList.remove('active'); };

window.startInAppCall = function() { 
    if (!window.currentTargetUser) { 
        alert("Выберите контакт для звонка!"); window.closePhoneChoiceModal(); return; 
    } 
    const target = window.currentTargetUser; 
    window.closePhoneChoiceModal(); 
    
    let callRef = db.ref('signals/' + target.id).push();
    callRef.set({ type: 'call', callerId: window.myProfileInfo.id, callerName: window.myUsername, callerPhoto: window.myProfileInfo.photo, timestamp: firebase.database.ServerValue.TIMESTAMP }); 
    
    if(window.sendPushToUser) window.sendPushToUser(target.id, "Входящий вызов 📞", `${window.myUsername} звонит вам!`); 
    
    const photoEl = document.getElementById('voice-friend-photo'); const flagEl = document.getElementById('voice-friend-flag'); const nameEl = document.getElementById('voice-friend-name');
    if(photoEl) photoEl.src = target.photo; if(flagEl) flagEl.innerText = target.flag; if(nameEl) nameEl.innerText = target.name.split(' ')[0]; 
    
    window.voiceFriend = target; 
    if (window.switchTab) window.switchTab(1); 
    if(window.showToast) window.showToast("Calling...", `Звоним ${target.name.split(' ')[0]}...`, target.photo, ""); 
    
    // ВКЛЮЧАЕМ ГУДКИ
    window.playSafeSound(window.sndCallOut);
    
    if (window.callTimeout) clearTimeout(window.callTimeout);
    window.callTimeout = setTimeout(() => {
        db.ref('signals/' + target.id).push({ type: 'missed', callerName: window.myUsername });
        callRef.remove(); window.callTimeout = null;
        window.stopAllRings();
        window.playSafeSound(window.sndMissed, [200, 100, 200]); // Вибро сброса
        if(window.showToast) window.showToast("Нет ответа", "Абонент недоступен", "", "");
    }, 30000);
};

window.showIncomingCall = function(callerId, callerName, callerPhoto, signalKey) { 
    window.currentIncomingSignalKey = signalKey; 
    window.currentCallerId = callerId; 
    const nameEl = document.getElementById('incoming-call-name'); const photoEl = document.getElementById('incoming-call-photo');
    if(nameEl) nameEl.innerText = callerName || 'User'; 
    if(photoEl) photoEl.src = callerPhoto || 'https://ui-avatars.com/api/?name=U'; 
    document.getElementById('incoming-call-modal').classList.add('active'); 
    
    // ВКЛЮЧАЕМ РИНГТОН И ВИБРАЦИЮ
    window.playSafeSound(window.sndRing, [1000, 500, 1000, 500, 1000, 500, 1000]);
};

window.acceptCall = function() { 
    window.stopAllRings();
    document.getElementById('incoming-call-modal').classList.remove('active'); 
    db.ref('signals/' + window.currentCallerId).push({ type: 'answered' });
    db.ref('signals/' + window.myProfileInfo.id + '/' + window.currentIncomingSignalKey).remove(); 

    let target = window.participants.find(p => p.id === window.currentCallerId); 
    if(target) { 
        window.currentTargetUser = target; 
        const pEl = document.getElementById('voice-friend-photo'); const fEl = document.getElementById('voice-friend-flag'); const nEl = document.getElementById('voice-friend-name');
        if(pEl) pEl.src = target.photo; if(fEl) fEl.innerText = target.flag; if(nEl) nEl.innerText = target.name.split(' ')[0]; 
        
        window.voiceFriend = target; 
        if(window.switchChatRoom) window.switchChatRoom(target.id); 
        if (window.switchTab) window.switchTab(1); 
        
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
            window.playSafeSound(window.sndMissed, [200, 100, 200]); // Звук сброса
            if(window.showToast) window.showToast("Сброс", `${sig.callerName} отклонил вызов.`, "", "");
            if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
            db.ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
            window.endWebRTCCall();
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

// --- 3. ИЗОЛИРОВАННАЯ ВИДЕОКОНФЕРЕНЦИЯ ---
window.initConference = function() {
    const confGrid = document.getElementById('conference-grid'); if(!confGrid) return;
    
    let confHtml = `
    <div class="video-frame main" id="my-video-container">
       <video id="my-live-video" class="mirror-video cursor-pointer" playsinline autoplay muted onclick="window.openPersonalLangModal()"></video>
        <div class="video-overlay">${window.myUsername}</div>
        <div class="flag-overlay" style="top:10px; right:10px;"><img src="https://flagcdn.com/w40/${window.myProfileInfo.flagCode || 'un'}.png" class="w-6 rounded-sm"></div>
        <div class="translation-bar"><div class="conf-marquee-text" style="animation-duration: 15s;">➔ [AUTO] Связь защищена</div></div>
    </div>`;
    
    let usersToRender = [];
    
    if (window.currentRoomId === 'global' || window.currentRoomId === 'video_room_global') {
        usersToRender = (window.participants || []).filter(p => p.id !== 'ai'); 
    } else if (window.currentTargetUser) {
        usersToRender = [window.currentTargetUser];
    }

    usersToRender.forEach(p => {
        confHtml += `
        <div class="video-frame">
            <div class="absolute inset-0 flex items-center justify-center bg-[#111b21]"><i class="fa-solid fa-user text-4xl text-[#2a3942]"></i></div>
            <div class="video-overlay">${(p.name||'User').split(' ')[0]}</div>
            <div class="flag-overlay" style="top:10px; right:10px;"><img src="https://flagcdn.com/w40/${p.flagCode || 'un'}.png" class="w-6 rounded-sm border border-[#2a3942]"></div>
            <div class="translation-bar"><div class="conf-marquee-text" style="animation-duration: 15s;">${p.flag} Собеседник в сети...</div></div>
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
        if(videoEl) { videoEl.srcObject = null; videoEl.src = window.myProfileInfo.video || 'https://assets.mixkit.co/videos/preview/mixkit-young-man-having-a-video-call-with-his-friends-41212-large.mp4'; videoEl.play(); } 
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

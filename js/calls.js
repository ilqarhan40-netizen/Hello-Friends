// ==========================================
// MODULE: CALLS, VIDEO & WebRTC ENGINE
// ==========================================

// Глобальные переменные для связи
window.localStream = null;
window.peerConnection = null;
window.currentCallerId = null;
window.currentIncomingSignalKey = null;

// --- 1. ПЕРЕДАЧА ГОЛОСА (WebRTC) ---
window.startWebRTC = async function(isCaller, targetId) {
    console.log("Starting WebRTC. Role:", isCaller ? "Caller" : "Receiver");
    try {
        // Запрос микрофона
        window.localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    } catch (e) {
        console.error("Mic access error:", e);
        alert("Для общения нужен доступ к микрофону!");
        return;
    }
    
    // Настройка STUN-серверов Google для пробивки сети
    const servers = { iceServers: [ { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] } ] };
    window.peerConnection = new RTCPeerConnection(servers);
    
    // Добавляем свой аудио-трек в соединение
    window.localStream.getTracks().forEach(track => window.peerConnection.addTrack(track, window.localStream));

    // Слушаем поток собеседника
    window.peerConnection.ontrack = (event) => {
        let remoteAudio = document.getElementById('remote-audio-player');
        if (!remoteAudio) {
            remoteAudio = document.createElement('audio');
            remoteAudio.id = 'remote-audio-player';
            remoteAudio.autoplay = true;
            document.body.appendChild(remoteAudio);
        }
        remoteAudio.srcObject = event.streams[0];
    };

    // Путь к комнате звонка в Firebase
    const callRoomId = isCaller ? (window.myProfileInfo.id + '_' + targetId) : (targetId + '_' + window.myProfileInfo.id);
    const callDoc = db.ref('calls/' + callRoomId);

    // Обмен ICE-кандидатами
    window.peerConnection.onicecandidate = event => {
        if (event.candidate) {
            callDoc.child(isCaller ? 'callerCandidates' : 'calleeCandidates').push(event.candidate.toJSON());
        }
    };

    if (isCaller) {
        await callDoc.remove(); // Чистим старые сессии
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

// Завершение WebRTC сессии
window.endWebRTCCall = function() {
    if (window.peerConnection) { window.peerConnection.close(); window.peerConnection = null; }
    if (window.localStream) { window.localStream.getTracks().forEach(t => t.stop()); window.localStream = null; }
    const remoteAudio = document.getElementById('remote-audio-player'); if (remoteAudio) remoteAudio.remove();
    const marquee = document.getElementById('voice-info-marquee'); if (marquee) marquee.innerText = "Waiting for voice input...";
};

// --- 2. ЛОГИКА ЗВОНКОВ (ИНТЕРФЕЙС И СИГНАЛЫ) ---

window.openPhoneChoiceModal = function() { if(window.closeDropdown) window.closeDropdown(); document.getElementById('phone-choice-modal').classList.add('active'); };
window.closePhoneChoiceModal = function() { document.getElementById('phone-choice-modal').classList.remove('active'); };

window.startInAppCall = function() { 
    if (!window.currentTargetUser) { 
        alert("Выберите контакт для звонка!"); 
        window.closePhoneChoiceModal(); 
        return; 
    } 
    const target = window.currentTargetUser; 
    window.closePhoneChoiceModal(); 
    
    // Создаем сигнал вызова в Firebase
    let callRef = db.ref('signals/' + target.id).push();
    callRef.set({ 
        type: 'call', 
        callerId: window.myProfileInfo.id, 
        callerName: window.myUsername, 
        callerPhoto: window.myProfileInfo.photo, 
        timestamp: firebase.database.ServerValue.TIMESTAMP 
    }); 
    
    if(window.sendPushToUser) window.sendPushToUser(target.id, "Входящий вызов 📞", `${window.myUsername} звонит вам!`); 
    
    // UI обновления
    const photoEl = document.getElementById('voice-friend-photo');
    const flagEl = document.getElementById('voice-friend-flag');
    const nameEl = document.getElementById('voice-friend-name');
    if(photoEl) photoEl.src = target.photo; if(flagEl) flagEl.innerText = target.flag; if(nameEl) nameEl.innerText = target.name.split(' ')[0]; 
    
    window.voiceFriend = target; 
    if (window.switchTab) window.switchTab(1); 
    if(window.showToast) window.showToast("Calling...", `Звоним ${target.name.split(' ')[0]}...`, target.photo, ""); 
    
    // Таймаут если не берут трубку
    if (window.callTimeout) clearTimeout(window.callTimeout);
    window.callTimeout = setTimeout(() => {
        db.ref('signals/' + target.id).push({ type: 'missed', callerName: window.myUsername });
        callRef.remove(); 
        window.callTimeout = null;
    }, 30000);
};

window.showIncomingCall = function(callerId, callerName, callerPhoto, signalKey) { 
    window.currentIncomingSignalKey = signalKey; 
    window.currentCallerId = callerId; 
    const nameEl = document.getElementById('incoming-call-name');
    const photoEl = document.getElementById('incoming-call-photo');
    if(nameEl) nameEl.innerText = callerName || 'User'; 
    if(photoEl) photoEl.src = callerPhoto || 'https://ui-avatars.com/api/?name=U'; 
    document.getElementById('incoming-call-modal').classList.add('active'); 
    
    if(window.sndRing) { window.sndRing.currentTime = 0; window.sndRing.play().catch(e => {}); }
};

window.acceptCall = function() { 
    if(window.sndRing) { window.sndRing.pause(); window.sndRing.currentTime = 0; }
    document.getElementById('incoming-call-modal').classList.remove('active'); 
    
    db.ref('signals/' + window.currentCallerId).push({ type: 'answered' });
    db.ref('signals/' + window.myProfileInfo.id + '/' + window.currentIncomingSignalKey).remove(); 

    let target = window.participants.find(p => p.id === window.currentCallerId); 
    if(target) { 
        window.currentTargetUser = target; 
        const pEl = document.getElementById('voice-friend-photo');
        const fEl = document.getElementById('voice-friend-flag');
        const nEl = document.getElementById('voice-friend-name');
        if(pEl) pEl.src = target.photo; if(fEl) fEl.innerText = target.flag; if(nEl) nEl.innerText = target.name.split(' ')[0]; 
        
        window.voiceFriend = target; 
        if(window.switchChatRoom) window.switchChatRoom(target.id); 
        if (window.switchTab) window.switchTab(1); 
        
        // ЗАПУСК ГОЛОСА
        window.startWebRTC(false, window.currentCallerId); 
    } 
};

window.declineCall = function() { 
    if(window.sndRing) { window.sndRing.pause(); window.sndRing.currentTime = 0; }
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
            if (Date.now() - sig.timestamp < 30000) {
                window.showIncomingCall(sig.callerId, sig.callerName, sig.callerPhoto, snap.key); 
            } else {
                db.ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
            }
        } 
        else if (sig.type === 'reject') {
            if(window.showToast) window.showToast("Сброс", `${sig.callerName} отклонил вызов.`, "", "");
            if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
            db.ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
            window.endWebRTCCall();
        }
        else if (sig.type === 'answered') {
            if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
            db.ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
            // ЗАПУСК ГОЛОСА ДЛЯ ТОГО КТО ЗВОНИЛ
            window.startWebRTC(true, window.currentTargetUser.id);
        }
        else if (sig.type === 'missed') {
            if(window.sndRing) window.sndRing.pause();
            document.getElementById('incoming-call-modal').classList.remove('active');
            db.ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
        }
    }); 
};

// --- 3. ВИДЕОКОНФЕРЕНЦИЯ ---

window.initConference = function() {
    const confGrid = document.getElementById('conference-grid'); if(!confGrid) return;
    let myLang = window.myProfileInfo.langCode || 'en';

    let confHtml = `
    <div class="video-frame main" id="my-video-container">
        <video id="my-live-video" class="cursor-pointer" playsinline autoplay muted></video>
        <div class="video-overlay">${window.myUsername}</div>
        <div class="flag-overlay"><img src="https://flagcdn.com/w40/${window.myProfileInfo.flagCode || 'un'}.png" class="w-6 rounded-sm"></div>
        <div class="translation-bar"><div class="conf-marquee-text" id="speaker-marquee">➔ [AUTO] Welcome!</div></div>
    </div>`;
    
    let realParticipants = (window.participants || []).filter(p => p.id !== 'ai'); 
    let renderedCount = 1; 
    
    realParticipants.forEach(p => {
        if (renderedCount >= 12) return; 
        confHtml += `
        <div class="video-frame">
            <div class="absolute inset-0 flex items-center justify-center bg-[#111b21]"><i class="fa-solid fa-user text-4xl text-[#2a3942]"></i></div>
            <div class="video-overlay">${(p.name||'User').split(' ')[0]}</div>
            <div class="flag-overlay"><img src="https://flagcdn.com/w40/${p.flagCode || 'un'}.png" class="w-6 rounded-sm"></div>
            <div class="translation-bar"><div class="conf-marquee-text">${p.flag} Listening...</div></div>
        </div>`;
        renderedCount++;
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
        window.myVideoStream.getTracks().forEach(t => t.stop()); 
        window.myVideoStream = null; 
        if(videoEl) { 
            videoEl.srcObject = null; 
            videoEl.src = window.myProfileInfo.video || 'https://assets.mixkit.co/videos/preview/mixkit-young-man-having-a-video-call-with-his-friends-41212-large.mp4'; 
            videoEl.play(); 
        } 
        btn.classList.replace('bg-red-500', 'bg-[#202c33]');
        btn.querySelector('i').className = 'fa-solid fa-video-slash text-[#8696a0]'; 
    } else { 
        try { 
            window.myVideoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false }); 
            if(videoEl) { videoEl.srcObject = window.myVideoStream; videoEl.play(); } 
            btn.classList.replace('bg-[#202c33]', 'bg-red-500');
            btn.querySelector('i').className = 'fa-solid fa-video text-white'; 
        } catch(e) { alert("Доступ к камере запрещен!"); } 
    } 
};

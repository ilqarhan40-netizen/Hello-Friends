// ==========================================
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

// --- 2. ЕДИНЫЙ СЛУШАТЕЛЬ СИГНАЛОВ ---
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
                    window.showToast("🎥 Видеоконференция", `${sig.callerName} зовет вас в видеочат! Нажмите здесь.`, sig.callerPhoto, `window.switchTab(2); if(window.initConference) window.initConference();`);
                }
            }
            firebase.database().ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
        }
        else if (sig.type === 'reject') {
            window.stopAllRings(); window.playSafeSound(window.sndMissed, [200, 100, 200]);
            if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
            firebase.database().ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
            window.hideOutgoingCallScreen(); 
            window.endWebRTCCall(); if (window.switchTab) window.switchTab(0);
        }
        else if (sig.type === 'answered') {
            window.stopAllRings(); 
            if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
            firebase.database().ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
            
            window.hideOutgoingCallScreen(); 
            
            try {
                if (window.myLastOutgoingCallType === 'video' && window.initConference) window.initConference();
                if (window.switchTab) window.switchTab(window.myLastOutgoingCallType === 'video' ? 2 : 1);
            } catch(e) {}

            setTimeout(() => { window.startWebRTC(true, window.currentTargetUser.id, window.myLastOutgoingCallType === 'video'); }, 500);
        }
        else if (sig.type === 'missed') {
            window.stopAllRings(); 
            if (document.getElementById('incoming-call-modal')) {
                document.getElementById('incoming-call-modal').classList.remove('active');
            }
            
            // ВЫЗЫВАЕМ ПОЛНОЭКРАННОЕ ОКНО ПРОПУЩЕННОГО ВНУТРИ ПРИЛОЖЕНИЯ
            window.showMissedCallAlert(sig.callerName, sig.callType, sig.callerPhoto);
            
            window.playSafeSound(window.sndMissed, [200, 100, 200]);
            firebase.database().ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
        }
    }); 
};

let signalInitCheck = setInterval(() => {
    if (window.myProfileInfo && window.myProfileInfo.id && typeof firebase !== 'undefined') {
        window.initSignalListener(); clearInterval(signalInitCheck);
    }
}, 1000);


// --- 3. ИСХОДЯЩИЕ ЗВОНКИ И ЭКРАН ОЖИДАНИЯ ---
window.showOutgoingCallScreen = function(target, callType) {
    let overlay = document.getElementById('outgoing-call-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'outgoing-call-overlay';
        overlay.className = 'fixed inset-0 z-[99999] bg-[#0b141a] flex flex-col items-center justify-center transition-all duration-300';
        document.body.appendChild(overlay);
    }
    let tType = callType === 'video' ? '📹 Видеозвонок...' : '📞 Аудиозвонок...';
    overlay.innerHTML = `
        <div class="absolute inset-0 bg-cover bg-center blur-xl opacity-20" style="background-image: url('${target.photo}')"></div>
        <div class="relative z-10 flex flex-col items-center mt-10">
            <div class="w-32 h-32 rounded-full overflow-hidden border-4 border-[#00a884] shadow-[0_0_30px_rgba(0,168,132,0.6)] mb-6 animate-pulse">
                <img src="${target.photo}" class="w-full h-full object-cover">
            </div>
            <h2 class="text-3xl text-white font-bold mb-2">${target.name.split(' ')[0]}</h2>
            <p class="text-[#00a884] text-lg mb-12 tracking-widest uppercase animate-bounce">${tType}</p>
            <button onclick="window.hangUpCall()" class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white text-2xl shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:bg-red-600 transition hover:scale-110">
                <i class="fa-solid fa-phone-slash"></i>
            </button>
        </div>
    `;
    overlay.classList.remove('hidden');
};

window.hideOutgoingCallScreen = function() {
    const overlay = document.getElementById('outgoing-call-overlay');
    if (overlay) overlay.classList.add('hidden');
};

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
    
    callRef.set({ 
        type: 'call', 
        callType: callType,
        callerId: myId, 
        callerName: window.myUsername || 'User', 
        callerPhoto: (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : '', 
        timestamp: firebase.database.ServerValue.TIMESTAMP 
    }); 
    
    // ОТПРАВЛЯЕМ PUSH О ВХОДЯЩЕМ ЗВОНКЕ ЧЕРЕЗ ONESIGNAL
    let pushTitle = callType === 'video' ? "📹 Входящий видеозвонок" : "📞 Входящий аудиозвонок";
    let pushBody = `Вам звонит ${window.myUsername}`;
    if (window.sendPushToUser) {
        window.sendPushToUser(target.id, pushTitle, pushBody, { type: 'call', callType: callType });
    }
    
    window.stopAllRings();
    window.playSafeSound(window.sndCallOut, [500, 500, 500]);
    window.showOutgoingCallScreen(target, callType);
    
    try { window.voiceFriend = target; } catch(err) {}
    
    if (callType === 'video') {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => { window.localStream = stream; }).catch(e => { console.warn("Камера заблокирована"); });
        }
    }
    
    if (window.callTimeout) clearTimeout(window.callTimeout);
    
    // ЕСЛИ НЕ ОТВЕТИЛИ ЗА 30 СЕКУНД
    window.callTimeout = setTimeout(() => {
        firebase.database().ref('signals/' + target.id).push({ 
            type: 'missed', 
            callerName: window.myUsername, 
            callType: callType,
            callerPhoto: (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : ''
        });
        
        callRef.remove(); 
        window.callTimeout = null;
        window.stopAllRings(); 
        window.playSafeSound(window.sndMissed, [200, 100, 200]); 
        window.hideOutgoingCallScreen();
        
        // ОТПРАВЛЯЕМ PUSH НА ЗАБЛОКИРОВАННЫЙ ЭКРАН ТЕЛЕФОНА
        if (window.sendPushToUser) {
            let missedTitle = callType === 'video' ? "📹 Пропущенный видеозвонок" : "📞 Пропущенный аудиозвонок";
            let missedBody = `Вы пропустили вызов от: ${window.myUsername}`;
            window.sendPushToUser(target.id, missedTitle, missedBody, { type: 'missed' });
        }

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
    window.stopAllRings(); 
    window.hideOutgoingCallScreen(); 
    window.endWebRTCCall();
    
    // Если положили трубку сами до ответа — отправляем сигнал missed
    if (window.currentTargetUser) {
        if (window.callTimeout) {
            firebase.database().ref('signals/' + window.currentTargetUser.id).push({ 
                type: 'missed', 
                callerName: window.myUsername, 
                callType: window.myLastOutgoingCallType,
                callerPhoto: (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : ''
            });
            
            // ОТПРАВЛЯЕМ PUSH НА ЗАБЛОКИРОВАННЫЙ ЭКРАН ТЕЛЕФОНА О СБРОШЕННОМ ВЫЗОВЕ
            if (window.sendPushToUser) {
                let missedTitle = window.myLastOutgoingCallType === 'video' ? "📹 Пропущенный видеозвонок" : "📞 Пропущенный аудиозвонок";
                let missedBody = `Вы пропустили вызов от: ${window.myUsername}`;
                window.sendPushToUser(window.currentTargetUser.id, missedTitle, missedBody, { type: 'missed' });
            }
        } else {
            firebase.database().ref('signals/' + window.currentTargetUser.id).push({ type: 'reject', callerName: window.myUsername });
        }
    }
    
    if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
    if (window.switchTab) window.switchTab(0);
};

// --- 4. ВИДЕОКОНФЕРЕНЦИЯ С ПЕРЕВОДОМ ---
window.initConference = function() {
    try {
        const confGrid = document.getElementById('conference-grid'); if(!confGrid) return;
        
        let myReadLang = (typeof window.getLangPref === 'function') ? window.getLangPref(false, true) : 'en'; 
        let myReadFlag = (window.myProfileInfo && window.myProfileInfo.flag) ? window.myProfileInfo.flag : '🌐';
        let myName = window.myUsername || 'User';
        let myFlagCode = (window.myProfileInfo && window.myProfileInfo.flagCode) ? window.myProfileInfo.flagCode : 'un';
        
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
        
        let myVideo = document.getElementById('my-live-video');
        if (myVideo && window.localStream) { myVideo.srcObject = window.localStream; myVideo.play().catch(e=>{}); }
    } catch (err) {}
};

window.toggleMeetMarquee = function() {
    let bars = document.querySelectorAll('.translation-bar');
    bars.forEach(b => { b.style.opacity = (b.style.opacity === '0' || b.style.opacity === 0) ? '1' : '0'; });
};

window.toggleMyCamera = function(btn) {
    if (window.localStream) {
        let videoTrack = window.localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            if (videoTrack.enabled) {
                btn.classList.replace('bg-[#202c33]', 'bg-red-500'); btn.querySelector('i').className = 'fa-solid fa-video text-white';
            } else {
                btn.classList.replace('bg-red-500', 'bg-[#202c33]'); btn.querySelector('i').className = 'fa-solid fa-video-slash text-[#8696a0]';
            }
        }
    }
};

// --- 5. ВСПЛЫВАЮЩЕЕ ОКНО ПРОПУЩЕННОГО ЗВОНКА (ВНУТРИ ПРИЛОЖЕНИЯ) ---
window.showMissedCallAlert = function(callerName, callType, callerPhoto) {
    let modal = document.getElementById('missed-call-alert-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'missed-call-alert-modal';
        modal.className = 'fixed inset-0 bg-black/80 z-[99999] hidden flex-col items-center justify-center p-4 backdrop-blur-sm transition-opacity';
        document.body.appendChild(modal);
    }

    let icon = callType === 'video' ? '<i class="fa-solid fa-video text-pink-400"></i>' : '<i class="fa-solid fa-phone text-blue-400"></i>';
    let title = callType === 'video' ? 'Пропущенный видеозвонок' : 'Пропущенный аудиозвонок';
    let photo = callerPhoto || 'https://ui-avatars.com/api/?name=U';

    modal.innerHTML = `
        <div class="bg-[#111b21] rounded-3xl w-full max-w-sm flex flex-col items-center p-6 border border-[#2a3942] shadow-2xl relative transform transition-all scale-100">
            <div class="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <i class="fa-solid fa-phone-missed text-3xl text-red-500"></i>
            </div>
            <h3 class="text-white font-bold text-xl mb-1">${title}</h3>
            <p class="text-[#8696a0] text-[0.8rem] text-center mb-6">Вы пропустили вызов, пока вас не было в приложении.</p>
            
            <div class="flex items-center gap-4 bg-[#202c33] border border-[#2a3942] rounded-2xl p-3 w-full mb-6">
                <img src="${photo}" class="w-14 h-14 rounded-full object-cover border-2 border-[#00a884]">
                <div class="flex flex-col">
                    <span class="text-white font-bold text-lg">${callerName || 'Unknown'}</span>
                    <span class="text-xs text-[#8696a0] mt-1">${icon} ${title}</span>
                </div>
            </div>

            <button onclick="document.getElementById('missed-call-alert-modal').classList.add('hidden')" class="w-full bg-[#00a884] text-[#111b21] font-bold py-3.5 rounded-xl transition hover:scale-95 shadow-[0_0_15px_rgba(0,168,132,0.3)]">
                Понятно, закрыть
            </button>
        </div>
    `;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

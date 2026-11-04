//==========================================
// MODULE: CALLS, VIDEO & WebRTC ENGINE (CLEAN - ZERO UI OVERRIDE)
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
        playPromise.catch(error => { console.warn("Звук заблокирован до клика."); });
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

// --- 1. ДОЗВОН И ОБРАБОТКА СИГНАЛОВ ---
window.openPhoneChoiceModal = function() { if(window.closeDropdown) window.closeDropdown(); document.getElementById('phone-choice-modal').classList.add('active'); };
window.closePhoneChoiceModal = function() { document.getElementById('phone-choice-modal').classList.remove('active'); };

window.startInAppCall = async function(callType = 'voice') { 
    if (!window.currentTargetUser) { 
        alert("Выберите контакт для звонка!"); 
        window.closePhoneChoiceModal(); 
        return; 
    } 
    const target = window.currentTargetUser; 
    window.closePhoneChoiceModal(); 
    window.myLastOutgoingCallType = callType;
    
    if (callType === 'video') {
        try {
            window.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const myVideo = document.getElementById('my-live-video');
            if (myVideo) { 
                myVideo.srcObject = window.localStream; 
                myVideo.play().catch(e=>{}); 
            }
            const camBtn = document.getElementById('conf-cam-btn');
            if (camBtn) { 
                camBtn.classList.replace('bg-[#202c33]', 'bg-red-500'); 
                camBtn.innerHTML = '<i class="fa-solid fa-video text-white"></i>'; 
            }
        } catch (e) {
            alert("Нет доступа к камере или микрофону!");
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
    
    let pushTitle = callType === 'video' ? "📹 Входящий видеозвонок" : "📞 Входящий аудиозвонок";
    if (window.sendPushToUser) window.sendPushToUser(target.id, pushTitle, `${window.myUsername} звонит вам!`, { type: 'call' });
    
    const photoEl = document.getElementById('voice-friend-photo'); 
    const flagEl = document.getElementById('voice-friend-flag'); 
    const nameEl = document.getElementById('voice-friend-name');
    if(photoEl) photoEl.src = target.photo; 
    if(flagEl) flagEl.innerText = target.flag; 
    if(nameEl) nameEl.innerText = target.name.split(' ')[0]; 
    
    window.voiceFriend = target; 
    if (window.switchTab) window.switchTab(callType === 'video' ? 2 : 1); 
    
    window.stopAllRings();
    window.playSafeSound(window.sndCallOut);
    
    if (window.callTimeout) clearTimeout(window.callTimeout);
    window.callTimeout = setTimeout(() => {
        firebase.database().ref('signals/' + target.id).push({ type: 'missed', callerName: window.myUsername });
        callRef.remove(); 
        window.callTimeout = null;
        window.stopAllRings();
        window.playSafeSound(window.sndMissed, [200, 100, 200]); 
        window.endWebRTCCall(); 
        if (window.switchTab) window.switchTab(0);
    }, 30000); 
};

window.showIncomingCall = function(callerId, callerName, callerPhoto, signalKey, callType) { 
    window.currentIncomingSignalKey = signalKey; 
    window.currentCallerId = callerId; 
    window.currentIncomingCallType = callType || 'voice';

    const modal = document.getElementById('incoming-call-modal');
    if (modal) {
        const h2 = modal.querySelector('h2');
        if (h2) h2.innerText = callType === 'video' ? 'INCOMING VIDEO' : 'INCOMING CALL';
    }

    const nameEl = document.getElementById('incoming-call-name'); 
    const photoEl = document.getElementById('incoming-call-photo');
    if(nameEl) nameEl.innerText = callerName || 'User'; 
    if(photoEl) photoEl.src = callerPhoto || 'https://ui-avatars.com/api/?name=U'; 

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
        const pEl = document.getElementById('voice-friend-photo'); 
        const fEl = document.getElementById('voice-friend-flag'); 
        const nEl = document.getElementById('voice-friend-name');
        if(pEl) pEl.src = target.photo; 
        if(fEl) fEl.innerText = target.flag; 
        if(nEl) nEl.innerText = target.name.split(' ')[0]; 
        
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
    
    let targetId = window.currentTargetUser ? window.currentTargetUser.id : window.currentCallerId;
    if (targetId) {
        firebase.database().ref('signals/' + targetId).push({ type: 'reject', callerName: window.myUsername });
    }

    window.endWebRTCCall();
    if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
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
        else if (sig.type === 'reject' || sig.type === 'end_call') {
            window.stopAllRings();
            window.playSafeSound(window.sndMissed, [200, 100, 200]);
            if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
            firebase.database().ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
            
            document.getElementById('incoming-call-modal').classList.remove('active'); 
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

// --- 2. WEBRTC ПОТОКИ ---
window.startWebRTC = async function(isCaller, targetId, isVideo = false) {
    try {
        if (!window.localStream) {
            window.localStream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
        }
    } catch (e) {
        alert("Нет доступа к камере или микрофону!");
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
        const stream = event.streams[0];
        if (isVideo) {
            let gridVideo = document.getElementById(`remote-video-${targetId}`);
            if (gridVideo) {
                gridVideo.srcObject = stream;
                gridVideo.muted = false;
                gridVideo.classList.remove('hidden');
                gridVideo.play().catch(e => console.warn(e));
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
            remoteAudio.srcObject = stream;
            remoteAudio.muted = false;
            remoteAudio.play().catch(e => console.warn(e));
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
        } catch(e) {}
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
                } catch(e) {}
            }
        });
    }
};

window.endWebRTCCall = function() {
    if (window.peerConnection) { window.peerConnection.close(); window.peerConnection = null; }
    if (window.localStream) { window.localStream.getTracks().forEach(t => t.stop()); window.localStream = null; }
    
    const remoteAudio = document.getElementById('remote-audio-player'); 
    if (remoteAudio) remoteAudio.remove();
    
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

// --- 3. УПРАВЛЕНИЕ КАМЕРОЙ (ТОЛЬКО ВЫКЛЮЧЕНИЕ КАРТИНКИ, НЕ ЗВОНКА) ---
window.toggleMyCamera = function(btn) { 
    if (window.localStream) { 
        const videoTrack = window.localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            if (videoTrack.enabled) {
                btn.classList.replace('bg-[#202c33]', 'bg-red-500'); 
                btn.innerHTML = '<i class="fa-solid fa-video text-white"></i>'; 
            } else {
                btn.classList.replace('bg-red-500', 'bg-[#202c33]'); 
                btn.innerHTML = '<i class="fa-solid fa-video-slash text-[#8696a0]"></i>'; 
            }
        }
    } 
};

window.makeCallFromContact = function(userId, type = 'voice') {
    const target = (window.participants || []).find(p => p.id === userId);
    if (!target) return;
    window.currentTargetUser = target;
    if ("vibrate" in navigator) navigator.vibrate([500, 200, 500]);
    window.startInAppCall(type);
};

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
const AGORA_TEMP_TOKEN = "007eJxTYJgX9twsY8q+zU32zHtZzgQ7MSyO7vjWn9v5xkD+/06v888UGCwNjdMMjRPNkiwMDUxSjE2SDIzNLE0Tk1OSDVLMLZPMb/J+yWoIZGSY0+/GwMTACIYgPitDRmpOTj4DVBAkxMJgaGBgCACnyiI0";

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

        window.agoraClient.on("user-published", async (user, mediaType) => {
            await window.agoraClient.subscribe(user, mediaType);
            
            if (mediaType === "video") {
                let newDirectVideo = document.getElementById('direct-remote-video');
                let newDirectPlaceholder = document.getElementById('direct-remote-placeholder');
                let gridVideo = document.getElementById(`remote-video-${targetId}`);
                
                if (newDirectVideo) {
                    newDirectVideo.srcObject = new MediaStream([user.videoTrack.getMediaStreamTrack()]);
                    newDirectVideo.style.display = 'block';
                    newDirectVideo.classList.remove('hidden');
                    newDirectVideo.play().catch(e => console.warn(e));
                    if (newDirectPlaceholder) newDirectPlaceholder.classList.add('hidden');
                } else if (gridVideo) { 
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

        const channelName = "hello"; 
        await window.agoraClient.join(AGORA_APP_ID, channelName, AGORA_TEMP_TOKEN, null);

        let tracksToPublish = [];

        if (!window.localAudioTrack) window.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        tracksToPublish.push(window.localAudioTrack);

        if (isVideo) {
            if (!window.localVideoTrack) {
                window.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
                let newMyVideo = document.getElementById('direct-local-video');
                let newMyPlaceholder = document.getElementById('direct-local-placeholder');
                let myVideo = document.getElementById('my-live-video');
                
                if (newMyVideo) {
                    newMyVideo.srcObject = new MediaStream([window.localVideoTrack.getMediaStreamTrack()]);
                    newMyVideo.classList.remove('hidden');
                    newMyVideo.play().catch(e=>{});
                    if (newMyPlaceholder) newMyPlaceholder.classList.add('hidden');
                } else if (myVideo) {
                    myVideo.srcObject = new MediaStream([window.localVideoTrack.getMediaStreamTrack()]);
                    myVideo.play().catch(e=>{});
                }
            }
            tracksToPublish.push(window.localVideoTrack);
        }

        await window.agoraClient.publish(tracksToPublish);

        if (window.startVoiceAI) window.startVoiceAI();

    } catch (e) {
        console.error("Ошибка Agora: ", e);
        alert("Ошибка подключения! Проверьте консоль.");
        window.hangUpCall();
    }
};

window.endWebRTCCall = async function() {
    if (window.stopVoiceAI) window.stopVoiceAI();

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

    let newDirectVideo = document.getElementById('direct-remote-video');
    let newDirectPlaceholder = document.getElementById('direct-remote-placeholder');
    if (newDirectVideo) {
        newDirectVideo.srcObject = null;
        newDirectVideo.classList.add('hidden');
        if (newDirectPlaceholder) newDirectPlaceholder.classList.remove('hidden');
    }

    let newMyVideo = document.getElementById('direct-local-video');
    let newMyPlaceholder = document.getElementById('direct-local-placeholder');
    if (newMyVideo) {
        newMyVideo.srcObject = null;
        newMyVideo.classList.add('hidden');
        if (newMyPlaceholder) newMyPlaceholder.classList.remove('hidden');
    }

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
    if (window.switchTab) window.switchTab(callType === 'video' ? 1 : 1); 
    
    if(window.showToast) window.showToast("Calling...", `Звоним ${target.name.split(' ')[0]}...`, target.photo, ""); 
    
    window.stopAllRings();
    setTimeout(() => { window.playSafeSound(window.sndCallOut); }, 100);
    
    if (window.callTimeout) clearTimeout(window.callTimeout);
    window.callTimeout = setTimeout(() => {
        
        // ОТПРАВЛЯЕМ СИГНАЛ В НЕЗАВИСИМУЮ БАЗУ УВЕДОМЛЕНИЙ (missedCalls)
        firebase.database().ref('users/' + target.id + '/missedCalls').push({ 
            type: callType, 
            callerId: window.myProfileInfo.id,
            callerName: window.myUsername,
            callerPhoto: window.myProfileInfo.photo,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        callRef.remove(); 
        window.callTimeout = null;
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
        window.currentCallerId = null;
        window.voiceFriend = null;
        if (window.switchTab) window.switchTab(1);
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
        if (window.switchTab) window.switchTab(window.currentIncomingCallType === 'video' ? 1 : 1); 
        
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
    
    let targetIdToCancel = null;
    if (window.currentTargetUser) targetIdToCancel = window.currentTargetUser.id;
    else if (window.voiceFriend) targetIdToCancel = window.voiceFriend.id;
    else if (window.currentCallerId) targetIdToCancel = window.currentCallerId;

    if (targetIdToCancel) {
        firebase.database().ref('signals/' + targetIdToCancel).push({ type: 'reject', callerName: window.myUsername });
        firebase.database().ref('calls/' + window.myProfileInfo.id + '_' + targetIdToCancel).remove();
        firebase.database().ref('calls/' + targetIdToCancel + '_' + window.myProfileInfo.id).remove();
        
        // === ДОБАВЛЕНО: СИГНАЛ ПРОПУЩЕННОГО ВЫЗОВА ДЛЯ УВЕДОМЛЕНИЙ ===
        try {
            let callTypeToSend = (window.myLastOutgoingCallType === 'video' || window.currentIncomingCallType === 'video') ? 'video' : 'voice';
            firebase.database().ref('users/' + targetIdToCancel + '/missedCalls').push({
                callerId: window.myProfileInfo.id,
                callerName: window.myUsername || "User",
                callerPhoto: window.myProfileInfo.photo || "https://ui-avatars.com/api/?name=U",
                type: callTypeToSend,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        } catch (err) {
            console.log("Ошибка отправки пропущенного:", err);
        }
        // === КОНЕЦ ===
    }
    
    if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
    if (window.showToast) window.showToast("Call Ended", "Разговор завершен", "", "");
    
    window.currentCallerId = null;
    window.voiceFriend = null;
    
    if (window.switchTab) window.switchTab(0);
};

    
    if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
    if (window.showToast) window.showToast("Call Ended", "Разговор завершен", "", "");
    
    window.currentCallerId = null;
    window.voiceFriend = null;
    
    if (window.switchTab) window.switchTab(0);
};

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
        else if (sig.type === 'reject') {
            window.stopAllRings();
            const incomingModal = document.getElementById('incoming-call-modal');
            if(incomingModal) incomingModal.classList.remove('active');
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
            if (window.voiceFriend) window.currentTargetUser = window.voiceFriend;
            if (window.switchChatRoom && window.currentTargetUser) window.switchChatRoom(window.currentTargetUser.id);
            
            window.startWebRTC(true, window.currentTargetUser.id, window.myLastOutgoingCallType === 'video');
        }
    }); 
};

let signalInitCheck = setInterval(() => {
    if (window.myProfileInfo && window.myProfileInfo.id && typeof firebase !== 'undefined') {
        window.initSignalListener();
        clearInterval(signalInitCheck);
    }
}, 1000);

window.makeCallFromContact = function(userId, type = 'voice') {
    const target = (window.participants || []).find(p => p.id === userId);
    if (!target) return console.error("Юзер не найден");

    window.currentTargetUser = target;
    if ("vibrate" in navigator) navigator.vibrate([500, 200, 500]);
    window.startInAppCall(type);
};

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

// ==========================================
// УПРАВЛЕНИЕ ЖЕЛЕЗОМ (БЕЗОПАСНО ДЛЯ ПЛАНШЕТОВ И СМАРТФОНОВ)
// ==========================================

window.toggleMyAudio = async function() {
    const icons = document.querySelectorAll('#icon-my-mic');
    if (icons.length === 0) return;
    const isCurrentlyActive = icons[0].classList.contains('fa-microphone');

    try {
        if (window.localAudioTrack) {
            if (isCurrentlyActive) {
                // Мягко, но аппаратно отключаем микрофон (без разрыва связи)
                await window.localAudioTrack.setEnabled(false);
                icons.forEach(icon => {
                    icon.classList.replace('fa-microphone', 'fa-microphone-slash');
                    if(icon.parentElement) icon.parentElement.classList.replace('text-[#00a884]', 'text-red-500');
                });
            } else {
                // Включаем микрофон обратно
                await window.localAudioTrack.setEnabled(true);
                icons.forEach(icon => {
                    icon.classList.replace('fa-microphone-slash', 'fa-microphone');
                    if(icon.parentElement) icon.parentElement.classList.replace('text-red-500', 'text-[#00a884]');
                });
            }
        }
    } catch (e) {
        console.error("Ошибка переключения микрофона:", e);
    }
};

window.toggleMyCamera = async function() {
    const icons = document.querySelectorAll('#icon-my-cam');
    if (icons.length === 0) return;
    const isCurrentlyActive = icons[0].classList.contains('fa-video');

    try {
        if (window.localVideoTrack) {
            if (isCurrentlyActive) {
                // Аппаратное отключение камеры (индикатор на устройстве погаснет)
                await window.localVideoTrack.setEnabled(false);
                icons.forEach(icon => {
                    icon.classList.replace('fa-video', 'fa-video-slash');
                    if(icon.parentElement) icon.parentElement.classList.replace('text-[#00a884]', 'text-red-500');
                });
            } else {
                // Включаем камеру обратно
                await window.localVideoTrack.setEnabled(true);
                icons.forEach(icon => {
                    icon.classList.replace('fa-video-slash', 'fa-video');
                    if(icon.parentElement) icon.parentElement.classList.replace('text-red-500', 'text-[#00a884]');
                });
            }
        }
    } catch (e) {
        console.error("Ошибка переключения камеры:", e);
    }
};

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

// Твои правильные ключи Agora
const AGORA_APP_ID = "913f13a6b8104d34b03695acdc0d79b7"; 
const AGORA_TEMP_TOKEN = "007eJxTYKjifd8YnWvFe6ucW+Tkx8PrtTv95kkfP/NuqofsrMce0h8UGCwNjdMMjRPNkiwMDUxSjE2SDIzNLE0Tk1OSDVLMLZPMZ7p/zGoIZGRI5rRgZmJgBEMQn5UhIzUnJ5+BgQlJyNDI2MQUAGTYIPA=";






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

        // Прием потока от собеседника (один-на-один)
        window.agoraClient.on("user-published", async (user, mediaType) => {
            await window.agoraClient.subscribe(user, mediaType);
            
            if (mediaType === "video") {
                // Ищем новые фреймы из комнаты 1-на-1
                let newDirectVideo = document.getElementById('direct-remote-video');
                let newDirectPlaceholder = document.getElementById('direct-remote-placeholder');
                
                // Ищем старый фрейм (на всякий случай, как запасной вариант)
                let gridVideo = document.getElementById(`remote-video-${targetId}`);
                
                if (newDirectVideo) {
                    newDirectVideo.srcObject = new MediaStream([user.videoTrack.getMediaStreamTrack()]);
                    newDirectVideo.style.display = 'block';
                    newDirectVideo.classList.remove('hidden');
                    newDirectVideo.play().catch(e => console.warn(e));
                    
                    // Прячем иконку "Waiting for video..."
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

        // Название комнаты жестко привязано к токену
        const channelName = "hello"; 
        
        await window.agoraClient.join(AGORA_APP_ID, channelName, AGORA_TEMP_TOKEN, null);
        

        let tracksToPublish = [];

        if (!window.localAudioTrack) window.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        tracksToPublish.push(window.localAudioTrack);

        if (isVideo) {
            if (!window.localVideoTrack) {
                window.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
                
                // Мое видео в новой комнате 1-на-1
                let newMyVideo = document.getElementById('direct-local-video');
                let newMyPlaceholder = document.getElementById('direct-local-placeholder');
                
                let myVideo = document.getElementById('my-live-video');
                
                if (newMyVideo) {
                    newMyVideo.srcObject = new MediaStream([window.localVideoTrack.getMediaStreamTrack()]);
                    newMyVideo.classList.remove('hidden');
                    newMyVideo.play().catch(e=>{});
                    
                    // Прячем иконку "My Camera"
                    if (newMyPlaceholder) newMyPlaceholder.classList.add('hidden');
                } else if (myVideo) {
                    myVideo.srcObject = new MediaStream([window.localVideoTrack.getMediaStreamTrack()]);
                    myVideo.play().catch(e=>{});
                }
            }
            tracksToPublish.push(window.localVideoTrack);
        }

                await window.agoraClient.publish(tracksToPublish);

        // === ЗАПУСК УМНОГО МИКРОФОНА ===
        if (window.startVoiceAI) window.startVoiceAI();

    } catch (e) {
        console.error("Ошибка Agora: ", e);
        alert("Ошибка подключения! Проверьте консоль.");
        window.hangUpCall();
    }
};

window.endWebRTCCall = async function() {
    // === ОСТАНОВКА УМНОГО МИКРОФОНА ===
    if (window.stopVoiceAI) window.stopVoiceAI();

    if (window.localAudioTrack) { window.localAudioTrack.close(); window.localAudioTrack = null; }
    if (window.localVideoTrack) { window.localVideoTrack.close(); window.localVideoTrack = null; }
    if (window.agoraClient) {
        try { await window.agoraClient.leave(); } catch (e) {}
        window.agoraClient = null;
    }
    
    
    // 1. Очищаем старые фреймы
    document.querySelectorAll('[id^="remote-video-"]').forEach(v => {
        v.srcObject = null;
        v.classList.add('hidden');
        v.style.display = 'none';
    });

    // 2. Очищаем НОВЫЕ фреймы (прячем видео, возвращаем заглушки)
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
    //if (callType === 'video' && window.initConference) window.initConference();
    
    if(window.showToast) window.showToast("Calling...", `Звоним ${target.name.split(' ')[0]}...`, target.photo, ""); 
    
    window.stopAllRings();
    setTimeout(() => { window.playSafeSound(window.sndCallOut); }, 100);
    
    
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
    
    // БОРЬБА С ПРИЗРАКАМИ: Отправляем отбой тому, кому звонили (или кто звонил нам)
    let targetIdToCancel = null;
    if (window.currentTargetUser) targetIdToCancel = window.currentTargetUser.id;
    else if (window.voiceFriend) targetIdToCancel = window.voiceFriend.id;
    else if (window.currentCallerId) targetIdToCancel = window.currentCallerId;

    if (targetIdToCancel) {
        // 1. Посылаем сигнал отмены
        firebase.database().ref('signals/' + targetIdToCancel).push({ type: 'reject', callerName: window.myUsername });
        // 2. Стираем сам факт звонка, если он еще висит
        firebase.database().ref('calls/' + window.myProfileInfo.id + '_' + targetIdToCancel).remove();
        firebase.database().ref('calls/' + targetIdToCancel + '_' + window.myProfileInfo.id).remove();
    }
    
    if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
    if (window.showToast) window.showToast("Call Ended", "Разговор завершен", "", "");
    
    // Очищаем переменные
    window.currentCallerId = null;
    window.voiceFriend = null;
    
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
            
            // ВОТ ЭТА СТРОКА УБИРАЕТ ЗАВИСШИЙ ЭКРАН ВЫЗОВА:
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
            window.startWebRTC(true, window.currentTargetUser.id, window.myLastOutgoingCallType === 'video');
        }
        else if (sig.type === 'missed') {
            window.stopAllRings();
            const incomingModal = document.getElementById('incoming-call-modal');
            if(incomingModal) incomingModal.classList.remove('active');
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

// ==========================================
// УПРАВЛЕНИЕ КНОПКАМИ ФУТЕРА (Микрофон / Камера AGORA)
// ==========================================

window.toggleMyAudio = async function() {
    const icon = document.getElementById('icon-my-mic');
    const btn = icon.parentElement;
    
    // Защита от спама кликами
    if (btn.style.pointerEvents === 'none') return;
    btn.style.pointerEvents = 'none'; 

    try {
        if (icon.classList.contains('fa-microphone')) {
            // Мягкое отключение микрофона
            if (window.localAudioTrack) {
                await window.localAudioTrack.setMuted(true);
            }
            icon.classList.replace('fa-microphone', 'fa-microphone-slash');
            btn.classList.replace('text-[#00a884]', 'text-red-500');
        } else {
            // Включение микрофона
            if (window.localAudioTrack) {
                await window.localAudioTrack.setMuted(false);
            }
            icon.classList.replace('fa-microphone-slash', 'fa-microphone');
            btn.classList.replace('text-red-500', 'text-[#00a884]');
        }
    } catch (e) {
        console.error("Ошибка переключения микрофона:", e);
    } finally {
        btn.style.pointerEvents = 'auto'; // Разблокируем кнопку
    }
};

window.toggleMyCamera = async function() {
    const icon = document.getElementById('icon-my-cam');
    const btn = icon.parentElement;

    // Защита от двойного клика, чтобы не ломать видеопоток
    if (btn.style.pointerEvents === 'none') return;
    btn.style.pointerEvents = 'none';

    try {
        if (icon.classList.contains('fa-video')) {
            // Мягкое отключение видео (черный экран)
            if (window.localVideoTrack) {
                await window.localVideoTrack.setMuted(true);
            }
            icon.classList.replace('fa-video', 'fa-video-slash');
            btn.classList.replace('text-[#00a884]', 'text-red-500');
        } else {
            // Возврат видео
            if (window.localVideoTrack) {
                await window.localVideoTrack.setMuted(false);
            }
            icon.classList.replace('fa-video-slash', 'fa-video');
            btn.classList.replace('text-red-500', 'text-[#00a884]');
        }
    } catch (e) {
        console.error("Ошибка переключения камеры:", e);
    } finally {
        btn.style.pointerEvents = 'auto'; // Разблокируем кнопку
    }
};

window.toggleRemoteAudio = function() {
    const icon = document.getElementById('icon-remote-mic');
    if (icon.classList.contains('fa-microphone')) {
        icon.classList.replace('fa-microphone', 'fa-microphone-slash');
        icon.parentElement.classList.replace('text-[#00a884]', 'text-red-500');
        
        document.querySelectorAll('audio').forEach(audio => audio.muted = true);
    } else {
        icon.classList.replace('fa-microphone-slash', 'fa-microphone');
        icon.parentElement.classList.replace('text-red-500', 'text-[#00a884]');
        
        document.querySelectorAll('audio').forEach(audio => audio.muted = false);
    }
};

window.toggleRemoteCamera = function() {
    const icon = document.getElementById('icon-remote-cam');
    if (icon.classList.contains('fa-video')) {
        icon.classList.replace('fa-video', 'fa-video-slash');
        icon.parentElement.classList.replace('text-[#00a884]', 'text-red-500');
        
        const remoteVideo = document.getElementById('remote-player'); 
        if (remoteVideo) remoteVideo.style.opacity = '0';
    } else {
        icon.classList.replace('fa-video-slash', 'fa-video');
        icon.parentElement.classList.replace('text-red-500', 'text-[#00a884]');
        
        const remoteVideo = document.getElementById('remote-player');
        if (remoteVideo) remoteVideo.style.opacity = '1';
    }
};

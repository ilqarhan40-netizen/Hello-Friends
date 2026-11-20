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
window._isStartingAgora = false;

// Ключи Agora (временный токен для канала "hello")
window.CALLS_AGORA_APP_ID = "913f13a6b8104d34b03695acdc0d79b7";
window.CALLS_AGORA_TEMP_TOKEN = "007eJxTYCg0Ond/XWhQ980vqXsnHA6N1+C4d0rXsOCZQJu5tmLPIiEFBktD4zRD40SzJAtDA5MUY5MkA2MzS9PE5JRkgxRzyyTz24n/shoCGRkufPNgYWJgBEMQn5UhIzUnJ5+BgQkuxMJgaGBgCAB79SHp";
window.CALLS_AGORA_CHANNEL = "hello";

window.currentCallerId = null;
window.currentCallerFallback = null;
window.currentIncomingSignalKey = null;
window.currentIncomingCallType = 'voice';
window.myLastOutgoingCallType = 'voice';
window.currentActiveCallType = 'voice';

window.activeOutgoingCallTargetId = null;
window.activeOutgoingCallRef = null;
window.activeOutgoingCallType = 'voice';
window.callWasAnswered = false;

window.isMyMicMuted = false;
window.isMyCamMuted = false;
window._isTogglingAudio = false;
window._isTogglingCam = false;

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
        playPromise.catch(() => {});
    }
    if (vibratePattern && "vibrate" in navigator) {
        try { navigator.vibrate(vibratePattern); } catch(e){}
    }
};

window.stopAllRings = function() {
    if (window.sndRing) { window.sndRing.pause(); window.sndRing.currentTime = 0; }
    if (window.sndCallOut) { window.sndCallOut.pause(); window.sndCallOut.currentTime = 0; }
    if ("vibrate" in navigator) { try { navigator.vibrate(0); } catch(e){} }
};

document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', function unlockAudio() {
        const allSounds = [window.sndMsg, window.sndCash, window.sndEmail, window.sndMissed, window.sndRing, window.sndCallOut];
        allSounds.forEach(snd => { snd.play().then(() => snd.pause()).catch(() => {}); });
        document.body.removeEventListener('click', unlockAudio);
    }, { once: true });
});

// --- UI ИКОНОК МИКРОФОНА И КАМЕРЫ ---
window.updateMicToggleUI = function(isMuted) {
    window.isMyMicMuted = Boolean(isMuted);
    document.querySelectorAll('#icon-my-mic').forEach(i => {
        i.classList.remove('fa-microphone', 'fa-microphone-slash');
        i.classList.add(isMuted ? 'fa-microphone-slash' : 'fa-microphone');
        if (i.parentElement) {
            i.parentElement.classList.remove('text-[#00a884]', 'text-red-500');
            i.parentElement.classList.add(isMuted ? 'text-red-500' : 'text-[#00a884]');
        }
    });
};

window.updateCamToggleUI = function(isMuted) {
    window.isMyCamMuted = Boolean(isMuted);
    document.querySelectorAll('#icon-my-cam').forEach(i => {
        i.classList.remove('fa-video', 'fa-video-slash');
        i.classList.add(isMuted ? 'fa-video-slash' : 'fa-video');
        if (i.parentElement) {
            i.parentElement.classList.remove('text-[#00a884]', 'text-red-500');
            i.parentElement.classList.add(isMuted ? 'text-red-500' : 'text-[#00a884]');
        }
    });
};

window.hideDirectVideoElements = function() {
    const directRemote = document.getElementById('direct-remote-video');
    if (directRemote) {
        directRemote.srcObject = null;
        directRemote.classList.add('hidden');
        directRemote.style.display = 'none';
    }
    const directLocal = document.getElementById('direct-local-video');
    if (directLocal) {
        directLocal.srcObject = null;
        directLocal.classList.add('hidden');
        directLocal.style.display = 'none';
    }
};

// --- 1. ФУНКЦИИ AGORA (ВИДЕО И АУДИО) ---
window.startWebRTC = async function(isCaller, targetId, isVideo = false) {
    if (window._isStartingAgora) return;
    if (typeof AgoraRTC === 'undefined') {
        alert("Модуль связи загружается, подождите секунду...");
        return;
    }

    const allowVideo = Boolean(isVideo);
    window.currentActiveCallType = allowVideo ? 'video' : 'voice';

    window._isStartingAgora = true;
    window.updateMicToggleUI(false);
    window.updateCamToggleUI(!allowVideo);

    // В аудиозвонке гарантированно закрываем камеру и прячем видео-блоки
    if (!allowVideo) {
        if (window.localVideoTrack) {
            try { window.localVideoTrack.close(); } catch (e) {}
            window.localVideoTrack = null;
        }
        window.hideDirectVideoElements();
    }

    try {
        if (window.agoraClient) {
            try { await window.agoraClient.leave(); } catch (e) {}
            window.agoraClient = null;
        }

        window.agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

        window.agoraClient.on("user-published", async (user, mediaType) => {
            await window.agoraClient.subscribe(user, mediaType);

            if (mediaType === "video") {
                if (!allowVideo && window.currentIndex === 1) return;
                let gridVideo =
                    document.getElementById('direct-remote-video') ||
                    document.getElementById(`remote-video-${targetId}`);
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

        const channelName = window.CALLS_AGORA_CHANNEL;
        const uid = (window.myProfileInfo && window.myProfileInfo.id) ? window.myProfileInfo.id : null;

        await window.agoraClient.join(
            window.CALLS_AGORA_APP_ID,
            channelName,
            window.CALLS_AGORA_TEMP_TOKEN,
            uid
        );

        let tracksToPublish = [];

        if (!window.localAudioTrack) {
            window.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
                AEC: true,
                ANS: true,
                AGC: true
            });
        }
        tracksToPublish.push(window.localAudioTrack);

        if (allowVideo) {
            try {
                if (!window.localVideoTrack) {
                    window.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
                    let myVideo =
                        document.getElementById('direct-local-video') ||
                        document.getElementById('my-live-video');
                    if (myVideo) {
                        myVideo.srcObject = new MediaStream([window.localVideoTrack.getMediaStreamTrack()]);
                        myVideo.style.display = 'block';
                        myVideo.classList.remove('hidden');
                        myVideo.play().catch(() => {});
                    }
                }
                tracksToPublish.push(window.localVideoTrack);
            } catch (camErr) {
                console.warn("Камера недоступна, оставляем аудио:", camErr);
                window.updateCamToggleUI(true);
            }
        }

        if (tracksToPublish.length > 0) {
            await window.agoraClient.publish(tracksToPublish);
        }

        if (!allowVideo && typeof window.startVoiceAI === 'function') {
            window.startVoiceAI();
        }

    } catch (e) {
        console.error("Ошибка Agora:", e);
        alert("Ошибка подключения звонка: " + (e.message || e));
    } finally {
        window._isStartingAgora = false;
    }
};

window.endWebRTCCall = async function() {
    if (typeof window.stopVoiceAI === 'function') {
        window.stopVoiceAI();
    }

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

    window.hideDirectVideoElements();

    const myVideo = document.getElementById('my-live-video');
    if (myVideo) {
        myVideo.srcObject = null;
        myVideo.src = window.myProfileInfo?.video || 'https://assets.mixkit.co/videos/preview/mixkit-young-man-having-a-video-call-with-his-friends-41212-large.mp4';
    }

    const camBtn = document.getElementById('conf-cam-btn');
    if (camBtn) {
        camBtn.classList.replace('bg-red-500', 'bg-[#202c33]');
        const icon = camBtn.querySelector('i');
        if (icon) icon.className = 'fa-solid fa-video-slash text-[#8696a0]';
    }

    window.updateMicToggleUI(false);
    window.updateCamToggleUI(true);

    window.currentCallerId = null;
    window.currentCallerFallback = null;
    window.currentTargetUser = null;
    window.currentActiveCallType = 'voice';
    window.myLastOutgoingCallType = 'voice';
    window.currentIncomingCallType = 'voice';
    window.activeOutgoingCallTargetId = null;
    window.activeOutgoingCallRef = null;
    window.callWasAnswered = false;
};

// --- 2. ЛОГИКА ЗВОНКОВ (АУДИО И ВИДЕО) ---
window.openPhoneChoiceModal = function() {
    if (window.closeDropdown) window.closeDropdown();
    const modal = document.getElementById('phone-choice-modal');
    if (modal) modal.classList.add('active');
};

window.closePhoneChoiceModal = function() {
    const modal = document.getElementById('phone-choice-modal');
    if (modal) modal.classList.remove('active');
};

window.startInAppCall = function(callType = 'voice') {
    if (!window.currentTargetUser) {
        alert("Выберите контакт для звонка!");
        window.closePhoneChoiceModal();
        return;
    }
    const target = window.currentTargetUser;
    const normalizedType = (callType === 'video') ? 'video' : 'voice';
    window.closePhoneChoiceModal();

    window.myLastOutgoingCallType = normalizedType;
    window.currentActiveCallType = normalizedType;
    window.activeOutgoingCallTargetId = target.id;
    window.activeOutgoingCallType = normalizedType;
    window.callWasAnswered = false;

    if (normalizedType !== 'video') {
        window.hideDirectVideoElements();
        window.updateCamToggleUI(true);
    }

    firebase.database().ref('calls/' + window.myProfileInfo.id + '_' + target.id).remove();

    let callRef = firebase.database().ref('signals/' + target.id).push();
    window.activeOutgoingCallRef = callRef;
    callRef.set({
        type: 'call',
        callType: normalizedType,
        callerId: window.myProfileInfo.id,
        callerName: window.myUsername,
        callerPhoto: window.myProfileInfo.photo,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    let pushTitle = normalizedType === 'video' ? "📹 Входящий видеозвонок" : "📞 Входящий аудиозвонок";
    if (window.sendPushNotification) {
        window.sendPushNotification(
            target.id,
            { type: 'call', callerName: window.myUsername, callType: normalizedType },
            pushTitle,
            `${window.myUsername} звонит вам!`
        );
    }

    const photoEl = document.getElementById('voice-friend-photo');
    const flagEl = document.getElementById('voice-friend-flag');
    const nameEl = document.getElementById('voice-friend-name');
    if (photoEl) photoEl.src = target.photo;
    if (flagEl) flagEl.innerText = target.flag || '🌐';
    if (nameEl) nameEl.innerText = (target.name || 'User').split(' ')[0];

    window.voiceFriend = target;
    if (window.switchTab) window.switchTab(1);

    if (window.showToast) window.showToast("Calling...", `Звоним ${(target.name || 'User').split(' ')[0]}...`, target.photo, "");

    window.stopAllRings();
    setTimeout(() => { window.playSafeSound(window.sndCallOut); }, 100);

    if (window.callTimeout) clearTimeout(window.callTimeout);
    window.callTimeout = setTimeout(() => {
        if (window.callWasAnswered) return;

        firebase.database().ref('signals/' + target.id).push({
            type: 'missed',
            callType: normalizedType,
            callerName: window.myUsername,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        // Отдельный баннер пропущенного аудио или видео вызова
        if (normalizedType === 'video') {
            window.sendMissedVideoNotice(target.id);
        } else {
            window.sendMissedAudioNotice(target.id);
        }

        callRef.remove();
        window.callTimeout = null;
        window.activeOutgoingCallTargetId = null;
        window.activeOutgoingCallRef = null;
        window.stopAllRings();
        window.playSafeSound(window.sndMissed, [200, 100, 200]);
        if (window.showToast) window.showToast("Нет ответа", "Абонент недоступен", "", "");

        let missedTitle = normalizedType === 'video' ? "📵 Пропущенный видеозвонок" : "📵 Пропущенный вызов";
        if (window.sendPushNotification) {
            window.sendPushNotification(
                target.id,
                { type: 'missed', callType: normalizedType, callerName: window.myUsername },
                missedTitle,
                `Вы пропустили вызов от ${window.myUsername}`
            );
        }
        window.currentCallerId = null;
        window.voiceFriend = null;
    }, 30000);
};

window.showIncomingCall = function(callerId, callerName, callerPhoto, signalKey, callType) {
    window.currentIncomingSignalKey = signalKey;
    window.currentCallerId = callerId;
    window.callWasAnswered = false;
    window.currentCallerFallback = {
        id: callerId,
        name: callerName || 'User',
        photo: callerPhoto || 'https://ui-avatars.com/api/?name=U',
        flag: '🌐'
    };
    window.currentIncomingCallType = (callType === 'video') ? 'video' : 'voice';
    window.currentActiveCallType = window.currentIncomingCallType;

    const nameEl = document.getElementById('incoming-call-name');
    const photoEl = document.getElementById('incoming-call-photo');
    const typeLabel = document.getElementById('incoming-call-type');

    if (nameEl) nameEl.innerText = callerName || 'User';
    if (photoEl) photoEl.src = callerPhoto || 'https://ui-avatars.com/api/?name=U';
    if (typeLabel) typeLabel.innerText = window.currentIncomingCallType === 'video' ? '📹 Входящий видеозвонок' : '📞 Входящий аудиозвонок';

    const modal = document.getElementById('incoming-call-modal');
    if (modal) modal.classList.add('active');

    window.stopAllRings();
    window.playSafeSound(window.sndRing, [1000, 500, 1000, 500, 1000, 500, 1000]);
};

window.acceptCall = function() {
    window.stopAllRings();
    window.callWasAnswered = true;

    const modal = document.getElementById('incoming-call-modal');
    if (modal) modal.classList.remove('active');

    const incomingIsVideo = (window.currentIncomingCallType === 'video');
    window.currentActiveCallType = incomingIsVideo ? 'video' : 'voice';

    if (!incomingIsVideo) {
        window.hideDirectVideoElements();
        window.updateCamToggleUI(true);
    }

    if (window.currentCallerId) {
        firebase.database().ref('signals/' + window.currentCallerId).push({
            type: 'answered',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    }
    if (window.currentIncomingSignalKey && window.myProfileInfo) {
        firebase.database().ref('signals/' + window.myProfileInfo.id + '/' + window.currentIncomingSignalKey).remove();
    }

    let target =
        (window.participants || []).find(p => String(p.id) === String(window.currentCallerId)) ||
        window.currentCallerFallback;

    if (target) {
        window.currentTargetUser = { ...target };
        const pEl = document.getElementById('voice-friend-photo');
        const fEl = document.getElementById('voice-friend-flag');
        const nEl = document.getElementById('voice-friend-name');
        if (pEl) pEl.src = target.photo;
        if (fEl) fEl.innerText = target.flag || '🌐';
        if (nEl) nEl.innerText = (target.name || 'User').split(' ')[0];

        window.voiceFriend = target;
        if (window.switchChatRoom) window.switchChatRoom(target.id);
        if (window.switchTab) window.switchTab(1);

        window.startWebRTC(false, window.currentCallerId, incomingIsVideo);
    }
};

window.declineCall = function() {
    window.stopAllRings();
    const modal = document.getElementById('incoming-call-modal');
    if (modal) modal.classList.remove('active');

    if (window.currentCallerId) {
        firebase.database().ref('signals/' + window.currentCallerId).push({
            type: 'reject',
            callerName: window.myUsername,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    }
    if (window.currentIncomingSignalKey && window.myProfileInfo) {
        firebase.database().ref('signals/' + window.myProfileInfo.id + '/' + window.currentIncomingSignalKey).remove();
    }
    window.endWebRTCCall();
};

window.hangUpCall = function() {
    window.stopAllRings();

    // Фиксируем до сброса состояния: сбросил ли звонящий трубку до ответа
    const unansweredTargetId = (!window.callWasAnswered && window.activeOutgoingCallTargetId)
        ? window.activeOutgoingCallTargetId
        : null;
    const unansweredType = window.activeOutgoingCallType || 'voice';
    const outgoingRef = window.activeOutgoingCallRef;

    let targetIdToCancel = null;
    if (window.voiceFriend) targetIdToCancel = window.voiceFriend.id;
    else if (window.currentCallerId) targetIdToCancel = window.currentCallerId;
    else if (window.currentTargetUser) targetIdToCancel = window.currentTargetUser.id;
    else if (unansweredTargetId) targetIdToCancel = unansweredTargetId;

    if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
    if (outgoingRef) { try { outgoingRef.remove(); } catch (e) {} }

    // Если звонящий сбросил ДО ответа — отправляем отдельный пропущенный вызов (аудио или видео)
    if (unansweredTargetId) {
        if (unansweredType === 'video') {
            window.sendMissedVideoNotice(unansweredTargetId);
        } else {
            window.sendMissedAudioNotice(unansweredTargetId);
        }
    }

    window.endWebRTCCall();

    if (targetIdToCancel && window.myProfileInfo) {
        firebase.database().ref('signals/' + targetIdToCancel).push({
            type: unansweredTargetId ? 'missed' : 'reject',
            callType: unansweredType,
            callerName: window.myUsername,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        firebase.database().ref('calls/' + window.myProfileInfo.id + '_' + targetIdToCancel).remove();
        firebase.database().ref('calls/' + targetIdToCancel + '_' + window.myProfileInfo.id).remove();
    }

    if (window.showToast) window.showToast("Call Ended", "Разговор завершен", "", "");

    window.currentCallerId = null;
    window.voiceFriend = null;

    if (window.switchTab) window.switchTab(0);
};

window.initSignalListener = function() {
    if (!window.myProfileInfo || !window.myProfileInfo.id || window.isGuest) return;
    if (window.isSignalListenerActive) return;
    window.isSignalListenerActive = true;

    const mySignalPath = 'signals/' + window.myProfileInfo.id;

    firebase.database().ref(mySignalPath).on('child_added', (snap) => {
        const sig = snap.val();
        if (!sig) return;

        const age = sig.timestamp ? (Date.now() - sig.timestamp) : 0;

        if (sig.type === 'call') {
            if (age < 30000) {
                window.showIncomingCall(sig.callerId, sig.callerName, sig.callerPhoto, snap.key, sig.callType);
            } else {
                firebase.database().ref(mySignalPath + '/' + snap.key).remove();
            }
        }
        else if (sig.type === 'reject') {
            firebase.database().ref(mySignalPath + '/' + snap.key).remove();
            if (age > 15000) return;

            window.activeOutgoingCallTargetId = null;
            window.activeOutgoingCallRef = null;
            window.stopAllRings();
            const incomingModal = document.getElementById('incoming-call-modal');
            if (incomingModal) incomingModal.classList.remove('active');
            window.playSafeSound(window.sndMissed, [200, 100, 200]);
            if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
            window.endWebRTCCall();
            if (window.switchTab) window.switchTab(0);
        }
        else if (sig.type === 'answered') {
            firebase.database().ref(mySignalPath + '/' + snap.key).remove();
            if (age > 15000) return;

            window.callWasAnswered = true;
            window.activeOutgoingCallTargetId = null;
            window.activeOutgoingCallRef = null;
            window.stopAllRings();
            if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
            if (window.voiceFriend) window.currentTargetUser = window.voiceFriend;
            const targetId = window.currentTargetUser ? window.currentTargetUser.id : 'remote';
            window.startWebRTC(true, targetId, window.myLastOutgoingCallType === 'video');
        }
        else if (sig.type === 'missed') {
            firebase.database().ref(mySignalPath + '/' + snap.key).remove();
            if (age > 15000) return;

            window.stopAllRings();
            const incomingModal = document.getElementById('incoming-call-modal');
            if (incomingModal) incomingModal.classList.remove('active');
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
    const target = (window.participants || []).find(p => String(p.id) === String(userId));
    if (!target) return console.error("Юзер не найден");

    window.currentTargetUser = { ...target };
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
                return originalSend();
            };
        }
    }, 2000);
});

// ==========================================
// 3. СТАБИЛЬНЫЙ РУБИЛЬНИК МИКРОФОНА И КАМЕРЫ
// ==========================================

window.toggleMyAudio = async function() {
    if (window._isTogglingAudio) return;
    window._isTogglingAudio = true;

    const nextMuted = !window.isMyMicMuted;
    try {
        if (window.localAudioTrack) {
            await window.localAudioTrack.setMuted(nextMuted);
        }
        if (nextMuted) {
            if (typeof window.stopVoiceAI === 'function') window.stopVoiceAI();
        } else if (window.agoraClient && window.currentActiveCallType !== 'video') {
            if (typeof window.startVoiceAI === 'function') window.startVoiceAI();
        }
        window.updateMicToggleUI(nextMuted);
    } catch (error) {
        console.error("Audio toggle error:", error);
    } finally {
        window._isTogglingAudio = false;
    }
};

window.toggleMyCamera = async function() {
    if (window._isTogglingCam) return;

    // Запрещаем включать камеру во время аудиозвонка на вкладке 1
    if (window.currentIndex === 1 && window.currentActiveCallType !== 'video') {
        window.updateCamToggleUI(true);
        return;
    }

    window._isTogglingCam = true;

    const nextMuted = !window.isMyCamMuted;
    try {
        if (!nextMuted && !window.localVideoTrack && window.agoraClient && typeof AgoraRTC !== 'undefined') {
            window.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
            await window.agoraClient.publish([window.localVideoTrack]);

            let myVideo =
                document.getElementById('direct-local-video') ||
                document.getElementById('my-live-video');
            if (myVideo) {
                myVideo.srcObject = new MediaStream([window.localVideoTrack.getMediaStreamTrack()]);
                myVideo.style.display = 'block';
                myVideo.classList.remove('hidden');
                myVideo.play().catch(() => {});
            }
            window.updateCamToggleUI(false);
            return;
        }

        if (window.localVideoTrack) {
            await window.localVideoTrack.setMuted(nextMuted);
            let myVideo =
                document.getElementById('direct-local-video') ||
                document.getElementById('my-live-video');
            if (myVideo) {
                if (nextMuted) {
                    myVideo.classList.add('hidden');
                    myVideo.style.display = 'none';
                } else {
                    myVideo.style.display = 'block';
                    myVideo.classList.remove('hidden');
                    myVideo.play().catch(() => {});
                }
            }
        }

        window.updateCamToggleUI(nextMuted);
    } catch (error) {
        console.error("Camera toggle error:", error);
    } finally {
        window._isTogglingCam = false;
    }
};

// ==========================================
// 4. ОТДЕЛЬНЫЕ ВЕРХНИЕ БАННЕРЫ ПРОПУЩЕННЫХ ВЫЗОВОВ (АУДИО И ВИДЕО)
// ==========================================

window.getCallsBannerI18n = function() {
    const raw = (typeof window.getSmartLang === 'function' && window.myProfileInfo)
        ? window.getSmartLang(window.myProfileInfo)
        : 'en';
    const base = String(raw || 'en').toLowerCase().split(/[-_]/)[0].substring(0, 2);
    const fix = { kz: 'kk', cn: 'zh', jp: 'ja', ae: 'ar', gb: 'en', us: 'en' };
    const code = fix[base] || base;
    if (window.i18n) {
        return window.i18n[code] || window.i18n['en'] || {};
    }
    return {};
};

window._escapeCallsHtml = function(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};

window._getCallsBannerStack = function() {
    let stack = document.getElementById('hf-top-banner-stack');
    if (!stack) {
        stack = document.createElement('div');
        stack.id = 'hf-top-banner-stack';
        stack.className = 'fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-sm flex flex-col gap-2.5 pointer-events-none';
        document.body.appendChild(stack);
    }
    return stack;
};

// --- БАННЕР 1: ПРОПУЩЕННЫЙ АУДИОВЫЗОВ ---
window.sendMissedAudioNotice = function(targetUserId) {
    if (!targetUserId || !window.myProfileInfo || !window.myProfileInfo.id) return;
    firebase.database().ref('missed_audio/' + targetUserId).push({
        fromId: String(window.myProfileInfo.id),
        fromName: window.myUsername || window.myProfileInfo.name || 'User',
        fromPhoto: window.myProfileInfo.photo || 'https://ui-avatars.com/api/?name=U',
        fromFlag: window.myProfileInfo.flag || '🌐',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
};

window.showMissedAudioBanner = function(dbKey, data) {
    if (!data) return;
    const d = window.getCallsBannerI18n();
    const stack = window._getCallsBannerStack();

    let el = document.getElementById('hf-banner-missed-audio');
    if (!el) {
        el = document.createElement('div');
        el.id = 'hf-banner-missed-audio';
        el.className = 'pointer-events-auto bg-[#111b21]/95 backdrop-blur-md border border-[#00a884] rounded-2xl shadow-[0_0_24px_rgba(0,168,132,0.35)] p-3.5 flex flex-col gap-3';
        stack.appendChild(el);
    }

    const name = window._escapeCallsHtml((data.fromName || 'User').split(' ')[0]);
    const flag = window._escapeCallsHtml(data.fromFlag || '🌐');
    const photo = window._escapeCallsHtml(data.fromPhoto || 'https://ui-avatars.com/api/?name=U');

    window._activeMissedAudioData = { dbKey: dbKey || null, ...data };

    el.innerHTML = `
        <div class="flex items-center gap-3">
            <img src="${photo}" class="w-11 h-11 rounded-full object-cover border-2 border-[#00a884] shrink-0">
            <div class="flex flex-col overflow-hidden">
                <span class="text-[#00a884] text-[0.7rem] font-bold uppercase tracking-wider">${d.missed_audio_title || 'MISSED AUDIO CALL'}</span>
                <span class="text-white text-sm font-bold leading-snug truncate">${flag} ${d.missed_audio_text || 'Missed audio call from'} ${name}</span>
            </div>
        </div>
        <div class="flex gap-2.5 w-full">
            <button onclick="window.closeMissedAudioBanner()" class="flex-1 py-2.5 rounded-xl bg-[#2a3942] hover:bg-[#374a56] text-[#e9edef] text-xs font-bold transition">${d.btn_later || 'Later'}</button>
            <button onclick="window.callbackMissedAudio()" class="flex-1 py-2.5 rounded-xl bg-[#00a884] hover:bg-[#00c49a] text-[#111b21] text-xs font-bold transition flex items-center justify-center"><i class="fa-solid fa-phone mr-1.5"></i>${d.btn_callback || 'Call back'}</button>
        </div>
    `;

    window.playSafeSound(window.sndMissed, [200, 100, 200]);
};

window.closeMissedAudioBanner = function() {
    const active = window._activeMissedAudioData;
    const myId = window.myProfileInfo?.id;
    if (active && active.dbKey && myId && typeof firebase !== 'undefined') {
        firebase.database().ref('missed_audio/' + myId + '/' + active.dbKey).remove().catch(() => {});
    }
    document.getElementById('hf-banner-missed-audio')?.remove();
    window._activeMissedAudioData = null;
};

window.callbackMissedAudio = function() {
    const info = window._activeMissedAudioData;
    window.closeMissedAudioBanner();
    if (!info || !info.fromId) return;

    const target = (window.participants || []).find(p => String(p.id) === String(info.fromId)) || {
        id: info.fromId,
        name: info.fromName || 'User',
        photo: info.fromPhoto || 'https://ui-avatars.com/api/?name=U',
        flag: info.fromFlag || '🌐'
    };
    window.currentTargetUser = { ...target };
    if (typeof window.switchChatRoom === 'function') window.switchChatRoom(target.id);
    setTimeout(() => window.startInAppCall('voice'), 150);
};

// --- БАННЕР 2: ПРОПУЩЕННЫЙ ВИДЕОВЫЗОВ ---
window.sendMissedVideoNotice = function(targetUserId) {
    if (!targetUserId || !window.myProfileInfo || !window.myProfileInfo.id) return;
    firebase.database().ref('missed_video/' + targetUserId).push({
        fromId: String(window.myProfileInfo.id),
        fromName: window.myUsername || window.myProfileInfo.name || 'User',
        fromPhoto: window.myProfileInfo.photo || 'https://ui-avatars.com/api/?name=U',
        fromFlag: window.myProfileInfo.flag || '🌐',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
};

window.showMissedVideoBanner = function(dbKey, data) {
    if (!data) return;
    const d = window.getCallsBannerI18n();
    const stack = window._getCallsBannerStack();

    let el = document.getElementById('hf-banner-missed-video');
    if (!el) {
        el = document.createElement('div');
        el.id = 'hf-banner-missed-video';
        el.className = 'pointer-events-auto bg-[#111b21]/95 backdrop-blur-md border border-[#00a884] rounded-2xl shadow-[0_0_24px_rgba(0,168,132,0.35)] p-3.5 flex flex-col gap-3';
        stack.appendChild(el);
    }

    const name = window._escapeCallsHtml((data.fromName || 'User').split(' ')[0]);
    const flag = window._escapeCallsHtml(data.fromFlag || '🌐');
    const photo = window._escapeCallsHtml(data.fromPhoto || 'https://ui-avatars.com/api/?name=U');

    window._activeMissedVideoData = { dbKey: dbKey || null, ...data };

    el.innerHTML = `
        <div class="flex items-center gap-3">
            <img src="${photo}" class="w-11 h-11 rounded-full object-cover border-2 border-[#00a884] shrink-0">
            <div class="flex flex-col overflow-hidden">
                <span class="text-[#00a884] text-[0.7rem] font-bold uppercase tracking-wider">${d.missed_video_title || 'MISSED VIDEO CALL'}</span>
                <span class="text-white text-sm font-bold leading-snug truncate">${flag} ${d.missed_video_text || 'Missed video call from'} ${name}</span>
            </div>
        </div>
        <div class="flex gap-2.5 w-full">
            <button onclick="window.closeMissedVideoBanner()" class="flex-1 py-2.5 rounded-xl bg-[#2a3942] hover:bg-[#374a56] text-[#e9edef] text-xs font-bold transition">${d.btn_later || 'Later'}</button>
            <button onclick="window.callbackMissedVideo()" class="flex-1 py-2.5 rounded-xl bg-[#00a884] hover:bg-[#00c49a] text-[#111b21] text-xs font-bold transition flex items-center justify-center"><i class="fa-solid fa-video mr-1.5"></i>${d.btn_callback || 'Call back'}</button>
        </div>
    `;

    window.playSafeSound(window.sndMissed, [200, 100, 200]);
};

window.closeMissedVideoBanner = function() {
    const active = window._activeMissedVideoData;
    const myId = window.myProfileInfo?.id;
    if (active && active.dbKey && myId && typeof firebase !== 'undefined') {
        firebase.database().ref('missed_video/' + myId + '/' + active.dbKey).remove().catch(() => {});
    }
    document.getElementById('hf-banner-missed-video')?.remove();
    window._activeMissedVideoData = null;
};

window.callbackMissedVideo = function() {
    const info = window._activeMissedVideoData;
    window.closeMissedVideoBanner();
    if (!info || !info.fromId) return;

    const target = (window.participants || []).find(p => String(p.id) === String(info.fromId)) || {
        id: info.fromId,
        name: info.fromName || 'User',
        photo: info.fromPhoto || 'https://ui-avatars.com/api/?name=U',
        flag: info.fromFlag || '🌐'
    };
    window.currentTargetUser = { ...target };
    if (typeof window.switchChatRoom === 'function') window.switchChatRoom(target.id);
    setTimeout(() => window.startInAppCall('video'), 150);
};

// Отдельные слушатели Firebase для missed_audio и missed_video
(function initMissedCallBannersListener() {
    window._seenMissedAudioKeys = window._seenMissedAudioKeys || new Set();
    window._seenMissedVideoKeys = window._seenMissedVideoKeys || new Set();

    const timer = setInterval(() => {
        const myId = window.myProfileInfo?.id;
        if (!myId || myId === 'guest' || typeof firebase === 'undefined' || !firebase.database) return;

        clearInterval(timer);

        firebase.database().ref('missed_audio/' + myId).on('child_added', (snap) => {
            const data = snap.val();
            if (!data || window._seenMissedAudioKeys.has(snap.key)) return;
            window._seenMissedAudioKeys.add(snap.key);
            window.showMissedAudioBanner(snap.key, data);
        });

        firebase.database().ref('missed_video/' + myId).on('child_added', (snap) => {
            const data = snap.val();
            if (!data || window._seenMissedVideoKeys.has(snap.key)) return;
            window._seenMissedVideoKeys.add(snap.key);
            window.showMissedVideoBanner(snap.key, data);
        });
    }, 800);
})();

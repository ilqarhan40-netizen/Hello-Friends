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

// --- 1. ФУНКЦИИ AGORA (ВИДЕО И АУДИО) ---
window.startWebRTC = async function(isCaller, targetId, isVideo = false) {
    if (window._isStartingAgora) return;
    if (typeof AgoraRTC === 'undefined') {
        alert("Модуль связи загружается, подождите секунду...");
        return;
    }

    window._isStartingAgora = true;
    window.updateMicToggleUI(false);
    window.updateCamToggleUI(!isVideo);

    try {
        if (window.agoraClient) {
            try { await window.agoraClient.leave(); } catch (e) {}
            window.agoraClient = null;
        }

        window.agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

        window.agoraClient.on("user-published", async (user, mediaType) => {
            await window.agoraClient.subscribe(user, mediaType);

            if (mediaType === "video") {
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

        if (isVideo) {
            try {
                if (!window.localVideoTrack) {
                    window.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
                    let myVideo =
                        document.getElementById('direct-local-video') ||
                        document.getElementById('my-live-video');
                    if (myVideo) {
                        myVideo.srcObject = new MediaStream([window.localVideoTrack.getMediaStreamTrack()]);
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

        if (typeof window.startVoiceAI === 'function') {
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

    const directRemote = document.getElementById('direct-remote-video');
    if (directRemote) {
        directRemote.srcObject = null;
        directRemote.classList.add('hidden');
    }

    const directLocal = document.getElementById('direct-local-video');
    if (directLocal) {
        directLocal.srcObject = null;
        directLocal.classList.add('hidden');
    }

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
    window.updateCamToggleUI(false);

    window.currentCallerId = null;
    window.currentCallerFallback = null;
    window.currentTargetUser = null;
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
        firebase.database().ref('signals/' + target.id).push({
            type: 'missed',
            callerName: window.myUsername,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        callRef.remove();
        window.callTimeout = null;
        window.stopAllRings();
        window.playSafeSound(window.sndMissed, [200, 100, 200]);
        if (window.showToast) window.showToast("Нет ответа", "Абонент недоступен", "", "");

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
    }, 30000);
};

window.showIncomingCall = function(callerId, callerName, callerPhoto, signalKey, callType) {
    window.currentIncomingSignalKey = signalKey;
    window.currentCallerId = callerId;
    window.currentCallerFallback = {
        id: callerId,
        name: callerName || 'User',
        photo: callerPhoto || 'https://ui-avatars.com/api/?name=U',
        flag: '🌐'
    };
    window.currentIncomingCallType = callType || 'voice';

    const nameEl = document.getElementById('incoming-call-name');
    const photoEl = document.getElementById('incoming-call-photo');
    const typeLabel = document.getElementById('incoming-call-type');

    if (nameEl) nameEl.innerText = callerName || 'User';
    if (photoEl) photoEl.src = callerPhoto || 'https://ui-avatars.com/api/?name=U';
    if (typeLabel) typeLabel.innerText = callType === 'video' ? '📹 Входящий видеозвонок' : '📞 Входящий аудиозвонок';

    const modal = document.getElementById('incoming-call-modal');
    if (modal) modal.classList.add('active');

    window.stopAllRings();
    window.playSafeSound(window.sndRing, [1000, 500, 1000, 500, 1000, 500, 1000]);
};

window.acceptCall = function() {
    window.stopAllRings();
    const modal = document.getElementById('incoming-call-modal');
    if (modal) modal.classList.remove('active');

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

        window.startWebRTC(false, window.currentCallerId, window.currentIncomingCallType === 'video');
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

    let targetIdToCancel = null;
    if (window.voiceFriend) targetIdToCancel = window.voiceFriend.id;
    else if (window.currentCallerId) targetIdToCancel = window.currentCallerId;
    else if (window.currentTargetUser) targetIdToCancel = window.currentTargetUser.id;

    window.endWebRTCCall();

    if (targetIdToCancel && window.myProfileInfo) {
        firebase.database().ref('signals/' + targetIdToCancel).push({
            type: 'reject',
            callerName: window.myUsername,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        firebase.database().ref('calls/' + window.myProfileInfo.id + '_' + targetIdToCancel).remove();
        firebase.database().ref('calls/' + targetIdToCancel + '_' + window.myProfileInfo.id).remove();
    }

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
        } else if (window.agoraClient) {
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
                } else {
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

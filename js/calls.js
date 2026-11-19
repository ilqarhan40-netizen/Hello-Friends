//==========================================
// MODULE: CALLS, VIDEO & AGORA ENGINE
//==========================================

if (typeof AgoraRTC === 'undefined') {
    const script = document.createElement('script');
    script.src = "https://download.agora.io/sdk/release/AgoraRTC_N-4.22.0.js";
    document.head.appendChild(script);
}

if (typeof AIDenoiserExtension === 'undefined') {
    const aiScript = document.createElement('script');
    aiScript.src = "https://download.agora.io/sdk/release/agora-extension-ai-denoiser-1.1.0.js";
    document.head.appendChild(aiScript);
}

window.agoraClient = null;
window.localAudioTrack = null;
window.localVideoTrack = null;

// Ключи Agora (временный токен для канала "hello")
const AGORA_APP_ID = "913f13a6b8104d34b03695acdc0d79b7";
const AGORA_APP_CERT = "1a1bb517f44841cdbb1ab4cdd47e75d1";
const AGORA_TEMP_TOKEN = "007eJxTYCg0Ond/XWhQ980vqXsnHA6N1+C4d0rXsOCZQJu5tmLPIiEFBktD4zRD40SzJAtDA5MUY5MkA2MzS9PE5JRkgxRzyyTz24n/shoCGRkufPNgYWJgBEMQn5UhIzUnJ5+BgQkuxMJgaGBgCAB79SHp";
const AGORA_TEST_CHANNEL = "hello";

window.currentCallerId = null;
window.currentIncomingSignalKey = null;
window.currentIncomingCallType = 'voice';
window.myLastOutgoingCallType = 'voice';
window.currentActiveChannel = null;
window.currentIncomingChannel = null;

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
window.startWebRTC = async function(isCaller, targetId, isVideo = false, channelName = "hello") {
    if (typeof AgoraRTC === 'undefined') {
        alert("Модуль связи загружается, подождите секунду...");
        window.hangUpCall();
        return;
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

        // ====================================================
        // ВХОД В AGORA ПО ВРЕМЕННОМУ ТОКЕНУ (КАНАЛ "hello")
        // ====================================================
        await window.agoraClient.join(AGORA_APP_ID, AGORA_TEST_CHANNEL, AGORA_TEMP_TOKEN, null);
        // ====================================================

        let tracksToPublish = [];

        // 1. Аппаратный захват микрофона
        if (!window.localAudioTrack) {
            window.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
                AEC: true, // Акустическое эхо
                ANS: true, // Фоновый шум
                AGC: true  // Громкость
            });

            // 2. Искусственное ИИ-шумоподавление (AI Denoiser)
            try {
                if (typeof AIDenoiserExtension !== 'undefined') {
                    const denoiser = new AIDenoiserExtension({
                        assetsPath: "https://unpkg.com/agora-extension-ai-denoiser@1.1.0/external/"
                    });
                    AgoraRTC.registerExtension(denoiser);
                    const processor = denoiser.createProcessor();
                    await processor.enable();

                    window.localAudioTrack.pipe(processor).pipe(window.localAudioTrack.processorDestination);
                    console.log("AI-Шумоподавление успешно активировано.");
                }
            } catch (e) {
                console.error("Ошибка запуска AI-фильтра:", e);
            }
        }
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
        alert("Ошибка подключения Agora: " + (e.message || e));
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
    window.currentActiveChannel = null;
    window.currentIncomingChannel = null;
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

    // На время теста используем канал "hello" под временный токен
    window.currentActiveChannel = AGORA_TEST_CHANNEL;

    let callRef = firebase.database().ref('signals/' + target.id).push();
    callRef.set({
        type: 'call',
        callType: callType,
        callerId: window.myProfileInfo.id,
        callerName: window.myUsername,
        callerPhoto: window.myProfileInfo.photo,
        channelName: window.currentActiveChannel,
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
        if(

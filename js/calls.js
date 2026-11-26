// ==========================================
// MODULE: CALLS, VIDEO & AGORA ENGINE (CLEAN v6)
// - Зеркальный вход в комнату: оба заходят только после принятия вызова
// - Экран исходящего вызова: фото/имя собеседника, тип звонка, только красный отбой
// - Кнопка "Ответить с ИИ-переводчиком" строго под кнопками на входящем аудиозвонке (13 языков)
// ==========================================

if (typeof AgoraRTC === 'undefined') {
    const script = document.createElement('script');
    script.src = "https://download.agora.io/sdk/release/AgoraRTC_N-4.22.0.js";
    document.head.appendChild(script);
}

window.agoraClient = null;
window.localAudioTrack = null;
window.localVideoTrack = null;
window.remoteAgoraUser = null;
window._isStartingAgora = false;

// Ключи Agora (свежий токен для канала "hello")
window.CALLS_AGORA_APP_ID = "913f13a6b8104d34b03695acdc0d79b7";
window.CALLS_AGORA_TEMP_TOKEN = "007eJxTYLBS27VeuWnq4VqjOTOqm1NdI58tbkvKvnNQ/ODjo8/6U/YrMFgaGqcZGieaJVkYGpikGJskGRibWZomJqckG6SYWyaZL3jKnt0QyMjQ8SOXhYmBEQxBfFaGjNScnHwGBia4EAuDoYGBIQD8CiNL";


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
window._pendingStartAIForCall = false;
window._pendingPauseForTranslation = false;
window._isOutgoingCallModal = false;

window.isMyMicMuted = false;
window.isMyCamMuted = true;
window.isRemoteMicMuted = false;
window.isRemoteCamMuted = false;
window._isTogglingAudio = false;
window._isTogglingCam = false;
window._agoraPausedForTranslation = false;
window._prevMyMicMuted = false;
window._prevRemoteMicMuted = false;

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
    const playPromise = audioElement.play();
    if (playPromise !== undefined) {
        playPromise.catch(() => {});
    }
    if (vibratePattern && "vibrate" in navigator) {
        try { navigator.vibrate(vibratePattern); } catch (e) {}
    }
};

window.stopAllRings = function() {
    if (window.sndRing) { window.sndRing.pause(); window.sndRing.currentTime = 0; }
    if (window.sndCallOut) { window.sndCallOut.pause(); window.sndCallOut.currentTime = 0; }
    if ("vibrate" in navigator) { try { navigator.vibrate(0); } catch (e) {} }
};

// --- СЛОВАРИ ЗВОНКОВ НА 13 ЯЗЫКОВ ---
window._CALLS_AI_BTN_TEXT = {
    ru: 'Ответить с ИИ-переводчиком',
    en: 'Answer with AI Translator',
    az: 'AI tərcüməçi ilə cavab ver',
    tr: 'AI Çevirmen ile Yanıtla',
    de: 'Mit KI-Übersetzer annehmen',
    kk: 'AI аудармашымен жауап беру',
    ar: 'الرد بمترجم الذكاء الاصطناعي',
    it: 'Rispondi con traduttore IA',
    es: 'Responder con traductor IA',
    fr: 'Répondre avec traducteur IA',
    pt: 'Atender com tradutor IA',
    ja: 'AI翻訳で応答する',
    zh: '使用 AI 翻译接听'
};

window._CALLS_INCOMING_LABELS = {
    en: { audio: '📞 Audio Call', video: '📹 Video Call' },
    ru: { audio: '📞 Аудиозвонок', video: '📹 Видеозвонок' },
    az: { audio: '📞 Audio Zəng', video: '📹 Video Zəng' },
    kk: { audio: '📞 Аудио қоңырау', video: '📹 Бейнеқоңырау' },
    tr: { audio: '📞 Sesli Arama', video: '📹 Görüntülü Arama' },
    de: { audio: '📞 Audioanruf', video: '📹 Videoanruf' },
    ar: { audio: '📞 مكالمة صوتية', video: '📹 مكالمة فيديو' },
    it: { audio: '📞 Chiamata Audio', video: '📹 Videochiamata' },
    es: { audio: '📞 Llamada de Audio', video: '📹 Videollamada' },
    fr: { audio: '📞 Appel Audio', video: '📹 Appel Vidéo' },
    pt: { audio: '📞 Chamada de Áudio', video: '📹 Chamada de Vídeo' },
    ja: { audio: '📞 音声通話', video: '📹 ビデオ通話' },
    zh: { audio: '📞 语音通话', video: '📹 视频通话' }
};

window._CALLS_CALLING_LABELS = {
    en: 'Calling...',
    ru: 'Вызов...',
    az: 'Zəng edilir...',
    kk: 'Қоңырау шалынуда...',
    tr: 'Aranıyor...',
    de: 'Wird angerufen...',
    ar: 'جارٍ الاتصال...',
    it: 'Chiamata in corso...',
    es: 'Llamando...',
    fr: 'Appel en cours...',
    pt: 'Chamando...',
    ja: '発信中...',
    zh: '正在呼叫...'
};

window.resolveCallProfileLang = function(userObj) {
    if (!userObj) return '';
    if (typeof window.videoRoomResolveLang === 'function') {
        const res = window.videoRoomResolveLang(userObj, null);
        if (res) return res;
    }
    const emojiMap = {
        '🇬🇧': 'en', '🇺🇸': 'en', '🇷🇺': 'ru', '🇦🇿': 'az',
        '🇹🇷': 'tr', '🇩🇪': 'de', '🇰🇿': 'kk', '🇦🇪': 'ar',
        '🇸🇦': 'ar', '🇮🇹': 'it', '🇪🇸': 'es', '🇫🇷': 'fr',
        '🇵🇹': 'pt', '🇧🇷': 'pt', '🇯🇵': 'ja', '🇨🇳': 'zh'
    };
    const flagStr = String(userObj.flag || '').trim();
    if (emojiMap[flagStr]) return emojiMap[flagStr];

    const fix = { us: 'en', gb: 'en', uk: 'en', kz: 'kk', cn: 'zh', jp: 'ja', ae: 'ar', sa: 'ar', eg: 'ar', br: 'pt', mx: 'es' };
    const norm = (v) => {
        if (!v) return '';
        const s = String(v).trim().toLowerCase();
        if (!s || s === 'auto' || s === 'un') return '';
        const b = s.split(/[-_]/)[0].substring(0, 2);
        return fix[b] || b;
    };

    const byFlagCode = norm(userObj.flagCode);
    if (byFlagCode) return byFlagCode;

    const digits = String(userObj.phone || userObj.phoneNumber || userObj.tel || '').replace(/\D/g, '');
    if (digits) {
        const prefixes = [
            ['994', 'az'], ['971', 'ar'], ['966', 'ar'], ['351', 'pt'],
            ['77', 'kk'], ['76', 'kk'], ['90', 'tr'], ['49', 'de'],
            ['44', 'en'], ['39', 'it'], ['34', 'es'], ['33', 'fr'],
            ['81', 'ja'], ['86', 'zh'], ['55', 'pt'], ['20', 'ar'],
            ['7', 'ru'], ['1', 'en']
        ];
        for (const [p, l] of prefixes) {
            if (digits.startsWith(p)) return l;
        }
    }

    const byCode = norm(userObj.langCode || userObj.lang);
    if (byCode) return byCode;

    return '';
};

window.getCallsUiLang = function() {
    const fix = { kz: 'kk', cn: 'zh', jp: 'ja', ae: 'ar', sa: 'ar', eg: 'ar', gb: 'en', us: 'en', uk: 'en', br: 'pt', mx: 'es' };
    const norm = (v) => {
        if (!v) return '';
        const s = String(v).trim().toLowerCase();
        if (!s || s === 'auto' || s === 'un') return '';
        const b = s.split(/[-_]/)[0].substring(0, 2);
        return fix[b] || b;
    };
    const eco = norm(window.appLang) || norm(localStorage.getItem('hf_app_lang'));
    if (eco && window._CALLS_INCOMING_LABELS[eco]) return eco;
    const prof = norm(window.resolveCallProfileLang(window.myProfileInfo));
    if (prof && window._CALLS_INCOMING_LABELS[prof]) return prof;
    const nav = norm(navigator.language);
    if (nav && window._CALLS_INCOMING_LABELS[nav]) return nav;
    return 'en';
};

// --- КНОПКА "ОТВЕТИТЬ С ИИ-ПЕРЕВОДЧИКОМ" СТРОГО ПОД КНОПКАМИ ОТБОЙ / ОТВЕТИТЬ ---
window.injectIncomingAIButtonStyles = function() {
    if (document.getElementById('hf-incoming-ai-btn-styles-v2')) return;
    const old = document.getElementById('hf-incoming-ai-btn-styles');
    if (old) old.remove();

    const style = document.createElement('style');
    style.id = 'hf-incoming-ai-btn-styles-v2';
    style.textContent = `
        #hf-incoming-ai-float {
            position: static !important;
            left: auto !important;
            top: auto !important;
            margin-top: 28px !important;
            z-index: 100001;
            display: none;
            width: min(88%, 320px);
            pointer-events: auto;
        }
        #hf-incoming-ai-float.active {
            display: block;
            animation: hfAiFadePulseV2 3.2s ease-in-out infinite;
        }
        #hf-incoming-ai-float button {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 13px 18px;
            border-radius: 999px;
            border: 1.5px solid #00e5b0;
            background: linear-gradient(135deg, rgba(17, 27, 33, 0.96), rgba(0, 120, 96, 0.94));
            color: #ffffff;
            font-weight: 800;
            font-size: 0.9rem;
            box-shadow: 0 10px 30px rgba(0, 168, 132, 0.45);
            cursor: pointer;
            backdrop-filter: blur(8px);
        }
        #hf-incoming-ai-float button:active {
            transform: scale(0.97);
        }
        @keyframes hfAiFadePulseV2 {
            0%   { opacity: 1;    transform: scale(1); }
            50%  { opacity: 0.55; transform: scale(0.98); }
            100% { opacity: 1;    transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
};

window.showIncomingAIBtn = function(callerObj) {
    window.injectIncomingAIButtonStyles();

    // На экране исходящего звонка кнопку ИИ не показываем
    if (window._isOutgoingCallModal) {
        window.hideIncomingAIBtn();
        return;
    }

    const myLang = window.resolveCallProfileLang(window.myProfileInfo);
    const callerLang = window.resolveCallProfileLang(callerObj);

    // Показываем кнопку ТОЛЬКО при разных флагах/языках профилей
    if (!myLang || !callerLang || myLang === callerLang) {
        window.hideIncomingAIBtn();
        return;
    }

    const modal = document.getElementById('incoming-call-modal') || document.body;
    let wrap = document.getElementById('hf-incoming-ai-float');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'hf-incoming-ai-float';
    }
    if (wrap.parentNode !== modal) {
        modal.appendChild(wrap);
    }

    const uiLang = window.getCallsUiLang();
    const label = window._CALLS_AI_BTN_TEXT[uiLang] || window._CALLS_AI_BTN_TEXT.en;
    const callerFlag = (callerObj && callerObj.flag && callerObj.flag !== '🌐') ? `${callerObj.flag} ` : '';

    wrap.innerHTML = `
        <button type="button" onclick="event.stopPropagation(); window.acceptCallWithAI()">
            <i class="fa-solid fa-robot text-[#00e5b0] text-lg"></i>
            <span>${callerFlag}${label}</span>
        </button>
    `;
    wrap.classList.add('active');
};

window.hideIncomingAIBtn = function() {
    const wrap = document.getElementById('hf-incoming-ai-float');
    if (wrap) wrap.classList.remove('active');
};

// --- ОБЩЕЕ УПРАВЛЕНИЕ ЭКРАНОМ ВХОДЯЩЕГО / ИСХОДЯЩЕГО ВЫЗОВА ---
window.showOutgoingCallModal = function(target, callType) {
    window._isOutgoingCallModal = true;
    window.hideIncomingAIBtn();

    const modal = document.getElementById('incoming-call-modal');
    if (!modal) return;

    const nameEl = document.getElementById('incoming-call-name');
    const photoEl = document.getElementById('incoming-call-photo');
    const typeLabel = document.getElementById('incoming-call-type');
    const subtitleEl = modal.querySelector('#incoming-call-name + span');
    const acceptBtn = modal.querySelector('button[onclick*="acceptCall"]');

    const uiLang = window.getCallsUiLang();
    const labels = window._CALLS_INCOMING_LABELS[uiLang] || window._CALLS_INCOMING_LABELS.en;
    const callingTxt = window._CALLS_CALLING_LABELS[uiLang] || window._CALLS_CALLING_LABELS.en;
    const isVideo = (callType === 'video');

    if (typeLabel) typeLabel.innerText = isVideo ? labels.video : labels.audio;
    if (photoEl) photoEl.src = (target && target.photo) ? target.photo : 'https://ui-avatars.com/api/?name=U';
    if (nameEl) nameEl.innerText = (target && target.name) ? target.name : 'User';
    if (subtitleEl) subtitleEl.innerText = callingTxt;

    // У звонящего показываем только красную кнопку отбоя
    if (acceptBtn) acceptBtn.style.display = 'none';

    modal.classList.add('active');
};

window.hideCallModal = function() {
    window._isOutgoingCallModal = false;
    window.hideIncomingAIBtn();

    const modal = document.getElementById('incoming-call-modal');
    if (!modal) return;

    const subtitleEl = modal.querySelector('#incoming-call-name + span');
    const acceptBtn = modal.querySelector('button[onclick*="acceptCall"]');
    if (subtitleEl) subtitleEl.innerText = 'Hello Friends';
    if (acceptBtn) acceptBtn.style.display = '';

    modal.classList.remove('active');
};

window.cancelOutgoingCall = function() {
    const targetId = window.activeOutgoingCallTargetId || (window.voiceFriend && window.voiceFriend.id) || null;
    const outgoingType = window.activeOutgoingCallType || 'voice';
    const outgoingRef = window.activeOutgoingCallRef;

    window.hideCallModal();
    window.stopAllRings();

    if (window.callTimeout) {
        clearTimeout(window.callTimeout);
        window.callTimeout = null;
    }
    if (outgoingRef) {
        try { outgoingRef.remove(); } catch (e) {}
    }

    if (targetId && window.myProfileInfo) {
        firebase.database().ref('signals/' + targetId).push({
            type: 'missed',
            callType: outgoingType,
            callerName: window.myUsername,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        if (outgoingType === 'video') {
            window.sendMissedVideoNotice(targetId);
        } else {
            window.sendMissedAudioNotice(targetId);
        }
    }

    window.activeOutgoingCallTargetId = null;
    window.activeOutgoingCallRef = null;
    window.currentCallerId = null;
    window.voiceFriend = null;
    window.callWasAnswered = false;
    window._pendingStartAIForCall = false;
    window._pendingPauseForTranslation = false;
};

// --- ЖЁСТКОЕ РАЗДЕЛЕНИЕ ИНТЕРФЕЙСА: АУДИО (БЕЗ ФРЕЙМОВ И КАМЕР) / ВИДЕО ---
window.applyCallRoomModeUI = function(isVideoMode) {
    const showVideo = Boolean(isVideoMode);

    const remoteVid = document.getElementById('direct-remote-video');
    const videoRow = (remoteVid && remoteVid.parentElement) ? remoteVid.parentElement.parentElement : null;
    if (videoRow) {
        if (showVideo) {
            videoRow.classList.remove('hidden');
            videoRow.style.display = 'flex';
        } else {
            videoRow.classList.add('hidden');
            videoRow.style.display = 'none';
        }
    }

    document.querySelectorAll('#icon-my-cam, #icon-remote-cam').forEach(icon => {
        const btn = icon.closest('button') || icon.parentElement;
        if (!btn) return;
        if (showVideo) {
            btn.classList.remove('hidden');
            btn.style.display = '';
        } else {
            btn.classList.add('hidden');
            btn.style.display = 'none';
        }
    });

    if (!showVideo && typeof window.hideDirectVideoElements === 'function') {
        window.hideDirectVideoElements();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.applyCallRoomModeUI(window.currentActiveCallType === 'video');

    document.body.addEventListener('click', function unlockAudio() {
        const allSounds = [window.sndMsg, window.sndCash, window.sndEmail, window.sndMissed, window.sndRing, window.sndCallOut];
        allSounds.forEach(snd => { snd.play().then(() => snd.pause()).catch(() => {}); });
        document.body.removeEventListener('click', unlockAudio);
    }, { once: true });
});

// --- UI ИКОНОК МИКРОФОНА, КАМЕРЫ И ЗАГЛУШЕК ---
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

window.updateRemoteMicToggleUI = function(isMuted) {
    window.isRemoteMicMuted = Boolean(isMuted);
    document.querySelectorAll('#icon-remote-mic').forEach(i => {
        i.classList.remove('fa-microphone', 'fa-microphone-slash');
        i.classList.add(isMuted ? 'fa-microphone-slash' : 'fa-microphone');
        if (i.parentElement) {
            i.parentElement.classList.remove('text-[#00a884]', 'text-red-500');
            i.parentElement.classList.add(isMuted ? 'text-red-500' : 'text-[#00a884]');
        }
    });
};

window.updateRemoteCamToggleUI = function(isMuted) {
    window.isRemoteCamMuted = Boolean(isMuted);
    document.querySelectorAll('#icon-remote-cam').forEach(i => {
        i.classList.remove('fa-video', 'fa-video-slash');
        i.classList.add(isMuted ? 'fa-video-slash' : 'fa-video');
        if (i.parentElement) {
            i.parentElement.classList.remove('text-[#00a884]', 'text-red-500');
            i.parentElement.classList.add(isMuted ? 'text-red-500' : 'text-[#00a884]');
        }
    });
};

window.setLocalVideoVisible = function(visible, track = null) {
    const localVid = document.getElementById('direct-local-video');
    const localPh = document.getElementById('direct-local-placeholder');
    if (localVid) {
        if (visible && track) {
            try {
                localVid.srcObject = new MediaStream([track.getMediaStreamTrack()]);
            } catch (e) {}
            localVid.classList.remove('hidden');
            localVid.style.display = 'block';
            localVid.play().catch(() => {});
        } else if (!visible) {
            localVid.srcObject = null;
            localVid.classList.add('hidden');
            localVid.style.display = 'none';
        }
    }
    if (localPh) {
        if (visible) {
            localPh.classList.add('hidden');
            localPh.style.display = 'none';
        } else {
            localPh.classList.remove('hidden');
            localPh.style.display = 'flex';
        }
    }
};

window.setRemoteVideoVisible = function(visible, track = null) {
    const remoteVid = document.getElementById('direct-remote-video');
    const remotePh = document.getElementById('direct-remote-placeholder');
    if (remoteVid) {
        if (visible && track) {
            try {
                remoteVid.srcObject = new MediaStream([track.getMediaStreamTrack()]);
            } catch (e) {}
            remoteVid.classList.remove('hidden');
            remoteVid.style.display = 'block';
            remoteVid.play().catch(() => {});
        } else if (!visible) {
            remoteVid.srcObject = null;
            remoteVid.classList.add('hidden');
            remoteVid.style.display = 'none';
        }
    }
    if (remotePh) {
        if (visible) {
            remotePh.classList.add('hidden');
            remotePh.style.display = 'none';
        } else {
            remotePh.classList.remove('hidden');
            remotePh.style.display = 'flex';
        }
    }
};

window.hideDirectVideoElements = function() {
    window.setRemoteVideoVisible(false);
    window.setLocalVideoVisible(false);
};

// Автоматическая пауза обоих микрофонов звонка для нижнего микрофона/ИИ-переводчика и возврат обратно
window.pauseAgoraMicForTranslation = async function() {
    if (window._agoraPausedForTranslation) {
        window.updateMicToggleUI(true);
        window.updateRemoteMicToggleUI(true);
        return;
    }

    // Если Agora ещё подключается — запоминаем, чтобы сразу поставить на паузу после старта
    if (!window.agoraClient && !window.localAudioTrack) {
        window._pendingPauseForTranslation = true;
        window.updateMicToggleUI(true);
        window.updateRemoteMicToggleUI(true);
        return;
    }

    window._pendingPauseForTranslation = false;
    window._agoraPausedForTranslation = true;
    window._prevMyMicMuted = Boolean(window.isMyMicMuted);
    window._prevRemoteMicMuted = Boolean(window.isRemoteMicMuted);

    if (window.localAudioTrack) {
        try {
            await window.localAudioTrack.setEnabled(false);
        } catch (e) {
            try { await window.localAudioTrack.setMuted(true); } catch (err) {}
        }
    }
    if (window.remoteAgoraUser && window.remoteAgoraUser.audioTrack) {
        try { window.remoteAgoraUser.audioTrack.setVolume(0); } catch (e) {}
    }

    window.updateMicToggleUI(true);
    window.updateRemoteMicToggleUI(true);
};

window.resumeAgoraMicAfterTranslation = async function() {
    window._pendingPauseForTranslation = false;
    if (!window._agoraPausedForTranslation) {
        window.updateMicToggleUI(false);
        window.updateRemoteMicToggleUI(false);
        return;
    }
    window._agoraPausedForTranslation = false;

    const restoreMyMuted = Boolean(window._prevMyMicMuted);
    const restoreRemoteMuted = Boolean(window._prevRemoteMicMuted);

    if (window.localAudioTrack) {
        try {
            await window.localAudioTrack.setEnabled(!restoreMyMuted);
        } catch (e) {
            try { await window.localAudioTrack.setMuted(restoreMyMuted); } catch (err) {}
        }
    }
    if (window.remoteAgoraUser && window.remoteAgoraUser.audioTrack) {
        try { window.remoteAgoraUser.audioTrack.setVolume(restoreRemoteMuted ? 0 : 100); } catch (e) {}
    }

    window.updateMicToggleUI(restoreMyMuted);
    window.updateRemoteMicToggleUI(restoreRemoteMuted);
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
    window.applyCallRoomModeUI(allowVideo);

    window._isStartingAgora = true;
    window._agoraPausedForTranslation = false;
    window._prevMyMicMuted = false;
    window._prevRemoteMicMuted = false;
    window.remoteAgoraUser = null;

    window.updateMicToggleUI(false);
    window.updateCamToggleUI(!allowVideo);
    window.updateRemoteMicToggleUI(false);
    window.updateRemoteCamToggleUI(false);

    if (typeof window.syncVideoRoomListener === 'function') {
        window.syncVideoRoomListener();
    }

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
            window.remoteAgoraUser = user;

            if (mediaType === "video") {
                if (!allowVideo && window.currentActiveCallType !== 'video') return;
                if (!window.isRemoteCamMuted && user.videoTrack) {
                    window.setRemoteVideoVisible(true, user.videoTrack);
                }
                const confVideo = document.getElementById(`remote-video-${targetId}`);
                if (confVideo && user.videoTrack) {
                    confVideo.srcObject = new MediaStream([user.videoTrack.getMediaStreamTrack()]);
                    confVideo.style.display = 'block';
                    confVideo.classList.remove('hidden');
                    confVideo.play().catch(() => {});
                }
            }

            if (mediaType === "audio" && user.audioTrack) {
                user.audioTrack.play();
                if (window.isRemoteMicMuted || window._agoraPausedForTranslation || window._pendingStartAIForCall || window._pendingPauseForTranslation) {
                    try { user.audioTrack.setVolume(0); } catch (e) {}
                }
            }
        });

        window.agoraClient.on("user-unpublished", (user, mediaType) => {
            if (mediaType === "video") {
                window.setRemoteVideoVisible(false);
            }
            if (mediaType === "audio" && user.audioTrack) {
                try { user.audioTrack.stop(); } catch (e) {}
            }
        });

        window.agoraClient.on("user-left", () => {
            window.remoteAgoraUser = null;
            window.setRemoteVideoVisible(false);
        });

        const channelName = window.CALLS_AGORA_CHANNEL;
        const uid = (window.myProfileInfo && window.myProfileInfo.id) ? window.myProfileInfo.id : null;

        await window.agoraClient.join(
            window.CALLS_AGORA_APP_ID,
            channelName,
            window.CALLS_AGORA_TEMP_TOKEN,
            uid
        );

        const tracksToPublish = [];

        if (window.localAudioTrack) {
            try { window.localAudioTrack.close(); } catch (e) {}
            window.localAudioTrack = null;
        }
        window.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
            AEC: true,
            ANS: true,
            AGC: true
        });
        tracksToPublish.push(window.localAudioTrack);

        if (allowVideo) {
            try {
                if (window.localVideoTrack) {
                    try { window.localVideoTrack.close(); } catch (e) {}
                    window.localVideoTrack = null;
                }
                window.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
                window.setLocalVideoVisible(true, window.localVideoTrack);
                tracksToPublish.push(window.localVideoTrack);
                window.updateCamToggleUI(false);
            } catch (camErr) {
                console.warn("Камера недоступна, оставляем аудио:", camErr);
                window.setLocalVideoVisible(false);
                window.updateCamToggleUI(true);
            }
        }

        if (tracksToPublish.length > 0) {
            await window.agoraClient.publish(tracksToPublish);
        }

        // Если звонок принят через кнопку "Ответить с ИИ-переводчиком" — сразу запускаем ИИ-голос на обоих устройствах
        if (window._pendingStartAIForCall) {
            window._pendingStartAIForCall = false;
            await window.pauseAgoraMicForTranslation();
            if (typeof window.startAudioRoomMic === 'function' && !allowVideo) {
                setTimeout(() => window.startAudioRoomMic('ai-audio'), 200);
            } else if (typeof window.startVideoRoomMic === 'function') {
                setTimeout(() => window.startVideoRoomMic('ai-audio'), 200);
            }
        } else if (window._pendingPauseForTranslation || window.videoRoomMicActive || window.audioRoomMicActive) {
            await window.pauseAgoraMicForTranslation();
        }

    } catch (e) {
        console.error("Ошибка Agora:", e);
        alert("Ошибка подключения звонка: " + (e.message || e));
    } finally {
        window._isStartingAgora = false;
    }
};

window.endWebRTCCall = async function() {
    window.hideCallModal();
    window._pendingStartAIForCall = false;
    window._pendingPauseForTranslation = false;

    if (typeof window.stopAudioRoomMic === 'function') {
        try { await window.stopAudioRoomMic(true); } catch (e) {}
    }
    if (typeof window.stopVideoRoomMic === 'function') {
        try { await window.stopVideoRoomMic(true); } catch (e) {}
    }
    if (typeof window.resetVideoRoomState === 'function') {
        window.resetVideoRoomState();
    }
    if (typeof window.stopVoiceAI === 'function') {
        try { window.stopVoiceAI(); } catch (e) {}
    }

    if (window.localAudioTrack) {
        try { window.localAudioTrack.close(); } catch (e) {}
        window.localAudioTrack = null;
    }
    if (window.localVideoTrack) {
        try { window.localVideoTrack.close(); } catch (e) {}
        window.localVideoTrack = null;
    }
    if (window.agoraClient) {
        try { await window.agoraClient.leave(); } catch (e) {}
        window.agoraClient = null;
    }

    window.remoteAgoraUser = null;
    window._agoraPausedForTranslation = false;
    window._prevMyMicMuted = false;
    window._prevRemoteMicMuted = false;
    window.videoRoomPartnerMeta = null;
    window._vrLastMetaSig = '';

    const tab1Input = document.getElementById('voice-chat-input');
    if (tab1Input) tab1Input.value = '';

    document.querySelectorAll('[id^="remote-video-"]').forEach(v => {
        v.srcObject = null;
        v.classList.add('hidden');
        v.style.display = 'none';
    });

    window.applyCallRoomModeUI(false);

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
    window.updateRemoteMicToggleUI(false);
    window.updateRemoteCamToggleUI(false);

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
    const target = { ...window.currentTargetUser };
    const normalizedType = (callType === 'video') ? 'video' : 'voice';
    window.closePhoneChoiceModal();

    window.myLastOutgoingCallType = normalizedType;
    window.currentActiveCallType = normalizedType;
    window.activeOutgoingCallTargetId = target.id;
    window.activeOutgoingCallType = normalizedType;
    window.callWasAnswered = false;
    window._pendingStartAIForCall = false;
    window._pendingPauseForTranslation = false;
    window.videoRoomPartnerMeta = null;
    window._vrLastMetaSig = '';
    window.voiceFriend = target;

    firebase.database().ref('calls/' + window.myProfileInfo.id + '_' + target.id).remove();

    const callRef = firebase.database().ref('signals/' + target.id).push();
    window.activeOutgoingCallRef = callRef;
    callRef.set({
        type: 'call',
        callType: normalizedType,
        callerId: window.myProfileInfo.id,
        callerName: window.myUsername,
        callerPhoto: window.myProfileInfo.photo,
        callerFlag: window.myProfileInfo.flag || '',
        callerFlagCode: window.myProfileInfo.flagCode || '',
        callerLang: window.myProfileInfo.langCode || window.myProfileInfo.lang || '',
        callerPhone: window.myProfileInfo.phone || window.myProfileInfo.phoneNumber || '',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    const pushTitle = normalizedType === 'video' ? "📹 Входящий видеозвонок" : "📞 Входящий аудиозвонок";
    if (window.sendPushNotification) {
        window.sendPushNotification(
            target.id,
            { type: 'call', callerName: window.myUsername, callType: normalizedType },
            pushTitle,
            `${window.myUsername} звонит вам!`
        );
    }

    // Остаёмся на внешней вкладке и показываем экран исходящего вызова с аватаром собеседника и кнопкой отбоя
    window.showOutgoingCallModal(target, normalizedType);

    window.stopAllRings();
    setTimeout(() => { window.playSafeSound(window.sndCallOut); }, 100);

    if (window.callTimeout) clearTimeout(window.callTimeout);
    window.callTimeout = setTimeout(() => {
        if (window.callWasAnswered) return;

        window.hideCallModal();

        firebase.database().ref('signals/' + target.id).push({
            type: 'missed',
            callType: normalizedType,
            callerName: window.myUsername,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

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

        const missedTitle = normalizedType === 'video' ? "📵 Пропущенный видеозвонок" : "📵 Пропущенный вызов";
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

window.showIncomingCall = function(callerId, callerName, callerPhoto, signalKey, callType, callerMeta = {}) {
    window._isOutgoingCallModal = false;
    window.currentIncomingSignalKey = signalKey;
    window.currentCallerId = callerId;
    window.callWasAnswered = false;

    const fromList = (window.participants || []).find(p => String(p.id) === String(callerId)) || {};
    window.currentCallerFallback = {
        id: callerId,
        name: callerName || fromList.name || 'User',
        photo: callerPhoto || fromList.photo || 'https://ui-avatars.com/api/?name=U',
        flag: callerMeta.flag || fromList.flag || '',
        flagCode: callerMeta.flagCode || fromList.flagCode || '',
        langCode: callerMeta.langCode || fromList.langCode || '',
        phone: callerMeta.phone || fromList.phone || fromList.phoneNumber || ''
    };

    window.currentIncomingCallType = (callType === 'video') ? 'video' : 'voice';
    window.currentActiveCallType = window.currentIncomingCallType;

    const modal = document.getElementById('incoming-call-modal');
    const nameEl = document.getElementById('incoming-call-name');
    const photoEl = document.getElementById('incoming-call-photo');
    const typeLabel = document.getElementById('incoming-call-type');
    const acceptIcon = document.getElementById('incoming-call-accept-icon');
    const subtitleEl = modal ? modal.querySelector('#incoming-call-name + span') : null;
    const acceptBtn = modal ? modal.querySelector('button[onclick*="acceptCall"]') : null;

    const uiLang = window.getCallsUiLang();
    const labels = window._CALLS_INCOMING_LABELS[uiLang] || window._CALLS_INCOMING_LABELS.en;
    const isVideo = window.currentIncomingCallType === 'video';

    if (nameEl) nameEl.innerText = callerName || 'User';
    if (photoEl) photoEl.src = callerPhoto || 'https://ui-avatars.com/api/?name=U';
    if (typeLabel) typeLabel.innerText = isVideo ? labels.video : labels.audio;
    if (subtitleEl) subtitleEl.innerText = 'Hello Friends';
    if (acceptBtn) acceptBtn.style.display = '';
    if (acceptIcon) {
        acceptIcon.className = isVideo ? 'fa-solid fa-video' : 'fa-solid fa-phone';
    }

    if (modal) modal.classList.add('active');

    // Для входящего аудиозвонка с другим флагом показываем кнопку ИИ строго под Отбой / Ответить
    if (!isVideo) {
        window.showIncomingAIBtn(window.currentCallerFallback);
    } else {
        window.hideIncomingAIBtn();
    }

    window.stopAllRings();
    window.playSafeSound(window.sndRing, [1000, 500, 1000, 500, 1000, 500, 1000]);
};

window.acceptCallWithAI = function() {
    window.acceptCall(true);
};

window.acceptCall = function(withAI = false) {
    const startWithAI = Boolean(withAI === true);
    window.hideCallModal();
    window.stopAllRings();
    window.callWasAnswered = true;
    window._pendingStartAIForCall = startWithAI;
    window.videoRoomPartnerMeta = null;
    window._vrLastMetaSig = '';

    const incomingIsVideo = (window.currentIncomingCallType === 'video');
    window.currentActiveCallType = incomingIsVideo ? 'video' : 'voice';
    window.applyCallRoomModeUI(incomingIsVideo);

    if (!incomingIsVideo) {
        window.updateCamToggleUI(true);
    }

    if (window.currentCallerId) {
        firebase.database().ref('signals/' + window.currentCallerId).push({
            type: 'answered',
            useAI: startWithAI,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    }
    if (window.currentIncomingSignalKey && window.myProfileInfo) {
        firebase.database().ref('signals/' + window.myProfileInfo.id + '/' + window.currentIncomingSignalKey).remove();
    }

    const fromList = (window.participants || []).find(p => String(p.id) === String(window.currentCallerId)) || {};
    const fallback = window.currentCallerFallback || {};
    const target = Object.assign({}, fromList, fallback);

    if ((!target.flag || target.flag === '🌐') && fromList.flag) target.flag = fromList.flag;
    if (!target.flagCode && fromList.flagCode) target.flagCode = fromList.flagCode;
    if (!target.langCode && fromList.langCode) target.langCode = fromList.langCode;
    if (!target.phone && (fromList.phone || fromList.phoneNumber)) {
        target.phone = fromList.phone || fromList.phoneNumber;
    }

    if (target && target.id) {
        window.currentTargetUser = { ...target };
        const pEl = document.getElementById('voice-friend-photo');
        const fEl = document.getElementById('voice-friend-flag');
        const nEl = document.getElementById('voice-friend-name');
        if (pEl && target.photo) pEl.src = target.photo;
        if (fEl && target.flag) fEl.innerText = target.flag;
        if (nEl) {
            nEl.removeAttribute('data-i18n');
            nEl.innerText = (target.name || 'User').split(' ')[0];
        }

        window.voiceFriend = target;
        if (window.switchChatRoom) window.switchChatRoom(target.id);
        if (window.switchTab) window.switchTab(1);
        if (typeof window.syncVideoRoomListener === 'function') window.syncVideoRoomListener();

        window.startWebRTC(false, window.currentCallerId, incomingIsVideo);
    }
};

window.declineCall = function() {
    // Если красную кнопку нажал сам звонящий — отменяем исходящий вызов и остаёмся на внешней вкладке
    if (window._isOutgoingCallModal) {
        window.cancelOutgoingCall();
        return;
    }

    window.hideCallModal();
    window.stopAllRings();

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
    const wasOutgoingOnly = Boolean(window._isOutgoingCallModal && !window.callWasAnswered);
    if (wasOutgoingOnly) {
        window.cancelOutgoingCall();
        return;
    }

    window.hideCallModal();
    window.stopAllRings();

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
                window.showIncomingCall(sig.callerId, sig.callerName, sig.callerPhoto, snap.key, sig.callType, {
                    flag: sig.callerFlag || '',
                    flagCode: sig.callerFlagCode || '',
                    langCode: sig.callerLang || '',
                    phone: sig.callerPhone || ''
                });
            } else {
                firebase.database().ref(mySignalPath + '/' + snap.key).remove();
            }
        }
        else if (sig.type === 'reject') {
            firebase.database().ref(mySignalPath + '/' + snap.key).remove();
            if (age > 15000) return;

            const wasInRoom = !window._isOutgoingCallModal && (window.currentIndex === 1 || Boolean(window.agoraClient));
            window.hideCallModal();
            window.activeOutgoingCallTargetId = null;
            window.activeOutgoingCallRef = null;
            window.stopAllRings();
            window.playSafeSound(window.sndMissed, [200, 100, 200]);
            if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
            window.endWebRTCCall();
            if (wasInRoom && window.switchTab) window.switchTab(0);
        }
        else if (sig.type === 'answered') {
            firebase.database().ref(mySignalPath + '/' + snap.key).remove();
            if (age > 15000) return;

            // Закрываем экран исходящего вызова и зеркально заходим в комнату одновременно с собеседником
            window.hideCallModal();
            window.callWasAnswered = true;
            window._pendingStartAIForCall = Boolean(sig.useAI);
            window.activeOutgoingCallTargetId = null;
            window.activeOutgoingCallRef = null;
            window.stopAllRings();
            if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }

            const isVideo = (window.myLastOutgoingCallType === 'video');
            window.currentActiveCallType = isVideo ? 'video' : 'voice';
            window.applyCallRoomModeUI(isVideo);
            if (!isVideo) window.updateCamToggleUI(true);

            const target = window.voiceFriend || window.currentTargetUser;
            if (target) {
                window.currentTargetUser = { ...target };
                const photoEl = document.getElementById('voice-friend-photo');
                const flagEl = document.getElementById('voice-friend-flag');
                const nameEl = document.getElementById('voice-friend-name');
                if (photoEl && target.photo) photoEl.src = target.photo;
                if (flagEl && target.flag) flagEl.innerText = target.flag;
                if (nameEl) {
                    nameEl.removeAttribute('data-i18n');
                    nameEl.innerText = (target.name || 'User').split(' ')[0];
                }
            }

            if (window.switchTab) window.switchTab(1);
            if (typeof window.syncVideoRoomListener === 'function') window.syncVideoRoomListener();

            const targetId = target ? target.id : 'remote';
            window.startWebRTC(true, targetId, isVideo);
        }
        else if (sig.type === 'missed') {
            firebase.database().ref(mySignalPath + '/' + snap.key).remove();
            if (age > 15000) return;

            window.hideCallModal();
            window.stopAllRings();
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


// ==========================================
// 3. СТАБИЛЬНЫЕ РУБИЛЬНИКИ КАМЕРЫ И МИКРОФОНА
// ==========================================

window.toggleMyAudio = async function() {
    if (window._isTogglingAudio) return;
    window._isTogglingAudio = true;

    const nextMuted = !window.isMyMicMuted;
    try {
        if (!nextMuted) {
            if (window.audioRoomMicActive && typeof window.stopAudioRoomMic === 'function') {
                await window.stopAudioRoomMic(true);
            }
            if (window.videoRoomMicActive && typeof window.stopVideoRoomMic === 'function') {
                await window.stopVideoRoomMic(true);
            }
            if (window._agoraPausedForTranslation) {
                window._agoraPausedForTranslation = false;
                const restoreRemote = Boolean(window._prevRemoteMicMuted);
                if (window.remoteAgoraUser && window.remoteAgoraUser.audioTrack) {
                    try { window.remoteAgoraUser.audioTrack.setVolume(restoreRemote ? 0 : 100); } catch (e) {}
                }
                window.updateRemoteMicToggleUI(restoreRemote);
            }
        }

        if (window.localAudioTrack) {
            try {
                await window.localAudioTrack.setEnabled(!nextMuted);
            } catch (err) {
                await window.localAudioTrack.setMuted(nextMuted);
            }
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

    if (window.currentActiveCallType !== 'video') {
        window.applyCallRoomModeUI(false);
        window.updateCamToggleUI(true);
        return;
    }

    window._isTogglingCam = true;
    const nextMuted = !window.isMyCamMuted;

    try {
        if (!nextMuted && !window.localVideoTrack && window.agoraClient && typeof AgoraRTC !== 'undefined') {
            window.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
            await window.agoraClient.publish([window.localVideoTrack]);
            window.setLocalVideoVisible(true, window.localVideoTrack);
            window.updateCamToggleUI(false);
            return;
        }

        if (window.localVideoTrack) {
            try {
                await window.localVideoTrack.setEnabled(!nextMuted);
            } catch (err) {
                await window.localVideoTrack.setMuted(nextMuted);
            }

            if (nextMuted) {
                window.setLocalVideoVisible(false);
            } else {
                window.setLocalVideoVisible(true, window.localVideoTrack);
            }
        } else {
            window.setLocalVideoVisible(false);
        }

        window.updateCamToggleUI(nextMuted);
    } catch (error) {
        console.error("Camera toggle error:", error);
    } finally {
        window._isTogglingCam = false;
    }
};

window.toggleRemoteAudio = function() {
    const nextMuted = !window.isRemoteMicMuted;
    window.updateRemoteMicToggleUI(nextMuted);
    if (window.remoteAgoraUser && window.remoteAgoraUser.audioTrack) {
        try {
            window.remoteAgoraUser.audioTrack.setVolume(nextMuted ? 0 : 100);
        } catch (e) {}
    }
};

window.toggleRemoteCamera = function() {
    if (window.currentActiveCallType !== 'video') return;
    const nextMuted = !window.isRemoteCamMuted;
    window.updateRemoteCamToggleUI(nextMuted);
    if (nextMuted) {
        window.setRemoteVideoVisible(false);
    } else if (window.remoteAgoraUser && window.remoteAgoraUser.videoTrack) {
        window.setRemoteVideoVisible(true, window.remoteAgoraUser.videoTrack);
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
        fromFlag: window.myProfileInfo.flag || '',
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
    const flag = window._escapeCallsHtml(data.fromFlag || '');
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
        flag: info.fromFlag || ''
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
        fromFlag: window.myProfileInfo.flag || '',
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
    const flag = window._escapeCallsHtml(data.fromFlag || '');
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
        flag: info.fromFlag || ''
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

// ==========================================
// ПРИВАТНЫЙ ЧАТ — ПОЛНОСТЬЮ ИЗОЛИРОВАННЫЙ МИР (js/language.js)
// Клавиатура, микрофон, независимая игра флагами, переводы и бегущая строка
// ==========================================

const PRIV_LANG_MAP = {
    en: ['gb', '🇬🇧'], kk: ['kz', '🇰🇿'], ru: ['ru', '🇷🇺'], az: ['az', '🇦🇿'],
    de: ['de', '🇩🇪'], tr: ['tr', '🇹🇷'], ar: ['ae', '🇦🇪'], it: ['it', '🇮🇹'],
    es: ['es', '🇪🇸'], fr: ['fr', '🇫🇷'], pt: ['pt', '🇵🇹'], ja: ['jp', '🇯🇵'], zh: ['cn', '🇨🇳']
};

const PRIV_SPEECH_LOCALE = {
    en: 'en-US', ru: 'ru-RU', az: 'az-AZ', tr: 'tr-TR', de: 'de-DE', kk: 'kk-KZ',
    ar: 'ar-AE', it: 'it-IT', es: 'es-ES', fr: 'fr-FR', pt: 'pt-PT', ja: 'ja-JP', zh: 'zh-CN'
};

function privNormLang(code) {
    if (!code || code === 'auto' || code === 'un') return null;
    let c = String(code).substring(0, 2).toLowerCase();
    const fix = { kz: 'kk', cn: 'zh', jp: 'ja', ae: 'ar', us: 'en', gb: 'en' };
    return fix[c] || c;
}

function getPrivateRoomId() {
    const r = window.currentRoomId || '';
    if (!r || r === 'global' || r === 'video_room_global' || r === 'private_ai_bot' || r.startsWith('private_me_')) {
        return null;
    }
    return r;
}

function getPrivateTargetUser() {
    if (window.currentTargetUser && window.currentTargetUser.id) return window.currentTargetUser;

    // Автовосстановление собеседника по ID приватной комнаты
    const roomId = getPrivateRoomId();
    if (!roomId || !roomId.startsWith('private_') || !window.myProfileInfo) return null;
    const myId = String(window.myProfileInfo.id);
    const parts = roomId.replace('private_', '').split('_');
    const otherId = parts.find(id => String(id) !== myId);
    if (!otherId || !Array.isArray(window.participants)) return null;

    const found = window.participants.find(p => String(p.id) === String(otherId));
    if (found) {
        window.currentTargetUser = { ...found };
        return window.currentTargetUser;
    }
    return null;
}

function getMyPrivateNativeLang() {
    if (window.myProfileInfo) {
        if (typeof window.getLangByFlag === 'function') {
            const byFlag = privNormLang(window.getLangByFlag(window.myProfileInfo.flagCode, window.myProfileInfo.flag));
            if (byFlag) return byFlag;
        }
        if (typeof window.getSmartLang === 'function') {
            const smart = privNormLang(window.getSmartLang(window.myProfileInfo));
            if (smart) return smart;
        }
    }
    return 'en';
}

function getTargetPrivateLang(targetUser) {
    if (!targetUser) return getMyPrivateNativeLang();
    const liveLang = privNormLang(targetUser.langCode);
    if (liveLang) return liveLang;
    if (typeof window.getLangByFlag === 'function') {
        const byFlag = privNormLang(window.getLangByFlag(targetUser.flagCode, targetUser.flag));
        if (byFlag) return byFlag;
    }
    if (typeof window.getSmartLang === 'function') {
        const smart = privNormLang(window.getSmartLang(targetUser));
        if (smart) return smart;
    }
    return 'en';
}

function getPrivateReadLang(roomId) {
    const manualRead = roomId ? privNormLang(localStorage.getItem('hf_priv_read_lang_' + roomId)) : null;
    return manualRead || getMyPrivateNativeLang();
}

async function privTranslateText(text, targetLang) {
    const clean = (text || '').trim();
    const tl = privNormLang(targetLang);
    if (!clean || !tl) return clean;
    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(clean)}`);
        const data = await res.json();
        if (data && data[0]) {
            const joined = data[0].map(s => (s && s[0]) ? s[0] : '').join('');
            if (joined) return joined;
        }
    } catch (e) {}
    return clean;
}

// ==========================================
// 1. МЕНЮ ЯЗЫКА АВАТАРА И МИКРОФОНА (ТОЛЬКО ПРИВАТ)
// ==========================================
window.openPrivateLangModal = function() {
    const roomId = getPrivateRoomId();
    if (!roomId) return;
    const listContainer = document.getElementById('personal-lang-list');
    if (!listContainer) return;

    const targetUser = getPrivateTargetUser();
    const roomLabel = targetUser ? ('👤 ' + (targetUser.name || 'Private').split(' ')[0]) : '🔒 Private Chat';
    const currentPref = localStorage.getItem('hf_priv_avatar_lang_' + roomId) || 'auto';

    const langs = [
        { code: 'auto', name: '🤖 Auto (Profile)', flag: '🌐' }, { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'kk', name: 'Қазақша', flag: '🇰🇿' }, { code: 'pt', name: 'Português', flag: '🇵🇹' },
        { code: 'ru', name: 'Русский', flag: '🇷🇺' }, { code: 'az', name: 'Azərbaycanca', flag: '🇦🇿' },
        { code: 'de', name: 'Deutsch', flag: '🇩🇪' }, { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
        { code: 'ar', name: 'العربية', flag: '🇦🇪' }, { code: 'it', name: 'Italiano', flag: '🇮🇹' },
        { code: 'es', name: 'Español', flag: '🇪🇸' }, { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'ja', name: '日本語', flag: '🇯🇵' }, { code: 'zh', name: '中文', flag: '🇨🇳' }
    ];

    let html = `<div class="text-[0.7rem] text-[#00a884] mb-3 text-center uppercase tracking-widest border-b border-[#2a3942] pb-2">Settings strictly for:<br><b class="text-white text-sm">${roomLabel}</b></div>`;
    langs.forEach(l => {
        const isActive = (currentPref === l.code) ? 'border-[#00a884] bg-[#202c33]' : 'border-[#2a3942] bg-[#111b21]';
        html += `<div onclick="window.savePrivateAvatarLang('${l.code}', '${roomId}')" class="flex items-center p-3 rounded-xl border ${isActive} cursor-pointer mb-2 hover:border-[#00a884] transition shadow-sm"><span class="text-white font-bold text-[0.9rem] flex gap-3 items-center"><span class="text-xl">${l.flag}</span> ${l.name}</span></div>`;
    });

    listContainer.innerHTML = html;
    document.getElementById('personal-lang-modal')?.classList.add('active');
};

window.savePrivateAvatarLang = function(langCode, roomId) {
    const rId = roomId || getPrivateRoomId();
    if (!rId) return;

    if (langCode === 'auto') {
        localStorage.removeItem('hf_priv_avatar_lang_' + rId);
        const micFallback = localStorage.getItem('hf_priv_mic_lang_' + rId);
        if (micFallback) localStorage.setItem('hf_priv_read_lang_' + rId, micFallback);
        else localStorage.removeItem('hf_priv_read_lang_' + rId);
    } else {
        localStorage.setItem('hf_priv_avatar_lang_' + rId, langCode);
        localStorage.setItem('hf_priv_read_lang_' + rId, langCode);
    }

    document.getElementById('personal-lang-modal')?.classList.remove('active');
    if (window.showToast) window.showToast("Language Saved", "Applied strictly to this Private Chat.", "", "");
};

window.savePrivateMicLang = function(val) {
    const roomId = getPrivateRoomId();
    if (!roomId) return;

    if (!val || val === 'auto') {
        localStorage.removeItem('hf_priv_mic_lang_' + roomId);
        const avatarFallback = localStorage.getItem('hf_priv_avatar_lang_' + roomId);
        if (avatarFallback) localStorage.setItem('hf_priv_read_lang_' + roomId, avatarFallback);
        else localStorage.removeItem('hf_priv_read_lang_' + roomId);
    } else {
        localStorage.setItem('hf_priv_mic_lang_' + roomId, val);
        localStorage.setItem('hf_priv_read_lang_' + roomId, val);
    }

    if (window.showToast) window.showToast("Mic Language", "Saved strictly for this Private Chat", "", "");
};

window.syncPrivateMicLangUI = function() {
    const roomId = getPrivateRoomId();
    const sel = document.getElementById('plus-mic-lang');
    if (!sel || !roomId) return;
    sel.value = localStorage.getItem('hf_priv_mic_lang_' + roomId) || 'auto';
};

// ==========================================
// 2. ОТПРАВКА С КЛАВИАТУРЫ (КАНАЛ АВАТАРА)
// ==========================================
window.sendPrivateMsg = async function() {
    const roomId = getPrivateRoomId();
    if (!roomId) return;

    const inputField = document.getElementById('chat-input');
    if (!inputField) return;
    const rawText = inputField.value.trim();
    if (!rawText) return;
    inputField.value = '';

    // Канал клавиатуры слушает ТОЛЬКО hf_priv_avatar_lang_<roomId>
    const manualLang = privNormLang(localStorage.getItem('hf_priv_avatar_lang_' + roomId));
    const myActiveLang = manualLang || getMyPrivateNativeLang();

    const safeId = (window.myProfileInfo && window.myProfileInfo.id) ? window.myProfileInfo.id : 'guest';
    const safeName = window.myUsername || 'User';
    const safePhoto = (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : 'https://ui-avatars.com/api/?name=U';

    let activeFlag = (window.myProfileInfo && window.myProfileInfo.flag) ? window.myProfileInfo.flag : '🌐';
    let activeFlagCode = (window.myProfileInfo && window.myProfileInfo.flagCode) ? window.myProfileInfo.flagCode : 'un';

    let myBaseText = rawText;

    if (manualLang) {
        if (PRIV_LANG_MAP[manualLang]) {
            activeFlagCode = PRIV_LANG_MAP[manualLang][0];
            activeFlag = PRIV_LANG_MAP[manualLang][1];
        }
        myBaseText = await privTranslateText(rawText, manualLang);
    }

    // Зеркало: переводим для собеседника на его актуальный язык
    const targetUser = getPrivateTargetUser();
    const targetSendLang = getTargetPrivateLang(targetUser);
    let textToShip = myBaseText;

    if (targetSendLang && targetSendLang !== myActiveLang) {
        textToShip = await privTranslateText(myBaseText, targetSendLang);
    }

    try {
        firebase.database().ref(roomId).push({
            userId: safeId,
            name: safeName,
            text: textToShip || myBaseText || "Error",
            originalText: myBaseText || "Error",
            sessionId: window.mySessionId || 'sess',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            photo: safePhoto,
            flag: activeFlag,
            flagCode: activeFlagCode,
            langCode: myActiveLang,
            targetLang: targetSendLang,
            isConfMsg: false
        });
    } catch (err) {
        alert("Ошибка отправки в приват: " + err.message);
    }

    const chatMsgs = document.getElementById('chat-messages');
    if (chatMsgs) setTimeout(() => { chatMsgs.scrollTop = chatMsgs.scrollHeight; }, 100);
    if (targetUser && typeof window.sendPushToUser === 'function') {
        window.sendPushToUser(targetUser.id, safeName, textToShip);
    }
};

// ==========================================
// 3. ГОЛОСОВОЙ ВВОД ПРИВАТА (КАНАЛ МИКРОФОНА)
// ==========================================
window.startPrivateMic = async function(mode) {
    const roomId = getPrivateRoomId();
    if (!roomId) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Голосовой ввод не поддерживается браузером.");

    // Канал микрофона слушает ТОЛЬКО hf_priv_mic_lang_<roomId>
    const manualMicLang = privNormLang(localStorage.getItem('hf_priv_mic_lang_' + roomId));
    const isMicManual = Boolean(manualMicLang);
    const recBase = isMicManual ? manualMicLang : getMyPrivateNativeLang();

    const rec = new SpeechRecognition();
    rec.lang = PRIV_SPEECH_LOCALE[recBase] || recBase;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => { if (window.showToast) window.showToast("Mic Active", "Говорите...", "", ""); };
    rec.onerror = (e) => { if (window.showToast) window.showToast("Mic Error", e.error, "", ""); };

    rec.onresult = async (e) => {
        const recognized = e.results[0][0].transcript;
        window.speechRecognizedText = recognized;

        const spokenLangCode = privNormLang(rec.lang) || recBase;
        const targetUser = getPrivateTargetUser();
        const targetSendLang = getTargetPrivateLang(targetUser);

        if (window.showToast) window.showToast("Translating...", "Processing your voice...", "", "");
        let textToShip = recognized;

        if (targetSendLang && targetSendLang !== spokenLangCode) {
            textToShip = await privTranslateText(recognized, targetSendLang);
        }

        const safeId = (window.myProfileInfo && window.myProfileInfo.id) ? window.myProfileInfo.id : 'guest';
        const safeName = window.myUsername || 'User';
        const safePhoto = (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : 'https://ui-avatars.com/api/?name=U';

        let activeFlagCode = (window.myProfileInfo && window.myProfileInfo.flagCode) ? window.myProfileInfo.flagCode : 'un';
        let activeFlag = (window.myProfileInfo && window.myProfileInfo.flag) ? window.myProfileInfo.flag : '🌐';

        if (isMicManual && PRIV_LANG_MAP[spokenLangCode]) {
            activeFlagCode = PRIV_LANG_MAP[spokenLangCode][0];
            activeFlag = PRIV_LANG_MAP[spokenLangCode][1];
        }

        const msgPayload = {
            userId: safeId,
            name: safeName,
            text: textToShip || "...",
            originalText: recognized || "...",
            sessionId: window.mySessionId || 'sess',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            photo: safePhoto,
            flag: activeFlag,
            flagCode: activeFlagCode,
            langCode: spokenLangCode,
            targetLang: targetSendLang,
            isConfMsg: false
        };

        if (mode === 'ai-audio') msgPayload.isAIAudio = true;
        firebase.database().ref(roomId).push(msgPayload);

        if (targetUser && typeof window.sendPushToUser === 'function') {
            window.sendPushToUser(targetUser.id, safeName, textToShip);
        }
    };

    try { rec.start(); } catch (e) {}
};

// ==========================================
// 4. ПРИЁМ, ПЕРЕВОД И БЕГУЩАЯ СТРОКА ПРИВАТА
// ==========================================
window.handlePrivateMessage = async function(snapshot) {
    const data = snapshot.val();
    if (!data) return;
    if (data.isVoiceRoomMsg || data.isVideoRoomMsg || data.isConfMsg) return;

    const roomKey = snapshot.ref.parent ? snapshot.ref.parent.key : window.currentRoomId;
    if (roomKey !== window.currentRoomId) return;

    try {
        const deletedMsgs = JSON.parse(localStorage.getItem('hf_deleted_msgs') || '[]');
        if (deletedMsgs.includes(snapshot.key)) return;
    } catch (e) {}

    const chatMessages = document.getElementById('chat-messages');
    const myId = window.myProfileInfo ? String(window.myProfileInfo.id) : '';
    const isMe = data.sessionId === window.mySessionId || (myId && String(data.userId) === myId);
    const isHistory = data.timestamp && (Date.now() - data.timestamp) > 5000;

    // Динамическая память собеседника (ТОЛЬКО на живых сообщениях, не трогает window.participants)
    const targetUser = getPrivateTargetUser();
    if (!isMe && !isHistory && data.userId && targetUser && String(targetUser.id) === String(data.userId)) {
        if (data.langCode) targetUser.langCode = data.langCode;
        if (data.flag) targetUser.flag = data.flag;
        if (data.flagCode) targetUser.flagCode = data.flagCode;

        const titleEl = document.getElementById('chat-header-title');
        if (titleEl && data.flag) {
            titleEl.innerText = (targetUser.name || 'User').split(' ')[0] + " " + data.flag;
        }
    }

    const p = isMe
        ? window.myProfileInfo
        : ((window.participants || []).find(part => String(part.id) === String(data.userId)) || {
            id: data.userId,
            photo: data.photo || 'https://ui-avatars.com/api/?name=U',
            langCode: data.langCode || 'en',
            flag: data.flag || '🌐'
        });

    const myReadLang = getPrivateReadLang(roomKey);
    const manualRead = privNormLang(localStorage.getItem('hf_priv_read_lang_' + roomKey));
    const baseText = (data.originalText || data.text || '').trim();
    let finalTranslatedText = (data.text || baseText).trim();

    // Страховка на стороне получателя: гарантируем перевод на МОЙ активный язык (выбранный или родной)
    if (!isMe && !isHistory && baseText && !data.mediaUrl && !data.isTransfer && !data.isLocation && !data.isFile) {
        const senderLang = privNormLang(data.langCode);
        const shippedTargetLang = privNormLang(data.targetLang);

        if (senderLang && senderLang === myReadLang && !manualRead) {
            finalTranslatedText = baseText;
        } else if (shippedTargetLang !== myReadLang || (finalTranslatedText.toLowerCase() === baseText.toLowerCase() && senderLang !== myReadLang)) {
            finalTranslatedText = await privTranslateText(baseText, myReadLang);
        }
    }

    const isAppActiveAndInChat = (document.visibilityState === 'visible' && window.currentIndex === 0);
    const senderDisplayName = isMe ? window.myUsername : (data.name || 'User').split(' ')[0];

    if (!isMe && !isHistory) {
        if (data.isTransfer) { window.sndCash?.play().catch(() => {}); }
        else { window.sndMsg?.play().catch(() => {}); }

        let textPreview = finalTranslatedText;
        if (data.isAIAudio) textPreview = "🤖 AI Voice Message";
        if (data.mediaUrl) textPreview = data.mediaType === 'video' ? "📹 Video" : "🖼️ Photo";
        if (data.isLocation) textPreview = "📍 Shared Location";
        if (data.isTransfer) textPreview = "💸 Money Transfer Received!";

        if (!isAppActiveAndInChat && window.showToast) {
            window.showToast("Message | " + senderDisplayName, textPreview, p.photo, "");
        }
    }

    const messageGroup = document.createElement('div');
    messageGroup.className = "flex flex-col w-full mt-3 mb-2";
    const msgWrapper = document.createElement('div');
    msgWrapper.className = `flex gap-2 w-full ${isMe ? 'justify-end' : 'justify-start'}`;

    const displayFlag = data.flag || (isMe ? (window.myProfileInfo?.flag || '🌐') : (p.flag || '🌐'));
    const avatarClick = isMe ? `window.openPersonalLangModal()` : `window.openAvatarModal('${p.id}')`;
    const avatarHtml = `<div class="relative shrink-0 self-end cursor-pointer hover:scale-105 transition" onclick="${avatarClick}"><img src="${p.photo || 'https://ui-avatars.com/api/?name=U'}" class="w-8 h-8 rounded-full object-cover border border-[#2a3942] shadow-md"><span class="absolute -bottom-1 -right-1 text-[10px] bg-[#111b21] rounded-full px-[3px] shadow border border-[#2a3942] leading-none">${displayFlag}</span></div>`;

    let bubbleContent = `<div class="text-[#e9edef]">${baseText}</div>`;
    let bubbleClasses = `chat-bubble`;

    if (baseText && !data.mediaUrl && !data.isTransfer && !data.isLocation && !data.isAIAudio) {
        if (baseText.toLowerCase() !== finalTranslatedText.toLowerCase()) {
            if (isMe) {
                bubbleContent = `
                    <div class="text-[#e9edef]">${baseText}</div>
                    <div class="mt-1 pt-1 border-t border-white/20 text-[0.75rem] text-[#00a884] font-bold tracking-wide">➔ ${finalTranslatedText}</div>
                `;
            } else {
                bubbleContent = `
                    <div class="text-[#e9edef]">${finalTranslatedText}</div>
                    <div class="mt-1 pt-1 border-t border-white/20 text-[0.75rem] text-[#00a884] font-bold tracking-wide">➔ ${baseText}</div>
                `;
            }
        }
    }

    if (data.isAIAudio) {
        const playLang = isMe ? (privNormLang(data.langCode) || myReadLang) : myReadLang;
        const textToPlay = isMe ? baseText : finalTranslatedText;
        const safeEncodedText = encodeURIComponent(textToPlay || '').replace(/'/g, "%27");

        let audioBodyHtml = `<div class="text-[#e9edef]">${baseText}</div>`;
        if (baseText.toLowerCase() !== finalTranslatedText.toLowerCase()) {
            if (isMe) {
                audioBodyHtml = `
                    <div class="text-[#e9edef]">${baseText}</div>
                    <div class="mt-2 pt-1.5 border-t border-white/20 text-[0.75rem] text-yellow-400 font-bold tracking-wide">➔ ${finalTranslatedText}</div>
                `;
            } else {
                audioBodyHtml = `
                    <div class="text-[#e9edef]">${finalTranslatedText}</div>
                    <div class="mt-2 pt-1.5 border-t border-white/20 text-[0.75rem] text-[#00a884] font-bold tracking-wide">➔ ${baseText}</div>
                `;
            }
        }
        bubbleContent = `<div class="ai-audio-player" onclick="window.playAIVoice('${safeEncodedText}', '${playLang.substring(0, 2)}')"><i class="fa-solid fa-circle-play"></i><span>Play Voice</span></div><div style="font-size:0.85rem; margin-top:6px; opacity:0.95;">${audioBodyHtml}</div>`;
    } else if (data.mediaUrl) {
        const fileName = data.text ? data.text.replace('📄 Документ: ', '').replace('🖼️ Photo', 'Файл').replace('📹 Video', 'Видео') : 'Файл';
        if (data.mediaType === 'video' || data.mediaUrl.startsWith('data:video/')) {
            bubbleContent = `<video src="${data.mediaUrl}" controls class="max-w-[200px] sm:max-w-[250px] rounded-lg mt-1 border border-[#2a3942]"></video>`;
        } else if (data.mediaType === 'audio' || data.mediaUrl.startsWith('data:audio/')) {
            bubbleContent = `<audio src="${data.mediaUrl}" controls class="w-[200px] sm:w-[250px] mt-1 outline-none"></audio>`;
        } else if (data.mediaType === 'document' || data.mediaUrl.startsWith('data:application/') || data.mediaUrl.startsWith('data:text/')) {
            bubbleContent = `<div class="flex items-center gap-3 bg-[#111b21] p-3 rounded-lg border border-[#2a3942] mt-1 min-w-[200px]"><div class="w-10 h-10 rounded-full bg-[#202c33] flex items-center justify-center text-blue-400 shrink-0"><i class="fa-solid fa-file-arrow-down text-xl"></i></div><div class="flex flex-col overflow-hidden"><span class="text-white text-sm font-bold truncate max-w-[140px]">${fileName}</span><a href="${data.mediaUrl}" download="${fileName}" class="text-[0.7rem] text-[#00a884] font-bold mt-1 uppercase tracking-wide hover:text-white transition">Скачать</a></div></div>`;
        } else {
            bubbleContent = `<img src="${data.mediaUrl}" class="max-w-[200px] sm:max-w-[250px] rounded-lg mt-1 cursor-pointer border border-[#2a3942] hover:opacity-90 transition" onclick="window.openFullscreenImage(this.src)">`;
        }
        bubbleClasses = `chat-bubble !bg-[#202c33] !p-2`;
    } else if (data.isTransfer) {
        bubbleClasses = `chat-bubble !bg-[#0b141a] border border-[#00a884] shadow-[0_0_15px_rgba(0,168,132,0.3)] !p-0 overflow-hidden`;
        bubbleContent = `<div class="flex flex-col items-center p-4 min-w-[200px]"><div class="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center text-[#111b21] mb-2 shadow-lg"><i class="fa-solid fa-check text-2xl"></i></div><span class="text-[0.7rem] text-[#00a884] font-bold uppercase tracking-widest mb-1 text-center">${data.transferTypeLabel || 'Transfer'}</span><span class="text-2xl font-bold text-white mb-1">$${data.amount}</span><div class="w-full h-[1px] bg-[#2a3942] mb-2"></div><span class="text-xs text-[#8696a0]">To: <span class="text-white font-bold">${data.recName}</span></span></div>`;
    } else if (data.isLocation) {
        bubbleClasses = `chat-bubble !bg-[#0b141a] border border-[#00a884] shadow-[0_0_15px_rgba(0,168,132,0.3)] !p-0 overflow-hidden`;
        bubbleContent = `<div class="flex flex-col w-[200px] sm:w-[250px]"><iframe width="100%" height="150" frameborder="0" scrolling="no" src="${data.embedLink}" style="pointer-events: none;"></iframe><a href="${data.mapLink}" target="_blank" class="bg-[#202c33] p-2.5 text-center text-[0.8rem] text-blue-400 font-bold hover:bg-[#2a3942] transition flex items-center justify-center gap-2"><i class="fa-solid fa-map-location-dot"></i> Open in Maps</a></div>`;
    }

    msgWrapper.innerHTML = isMe
        ? `<div class="chat-bubble-wrapper outgoing items-end flex flex-col" data-id="${snapshot.key}"><div class="chat-sender-name">${senderDisplayName}</div><div class="${bubbleClasses}">${bubbleContent}</div></div>` + avatarHtml
        : avatarHtml + `<div class="chat-bubble-wrapper incoming items-start flex flex-col" data-id="${snapshot.key}"><div class="chat-sender-name">${senderDisplayName}</div><div class="${bubbleClasses}">${bubbleContent}</div></div>`;

    messageGroup.appendChild(msgWrapper);
    if (chatMessages) {
        chatMessages.appendChild(messageGroup);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Бегущая строка Приватного чата
    if (targetUser && !isHistory && !data.isTransfer && !data.mediaUrl && !data.isLocation && !data.isFile) {
        const mText = document.getElementById('chat-info-marquee');
        if (mText && window.isMarqueeEnabled !== false) {
            const receiverName = isMe ? (targetUser.name || 'User').split(' ')[0] : window.myUsername;
            let receiverFlag = '🌐';

            if (isMe) {
                receiverFlag = targetUser.flag || '🌐';
            } else if (manualRead && PRIV_LANG_MAP[manualRead]) {
                receiverFlag = PRIV_LANG_MAP[manualRead][1];
            } else {
                receiverFlag = window.myProfileInfo?.flag || '🌐';
            }

            let marqueeHtml = `<span class="text-white mr-2">${displayFlag} ${senderDisplayName}:</span> <span class="text-[#e9edef]">${baseText}</span>`;
            if (baseText.toLowerCase() !== finalTranslatedText.toLowerCase()) {
                marqueeHtml += ` &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; <span class="text-[#00a884] font-bold">${receiverFlag} ${receiverName}: ${finalTranslatedText}</span>`;
            }

            mText.innerHTML = marqueeHtml;
            mText.style.animation = 'none';
            void mText.offsetWidth;
            mText.style.animation = null;
        }
    }
};

// ==========================================
// 5. ПЕРЕВОДЫ БАННЕРОВ ПОЧТЫ И ПРОПУЩЕННЫХ ВЫЗОВОВ (13 ЯЗЫКОВ)
// ==========================================
window.HF_BANNER_I18N = {
    en: {
        new_mail_title: 'NEW EMAIL',
        new_mail_text: 'You have a new email',
        btn_open_mail: 'Open',
        missed_audio_title: 'MISSED AUDIO CALL',
        missed_audio_text: 'Missed audio call from',
        missed_video_title: 'MISSED VIDEO CALL',
        missed_video_text: 'Missed video call from',
        btn_later: 'Later',
        btn_callback: 'Call back'
    },
    ru: {
        new_mail_title: 'НОВОЕ ПИСЬМО',
        new_mail_text: 'Вам пришло новое письмо',
        btn_open_mail: 'Открыть',
        missed_audio_title: 'ПРОПУЩЕННЫЙ АУДИОВЫЗОВ',
        missed_audio_text: 'Пропущенный аудиозвонок от',
        missed_video_title: 'ПРОПУЩЕННЫЙ ВИДЕОВЫЗОВ',
        missed_video_text: 'Пропущенный видеозвонок от',
        btn_later: 'Позже',
        btn_callback: 'Перезвонить'
    },
    az: {
        new_mail_title: 'YENİ MƏKTUB',
        new_mail_text: 'Yeni e-poçtunuz var',
        btn_open_mail: 'Açmaq',
        missed_audio_title: 'BURAXILMIŞ AUDİO ZƏNG',
        missed_audio_text: 'Buraxılmış audio zəng:',
        missed_video_title: 'BURAXILMIŞ VİDEO ZƏNG',
        missed_video_text: 'Buraxılmış video zəng:',
        btn_later: 'Sonra',
        btn_callback: 'Geri zəng et'
    },
    kk: {
        new_mail_title: 'ЖАҢА ХАТ',
        new_mail_text: 'Сізге жаңа хат келді',
        btn_open_mail: 'Ашу',
        missed_audio_title: 'ҚАБЫЛДАНБАҒАН АУДИО ҚОҢЫРАУ',
        missed_audio_text: 'Қабылданбаған аудио қоңырау:',
        missed_video_title: 'ҚАБЫЛДАНБАҒАН БЕЙНЕ ҚОҢЫРАУ',
        missed_video_text: 'Қабылданбаған бейне қоңырау:',
        btn_later: 'Кейінірек',
        btn_callback: 'Қайта қоңырау'
    },
    tr: {
        new_mail_title: 'YENİ E-POSTA',
        new_mail_text: 'Yeni bir e-postanız var',
        btn_open_mail: 'Aç',
        missed_audio_title: 'CEVAPSIZ SESLİ ARAMA',
        missed_audio_text: 'Cevapsız sesli arama:',
        missed_video_title: 'CEVAPSIZ GÖRÜNTÜLÜ ARAMA',
        missed_video_text: 'Cevapsız görüntülü arama:',
        btn_later: 'Sonra',
        btn_callback: 'Geri ara'
    },
    de: {
        new_mail_title: 'NEUE E-MAIL',
        new_mail_text: 'Sie haben eine neue E-Mail',
        btn_open_mail: 'Öffnen',
        missed_audio_title: 'VERPASSTER AUDIOANRUF',
        missed_audio_text: 'Verpasster Audioanruf von',
        missed_video_title: 'VERPASSTER VIDEOANRUF',
        missed_video_text: 'Verpasster Videoanruf von',
        btn_later: 'Später',
        btn_callback: 'Zurückrufen'
    },
    ar: {
        new_mail_title: 'بريد جديد',
        new_mail_text: 'لديك رسالة بريد جديدة',
        btn_open_mail: 'فتح',
        missed_audio_title: 'مكالمة صوتية فائتة',
        missed_audio_text: 'مكالمة صوتية فائتة من',
        missed_video_title: 'مكالمة فيديو فائتة',
        missed_video_text: 'مكالمة فيديو فائتة من',
        btn_later: 'لاحقاً',
        btn_callback: 'معاودة الاتصال'
    },
    it: {
        new_mail_title: 'NUOVA EMAIL',
        new_mail_text: 'Hai una nuova email',
        btn_open_mail: 'Apri',
        missed_audio_title: 'CHIAMATA AUDIO PERSA',
        missed_audio_text: 'Chiamata audio persa da',
        missed_video_title: 'VIDEOCHIAMATA PERSA',
        missed_video_text: 'Videochiamata persa da',
        btn_later: 'Più tardi',
        btn_callback: 'Richiama'
    },
    es: {
        new_mail_title: 'NUEVO CORREO',
        new_mail_text: 'Tienes un nuevo correo',
        btn_open_mail: 'Abrir',
        missed_audio_title: 'LLAMADA DE AUDIO PERDIDA',
        missed_audio_text: 'Llamada de audio perdida de',
        missed_video_title: 'VIDEOLLAMADA PERDIDA',
        missed_video_text: 'Videollamada perdida de',
        btn_later: 'Más tarde',
        btn_callback: 'Devolver llamada'
    },
    fr: {
        new_mail_title: 'NOUVEL E-MAIL',
        new_mail_text: 'Vous avez un nouvel e-mail',
        btn_open_mail: 'Ouvrir',
        missed_audio_title: 'APPEL AUDIO MANQUÉ',
        missed_audio_text: 'Appel audio manqué de',
        missed_video_title: 'APPEL VIDÉO MANQUÉ',
        missed_video_text: 'Appel vidéo manqué de',
        btn_later: 'Plus tard',
        btn_callback: 'Rappeler'
    },
    pt: {
        new_mail_title: 'NOVO E-MAIL',
        new_mail_text: 'Você tem um novo e-mail',
        btn_open_mail: 'Abrir',
        missed_audio_title: 'CHAMADA DE ÁUDIO PERDIDA',
        missed_audio_text: 'Chamada de áudio perdida de',
        missed_video_title: 'CHAMADA DE VÍDEO PERDIDA',
        missed_video_text: 'Chamada de vídeo perdida de',
        btn_later: 'Mais tarde',
        btn_callback: 'Retornar'
    },
    ja: {
        new_mail_title: '新着メール',
        new_mail_text: '新しいメールが届きました',
        btn_open_mail: '開く',
        missed_audio_title: '不在着信（音声）',
        missed_audio_text: '音声通話の不在着信:',
        missed_video_title: '不在着信（ビデオ）',
        missed_video_text: 'ビデオ通話の不在着信:',
        btn_later: 'あとで',
        btn_callback: '折り返す'
    },
    zh: {
        new_mail_title: '新邮件',
        new_mail_text: '您有一封新邮件',
        btn_open_mail: '打开',
        missed_audio_title: '未接语音来电',
        missed_audio_text: '未接语音来电:',
        missed_video_title: '未接视频来电',
        missed_video_text: '未接视频来电:',
        btn_later: '稍后',
        btn_callback: '回拨'
    }
};

window.mergeBannerI18n = function() {
    window.i18n = window.i18n || {};
    Object.keys(window.HF_BANNER_I18N).forEach((code) => {
        window.i18n[code] = Object.assign({}, window.i18n[code] || {}, window.HF_BANNER_I18N[code]);
    });
};

window.mergeBannerI18n();
document.addEventListener('DOMContentLoaded', window.mergeBannerI18n);
window.addEventListener('load', window.mergeBannerI18n);

// ==========================================
// 1. БАЗОВЫЙ ЯЗЫК ПРИЛОЖЕНИЯ И ПРОФИЛЯ
// ==========================================
window.changeAppLanguage = function(langCode) {
    localStorage.setItem('hf_app_lang', langCode);

    if (langCode === 'auto') {
        let smartLang = null;
        if (window.myProfileInfo) {
            let rawPhone = window.myProfileInfo.phone;
            let phone = (rawPhone !== null && rawPhone !== undefined) ? String(rawPhone).replace(/\s+/g, '') : "";
            let flag = window.myProfileInfo.flagCode ? String(window.myProfileInfo.flagCode).toLowerCase() : "un";

            if (flag === 'kz') smartLang = 'kk';
            else if (phone.startsWith('+7')) smartLang = 'ru';
            else if (phone.startsWith('+994')) smartLang = 'az';
            else if (phone.startsWith('+49')) smartLang = 'de';
            else if (phone.startsWith('+90')) smartLang = 'tr';
            else if (phone.startsWith('+39')) smartLang = 'it';
            else if (phone.startsWith('+33')) smartLang = 'fr';
            else if (phone.startsWith('+34')) smartLang = 'es';
            else if (phone.startsWith('+81')) smartLang = 'ja';
            else if (phone.startsWith('+86')) smartLang = 'zh';
            else if (phone.startsWith('+351')) smartLang = 'pt';
            else if (phone.startsWith('+1') || phone.startsWith('+44')) smartLang = 'en';
            else if (phone.startsWith('+971')) smartLang = 'ar';
            else if (flag !== 'un') {
                const flagToLang = { 'ru':'ru', 'kz':'kk', 'az':'az', 'it':'it', 'de':'de', 'fr':'fr', 'jp':'ja', 'es':'es', 'cn':'zh', 'pt':'pt', 'gb':'en', 'us':'en', 'ae':'ar', 'tr':'tr' };
                if (flagToLang[flag]) smartLang = flagToLang[flag];
            }
        }
        window.appLang = smartLang || navigator.language.slice(0, 2) || 'en';
    } else {
        window.appLang = langCode;
    }

    if (typeof window.applyTranslations === 'function') window.applyTranslations();
    if (typeof window.closeDropdown === 'function') window.closeDropdown();
    const langSelect = document.getElementById('app-lang-select');
    if (langSelect) langSelect.value = langCode;
};

if (!window.profileLangHooked) {
    const originalSaveProfile = window.saveProfileData;
    window.saveProfileData = function() {
        if (originalSaveProfile) originalSaveProfile();
        let currentSetting = localStorage.getItem('hf_app_lang') || 'auto';
        if (currentSetting === 'auto') {
            setTimeout(() => { window.changeAppLanguage('auto'); }, 300);
        }
    };
    window.profileLangHooked = true;
}

setTimeout(() => {
    let saved = localStorage.getItem('hf_app_lang') || 'auto';
    window.changeAppLanguage(saved);
}, 1000);

window.getLangByFlag = function(flagCode, flagEmoji) {
    const codeMap = { 'ru':'ru', 'kz':'kk', 'az':'az', 'it':'it', 'de':'de', 'fr':'fr', 'jp':'ja', 'es':'es', 'cn':'zh', 'pt':'pt', 'gb':'en', 'us':'en', 'ae':'ar', 'tr':'tr' };
    const emojiMap = { '🇷🇺':'ru', '🇰🇿':'kk', '🇦🇿':'az', '🇮🇹':'it', '🇩🇪':'de', '🇫🇷':'fr', '🇯🇵':'ja', '🇪🇸':'es', '🇨🇳':'zh', '🇵🇹':'pt', '🇬🇧':'en', '🇺🇸':'en', '🇦🇪':'ar', '🇹🇷':'tr' };
    let c = flagCode ? String(flagCode).toLowerCase().trim() : '';
    if (c && c !== 'un' && codeMap[c]) return codeMap[c];
    if (flagEmoji && flagEmoji !== '🌐' && emojiMap[flagEmoji]) return emojiMap[flagEmoji];
    return null;
};

window.getSmartLang = function(userData) {
    if (!userData) return navigator.language ? navigator.language.slice(0, 2) : 'en';

    if (typeof userData === 'object') {
        let langFromFlag = window.getLangByFlag(userData.flagCode, userData.flag);
        if (langFromFlag) return langFromFlag;
    }

    let langPref = typeof userData === 'object' ? userData.langCode : null;
    if (langPref === 'kz') langPref = 'kk';
    if (langPref === 'cn') langPref = 'zh';
    if (langPref === 'jp') langPref = 'ja';
    if (langPref === 'ae') langPref = 'ar';
    if (langPref && langPref !== 'auto' && langPref !== 'un') return langPref;

    let rawPhone = typeof userData === 'object' ? userData.phone : userData;
    let phone = (rawPhone !== null && rawPhone !== undefined) ? String(rawPhone).replace(/\s+/g, '') : "";

    if (phone.startsWith('+7')) return 'ru';
    if (phone.startsWith('+994')) return 'az';
    if (phone.startsWith('+90')) return 'tr';
    if (phone.startsWith('+39')) return 'it';
    if (phone.startsWith('+49')) return 'de';
    if (phone.startsWith('+33')) return 'fr';
    if (phone.startsWith('+81')) return 'ja';
    if (phone.startsWith('+34')) return 'es';
    if (phone.startsWith('+86')) return 'zh';
    if (phone.startsWith('+351')) return 'pt';
    if (phone.startsWith('+1') || phone.startsWith('+44')) return 'en';
    if (phone.startsWith('+971')) return 'ar';

    return navigator.language ? navigator.language.slice(0, 2) : 'en';
};

// ==========================================
// 1.5. ЖИВАЯ СИНХРОНИЗАЦИЯ ФЛАГОВ И ЗЕРКАЛЬНЫЙ ПАКЕТ (ГЛОБАЛЬНЫЙ ЧАТ)
// Два полностью раздельных канала: avatar (клавиатура) и mic (микрофон)
// ==========================================
window.GLOBAL_LANG_MAP = {
    en: ['gb','🇬🇧'], kk: ['kz','🇰🇿'], ru: ['ru','🇷🇺'], az: ['az','🇦🇿'],
    de: ['de','🇩🇪'], tr: ['tr','🇹🇷'], ar: ['ae','🇦🇪'], it: ['it','🇮🇹'],
    es: ['es','🇪🇸'], fr: ['fr','🇫🇷'], pt: ['pt','🇵🇹'], ja: ['jp','🇯🇵'], zh: ['cn','🇨🇳']
};

window.normLangCode = function(code) {
    if (!code || code === 'auto' || code === 'un') return null;
    let c = String(code).substring(0, 2).toLowerCase();
    const fix = { kz:'kk', cn:'zh', jp:'ja', ae:'ar', us:'en', gb:'en' };
    return fix[c] || c;
};

// Живая карта переключённых языков всех участников: { [userId]: { avatar: {...}, mic: {...} } }
window.globalLiveLangs = {};
window.globalLiveLangsLoaded = false;

window.syncMyGlobalChannelLang = function(channel, forcedLang) {
    if (typeof firebase === 'undefined' || !window.myProfileInfo || !window.myProfileInfo.id) return;
    if (channel !== 'avatar' && channel !== 'mic') return;

    const myId = String(window.myProfileInfo.id);
    const storageKey = (channel === 'mic') ? 'hf_global_mic_lang' : 'hf_global_avatar_lang';
    const activeLang = forcedLang !== undefined
        ? window.normLangCode(forcedLang)
        : window.normLangCode(localStorage.getItem(storageKey));

    const userRef = firebase.database().ref('global_active_langs/' + myId);
    const chRef = userRef.child(channel);

    if (activeLang && window.GLOBAL_LANG_MAP[activeLang]) {
        const payload = {
            langCode: activeLang,
            flagCode: window.GLOBAL_LANG_MAP[activeLang][0],
            flag: window.GLOBAL_LANG_MAP[activeLang][1],
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
        if (!window.globalLiveLangs[myId]) window.globalLiveLangs[myId] = {};
        window.globalLiveLangs[myId][channel] = payload;
        chRef.set(payload).catch(() => {});
        try { userRef.onDisconnect().remove(); } catch (e) {}
    } else {
        if (window.globalLiveLangs[myId]) delete window.globalLiveLangs[myId][channel];
        chRef.remove().catch(() => {});
    }
};

window.initGlobalLiveLangSync = function() {
    if (typeof firebase === 'undefined' || !window.myProfileInfo || !window.myProfileInfo.id) {
        setTimeout(window.initGlobalLiveLangSync, 400);
        return;
    }
    if (!window.globalLiveLangListenerBound) {
        window.globalLiveLangListenerBound = true;
        firebase.database().ref('global_active_langs').on('value', (snap) => {
            window.globalLiveLangs = snap.val() || {};
            window.globalLiveLangsLoaded = true;
        });
    }
    if (!window.currentRoomId || window.currentRoomId === 'global') {
        window.syncMyGlobalChannelLang('avatar');
        window.syncMyGlobalChannelLang('mic');
    }
};

window.addEventListener('load', () => { setTimeout(window.initGlobalLiveLangSync, 500); });

// Сбор ОДНОГО готового зеркального пакета при отправке (переводится один раз на стороне отправителя)
window.buildGlobalMirrorPacket = async function(origText, senderLang, channel, senderId) {
    const cleanText = (origText || '').trim();
    if (!cleanText) return { mirrorFan: [], mirrorMarquee: '' };

    // Страховка: если живая таблица флагов ещё не успела подгрузиться, забираем её разово
    if (!window.globalLiveLangsLoaded && typeof firebase !== 'undefined') {
        try {
            const snap = await firebase.database().ref('global_active_langs').once('value');
            window.globalLiveLangs = snap.val() || {};
            window.globalLiveLangsLoaded = true;
        } catch (e) {}
    }

    const targetUsers = [];
    const neededLangs = new Set();

    (window.participants || []).filter(part =>
        part && part.id !== 'ai' && String(part.id) !== String(senderId)
    ).forEach(member => {
        const memberLiveAll = window.globalLiveLangs ? window.globalLiveLangs[String(member.id)] : null;
        const live = memberLiveAll ? memberLiveAll[channel] : null;

        const memberFlag = (live && live.flag) ? live.flag : (member.flag || '🌐');
        const memberLang = (live && live.langCode)
            ? window.normLangCode(live.langCode)
            : window.normLangCode(window.getLangByFlag(member.flagCode, member.flag) || window.getSmartLang(member));

        if (memberLang && memberLang !== 'un') {
            targetUsers.push({
                userId: String(member.id),
                code: memberLang,
                flag: memberFlag,
                photo: member.photo || 'https://ui-avatars.com/api/?name=U'
            });
            if (memberLang !== senderLang) {
                neededLangs.add(memberLang);
            }
        }
    });

    const transCache = {};
    if (senderLang) transCache[senderLang] = cleanText;

    for (let langCode of neededLangs) {
        try {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${langCode}&dt=t&q=${encodeURIComponent(cleanText)}`);
            const resData = await res.json();
            transCache[langCode] = (resData && resData[0])
                ? resData[0].map(s => (s && s[0]) ? s[0] : '').join('')
                : cleanText;
            await new Promise(resolve => setTimeout(resolve, 120));
        } catch (e) {
            transCache[langCode] = cleanText;
        }
    }

    const mirrorFan = [];
    const marqueeAddedLangs = new Set();
    let mirrorMarquee = '';

    targetUsers.forEach(u => {
        const translatedText = (transCache[u.code] || cleanText).trim();
        if (translatedText.toLowerCase() === cleanText.toLowerCase()) return;

        mirrorFan.push({
            userId: u.userId,
            code: u.code,
            flag: u.flag,
            photo: u.photo,
            text: translatedText
        });

        if (!marqueeAddedLangs.has(u.code)) {
            marqueeAddedLangs.add(u.code);
            mirrorMarquee += `${u.flag} ${translatedText}        `;
        }
    });

    return {
        mirrorFan,
        mirrorMarquee: mirrorMarquee.trim() || cleanText
    };
};

// ==========================================
// 2. САЙДБАР И ПЕРЕКЛЮЧЕНИЕ КОМНАТ
// ==========================================
window.updateRoomMarquee = function() {
    const mText = document.getElementById('chat-info-marquee');
    if (!mText) return;
    if (window.currentRoomId === 'global' || window.currentRoomId === 'video_room_global') {
        mText.innerText = "🌍 Global Chat • AI Translation System Active...";
    } else if (window.currentTargetUser) {
        mText.innerText = `🔒 Private Room with ${window.currentTargetUser.name.split(' ')[0]} • AI Translation Active...`;
    }
};

window.renderSidebar = function() {
    const chatSidebar = document.getElementById('chat-sidebar');
    if (!chatSidebar) return;
    const welcomeImg = document.getElementById('welcome-user-photo');
    if (welcomeImg && window.myProfileInfo && window.myProfileInfo.photo) { welcomeImg.src = window.myProfileInfo.photo; }

    let sidebarHTML = `
        <div class="chat-contact ${window.currentRoomId === 'global' ? 'active-room' : ''}" onclick="window.switchChatRoom('global')">
            <div class="chat-contact-icon bg-[#005c4b] text-white flex justify-center items-center text-xl">🌍</div>
            <span class="chat-contact-name text-white">Global</span>
        </div>
        <div class="chat-contact ${window.currentRoomId === 'private_ai_bot' ? 'active-room' : ''}" onclick="window.switchChatRoom('ai')">
            <div class="chat-contact-icon bg-purple-900 text-white flex justify-center items-center text-xl">🤖</div>
            <span class="chat-contact-name text-[#a29bfe]">AI Bot</span>
        </div>
        <div class="chat-contact ${window.currentRoomId === ('private_me_' + window.myProfileInfo.id) ? 'active-room' : ''}" onclick="window.switchChatRoom('me')">
            <div class="chat-contact-icon" style="background-image: url('${window.myProfileInfo.photo}');">
                <img src="https://flagcdn.com/w20/${window.myProfileInfo.flagCode || 'un'}.png" class="absolute -bottom-1 -right-1 w-5 h-3.5 rounded-sm object-cover border border-[#111b21]">
            </div>
            <span class="chat-contact-name text-white">${window.myUsername}</span>
        </div>
    `;

    window.participants.filter(p => p.id !== 'ai').forEach(p => {
        let id1 = String(window.myProfileInfo.id); let id2 = String(p.id);
        let expectedId = (id1 < id2) ? ("private_" + id1 + "_" + id2) : ("private_" + id2 + "_" + id1);
        sidebarHTML += `
            <div class="chat-contact ${window.currentRoomId === expectedId ? 'active-room' : ''}" onclick="window.openAvatarModal('${p.id}', true)">
                <div class="chat-contact-icon" style="background-image: url('${p.photo}');">
                    <img src="https://flagcdn.com/w20/${p.flagCode || 'un'}.png" class="absolute -bottom-1 -right-1 w-5 h-3.5 rounded-sm object-cover border border-[#111b21]">
                </div>
                <span class="chat-contact-name text-white">${(p.name || 'User').split(' ')[0]}</span>
            </div>
        `;
    });
    chatSidebar.innerHTML = sidebarHTML;
};

window.switchChatRoom = function(targetId) {
    if (window.activeChatListener) { firebase.database().ref(window.currentRoomId).off("child_added", window.activeChatListener); }
    if (window.currentRoomId) { firebase.database().ref(window.currentRoomId).off("child_added"); }
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) chatMessages.innerHTML = '';

    // Сброс временных флагов Глобальной при выходе из неё
    if (window.currentRoomId === 'global' && targetId !== 'global') {
        localStorage.removeItem('hf_global_avatar_lang');
        localStorage.removeItem('hf_global_mic_lang');
        window.syncMyGlobalChannelLang('avatar', null);
        window.syncMyGlobalChannelLang('mic', null);
    }

    window.currentTargetUser = null;
    let headerTitle = "Global Chat"; let headerRoomId = "global";

    if (targetId === 'video_room_global') {
        window.currentRoomId = "video_room_global"; headerTitle = "Conference"; headerRoomId = window.currentRoomId;
    } else if (targetId === 'global') {
        window.currentRoomId = "global"; window.showToast("Global Chat", "🌍 International Public Room", "", "");
        window.initGlobalLiveLangSync();
    } else if (targetId === 'ai') {
        window.currentRoomId = "private_ai_bot"; headerTitle = "AI Assistant"; headerRoomId = window.currentRoomId;
        window.showToast("AI Assistant", "Powered by Gemini", "https://ui-avatars.com/api/?name=AI&background=6b21a8&color=fff", "");
    } else if (targetId === 'me') {
        window.currentRoomId = "private_me_" + window.myProfileInfo.id; headerTitle = "My Notes"; headerRoomId = window.currentRoomId;
        let myBio = window.myProfileInfo.profileBio ? `<span class="text-[#8696a0] mt-1 block italic border-t border-[#2a3942] pt-1">${window.myProfileInfo.profileBio}</span>` : "";
        let myLangs = window.myProfileInfo.profileLangs ? `🗣️ ${window.myProfileInfo.profileLangs}<br>` : "";
        let myEmail = window.myProfileInfo.email ? `✉️ ${window.myProfileInfo.email}<br>` : "";
        let infoHtml = `<b class="text-[#00a884] uppercase tracking-wider">${window.myProfileInfo.flag} ${window.myProfileInfo.country || 'Global'}</b><br><span class="text-[#e9edef] text-[0.7rem] block mt-1 leading-relaxed">${myEmail}${myLangs}</span>${myBio}`;
        window.showToast("My Notes", infoHtml, window.myProfileInfo.photo, window.myProfileInfo.phone || "");
    } else {
        const searchId = String(targetId);
        const targetUser = window.participants.find(p => String(p.id) === searchId);
        if (targetUser) {
            window.currentTargetUser = { ...targetUser };
            let id1 = String(window.myProfileInfo.id);
            let id2 = String(targetUser.id);
            window.currentRoomId = (id1 < id2) ? ("private_" + id1 + "_" + id2) : ("private_" + id2 + "_" + id1);
            headerTitle = (targetUser.name || 'User').split(' ')[0] + " " + targetUser.flag; headerRoomId = "Private Encrypted";
            let targetBio = targetUser.profileBio ? `<span class="text-[#8696a0] mt-1 block italic border-t border-[#2a3942] pt-1">${targetUser.profileBio}</span>` : "";
            let targetLangs = targetUser.profileLangs ? `🗣️ ${targetUser.profileLangs}<br>` : "";
            let targetEmail = targetUser.email ? `✉️ ${targetUser.email}<br>` : "";
            let infoHtml = `<b class="text-[#00a884] uppercase tracking-wider">${targetUser.flag} ${targetUser.country || 'Global'}</b><br><span class="text-[#e9edef] text-[0.7rem] block mt-1 leading-relaxed">${targetEmail}${targetLangs}</span>${targetBio}`;
            window.showToast((targetUser.name || 'User').split(' ')[0], infoHtml, targetUser.photo, targetUser.phone || "");
        }
    }
    const titleEl = document.getElementById('chat-header-title'); if (titleEl) titleEl.innerText = headerTitle;
    const roomEl = document.getElementById('chat-header-room'); if (roomEl) roomEl.innerText = "ID: " + headerRoomId;

    window.updateRoomMarquee();
    window.renderSidebar();

    window.activeChatListener = firebase.database().ref(window.currentRoomId).on("child_added", window.handleNewMessage);
    if (typeof window.syncMicLangUI === 'function') window.syncMicLangUI();
};

// ==========================================
// 3. ОТПРАВКА И ПРИЁМ СООБЩЕНИЙ (ЗЕРКАЛЬНОЕ КОПИРОВАНИЕ)
// ==========================================
window.isGeminiWaiting = false;

window.sendFirebaseMsg = async function() {
    if (window.currentIndex === 1) return; // Аудио / Видео комнаты — в своих файлах
    if (window.currentIndex === 2) {
        if (typeof window.sendConfMsg === 'function') return window.sendConfMsg();
        return;
    }

    const targetDbRoom = window.currentRoomId || 'global';

    // Приватный чат -> делегируем в js/language.js
    if (targetDbRoom !== 'global' && targetDbRoom !== 'private_ai_bot' && !targetDbRoom.startsWith('private_me_')) {
        if (typeof window.sendPrivateMsg === 'function') return window.sendPrivateMsg();
        return;
    }

    const inputField = document.getElementById('chat-input');
    if (!inputField) return;
    const rawText = inputField.value.trim();
    if (!rawText) return;

    if (targetDbRoom === 'private_ai_bot' && window.isGeminiWaiting) {
        if (window.showToast) window.showToast("Google AI", "Please wait a moment...", "", "");
        return;
    }
    inputField.value = '';

    // КАНАЛ КЛАВИАТУРЫ/АВАТАРА: читает СТРОГО hf_global_avatar_lang (микрофон не трогает)
    let manualLang = window.normLangCode(localStorage.getItem('hf_global_avatar_lang'));
    let myActiveLang = manualLang || window.normLangCode(window.getSmartLang(window.myProfileInfo)) || 'en';

    let safeId = (window.myProfileInfo && window.myProfileInfo.id) ? window.myProfileInfo.id : 'guest';
    let safeName = window.myUsername || 'User';
    let safePhoto = (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : 'https://ui-avatars.com/api/?name=U';
    let activeFlag = (window.myProfileInfo && window.myProfileInfo.flag) ? window.myProfileInfo.flag : '🌐';
    let activeFlagCode = (window.myProfileInfo && window.myProfileInfo.flagCode) ? window.myProfileInfo.flagCode : 'un';

    if (manualLang && window.GLOBAL_LANG_MAP[manualLang]) {
        activeFlagCode = window.GLOBAL_LANG_MAP[manualLang][0];
        activeFlag = window.GLOBAL_LANG_MAP[manualLang][1];
    }

    let myBaseText = rawText;
    let mirrorPacket = { mirrorFan: [], mirrorMarquee: '' };

    if (targetDbRoom === 'global' && myBaseText) {
        try {
            const resG = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${myActiveLang}&dt=t&q=${encodeURIComponent(myBaseText)}`);
            const dataG = await resG.json();
            if (dataG && dataG[0]) {
                myBaseText = dataG[0].map(s => (s && s[0]) ? s[0] : '').join('');
            }
        } catch (e) {}

        // Один раз собираем готовый зеркальный пакет по каналу 'avatar'
        mirrorPacket = await window.buildGlobalMirrorPacket(myBaseText, myActiveLang, 'avatar', safeId);
    }

    try {
        firebase.database().ref(targetDbRoom).push({
            userId: safeId, name: safeName,
            text: myBaseText || "Error",
            originalText: myBaseText || "Error",
            sessionId: window.mySessionId || 'sess',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            photo: safePhoto, flag: activeFlag, flagCode: activeFlagCode,
            langCode: myActiveLang,
            inputChannel: 'avatar',
            mirrorFan: mirrorPacket.mirrorFan,
            mirrorMarquee: mirrorPacket.mirrorMarquee,
            isConfMsg: false
        });
    } catch (err) {
        alert("Ошибка отправки в базу: " + err.message);
    }

    const chatMsgs = document.getElementById('chat-messages');
    if (chatMsgs) setTimeout(() => { chatMsgs.scrollTop = chatMsgs.scrollHeight; }, 100);

    // ИИ-бот
    if (targetDbRoom === 'private_ai_bot') {
        window.isGeminiWaiting = true;
        const GEMINI_API_KEY = "AIzaSyB51d72XWcV5AGgLVM1UOg61eCYir78PkY";
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: "Reply in the exact same language: " + rawText }] }] })
        }).then(res => res.json()).then(data => {
            let replyText = data.candidates[0].content.parts[0].text;
            firebase.database().ref(targetDbRoom).push({
                name: "AI Assistant", text: replyText, sessionId: "ai-bot-session",
                timestamp: firebase.database.ServerValue.TIMESTAMP, userId: 'ai',
                langCode: 'en', flag: '🤖', photo: 'https://ui-avatars.com/api/?name=AI&background=6b21a8&color=fff'
            });
        }).finally(() => { setTimeout(() => { window.isGeminiWaiting = false; }, 2000); });
    }
};

// ПРИЁМ СООБЩЕНИЯ: ЧИСТОЕ ЗЕРКАЛЬНОЕ КОПИРОВАНИЕ (БЕЗ ПОВТОРНЫХ ПЕРЕВОДОВ)
window.handleNewMessage = function(snapshot) {
    const data = snapshot.val();
    if (!data) return;

    // 1. Аудио и Видео комнаты — в своих файлах
    if (data.isVoiceRoomMsg || data.isVideoRoomMsg) return;

    // 2. Конференция — делегируем в файл конференции
    if (data.isConfMsg) {
        if (typeof window.handleConfMessage === 'function') return window.handleConfMessage(snapshot);
        return;
    }

    // 3. Приватный чат — делегируем в js/language.js
    const roomKey = snapshot.ref.parent ? snapshot.ref.parent.key : window.currentRoomId;
    if (roomKey && roomKey !== 'global' && roomKey !== 'private_ai_bot' && !roomKey.startsWith('private_me_')) {
        if (typeof window.handlePrivateMessage === 'function') return window.handlePrivateMessage(snapshot);
        return;
    }

    try {
        let deletedMsgs = JSON.parse(localStorage.getItem('hf_deleted_msgs') || '[]');
        if (deletedMsgs.includes(snapshot.key)) return;
    } catch (e) {}

    const chatMessages = document.getElementById('chat-messages');
    const myId = window.myProfileInfo ? String(window.myProfileInfo.id) : '';
    const isMe = data.sessionId === window.mySessionId || (myId && String(data.userId) === myId);
    const isAI = data.userId === "ai" || data.sessionId === "ai-bot-session";
    const isHistory = data.timestamp && (Date.now() - data.timestamp) > 5000;

    let p = isMe
        ? window.myProfileInfo
        : (isAI
            ? { id: 'ai', name: 'AI Assistant', photo: 'https://ui-avatars.com/api/?name=AI&background=6b21a8&color=fff', flag: '🤖' }
            : (window.participants.find(part => String(part.id) === String(data.userId)) || { id: data.userId, photo: data.photo || 'https://ui-avatars.com/api/?name=U', langCode: data.langCode || 'en', flag: data.flag || '🌐' }));

    let isAppActiveAndInChat = (document.visibilityState === 'visible' && window.currentIndex === 0);
    let senderDisplayName = isMe ? window.myUsername : (data.name || 'User').split(' ')[0];

    // Извлекаем готовый зеркальный веер из сообщения
    const fanList = Array.isArray(data.mirrorFan)
        ? data.mirrorFan
        : (data.mirrorFan ? Object.values(data.mirrorFan) : []);
    const myFanEntry = (!isMe && myId) ? fanList.find(item => String(item.userId) === myId) : null;

    if (!isMe && !isHistory && !isAI) {
        if (data.isTransfer) { window.sndCash.play().catch(e => {}); } else { window.sndMsg.play().catch(e => {}); }
        let textPreview = myFanEntry ? myFanEntry.text : data.text;
        if (data.isAIAudio) textPreview = "🤖 AI Voice Message";
        if (data.mediaUrl) textPreview = data.mediaType === 'video' ? "📹 Video" : "🖼️ Photo";
        if (data.isLocation) textPreview = "📍 Shared Location";
        if (data.isTransfer) textPreview = "💸 Money Transfer Received!";
        if (!isAppActiveAndInChat) { window.showToast("Message | " + senderDisplayName, textPreview, p.photo, ""); }
    }

    const messageGroup = document.createElement('div'); messageGroup.className = "flex flex-col w-full mt-3 mb-2";
    const msgWrapper = document.createElement('div'); msgWrapper.className = `flex gap-2 w-full ${isMe ? 'justify-end' : 'justify-start'}`;

    let baseText = data.originalText || data.text || '';
    let displayFlag = data.flag || (isMe ? (window.myProfileInfo.flag || '🌐') : (p.flag || '🌐'));

    let avatarClick = isMe ? `window.openPersonalLangModal()` : `window.openAvatarModal('${p.id}')`;
    let avatarHtml = `<div class="relative shrink-0 self-end cursor-pointer hover:scale-105 transition" onclick="${avatarClick}"><img src="${isAI ? 'https://ui-avatars.com/api/?name=AI&background=6b21a8&color=fff' : p.photo}" class="w-8 h-8 rounded-full object-cover border border-[#2a3942] shadow-md"><span class="absolute -bottom-1 -right-1 text-[10px] bg-[#111b21] rounded-full px-[3px] shadow border border-[#2a3942] leading-none">${isAI ? '🤖' : displayFlag}</span></div>`;

    let bubbleContent = `<div class="text-[#e9edef]">${baseText}</div>`;
    let bubbleClasses = `chat-bubble`;

    if (data.isAIAudio) {
        let playLang = (!isMe && myFanEntry) ? myFanEntry.code : (data.langCode || 'en');
        let textToPlay = (!isMe && myFanEntry) ? myFanEntry.text : baseText;
        let safeEncodedText = encodeURIComponent(textToPlay || '').replace(/'/g, "%27");
        bubbleContent = `<div class="ai-audio-player" onclick="window.playAIVoice('${safeEncodedText}', '${playLang.substring(0,2)}')"><i class="fa-solid fa-circle-play"></i><span>Play Voice</span></div><div style="font-size:0.85rem; margin-top:6px; opacity:0.95;"><div class="text-[#e9edef]">${baseText}</div></div>`;
    } else if (data.mediaUrl) {
        let fileName = data.text ? data.text.replace('📄 Документ: ', '').replace('🖼️ Photo', 'Файл').replace('📹 Video', 'Видео') : 'Файл';
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

    // ГОТОВЫЙ ЗЕРКАЛЬНЫЙ ВЕЕР (1 в 1 у отправителя и у всех получателей)
    if (window.currentRoomId === 'global' && !isAI && !data.isTransfer && !data.mediaUrl && !data.isLocation && !data.isFile && fanList.length > 0) {
        const transContainer = document.createElement('div');
        transContainer.className = `sender-translate-fan flex flex-col gap-2 mt-2 w-full ${isMe ? 'items-end pr-2' : 'items-start pl-10'}`;
        const rowClass = isMe ? 'flex-row-reverse' : 'flex-row';
        const radiusClass = isMe ? 'rounded-tr-sm' : 'rounded-tl-sm';

        fanList.forEach(u => {
            transContainer.innerHTML += `<div class="flex items-end gap-2 opacity-95 max-w-[85%] ${rowClass}"><div class="relative shrink-0"><img src="${u.photo || 'https://ui-avatars.com/api/?name=U'}" class="w-6 h-6 rounded-full object-cover border border-[#00a884]"><span class="absolute -bottom-1 -right-1 text-[8px] bg-[#111b21] rounded-full px-[2px] leading-none">${u.flag || '🌐'}</span></div><div class="bg-[#202c33] border border-[#2a3942] rounded-2xl ${radiusClass} px-3 py-1.5 text-[0.8rem] text-yellow-400 font-bold shadow-sm">${u.text}</div></div>`;
        });
        messageGroup.appendChild(transContainer);
    }

    if (chatMessages) {
        chatMessages.appendChild(messageGroup);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // ГОТОВАЯ ЗЕРКАЛЬНАЯ БЕГУЩАЯ СТРОКА (берётся напрямую из сообщения)
    if (window.currentRoomId === 'global' && !isAI && !isHistory && !data.isTransfer && !data.mediaUrl && !data.isLocation && !data.isFile) {
        const mText = document.getElementById('chat-info-marquee');
        const marqueeContent = data.mirrorMarquee || baseText;
        if (window.isMarqueeEnabled !== false && mText && marqueeContent) {
            mText.innerHTML = `<span class="text-white mr-2">${displayFlag} ${senderDisplayName}:</span> <span class="text-[#00a884] font-bold">${marqueeContent}</span>`;
            mText.style.animation = 'none'; void mText.offsetWidth; mText.style.animation = null;
        }
    }
};

// ==========================================
// 4. АРХИВ, ПОЧТА И ТРЕШ
// ==========================================
window.switchArchiveTab = function(tab) {
    const title = document.getElementById('archive-section-title');
    const readerView = document.getElementById('email-reader-view');
    const listView = document.getElementById('email-list-view');
    if (readerView) { readerView.classList.add('hidden'); readerView.classList.remove('flex'); }
    if (listView) listView.classList.remove('hidden');

    if (tab === 'mail') {
        if (title) title.innerText = "Corporate Mailbox";
        window.renderEmailArchive();
    } else {
        if (title) title.innerText = "Saved Backups";
        const archiveList = document.getElementById('archive-list');
        if (archiveList) archiveList.innerHTML = '<p class="text-center text-sm text-[#8696a0] mt-4">Repository is empty.</p>';
    }
};

window.renderEmailArchive = function() {
    const list = document.getElementById('archive-list');
    if (!list) return;
    window.mailArchiveDB = window.mailArchiveDB || [];
    if (window.mailArchiveDB.length === 0) {
        list.innerHTML = '<p class="text-center text-sm text-[#8696a0] mt-4">Mailbox is empty.</p>';
        return;
    }
    list.innerHTML = '';
    window.mailArchiveDB.forEach(mail => {
        let unreadDot = mail.unread ? `<div class="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)] shrink-0"></div>` : ``;
        let bgClass = mail.unread ? 'bg-[#202c33] border-[#3b82f6]/30' : 'bg-[#111b21] border-[#2a3942] opacity-80';
        let textBold = mail.unread ? 'text-white font-bold' : 'text-[#e9edef]';
        let safeSubject = (mail.subject || 'No Subject').replace(/'/g, "\\'").replace(/"/g, '&quot;');

        let item = document.createElement('div');
        item.id = mail.id;
        item.className = `flex items-center justify-between p-3 rounded-xl border hover:border-blue-400 transition shadow-sm ${bgClass} mb-2 relative`;
        item.innerHTML = `
            <div class="flex items-center gap-3 flex-1 overflow-hidden cursor-pointer" onclick="window.viewSpecificEmail('${mail.id}')">
                <div class="w-10 h-10 shrink-0 rounded-full bg-[#111b21] border border-[#2a3942] flex items-center justify-center text-[#8696a0]"><i class="fa-solid fa-at"></i></div>
                <div class="flex flex-col flex-1 overflow-hidden">
                    <div class="flex justify-between items-center w-full"><span class="text-xs text-[#8696a0] truncate max-w-[70%]">${mail.from || 'System'}</span><span class="text-[0.65rem] text-[#8696a0] pr-2">${mail.date}</span></div>
                    <span class="${textBold} text-sm truncate w-full mt-0.5">${safeSubject}</span>
                </div>
                ${unreadDot}
            </div>
            <button onclick="window.openArchiveActionMenu(event, '${mail.id}', '${safeSubject}', 'email')" class="text-[#8696a0] hover:text-white transition p-2 text-xl shrink-0 ml-1 relative z-[100]">
                <i class="fa-solid fa-ellipsis-vertical pointer-events-none"></i>
            </button>
        `;
        list.appendChild(item);
    });

    let unread = window.mailArchiveDB.some(m => m.unread);
    const badgeEl = document.getElementById('mail-badge');
    const archiveMenuBadge = document.getElementById('archive-unread-badge');
    if (badgeEl) { if (unread) badgeEl.classList.remove('hidden'); else badgeEl.classList.add('hidden'); }
    if (archiveMenuBadge) { if (unread) archiveMenuBadge.classList.remove('hidden'); else archiveMenuBadge.classList.add('hidden'); }
};

window.viewSpecificEmail = function(id) {
    const email = window.mailArchiveDB.find(e => String(e.id) === String(id));
    if (!email) return;
    email.unread = false;
    window.renderEmailArchive();

    document.getElementById('email-read-subject').innerText = email.subject || 'No Subject';
    document.getElementById('email-read-from').innerText = email.from || 'Unknown';
    document.getElementById('email-read-date').innerText = email.date || '';
    let bodyText = email.text || email.body || 'Empty message';
    document.getElementById('email-read-body').innerHTML = bodyText.replace(/\n/g, '<br>');

    const actionBtn = document.getElementById('email-read-action-btn');
    if (actionBtn) {
        let safeSubject = (email.subject || 'No Subject').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        actionBtn.onclick = (e) => window.openArchiveActionMenu(e, email.id, safeSubject, 'email');
    }

    document.getElementById('email-list-view').classList.add('hidden');
    document.getElementById('email-reader-view').classList.remove('hidden');
    document.getElementById('email-reader-view').classList.add('flex');
};

window.backToEmailList = function() {
    document.getElementById('email-reader-view').classList.add('hidden');
    document.getElementById('email-reader-view').classList.remove('flex');
    document.getElementById('email-list-view').classList.remove('hidden');
};

window.openArchiveActionMenu = function(e, itemId, itemTitle, itemType) {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    let itemContent = "Текст файла";
    if (itemType === 'email' && window.mailArchiveDB) {
        let mail = window.mailArchiveDB.find(m => String(m.id) === String(itemId));
        if (mail) itemContent = mail.text || mail.body || "";
    }
    window.currentArchiveItem = { id: itemId, title: itemTitle, content: itemContent };
    const modal = document.getElementById('archive-action-modal');
    const contentBox = document.getElementById('archive-action-content');
    if (!modal || !contentBox) return;
    const titleEl = document.getElementById('action-modal-title');
    if (titleEl) titleEl.innerText = itemTitle || "File Action";
    modal.classList.remove('hidden'); modal.classList.add('flex');
    setTimeout(() => { contentBox.classList.remove('translate-y-full'); }, 10);
};

window.closeArchiveActionMenu = function() {
    const modal = document.getElementById('archive-action-modal');
    const contentBox = document.getElementById('archive-action-content');
    if (contentBox) contentBox.classList.add('translate-y-full');
    setTimeout(() => { if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); } }, 300);
};

window.archiveAction = function(actionType) {
    if (!window.currentArchiveItem) return;
    const { id, content } = window.currentArchiveItem;

    if (actionType === 'delete') {
        if (window.mailArchiveDB) {
            window.mailArchiveDB = window.mailArchiveDB.filter(item => String(item.id) !== String(id));
            if (window.renderEmailArchive) window.renderEmailArchive();
        }
        const domItem = document.getElementById(id); if (domItem) domItem.remove();
        if (window.showToast) window.showToast("Deleted", "Email permanently removed", "", "");
        const readerView = document.getElementById('email-reader-view');
        if (readerView && !readerView.classList.contains('hidden')) { window.backToEmailList(); }
    } else if (actionType === 'copy') {
        navigator.clipboard.writeText(content).then(() => { if (window.showToast) window.showToast("Copied", "Email text copied to clipboard", "", ""); });
    } else if (actionType === 'save') {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `Email_${id}.txt`;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url);
        if (window.showToast) window.showToast("Saved", "File downloaded to your device", "", "");
    }
    window.closeArchiveActionMenu();
};

window.smartArchive = function() {
    const archiveList = document.getElementById('archive-list');
    const emptyMsg = document.getElementById('empty-archive');
    if (emptyMsg) emptyMsg.style.display = 'none';

    let chatName = window.currentTargetUser ? window.currentTargetUser.name.split(' ')[0] : "Global Room";
    if (window.currentRoomId === 'private_ai_bot') chatName = "AI Assistant";
    else if (window.currentRoomId && window.currentRoomId.startsWith('private_me')) chatName = "My Notes";

    let date = new Date().toLocaleDateString();
    let uniqueId = 'item_' + Date.now();

    let archiveItem = document.createElement('div');
    archiveItem.id = uniqueId;
    archiveItem.className = "bg-[#202c33] border border-[#2a3942] p-3 rounded-2xl flex justify-between items-center shadow-sm mb-2";
    archiveItem.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-[#111b21] flex items-center justify-center text-blue-400 border border-[#2a3942]"><i class="fa-solid fa-file-zipper"></i></div>
            <div class="flex flex-col"><span class="text-white font-bold text-sm">Backup: ${chatName}</span><span class="text-[#8696a0] text-xs">${date} • Database</span></div>
        </div>
        <button onclick="window.openArchiveActionMenu(event, '${uniqueId}', 'Backup: ${chatName}', 'backup')" class="text-[#8696a0] hover:text-white transition p-2 text-xl shrink-0 relative z-[100]"><i class="fa-solid fa-ellipsis-vertical pointer-events-none"></i></button>
    `;

    if (archiveList) archiveList.prepend(archiveItem);
    if (window.showToast) window.showToast("Archived", "Saved to Cloud Repository", "", "");
    if (window.closeTrashModal) window.closeTrashModal();
    if (window.switchTab) window.switchTab(5);
};

window.smartClear = function() {
    if (confirm("Are you sure you want to clear chat history?")) {
        const chatMsgs = document.getElementById('chat-messages'); if (chatMsgs) chatMsgs.innerHTML = '';
        if (window.currentRoomId) { firebase.database().ref(window.currentRoomId).remove().catch(e => console.log("Cleared locally")); }
        if (window.closeTrashModal) window.closeTrashModal();
    }
};

window.openTrashModal = function() { if (window.closeDropdown) window.closeDropdown(); document.getElementById('trash-modal')?.classList.add('active'); };
window.closeTrashModal = function() { document.getElementById('trash-modal')?.classList.remove('active'); };
window.actionArchiveChat = function() { window.smartArchive(); };

window.actionClearHistory = function() {
    if (window.currentRoomId === 'global') { alert("Глобальный чат нельзя очистить! Сообщения в нем остаются навсегда."); return; }
    if (confirm("Clear all messages in this chat?")) {
        const chatMsgs = document.getElementById('chat-messages'); if (chatMsgs) chatMsgs.innerHTML = '';
        if (window.currentRoomId) { firebase.database().ref(window.currentRoomId).remove().catch(e => console.log("Cleared locally")); }
        if (window.showToast) window.showToast("Chat Cleared", "Message history deleted", "", "");
        if (window.closeTrashModal) window.closeTrashModal();
    }
};

window.actionDeleteForever = function() {
    if (confirm("WARNING: Delete this chat forever? This cannot be undone.")) {
        const chatMsgs = document.getElementById('chat-messages'); if (chatMsgs) chatMsgs.innerHTML = '';
        if (window.currentRoomId) { firebase.database().ref(window.currentRoomId).remove(); }
        if (window.showToast) window.showToast("Deleted Forever", "Room and history destroyed", "", "");
        if (window.closeTrashModal) window.closeTrashModal();
        if (window.currentRoomId !== 'global' && window.switchChatRoom) { window.switchChatRoom('global'); }
    }
};

// ==========================================
// 5. ПАНЕЛЬ ЯЗЫКОВ (АВАТАР) И МИКРОФОН (СТРОГО РАЗДЕЛЬНО)
// ==========================================
window.openPersonalLangModal = function() {
    if (window.closeDropdown) window.closeDropdown();
    if (window.currentIndex === 2) {
        if (typeof window.openConfLangModal === 'function') return window.openConfLangModal();
        return;
    }
    if (window.currentRoomId && window.currentRoomId !== 'global' && window.currentRoomId !== 'private_ai_bot' && !window.currentRoomId.startsWith('private_me_')) {
        if (typeof window.openPrivateLangModal === 'function') return window.openPrivateLangModal();
        return;
    }

    const listContainer = document.getElementById('personal-lang-list');
    if (!listContainer) return;

    let currentPref = localStorage.getItem('hf_global_avatar_lang') || 'auto';
    const langs = [
        {code:'auto', name:'🤖 Auto (Profile)', flag:'🌐'}, {code:'en', name:'English', flag:'🇬🇧'},
        {code:'kk', name:'Қазақша', flag:'🇰🇿'}, {code:'pt', name:'Português', flag:'🇵🇹'},
        {code:'ru', name:'Русский', flag:'🇷🇺'}, {code:'az', name:'Azərbaycanca', flag:'🇦🇿'},
        {code:'de', name:'Deutsch', flag:'🇩🇪'}, {code:'tr', name:'Türkçe', flag:'🇹🇷'},
        {code:'ar', name:'العربية', flag:'🇦🇪'}, {code:'it', name:'Italiano', flag:'🇮🇹'},
        {code:'es', name:'Español', flag:'🇪🇸'}, {code:'fr', name:'Français', flag:'🇫🇷'},
        {code:'ja', name:'日本語', flag:'🇯🇵'}, {code:'zh', name:'中文', flag:'🇨🇳'}
    ];

    let html = `<div class="text-[0.7rem] text-[#00a884] mb-3 text-center uppercase tracking-widest border-b border-[#2a3942] pb-2">Settings strictly for:<br><b class="text-white text-sm">🌍 Global Chat (Keyboard)</b></div>`;
    langs.forEach(l => {
        let isActive = (currentPref === l.code) ? 'border-[#00a884] bg-[#202c33]' : 'border-[#2a3942] bg-[#111b21]';
        html += `<div onclick="window.saveGlobalAvatarLang('${l.code}')" class="flex items-center p-3 rounded-xl border ${isActive} cursor-pointer mb-2 hover:border-[#00a884] transition shadow-sm"><span class="text-white font-bold text-[0.9rem] flex gap-3 items-center"><span class="text-xl">${l.flag}</span> ${l.name}</span></div>`;
    });
    listContainer.innerHTML = html;
    document.getElementById('personal-lang-modal').classList.add('active');
};

window.saveGlobalAvatarLang = function(langCode) {
    if (langCode === 'auto') {
        localStorage.removeItem('hf_global_avatar_lang');
    } else {
        localStorage.setItem('hf_global_avatar_lang', langCode);
    }
    window.syncMyGlobalChannelLang('avatar');
    document.getElementById('personal-lang-modal')?.classList.remove('active');
    if (window.showToast) window.showToast("Keyboard Language", "Saved strictly for Global Chat.", "", "");
};

window.closePersonalLangModal = function() {
    document.getElementById('personal-lang-modal')?.classList.remove('active');
};

window.saveRoomMicLang = function(val) {
    if (window.currentIndex === 2) {
        if (typeof window.saveConfMicLang === 'function') return window.saveConfMicLang(val);
        return;
    }
    if (window.currentRoomId && window.currentRoomId !== 'global' && window.currentRoomId !== 'private_ai_bot' && !window.currentRoomId.startsWith('private_me_')) {
        if (typeof window.savePrivateMicLang === 'function') return window.savePrivateMicLang(val);
        return;
    }

    if (val === 'auto' || !val) {
        localStorage.removeItem('hf_global_mic_lang');
    } else {
        localStorage.setItem('hf_global_mic_lang', val);
    }
    window.syncMyGlobalChannelLang('mic');
    if (window.showToast) window.showToast("Mic Language", "Saved strictly for Global Chat", "", "");
};

window.syncMicLangUI = function() {
    if (window.currentIndex === 2 && typeof window.syncConfMicLangUI === 'function') return window.syncConfMicLangUI();
    if (window.currentRoomId && window.currentRoomId !== 'global' && window.currentRoomId !== 'private_ai_bot' && !window.currentRoomId.startsWith('private_me_')) {
        if (typeof window.syncPrivateMicLangUI === 'function') return window.syncPrivateMicLangUI();
        return;
    }
    let sel = document.getElementById('plus-mic-lang');
    if (sel) sel.value = localStorage.getItem('hf_global_mic_lang') || 'auto';
};

window.autoSetMicLang = function() { window.syncMicLangUI(); };

window.startUniversalMic = async function(mode) {
    if (window.currentIndex === 1) return; // Аудио / Видео комнаты — в своих файлах
    if (window.closeAllMenus) window.closeAllMenus();

    if (window.currentIndex === 2) {
        if (typeof window.startConfMic === 'function') return window.startConfMic(mode);
        return;
    }

    const targetDbRoom = window.currentRoomId || 'global';
    if (targetDbRoom !== 'global' && targetDbRoom !== 'private_ai_bot' && !targetDbRoom.startsWith('private_me_')) {
        if (typeof window.startPrivateMic === 'function') return window.startPrivateMic(mode);
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Голосовой ввод не поддерживается браузером.");

    // КАНАЛ МИКРОФОНА: читает СТРОГО hf_global_mic_lang (аватар/клавиатуру не трогает)
    let manualMicLang = window.normLangCode(localStorage.getItem('hf_global_mic_lang'));
    let isMicManual = Boolean(manualMicLang);

    const speechLocaleMap = {
        en:'en-US', ru:'ru-RU', az:'az-AZ', tr:'tr-TR', de:'de-DE', kk:'kk-KZ',
        ar:'ar-AE', it:'it-IT', es:'es-ES', fr:'fr-FR', pt:'pt-PT', ja:'ja-JP', zh:'zh-CN'
    };

    const rec = new SpeechRecognition();
    let recBase = isMicManual ? manualMicLang : (window.normLangCode(window.getSmartLang(window.myProfileInfo)) || 'en');
    rec.lang = speechLocaleMap[recBase] || recBase;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => { if (window.showToast) window.showToast("Mic Active", "Говорите...", "", ""); };
    rec.onerror = (e) => { if (window.showToast) window.showToast("Mic Error", e.error, "", ""); };

    rec.onresult = async (e) => {
        window.speechRecognizedText = e.results[0][0].transcript;
        let spokenLangCode = window.normLangCode(rec.lang) || recBase;

        let safeId = (window.myProfileInfo && window.myProfileInfo.id) ? window.myProfileInfo.id : 'guest';
        let safeName = window.myUsername || 'User';
        let safePhoto = (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : 'https://ui-avatars.com/api/?name=U';
        let activeFlagCode = (window.myProfileInfo && window.myProfileInfo.flagCode) ? window.myProfileInfo.flagCode : 'un';
        let activeFlag = (window.myProfileInfo && window.myProfileInfo.flag) ? window.myProfileInfo.flag : '🌐';

        if (isMicManual && window.GLOBAL_LANG_MAP[spokenLangCode]) {
            activeFlagCode = window.GLOBAL_LANG_MAP[spokenLangCode][0];
            activeFlag = window.GLOBAL_LANG_MAP[spokenLangCode][1];
        }

        let mirrorPacket = { mirrorFan: [], mirrorMarquee: '' };
        if (targetDbRoom === 'global' && window.speechRecognizedText) {
            if (window.showToast) window.showToast("Translating...", "Preparing mirror...", "", "");
            // Один раз собираем готовый зеркальный пакет по каналу 'mic'
            mirrorPacket = await window.buildGlobalMirrorPacket(window.speechRecognizedText, spokenLangCode, 'mic', safeId);
        }

        let msgPayload = {
            userId: safeId, name: safeName,
            text: window.speechRecognizedText || "...",
            originalText: window.speechRecognizedText || "...",
            sessionId: window.mySessionId || 'sess',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            photo: safePhoto, flag: activeFlag, flagCode: activeFlagCode,
            langCode: spokenLangCode,
            inputChannel: 'mic',
            mirrorFan: mirrorPacket.mirrorFan,
            mirrorMarquee: mirrorPacket.mirrorMarquee,
            isConfMsg: false
        };

        if (mode === 'text') { firebase.database().ref(targetDbRoom).push(msgPayload); }
        else if (mode === 'ai-audio') { msgPayload.isAIAudio = true; firebase.database().ref(targetDbRoom).push(msgPayload); }
    };
    try { rec.start(); } catch (e) {}
};

// ==========================================
// 6. ЭМОДЗИ И PUSH-УВЕДОМЛЕНИЯ
// ==========================================
window.currentEmojiTargetId = null;
window.toggleEmojiPicker = function(targetId) { window.currentEmojiTargetId = targetId; const picker = document.getElementById('emoji-picker'); if (!picker) return; if (picker.classList.contains('opacity-0')) { picker.classList.remove('opacity-0', 'scale-95', 'pointer-events-none'); picker.classList.add('opacity-100', 'scale-100'); } else { window.closeEmojiPicker(); } };
window.closeEmojiPicker = function() { const picker = document.getElementById('emoji-picker'); if (picker) { picker.classList.add('opacity-0', 'scale-95', 'pointer-events-none'); picker.classList.remove('opacity-100', 'scale-100'); } };
window.insertEmoji = function(emoji) { if (window.currentEmojiTargetId) { const input = document.getElementById(window.currentEmojiTargetId); if (input) { input.value += emoji; input.focus(); } } };

window.sendPushNotification = function(targetUserId, pushData, titleText, bodyText) {
    if (!targetUserId || targetUserId === 'ai' || targetUserId === 'guest') return;
    firebase.database().ref('users/' + targetUserId + '/onesignal_id').once('value').then(snapshot => {
        const targetPlayerId = snapshot.val();
        if (!targetPlayerId) return;
        fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': 'Basic os_v2_app_6f6pqhv6fngrfgbvubo2lofpugusgf71153u3ove7cc5wfnrh4oz3tvsqqkj6mbvbrf2b71dd5ltpuzys2dnma5bdzofojkheg6gtya'
            },
            body: JSON.stringify({
                app_id: "f17cf81e-be2b-4d12-9ab5-a05da5b8afa1",
                include_player_ids: [targetPlayerId],
                data: { custom: { a: pushData } },
                headings: { "en": titleText },
                contents: { "en": bodyText }
            })
        }).catch(err => console.error("Ошибка отправки Push:", err));
    });
};

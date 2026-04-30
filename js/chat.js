// ==========================================
// 1. УМНЫЙ ЯЗЫК И ПРОФИЛЬ
// ==========================================
window.changeAppLanguage = function(langCode) { 
    localStorage.setItem('hf_app_lang', langCode); 
    
    if (langCode === 'auto') {
        let smartLang = null; 
        if (window.myProfileInfo) {
            let rawPhone = window.myProfileInfo.phone;
            let phone = (rawPhone !== null && rawPhone !== undefined) ? String(rawPhone).replace(/\s+/g, '') : "";
            let flag = window.myProfileInfo.flagCode || "un";
            
            if (phone.startsWith('+7')) smartLang = 'ru';
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
                const flagToLang = { 'ru': 'ru', 'az': 'az', 'it': 'it', 'de': 'de', 'fr': 'fr', 'jp': 'ja', 'es': 'es', 'cn': 'zh', 'pt': 'pt', 'gb': 'en', 'us': 'en', 'ae': 'ar', 'tr': 'tr' };
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

window.getSmartLang = function(userData) {
    if (!userData) return navigator.language ? navigator.language.slice(0, 2) : 'en'; 
    
    let rawPhone = typeof userData === 'object' ? userData.phone : userData;
    let flag = (typeof userData === 'object' && userData.flagCode) ? userData.flagCode : "un";
    let langPref = typeof userData === 'object' ? userData.langCode : null;

    if (langPref && langPref !== 'auto' && langPref !== 'un') return langPref;
    
    let phone = (rawPhone !== null && rawPhone !== undefined) ? String(rawPhone).replace(/\s+/g, '') : "";
    
    if (phone.startsWith('+7')) return 'ru';
    if (phone.startsWith('+994')) return 'az';
    if (phone.startsWith('+39')) return 'it';
    if (phone.startsWith('+49')) return 'de';
    if (phone.startsWith('+33')) return 'fr';
    if (phone.startsWith('+81')) return 'ja';
    if (phone.startsWith('+34')) return 'es';
    if (phone.startsWith('+86')) return 'zh';
    if (phone.startsWith('+351')) return 'pt';
    if (phone.startsWith('+1') || phone.startsWith('+44')) return 'en';
    if (phone.startsWith('+971')) return 'ar';

    const flagToLang = { 'ru': 'ru', 'az': 'az', 'it': 'it', 'de': 'de', 'fr': 'fr', 'jp': 'ja', 'es': 'es', 'cn': 'zh', 'pt': 'pt', 'gb': 'en', 'us': 'en', 'ae': 'ar', 'tr': 'tr' };
    if (flagToLang[flag]) return flagToLang[flag];
    
    return navigator.language ? navigator.language.slice(0, 2) : 'en';
};

window.getLangKey = function(isVoice, isConf) {
    if (isVoice) return 'hf_lang_tab_voice';
    if (isConf) return 'hf_lang_tab_meet';
    return 'hf_lang_chat_' + (window.currentRoomId || 'global');
};

window.getLangPref = function(isVoice, isConf) {
    let key = window.getLangKey(isVoice, isConf);
    let pref = localStorage.getItem(key);
    if (pref && pref !== 'auto') return pref;
    return window.getSmartLang(window.myProfileInfo);
};

// ==========================================
// 2. ОТРИСОВКА И ПЕРЕКЛЮЧЕНИЕ ЧАТОВ
// ==========================================

window.updateRoomMarquee = function() {
    const mText = document.getElementById('chat-info-marquee');
    if(!mText) return;
    if(window.currentRoomId === 'global' || window.currentRoomId === 'video_room_global') {
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
    const chatMessages = document.getElementById('chat-messages'); 
    if (chatMessages) chatMessages.innerHTML = '';
    
    window.currentTargetUser = null; 
    let headerTitle = "Global Chat"; let headerRoomId = "global";

    if (targetId === 'video_room_global') {
        window.currentRoomId = "video_room_global"; headerTitle = "Conference"; headerRoomId = window.currentRoomId;
    } else if (targetId === 'global') {
        window.currentRoomId = "global"; window.showToast("Global Chat", "🌍 International Public Room", "", "");
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
        if(targetUser) {
            window.currentTargetUser = targetUser;
            let id1 = String(window.myProfileInfo.id); 
            let id2 = String(targetUser.id);
            window.currentRoomId = (id1 < id2) ? ("private_" + id1 + "_" + id2) : ("private_" + id2 + "_" + id1);
            headerTitle = (targetUser.name || 'User').split(' ')[0] + " " + targetUser.flag; headerRoomId = "Private Encrypted";
            let targetBio = targetUser.profileBio ? `<span class="text-[#8696a0] mt-1 block italic border-t border-[#2a3942] pt-1">${targetUser.profileBio}</span>` : ""; 
            let targetLangs = targetUser.profileLangs ? `🗣️ ${targetUser.profileLangs}<br>` : "";
            let targetEmail = targetUser.email ? `✉️ ${targetUser.email}<br>` : ""; 
            let infoHtml = `<b class="text-[#00a884] uppercase tracking-wider">${targetUser.flag} ${targetUser.country || 'Global'}</b><br><span class="text-[#e9edef] text-[0.7rem] block mt-1 leading-relaxed">${targetEmail}${targetLangs}</span>${targetBio}`;
            window.showToast((targetUser.name || 'User').split(' ')[0], infoHtml, targetUser.photo, targetUser.phone || "");
            const vPhoto = document.getElementById('voice-friend-photo'); const vFlag = document.getElementById('voice-friend-flag'); const vName = document.getElementById('voice-friend-name');
            if(vPhoto) vPhoto.src = targetUser.photo; if(vFlag) vFlag.innerText = targetUser.flag; if(vName) vName.innerText = (targetUser.name || 'User').split(' ')[0];
        }
    }
    const titleEl = document.getElementById('chat-header-title'); if(titleEl) titleEl.innerText = headerTitle;
    const roomEl = document.getElementById('chat-header-room'); if(roomEl) roomEl.innerText = "ID: " + headerRoomId;
    
    window.updateRoomMarquee();
    window.renderSidebar();
    
    window.activeChatListener = firebase.database().ref(window.currentRoomId).on("child_added", window.handleNewMessage);
    // Сброс памяти языка для новой комнаты
    localStorage.removeItem(window.getLangKey(false, false));
    localStorage.removeItem(window.getMicLangKey());
    if (typeof window.syncMicLangUI === 'function') window.syncMicLangUI();
};

// ==========================================
// 3. ОТПРАВКА И ПОЛУЧЕНИЕ СООБЩЕНИЙ
// ==========================================
window.isGeminiWaiting = false;

window.sendFirebaseMsg = async function() {
    let isVoiceTab = window.currentIndex === 1;
    let isConfTab = window.currentIndex === 2;

    let inputId = 'chat-input';
    let targetDbRoom = window.currentRoomId || 'global';

    if (isConfTab) {
        inputId = 'conf-chat-input';
        targetDbRoom = (window.currentRoomId && window.currentRoomId !== 'global') ? window.currentRoomId : 'video_room_global'; 
    } else if (isVoiceTab) {
        inputId = 'voice-chat-input';
        targetDbRoom = (window.currentRoomId && window.currentRoomId !== 'global') ? window.currentRoomId : 'global';
    }

    const inputField = document.getElementById(inputId);
    if (!inputField) return;

    const rawText = inputField.value.trim(); 
    if (!rawText) return;
    
    if (targetDbRoom === 'private_ai_bot' && window.isGeminiWaiting) { 
        if (window.showToast) window.showToast("Google AI", "Please wait a moment...", "", ""); 
        return; 
    }
    inputField.value = '';

    let myActiveLang = window.getLangPref(isVoiceTab, isConfTab) || 'en';

    let safeId = (window.myProfileInfo && window.myProfileInfo.id) ? window.myProfileInfo.id : 'guest';
    let safeName = window.myUsername || 'User';
    let safePhoto = (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : 'https://ui-avatars.com/api/?name=U';
    let activeFlag = (window.myProfileInfo && window.myProfileInfo.flag) ? window.myProfileInfo.flag : '🌐';
    let activeFlagCode = (window.myProfileInfo && window.myProfileInfo.flagCode) ? window.myProfileInfo.flagCode : 'un';

    const langMap = { 'en':['gb','🇬🇧'], 'ru':['ru','🇷🇺'], 'az':['az','🇦🇿'], 'de':['de','🇩🇪'], 'tr':['tr','🇹🇷'], 'ar':['ae','🇦🇪'], 'it':['it','🇮🇹'], 'es':['es','🇪🇸'], 'fr':['fr','🇫🇷'], 'pt':['pt','🇵🇹'], 'ja':['jp','🇯🇵'], 'zh':['cn','🇨🇳'] };
    if (langMap[myActiveLang]) { activeFlagCode = langMap[myActiveLang][0]; activeFlag = langMap[myActiveLang][1]; }

    let myBaseText = rawText;
    try {
        const res1 = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${myActiveLang}&dt=t&q=${encodeURIComponent(rawText)}`);
        const data1 = await res1.json();
        if (data1 && data1[0] && data1[0][0][0]) myBaseText = data1[0][0][0];
    } catch (e) {}

    let targetSendLang = window.currentTargetUser ? window.getSmartLang(window.currentTargetUser) : myActiveLang;
    let textToShip = myBaseText;
    if (targetSendLang !== myActiveLang && targetDbRoom !== 'global' && targetDbRoom !== 'video_room_global') {
        try {
            const res2 = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${myActiveLang}&tl=${targetSendLang}&dt=t&q=${encodeURIComponent(myBaseText)}`);
            const data2 = await res2.json();
            if (data2 && data2[0] && data2[0][0][0]) textToShip = data2[0][0][0];
        } catch (e) {}
    }

    try {
        firebase.database().ref(targetDbRoom).push({
            userId: safeId, name: safeName, text: textToShip || "Error", originalText: myBaseText || "Error",
            sessionId: window.mySessionId || 'sess', timestamp: firebase.database.ServerValue.TIMESTAMP,
            photo: safePhoto, flag: activeFlag, flagCode: activeFlagCode, langCode: myActiveLang,
            isVoiceRoomMsg: isVoiceTab, isConfMsg: isConfTab
        });
    } catch(err) {
        alert("Ошибка отправки в базу: " + err.message);
    }

    const chatMsgs = document.getElementById('chat-messages'); 
    if (chatMsgs) setTimeout(() => { chatMsgs.scrollTop = chatMsgs.scrollHeight; }, 100); 
    if (window.currentTargetUser && !isConfTab && !isVoiceTab && window.sendPushToUser) { window.sendPushToUser(window.currentTargetUser.id, window.myUsername, textToShip); }

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

window.handleNewMessage = async function(snapshot) {
    const data = snapshot.val(); 
    if(!data) return; 
    
    const chatMessages = document.getElementById('chat-messages');

    if (window.currentRoomId === 'global') {
        document.querySelectorAll('.sender-translate-fan').forEach(el => { el.remove(); });
    }

    const isMe = data.sessionId === window.mySessionId || data.userId === window.myProfileInfo.id;
    const isAI = data.userId === "ai" || data.sessionId === "ai-bot-session";
    let p = isMe ? window.myProfileInfo : (isAI ? { id: 'ai', name: 'AI Assistant', photo: 'https://ui-avatars.com/api/?name=AI&background=6b21a8&color=fff', flag: '🤖' } : (window.participants.find(part => part.id === data.userId) || { id: data.userId, photo: data.photo || 'https://ui-avatars.com/api/?name=U', langCode: data.langCode || 'en', flag: data.flag || '🌐' }));
    
    let isHistory = data.timestamp && (Date.now() - data.timestamp) > 5000;
    let isAppActiveAndInChat = (document.visibilityState === 'visible' && window.currentIndex === 0);
    let senderDisplayName = isMe ? window.myUsername : (data.name || 'User').split(' ')[0];

    if (!isMe && !isHistory && !isAI) {
        if (data.isTransfer) { window.sndCash.play().catch(e=>{}); } else { window.sndMsg.play().catch(e=>{}); }
        let textPreview = data.text; 
        if(data.isAIAudio) textPreview = "🤖 AI Voice Message"; 
        if(data.mediaUrl) textPreview = data.mediaType === 'video' ? "📹 Video" : "🖼️ Photo"; 
        if(data.isLocation) textPreview = "📍 Shared Location"; 
        if(data.isTransfer) textPreview = "💸 Money Transfer Received!";
        
        if (!isAppActiveAndInChat && !data.isConfMsg && !data.isVoiceRoomMsg) {
            window.showToast("Message | " + senderDisplayName, textPreview, p.photo, "");
        }
    }

    const messageGroup = document.createElement('div'); messageGroup.className = "flex flex-col w-full mt-3 mb-2";
    const msgWrapper = document.createElement('div'); msgWrapper.className = `flex gap-2 w-full ${isMe ? 'justify-end' : 'justify-start'}`;

    let avatarClick = isMe ? `window.openPersonalLangModal()` : `window.openAvatarModal('${p.id}')`;
    let avatarHtml = `<div class="relative shrink-0 self-end cursor-pointer hover:scale-105 transition" onclick="${avatarClick}"><img src="${isAI ? 'https://ui-avatars.com/api/?name=AI&background=6b21a8&color=fff' : p.photo}" class="w-8 h-8 rounded-full object-cover border border-[#2a3942] shadow-md"><span class="absolute -bottom-1 -right-1 text-[10px] bg-[#111b21] rounded-full px-[3px] shadow border border-[#2a3942] leading-none">${isAI ? '🤖' : (p.flag || '🌐')}</span></div>`;

    let bubbleContent = data.originalText || data.text;
    let bubbleClasses = `chat-bubble`;

    let myReadLang = window.getLangPref(data.isVoiceRoomMsg, data.isConfMsg);
    let senderLang = data.langCode || 'auto'; 

    let finalTranslatedText = data.text; 

    if (data.originalText && !data.mediaUrl && !data.isTransfer && !data.isLocation) {
        if (window.currentRoomId !== 'global' || isHistory) {
            if (!isMe && !isAI && senderLang.substring(0,2) !== myReadLang.substring(0,2)) {
                try {
                    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${senderLang.substring(0,2)}&tl=${myReadLang.substring(0,2)}&dt=t&q=${encodeURIComponent(data.originalText)}`);
                    const resData = await res.json();
                    finalTranslatedText = (resData && resData[0] && resData[0][0]) ? resData[0][0][0] : data.originalText;
                    
                    if (!data.isAIAudio) {
                        bubbleContent = `<div class="text-[#e9edef]">${data.originalText}</div><div class="mt-1 pt-1 border-t border-white/20 text-[0.75rem] text-[#00a884] font-bold tracking-wide">➔ ${finalTranslatedText}</div>`;
                    }
                } catch(e) { bubbleContent = data.originalText; }
            }
            else if (isMe && data.originalText !== data.text && !data.isAIAudio) {
                bubbleContent = `<div class="text-[#e9edef]">${data.originalText}</div><div class="mt-1 pt-1 border-t border-white/20 text-[0.75rem] text-[#00a884] font-bold tracking-wide">➔ ${data.text}</div>`;
            }
        }
    }

    if (data.isAIAudio) {
        let playLang = isMe ? (data.langCode || myReadLang) : myReadLang;
        let textToPlay = isMe ? (data.text || data.originalText) : finalTranslatedText;
        
        let transHtml = '';
        if (!isMe && data.originalText !== finalTranslatedText) {
            transHtml = `<div class="mt-2 pt-1.5 border-t border-white/20 text-[0.75rem] text-[#00a884] font-bold tracking-wide">➔ ${finalTranslatedText}</div>`;
        } else if (isMe && data.originalText !== data.text) {
            transHtml = `<div class="mt-2 pt-1.5 border-t border-white/20 text-[0.75rem] text-yellow-400 font-bold tracking-wide">➔ Перевод: ${data.text}</div>`;
        }

        bubbleContent = `<div class="ai-audio-player" onclick="window.playAIVoice('${encodeURIComponent(textToPlay)}', '${playLang.substring(0,2)}')"><i class="fa-solid fa-circle-play"></i><span>Play Voice</span></div><div style="font-size:0.85rem; margin-top:6px; opacity:0.95;"><div class="text-[#e9edef]">${data.originalText}</div>${transHtml}</div>`;
    }
    else if (data.mediaUrl) { 
        bubbleContent = data.mediaType === 'video' ? `<video src="${data.mediaUrl}" controls class="max-w-[200px] sm:max-w-[250px] rounded-lg mt-1 border border-[#2a3942]"></video>` : `<img src="${data.mediaUrl}" class="max-w-[200px] sm:max-w-[250px] rounded-lg mt-1 cursor-pointer border border-[#2a3942] hover:opacity-90 transition" onclick="window.openFullscreenImage(this.src)">`; 
        bubbleClasses = `chat-bubble !bg-[#202c33] !p-2`; 
    }
    else if (data.isTransfer) { 
        bubbleClasses = `chat-bubble !bg-[#0b141a] border border-[#00a884] shadow-[0_0_15px_rgba(0,168,132,0.3)] !p-0 overflow-hidden`; 
        bubbleContent = `<div class="flex flex-col items-center p-4 min-w-[200px]"><div class="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center text-[#111b21] mb-2 shadow-lg"><i class="fa-solid fa-check text-2xl"></i></div><span class="text-[0.7rem] text-[#00a884] font-bold uppercase tracking-widest mb-1 text-center">${data.transferTypeLabel || 'Transfer'}</span><span class="text-2xl font-bold text-white mb-1">$${data.amount}</span><div class="w-full h-[1px] bg-[#2a3942] mb-2"></div><span class="text-xs text-[#8696a0]">To: <span class="text-white font-bold">${data.recName}</span></span></div>`; 
    }
    else if (data.isLocation) { 
        bubbleClasses = `chat-bubble !bg-[#0b141a] border border-[#00a884] shadow-[0_0_15px_rgba(0,168,132,0.3)] !p-0 overflow-hidden`; 
        bubbleContent = `<div class="flex flex-col w-[200px] sm:w-[250px]"><iframe width="100%" height="150" frameborder="0" scrolling="no" src="${data.embedLink}" style="pointer-events: none;"></iframe><a href="${data.mapLink}" target="_blank" class="bg-[#202c33] p-2.5 text-center text-[0.8rem] text-blue-400 font-bold hover:bg-[#2a3942] transition flex items-center justify-center gap-2"><i class="fa-solid fa-map-location-dot"></i> Open in Maps</a></div>`; 
    }

    const isCurrentRoom = snapshot.ref.parent.key === window.currentRoomId;

    if (isCurrentRoom || (!data.isVoiceRoomMsg && !data.isConfMsg)) {
        if (!data.isVoiceRoomMsg && !data.isConfMsg) {
            msgWrapper.innerHTML = isMe ? `<div class="chat-bubble-wrapper outgoing items-end flex flex-col"><div class="chat-sender-name">${senderDisplayName}</div><div class="${bubbleClasses}">${bubbleContent}</div></div>` + avatarHtml : avatarHtml + `<div class="chat-bubble-wrapper incoming items-start flex flex-col"><div class="chat-sender-name">${senderDisplayName}</div><div class="${bubbleClasses}">${bubbleContent}</div></div>`;
            messageGroup.appendChild(msgWrapper);
            if(chatMessages) { chatMessages.appendChild(messageGroup); chatMessages.scrollTop = chatMessages.scrollHeight; }
        }
    }

 // === ГЛОБАЛЬНЫЙ ЧАТ: РАЗДАЧА ПЕРЕВОДА КАЖДОМУ УЧАСТНИКУ ===
    if (window.currentRoomId === 'global' && !isAI && !isHistory && !data.isTransfer && !data.mediaUrl && !data.isLocation && !data.isFile && !data.isVoiceRoomMsg && !data.isConfMsg) {
        let targetUsers = []; 
        let neededLangs = new Set(); 
        
        let myFanFlag = window.myProfileInfo.flag || '🌐';
        const revLangMap = { 'en':'🇬🇧', 'ru':'🇷🇺', 'az':'🇦🇿', 'de':'🇩🇪', 'tr':'🇹🇷', 'ar':'🇦🇪', 'it':'🇮🇹', 'es':'🇪🇸', 'fr':'🇫🇷', 'pt':'🇵🇹', 'ja':'🇯🇵', 'zh':'🇨🇳' };
        
        let manualLang = window.getLangPref(false, false);
        if (manualLang && revLangMap[manualLang.substring(0,2)]) { myFanFlag = revLangMap[manualLang.substring(0,2)]; }

        if (myReadLang && myReadLang !== 'un' && myReadLang.substring(0,2) !== senderLang.substring(0,2)) {
            targetUsers.push({ code: myReadLang.substring(0,2), flag: myFanFlag, photo: window.myProfileInfo.photo });
            neededLangs.add(myReadLang.substring(0,2));
        }

        window.participants.filter(part => part.id !== 'ai').forEach(member => {
            let memberLang = window.getSmartLang(member);
            if (memberLang && memberLang !== 'un' && memberLang.substring(0,2) !== senderLang.substring(0,2)) {
                targetUsers.push({ code: memberLang.substring(0,2), flag: member.flag, photo: member.photo });
                neededLangs.add(memberLang.substring(0,2));
            }
        });

        if (targetUsers.length > 0) {
            try {
                let transCache = {};
                const fetchPromises = Array.from(neededLangs).map(langCode => 
                    fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${senderLang}&tl=${langCode}&dt=t&q=${encodeURIComponent(data.originalText || data.text)}`)
                    .then(res => res.json())
                    .then(resData => { transCache[langCode] = resData[0][0][0]; })
                    .catch(e => { transCache[langCode] = data.originalText || data.text; }) 
                );
                
                await Promise.all(fetchPromises);

                const transContainer = document.createElement('div');
                transContainer.className = `sender-translate-fan flex flex-col gap-2 mt-2 w-full ${isMe ? 'items-end pr-2' : 'items-start pl-10'}`;
                let marqueeTextStr = '';

                targetUsers.forEach(u => {
                    let translatedText = transCache[u.code] || data.originalText || data.text;
                    const rowClass = isMe ? 'flex-row-reverse' : 'flex-row'; const radiusClass = isMe ? 'rounded-tr-sm' : 'rounded-tl-sm';
                    transContainer.innerHTML += `<div class="flex items-end gap-2 opacity-95 max-w-[85%] ${rowClass}"><div class="relative shrink-0"><img src="${u.photo}" class="w-6 h-6 rounded-full object-cover border border-[#00a884]"><span class="absolute -bottom-1 -right-1 text-[8px] bg-[#111b21] rounded-full px-[2px] leading-none">${u.flag}</span></div><div class="bg-[#202c33] border border-[#2a3942] rounded-2xl ${radiusClass} px-3 py-1.5 text-[0.8rem] text-yellow-400 font-bold shadow-sm">${translatedText}</div></div>`;
                    marqueeTextStr += `${u.flag} ${translatedText}        `;
                });
                
                messageGroup.appendChild(transContainer); chatMessages.scrollTop = chatMessages.scrollHeight;

                const mText = document.getElementById('chat-info-marquee');
                if (window.isMarqueeEnabled !== false && mText) {
                    mText.innerHTML = `<span class="text-white mr-2">${senderDisplayName}:</span> <span class="text-[#00a884] font-bold">${marqueeTextStr}</span>`;
                    mText.style.animation = 'none'; void mText.offsetWidth; mText.style.animation = null;
                }
            } catch (e) {}
        }
    }
    // === КОНЕЦ БЛОКА ===

if (data.isVoiceRoomMsg) {
        let senderPhoto, senderFlag, senderName, senderText;
        let receiverPhoto, receiverFlag, receiverName, receiverText;

        // Берем готовый перевод прямо из отправленных данных (без лишних запросов)
        senderText = data.originalText || data.text;
        receiverText = data.text || data.originalText;

        if (isMe) {
            senderPhoto = window.myProfileInfo.photo; 
            // Берем флаг из сообщения (поддерживает ручной выбор микрофона)
            senderFlag = data.flag || window.myProfileInfo.flag || '🌐'; 
            senderName = window.myUsername;
            
            receiverPhoto = window.currentTargetUser ? window.currentTargetUser.photo : 'https://ui-avatars.com/api/?name=U'; 
            receiverFlag = window.currentTargetUser ? window.currentTargetUser.flag : '🌐'; 
            receiverName = window.currentTargetUser ? (window.currentTargetUser.name || 'User').split(' ')[0] : 'User';
        } else {
            senderPhoto = data.photo || 'https://ui-avatars.com/api/?name=U'; 
            senderFlag = data.flag || '🌐'; 
            senderName = (data.name || 'User').split(' ')[0];
            
            receiverPhoto = window.myProfileInfo.photo; 
            receiverFlag = window.myProfileInfo.flag; 
            receiverName = window.myUsername;
        }

        const vMarquee = document.getElementById('voice-info-marquee');
        if (vMarquee && window.isVoiceMarqueeEnabled !== false) {
            vMarquee.innerHTML = `<div class="flex items-center"><img src="${senderPhoto}" class="w-5 h-5 rounded-full border border-[#2a3942] mr-1 object-cover shadow-sm"><span class="text-white font-bold mr-1">${senderName}:</span><span class="text-[#e9edef] mr-2">${senderFlag} ${senderText}</span> <i class="fa-solid fa-arrow-right text-[#00a884] mx-2 text-[0.6rem] animate-pulse"></i> <img src="${receiverPhoto}" class="w-5 h-5 rounded-full border border-[#00a884] mr-1 object-cover shadow-[0_0_5px_rgba(0,168,132,0.5)]"><span class="text-white font-bold mr-1">${receiverName}:</span><span class="text-[#00a884] font-bold">${receiverFlag} ${receiverText}</span></div>`;
            vMarquee.style.animation = 'none'; void vMarquee.offsetWidth; vMarquee.style.animation = null;
        }
    }

    if (data.isConfMsg) {
        let originalText = data.originalText || data.text;
        let senderLangCode = data.langCode || 'auto'; 
        let senderMarqueeId = isMe ? 'speaker-marquee' : `conf-marquee-${data.userId}`;

        let speakerMarquee = document.getElementById(senderMarqueeId);
        if (speakerMarquee) {
            speakerMarquee.innerHTML = `<span class="text-white font-bold">${senderDisplayName}:</span> <span class="text-[#00a884] ml-2">${data.flag || '🌐'} ${originalText}</span>`;
            speakerMarquee.style.animation = 'none'; void speakerMarquee.offsetWidth; speakerMarquee.style.animation = null;
        }

        document.querySelectorAll('.conf-listener-marquee').forEach(listenerMarquee => {
            if (listenerMarquee.id === senderMarqueeId) return; 
            
            let targetLang = listenerMarquee.getAttribute('data-lang') || 'en'; 
            let targetFlag = listenerMarquee.getAttribute('data-flag') || '🌐';
            
            if (listenerMarquee.id) {
                let match = listenerMarquee.id.match(/conf-marquee-(.+)/);
                if (match) {
                    let pId = match[1];
                    let part = window.participants.find(x => x.id === pId);
                    if (part) {
                        targetLang = window.getSmartLang(part);
                        targetFlag = part.flag || '🌐';
                    }
                } else if (listenerMarquee.id === 'speaker-marquee') {
                    targetLang = window.getLangPref(false, true) || window.getSmartLang(window.myProfileInfo);
                    const revLangMap = { 'en':'🇬🇧', 'ru':'🇷🇺', 'az':'🇦🇿', 'de':'🇩🇪', 'tr':'🇹🇷', 'ar':'🇦🇪', 'it':'🇮🇹', 'es':'🇪🇸', 'fr':'🇫🇷', 'pt':'🇵🇹', 'ja':'🇯🇵', 'zh':'🇨🇳' };
                    let baseL = targetLang.substring(0,2);
                    if (revLangMap[baseL]) targetFlag = revLangMap[baseL];
                }
            }
            
            fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang.substring(0,2)}&dt=t&q=${encodeURIComponent(originalText)}`)
                .then(r => r.json())
                .then(resData => {
                    let translatedText = (resData && resData[0] && resData[0][0]) ? resData[0][0][0] : originalText;
                    listenerMarquee.innerHTML = `<span class="text-[#8696a0] text-[0.65rem] uppercase tracking-widest">${senderDisplayName}:</span> <span class="text-yellow-400 font-bold ml-2">${targetFlag} ${translatedText}</span>`;
                    listenerMarquee.style.animation = 'none'; void listenerMarquee.offsetWidth; listenerMarquee.style.animation = null;
                }).catch(e => console.log('Meet Translate Error'));
        });
    }
};

// ==========================================
// 4. МЕНЮ ФАЙЛОВ АРХИВА, ТРЕШ И ЭМОДЗИ
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
    if(contentBox) contentBox.classList.add('translate-y-full');
    setTimeout(() => { if(modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); } }, 300);
};

window.archiveAction = function(actionType) {
    if (!window.currentArchiveItem) return;
    const { id, content } = window.currentArchiveItem;
    
    if (actionType === 'delete') {
        if (window.mailArchiveDB) { 
            window.mailArchiveDB = window.mailArchiveDB.filter(item => String(item.id) !== String(id)); 
            if(window.renderEmailArchive) window.renderEmailArchive(); 
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
    if(emptyMsg) emptyMsg.style.display = 'none';
    
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
            <div class="w-10 h-10 rounded-full bg-[#111b21] flex items-center justify-center text-blue-400 border border-[#2a3942]">
                <i class="fa-solid fa-file-zipper"></i>
            </div>
            <div class="flex flex-col">
                <span class="text-white font-bold text-sm">Backup: ${chatName}</span>
                <span class="text-[#8696a0] text-xs">${date} • Database</span>
            </div>
        </div>
        <button onclick="window.openArchiveActionMenu(event, '${uniqueId}', 'Backup: ${chatName}', 'backup')" class="text-[#8696a0] hover:text-white transition p-2 text-xl shrink-0 relative z-[100]">
            <i class="fa-solid fa-ellipsis-vertical pointer-events-none"></i>
        </button>
    `;
    
    if(archiveList) archiveList.prepend(archiveItem); 
    if (window.showToast) window.showToast("Archived", "Saved to Cloud Repository", "", ""); 
    if (window.closeTrashModal) window.closeTrashModal(); 
    if (window.switchTab) window.switchTab(5);
};

window.smartClear = function() {
    if(confirm("Are you sure you want to clear chat history?")) {
        const chatMsgs = document.getElementById('chat-messages'); if(chatMsgs) chatMsgs.innerHTML = '';
        if(window.currentRoomId) { firebase.database().ref(window.currentRoomId).remove().catch(e => console.log("Cleared locally")); }
        if (window.closeTrashModal) window.closeTrashModal();
    }
};

window.openTrashModal = function() {
    if(window.closeDropdown) window.closeDropdown();
    const tm = document.getElementById('trash-modal');
    if (tm) tm.classList.add('active');
};

window.closeTrashModal = function() { 
    const tm = document.getElementById('trash-modal');
    if (tm) tm.classList.remove('active'); 
};

window.actionArchiveChat = function() { window.smartArchive(); };

window.actionClearHistory = function() {
    if (window.currentRoomId === 'global') {
        alert("Глобальный чат нельзя очистить! Сообщения в нем остаются навсегда.");
        return;
    }
    if(confirm("Clear all messages in this chat?")) {
        const chatMsgs = document.getElementById('chat-messages'); 
        if(chatMsgs) chatMsgs.innerHTML = '';
        if(window.currentRoomId) { firebase.database().ref(window.currentRoomId).remove().catch(e => console.log("Cleared locally")); }
        if (window.showToast) window.showToast("Chat Cleared", "Message history deleted", "", "");
        if (window.closeTrashModal) window.closeTrashModal();
    }
};
window.actionDeleteForever = function() {
    if(confirm("WARNING: Delete this chat forever? This cannot be undone.")) {
        const chatMsgs = document.getElementById('chat-messages'); 
        if(chatMsgs) chatMsgs.innerHTML = '';
        if(window.currentRoomId) { firebase.database().ref(window.currentRoomId).remove(); }
        if (window.showToast) window.showToast("Deleted Forever", "Room and history destroyed", "", "");
        if (window.closeTrashModal) window.closeTrashModal();
        if (window.currentRoomId !== 'global' && window.switchChatRoom) { window.switchChatRoom('global'); }
    }
};

// ==========================================
// 5. ПАНЕЛЬ ЯЗЫКОВ И МИКРОФОН
// ==========================================
window.openPersonalLangModal = function() {
    if (window.closeDropdown) window.closeDropdown();
    const listContainer = document.getElementById('personal-lang-list');
    if (!listContainer) return;

    let isVoice = window.currentIndex === 1;
    let isConf = window.currentIndex === 2;
    let targetKey = window.getLangKey(isVoice, isConf);
    let currentPref = localStorage.getItem(targetKey) || 'auto';

    const langs = [
        {code: 'auto', name: '🤖 Auto (Profile)', flag: '🌐'}, {code: 'en', name: 'English', flag: '🇬🇧'}, {code: 'ru', name: 'Русский', flag: '🇷🇺'},
        {code: 'az', name: 'Azərbaycanca', flag: '🇦🇿'}, {code: 'de', name: 'Deutsch', flag: '🇩🇪'}, {code: 'tr', name: 'Türkçe', flag: '🇹🇷'},
        {code: 'ar', name: 'العربية', flag: '🇦🇪'}, {code: 'it', name: 'Italiano', flag: '🇮🇹'}, {code: 'es', name: 'Español', flag: '🇪🇸'},
        {code: 'fr', name: 'Français', flag: '🇫🇷'}, {code: 'pt', name: 'Português', flag: '🇵🇹'}, {code: 'ja', name: '日本語', flag: '🇯🇵'}, {code: 'zh', name: '中文', flag: '🇨🇳'}
    ];

    let roomLabel = 'Chat Room';
    if (isVoice) roomLabel = '🎙️ Voice Tab';
    else if (isConf) roomLabel = '📹 Meet Tab';
    else if (window.currentRoomId === 'global') roomLabel = '🌍 Global Chat';
    else if (window.currentRoomId === 'private_ai_bot') roomLabel = '🤖 AI Assistant';
    else if (window.currentRoomId && window.currentRoomId.startsWith('private_me')) roomLabel = '📝 My Notes';
    else if (window.currentTargetUser) roomLabel = '👤 ' + window.currentTargetUser.name.split(' ')[0];

    let html = `<div class="text-[0.7rem] text-[#00a884] mb-3 text-center uppercase tracking-widest border-b border-[#2a3942] pb-2">Settings strictly for:<br><b class="text-white text-sm">${roomLabel}</b></div>`;

    langs.forEach(l => {
        let isActive = (currentPref === l.code) ? 'border-[#00a884] bg-[#202c33]' : 'border-[#2a3942] bg-[#111b21]';
        html += `<div onclick="window.saveSpecificLang('${l.code}', '${targetKey}')" class="flex items-center p-3 rounded-xl border ${isActive} cursor-pointer mb-2 hover:border-[#00a884] transition shadow-sm"><span class="text-white font-bold text-[0.9rem] flex gap-3 items-center"><span class="text-xl">${l.flag}</span> ${l.name}</span></div>`;
    });
    listContainer.innerHTML = html;
    document.getElementById('personal-lang-modal').classList.add('active');
};

window.saveSpecificLang = function(langCode, targetKey) {
    if (langCode === 'auto') { localStorage.removeItem(targetKey); } 
    else { localStorage.setItem(targetKey, langCode); }
    document.getElementById('personal-lang-modal').classList.remove('active');
    if (window.showToast) window.showToast("Language Saved", "Applied strictly to this section.", "", "");
};

window.closePersonalLangModal = function() {
    document.getElementById('personal-lang-modal')?.classList.remove('active');
};

window.getMicLangKey = function() {
    let isVoice = window.currentIndex === 1;
    let isConf = window.currentIndex === 2;
    if (isVoice) return 'hf_mic_lang_tab_voice';
    if (isConf) return 'hf_mic_lang_tab_meet';
    return 'hf_mic_lang_chat_' + (window.currentRoomId || 'global');
};

window.saveRoomMicLang = function(val) {
    let key = window.getMicLangKey();
    if (val === 'auto' || !val) { localStorage.removeItem(key); } else { localStorage.setItem(key, val); }
    if (window.showToast) window.showToast("Mic Language", "Saved strictly for this room", "", "");
};

window.syncMicLangUI = function() {
    let key = window.getMicLangKey();
    let saved = localStorage.getItem(key) || 'auto';
    let sel = document.getElementById('plus-mic-lang');
    if (sel) { sel.value = saved; }
};

window.autoSetMicLang = function() { window.syncMicLangUI(); };

window.startUniversalMic = async function(mode) {
    if (window.closeAllMenus) window.closeAllMenus();

    let isVoiceTab = window.currentIndex === 1;
    let isConfTab = window.currentIndex === 2;

    let targetDbRoom = window.currentRoomId || 'global';
    if (isConfTab) {
        targetDbRoom = (window.currentRoomId && window.currentRoomId !== 'global') ? window.currentRoomId : 'video_room_global';
    } else if (isVoiceTab) {
        targetDbRoom = (window.currentRoomId && window.currentRoomId !== 'global') ? window.currentRoomId : 'global';
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Голосовой ввод не поддерживается браузером.");

    let mySpokenLang = window.getSmartLang(window.myProfileInfo);
    let manualMicLang = localStorage.getItem(window.getMicLangKey()) || 'auto';

    const rec = new SpeechRecognition();
    rec.lang = (manualMicLang !== 'auto') ? manualMicLang : mySpokenLang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => { if(window.showToast) window.showToast("Mic Active", "Говорите...", "", ""); };
    rec.onerror = (e) => { if(window.showToast) window.showToast("Mic Error", e.error, "", ""); };

    rec.onresult = async (e) => {
        window.speechRecognizedText = e.results[0][0].transcript;

        let targetLang = 'en';
        // УМНАЯ ЛОГИКА
        if (isConfTab) {
            targetLang = (manualMicLang !== 'auto') ? manualMicLang : mySpokenLang;
        } else if (window.currentTargetUser && targetDbRoom !== 'global') {
            targetLang = window.getSmartLang(window.currentTargetUser); 
        } else {
            targetLang = (manualMicLang !== 'auto') ? manualMicLang : mySpokenLang;
        }

        if (window.showToast) window.showToast("Translating...", "Processing your voice...", "", "");
        let textToShip = window.speechRecognizedText;

        if (targetLang.substring(0,2) !== rec.lang.substring(0,2)) {
            try {
                const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang.substring(0,2)}&dt=t&q=${encodeURIComponent(window.speechRecognizedText)}`);
                const data = await res.json();
                if (data && data[0] && data[0][0][0]) textToShip = data[0][0][0];
            } catch (err) {}
        }

        let safeId = (window.myProfileInfo && window.myProfileInfo.id) ? window.myProfileInfo.id : 'guest';
        let safeName = window.myUsername || 'User';
        let safePhoto = (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : 'https://ui-avatars.com/api/?name=U';

        let activeFlagCode = window.myProfileInfo.flagCode || 'un';
        let activeFlag = window.myProfileInfo.flag || '🌐';

        let spokenLangCode = rec.lang.substring(0,2);
        if (manualMicLang !== 'auto') {
            const revLangMap = { 'en':['gb','🇬🇧'], 'ru':['ru','🇷🇺'], 'az':['az','🇦🇿'], 'de':['de','🇩🇪'], 'tr':['tr','🇹🇷'], 'ar':['ae','🇦🇪'], 'it':['it','🇮🇹'], 'es':['es','🇪🇸'], 'fr':['fr','🇫🇷'], 'pt':['pt','🇵🇹'], 'ja':['jp','🇯🇵'], 'zh':['cn','🇨🇳'] };
            if (revLangMap[spokenLangCode]) {
                activeFlagCode = revLangMap[spokenLangCode][0];
                activeFlag = revLangMap[spokenLangCode][1];
            }
        }

        let msgPayload = {
            userId: safeId, name: safeName, text: textToShip || "...", originalText: window.speechRecognizedText || "...",
            sessionId: window.mySessionId || 'sess', timestamp: firebase.database.ServerValue.TIMESTAMP, photo: safePhoto,
            flag: activeFlag, flagCode: activeFlagCode,
            langCode: targetLang.substring(0,2), 
            isVoiceRoomMsg: isVoiceTab, isConfMsg: isConfTab
        };

        if (mode === 'text') { firebase.database().ref(targetDbRoom).push(msgPayload); }
        else if (mode === 'ai-audio') { msgPayload.isAIAudio = true; firebase.database().ref(targetDbRoom).push(msgPayload); }
    };
    try { rec.start(); } catch(e){}
};

// ==========================================
// 6. ПОДДЕРЖКА КЛАВИАТУРЫ И ПРОЧИЕ УТИЛИТЫ
// ==========================================
window.currentEmojiTargetId = null;
window.toggleEmojiPicker = function(targetId) { window.currentEmojiTargetId = targetId; const picker = document.getElementById('emoji-picker'); if (!picker) return; if (picker.classList.contains('opacity-0')) { picker.classList.remove('opacity-0', 'scale-95', 'pointer-events-none'); picker.classList.add('opacity-100', 'scale-100'); } else { window.closeEmojiPicker(); } };
window.closeEmojiPicker = function() { const picker = document.getElementById('emoji-picker'); if(picker) { picker.classList.add('opacity-0', 'scale-95', 'pointer-events-none'); picker.classList.remove('opacity-100', 'scale-100'); } };
window.insertEmoji = function(emoji) { if(window.currentEmojiTargetId) { const input = document.getElementById(window.currentEmojiTargetId); if(input) { input.value += emoji; input.focus(); } } };

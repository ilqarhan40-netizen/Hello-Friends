// ==========================================
// ГЛОБАЛЬНАЯ СИНХРОНИЗАЦИЯ ЯЗЫКА С ПРОФИЛЕМ
// ==========================================
window.changeAppLanguage = function(langCode) { 
    localStorage.setItem('hf_app_lang', langCode); 
    if (langCode === 'auto') {
        let smartLang = null; 
        if (window.myProfileInfo) {
            let phone = window.myProfileInfo.phone || "";
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
                const flagToLang = { 'ru':'ru', 'az':'az', 'de':'de', 'tr':'tr', 'it':'it', 'fr':'fr', 'jp':'ja', 'es':'es', 'cn':'zh', 'pt':'pt', 'gb':'en', 'us':'en', 'ae':'ar' };
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
        if (currentSetting === 'auto') setTimeout(() => { window.changeAppLanguage('auto'); }, 300);
    };
    window.profileLangHooked = true;
}

setTimeout(() => { window.changeAppLanguage(localStorage.getItem('hf_app_lang') || 'auto'); }, 1000);

// ==========================================
// ЛОГИКА ЧАТОВ И МАРШРУТИЗАЦИИ
// ==========================================
window.getSmartLang = function(userProfile) {
    if (!userProfile) return 'en'; 
    if (userProfile.langCode && userProfile.langCode !== 'auto' && userProfile.langCode !== 'un') return userProfile.langCode;
    let phone = userProfile.phone || "";
    if (phone.startsWith('+7')) return 'ru'; if (phone.startsWith('+994')) return 'az';
    if (phone.startsWith('+39')) return 'it'; if (phone.startsWith('+49')) return 'de';
    if (phone.startsWith('+33')) return 'fr'; if (phone.startsWith('+81')) return 'ja';
    if (phone.startsWith('+34')) return 'es'; if (phone.startsWith('+86')) return 'zh';
    if (phone.startsWith('+351')) return 'pt'; if (phone.startsWith('+1') || phone.startsWith('+44')) return 'en';
    if (phone.startsWith('+971')) return 'ar';
    let flag = userProfile.flagCode || "un";
    const flagToLang = { 'ru':'ru', 'az':'az', 'it':'it', 'de':'de', 'fr':'fr', 'jp':'ja', 'es':'es', 'cn':'zh', 'pt':'pt', 'gb':'en', 'us':'en', 'ae':'ar' };
    return flagToLang[flag] ? flagToLang[flag] : 'en';
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

window.renderSidebar = function() {
    const chatSidebar = document.getElementById('chat-sidebar'); 
    if (!chatSidebar) return;
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
    } else if (targetId === 'me') {
        window.currentRoomId = "private_me_" + window.myProfileInfo.id; headerTitle = "My Notes"; headerRoomId = window.currentRoomId;
    } else {
        const targetUser = window.participants.find(p => p.id === targetId);
        if(targetUser) {
            window.currentTargetUser = targetUser;
            let id1 = String(window.myProfileInfo.id); let id2 = String(targetUser.id);
            window.currentRoomId = (id1 < id2) ? ("private_" + id1 + "_" + id2) : ("private_" + id2 + "_" + id1);
            headerTitle = (targetUser.name || 'User').split(' ')[0] + " " + targetUser.flag; headerRoomId = window.currentRoomId;
            const vPhoto = document.getElementById('voice-friend-photo'); const vFlag = document.getElementById('voice-friend-flag'); const vName = document.getElementById('voice-friend-name');
            if(vPhoto) vPhoto.src = targetUser.photo; if(vFlag) vFlag.innerText = targetUser.flag; if(vName) vName.innerText = (targetUser.name || 'User').split(' ')[0];
        }
    }
    const titleEl = document.getElementById('chat-header-title'); if(titleEl) titleEl.innerText = headerTitle;
    const roomEl = document.getElementById('chat-header-room'); if(roomEl) roomEl.innerText = "ID: " + headerRoomId;
    window.renderSidebar();
    window.activeChatListener = firebase.database().ref(window.currentRoomId).on("child_added", window.handleNewMessage);
};

window.isGeminiWaiting = false;
window.sendFirebaseMsg = async function() {
    let inputId = window.currentMicInputTarget || 'chat-input';
    const inputField = document.getElementById(inputId);
    if (!inputField) return;

    const rawText = inputField.value.trim(); 
    if (!rawText) return;
    if (window.currentRoomId === 'private_ai_bot' && window.isGeminiWaiting) return;
    inputField.value = '';

    let isVoice = inputId === 'voice-chat-input';
    let isConf = inputId === 'conf-chat-input';
    let myActiveLang = window.getLangPref(isVoice, isConf);
    let activeFlag = window.myProfileInfo.flag || '🌐';
    let activeFlagCode = window.myProfileInfo.flagCode || 'un';

    let myBaseText = rawText;
    try {
        const res1 = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${myActiveLang}&dt=t&q=${encodeURIComponent(rawText)}`);
        const data1 = await res1.json();
        if (data1 && data1[0] && data1[0][0][0]) myBaseText = data1[0][0][0];
    } catch (e) {}

    let targetSendLang = window.currentTargetUser ? window.getSmartLang(window.currentTargetUser) : myActiveLang;
    let textToShip = myBaseText;
    if (targetSendLang !== myActiveLang && window.currentRoomId !== 'global') {
        try {
            const res2 = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${myActiveLang}&tl=${targetSendLang}&dt=t&q=${encodeURIComponent(myBaseText)}`);
            const data2 = await res2.json();
            if (data2 && data2[0] && data2[0][0][0]) textToShip = data2[0][0][0];
        } catch (e) {}
    }

    firebase.database().ref(window.currentRoomId).push({
        userId: window.myProfileInfo.id, name: window.myUsername, text: textToShip, originalText: myBaseText,
        sessionId: window.mySessionId, timestamp: firebase.database.ServerValue.TIMESTAMP,
        photo: window.myProfileInfo.photo, flag: activeFlag, flagCode: activeFlagCode, langCode: myActiveLang,
        isVoiceRoomMsg: isVoice, isConfMsg: isConf
    });

    if (window.currentRoomId === 'private_ai_bot') {
        window.isGeminiWaiting = true;
        const GEMINI_API_KEY = "AIzaSyB51d72XWcV5AGgLVM1UOg61eCYir78PkY"; 
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ contents: [{ parts: [{ text: "Reply briefly: " + rawText }] }] }) 
        }).then(res => res.json()).then(data => { 
            let replyText = data.candidates[0].content.parts[0].text; 
            firebase.database().ref(window.currentRoomId).push({ 
                name: "AI Assistant", text: replyText, sessionId: "ai-bot-session", timestamp: firebase.database.ServerValue.TIMESTAMP, userId: 'ai', langCode: 'en', flag: '🤖', photo: 'https://ui-avatars.com/api/?name=AI&background=6b21a8&color=fff' 
            }); 
        }).finally(() => { setTimeout(() => { window.isGeminiWaiting = false; }, 2000); });
    }
};

window.handleNewMessage = async function(snapshot) {
    const data = snapshot.val(); 
    if(!data) return; 
    const chatMessages = document.getElementById('chat-messages');
    if (window.currentRoomId === 'global') document.querySelectorAll('.sender-translate-fan').forEach(el => { el.remove(); });

    const isMe = data.sessionId === window.mySessionId || data.userId === window.myProfileInfo.id;
    const isAI = data.userId === "ai" || data.sessionId === "ai-bot-session";
    let p = isMe ? window.myProfileInfo : (isAI ? { id: 'ai', name: 'AI', photo: 'https://ui-avatars.com/api/?name=AI&background=6b21a8&color=fff', flag: '🤖' } : (window.participants.find(part => part.id === data.userId) || { id: data.userId, photo: data.photo || 'https://ui-avatars.com/api/?name=U', langCode: data.langCode || 'en', flag: data.flag || '🌐' }));
    
    let senderDisplayName = isMe ? window.myUsername : (data.name || 'User').split(' ')[0];
    const messageGroup = document.createElement('div'); messageGroup.className = "flex flex-col w-full mt-3 mb-2";
    const msgWrapper = document.createElement('div'); msgWrapper.className = `flex gap-2 w-full ${isMe ? 'justify-end' : 'justify-start'}`;

    let avatarHtml = `<div class="relative shrink-0 self-end cursor-pointer"><img src="${isAI ? 'https://ui-avatars.com/api/?name=AI&background=6b21a8&color=fff' : p.photo}" class="w-8 h-8 rounded-full object-cover border border-[#2a3942]"><span class="absolute -bottom-1 -right-1 text-[10px] bg-[#111b21] rounded-full px-[3px] border border-[#2a3942]">${isAI ? '🤖' : (p.flag || '🌐')}</span></div>`;
    let bubbleClasses = `chat-bubble`;
    let bubbleContent = data.originalText || data.text;

    if (!data.isVoiceRoomMsg && !data.isConfMsg) {
        msgWrapper.innerHTML = isMe ? `<div class="chat-bubble-wrapper outgoing items-end flex flex-col"><div class="chat-sender-name">${senderDisplayName}</div><div class="${bubbleClasses}">${bubbleContent}</div></div>` + avatarHtml : avatarHtml + `<div class="chat-bubble-wrapper incoming items-start flex flex-col"><div class="chat-sender-name">${senderDisplayName}</div><div class="${bubbleClasses}">${bubbleContent}</div></div>`;
        messageGroup.appendChild(msgWrapper);
        if(chatMessages) { chatMessages.appendChild(messageGroup); chatMessages.scrollTop = chatMessages.scrollHeight; }
    }
};

// ==========================================
// МЕНЮ АРХИВА И ЭМОДЗИ
// ==========================================
window.openArchiveActionMenu = function(e, itemId, itemTitle, itemType) {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    window.currentArchiveItem = { id: itemId, title: itemTitle, content: "Текст файла" };
    const modal = document.getElementById('archive-action-modal');
    const contentBox = document.getElementById('archive-action-content');
    if (!modal || !contentBox) return;
    const titleEl = document.getElementById('action-modal-title');
    if (titleEl) titleEl.innerText = itemTitle;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
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
        const domItem = document.getElementById(id);
        if (domItem) domItem.remove();
    } else if (actionType === 'copy') {
        navigator.clipboard.writeText(content);
    } 
    window.closeArchiveActionMenu();
};

window.smartArchive = function() {
    const archiveList = document.getElementById('archive-list'); 
    const emptyMsg = document.getElementById('empty-archive'); 
    if(emptyMsg) emptyMsg.style.display = 'none';
    let chatName = window.currentTargetUser ? window.currentTargetUser.name.split(' ')[0] : "Global Room";
    let date = new Date().toLocaleDateString(); let uniqueId = 'item_' + Date.now();
    let archiveItem = document.createElement('div'); archiveItem.id = uniqueId;
    archiveItem.className = "bg-[#202c33] border border-[#2a3942] p-3 rounded-2xl flex justify-between items-center shadow-sm mb-2";
    archiveItem.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-[#111b21] flex items-center justify-center text-blue-400 border border-[#2a3942]"><i class="fa-solid fa-file-zipper"></i></div>
            <div class="flex flex-col"><span class="text-white font-bold text-sm">Backup: ${chatName}</span><span class="text-[#8696a0] text-xs">${date} • DB</span></div>
        </div>
        <button onclick="window.openArchiveActionMenu(event, '${uniqueId}', 'Backup: ${chatName}', 'backup')" class="text-[#8696a0] hover:text-white transition p-2 text-xl shrink-0 relative z-50"><i class="fa-solid fa-ellipsis-vertical pointer-events-none"></i></button>
    `;
    if(archiveList) archiveList.prepend(archiveItem); 
    window.closeTrashModal(); window.switchTab(5);
};

window.openTrashModal = function() { window.closeDropdown(); document.getElementById('trash-modal').classList.add('active'); };
window.closeTrashModal = function() { document.getElementById('trash-modal')?.classList.remove('active'); };
window.actionArchiveChat = function() { window.smartArchive(); };
window.actionClearHistory = function() { const msgs = document.getElementById('chat-messages'); if(msgs) msgs.innerHTML = ''; window.closeTrashModal(); };
window.actionDeleteForever = function() { const msgs = document.getElementById('chat-messages'); if(msgs) msgs.innerHTML = ''; window.closeTrashModal(); if (window.currentRoomId !== 'global') window.switchChatRoom('global'); };

window.currentEmojiTargetId = null;
window.toggleEmojiPicker = function(targetId) { window.currentEmojiTargetId = targetId; const picker = document.getElementById('emoji-picker'); if (!picker) return; if (picker.classList.contains('opacity-0')) { picker.classList.remove('opacity-0', 'scale-95', 'pointer-events-none'); picker.classList.add('opacity-100', 'scale-100'); } else { window.closeEmojiPicker(); } };
window.closeEmojiPicker = function() { const picker = document.getElementById('emoji-picker'); if(picker) { picker.classList.add('opacity-0', 'scale-95', 'pointer-events-none'); picker.classList.remove('opacity-100', 'scale-100'); } };
window.insertEmoji = function(emoji) { if(window.currentEmojiTargetId) { const input = document.getElementById(window.currentEmojiTargetId); if(input) { input.value += emoji; input.focus(); } } };

// ==========================================
// ПАНЕЛЬ ЯЗЫКОВ И МИКРОФОН
// ==========================================
window.openPersonalLangModal = function() {
    if (window.closeDropdown) window.closeDropdown();
    const listContainer = document.getElementById('personal-lang-list');
    if (!listContainer) return;
    let targetKey = window.getLangKey(window.currentIndex === 1, window.currentIndex === 2);
    let currentPref = localStorage.getItem(targetKey) || 'auto';
    const langs = [{code: 'auto', name: '🤖 Auto (Profile)', flag: '🌐'}, {code: 'en', name: 'English', flag: '🇬🇧'}, {code: 'ru', name: 'Русский', flag: '🇷🇺'}, {code: 'az', name: 'Azərbaycanca', flag: '🇦🇿'}, {code: 'de', name: 'Deutsch', flag: '🇩🇪'}, {code: 'tr', name: 'Türkçe', flag: '🇹🇷'}, {code: 'ar', name: 'العربية', flag: '🇦🇪'}, {code: 'it', name: 'Italiano', flag: '🇮🇹'}, {code: 'es', name: 'Español', flag: '🇪🇸'}, {code: 'fr', name: 'Français', flag: '🇫🇷'}, {code: 'pt', name: 'Português', flag: '🇵🇹'}, {code: 'ja', name: '日本語', flag: '🇯🇵'}, {code: 'zh', name: '中文', flag: '🇨🇳'}];
    let html = `<div class="text-[0.7rem] text-[#00a884] mb-3 text-center uppercase tracking-widest border-b border-[#2a3942] pb-2">Settings strictly for this room</div>`;
    langs.forEach(l => {
        let isActive = (currentPref === l.code) ? 'border-[#00a884] bg-[#202c33]' : 'border-[#2a3942] bg-[#111b21]';
        html += `<div onclick="window.saveSpecificLang('${l.code}', '${targetKey}')" class="flex items-center p-3 rounded-xl border ${isActive} cursor-pointer mb-2 hover:border-[#00a884] transition shadow-sm"><span class="text-white font-bold text-[0.9rem] flex gap-3 items-center"><span class="text-xl">${l.flag}</span> ${l.name}</span></div>`;
    });
    listContainer.innerHTML = html;
    document.getElementById('personal-lang-modal').classList.add('active');
};

window.saveSpecificLang = function(langCode, targetKey) {
    if (langCode === 'auto') { localStorage.removeItem(targetKey); } else { localStorage.setItem(targetKey, langCode); }
    document.getElementById('personal-lang-modal').classList.remove('active');
};
window.closePersonalLangModal = function() { document.getElementById('personal-lang-modal')?.classList.remove('active'); };

window.getMicLangKey = function() { return (window.currentIndex === 1) ? 'hf_mic_lang_tab_voice' : (window.currentIndex === 2 ? 'hf_mic_lang_tab_meet' : 'hf_mic_lang_chat_' + (window.currentRoomId || 'global')); };
window.saveRoomMicLang = function(val) { let key = window.getMicLangKey(); if (val === 'auto' || !val) { localStorage.removeItem(key); } else { localStorage.setItem(key, val); } };
window.syncMicLangUI = function() { let sel = document.getElementById('plus-mic-lang'); if (sel) sel.value = localStorage.getItem(window.getMicLangKey()) || 'auto'; };

if (!window.micSyncHooked) {
    const origSwitchTabMic = window.switchTab;
    window.switchTab = function(index) { if (origSwitchTabMic) origSwitchTabMic(index); setTimeout(window.syncMicLangUI, 100); };
    const origSwitchChatMic = window.switchChatRoom;
    window.switchChatRoom = function(targetId) { if (origSwitchChatMic) origSwitchChatMic(targetId); setTimeout(window.syncMicLangUI, 100); };
    window.micSyncHooked = true;
}

window.startUniversalMic = async function(mode) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    let rec = SpeechRec ? new SpeechRec() : null;
    if (!rec) return alert("Browser does not support Speech Recognition.");
    rec.continuous = false; rec.interimResults = false;
    let selectedMicLang = localStorage.getItem(window.getMicLangKey()) || 'auto';
    rec.lang = (selectedMicLang === 'auto') ? 'en-US' : selectedMicLang; // Упрощено для стабильности
    rec.onresult = async (e) => { 
        let textToShip = e.results[0][0].transcript; 
        firebase.database().ref(window.currentRoomId).push({ 
            userId: window.myProfileInfo.id, name: window.myUsername, text: textToShip, originalText: textToShip, 
            sessionId: window.mySessionId, timestamp: firebase.database.ServerValue.TIMESTAMP, photo: window.myProfileInfo.photo, 
            flag: window.myProfileInfo.flag, flagCode: window.myProfileInfo.flagCode, langCode: rec.lang.substring(0, 2),
            isVoiceRoomMsg: window.currentMicInputTarget === 'voice-chat-input', isConfMsg: window.currentMicInputTarget === 'conf-chat-input',
            isAIAudio: (mode === 'ai-audio')
        });
    };
    try { rec.start(); } catch(e){}
};

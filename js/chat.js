window.getSmartLang = function(userProfile) {
    if (!userProfile) return 'en'; 
    
    if (userProfile.langCode && userProfile.langCode !== 'auto' && userProfile.langCode !== 'un') {
        return userProfile.langCode;
    }

    let phone = userProfile.phone || "";
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

    let flag = userProfile.flagCode || "un";
    const flagToLang = {
        'ru': 'ru', 'az': 'az', 'it': 'it', 'de': 'de', 'fr': 'fr', 
        'jp': 'ja', 'es': 'es', 'cn': 'zh', 'pt': 'pt', 'gb': 'en', 'us': 'en', 'ae': 'ar'
    };
    if (flagToLang[flag]) return flagToLang[flag];
    
    return 'en';
};

// === 1. ЕДИНАЯ ФУНКЦИЯ ЧТЕНИЯ ЯЗЫКА ДЛЯ ТЕКУЩЕЙ КОМНАТЫ ===
window.getActiveRoomLang = function() {
    let roomPref = localStorage.getItem('room_lang_' + window.currentRoomId);
    if (roomPref && roomPref !== 'auto') return roomPref;
    return window.getSmartLang(window.myProfileInfo);
};

window.renderSidebar = function() {
    const chatSidebar = document.getElementById('chat-sidebar'); 
    if (!chatSidebar) return;
    
    const welcomeImg = document.getElementById('welcome-user-photo');
    if (welcomeImg && window.myProfileInfo && window.myProfileInfo.photo) { 
        welcomeImg.src = window.myProfileInfo.photo; 
    }

    let sidebarHTML = '';

    sidebarHTML += `
        <div class="chat-contact ${window.currentRoomId === 'global' ? 'active-room' : ''}" onclick="window.switchChatRoom('global')">
            <div class="chat-contact-icon bg-[#005c4b] text-white flex justify-center items-center text-xl">🌍</div>
            <span class="chat-contact-name text-white">Global</span>
        </div>
    `;
    
    sidebarHTML += `
        <div class="chat-contact ${window.currentRoomId === 'private_ai_bot' ? 'active-room' : ''}" onclick="window.switchChatRoom('ai')">
            <div class="chat-contact-icon bg-purple-900 text-white flex justify-center items-center text-xl">🤖</div>
            <span class="chat-contact-name text-[#a29bfe]">AI Bot</span>
        </div>
    `;

    sidebarHTML += `
        <div class="chat-contact ${window.currentRoomId === ('private_me_' + window.myProfileInfo.id) ? 'active-room' : ''}" onclick="window.switchChatRoom('me')">
            <div class="chat-contact-icon" style="background-image: url('${window.myProfileInfo.photo}');">
                <img src="https://flagcdn.com/w20/${window.myProfileInfo.flagCode || 'un'}.png" class="absolute -bottom-1 -right-1 w-5 h-3.5 rounded-sm object-cover border border-[#111b21]">
            </div>
            <span class="chat-contact-name text-white">${window.myUsername}</span>
        </div>
    `;

    window.participants.filter(p => p.id !== 'ai').forEach(p => {
        let id1 = String(window.myProfileInfo.id); 
        let id2 = String(p.id);
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
    if (window.activeChatListener) { 
        firebase.database().ref(window.currentRoomId).off("child_added", window.activeChatListener); 
    }
    
    const chatMessages = document.getElementById('chat-messages'); 
    if (chatMessages) chatMessages.innerHTML = '';
    
    window.currentTargetUser = null; 
    let headerTitle = "Global Chat"; 
    let headerRoomId = "global";

    if (targetId === 'video_room_global') {
        window.currentRoomId = "video_room_global";
        headerTitle = "Conference"; 
        headerRoomId = window.currentRoomId;
    } else if (targetId === 'global') {
        window.currentRoomId = "global";
        window.showToast("Global Chat", "🌍 International Public Room", "", "");
    } else if (targetId === 'ai') {
        window.currentRoomId = "private_ai_bot"; 
        headerTitle = "AI Assistant"; 
        headerRoomId = window.currentRoomId;
        window.showToast("AI Assistant", "Powered by Gemini", "https://ui-avatars.com/api/?name=AI&background=6b21a8&color=fff", "");
    } else if (targetId === 'me') {
        window.currentRoomId = "private_me_" + window.myProfileInfo.id; 
        headerTitle = "My Notes"; 
        headerRoomId = window.currentRoomId;
        
        let myBio = window.myProfileInfo.profileBio ? `<span class="text-[#8696a0] mt-1 block italic border-t border-[#2a3942] pt-1">${window.myProfileInfo.profileBio}</span>` : ""; 
        let myLangs = window.myProfileInfo.profileLangs ? `🗣️ ${window.myProfileInfo.profileLangs}<br>` : "";
        let myEmail = window.myProfileInfo.email ? `✉️ ${window.myProfileInfo.email}<br>` : ""; 
        let myPhone = window.myProfileInfo.phone || "";
        
        let infoHtml = `<b class="text-[#00a884] uppercase tracking-wider">${window.myProfileInfo.flag} ${window.myProfileInfo.country || 'Global'}</b><br><span class="text-[#e9edef] text-[0.7rem] block mt-1 leading-relaxed">${myEmail}${myLangs}</span>${myBio}`;
        
        window.showToast("My Notes", infoHtml, window.myProfileInfo.photo, myPhone);
    } else {
        const targetUser = window.participants.find(p => p.id === targetId);
        if(targetUser) {
            window.currentTargetUser = targetUser;
            let id1 = String(window.myProfileInfo.id); 
            let id2 = String(targetUser.id);
            window.currentRoomId = (id1 < id2) ? ("private_" + id1 + "_" + id2) : ("private_" + id2 + "_" + id1);
            
            headerTitle = (targetUser.name || 'User').split(' ')[0] + " " + targetUser.flag; 
            headerRoomId = window.currentRoomId;
            
            let targetBio = targetUser.profileBio ? `<span class="text-[#8696a0] mt-1 block italic border-t border-[#2a3942] pt-1">${targetUser.profileBio}</span>` : ""; 
            let targetLangs = targetUser.profileLangs ? `🗣️ ${targetUser.profileLangs}<br>` : "";
            let targetEmail = targetUser.email ? `✉️ ${targetUser.email}<br>` : ""; 
            let targetPhone = targetUser.phone || "";
            
            let infoHtml = `<b class="text-[#00a884] uppercase tracking-wider">${targetUser.flag} ${targetUser.country || 'Global'}</b><br><span class="text-[#e9edef] text-[0.7rem] block mt-1 leading-relaxed">${targetEmail}${targetLangs}</span>${targetBio}`;
            
            window.showToast((targetUser.name || 'User').split(' ')[0], infoHtml, targetUser.photo, targetPhone);

            const vPhoto = document.getElementById('voice-friend-photo'); 
            const vFlag = document.getElementById('voice-friend-flag'); 
            const vName = document.getElementById('voice-friend-name');
            if(vPhoto) vPhoto.src = targetUser.photo; 
            if(vFlag) vFlag.innerText = targetUser.flag; 
            if(vName) vName.innerText = (targetUser.name || 'User').split(' ')[0];
        }
    }

    const titleEl = document.getElementById('chat-header-title'); 
    if(titleEl) titleEl.innerText = headerTitle;
    const roomEl = document.getElementById('chat-header-room'); 
    if(roomEl) roomEl.innerText = "ID: " + headerRoomId;
    
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
    
    if (window.currentRoomId === 'private_ai_bot' && window.isGeminiWaiting) { 
        window.showToast("Google AI", "Please wait a moment...", "", ""); 
        return; 
    }
    
    inputField.value = '';

    // ИСПОЛЬЗУЕМ ИЗОЛИРОВАННЫЙ ЯЗЫК КОМНАТЫ
    let myActiveLang = window.getActiveRoomLang();

    let activeFlag = window.myProfileInfo.flag || '🌐';
    let activeFlagCode = window.myProfileInfo.flagCode || 'un';

    const langMap = {
        'en':['gb','🇬🇧'], 'ru':['ru','🇷🇺'], 'az':['az','🇦🇿'], 'de':['de','🇩🇪'], 
        'tr':['tr','🇹🇷'], 'ar':['ae','🇦🇪'], 'it':['it','🇮🇹'], 'es':['es','🇪🇸'], 
        'fr':['fr','🇫🇷'], 'pt':['pt','🇵🇹'], 'ja':['jp','🇯🇵'], 'zh':['cn','🇨🇳']
    };
    
    if (langMap[myActiveLang]) { 
        activeFlagCode = langMap[myActiveLang][0]; 
        activeFlag = langMap[myActiveLang][1]; 
    }

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

    let isVoice = inputId === 'voice-chat-input';
    let isConf = inputId === 'conf-chat-input';

    firebase.database().ref(window.currentRoomId).push({
        userId: window.myProfileInfo.id,
        name: window.myUsername,
        text: textToShip,
        originalText: myBaseText,
        sessionId: window.mySessionId,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        photo: window.myProfileInfo.photo,
        flag: activeFlag,
        flagCode: activeFlagCode,
        langCode: myActiveLang,
        isVoiceRoomMsg: isVoice,
        isConfMsg: isConf
    });

    const chatMsgs = document.getElementById('chat-messages'); 
    if (chatMsgs) { 
        setTimeout(() => { chatMsgs.scrollTop = chatMsgs.scrollHeight; }, 100); 
    }
    
    if (window.currentTargetUser && !isConf && !isVoice) { 
        window.sendPushToUser(window.currentTargetUser.id, window.myUsername, textToShip); 
    }

    if (window.currentRoomId === 'private_ai_bot') {
        window.isGeminiWaiting = true;
        const GEMINI_API_KEY = "AIzaSyB51d72XWcV5AGgLVM1UOg61eCYir78PkY"; 
        
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ contents: [{ parts: [{ text: "Reply in the exact same language: " + rawText }] }] }) 
        })
        .then(res => res.json())
        .then(data => { 
            let replyText = data.candidates[0].content.parts[0].text; 
            firebase.database().ref(window.currentRoomId).push({ 
                name: "AI Assistant", 
                text: replyText, 
                sessionId: "ai-bot-session", 
                timestamp: firebase.database.ServerValue.TIMESTAMP, 
                userId: 'ai', 
                langCode: 'en', 
                flag: '🤖', 
                photo: 'https://ui-avatars.com/api/?name=AI&background=6b21a8&color=fff' 
            }); 
        })
        .finally(() => { setTimeout(() => { window.isGeminiWaiting = false; }, 2000); });
    }
};

window.handleNewMessage = async function(snapshot) {
    const data = snapshot.val(); 
    if(!data) return; 
    
    const chatMessages = document.getElementById('chat-messages');

    // ОЧИСТКА СТАРЫХ ВЕЕРОВ ПРИ НОВОМ СООБЩЕНИИ
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

    const messageGroup = document.createElement('div'); 
    messageGroup.className = "flex flex-col w-full mt-3 mb-2";
    
    const msgWrapper = document.createElement('div'); 
    msgWrapper.className = `flex gap-2 w-full ${isMe ? 'justify-end' : 'justify-start'}`;

    let avatarClick = isMe ? `window.openPersonalLangModal()` : `window.openAvatarModal('${p.id}')`;
    let avatarHtml = `<div class="relative shrink-0 self-end cursor-pointer hover:scale-105 transition" onclick="${avatarClick}"><img src="${isAI ? 'https://ui-avatars.com/api/?name=AI&background=6b21a8&color=fff' : p.photo}" class="w-8 h-8 rounded-full object-cover border border-[#2a3942] shadow-md"><span class="absolute -bottom-1 -right-1 text-[10px] bg-[#111b21] rounded-full px-[3px] shadow border border-[#2a3942] leading-none">${isAI ? '🤖' : (p.flag || '🌐')}</span></div>`;

    let bubbleContent = data.originalText || data.text;
    let bubbleClasses = `chat-bubble`;

    // ИСПОЛЬЗУЕМ ИЗОЛИРОВАННЫЙ ЯЗЫК КОМНАТЫ
    let myReadLang = window.getActiveRoomLang();
    let senderLang = data.langCode || 'auto'; 

    // ИНЛАЙН ПЕРЕВОД (Отключен для свежих сообщений Глобального чата)
    if (data.originalText && !data.isAIAudio && !data.mediaUrl && !data.isTransfer && !data.isLocation) {
        if (window.currentRoomId !== 'global' || isHistory) {
            if (!isMe && !isAI && senderLang.substring(0,2) !== myReadLang.substring(0,2)) {
                try {
                    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${senderLang}&tl=${myReadLang}&dt=t&q=${encodeURIComponent(data.originalText)}`);
                    const resData = await res.json();
                    let translatedText = (resData && resData[0] && resData[0][0]) ? resData[0][0][0] : data.originalText;

                    bubbleContent = `
                        <div class="text-[#e9edef]">${data.originalText}</div>
                        <div class="mt-1 pt-1 border-t border-white/20 text-[0.75rem] text-[#00a884] font-bold tracking-wide">➔ ${translatedText}</div>
                    `;
                } catch(e) {
                    bubbleContent = data.originalText;
                }
            }
            else if (isMe && data.originalText !== data.text) {
                bubbleContent = `
                    <div class="text-[#e9edef]">${data.originalText}</div>
                    <div class="mt-1 pt-1 border-t border-white/20 text-[0.75rem] text-[#00a884] font-bold tracking-wide">➔ ${data.text}</div>
                `;
            }
        }
    }

    if (data.isAIAudio) {
        let myCurrentLang = myReadLang;

        if (isMe && data.originalText) {
            let escText = encodeURIComponent(data.originalText);
            let playLang = data.langCode || myCurrentLang;
            bubbleContent = `
                <div class="ai-audio-player" onclick="window.playAIVoice('${escText}', '${playLang}')">
                    <i class="fa-solid fa-circle-play"></i><span>Play Voice</span>
                </div>
                <div style="font-size:0.85rem; margin-top:6px; opacity:0.95;">
                    ${data.originalText}
                    <div class="mt-2 pt-1.5 border-t border-white/20 text-[0.7rem] text-yellow-400 font-bold tracking-wide">➔ Перевод: ${data.text}</div>
                </div>`;
        } else {
            let escText = encodeURIComponent(data.text);
            let playLang = myCurrentLang;
            bubbleContent = `
                <div class="ai-audio-player" onclick="window.playAIVoice('${escText}', '${playLang}')">
                    <i class="fa-solid fa-circle-play"></i><span>Play Voice</span>
                </div>
                <div style="font-size:0.85rem; margin-top:6px; opacity:0.95;">${data.text}</div>`;
        }
    }
    else if (data.mediaUrl) { 
        if (data.mediaType === 'video') { 
            bubbleContent = `<video src="${data.mediaUrl}" controls class="max-w-[200px] sm:max-w-[250px] rounded-lg mt-1 border border-[#2a3942]"></video>`; 
        } else { 
            bubbleContent = `<img src="${data.mediaUrl}" class="max-w-[200px] sm:max-w-[250px] rounded-lg mt-1 cursor-pointer border border-[#2a3942] hover:opacity-90 transition" onclick="window.openFullscreenImage(this.src)">`; 
        } 
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

    if (!data.isVoiceRoomMsg && !data.isConfMsg) {
        msgWrapper.innerHTML = isMe ? `<div class="chat-bubble-wrapper outgoing items-end flex flex-col"><div class="chat-sender-name">${senderDisplayName}</div><div class="${bubbleClasses}">${bubbleContent}</div></div>` + avatarHtml : avatarHtml + `<div class="chat-bubble-wrapper incoming items-start flex flex-col"><div class="chat-sender-name">${senderDisplayName}</div><div class="${bubbleClasses}">${bubbleContent}</div></div>`;
        messageGroup.appendChild(msgWrapper);
        if(chatMessages) { 
            chatMessages.appendChild(messageGroup); 
            chatMessages.scrollTop = chatMessages.scrollHeight; 
        }
    }

    // ВЕЕР ДЛЯ ВСЕХ УЧАСТНИКОВ В ГЛОБАЛЬНОМ ЧАТЕ
    if (window.currentRoomId === 'global' && !isAI && !isHistory && !data.isTransfer && !data.mediaUrl && !data.isLocation && !data.isFile && !data.isAIAudio && !data.isVoiceRoomMsg && !data.isConfMsg) {
        let targetUsers = [];
        let processedLangs = new Set();

        let myFanFlag = window.myProfileInfo.flag || '🌐';
        const revLangMap = { 'en':'🇬🇧', 'ru':'🇷🇺', 'az':'🇦🇿', 'de':'🇩🇪', 'tr':'🇹🇷', 'ar':'🇦🇪', 'it':'🇮🇹', 'es':'🇪🇸', 'fr':'🇫🇷', 'pt':'🇵🇹', 'ja':'🇯🇵', 'zh':'🇨🇳' };
        
        let manualLang = window.getActiveRoomLang();
        if (manualLang && revLangMap[manualLang.substring(0,2)]) {
            myFanFlag = revLangMap[manualLang.substring(0,2)];
        }

        if (myReadLang && myReadLang !== 'un' && myReadLang.substring(0,2) !== senderLang.substring(0,2)) {
            processedLangs.add(myReadLang.substring(0,2));
            targetUsers.push({ code: myReadLang, flag: myFanFlag, photo: window.myProfileInfo.photo });
        }

        window.participants.filter(part => part.id !== 'ai').forEach(member => {
            let memberLang = window.getSmartLang(member);
            if (memberLang && memberLang !== 'un' && memberLang.substring(0,2) !== senderLang.substring(0,2)) {
                if (!processedLangs.has(memberLang.substring(0,2))) {
                    processedLangs.add(memberLang.substring(0,2));
                    targetUsers.push({ code: memberLang, flag: member.flag, photo: member.photo });
                }
            }
        });

        if (targetUsers.length > 0) {
            try {
                const fetchPromises = targetUsers.map(u => 
                    fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${senderLang}&tl=${u.code}&dt=t&q=${encodeURIComponent(data.originalText || data.text)}`)
                    .then(res => res.json())
                    .then(resData => ({ user: u, text: resData[0][0][0] }))
                    .catch(e => ({ user: u, text: data.originalText || data.text })) 
                );
                const translationsRes = await Promise.all(fetchPromises);

                const transContainer = document.createElement('div');
                transContainer.className = `sender-translate-fan flex flex-col gap-2 mt-2 w-full ${isMe ? 'items-end pr-2' : 'items-start pl-10'}`;
                let marqueeTextStr = '';

                translationsRes.forEach(t => {
                    const rowClass = isMe ? 'flex-row-reverse' : 'flex-row';
                    const radiusClass = isMe ? 'rounded-tr-sm' : 'rounded-tl-sm';
                    transContainer.innerHTML += `<div class="flex items-end gap-2 opacity-95 max-w-[85%] ${rowClass}"><div class="relative shrink-0"><img src="${t.user.photo}" class="w-6 h-6 rounded-full object-cover border border-[#00a884]"><span class="absolute -bottom-1 -right-1 text-[8px] bg-[#111b21] rounded-full px-[2px] leading-none">${t.user.flag}</span></div><div class="bg-[#202c33] border border-[#2a3942] rounded-2xl ${radiusClass} px-3 py-1.5 text-[0.8rem] text-yellow-400 font-bold shadow-sm">${t.text}</div></div>`;
                    marqueeTextStr += `${t.user.flag} ${t.text}        `;
                });

                messageGroup.appendChild(transContainer);
                chatMessages.scrollTop = chatMessages.scrollHeight;

                const mText = document.getElementById('chat-info-marquee');
                if (window.isMarqueeEnabled !== false && mText) {
                    mText.innerHTML = `<span class="text-white mr-2">${senderDisplayName}:</span> <span class="text-[#00a884] font-bold">${marqueeTextStr}</span>`;
                    mText.style.animation = 'none'; void mText.offsetWidth; mText.style.animation = null;
                }
            } catch (e) {}
        }
    }

    if (data.isVoiceRoomMsg) {
        let originalText = data.originalText || data.text;
        
        // ИСПОЛЬЗУЕМ ИЗОЛИРОВАННЫЙ ЯЗЫК КОМНАТЫ
        let myPersonalLang = window.getActiveRoomLang();

        let senderPhoto, senderFlag, senderLang, senderName;
        let receiverPhoto, receiverFlag, receiverLang, receiverName;

        if (isMe) {
            senderPhoto = window.myProfileInfo.photo; senderFlag = window.myProfileInfo.flag; senderLang = myPersonalLang; senderName = window.myUsername;
            receiverPhoto = window.currentTargetUser ? window.currentTargetUser.photo : 'https://ui-avatars.com/api/?name=U';
            receiverFlag = window.currentTargetUser ? window.currentTargetUser.flag : '🌐';
            receiverLang = window.currentTargetUser ? window.currentTargetUser.langCode : 'en';
            receiverName = window.currentTargetUser ? (window.currentTargetUser.name || 'User').split(' ')[0] : 'User';
        } else {
            senderPhoto = data.photo || 'https://ui-avatars.com/api/?name=U'; senderFlag = data.flag || '🌐'; senderLang = data.langCode || 'en'; senderName = (data.name || 'User').split(' ')[0];
            receiverPhoto = window.myProfileInfo.photo; receiverFlag = window.myProfileInfo.flag; receiverLang = myPersonalLang; receiverName = window.myUsername;
        }

        Promise.all([
            fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${senderLang}&tl=${senderLang}&dt=t&q=${encodeURIComponent(originalText)}`).then(r => r.json()).catch(e => null),
            fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${senderLang}&tl=${receiverLang}&dt=t&q=${encodeURIComponent(originalText)}`).then(r => r.json()).catch(e => null)
        ]).then(results => {
            const vMarquee = document.getElementById('voice-info-marquee');
            if (vMarquee && window.isVoiceMarqueeEnabled !== false) {
                let senderText = (results[0] && results[0][0]) ? results[0][0][0][0] : originalText;
                let receiverText = (results[1] && results[1][0]) ? results[1][0][0][0] : originalText;
                vMarquee.innerHTML = `
                    <div class="flex items-center">
                        <img src="${senderPhoto}" class="w-5 h-5 rounded-full border border-[#2a3942] mr-1 object-cover shadow-sm">
                        <span class="text-white font-bold mr-1">${senderName}:</span>
                        <span class="text-[#e9edef] mr-2">${senderFlag} ${senderText}</span> 
                        <i class="fa-solid fa-arrow-right text-[#00a884] mx-2 text-[0.6rem] animate-pulse"></i> 
                        <img src="${receiverPhoto}" class="w-5 h-5 rounded-full border border-[#00a884] mr-1 object-cover shadow-[0_0_5px_rgba(0,168,132,0.5)]">
                        <span class="text-white font-bold mr-1">${receiverName}:</span>
                        <span class="text-[#00a884] font-bold">${receiverFlag} ${receiverText}</span>
                    </div>
                `;
                vMarquee.style.animation = 'none'; void vMarquee.offsetWidth; vMarquee.style.animation = null;
            }
        });
    }

    if (data.isConfMsg) {
        let originalText = data.originalText || data.text;
        let displayedText = data.text;
        let senderMarqueeId = isMe ? 'speaker-marquee' : `conf-marquee-${data.userId}`;
        let speakerMarquee = document.getElementById(senderMarqueeId);

        if (speakerMarquee) {
            speakerMarquee.innerHTML = `<span class="text-white font-bold">${senderDisplayName}:</span> <span class="text-[#00a884] ml-2">${p.flag} ${displayedText}</span>`;
            speakerMarquee.style.animation = 'none'; void speakerMarquee.offsetWidth; speakerMarquee.style.animation = null;
        }

        document.querySelectorAll('.conf-listener-marquee').forEach(listenerMarquee => {
            if (listenerMarquee.id === senderMarqueeId) return;
            let targetLang = listenerMarquee.getAttribute('data-lang') || 'en';
            let targetFlag = listenerMarquee.getAttribute('data-flag') || '🌐';

            fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${data.langCode || 'auto'}&tl=${targetLang}&dt=t&q=${encodeURIComponent(originalText)}`)
                .then(r => r.json()).then(resData => {
                    let translatedText = (resData && resData[0] && resData[0][0]) ? resData[0][0][0] : originalText;
                    listenerMarquee.innerHTML = `<span class="text-[#8696a0] text-[0.65rem] uppercase tracking-widest">${senderDisplayName}:</span> <span class="text-yellow-400 font-bold ml-2">${targetFlag} ${translatedText}</span>`;
                    listenerMarquee.style.animation = 'none'; void listenerMarquee.offsetWidth; listenerMarquee.style.animation = null;
                }).catch(e => console.log('Meet Translate Error'));
        });
    }
};

window.smartArchive = function() {
    const archiveList = document.getElementById('archive-list');
    const emptyMsg = document.getElementById('empty-archive'); 
    if(emptyMsg) emptyMsg.style.display = 'none';
    
    let chatName = window.currentTargetUser ? window.currentTargetUser.name.split(' ')[0] : "Global Room";
    if (window.currentRoomId === 'private_ai_bot') chatName = "AI Assistant";
    else if (window.currentRoomId.startsWith('private_me')) chatName = "My Notes";
    
    let date = new Date().toLocaleDateString();
    let archiveItem = document.createElement('div'); 
    archiveItem.className = "bg-[#202c33] border border-[#2a3942] p-3 rounded-2xl flex justify-between items-center shadow-sm mb-2";
    archiveItem.innerHTML = `<div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-[#111b21] flex items-center justify-center text-blue-400 border border-[#2a3942]"><i class="fa-solid fa-file-zipper"></i></div><div class="flex flex-col"><span class="text-white font-bold text-sm">Backup: ${chatName}</span><span class="text-[#8696a0] text-xs">${date} • Database</span></div></div><i class="fa-solid fa-cloud-arrow-down text-[#00a884] cursor-pointer hover:text-white transition" title="Download"></i>`;
    
    archiveList.prepend(archiveItem); 
    window.showToast("Archived", "Saved to Cloud Repository", "", ""); 
    window.closeTrashModal(); 
    window.switchTab(5);
};

window.smartClear = function() {
    if(confirm("Are you sure you want to clear chat history?")) {
        const chatMsgs = document.getElementById('chat-messages'); 
        if(chatMsgs) chatMsgs.innerHTML = '';
        if(window.currentRoomId) { firebase.database().ref(window.currentRoomId).remove().catch(e => console.log("Cleared locally")); }
        window.closeTrashModal();
    }
};

window.closeTrashModal = function() { 
    const modal = document.getElementById('trash-modal');
    if(modal) modal.classList.remove('active'); 
};

window.currentEmojiTargetId = null;

window.toggleEmojiPicker = function(targetId) {
    window.currentEmojiTargetId = targetId; 
    const picker = document.getElementById('emoji-picker');
    if (!picker) return;
    if (picker.classList.contains('opacity-0')) { 
        picker.classList.remove('opacity-0', 'scale-95', 'pointer-events-none'); 
        picker.classList.add('opacity-100', 'scale-100'); 
    } else { 
        window.closeEmojiPicker(); 
    }
};

window.closeEmojiPicker = function() { 
    const picker = document.getElementById('emoji-picker'); 
    if(picker) {
        picker.classList.add('opacity-0', 'scale-95', 'pointer-events-none'); 
        picker.classList.remove('opacity-100', 'scale-100'); 
    }
};

window.insertEmoji = function(emoji) { 
    if(window.currentEmojiTargetId) { 
        const input = document.getElementById(window.currentEmojiTargetId); 
        if(input) { 
            input.value += emoji; 
            input.focus(); 
        } 
    } 
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('chat-input')?.addEventListener('keypress', e => { 
        if(e.key === 'Enter') { 
            window.currentMicInputTarget = 'chat-input'; 
            window.sendFirebaseMsg(); 
        } 
    });
    document.getElementById('voice-chat-input')?.addEventListener('keypress', e => { 
        if(e.key === 'Enter') { 
            window.currentMicInputTarget = 'voice-chat-input'; 
            window.sendFirebaseMsg(); 
        } 
    });
    document.getElementById('conf-chat-input')?.addEventListener('keypress', e => { 
        if(e.key === 'Enter') { 
            window.currentMicInputTarget = 'conf-chat-input'; 
            window.sendFirebaseMsg(); 
        } 
    });
});

// === 2. ПОЛНЫЙ ПЕРЕХВАТ И ПРИВЯЗКА ПАНЕЛИ ЯЗЫКОВ К КОМНАТАМ ===

window.openPersonalLangModal = function() {
    if (window.closeDropdown) window.closeDropdown();
    const listContainer = document.getElementById('personal-lang-list');
    if (!listContainer) return;

    let currentPref = localStorage.getItem('room_lang_' + window.currentRoomId) || 'auto';

    const langs = [
        {code: 'auto', name: '🤖 Auto (Profile)', flag: '🌐'},
        {code: 'en', name: 'English', flag: '🇬🇧'}, {code: 'ru', name: 'Русский', flag: '🇷🇺'},
        {code: 'az', name: 'Azərbaycanca', flag: '🇦🇿'}, {code: 'de', name: 'Deutsch', flag: '🇩🇪'},
        {code: 'tr', name: 'Türkçe', flag: '🇹🇷'}, {code: 'ar', name: 'العربية', flag: '🇦🇪'},
        {code: 'it', name: 'Italiano', flag: '🇮🇹'}, {code: 'es', name: 'Español', flag: '🇪🇸'},
        {code: 'fr', name: 'Français', flag: '🇫🇷'}, {code: 'pt', name: 'Português', flag: '🇵🇹'},
        {code: 'ja', name: '日本語', flag: '🇯🇵'}, {code: 'zh', name: '中文', flag: '🇨🇳'}
    ];

    let html = '';
    langs.forEach(l => {
        let isActive = (currentPref === l.code) ? 'border-[#00a884] bg-[#202c33]' : 'border-[#2a3942] bg-[#111b21]';
        html += `<div onclick="window.saveRoomLang('${l.code}')" class="flex items-center p-3 rounded-xl border ${isActive} cursor-pointer mb-2 transition hover:border-[#00a884]">
            <span class="text-white font-bold text-[0.9rem] flex gap-3 items-center"><span class="text-xl">${l.flag}</span> ${l.name}</span>
        </div>`;
    });
    listContainer.innerHTML = html;
    document.getElementById('personal-lang-modal').classList.add('active');
};

window.saveRoomLang = function(langCode) {
    if (!window.currentRoomId) return;
    
    if (langCode === 'auto') {
        localStorage.removeItem('room_lang_' + window.currentRoomId);
    } else {
        localStorage.setItem('room_lang_' + window.currentRoomId, langCode);
    }
    
    document.getElementById('personal-lang-modal').classList.remove('active');
    if (window.showToast) window.showToast("Language Saved", "Applied only to this room.", "", "");
};

window.closePersonalLangModal = function() {
    const modal = document.getElementById('personal-lang-modal');
    if (modal) modal.classList.remove('active');
};

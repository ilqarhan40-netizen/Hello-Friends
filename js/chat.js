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
        const targetUser = window.participants.find(p => p.id === targetId);
        if(targetUser) {
            window.currentTargetUser = targetUser;
            let id1 = String(window.myProfileInfo.id); let id2 = String(targetUser.id);
            window.currentRoomId = (id1 < id2) ? ("private_" + id1 + "_" + id2) : ("private_" + id2 + "_" + id1);
            headerTitle = (targetUser.name || 'User').split(' ')[0] + " " + targetUser.flag; headerRoomId = window.currentRoomId;
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
    
    if (window.currentRoomId === 'private_ai_bot' && window.isGeminiWaiting) { window.showToast("Google AI", "Please wait a moment...", "", ""); return; }
    inputField.value = '';

    let isVoice = inputId === 'voice-chat-input';
    let isConf = inputId === 'conf-chat-input';

    let myActiveLang = window.getLangPref(isVoice, isConf);

    let activeFlag = window.myProfileInfo.flag || '🌐';
    let activeFlagCode = window.myProfileInfo.flagCode || 'un';

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

    const chatMsgs = document.getElementById('chat-messages'); 
    if (chatMsgs) setTimeout(() => { chatMsgs.scrollTop = chatMsgs.scrollHeight; }, 100); 
    if (window.currentTargetUser && !isConf && !isVoice) { window.sendPushToUser(window.currentTargetUser.id, window.myUsername, textToShip); }

    if (window.currentRoomId === 'private_ai_bot') {
        window.isGeminiWaiting = true;
        const GEMINI_API_KEY = "AIzaSyB51d72XWcV5AGgLVM1UOg61eCYir78PkY"; 
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ contents: [{ parts: [{ text: "Reply in the exact same language: " + rawText }] }] }) 
        })
        .then(res => res.json())
        .then(data => { 
            let replyText = data.candidates[0].content.parts[0].text; 
            firebase.database().ref(window.currentRoomId).push({ 
                name: "AI Assistant", text: replyText, sessionId: "ai-bot-session", 
                timestamp: firebase.database.ServerValue.TIMESTAMP, userId: 'ai', 
                langCode: 'en', flag: '🤖', photo: 'https://ui-avatars.com/api/?name=AI&background=6b21a8&color=fff' 
            }); 
        })
        .finally(() => { setTimeout(() => { window.isGeminiWaiting = false; }, 2000); });
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
        let mainText = isMe ? data.originalText : finalTranslatedText; 
        let transHtml = (isMe && data.originalText && data.text !== data.originalText) ? `<div class="mt-2 pt-1.5 border-t border-white/20 text-[0.7rem] text-yellow-400 font-bold tracking-wide">➔ Перевод: ${data.text}</div>` : '';
        bubbleContent = `<div class="ai-audio-player" onclick="window.playAIVoice('${encodeURIComponent(mainText)}', '${playLang.substring(0,2)}')"><i class="fa-solid fa-circle-play"></i><span>Play Voice</span></div><div style="font-size:0.85rem; margin-top:6px; opacity:0.95;">${mainText}${transHtml}</div>`;
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

    if (!data.isVoiceRoomMsg && !data.isConfMsg) {
        msgWrapper.innerHTML = isMe ? `<div class="chat-bubble-wrapper outgoing items-end flex flex-col"><div class="chat-sender-name">${senderDisplayName}</div><div class="${bubbleClasses}">${bubbleContent}</div></div>` + avatarHtml : avatarHtml + `<div class="chat-bubble-wrapper incoming items-start flex flex-col"><div class="chat-sender-name">${senderDisplayName}</div><div class="${bubbleClasses}">${bubbleContent}</div></div>`;
        messageGroup.appendChild(msgWrapper);
        if(chatMessages) { chatMessages.appendChild(messageGroup); chatMessages.scrollTop = chatMessages.scrollHeight; }
    }

    if (window.currentRoomId === 'global' && !isAI && !isHistory && !data.isTransfer && !data.mediaUrl && !data.isLocation && !data.isFile && !data.isAIAudio && !data.isVoiceRoomMsg && !data.isConfMsg) {
        let targetUsers = []; let processedLangs = new Set();
        let myFanFlag = window.myProfileInfo.flag || '🌐';
        const revLangMap = { 'en':'🇬🇧', 'ru':'🇷🇺', 'az':'🇦🇿', 'de':'🇩🇪', 'tr':'🇹🇷', 'ar':'🇦🇪', 'it':'🇮🇹', 'es':'🇪🇸', 'fr':'🇫🇷', 'pt':'🇵🇹', 'ja':'🇯🇵', 'zh':'🇨🇳' };
        
        let manualLang = window.getLangPref(false, false);
        if (manualLang && revLangMap[manualLang.substring(0,2)]) { myFanFlag = revLangMap[manualLang.substring(0,2)]; }

        if (myReadLang && myReadLang !== 'un' && myReadLang.substring(0,2) !== senderLang.substring(0,2)) {
            processedLangs.add(myReadLang.substring(0,2));
            targetUsers.push({ code: myReadLang, flag: myFanFlag, photo: window.myProfileInfo.photo });
        }

        window.participants.filter(part => part.id !== 'ai').forEach(member => {
            let memberLang = window.getSmartLang(member);
            if (memberLang && memberLang !== 'un' && memberLang.substring(0,2) !== senderLang.substring(0,2)) {
                if (!processedLangs.has(memberLang.substring(0,2))) {
                    processedLangs.add(memberLang.substring(0,2)); targetUsers.push({ code: memberLang, flag: member.flag, photo: member.photo });
                }
            }
        });

        if (targetUsers.length > 0) {
            try {
                const fetchPromises = targetUsers.map(u => 
                    fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${senderLang}&tl=${u.code}&dt=t&q=${encodeURIComponent(data.originalText || data.text)}`)
                    .then(res => res.json()).then(resData => ({ user: u, text: resData[0][0][0] })).catch(e => ({ user: u, text: data.originalText || data.text })) 
                );
                const translationsRes = await Promise.all(fetchPromises);
                const transContainer = document.createElement('div');
                transContainer.className = `sender-translate-fan flex flex-col gap-2 mt-2 w-full ${isMe ? 'items-end pr-2' : 'items-start pl-10'}`;
                let marqueeTextStr = '';

                translationsRes.forEach(t => {
                    const rowClass = isMe ? 'flex-row-reverse' : 'flex-row'; const radiusClass = isMe ? 'rounded-tr-sm' : 'rounded-tl-sm';
                    transContainer.innerHTML += `<div class="flex items-end gap-2 opacity-95 max-w-[85%] ${rowClass}"><div class="relative shrink-0"><img src="${t.user.photo}" class="w-6 h-6 rounded-full object-cover border border-[#00a884]"><span class="absolute -bottom-1 -right-1 text-[8px] bg-[#111b21] rounded-full px-[2px] leading-none">${t.user.flag}</span></div><div class="bg-[#202c33] border border-[#2a3942] rounded-2xl ${radiusClass} px-3 py-1.5 text-[0.8rem] text-yellow-400 font-bold shadow-sm">${t.text}</div></div>`;
                    marqueeTextStr += `${t.user.flag} ${t.text}        `;
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

    if (data.isVoiceRoomMsg) {
        let originalText = data.originalText || data.text;
        
        let myPersonalLang = window.getLangPref(true, false);
        
        let senderPhoto, senderFlag, senderLang, senderName;
        let receiverPhoto, receiverFlag, receiverLang, receiverName;

        if (isMe) {
            senderPhoto = window.myProfileInfo.photo; senderFlag = window.myProfileInfo.flag; senderLang = myPersonalLang; senderName = window.myUsername;
            receiverPhoto = window.currentTargetUser ? window.currentTargetUser.photo : 'https://ui-avatars.com/api/?name=U'; receiverFlag = window.currentTargetUser ? window.currentTargetUser.flag : '🌐'; receiverLang = window.currentTargetUser ? window.currentTargetUser.langCode : 'en'; receiverName = window.currentTargetUser ? (window.currentTargetUser.name || 'User').split(' ')[0] : 'User';
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
                let senderText = (results[0] && results[0][0]) ? results[0][0][0][0] : originalText; let receiverText = (results[1] && results[1][0]) ? results[1][0][0][0] : originalText;
                vMarquee.innerHTML = `<div class="flex items-center"><img src="${senderPhoto}" class="w-5 h-5 rounded-full border border-[#2a3942] mr-1 object-cover shadow-sm"><span class="text-white font-bold mr-1">${senderName}:</span><span class="text-[#e9edef] mr-2">${senderFlag} ${senderText}</span> <i class="fa-solid fa-arrow-right text-[#00a884] mx-2 text-[0.6rem] animate-pulse"></i> <img src="${receiverPhoto}" class="w-5 h-5 rounded-full border border-[#00a884] mr-1 object-cover shadow-[0_0_5px_rgba(0,168,132,0.5)]"><span class="text-white font-bold mr-1">${receiverName}:</span><span class="text-[#00a884] font-bold">${receiverFlag} ${receiverText}</span></div>`;
                vMarquee.style.animation = 'none'; void vMarquee.offsetWidth; vMarquee.style.animation = null;
            }
        });
    }

    if (data.isConfMsg) {
        let originalText = data.originalText || data.text;
        
        let senderLangCode = data.langCode || 'auto'; 
        
        let senderMarqueeId = isMe ? 'speaker-marquee' : `conf-marquee-${data.userId}`;
        let speakerMarquee = document.getElementById(senderMarqueeId);
        
        if (speakerMarquee) {
            speakerMarquee.innerHTML = `<span class="text-white font-bold">${senderDisplayName}:</span> <span class="text-[#00a884] ml-2">${data.flag || '🌐'} ${originalText}</span>`;
            speakerMarquee.style.animation = 'none'; 
            void speakerMarquee.offsetWidth; 
            speakerMarquee.style.animation = null;
        }

        document.querySelectorAll('.conf-listener-marquee').forEach(listenerMarquee => {
            if (listenerMarquee.id === senderMarqueeId) return; 
            
            let targetLang = listenerMarquee.getAttribute('data-lang') || 'en'; 
            let targetFlag = listenerMarquee.getAttribute('data-flag') || '🌐';
            
            fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${senderLangCode}&tl=${targetLang}&dt=t&q=${encodeURIComponent(originalText)}`)
                .then(r => r.json())
                .then(resData => {
                    let translatedText = (resData && resData[0] && resData[0][0]) ? resData[0][0][0] : originalText;
                    
                    listenerMarquee.innerHTML = `<span class="text-[#8696a0] text-[0.65rem] uppercase tracking-widest">${senderDisplayName}:</span> <span class="text-yellow-400 font-bold ml-2">${targetFlag} ${translatedText}</span>`;
                    
                    listenerMarquee.style.animation = 'none'; 
                    void listenerMarquee.offsetWidth; 
                    listenerMarquee.style.animation = null;
                }).catch(e => console.log('Meet Translate Error'));
        });
    }
};

// ==========================================
// ОСНОВНЫЕ ФУНКЦИИ И АРХИВ
// ==========================================

window.openArchiveActionMenu = function(e, itemId, itemTitle, itemContent) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    
    window.currentArchiveItem = { id: itemId, title: itemTitle, content: itemContent };
    const modal = document.getElementById('archive-action-modal');
    const contentBox = document.getElementById('archive-action-content');
    
    if (!modal || !contentBox) return;
    
    document.getElementById('action-modal-title').innerText = itemTitle || "Действие с файлом";
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    setTimeout(() => {
        contentBox.classList.remove('translate-y-full');
    }, 10);
};

window.closeArchiveActionMenu = function() {
    const modal = document.getElementById('archive-action-modal');
    const contentBox = document.getElementById('archive-action-content');
    
    contentBox.classList.add('translate-y-full');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        window.currentArchiveItem = null;
    }, 300);
};

window.archiveAction = function(actionType) {
    if (!window.currentArchiveItem) return;
    const { id, title, content } = window.currentArchiveItem;

    if (actionType === 'delete') {
        if (window.mailArchiveDB) {
            window.mailArchiveDB = window.mailArchiveDB.filter(item => item.id !== id);
            if(document.getElementById('email-list-view') && !document.getElementById('email-list-view').classList.contains('hidden')) {
                window.renderEmailArchive(); 
            }
        }
        const domItem = document.getElementById(id);
        if (domItem) domItem.remove();
        
        if (window.showToast) window.showToast("Deleted", "File removed.", "", "");
        
    } else if (actionType === 'copy') {
        navigator.clipboard.writeText(content).then(() => {
            if (window.showToast) window.showToast("Copied", "Copied to clipboard.", "", "");
        });
    } else if (actionType === 'save') {
        if (window.showToast) window.showToast("Saved", "File saved to device.", "", "");
    }
    
    window.closeArchiveActionMenu();
};

window.smartArchive = function() {
    const archiveList = document.getElementById('archive-list'); 
    const emptyMsg = document.getElementById('empty-archive'); 
    if(emptyMsg) emptyMsg.style.display = 'none';
    
    let chatName = window.currentTargetUser ? window.currentTargetUser.name.split(' ')[0] : "Global Room";
    if (window.currentRoomId === 'private_ai_bot') chatName = "AI Assistant"; 
    else if (window.currentRoomId.startsWith('private_me')) chatName = "My Notes";
    
    let date = new Date().toLocaleDateString(); 
    let uniqueId = 'archive_item_' + Date.now();
    
    let archiveItem = document.createElement('div'); 
    archiveItem.id = uniqueId;
    archiveItem.className = "bg-[#202c33] border border-[#2a3942] p-3 rounded-2xl flex justify-between items-center shadow-sm mb-2";
    
    archiveItem.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-[#111b21] flex items-center justify-center text-blue-400 border border-[#2a3942]"><i class="fa-solid fa-file-zipper"></i></div>
            <div class="flex flex-col"><span class="text-white font-bold text-sm">Backup: ${chatName}</span><span class="text-[#8696a0] text-xs">${date} • Database</span></div>
        </div>
        <button onclick="window.openArchiveActionMenu(event, '${uniqueId}', 'Backup: ${chatName}', 'Текст бэкапа')" class="text-[#8696a0] hover:text-white transition p-2 text-lg shrink-0 z-10 relative">
            <i class="fa-solid fa-ellipsis-vertical"></i>
        </button>
    `;
    
    archiveList.prepend(archiveItem); 
    window.showToast("Archived", "Saved to Cloud Repository", "", ""); 
    window.closeTrashModal(); 
    window.switchTab(5);
};

window.smartClear = function() {
    if(confirm("Are you sure you want to clear chat history?")) {
        const chatMsgs = document.getElementById('chat-messages'); if(chatMsgs) chatMsgs.innerHTML = '';
        if(window.currentRoomId) { firebase.database().ref(window.currentRoomId).remove().catch(e => console.log("Cleared locally")); }
        window.closeTrashModal();
    }
};

window.closeTrashModal = function() { document.getElementById('trash-modal')?.classList.remove('active'); };

window.actionArchiveChat = function() {
    window.showToast("Archived", "Saved to Cloud Repository", "", ""); 
    window.closeTrashModal(); 
};

window.actionClearHistory = function() {
    if(confirm("Clear all messages in this chat?")) {
        const chatMsgs = document.getElementById('chat-messages'); 
        if(chatMsgs) chatMsgs.innerHTML = '';
        if(window.currentRoomId) { firebase.database().ref(window.currentRoomId).remove().catch(e => console.log("Cleared locally")); }
        window.showToast("Chat Cleared", "Message history deleted", "", "");
        window.closeTrashModal();
    }
};

window.actionDeleteForever = function() {
    if(confirm("WARNING: Delete this chat forever? This cannot be undone.")) {
        const chatMsgs = document.getElementById('chat-messages'); 
        if(chatMsgs) chatMsgs.innerHTML = '';
        if(window.currentRoomId) { firebase.database().ref(window.currentRoomId).remove(); }
        window.showToast("Deleted Forever", "Room and history destroyed", "", "");
        window.closeTrashModal();
        if (window.currentRoomId !== 'global') { window.switchChatRoom('global'); }
    }
};

window.currentEmojiTargetId = null;
window.toggleEmojiPicker = function(targetId) { window.currentEmojiTargetId = targetId; const picker = document.getElementById('emoji-picker'); if (!picker) return; if (picker.classList.contains('opacity-0')) { picker.classList.remove('opacity-0', 'scale-95', 'pointer-events-none'); picker.classList.add('opacity-100', 'scale-100'); } else { window.closeEmojiPicker(); } };
window.closeEmojiPicker = function() { const picker = document.getElementById('emoji-picker'); if(picker) { picker.classList.add('opacity-0', 'scale-95', 'pointer-events-none'); picker.classList.remove('opacity-100', 'scale-100'); } };
window.insertEmoji = function(emoji) { if(window.currentEmojiTargetId) { const input = document.getElementById(window.currentEmojiTargetId); if(input) { input.value += emoji; input.focus(); } } };

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('chat-input')?.addEventListener('keypress', e => { if(e.key === 'Enter') { window.currentMicInputTarget = 'chat-input'; window.sendFirebaseMsg(); } });
    document.getElementById('voice-chat-input')?.addEventListener('keypress', e => { if(e.key === 'Enter') { window.currentMicInputTarget = 'voice-chat-input'; window.sendFirebaseMsg(); } });
    document.getElementById('conf-chat-input')?.addEventListener('keypress', e => { if(e.key === 'Enter') { window.currentMicInputTarget = 'conf-chat-input'; window.sendFirebaseMsg(); } });
});

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

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        let micSel = document.getElementById('plus-mic-lang');
        if (micSel) { micSel.addEventListener('change', function() { window.saveRoomMicLang(this.value); }); }
    }, 1000);
});

if (!window.micSyncHooked) {
    const origSwitchTabMic = window.switchTab;
    window.switchTab = function(index) { if (origSwitchTabMic) origSwitchTabMic(index); setTimeout(window.syncMicLangUI, 100); };
    const origSwitchChatMic = window.switchChatRoom;
    window.switchChatRoom = function(targetId) { if (origSwitchChatMic) origSwitchChatMic(targetId); setTimeout(window.syncMicLangUI, 100); };
    window.micSyncHooked = true;
}

window.autoSetMicLang = function() { window.syncMicLangUI(); };

window.startUniversalMic = async function(mode) {
    window.speechRecognizedText = "";
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    let rec = SpeechRec ? new SpeechRec() : null;
    if (!rec) return alert("Browser does not support Speech Recognition.");
    
    rec.continuous = false; rec.interimResults = false;
    
    let selectedMicLang = localStorage.getItem(window.getMicLangKey()) || 'auto';
    let currentMicCode = 'en-US';
    
    if (selectedMicLang === 'auto') {
        let phone = window.myProfileInfo.phone || ""; let flag = window.myProfileInfo.flagCode || "un"; 
        if (phone.startsWith('+7')) currentMicCode = 'ru-RU'; else if (phone.startsWith('+994')) currentMicCode = 'az-AZ'; 
        else if (phone.startsWith('+39')) currentMicCode = 'it-IT'; else if (phone.startsWith('+49')) currentMicCode = 'de-DE'; 
        else if (phone.startsWith('+33')) currentMicCode = 'fr-FR'; else if (phone.startsWith('+81')) currentMicCode = 'ja-JP'; 
        else if (phone.startsWith('+34')) currentMicCode = 'es-ES'; else if (phone.startsWith('+86')) currentMicCode = 'zh-CN'; 
        else if (phone.startsWith('+351')) currentMicCode = 'pt-PT'; else if (flag === 'ru') currentMicCode = 'ru-RU'; 
        else if (flag === 'az') currentMicCode = 'az-AZ'; else if (flag === 'it') currentMicCode = 'it-IT'; 
        else if (flag === 'de') currentMicCode = 'de-DE'; else if (flag === 'fr') currentMicCode = 'fr-FR'; 
        else if (flag === 'jp') currentMicCode = 'ja-JP'; else if (flag === 'es') currentMicCode = 'es-ES'; 
        else if (flag === 'cn') currentMicCode = 'zh-CN'; else if (flag === 'pt') currentMicCode = 'pt-PT';
        rec.lang = currentMicCode;
    } else {
        rec.lang = selectedMicLang;
    }
    
    let sourceTranslateLang = rec.lang.substring(0, 2);
    window.showToast("Listening...", "Speak into the microphone", "", "");
    
    rec.onresult = async (e) => { 
        window.speechRecognizedText = e.results[0][0].transcript; 
        let targetLang = window.currentTargetUser ? window.getSmartLang(window.currentTargetUser) : window.getSmartLang(window.myProfileInfo);
        window.showToast("Translating...", "Processing your voice...", "", "");
        let textToShip = window.speechRecognizedText;
        
        try { 
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceTranslateLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(window.speechRecognizedText)}`); 
            const data = await res.json(); 
            if (data && data[0] && data[0][0][0]) textToShip = data[0][0][0]; 
        } catch (err) {}

        let isVoice = window.currentMicInputTarget === 'voice-chat-input';
        let isConf = window.currentMicInputTarget === 'conf-chat-input';
        let msgPayload = { 
            userId: window.myProfileInfo.id, name: window.myUsername, text: textToShip, originalText: window.speechRecognizedText, 
            sessionId: window.mySessionId, timestamp: firebase.database.ServerValue.TIMESTAMP, photo: window.myProfileInfo.photo, 
            flag: window.myProfileInfo.flag, flagCode: window.myProfileInfo.flagCode, langCode: sourceTranslateLang,
            isVoiceRoomMsg: isVoice, isConfMsg: isConf 
        };

        if (mode === 'text') { firebase.database().ref(window.currentRoomId).push(msgPayload); } 
        else if (mode === 'ai-audio') { msgPayload.isAIAudio = true; firebase.database().ref(window.currentRoomId).push(msgPayload); }
    };
    try { rec.start(); } catch(e){}
};

// ==========================================
// МОДУЛЬ: ПОЧТОВЫЙ АРХИВ И ДАТА ЦЕНТР
// ==========================================
window.mailArchiveDB = [];

window.updateArchiveBadge = function() {
    const unreadCount = window.mailArchiveDB.filter(mail => mail.unread).length;
    const badge = document.getElementById('archive-unread-badge'); 
    if (badge) {
        if (unreadCount > 0) { badge.classList.remove('hidden'); } 
        else { badge.classList.add('hidden'); }
    }
};

window.openMainArchive = function() {
    if (window.closeDropdown) window.closeDropdown();
    
    const listContainer = document.getElementById('email-list-view');
    if (!listContainer) return;

    const categories = [
        { id: 'mail', name: 'Mail (Inbox)', icon: 'fa-envelope', color: 'text-blue-400', count: window.mailArchiveDB.filter(m => m.unread).length },
        { id: 'video', name: 'Video Files', icon: 'fa-video', color: 'text-red-400', count: 0 },
        { id: 'files', name: 'General Files', icon: 'fa-file', color: 'text-yellow-400', count: 0 },
        { id: 'docs', name: 'Documents', icon: 'fa-file-lines', color: 'text-green-400', count: 0 }
    ];

    let html = `<div class="grid grid-cols-2 gap-3 p-2 w-full">`;
    categories.forEach(cat => {
        let badgeHtml = cat.count > 0 ? `<span class="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full border-2 border-[#202c33] shadow-md">${cat.count}</span>` : '';
        html += `
            <div onclick="window.openArchiveFolder('${cat.id}')" class="relative bg-[#202c33] border border-[#2a3942] p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[#00a884] transition cursor-pointer shadow-sm min-h-[100px]">
                <i class="fa-solid ${cat.icon} text-3xl ${cat.color}"></i>
                <span class="text-white text-[0.65rem] font-bold uppercase tracking-wider text-center mt-1">${cat.name}</span>
                ${badgeHtml}
            </div>
        `;
    });
    html += `</div>`;
    listContainer.innerHTML = html;

    document.getElementById('email-list-view').classList.remove('hidden');
    document.getElementById('email-reader-view').classList.add('hidden');
    
    const title = document.getElementById('archive-modal-title');
    if (title) title.innerHTML = `<i class="fa-solid fa-box-archive text-[#00a884] mr-2"></i> Data Center`;

    document.getElementById('archive-modal').classList.add('active');
    window.updateArchiveBadge(); 
};

window.openArchiveFolder = function(folderId) {
    if (folderId === 'mail') { window.openEmailArchive(); } 
    else { window.showToast("Folder Status", "This folder is currently empty.", "", ""); }
};

window.openEmailArchive = function() {
    const title = document.getElementById('archive-modal-title');
    if (title) title.innerHTML = `<button onclick="window.openMainArchive()" class="text-[#8696a0] hover:text-white mr-3 transition"><i class="fa-solid fa-arrow-left"></i></button><i class="fa-solid fa-envelope-open-text text-blue-400 mr-2"></i> Mail Archive`;

    const listContainer = document.getElementById('email-list-view');
    listContainer.innerHTML = '';

    if (window.mailArchiveDB.length === 0) {
        listContainer.innerHTML = `<div class="text-center text-[#8696a0] mt-10"><i class="fa-solid fa-inbox text-4xl mb-3 opacity-50"></i><br>Archive is empty</div>`;
        return;
    }

    window.renderEmailArchive(); // Вызываем новую отрисовку с 3 точками
};

window.renderEmailArchive = function() {
    const listContainer = document.getElementById('email-list-view');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    if (window.mailArchiveDB.length === 0) {
        listContainer.innerHTML = '<p class="text-center text-[#8696a0] text-sm mt-4">Data Center is empty.</p>';
        return;
    }

    window.mailArchiveDB.forEach(email => {
        let unreadDot = email.unread ? `<div class="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)] shrink-0"></div>` : ``;
        let bgClass = email.unread ? 'bg-[#202c33] border-[#3b82f6]/30' : 'bg-[#111b21] border-[#2a3942] opacity-80';
        let textBold = email.unread ? 'text-white font-bold' : 'text-[#e9edef]';
        
        let safeText = (email.text || email.body || '').replace(/\n/g, '\\n').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        let safeSubject = (email.subject || 'No Subject').replace(/'/g, "\\'").replace(/"/g, '&quot;');

        listContainer.innerHTML += `
            <div id="${email.id}" class="flex items-center justify-between p-3 rounded-xl border hover:border-blue-400 transition shadow-sm ${bgClass} mb-2 relative">
                <div class="flex items-center gap-3 flex-1 overflow-hidden cursor-pointer" onclick="window.viewSpecificEmail('${email.id}')">
                    <div class="w-10 h-10 shrink-0 rounded-full bg-[#111b21] border border-[#2a3942] flex items-center justify-center text-[#8696a0]">
                        <i class="fa-solid fa-at"></i>
                    </div>
                    <div class="flex flex-col flex-1 overflow-hidden">
                        <div class="flex justify-between items-center w-full">
                            <span class="text-xs text-[#8696a0] truncate max-w-[70%]">${email.from || email.sender || 'Unknown'}</span>
                            <span class="text-[0.65rem] text-[#8696a0] pr-2">${email.date || ''}</span>
                        </div>
                        <span class="${textBold} text-sm truncate w-full mt-0.5">${safeSubject}</span>
                    </div>
                    ${unreadDot}
                </div>
                <button onclick="event.stopPropagation(); window.openArchiveActionMenu(event, '${email.id}', '${safeSubject}', '${safeText}')" class="text-[#8696a0] hover:text-white transition p-2 text-lg shrink-0 ml-1 z-10 relative">
                    <i class="fa-solid fa-ellipsis-vertical"></i>
                </button>
            </div>
        `;
    });
};

window.viewSpecificEmail = function(id) {
    const email = window.mailArchiveDB.find(e => String(e.id) === String(id));
    if (!email) return;

    email.unread = false;
    window.updateArchiveBadge(); 

    document.getElementById('email-read-subject').innerText = email.subject || 'No Subject';
    document.getElementById('email-read-from').innerText = email.from || email.sender || 'Unknown';
    document.getElementById('email-read-date').innerText = email.date || '';
    
    let bodyText = email.text || email.body || email.plainBody || 'Empty message';
    document.getElementById('email-read-body').innerHTML = bodyText.replace(/\n/g, '<br>');

    document.getElementById('email-list-view').classList.add('hidden');
    document.getElementById('email-reader-view').classList.remove('hidden');
    document.getElementById('email-reader-view').classList.add('flex');
};

window.backToEmailList = function() {
    window.openEmailArchive(); 
    document.getElementById('email-reader-view').classList.add('hidden');
    document.getElementById('email-reader-view').classList.remove('flex');
    document.getElementById('email-list-view').classList.remove('hidden');
};

window.closeEmailArchive = function() {
    document.getElementById('archive-modal').classList.remove('active');
};

window.initMailArchiveRealtime = function() {
    const mailRef = firebase.database().ref('mailArchive');

    mailRef.on('child_added', (snapshot) => {
        const newMail = snapshot.val();
        if (!newMail) return;

        const exists = window.mailArchiveDB.some(m => m.id === snapshot.key);
        if (!exists) {
            let mailDate = newMail.date || new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            window.mailArchiveDB.unshift({
                id: snapshot.key,
                unread: true,
                date: mailDate,
                ...newMail
            });
            
            window.updateArchiveBadge();
            
            const listContainer = document.getElementById('email-list-view');
            if (listContainer && !listContainer.classList.contains('hidden')) {
                window.openEmailArchive();
            }

            if (window.showToast) {
                window.showToast("New Email", newMail.subject || "New message", "https://ui-avatars.com/api/?name=Mail&background=00a884&color=fff", "");
            }
            if (window.sndMsg) window.sndMsg.play().catch(e=>{});
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(window.updateArchiveBadge, 1000);
    setTimeout(window.initMailArchiveRealtime, 2000);
});

// ==========================================
// ДЕМО-МАГАЗИН: ПОКУПКА ПОЧТЫ ЗА 1 ЦЕНТ
// ==========================================

window.openEmailStore = function() {
    if (window.closeDropdown) window.closeDropdown(); 
    const modal = document.getElementById('email-store-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => { modal.querySelector('div').classList.remove('scale-95'); }, 10);
        document.getElementById('new-email-prefix').value = '';
    }
};

window.closeEmailStore = function() {
    const modal = document.getElementById('email-store-modal');
    if (modal) {
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => { 
            modal.classList.add('hidden'); 
            modal.classList.remove('flex');
        }, 200);
    }
};

window.buyCorporateEmail = function() {
    const prefixInput = document.getElementById('new-email-prefix').value.trim().toLowerCase();
    let currentLang = window.appLang || 'en';
    
    if (!prefixInput) {
        let errorMsg = currentLang === 'ru' ? "Введите желаемое имя!" : (currentLang === 'az' ? "İstədiyiniz adı daxil edin!" : "Please enter a desired name!");
        if (window.showToast) window.showToast("Error", errorMsg, "", "");
        return;
    }

    if (/[^a-z0-9.]/.test(prefixInput)) {
        let errorValid = currentLang === 'ru' ? "Только английские буквы и цифры" : (currentLang === 'az' ? "Yalnız ingilis hərfləri və rəqəmlər" : "Only English letters and numbers");
        if (window.showToast) window.showToast("Error", errorValid, "", "");
        return;
    }

    const price = 0.01;
    const domain = "@hellofriends.app";
    const fullEmail = prefixInput + domain;
    
    if (window.sndCash) {
        window.sndCash.play().catch(e => console.log('Audio play prevented'));
    }

    let toastTitle = currentLang === 'ru' ? "Оплата успешна" : (currentLang === 'az' ? "Ödəniş uğurlu oldu" : "Transaction Successful");
    let toastDesc = currentLang === 'ru' ? `Почта <b>${fullEmail}</b> активна.<br>Списано: $${price}` : (currentLang === 'az' ? `E-poçt <b>${fullEmail}</b> aktivdir.<br>Çıxıldı: $${price}` : `Email <b>${fullEmail}</b> activated.<br>Charged: $${price}`);

    if (window.showToast) {
        window.showToast(toastTitle, toastDesc, "https://ui-avatars.com/api/?name=$&background=00a884&color=111b21", "");
    }

    if (window.mailArchiveDB) {
        let mailSubject = currentLang === 'ru' ? 'Чек: Корпоративная почта' : (currentLang === 'az' ? 'Qəbz: Korporativ e-poçt' : 'Receipt: Corporate Email');
        
        let mailBody = "";
        if (currentLang === 'ru') {
            mailBody = `Здравствуйте, ${window.myUsername || 'User'}.\n\nВаш новый корпоративный адрес активен: ${fullEmail}\n\nСумма: $0.01\nОплата: Внутренний кошелек\n\nДобро пожаловать в Hello Friends.`;
        } else if (currentLang === 'az') {
            mailBody = `Salam, ${window.myUsername || 'User'}.\n\nYeni korporativ ünvanınız aktivdir: ${fullEmail}\n\nMəbləğ: $0.01\nÖdəniş: Daxili pul kisəsi\n\nHello Friends-ə xoş gəlmisiniz.`;
        } else {
            mailBody = `Hello ${window.myUsername || 'User'},\n\nYour new corporate email address is now active: ${fullEmail}\n\nAmount charged: $0.01\nPayment method: Internal Wallet\n\nWelcome to Hello Friends.`;
        }

        let mailDate = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        window.mailArchiveDB.unshift({
            id: 'sys_' + Date.now(),
            unread: true,
            date: mailDate,
            from: 'billing@hellofriends.app',
            subject: mailSubject,
            text: mailBody
        });
        if (window.updateArchiveBadge) window.updateArchiveBadge();
    }

    window.closeEmailStore();
};

// Активация баннера для iOS
document.addEventListener('DOMContentLoaded', () => {
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isIos && !isStandalone) {
        setTimeout(() => {
            const banner = document.getElementById('ios-install-banner');
            if (banner) {
                banner.classList.remove('hidden');
                banner.style.display = 'flex';
            }
        }, 4000); 
    }
});

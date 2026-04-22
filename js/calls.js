// ==========================================
// MODULE: CALLS & VIDEO (WebRTC, Signals, Meet)
// ==========================================

window.openPhoneChoiceModal = function() { if(window.closeDropdown) window.closeDropdown(); document.getElementById('phone-choice-modal').classList.add('active'); };
window.closePhoneChoiceModal = function() { document.getElementById('phone-choice-modal').classList.remove('active'); };

window.startExternalCall = function() { 
    window.closePhoneChoiceModal(); 
    if (window.currentTargetUser && window.currentTargetUser.phone) { 
        window.location.href = `tel:${window.currentTargetUser.phone.replace(/\s+/g, '')}`; 
        return; 
    } 
    alert('Open a user profile or private chat to make a cellular call.'); 
};

window.startDirectAppCall = function(id) {
    if(window.closeContactsModal) window.closeContactsModal(); 
    let target = window.participants.find(p => p.id === id);
    if(target) { 
        window.currentTargetUser = target; 
        const photoEl = document.getElementById('voice-friend-photo');
        const flagEl = document.getElementById('voice-friend-flag');
        const nameEl = document.getElementById('voice-friend-name');
        if(photoEl) photoEl.src = target.photo; 
        if(flagEl) flagEl.innerText = target.flag; 
        if(nameEl) nameEl.innerText = (target.name||'User').split(' ')[0]; 
        window.voiceFriend = target; 
        if(window.switchChatRoom) window.switchChatRoom(target.id);
        if(window.switchTab) window.switchTab(1); 
        window.startInAppCall();
    }
};

window.startInAppCall = function() { 
    if (!window.currentTargetUser) { 
        alert("Please open a private chat with a contact first!"); 
        window.closePhoneChoiceModal(); 
        return; 
    } 
    const target = window.currentTargetUser; 
    window.closePhoneChoiceModal(); 
    
    // Дергаем Firebase для моментального звонка
    let callRef = db.ref('signals/' + target.id).push();
    callRef.set({ 
        type: 'call', 
        callerId: window.myProfileInfo.id, 
        callerName: window.myUsername, 
        callerPhoto: window.myProfileInfo.photo, 
        timestamp: firebase.database.ServerValue.TIMESTAMP 
    }); 
    
    if(window.sendPushToUser) window.sendPushToUser(target.id, "Incoming Call 📞", `${window.myUsername} is calling you on Hello Friends!`); 
    
    const photoEl = document.getElementById('voice-friend-photo'); const flagEl = document.getElementById('voice-friend-flag'); const nameEl = document.getElementById('voice-friend-name'); 
    let targetFirstName = target.name ? target.name.split(' ')[0] : 'User';
    if(photoEl) photoEl.src = target.photo; if(flagEl) flagEl.innerText = target.flag; if(nameEl) nameEl.innerText = targetFirstName; 
    
    window.voiceFriend = target; 
    if (window.currentIndex !== 1 && window.switchTab) window.switchTab(1); 
    if(window.showToast) window.showToast("Calling...", `Ringing ${targetFirstName}...`, target.photo, ""); 
    
    if (window.callTimeout) clearTimeout(window.callTimeout);
    window.callTimeout = setTimeout(() => {
        db.ref('signals/' + target.id).push({ type: 'missed', callerName: window.myUsername });
        callRef.remove(); 
        if(window.sendPushToUser) window.sendPushToUser(target.id, "Missed Call ❗️", `You missed a call from ${window.myUsername}`);
        if(window.showToast) window.showToast("No Answer", `${targetFirstName} is unavailable.`, "", "");
        window.callTimeout = null;
    }, 30000);
};

window.showIncomingCall = function(callerId, callerName, callerPhoto, signalKey) { 
    window.currentIncomingSignalKey = signalKey; 
    window.currentCallerId = callerId; 
    document.getElementById('incoming-call-name').innerText = callerName || 'User'; 
    document.getElementById('incoming-call-photo').src = callerPhoto || 'https://ui-avatars.com/api/?name=U&background=00a884&color=fff'; 
    document.getElementById('incoming-call-modal').classList.add('active'); 
    
    if(window.sndRing) {
        window.sndRing.currentTime = 0;
        window.sndRing.play().catch(e => console.log("Sound autoplay blocked by browser")); 
    }
    
    if(window.firePush) window.firePush("Incoming Call 📞", `${callerName || 'User'} is calling you on Hello Friends!`, callerPhoto);
    
    if (navigator.vibrate) {
        window.vibrateInterval = setInterval(() => { navigator.vibrate([500, 1000, 500]); }, 2000);
    }
};

window.acceptCall = function() { 
    if(window.sndRing) { window.sndRing.pause(); window.sndRing.currentTime = 0; }
    document.getElementById('incoming-call-modal').classList.remove('active'); 
    
    db.ref('signals/' + window.currentCallerId).push({ type: 'answered' });
    db.ref('signals/' + window.myProfileInfo.id + '/' + window.currentIncomingSignalKey).remove(); 
    
    if (window.vibrateInterval) { clearInterval(window.vibrateInterval); window.vibrateInterval = null; }
    if (navigator.vibrate) navigator.vibrate(0);

    let target = window.participants.find(p => p.id === window.currentCallerId); 
    if(target) { 
        window.currentTargetUser = target; 
        const photoEl = document.getElementById('voice-friend-photo'); const flagEl = document.getElementById('voice-friend-flag'); const nameEl = document.getElementById('voice-friend-name'); 
        let targetFirstName = target.name ? target.name.split(' ')[0] : 'User';
        if(photoEl) photoEl.src = target.photo; if(flagEl) flagEl.innerText = target.flag; if(nameEl) nameEl.innerText = targetFirstName; 
        
        window.voiceFriend = target; 
        if(window.switchChatRoom) window.switchChatRoom(target.id); 
        if (window.currentIndex !== 1 && window.switchTab) window.switchTab(1); 
    } 
};

window.declineCall = function() { 
    if(window.sndRing) { window.sndRing.pause(); window.sndRing.currentTime = 0; }
    document.getElementById('incoming-call-modal').classList.remove('active'); 
    
    db.ref('signals/' + window.currentCallerId).push({ type: 'reject', callerName: window.myUsername });
    db.ref('signals/' + window.myProfileInfo.id + '/' + window.currentIncomingSignalKey).remove(); 
    
    if (window.vibrateInterval) { clearInterval(window.vibrateInterval); window.vibrateInterval = null; }
    if (navigator.vibrate) navigator.vibrate(0);
};

window.initSignalListener = function() { 
    // Защитная проверка: если гость или нет ID - не слушаем
    if (!window.myProfileInfo || !window.myProfileInfo.id || window.isGuest) return; 
    
    db.ref('signals/' + window.myProfileInfo.id).on('child_added', (snap) => { 
        const sig = snap.val(); if (!sig) return; 
        
        if (sig.type === 'call') { 
            if (Date.now() - sig.timestamp < 30000) {
                window.showIncomingCall(sig.callerId, sig.callerName, sig.callerPhoto, snap.key); 
            } else {
                db.ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
            }
        } 
        else if (sig.type === 'reject') {
            if(window.showToast) window.showToast("Call Declined", `${sig.callerName} declined the call.`, "", "");
            if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
            db.ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
        }
        else if (sig.type === 'missed') {
            if(window.sndRing) { window.sndRing.pause(); window.sndRing.currentTime = 0; }
            document.getElementById('incoming-call-modal').classList.remove('active');
            if(window.showToast) window.showToast("Missed Call ❗️", `You missed a call from ${sig.callerName}.`, "", "");
            if (window.vibrateInterval) { clearInterval(window.vibrateInterval); window.vibrateInterval = null; }
            if (navigator.vibrate) navigator.vibrate(0);
            db.ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
        }
        else if (sig.type === 'answered') {
            if (window.callTimeout) { clearTimeout(window.callTimeout); window.callTimeout = null; }
            db.ref('signals/' + window.myProfileInfo.id + '/' + snap.key).remove();
        }
    }); 
};

window.initConference = function() {
    const confGrid = document.getElementById('conference-grid'); if(!confGrid) return;
    
    let myLang = typeof window.getCurrentRoomLang === 'function' ? window.getCurrentRoomLang() : (window.myProfileInfo.langCode || 'en');

    let confHtml = `
    <div class="video-frame main" id="my-video-container">
        <video id="my-live-video" class="mirror-video cursor-pointer hover:opacity-90 transition" onclick="if(window.openPersonalLangModal) window.openPersonalLangModal()" playsinline autoplay muted></video>
        <div class="video-overlay">${window.myUsername}</div>
        <div class="flag-overlay" style="top:10px; right:10px;"><img src="https://flagcdn.com/w40/${window.myProfileInfo.flagCode || 'un'}.png" class="w-6 h-4.5 rounded-[3px] border border-[#2a3942] shadow-sm"></div>
        <div class="translation-bar"><div class="conf-marquee-text conf-listener-marquee" id="speaker-marquee" data-lang="${myLang}" data-flag="${window.myProfileInfo.flag}">➔ [AUTO] Welcome!</div></div>
    </div>`;
    
    let realParticipants = window.participants.filter(p => p.id !== 'ai'); 
    let totalSlots = 12;
    let renderedCount = 1; 
    
    realParticipants.forEach(p => {
        if (renderedCount >= totalSlots) return; 
        confHtml += `
        <div class="video-frame">
            <div class="absolute inset-0 flex items-center justify-center bg-[#111b21]"><i class="fa-solid fa-user text-4xl text-[#2a3942]"></i></div>
            <div class="video-overlay">${(p.name||'User').split(' ')[0]}</div>
            <div class="flag-overlay" style="top:10px; right:10px;"><img src="https://flagcdn.com/w40/${p.flagCode || 'un'}.png" class="w-6 h-4.5 rounded-[3px] border border-[#2a3942] shadow-sm"></div>
            <div class="translation-bar"><div class="conf-marquee-text conf-listener-marquee" id="conf-marquee-${p.id}" data-lang="${p.langCode || 'en'}" data-flag="${p.flag || '🌐'}">${p.flag} Listening...</div></div>
        </div>`;
        renderedCount++;
    });

    const dummyData = [
        {code: 'us', lang: 'en', flag: '🇺🇸'}, {code: 'gb', lang: 'en', flag: '🇬🇧'}, 
        {code: 'fr', lang: 'fr', flag: '🇫🇷'}, {code: 'de', lang: 'de', flag: '🇩🇪'}, 
        {code: 'jp', lang: 'ja', flag: '🇯🇵'}, {code: 'it', lang: 'it', flag: '🇮🇹'}, 
        {code: 'es', lang: 'es', flag: '🇪🇸'}, {code: 'cn', lang: 'zh', flag: '🇨🇳'}, 
        {code: 'ae', lang: 'ar', flag: '🇦🇪'}, {code: 'pt', lang: 'pt', flag: '🇵🇹'}, 
        {code: 'tr', lang: 'tr', flag: '🇹🇷'}
    ];
    
    for (let i = renderedCount; i < totalSlots; i++) {
        let dummy = dummyData[i % dummyData.length];
        confHtml += `
        <div class="video-frame border-2 border-[#2a3942]">
            <img src="llgar.jpg" class="placeholder-bg opacity-50 object-cover" style="filter: blur(1px);">
            <div class="absolute inset-0 bg-black/40"></div>
            <div class="video-overlay" style="background: rgba(0,0,0,0.5);">Connecting...</div>
            <div class="flag-overlay" style="top:10px; right:10px;"><img src="https://flagcdn.com/w40/${dummy.code}.png" class="w-6 h-4.5 rounded-[3px] border border-[#2a3942] shadow-sm"></div>
            <div class="translation-bar"><div class="conf-marquee-text conf-listener-marquee" id="conf-marquee-dummy-${i}" data-lang="${dummy.lang}" data-flag="${dummy.flag}">${dummy.flag} Waiting...</div></div>
        </div>`;
    }

    confGrid.innerHTML = confHtml; 
    
    const videoEl = document.getElementById('my-live-video'); 
    if(videoEl) { 
        videoEl.src = window.myProfileInfo.video || 'https://assets.mixkit.co/videos/preview/mixkit-young-man-having-a-video-call-with-his-friends-41212-large.mp4'; 
        videoEl.loop = true; videoEl.muted = true; videoEl.autoplay = true; videoEl.classList.remove('mirror-video'); 
    }
};

window.toggleMyCamera = async function(btn) { 
    const videoEl = document.getElementById('my-live-video'); 
    if (window.myVideoStream) { 
        window.myVideoStream.getTracks().forEach(t => t.stop()); 
        window.myVideoStream = null; 
        if(videoEl) { 
            videoEl.srcObject = null; 
            videoEl.src = window.myProfileInfo.video || 'https://assets.mixkit.co/videos/preview/mixkit-young-man-having-a-video-call-with-his-friends-41212-large.mp4'; 
            videoEl.play(); 
            videoEl.classList.remove('mirror-video'); 
        } 
        btn.classList.remove('bg-red-500'); btn.classList.add('bg-[#202c33]'); btn.querySelector('i').className = 'fa-solid fa-video-slash text-[#8696a0]'; 
    } else { 
        try { 
            window.myVideoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false }); 
            if(videoEl) { 
                videoEl.srcObject = window.myVideoStream; 
                videoEl.muted = true; 
                videoEl.play(); 
                videoEl.classList.add('mirror-video'); 
            } 
            btn.classList.add('bg-red-500'); btn.classList.remove('bg-[#202c33]'); btn.querySelector('i').className = 'fa-solid fa-video text-white'; 
        } catch(e) { 
            alert("Camera access denied!"); 
        } 
    } 
};

window.isMeetMarqueeEnabled = true; 
window.toggleMeetMarquee = function() { 
    window.isMeetMarqueeEnabled = !window.isMeetMarqueeEnabled; 
    document.querySelectorAll('.translation-bar').forEach(b => { b.style.opacity = window.isMeetMarqueeEnabled ? "1" : "0"; }); 
};

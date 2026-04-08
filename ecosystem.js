// ==========================================
// MODULE: ECOSYSTEM (Search, Email, Location, Wallet)
// ==========================================

// --- ГЛОБАЛЬНЫЙ ПОИСК И НОВОСТИ ---
window.openNewsFast = function() { 
    if(window.closeDropdown) window.closeDropdown(); 
    document.getElementById('search-modal').classList.add('active'); 
    document.getElementById('search-suggestions').style.display = 'none'; 
    document.getElementById('news-categories').style.display = 'flex'; 
    setTimeout(() => { 
        const c = window.myProfileInfo.country; 
        let q = "World News"; 
        if (c && c !== 'Global') q = "Latest news " + c; 
        window.doNewsSearch(q); 
    }, 300); 
};

window.doNewsSearch = function(q) { 
    document.getElementById('global-search-input').value = q; 
    document.getElementById('search-results-area').innerHTML = ''; 
    const iframe = document.getElementById('search-result-frame'); 
    iframe.src = 'https://www.bing.com/search?q=' + encodeURIComponent(q); 
    iframe.classList.remove('hidden'); 
};

window.openSearchModal = function() {
    if(window.closeDropdown) window.closeDropdown();
    document.getElementById('search-modal').classList.add('active');
    document.getElementById('global-search-input').value = '';
    document.getElementById('search-results-area').innerHTML = '';
    document.getElementById('search-suggestions').style.display = 'block';
    if(document.getElementById('news-categories')) document.getElementById('news-categories').style.display = 'none';
    const iframe = document.getElementById('search-result-frame');
    iframe.src = 'about:blank'; iframe.classList.add('hidden');
    setTimeout(() => document.getElementById('global-search-input').focus(), 100);
};

window.closeSearchModal = function() {
    document.getElementById('search-modal').classList.remove('active');
    document.getElementById('global-search-input').value = ''; 
    document.getElementById('search-results-area').innerHTML = ''; 
    const iframe = document.getElementById('search-result-frame');
    if (iframe) { iframe.src = 'about:blank'; iframe.classList.add('hidden'); }
    document.getElementById('search-suggestions').style.display = 'block'; 
    if(document.getElementById('news-categories')) document.getElementById('news-categories').style.display = 'none'; 
};

window.performLiveSearch = function() { 
    const query = document.getElementById('global-search-input').value.toLowerCase().trim(); 
    const resultsArea = document.getElementById('search-results-area'); 
    const suggestions = document.getElementById('search-suggestions'); 
    const categories = document.getElementById('news-categories');
    document.getElementById('search-result-frame').classList.add('hidden'); 
    if (query.length === 0) { resultsArea.innerHTML = ''; suggestions.style.display = 'block'; if(categories) categories.style.display = 'none'; return; } 
    suggestions.style.display = 'none'; if(categories) categories.style.display = 'none'; 
    let html = ''; let found = false; 
    window.participants.forEach(p => { 
        if ((p.name||'').toLowerCase().includes(query) || (p.profession||'').toLowerCase().includes(query) || (p.country||'').toLowerCase().includes(query)) { 
            found = true; html += `<div class="bg-[#202c33] border border-[#2a3942] rounded-2xl p-3 flex items-center justify-between cursor-pointer mb-2 shadow-sm" onclick="window.closeSearchModal(); window.switchTab(0); window.switchChatRoom('${p.id}');"><div class="flex items-center gap-3"><img src="${p.photo}" class="w-12 h-12 rounded-full object-cover border border-[#00a884]"><div class="flex flex-col"><span class="text-white font-bold">${(p.name||'User').split(' ')[0]} ${p.flag}</span><span class="text-[#8696a0] text-xs">${p.profession || 'User'}</span></div></div><i class="fa-solid fa-message text-[#00a884]"></i></div>`; 
        } 
    }); 
    resultsArea.innerHTML = found ? html : `<p class="text-sm text-[#8696a0] text-center mt-4">No internal results. Click Search Web.</p>`; 
};

window.handleSmartSearch = function(text, type = 'text') { 
    const input = document.getElementById('global-search-input'); 
    if (type === 'text') { 
        input.value = text; window.performLiveSearch(); 
    } else if (type === 'web') { 
        input.value = text; document.getElementById('search-results-area').innerHTML = ''; window.doGoogleSearch(); 
    } 
};

window.doGoogleSearch = function() { 
    const q = document.getElementById('global-search-input').value; 
    if(q.trim() === '') return alert('Enter search query'); 
    document.getElementById('search-suggestions').style.display = 'none'; 
    document.getElementById('search-results-area').innerHTML = ''; 
    const iframe = document.getElementById('search-result-frame'); 
    iframe.src = 'https://www.bing.com/search?q=' + encodeURIComponent(q); 
    iframe.classList.remove('hidden'); 
};

// --- ГЕОЛОКАЦИЯ ---
window.openLocationModal = function() {
    if(window.closeDropdown) window.closeDropdown();
    document.getElementById('location-modal').classList.add('active');
    const mapContainer = document.getElementById('location-map');
    mapContainer.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-3xl text-[#00a884] mb-3"></i><span class="font-sans text-[#8696a0]">Detecting location...</span>';
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude; 
            const lon = pos.coords.longitude;
            mapContainer.innerHTML = `<iframe width="100%" height="100%" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="https://maps.google.com/maps?q=${lat},${lon}&z=14&output=embed" style="border-radius: 12px;"></iframe>`;
        }, (error) => {
            mapContainer.innerHTML = '<span class="text-red-500 font-sans">Failed to get location. Please allow GPS access.</span>';
        }, { timeout: 5000 });
    } else {
        mapContainer.innerHTML = '<span class="font-sans text-red-500">Geolocation is not supported by your browser.</span>';
    }
};

window.sendLocationToChat = function() {
    if(window.closeAttachModal) window.closeAttachModal();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude; 
            const lon = pos.coords.longitude;
            const embed = `https://maps.google.com/maps?q=${lat},${lon}&z=15&output=embed`;
            const mapLink = `https://www.google.com/maps?q=${lat},${lon}`;
            db.ref(window.currentRoomId).push({
                userId: window.myProfileInfo.id, name: window.myUsername, text: "📍 Shared Location",
                isLocation: true, lat: lat, lon: lon, embedLink: embed, mapLink: mapLink,
                sessionId: window.mySessionId, timestamp: firebase.database.ServerValue.TIMESTAMP,
                photo: window.myProfileInfo.photo, flag: window.myProfileInfo.flag, flagCode: window.myProfileInfo.flagCode, langCode: window.myProfileInfo.langCode
            });
        }, (error) => {
            alert("Failed to get location. Please allow GPS access.");
        }, { timeout: 5000 });
    } else {
        alert("Geolocation is not supported by your browser.");
    }
};

// --- EMAIL СИСТЕМА ---
window.openEmailModal = function() { 
    if(window.closeDropdown) window.closeDropdown(); 
    document.getElementById('email-modal').classList.add('active'); 
};

window.openDirectEmail = function(email) { 
    window.openEmailModal(); 
    if(email) document.getElementById('email-to').value = email; 
};

window.handleEmailAttachment = function(event) { 
    const file = event.target.files[0]; 
    if (!file) return; 
    const textEl = document.getElementById('email-text'); 
    textEl.value += `\n[Uploading ${file.name}...]`; 
    const reader = new FileReader(); 
    reader.onload = function(e) { 
        const base64Data = e.target.result; 
        const newRef = db.ref('email_attachments').push(); 
        newRef.set({ name: file.name, data: base64Data, timestamp: firebase.database.ServerValue.TIMESTAMP }).then(() => { 
            textEl.value = textEl.value.replace(`\n[Uploading ${file.name}...]`, `\n📎 Attachment Link: https://secure-cloud.hf/file/${newRef.key}`); 
            if(window.showToast) window.showToast("Attached!", "File securely uploaded to cloud.", "", ""); 
        }); 
    }; 
    reader.readAsDataURL(file); 
};

window.sendEmailForm = function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText; 
    btn.innerText = 'Sending...'; 
    btn.classList.add('animate-pulse');
    const to = document.getElementById('email-to').value; 
    const subj = document.getElementById('email-subject').value; 
    const text = document.getElementById('email-text').value; 
    const templateParams = {
        to_email: to,
        subject: subj,
        message: text,
        from_name: window.myUsername || "User"
    };
    emailjs.send("service_8d6b5v3", "template_0o6h5cm", templateParams).then(function() { 
        btn.classList.remove('animate-pulse'); 
        btn.innerText = 'Success! ✔️'; 
        btn.style.background = '#00a884'; 
        btn.style.color = '#111b21'; 
        setTimeout(() => { 
            document.getElementById('email-form-element').reset(); 
            btn.innerText = originalText; 
            btn.style.background = ''; 
            btn.style.color = ''; 
            document.getElementById('email-modal').classList.remove('active');
            if(window.showToast) window.showToast("Email Sent", "Securely delivered via EmailJS", "", ""); 
        }, 2000); 
    }, function(error) { 
        btn.classList.remove('animate-pulse'); 
        btn.innerText = 'Failed ❌'; 
        btn.style.background = '#ef4444'; 
        setTimeout(() => { btn.innerText = originalText; btn.style.background = ''; }, 3000); 
        alert("Ошибка: " + JSON.stringify(error)); 
    });
};

// --- ФИНАНСЫ И КОШЕЛЕК ---
window.switchWalletTab = function(tab) {
    const btnCard = document.getElementById('tab-btn-card'); 
    const btnIntl = document.getElementById('tab-btn-intl');
    const frameCard = document.getElementById('frame-card'); 
    const frameIntl = document.getElementById('frame-intl');
    if(tab === 'card') { 
        btnCard.className = "flex-1 py-2 rounded-lg bg-[#111b21] text-white text-xs font-bold shadow-sm transition"; 
        btnIntl.className = "flex-1 py-2 rounded-lg bg-transparent text-[#8696a0] text-xs font-bold hover:text-white transition"; 
        frameCard.style.display = 'flex'; frameIntl.style.display = 'none'; 
    } else { 
        btnIntl.className = "flex-1 py-2 rounded-lg bg-[#111b21] text-white text-xs font-bold shadow-sm transition"; 
        btnCard.className = "flex-1 py-2 rounded-lg bg-transparent text-[#8696a0] text-xs font-bold hover:text-white transition"; 
        frameIntl.style.display = 'flex'; frameCard.style.display = 'none'; 
    }
};

window.updateTransferFeeUI = function(type) {
    let inputId = type === 'card' ? 'transfer-amount-card' : 'transfer-amount-intl'; 
    let amtId = type === 'card' ? 'tf-amt-card' : 'tf-amt-intl';
    let totalId = type === 'card' ? 'tf-total-card' : 'tf-total-intl'; 
    let btnId = type === 'card' ? 'tf-submit-card' : 'tf-submit-intl';
    let defaultBtnText = type === 'card' ? 'Send Money' : 'Send International'; 
    let amt = parseFloat(document.getElementById(inputId).value) || 0; 
    let total = amt > 0 ? amt + 0.01 : 0;
    document.getElementById(amtId).innerText = '$' + amt.toFixed(2); 
    document.getElementById(totalId).innerText = '$' + total.toFixed(2); 
    document.getElementById(btnId).innerText = amt > 0 ? `Send $${total.toFixed(2)}` : defaultBtnText;
};

window.openBankTransferModal = function() { 
    if(window.closeDropdown) window.closeDropdown(); 
    const recCard = document.getElementById('transfer-recipient-card'); 
    const recIntl = document.getElementById('transfer-recipient-intl'); 
    let opts = '<option value="" disabled selected>Select Recipient</option>';
    window.participants.forEach(p => { 
        if(p.id !== 'ai' && p.id !== window.myProfileInfo.id) { 
            opts += `<option value="${p.id}">${(p.name||'User').split(' ')[0]} ${p.flag}</option>`; 
        } 
    }); 
    recCard.innerHTML = opts; recIntl.innerHTML = opts; 
    document.getElementById('transfer-amount-card').value = ''; 
    document.getElementById('transfer-amount-intl').value = ''; 
    window.updateTransferFeeUI('card'); window.updateTransferFeeUI('intl'); 
    document.getElementById('transfer-modal').classList.add('active'); 
};

window.processMoneyTransfer = function(e, type) {
    e.preventDefault(); 
    let amtInputId = type === 'card' ? 'transfer-amount-card' : 'transfer-amount-intl'; 
    let recInputId = type === 'card' ? 'transfer-recipient-card' : 'transfer-recipient-intl';
    let amt = parseFloat(document.getElementById(amtInputId).value); 
    let recId = document.getElementById(recInputId).value; 
    if(!amt || amt <= 0 || !recId) return;
    let typeLabel = 'Card-to-Card'; 
    if (type === 'intl') { typeLabel = document.getElementById('intl-provider').value; }
    let recUser = window.participants.find(p => p.id === recId); 
    let recName = recUser ? (recUser.name || 'User').split(' ')[0] : 'Unknown'; 
    let total = amt + 0.01;
    let id1 = String(window.myProfileInfo.id); let id2 = String(recId); 
    let chatRoomId = (id1 < id2) ? ("private_" + id1 + "_" + id2) : ("private_" + id2 + "_" + id1);
    
    db.ref(chatRoomId).push({ 
        userId: window.myProfileInfo.id, 
        name: window.myUsername, 
        isTransfer: true, 
        transferTypeLabel: typeLabel, 
        amount: amt.toFixed(2), 
        total: total.toFixed(2), 
        recName: recName, 
        text: `💸 ${typeLabel}`, 
        sessionId: window.mySessionId, 
        timestamp: firebase.database.ServerValue.TIMESTAMP, 
        photo: window.myProfileInfo.photo, 
        flag: window.myProfileInfo.flag, 
        flagCode: window.myProfileInfo.flagCode, 
        langCode: window.myProfileInfo.langCode 
    });
    
    document.getElementById('transfer-modal').classList.remove('active'); 
    if(window.showToast) window.showToast("Transfer Sent", `Sent $${amt.toFixed(2)} to ${recName}. Network fee: $0.01`, "", "");
    document.getElementById(amtInputId).value = ''; 
    window.updateTransferFeeUI(type); 
    if(window.switchTab) window.switchTab(0); 
    if(window.switchChatRoom) window.switchChatRoom(recId);
};

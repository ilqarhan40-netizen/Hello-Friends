// ==========================================
// MODULE: ECOSYSTEM (Search, Email, Location, Wallet)
// ==========================================

// --- ГЛОБАЛЬНЫЙ ПОИСК И НОВОСТИ ---
window.openSearchModal = function() {
    window.closeDropdown();
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
    const iframe = document.getElementById('search-result-frame');
    if (iframe) { iframe.src = 'about:blank'; iframe.classList.add('hidden'); }
};

window.performLiveSearch = function() { 
    const query = document.getElementById('global-search-input').value.toLowerCase().trim(); 
    const resultsArea = document.getElementById('search-results-area'); 
    const suggestions = document.getElementById('search-suggestions'); 
    document.getElementById('search-result-frame').classList.add('hidden'); 
    if (query.length === 0) { resultsArea.innerHTML = ''; suggestions.style.display = 'block'; return; } 
    suggestions.style.display = 'none';
    let html = ''; let found = false; 
    window.participants.forEach(p => { 
        if ((p.name||'').toLowerCase().includes(query) || (p.profession||'').toLowerCase().includes(query) || (p.country||'').toLowerCase().includes(query)) { 
            found = true; html += `<div class="bg-[#202c33] border border-[#2a3942] rounded-2xl p-3 flex items-center justify-between cursor-pointer mb-2 shadow-sm" onclick="window.closeSearchModal(); window.switchTab(0); window.switchChatRoom('${p.id}');"><div class="flex items-center gap-3"><img src="${p.photo}" class="w-12 h-12 rounded-full object-cover border border-[#00a884]"><div class="flex flex-col"><span class="text-white font-bold">${(p.name||'User').split(' ')[0]} ${p.flag}</span><span class="text-[#8696a0] text-xs">${p.profession || 'User'}</span></div></div><i class="fa-solid fa-message text-[#00a884]"></i></div>`; 
        } 
    }); 
    resultsArea.innerHTML = found ? html : `<p class="text-sm text-[#8696a0] text-center mt-4">No internal results. Click Search Web.</p>`; 
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
    window.closeDropdown();
    document.getElementById('location-modal').classList.add('active');
    const mapContainer = document.getElementById('location-map');
    mapContainer.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-3xl text-[#00a884] mb-3"></i>';
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude; const lon = pos.coords.longitude;
            mapContainer.innerHTML = `<iframe width="100%" height="100%" frameborder="0" src="https://maps.google.com/maps?q=${lat},${lon}&z=14&output=embed"></iframe>`;
        }, () => mapContainer.innerHTML = 'GPS Error');
    }
};

window.sendLocationToChat = function() {
    if(window.closeAttachModal) window.closeAttachModal();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude; const lon = pos.coords.longitude;
            const embed = `https://maps.google.com/maps?q=${lat},${lon}&z=15&output=embed`;
            db.ref(window.currentRoomId).push({
                userId: window.myProfileInfo.id, name: window.myUsername, text: "📍 Shared Location",
                isLocation: true, lat: lat, lon: lon, embedLink: embed, mapLink: `https://www.google.com/maps?q=${lat},${lon}`,
                sessionId: window.mySessionId, timestamp: firebase.database.ServerValue.TIMESTAMP,
                photo: window.myProfileInfo.photo, flag: window.myProfileInfo.flag, flagCode: window.myProfileInfo.flagCode, langCode: window.myProfileInfo.langCode
            });
        });
    }
};

// --- EMAIL СИСТЕМА ---
window.openEmailModal = function() { window.closeDropdown(); document.getElementById('email-modal').classList.add('active'); };

window.sendEmailForm = function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText; btn.innerText = 'Sending...';
    const templateParams = {
        to_email: document.getElementById('email-to').value,
        subject: document.getElementById('email-subject').value,
        message: document.getElementById('email-text').value,
        from_name: window.myUsername || "User"
    };
    emailjs.send("service_8d6b5v3", "template_0o6h5cm", templateParams).then(() => {
        btn.innerText = 'Success! ✔️';
        setTimeout(() => { 
            document.getElementById('email-form-element').reset(); 
            btn.innerText = originalText; window.closeEmailModal();
            if(window.showToast) window.showToast("Email Sent", "Securely delivered", "", "");
        }, 2000);
    });
};

// --- ФИНАНСЫ И КОШЕЛЕК ---
window.updateTransferFeeUI = function(type) {
    let inputId = type === 'card' ? 'transfer-amount-card' : 'transfer-amount-intl';
    let amt = parseFloat(document.getElementById(inputId).value) || 0;
    let total = amt > 0 ? amt + 0.01 : 0;
    document.getElementById(`tf-amt-${type}`).innerText = '$' + amt.toFixed(2);
    document.getElementById(`tf-total-${type}`).innerText = '$' + total.toFixed(2);
};

window.processMoneyTransfer = function(e, type) {
    e.preventDefault();
    let amt = document.getElementById(`transfer-amount-${type}`).value;
    let recId = document.getElementById(`transfer-recipient-${type}`).value;
    if(!amt || !recId) return;
    let recUser = window.participants.find(p => p.id === recId);
    db.ref(window.currentRoomId).push({
        userId: window.myProfileInfo.id, name: window.myUsername, isTransfer: true,
        amount: amt, recName: recUser ? recUser.name : 'User', text: "💸 Transfer",
        timestamp: firebase.database.ServerValue.TIMESTAMP, photo: window.myProfileInfo.photo,
        flag: window.myProfileInfo.flag, flagCode: window.myProfileInfo.flagCode, langCode: window.myProfileInfo.langCode
    });
    document.getElementById('transfer-modal').classList.remove('active');
    if(window.showToast) window.showToast("Transfer Sent", "Success", "", "");
};

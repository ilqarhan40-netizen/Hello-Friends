// ==========================================
// MODULE: PROFILES & CV (User Data, Avatars, Talents)
// ==========================================

// --- МОЙ ПРОФИЛЬ (Редактирование) ---
window.openMyProfile = function() { 
    if(window.closeDropdown) window.closeDropdown(); 
    const p = window.myProfileInfo;

    if (window.isGuest) { 
        document.getElementById('profile-modal-title').setAttribute('data-i18n', 'reg_title'); 
        document.getElementById('edit-preview-photo').src = p?.photo || 'https://ui-avatars.com/api/?name=New'; 
    } else { 
        document.getElementById('profile-modal-title').setAttribute('data-i18n', 'edit_title'); 
        document.getElementById('edit-name').value = window.myUsername; 
        document.getElementById('edit-preview-photo').src = p.photo; 
        document.getElementById('edit-country-select').value = p.flagCode || 'un'; 
        document.getElementById('edit-flag-icon').src = `https://flagcdn.com/w40/${document.getElementById('edit-country-select').value}.png`; 
        document.getElementById('edit-phone').value = p.phone || ''; 
        document.getElementById('edit-email').value = p.email || ''; 
        
        const langsInput = document.getElementById('edit-profile-langs');
        if (langsInput) langsInput.value = p.profileLangs || ''; 
        
        const bioInput = document.getElementById('edit-profile-bio');
        if (bioInput) bioInput.value = p.profileBio || ''; 
    } 
    
    if (window.applyTranslations) window.applyTranslations();
    document.getElementById('edit-profile-modal').classList.add('active'); 
};

window.closeProfileModal = function() { 
    if (!window.myProfileInfo.name || window.myProfileInfo.name === 'User' || window.myProfileInfo.name.trim() === '') {
        alert("Please enter your Full Name to complete registration!");
        document.getElementById('edit-name').focus();
        return; 
    }
    document.getElementById('edit-profile-modal').classList.remove('active'); 
};

window.handleFileUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('edit-preview-photo').src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.handleCountryChange = function(sel) {
    const flagCode = sel.value;
    const flagImg = document.getElementById('edit-flag-icon');
    if(flagImg) flagImg.src = `https://flagcdn.com/w40/${flagCode}.png`;
    
    if (window.countryData && window.countryData[flagCode]) {
        const phoneInput = document.getElementById('edit-phone');
        if (phoneInput) {
            phoneInput.value = window.countryData[flagCode].phone + " ";
            phoneInput.focus(); 
        }
    }
};

window.saveProfileData = function() {
    let nameVal = document.getElementById('edit-name').value.trim(); 
    let phoneVal = document.getElementById('edit-phone').value.trim();
    
    if (!nameVal || nameVal === 'User') { alert("Please enter your Real Name!"); return; }
    if (!phoneVal || phoneVal.length < 5) { alert("Please enter your Phone Number!"); return; }
    
    const countrySel = document.getElementById('edit-country-select');
    const selectedOption = countrySel.options[countrySel.selectedIndex];

    let smartLangCode = selectedOption ? selectedOption.getAttribute('data-lang') : 'en';

    let updatedP = { id: window.myProfileInfo.id,
        name: nameVal, 
        photo: document.getElementById('edit-preview-photo').src, 
        flagCode: countrySel.value, 
        phone: phoneVal, 
        email: document.getElementById('edit-email').value.trim(),
        profileLangs: document.getElementById('edit-profile-langs').value.trim(),
        profileBio: document.getElementById('edit-profile-bio').value.trim(),
        country: selectedOption ? selectedOption.getAttribute('data-name') : 'Global',
        flag: selectedOption ? selectedOption.getAttribute('data-emoji') : '🌐',
        langCode: smartLangCode 
    };
    
    window.myProfileInfo = { ...window.myProfileInfo, ...updatedP }; 
    window.myUsername = nameVal.split(' ')[0];
    
    localStorage.setItem('hf_personal_lang', 'auto');
    if (window.autoSetMicLang) window.autoSetMicLang();
    
    try { localStorage.setItem('hf_custom_' + window.myProfileInfo.id, JSON.stringify(window.myProfileInfo)); } catch(e){}

    const btn = document.querySelector('#edit-profile-modal .btn-primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    db.ref('users/' + window.myProfileInfo.id).update(updatedP).then(() => {
        btn.innerHTML = '<span data-i18n="reg_save">Save Profile</span>';
        if(window.applyTranslations) window.applyTranslations();
        document.getElementById('edit-profile-modal').classList.remove('active'); 
        if(window.showToast) window.showToast("Success", "Profile updated and synced!", updatedP.photo, "");

        const myVoicePhoto = document.getElementById('voice-me-photo'); 
        const myVoiceFlag = document.getElementById('voice-me-flag'); 
        const myVoiceName = document.getElementById('voice-me-name'); 
        if(myVoicePhoto) myVoicePhoto.src = updatedP.photo; 
        if(myVoiceFlag) myVoiceFlag.innerText = updatedP.flag; 
        if(myVoiceName) myVoiceName.innerText = window.myUsername;
        
    }).catch(err => {
        btn.innerHTML = '<span data-i18n="reg_save">Save Profile</span>'; 
        if(window.applyTranslations) window.applyTranslations();
        alert("Sync Error: " + err.message);
    });
};

// --- МОЕ CV (Резюме - Строгая Изоляция) ---
window.handleCVCountryChange = function(sel, isAutoLoad = false) {
    const flagCode = sel.value;
    const flagImg = document.getElementById('cv-edit-flag-icon');
    if(flagImg) flagImg.src = `https://flagcdn.com/w40/${flagCode}.png`;
    if (typeof window.countryData !== 'undefined') {
        const cData = window.countryData[flagCode] || window.countryData['un'];
        const phoneInput = document.getElementById('cv-edit-phone');
        if (phoneInput && cData && cData.phone) {
            if (!isAutoLoad || phoneInput.value.trim() === '') {
                phoneInput.value = cData.phone + " ";
                if (!isAutoLoad) phoneInput.focus();
            }
        }
    }
};

window.openEditCV = function() {
    if (window.closeDropdown) window.closeDropdown();
    const cvSelect = document.getElementById('cv-edit-country-select');
    const mainSelect = document.getElementById('edit-country-select');

    if (cvSelect && mainSelect && cvSelect.options.length <= 1) {
        cvSelect.innerHTML = mainSelect.innerHTML;
    }

    const p = window.myProfileInfo;
    
    // СТРОГАЯ ИЗОЛЯЦИЯ: Только ключи cv...
    document.getElementById('cv-edit-prof').value = p.cvProfession || '';
    document.getElementById('cv-edit-langs').value = p.cvLanguages || '';
    document.getElementById('cv-edit-skills').value = p.cvSkills || '';
    document.getElementById('cv-edit-exp').value = p.cvExperience || '';
    document.getElementById('cv-edit-edu').value = p.cvEducation || '';
    document.getElementById('cv-edit-bio').value = p.cvDesc || '';
    document.getElementById('cv-edit-phone').value = p.cvPhone || '';
    document.getElementById('cv-edit-email').value = p.cvEmail || '';

    if(cvSelect) {
        cvSelect.value = p.cvCountryCode || 'un';
        window.handleCVCountryChange(cvSelect, true);
    }
    
    if (window.applyTranslations) window.applyTranslations();
    document.getElementById('edit-cv-modal').classList.add('active');
};

window.closeEditCV = function() { document.getElementById('edit-cv-modal').classList.remove('active'); };

window.saveCVData = function() {
    const sel = document.getElementById('cv-edit-country-select');
    const selectedOpt = sel ? sel.options[sel.selectedIndex] : null;
    
    const cvData = {
        cvProfession: document.getElementById('cv-edit-prof').value.trim(),
        cvLanguages: document.getElementById('cv-edit-langs').value.trim(),
        cvSkills: document.getElementById('cv-edit-skills').value.trim(),
        cvExperience: document.getElementById('cv-edit-exp').value.trim(),
        cvEducation: document.getElementById('cv-edit-edu').value.trim(),
        cvDesc: document.getElementById('cv-edit-bio').value.trim(),
        cvPhone: document.getElementById('cv-edit-phone').value.trim(),
        cvEmail: document.getElementById('cv-edit-email').value.trim(),
        cvCountryCode: sel ? sel.value : 'un',
        cvCountryName: selectedOpt ? (selectedOpt.getAttribute('data-name') || 'Global') : 'Global'
    };
    
    const btn = document.querySelector('#edit-cv-modal .btn-primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    
    window.myProfileInfo = { ...window.myProfileInfo, ...cvData };
    try { localStorage.setItem('hf_custom_' + window.myProfileInfo.id, JSON.stringify(window.myProfileInfo)); } catch(e){}
    
    db.ref('users/' + window.myProfileInfo.id).update(cvData).then(() => {
        btn.innerHTML = '<span data-i18n="save_cv">Save CV</span>';
        window.closeEditCV();
        if(window.renderProfessionList) window.renderProfessionList();
        if(window.showToast) window.showToast("CV Updated", "Your business profile is synced.", "", "");
    }).catch(err => {
        btn.innerHTML = '<span data-i18n="save_cv">Save CV</span>';
        alert("Error: " + err.message);
    });
};

// --- ПРОСМОТР ЧУЖИХ КАРТОЧЕК И CV ---
window.closeAvatarModal = function() { document.getElementById('avatar-modal').classList.remove('active'); };

window.openAvatarModal = function(id, fromSidebar = false) {
    if(window.closeDropdown) window.closeDropdown(); 

    if (id === 'me' || (window.myProfileInfo && id === window.myProfileInfo.id)) {
        if (window.openPersonalLangModal) window.openPersonalLangModal();
        return;
    }

    if (!fromSidebar && window.currentRoomId !== 'global') {
        return; 
    }

    let p = window.participants.find(part => part.id === id); 
    if (!p) p = { id: id, name: 'User', photo: 'https://ui-avatars.com/api/?name=U&background=202c33&color=fff', flag: '🌐', flagCode: 'un', profession: 'Guest' };
    
    if (id !== 'ai') {
        let targetLangs = p.profileLangs || p.langCode || "Auto";
        let targetEmail = p.email ? `✉️ ${p.email}<br>` : "";
        let targetPhone = p.phone || ""; 
        let infoHtml = `<b class="text-[#00a884] uppercase tracking-wider">${p.flag} ${p.country || 'Global'}</b><br><span class="text-[#e9edef] text-[0.7rem] block mt-1 leading-relaxed">${targetEmail}🗣️ ${targetLangs}</span>`; 
        if(window.showToast) window.showToast((p.name || 'User').split(' ')[0], infoHtml, p.photo, targetPhone);
    }

    const modalImg = document.getElementById('modal-img'); if(modalImg) modalImg.src = p.flag === '🤖' ? 'https://ui-avatars.com/api/?name=AI&background=6b21a8&color=fff' : p.photo; 
    const modalName = document.getElementById('modal-name'); if(modalName) modalName.innerText = (p.name||'User').split(' ')[0]; 
    let idSpan = document.getElementById('modal-id'); if(!idSpan) { idSpan = document.createElement('span'); idSpan.id = 'modal-id'; idSpan.className = 'text-xs text-[#8696a0] font-mono mb-1 mt-1 block'; if(modalName) modalName.parentNode.insertBefore(idSpan, modalName.nextSibling); }
    if(idSpan) idSpan.innerText = "ID: " + p.id;
    const modalProf = document.getElementById('modal-prof'); if(modalProf) modalProf.innerText = p.profession || 'User';

    const modalDesc = document.getElementById('modal-desc');
    if(modalDesc) modalDesc.innerHTML = ''; 
    
    const actionButtons = document.getElementById('modal-action-buttons');
    if(actionButtons) {
        if (id === 'ai') { 
            actionButtons.style.display = 'none'; 
        } else {
            actionButtons.innerHTML = `
            <div class="grid grid-cols-2 gap-2 w-full mt-1">
                <button onclick="window.closeAvatarModal(); window.currentIndex = null; window.switchTab(0); window.switchChatRoom('${p.id}');" class="py-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-white font-bold hover:border-[#00a884] text-[0.7rem] transition flex flex-col items-center justify-center gap-1.5 active:scale-95 shadow-sm">
                    <i class="fa-solid fa-lock text-[#00a884] text-lg"></i> <span data-i18n="private_chat">Private Chat</span>
                </button>
                
                <button onclick="window.closeAvatarModal(); window.currentTargetUser = window.participants.find(x=>x.id==='${p.id}'); window.currentIndex = null; window.switchTab(1); window.switchChatRoom('${p.id}');" class="py-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-white font-bold hover:border-blue-400 text-[0.7rem] transition flex flex-col items-center justify-center gap-1.5 active:scale-95 shadow-sm">
                    <i class="fa-solid fa-microphone-lines text-blue-400 text-lg"></i> <span data-i18n="voice_msg">Voice Msg</span>
                </button>
                
                <button onclick="window.closeAvatarModal(); window.currentTargetUser = window.participants.find(x=>x.id==='${p.id}'); window.currentIndex = null; window.switchChatRoom('${p.id}'); if(window.startInAppCall) window.startInAppCall();" class="py-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-white font-bold hover:border-[#a29bfe] text-[0.7rem] transition flex flex-col items-center justify-center gap-1.5 active:scale-95 shadow-sm">
                    <i class="fa-solid fa-headset text-[#a29bfe] text-lg"></i> <span data-i18n="app_audio">App Audio</span>
                </button>
                
                <button onclick="window.closeAvatarModal(); window.currentTargetUser = window.participants.find(x=>x.id==='${p.id}'); window.currentIndex = null; window.switchTab(2);" class="py-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-white font-bold hover:border-pink-400 text-[0.7rem] transition flex flex-col items-center justify-center gap-1.5 active:scale-95 shadow-sm">
                    <i class="fa-solid fa-video text-pink-400 text-lg"></i> <span data-i18n="app_video">App Video</span>
                </button>
                
                <button onclick="window.closeAvatarModal(); window.location.href='tel:${(p.phone || '').replace(/\\s+/g, '')}';" class="col-span-2 py-2.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-white font-bold hover:border-green-400 text-[0.7rem] transition flex flex-col items-center justify-center gap-1.5 active:scale-95 shadow-sm">
                    <i class="fa-solid fa-mobile-screen text-green-400 text-lg"></i> <span data-i18n="phone_call">Phone Call</span>
                </button>
            </div>`;
            actionButtons.style.display = 'block'; 
        }
    }
    if (window.applyTranslations) window.applyTranslations();
    document.getElementById('avatar-modal').classList.add('active');
};

window.closeViewCVModal = function() { document.getElementById('view-cv-modal').classList.remove('active'); };

window.openViewCVModal = function(id) {
    if(window.closeDropdown) window.closeDropdown(); 
    let p = id === 'me' ? window.myProfileInfo : window.participants.find(part => part.id === id); 
    if (!p) return;

    // 1. ФОТО (AI или Обычное)
    let defaultPhoto = p.flag === '🤖' ? 'https://ui-avatars.com/api/?name=AI&background=6b21a8&color=fff' : 'https://ui-avatars.com/api/?name=U&background=202c33&color=fff';
    let photoEl = document.getElementById('cv-view-img');
    if (photoEl) photoEl.src = p.photo ? p.photo : defaultPhoto;

    // 2. ИМЯ И ПРОФЕССИЯ В ОДНУ СТРОКУ (С ЗАЩИТОЙ ОТ НАЕЗДА)
    let nameEl = document.getElementById('cv-view-name');
    let profEl = document.getElementById('cv-view-prof');

    if (nameEl && profEl) {
        let parent = nameEl.parentNode;
        let wrapper = document.getElementById('cv-header-main-box');
        
        if(!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'cv-header-main-box';
            wrapper.className = 'flex flex-col gap-1.5 w-full overflow-hidden'; 
            parent.insertBefore(wrapper, nameEl);
            
            // Строка 1: Имя и Профессия рядом
            let row1 = document.createElement('div');
            // gap-3 создает четкое расстояние, flex-nowrap запрещает наезд
            row1.className = 'flex items-center gap-3 flex-nowrap w-full';
            row1.appendChild(nameEl);
            row1.appendChild(profEl);
            wrapper.appendChild(row1);
        }
        
        // Стили текста, чтобы не ломались
        nameEl.innerText = (p.name||'User').split(' ')[0];
        nameEl.className = 'text-white font-bold text-lg whitespace-nowrap shrink-0'; 
        
        profEl.innerText = p.cvProfession || p.profession || '—';
        // truncate защищает от длинных слов
        profEl.className = 'text-[#8696a0] text-xs font-medium truncate italic opacity-90';
    }

    let displayPhone = p.cvPhone || p.phone || '—';
    let displayEmail = p.cvEmail || p.email || '—';
    let displayLoc = p.cvCountryName || p.country || 'Global';
    let displayFlag = p.cvCountryCode || p.flagCode || 'un';

    // 3. ЛОКАЦИЯ — СТРОГО ПОД НИМИ (ВТОРАЯ СТРОКА)
    let oldLoc = document.getElementById('cv-dynamic-loc');
    if(oldLoc) oldLoc.remove();
    
    let mainWrapper = document.getElementById('cv-header-main-box');
    if (mainWrapper) {
        let locHtml = document.createElement('div');
        locHtml.id = 'cv-dynamic-loc';
        locHtml.className = 'flex items-center gap-1.5 bg-[#202c33] border border-[#2a3942] rounded-full px-2.5 py-0.5 w-max shadow-sm mt-0.5';
        locHtml.innerHTML = `<i class="fa-solid fa-location-dot text-red-400 text-[0.6rem]"></i><img src="https://flagcdn.com/w20/${displayFlag}.png" class="w-3.5 rounded-sm object-cover"><span class="text-[#e9edef] text-[0.65rem] font-bold">${displayLoc}</span>`;
        mainWrapper.appendChild(locHtml);
    }

    // 4. КОНТАКТЫ (ДВА БЛОКА) И ЯЗЫКИ
    let phoneAction = (id !== 'me' && displayPhone !== '—') 
        ? `<span class="text-[#00a884] text-[0.75rem] font-mono font-bold truncate cursor-pointer hover:underline" onclick="window.closeViewCVModal(); window.currentTargetUser = window.participants.find(x=>x.id==='${p.id}'); if(document.getElementById('phone-choice-modal')) document.getElementById('phone-choice-modal').classList.add('active');"><i class="fa-solid fa-phone-volume mr-1"></i>${displayPhone}</span>`
        : `<span class="text-white text-[0.75rem] font-mono truncate">${displayPhone}</span>`;

    let cvContent = `
    <div class="grid grid-cols-2 gap-3 mb-3 mt-2">
        <div class="bg-[#202c33] p-3 rounded-2xl border border-[#2a3942] flex flex-col overflow-hidden shadow-sm">
            <div class="flex items-center gap-2 mb-1.5">
                <div class="w-6 h-6 rounded-full bg-[#111b21] flex items-center justify-center shrink-0 border border-[#2a3942]"><i class="fa-solid fa-phone text-[#00a884] text-[0.6rem]"></i></div>
                <span class="text-[0.6rem] text-[#8696a0] uppercase font-bold truncate" data-i18n="business_phone">Business Phone</span>
            </div>
            ${phoneAction}
        </div>
        <div class="bg-[#202c33] p-3 rounded-2xl border border-[#2a3942] flex flex-col overflow-hidden shadow-sm">
            <div class="flex items-center gap-2 mb-1.5">
                <div class="w-6 h-6 rounded-full bg-[#111b21] flex items-center justify-center shrink-0 border border-[#2a3942]"><i class="fa-solid fa-envelope text-blue-400 text-[0.6rem]"></i></div>
                <span class="text-[0.6rem] text-[#8696a0] uppercase font-bold truncate" data-i18n="business_email">Business Email</span>
            </div>
            <span class="text-white text-[0.7rem] truncate">${displayEmail}</span>
        </div>
    </div>
    <div class="bg-[#202c33] p-3 rounded-2xl border border-[#2a3942] mb-3 overflow-hidden">
        <span class="text-[0.65rem] text-[#8696a0] uppercase font-bold mb-1 block" data-i18n="languages_spoken">Languages</span>
        <span class="text-white text-sm font-bold whitespace-nowrap block truncate">${p.cvLanguages || p.profileLangs || '—'}</span>
    </div>`;

    if(p.cvSkills) cvContent += `<div class="bg-[#202c33] p-3 rounded-2xl border border-[#2a3942] mb-3 overflow-hidden"><span class="text-[0.65rem] text-[#8696a0] uppercase font-bold mb-1 block" data-i18n="core_skills">Core Skills</span><span class="text-white text-sm font-bold truncate">${p.cvSkills}</span></div>`;
    
    if(p.cvExperience) cvContent += `<div class="bg-[#202c33] p-4 rounded-2xl border border-[#2a3942] mb-3"><span class="text-[#00a884] text-[0.7rem] font-bold uppercase block mb-1" data-i18n="work_exp">Work Experience</span><p class="text-[0.8rem] text-[#e9edef] whitespace-pre-wrap">${p.cvExperience}</p></div>`;
    
    if(p.cvEducation) cvContent += `<div class="bg-[#202c33] p-4 rounded-2xl border border-[#2a3942] mb-3"><span class="text-[#00a884] text-[0.7rem] font-bold uppercase block mb-2" data-i18n="education">Education</span><p class="leading-relaxed text-[0.85rem] text-[#e9edef] whitespace-pre-wrap">${p.cvEducation}</p></div>`;
    
    if(p.cvDesc) cvContent += `<div class="bg-[#202c33] p-4 rounded-2xl border border-[#2a3942] mb-3"><span class="text-[#a29bfe] text-[0.7rem] font-bold uppercase block mb-2" data-i18n="about_cv">About Me (CV)</span><p class="leading-relaxed text-[0.85rem] text-[#e9edef] whitespace-pre-wrap">${p.cvDesc}</p></div>`;
    
    if(!p.cvLanguages && !p.cvSkills && !p.cvExperience && !p.cvEducation && !p.cvDesc && !p.cvPhone && !p.cvEmail) {
        cvContent = `<p class="text-center text-[#8696a0] mt-4 text-sm" data-i18n="cv_empty">This user hasn't filled out their CV yet.</p>`;
    }
    
    document.getElementById('cv-view-content').innerHTML = cvContent;

    // 5. КНОПКИ ДЕЙСТВИЙ (CHAT, SMS, EMAIL)
    const actionButtons = document.getElementById('cv-action-buttons');
    if (actionButtons) {
        if (id === 'me') {
            actionButtons.innerHTML = `
            <button onclick="window.closeViewCVModal(); window.openEditCV();" 
                    class="w-full py-3.5 rounded-2xl bg-[#a29bfe] text-[#111b21] font-bold text-[0.85rem] flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition mt-2">
                <i class="fa-solid fa-file-signature text-lg"></i> <span data-i18n="edit_my_cv">Edit My CV</span>
            </button>`;
        } else {
            let smsAction = displayPhone !== '—' ? `window.location.href='sms:${displayPhone.replace(/\\s+/g, '')}'` : "if(window.showToast) window.showToast('Error', 'User has no business phone', '', '');";
            let mailAction = displayEmail !== '—' ? `if(window.openDirectEmail) window.openDirectEmail('${displayEmail}'); else window.location.href='mailto:${displayEmail}';` : "if(window.showToast) window.showToast('Error', 'User has no business email', '', '');";

            actionButtons.innerHTML = `
            <div class="flex w-full gap-3 mt-4">
                <button onclick="window.closeViewCVModal(); window.switchTab(0); window.switchChatRoom('${p.id}');" 
                        class="flex-1 py-3.5 rounded-2xl bg-[#00a884] text-[#111b21] font-bold text-[0.7rem] flex flex-col items-center justify-center gap-1.5 shadow-md active:scale-95 transition">
                    <i class="fa-solid fa-comment text-xl"></i> <span data-i18n="chat">CHAT</span>
                </button>
                <button onclick="window.closeViewCVModal(); ${smsAction}" 
                        class="flex-1 py-3.5 rounded-2xl bg-[#202c33] border border-[#2a3942] text-white font-bold text-[0.7rem] flex flex-col items-center justify-center gap-1.5 shadow-md active:scale-95 transition">
                    <i class="fa-solid fa-comment-sms text-[#34b7f1] text-xl"></i> <span data-i18n="sms">SMS</span>
                </button>
                <button onclick="window.closeViewCVModal(); ${mailAction}" 
                        class="flex-1 py-3.5 rounded-2xl bg-[#202c33] border border-[#2a3942] text-white font-bold text-[0.7rem] flex flex-col items-center justify-center gap-1.5 shadow-md active:scale-95 transition">
                    <i class="fa-solid fa-envelope text-[#ea4335] text-xl"></i> <span data-i18n="email">EMAIL</span>
                </button>
            </div>`;
        }
    }

    if(window.applyTranslations) window.applyTranslations();
    document.getElementById('view-cv-modal').classList.add('active');
};

// --- ОТРИСОВКА ВКЛАДКИ "GLOBAL TALENTS" ---
window.renderProfessionList = function() { 
    const profContainer = document.getElementById('profession-list'); if (!profContainer) return; 
    const allUsers = [window.myProfileInfo, ...window.participants.filter(p => p.id !== 'ai')]; 
    const validUsers = allUsers.filter(p => p.id === window.myProfileInfo.id || !p.id.startsWith('guest')); 
    let cardsHTML = `<div class="grid grid-cols-2 gap-3">`; 
    
    let dict = (typeof i18n !== 'undefined' && window.appLang) ? (i18n[window.appLang] || i18n['en']) : {};

    validUsers.forEach((p) => { 
        let isMe = p.id === window.myProfileInfo.id; 
        let avatarClick = isMe ? `window.openAvatarModal('me')` : `window.openAvatarModal('${p.id}')`; 
        let cvClick = isMe ? `window.openViewCVModal('me')` : `window.openViewCVModal('${p.id}')`; 
        
        let btnText = isMe ? (dict['edit_my_cv'] || 'Edit My CV') : (dict['view_cv'] || 'View CV'); 
        
        let nameTxt = (p.name||'User').split(' ')[0]; 
        let borderColor = isMe ? 'border-[#00a884] shadow-[0_0_10px_rgba(0,168,132,0.2)]' : 'border-[#2a3942]'; 
        cardsHTML += `<div class="bg-[#111b21] p-4 rounded-3xl border ${borderColor} flex flex-col items-center shadow-md relative overflow-hidden"><div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00a884] to-[#005c4b]"></div><img src="${p.photo}" class="w-16 h-16 rounded-full border-2 border-[#00a884] mb-2 object-cover mt-2" onclick="${avatarClick}" style="cursor:pointer;"><h3 class="text-white font-bold text-sm text-center mb-0.5">${nameTxt}</h3><p class="text-[#8696a0] text-xs text-center mb-3"><span>${p.flag}</span> ${p.cvProfession || p.profession || 'User'}</p><button onclick="${cvClick}" class="w-full mt-auto bg-[#202c33] text-[#00a884] py-2 rounded-xl text-xs font-bold border border-[#2a3942] hover:bg-[#00a884] hover:text-[#111b21] transition shadow-sm">${btnText}</button></div>`; 
    }); 
    profContainer.innerHTML = cardsHTML + `</div>`; 
    
    if(window.applyTranslations) window.applyTranslations();
};

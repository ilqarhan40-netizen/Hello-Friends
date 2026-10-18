// ==========================================
// МОДУЛЬ ВИДЕОКОНФЕРЕНЦИЙ (group-conf)
// ==========================================

// 1. Авто-добавление кнопки и модалки при загрузке (чтобы не трогать HTML)
setTimeout(() => {
    // Вставляем модальное окно в конец body
    if (!document.getElementById('group-conf-modal')) {
        const modalHtml = `
        <div id="group-conf-modal" class="hidden fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center backdrop-blur-sm transition-opacity" onclick="window.closeGroupConfModal()">
            <div class="bg-[#111b21] border border-[#2a3942] w-[90%] max-w-md rounded-3xl shadow-2xl flex flex-col overflow-hidden transform transition-transform scale-95" id="group-conf-content" onclick="event.stopPropagation()">
                <div class="bg-[#202c33] p-4 flex justify-between items-center border-b border-[#2a3942]">
                    <h3 class="text-white font-bold text-lg flex items-center gap-2">
                        <i class="fa-solid fa-users text-[#00a884]"></i> <span>Invite to Call</span>
                    </h3>
                    <button onclick="window.closeGroupConfModal()" class="w-8 h-8 rounded-full bg-[#111b21] text-[#8696a0] hover:text-white flex items-center justify-center transition">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="p-2 max-h-[50vh] overflow-y-auto" id="group-conf-user-list"></div>
                <div class="p-4 bg-[#202c33] border-t border-[#2a3942] flex justify-end">
                    <button onclick="window.startGroupConf()" class="w-full py-3 rounded-xl bg-[#00a884] text-[#111b21] hover:bg-[#009273] active:scale-95 transition font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,168,132,0.3)]">
                        <i class="fa-solid fa-paper-plane"></i> <span>Send Invites</span>
                    </button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // Находим шапку конференции и вставляем кнопку Invite
    const confHeader = document.querySelector('#conference .flex.items-center.gap-4');
    if (confHeader && !document.getElementById('inject-invite-btn')) {
        const inviteBtnHtml = `
        <button id="inject-invite-btn" onclick="window.openGroupConfModal()" class="mr-3 bg-[#202c33] text-[#00a884] hover:bg-[#00a884] hover:text-[#111b21] border border-[#00a884] px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-md">
            <i class="fa-solid fa-user-plus"></i> <span>Invite</span>
        </button>`;
        confHeader.insertAdjacentHTML('afterbegin', inviteBtnHtml);
    }
}, 2000);

// 2. Логика открытия окна
window.openGroupConfModal = function() {
    const modal = document.getElementById('group-conf-modal');
    const content = document.getElementById('group-conf-content');
    const list = document.getElementById('group-conf-user-list');
    if (!modal || !list) return;

    const availableUsers = window.participants.filter(p => p.id !== 'ai' && p.id !== window.myProfileInfo.id);
    let html = '';

    if (availableUsers.length === 0) {
        html = `<p class="text-center text-[#8696a0] text-sm mt-4 p-4">No contacts available.</p>`;
    } else {
        availableUsers.forEach(u => {
            html += `
                <label class="flex items-center justify-between p-3 rounded-2xl bg-[#111b21] hover:bg-[#202c33] border border-transparent hover:border-[#2a3942] mb-1 cursor-pointer transition">
                    <div class="flex items-center gap-3">
                        <div class="relative shrink-0">
                            <img src="${u.photo || 'https://ui-avatars.com/api/?name=U'}" class="w-10 h-10 rounded-full object-cover border border-[#2a3942]">
                            <span class="absolute -bottom-1 -right-1 text-[10px] bg-[#111b21] rounded-full px-[3px] border border-[#2a3942] leading-none shadow-sm">${u.flag || '🌐'}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-white font-bold text-[0.9rem]">${(u.name || 'User').split(' ')[0]}</span>
                        </div>
                    </div>
                    <input type="checkbox" value="${u.id}" class="conf-invite-checkbox w-5 h-5 accent-[#00a884] cursor-pointer bg-[#202c33] border-none rounded">
                </label>
            `;
        });
    }

    list.innerHTML = html;
    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
    }, 10);
};

// 3. Закрытие окна
window.closeGroupConfModal = function() {
    const modal = document.getElementById('group-conf-modal');
    const content = document.getElementById('group-conf-content');
    if (content) {
        content.classList.add('scale-95');
        content.classList.remove('scale-100');
    }
    setTimeout(() => { if (modal) modal.classList.add('hidden'); }, 200);
};

// 4. Отправка приглашений
window.startGroupConf = function() {
    const checkboxes = document.querySelectorAll('.conf-invite-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);

    if (selectedIds.length === 0) return;

    if (!window.currentRoomId || window.currentRoomId === 'global' || !window.currentRoomId.includes('conf')) {
        window.currentRoomId = "conf_" + Date.now();
    }

    let safeId = window.myProfileInfo.id;
    let safeName = window.myUsername;
    let safePhoto = window.myProfileInfo.photo;

    selectedIds.forEach(targetUserId => {
        let id1 = String(safeId); 
        let id2 = String(targetUserId);
        let privateRoomId = (id1 < id2) ? ("private_" + id1 + "_" + id2) : ("private_" + id2 + "_" + id1);

        firebase.database().ref(privateRoomId).push({
            userId: safeId, 
            name: safeName, 
            photo: safePhoto, 
            text: "Group Video Call Invitation", 
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            isConfInvite: true, 
            confRoomId: window.currentRoomId 
        });
    });

    window.closeGroupConfModal();
};

// 5. Принятие приглашения
window.acceptConferenceInvite = function(confRoomId) {
    window.currentRoomId = confRoomId;
    if (window.switchTab) window.switchTab(2);
};

window.openGroupConfModal = function() {
    // 1. Окно создается ТОЛЬКО по клику. При загрузке страницы его нет, переводчик не ломается.
    if (!document.getElementById('group-conf-modal')) {
        const modalHtml = `
        <div id="group-conf-modal" class="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center" onclick="window.closeGroupConfModal()">
            <div class="bg-[#111b21] border border-[#2a3942] w-[90%] max-w-md rounded-3xl shadow-xl flex flex-col overflow-hidden" onclick="event.stopPropagation()">
                <div class="bg-[#202c33] p-4 flex justify-between items-center border-b border-[#2a3942]">
                    <h3 class="text-[#00a884] text-xl flex items-center gap-2">
                        <i class="fa-solid fa-users"></i>
                    </h3>
                    <button onclick="window.closeGroupConfModal()" class="w-8 h-8 rounded-full bg-[#111b21] text-[#8696a0] hover:text-white flex items-center justify-center">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="p-2 max-h-[50vh] overflow-y-auto" id="group-conf-user-list"></div>
                <div class="p-4 bg-[#202c33] border-t border-[#2a3942] flex justify-end">
                    <button onclick="window.startGroupConf()" class="w-full py-3 rounded-xl bg-[#00a884] text-[#111b21] hover:bg-[#009273] text-xl flex items-center justify-center">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } else {
        document.getElementById('group-conf-modal').classList.remove('hidden');
    }

    const list = document.getElementById('group-conf-user-list');
    
    // 2. Берем контакты
    const availableUsers = window.participants ? window.participants.filter(p => p.id !== 'ai' && p.id !== window.myProfileInfo.id) : [];
    let html = '';

    if (availableUsers.length === 0) {
        // Иконка вместо текста, если нет контактов
        html = `<div class="text-center text-[#8696a0] text-3xl mt-4 p-4"><i class="fa-solid fa-user-slash"></i></div>`;
    } else {
        availableUsers.forEach(u => {
            let name = u.name ? u.name.split(' ')[0] : '';
            let photo = u.photo || 'https://ui-avatars.com/api/?name=U';
            html += `
                <label class="flex items-center justify-between p-3 rounded-2xl bg-[#111b21] hover:bg-[#202c33] border border-transparent mb-1 cursor-pointer">
                    <div class="flex items-center gap-3">
                        <img src="${photo}" class="w-10 h-10 rounded-full object-cover">
                        <span class="text-white font-bold text-[0.9rem]">${name}</span>
                    </div>
                    <input type="checkbox" value="${u.id}" class="conf-invite-checkbox w-5 h-5 accent-[#00a884] cursor-pointer">
                </label>
            `;
        });
    }

    list.innerHTML = html;
};

window.closeGroupConfModal = function() {
    const modal = document.getElementById('group-conf-modal');
    if (modal) modal.classList.add('hidden');
};

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
            text: "🎥 ID: " + window.currentRoomId, 
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    });

    window.closeGroupConfModal();
};

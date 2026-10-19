// === МОДУЛЬ ПРИГЛАШЕНИЯ В КОНФЕРЕНЦИЮ ===

// 1. Создаем скрытое окно при загрузке (HTML спрятан, переводы не ломает)
window.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('group-conf-modal')) {
        const modalHtml = `
        <div id="group-conf-modal" class="hidden fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center backdrop-blur-sm transition-opacity" onclick="window.closeGroupConfModal()">
            <div class="bg-[#111b21] border border-[#2a3942] w-[90%] max-w-md rounded-3xl shadow-2xl flex flex-col overflow-hidden" id="group-conf-content" onclick="event.stopPropagation()">
                <div class="bg-[#202c33] p-4 flex justify-between items-center border-b border-[#2a3942]">
                    <h3 class="text-white font-bold text-lg flex items-center gap-2">
                        <i class="fa-solid fa-users text-[#00a884]"></i> <span>Invite Users</span>
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
});

// 2. Открытие окна и вывод твоих контактов
window.openGroupConfModal = function() {
    const modal = document.getElementById('group-conf-modal');
    const list = document.getElementById('group-conf-user-list');
    if (!modal || !list) return;

    // Берем всех пользователей кроме самого себя и ИИ
    const availableUsers = window.participants ? window.participants.filter(p => p.id !== 'ai' && p.id !== window.myProfileInfo.id) : [];
    let html = '';

    if (availableUsers.length === 0) {
        html = `<p class="text-center text-[#8696a0] text-sm mt-4 p-4">No available contacts</p>`;
    } else {
        availableUsers.forEach(u => {
            let name = u.name ? u.name.split(' ')[0] : 'User';
            let photo = u.photo || 'https://ui-avatars.com/api/?name=U';
            let flag = u.flag || '🌐';
            html += `
                <label class="flex items-center justify-between p-3 rounded-2xl bg-[#111b21] hover:bg-[#202c33] border border-transparent hover:border-[#2a3942] mb-1 cursor-pointer transition">
                    <div class="flex items-center gap-3">
                        <div class="relative shrink-0">
                            <img src="${photo}" class="w-10 h-10 rounded-full object-cover border border-[#2a3942]">
                            <span class="absolute -bottom-1 -right-1 text-[10px] bg-[#111b21] rounded-full px-[3px] border border-[#2a3942] leading-none shadow-sm">${flag}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-white font-bold text-[0.9rem]">${name}</span>
                        </div>
                    </div>
                    <input type="checkbox" value="${u.id}" class="conf-invite-checkbox w-5 h-5 accent-[#00a884] cursor-pointer bg-[#202c33] border-none rounded">
                </label>
            `;
        });
    }

    list.innerHTML = html;
    modal.classList.remove('hidden');
};

// 3. Закрытие окна
window.closeGroupConfModal = function() {
    const modal = document.getElementById('group-conf-modal');
    if (modal) modal.classList.add('hidden');
};

// 4. Отправка уведомлений выбранным контактам
window.startGroupConf = function() {
    const checkboxes = document.querySelectorAll('.conf-invite-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);

    if (selectedIds.length === 0) return;

    // Создаем ID комнаты, если его нет
    if (!window.currentRoomId || window.currentRoomId === 'global' || !window.currentRoomId.includes('conf')) {
        window.currentRoomId = "conf_" + Date.now();
    }

    let safeId = window.myProfileInfo.id;
    let safeName = window.myUsername;
    let safePhoto = window.myProfileInfo.photo;

    // Рассылаем ОБЫЧНОЕ ТЕКСТОВОЕ сообщение в личные чаты (это 100% безопасно для переводов)
    selectedIds.forEach(targetUserId => {
        let id1 = String(safeId); 
        let id2 = String(targetUserId);
        let privateRoomId = (id1 < id2) ? ("private_" + id1 + "_" + id2) : ("private_" + id2 + "_" + id1);

        firebase.database().ref(privateRoomId).push({
            userId: safeId, 
            name: safeName, 
            photo: safePhoto, 
            text: "🎥 Join my Video Conference! Room ID: " + window.currentRoomId, 
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    });

    window.closeGroupConfModal();
    alert("Invites sent successfully!");
};

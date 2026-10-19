
// === БЕЗОПАСНЫЙ МОДУЛЬ ПРИГЛАШЕНИЙ В КОНФЕРЕНЦИЮ ===

// 1. Открытие окна со списком контактов
window.openGroupConfModal = function() {
    // Окно создается только по клику, чтобы не мешать переводчику при загрузке
    if (!document.getElementById('group-conf-modal')) {
        const modalHtml = `
        <div id="group-conf-modal" class="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center backdrop-blur-sm" onclick="window.closeGroupConfModal()">
            <div class="bg-[#111b21] border border-[#2a3942] w-[90%] max-w-md rounded-3xl shadow-xl flex flex-col overflow-hidden" onclick="event.stopPropagation()">
                <div class="bg-[#202c33] p-4 flex justify-between items-center border-b border-[#2a3942]">
                    <h3 class="text-[#00a884] text-xl flex items-center gap-2"><i class="fa-solid fa-users"></i></h3>
                    <button onclick="window.closeGroupConfModal()" class="w-8 h-8 rounded-full bg-[#111b21] text-[#8696a0] hover:text-white flex items-center justify-center transition">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="p-2 max-h-[50vh] overflow-y-auto" id="group-conf-user-list"></div>
                <div class="p-4 bg-[#202c33] border-t border-[#2a3942] flex justify-end">
                    <button onclick="window.startGroupConf()" class="w-full py-3 rounded-xl bg-[#00a884] text-[#111b21] hover:bg-[#009273] text-xl flex items-center justify-center active:scale-95 transition shadow-lg">
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
    const availableUsers = window.participants ? window.participants.filter(p => p.id !== 'ai' && p.id !== window.myProfileInfo.id) : [];
    let html = '';

    if (availableUsers.length === 0) {
        html = `<div class="text-center text-[#8696a0] text-3xl mt-4 p-4"><i class="fa-solid fa-user-slash"></i></div>`;
    } else {
        availableUsers.forEach(u => {
            let name = u.name ? u.name.split(' ')[0] : '';
            let photo = u.photo || 'https://ui-avatars.com/api/?name=U';
            html += `
                <label class="flex items-center justify-between p-3 rounded-2xl bg-[#111b21] hover:bg-[#202c33] border border-transparent mb-1 cursor-pointer transition">
                    <div class="flex items-center gap-3">
                        <img src="${photo}" class="w-10 h-10 rounded-full object-cover border border-[#2a3942]">
                        <span class="text-white font-bold text-[0.9rem]">${name}</span>
                    </div>
                    <input type="checkbox" value="${u.id}" class="conf-invite-checkbox w-5 h-5 accent-[#00a884] cursor-pointer">
                </label>
            `;
        });
    }
    list.innerHTML = html;
};

// 2. Закрытие окна
window.closeGroupConfModal = function() {
    const modal = document.getElementById('group-conf-modal');
    if (modal) modal.classList.add('hidden');
};

// 3. Отправка приглашений (учитывает живую сессию!)
window.startGroupConf = function() {
    const checkboxes = document.querySelectorAll('.conf-invite-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);

    if (selectedIds.length === 0) return;

    // УМНАЯ ЛОГИКА КОМНАТЫ:
    // Если ты УЖЕ сидишь в конференции, скрипт не будет создавать новую комнату, 
    // он возьмет текущий ID и пригласит людей в твою живую сессию!
    if (!window.currentRoomId || window.currentRoomId === 'global' || !window.currentRoomId.includes('conf')) {
        window.currentRoomId = "conf_" + Date.now();
    }

    let safeId = window.myProfileInfo.id;
    let safeName = window.myUsername;
    let safePhoto = window.myProfileInfo.photo;

    // ФОРМИРУЕМ КЛИКАБЕЛЬНУЮ КНОПКУ-ССЫЛКУ В ЧАТ
    // (Используем только HTML и иконку, без английских слов, чтобы переводчик не завис)
    let inviteBtnHtml = `<div onclick="window.joinConference('${window.currentRoomId}')" class="bg-[#00a884] text-[#111b21] px-4 py-2 rounded-xl mt-1 inline-flex items-center gap-2 font-bold cursor-pointer hover:bg-[#009273] shadow-md active:scale-95 transition"><i class="fa-solid fa-video animate-pulse"></i> ID: ${window.currentRoomId.substring(5, 12)}</div>`;

    selectedIds.forEach(targetUserId => {
        let id1 = String(safeId); 
        let id2 = String(targetUserId);
        let privateRoomId = (id1 < id2) ? ("private_" + id1 + "_" + id2) : ("private_" + id2 + "_" + id1);

        firebase.database().ref(privateRoomId).push({
            userId: safeId, 
            name: safeName, 
            photo: safePhoto, 
            text: inviteBtnHtml, 
            originalText: inviteBtnHtml, // Блокируем попытки перевода со стороны чата
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Отправка Push-уведомления (если телефон заблокирован)
        if (typeof window.sendPushToUser === 'function') {
            window.sendPushToUser(targetUserId, safeName, "🎥 Video Conference", "conference_invite");
        }
    });

    window.closeGroupConfModal();
    
    // Если есть функция всплывающих уведомлений, показываем галочку
    if (typeof window.showToast === 'function') {
        window.showToast("Success", "Invites sent to private chats!", "", "");
    }
};

// 4. ФУНКЦИЯ ДЛЯ ВХОДА В КОМНАТУ ПО КЛИКУ ИЗ ЧАТА
window.joinConference = function(roomId) {
    // Устанавливаем ID комнаты из ссылки
    window.currentRoomId = roomId;
    
    // Переключаем интерфейс на вкладку Конференции (индекс 2)
    if (typeof window.switchTab === 'function') {
        window.switchTab(2);
    }
    
    // Запускаем движок видеоконференции
    if (typeof window.initConference === 'function') {
        window.initConference();
    }
};

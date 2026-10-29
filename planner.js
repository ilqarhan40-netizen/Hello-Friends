// ==========================================
// БАЗА ДАННЫХ ПЛАНИРОВЩИКА
// ==========================================
window.plannerReminders = JSON.parse(localStorage.getItem('hf_reminders')) || [];
window.plannerNotes = JSON.parse(localStorage.getItem('hf_notes')) || [];

// ==========================================
// ОТКРЫТИЕ ОКНА И ЕГО СОЗДАНИЕ ПРИ ПЕРВОМ КЛИКЕ
// ==========================================
window.openPlannerModal = function() {
    if(window.closeAllMenus) window.closeAllMenus();

    // 1. Проверяем, есть ли окно. Если нет - создаем жестко!
    if (!document.getElementById('planner-modal')) {
        const modalHTML = `
        <div id="planner-modal" class="app-modal" onclick="if(event.target===this) window.closePlannerModal();">
            <div class="app-modal-content h-[80vh] flex flex-col">
                <div class="close-sheet-btn" onclick="window.closePlannerModal()"><i class="fa-solid fa-xmark"></i></div>
                <div class="sheet-handle" onclick="window.closePlannerModal()"></div>
                <h2 class="text-xl font-bold mb-4 text-white text-center mt-2">
                    <i class="fa-solid fa-calendar-check text-[#f59e0b] mr-2"></i> 
                    <span data-translate="planner_title">Планировщик</span>
                </h2>
                <div class="flex gap-1 bg-[#202c33] p-1 rounded-xl mb-4 border border-[#2a3942] shrink-0">
                    <button id="tab-btn-reminders" type="button" class="flex-1 py-2 rounded-lg bg-[#111b21] text-white text-xs font-bold shadow-sm transition" onclick="window.switchPlannerTab('reminders')">
                        <i class="fa-regular fa-clock"></i> <span data-translate="planner_reminders">Напоминания</span>
                    </button>
                    <button id="tab-btn-notes" type="button" class="flex-1 py-2 rounded-lg bg-transparent text-[#8696a0] text-xs font-bold hover:text-white transition" onclick="window.switchPlannerTab('notes')">
                        <i class="fa-solid fa-list-check"></i> <span data-translate="planner_notes">Заметки</span>
                    </button>
                </div>
                <div id="planner-reminders-view" class="flex flex-col flex-grow overflow-hidden">
                    <form id="reminder-form" class="flex flex-col gap-2 shrink-0 mb-3" onsubmit="window.addReminder(event)">
                        <input type="text" id="reminder-text" class="form-input-box !mb-0" placeholder="О чем напомнить?" data-translate-placeholder="planner_placeholder_remind" required>
                        <div class="flex gap-2">
                            <input type="date" id="reminder-date" class="form-input-box !mb-0 flex-1" required>
                            <input type="time" id="reminder-time" class="form-input-box !mb-0 w-1/3" value="09:00" required>
                        </div>
                        <button type="submit" class="btn-primary !bg-[#f59e0b] !text-[#111b21] !py-2.5 mt-1 border-none" data-translate="planner_btn_add">Добавить</button>
                    </form>
                    <div id="reminders-list" class="flex flex-col gap-2 overflow-y-auto flex-grow pb-4"></div>
                </div>
                <div id="planner-notes-view" class="hidden flex-col flex-grow overflow-hidden">
                     <form id="note-form" class="flex gap-2 shrink-0 mb-3" onsubmit="window.addNote(event)">
                        <input type="text" id="note-text" class="form-input-box !mb-0 flex-1" placeholder="Новая заметка..." data-translate-placeholder="planner_placeholder_note" required>
                        <button type="submit" class="bg-[#00a884] text-[#111b21] border-none rounded-xl px-4 font-bold hover:scale-95 transition"><i class="fa-solid fa-plus"></i></button>
                    </form>
                    <div id="notes-list" class="flex flex-col gap-2 overflow-y-auto flex-grow pb-4"></div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // ВАЖНО: Вызываем функцию перевода сразу после создания окна
        if (typeof window.applyTranslations === 'function') {
            window.applyTranslations();
        }
    }

    // 2. Показываем окно
    const modal = document.getElementById('planner-modal');
    if (modal) {
        modal.classList.add('active');
        // Обновляем переводы, если окно уже было создано, а язык поменялся
        if (typeof window.applyTranslations === 'function') {
            window.applyTranslations();
        }
    }

    // 3. Ставим сегодняшнюю дату
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('reminder-date');
    if (dateInput) dateInput.value = today;

    if(window.renderPlannerLists) window.renderPlannerLists();
};

window.closePlannerModal = function() {
    const modal = document.getElementById('planner-modal');
    if(modal) modal.classList.remove('active');
};

window.switchPlannerTab = function(tabName) {
    const btnReminders = document.getElementById('tab-btn-reminders');
    const btnNotes = document.getElementById('tab-btn-notes');
    const viewReminders = document.getElementById('planner-reminders-view');
    const viewNotes = document.getElementById('planner-notes-view');

    if (tabName === 'reminders') {
        btnReminders.className = "flex-1 py-2 rounded-lg bg-[#111b21] text-white text-xs font-bold shadow-sm transition";
        btnNotes.className = "flex-1 py-2 rounded-lg bg-transparent text-[#8696a0] text-xs font-bold hover:text-white transition";
        viewReminders.classList.remove('hidden'); viewReminders.classList.add('flex');
        viewNotes.classList.add('hidden'); viewNotes.classList.remove('flex');
    } else {
        btnNotes.className = "flex-1 py-2 rounded-lg bg-[#111b21] text-white text-xs font-bold shadow-sm transition";
        btnReminders.className = "flex-1 py-2 rounded-lg bg-transparent text-[#8696a0] text-xs font-bold hover:text-white transition";
        viewNotes.classList.remove('hidden'); viewNotes.classList.add('flex');
        viewReminders.classList.add('hidden'); viewReminders.classList.remove('flex');
    }
};

window.addReminder = function(e) {
    e.preventDefault();
    const text = document.getElementById('reminder-text').value.trim();
    const date = document.getElementById('reminder-date').value;
    const time = document.getElementById('reminder-time').value;
    if (!text || !date || !time) return;

    const newReminder = {
        id: 'rem_' + Date.now(), text: text, date: date, time: time,
        timestamp: new Date(`${date}T${time}`).getTime(), notified: false
    };

    window.plannerReminders.push(newReminder);
    window.plannerReminders.sort((a, b) => a.timestamp - b.timestamp);
    localStorage.setItem('hf_reminders', JSON.stringify(window.plannerReminders));
    document.getElementById('reminder-text').value = '';
    window.renderPlannerLists();
};

window.addNote = function(e) {
    e.preventDefault();
    const text = document.getElementById('note-text').value.trim();
    if (!text) return;

    window.plannerNotes.unshift({ id: 'note_' + Date.now(), text: text });
    localStorage.setItem('hf_notes', JSON.stringify(window.plannerNotes));
    document.getElementById('note-text').value = '';
    window.renderPlannerLists();
};

window.deleteReminder = function(id) {
    window.plannerReminders = window.plannerReminders.filter(r => r.id !== id);
    localStorage.setItem('hf_reminders', JSON.stringify(window.plannerReminders));
    window.renderPlannerLists();
};

window.deleteNote = function(id) {
    window.plannerNotes = window.plannerNotes.filter(n => n.id !== id);
    localStorage.setItem('hf_notes', JSON.stringify(window.plannerNotes));
    window.renderPlannerLists();
};

window.renderPlannerLists = function() {
    const rList = document.getElementById('reminders-list');
    const nList = document.getElementById('notes-list');
    if(!rList || !nList) return;

    if (window.plannerReminders.length === 0) {
        // Текст пустых списков тоже переведем через виджет или оставим заглушку
        rList.innerHTML = '<p class="text-center text-sm text-[#8696a0] mt-4" data-translate="planner_empty_reminders">Нет активных напоминаний.</p>';
    } else {
        let rHtml = '';
        window.plannerReminders.forEach(r => {
            const isPast = r.timestamp < Date.now();
            const colorClass = isPast ? 'text-[#8696a0]' : 'text-white';
            const borderClass = isPast ? 'border-[#2a3942]' : 'border-[#f59e0b]/50';
            rHtml += `
            <div class="bg-[#111b21] p-3 rounded-xl border ${borderClass} flex justify-between items-center gap-3">
                <div class="flex flex-col overflow-hidden">
                    <span class="${colorClass} font-bold text-sm truncate">${r.text}</span>
                    <span class="text-[#8696a0] text-xs"><i class="fa-regular fa-calendar mr-1"></i> ${r.date} в ${r.time}</span>
                </div>
                <button onclick="window.deleteReminder('${r.id}')" class="text-[#8696a0] hover:text-red-500 transition px-2 shrink-0"><i class="fa-solid fa-trash-can"></i></button>
            </div>`;
        });
        rList.innerHTML = rHtml;
    }

    if (window.plannerNotes.length === 0) {
        nList.innerHTML = '<p class="text-center text-sm text-[#8696a0] mt-4" data-translate="planner_empty_notes">Блокнот пуст.</p>';
    } else {
        let nHtml = '';
        window.plannerNotes.forEach(n => {
            nHtml += `
            <div class="bg-[#111b21] p-3 rounded-xl border border-[#2a3942] flex justify-between items-center gap-3">
                <span class="text-white text-sm whitespace-pre-wrap">${n.text}</span>
                <button onclick="window.deleteNote('${n.id}')" class="text-[#8696a0] hover:text-red-500 transition px-2 shrink-0"><i class="fa-solid fa-trash-can"></i></button>
            </div>`;
        });
        nList.innerHTML = nHtml;
    }
    
    if (typeof window.applyTranslations === 'function') window.applyTranslations();
};

setInterval(() => {
    if (!window.plannerReminders || window.plannerReminders.length === 0) return;
    const now = Date.now();
    let needUpdate = false;

    window.plannerReminders.forEach(r => {
        if (r.timestamp <= now && !r.notified) {
            r.notified = true;
            needUpdate = true;
            if (window.showToast) window.showToast("🔔 Напоминание", r.text, "https://ui-avatars.com/api/?name=N&background=f59e0b&color=fff", "");
            if (window.firePush) window.firePush("🔔 Напоминание", r.text);
            if (window.sndMsg) window.sndMsg.play().catch(e=>{});
        }
    });

    if (needUpdate) {
        localStorage.setItem('hf_reminders', JSON.stringify(window.plannerReminders));
        const modal = document.getElementById('planner-modal');
        if (modal && modal.classList.contains('active')) window.renderPlannerLists();
    }
}, 30000);

// ==========================================
// РАБОЧИЙ МОДУЛЬ CLIPBOARD.JS (ТЕКСТ, ФОТО, ВИДЕО)
// ==========================================

window.currentClipContent = null;
window.currentClipType = 'text';
window.currentTargetElement = null; 

window.openClipboardMenu = function(content, type, targetEl) {
    if (window.closeAllMenus) window.closeAllMenus();
    
    window.currentClipContent = content;
    window.currentClipType = type;
    window.currentTargetElement = targetEl; // Запоминаем элемент, чтобы его можно было удалить

    let dict = window.i18n ? (window.i18n[window.appLang || 'en'] || window.i18n['en']) : {};

    let modal = document.getElementById('clipboard-modal');
    if (!modal) {
        const modalHTML = `
        <div id="clipboard-modal" class="app-modal" onclick="if(event.target===this) window.closeClipboardModal();" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999; justify-content:center; align-items:center;">
            <div class="app-modal-content flex flex-col p-4 max-w-sm w-full bg-[#111b21] border border-[#2a3942] rounded-2xl shadow-2xl scale-95 transition-transform duration-200">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-white font-bold text-base"><i class="fa-solid fa-clipboard text-[#00a884] mr-2"></i> <span data-i18n="clip_title">Действия</span></h3>
                    <div class="cursor-pointer text-[#8696a0] hover:text-white px-2" onclick="window.closeClipboardModal()"><i class="fa-solid fa-xmark text-lg"></i></div>
                </div>
                
                <!-- Превью контента -->
                <div id="clipboard-preview" class="bg-[#202c33] p-2.5 rounded-xl text-xs text-[#e9edef] mb-3 max-h-32 overflow-y-auto break-all border border-[#2a3942] flex justify-center items-center"></div>
                
                <div class="flex flex-col gap-2">
                    <button type="button" onclick="window.execCopyAction()" class="flex items-center gap-3 w-full p-2.5 bg-[#202c33] hover:bg-[#2a3942] text-white rounded-xl text-sm font-medium transition border border-[#2a3942]">
                        <i class="fa-solid fa-copy text-[#00a884] w-5"></i> <span data-i18n="clip_copy">Копировать</span>
                    </button>
                    <button type="button" onclick="window.execPasteAction()" class="flex items-center gap-3 w-full p-2.5 bg-[#202c33] hover:bg-[#2a3942] text-white rounded-xl text-sm font-medium transition border border-[#2a3942]">
                        <i class="fa-solid fa-paste text-[#3b82f6] w-5"></i> <span data-i18n="clip_paste">Вставить</span>
                    </button>
                    <button id="clip-save-btn" type="button" onclick="window.execSaveAction()" class="flex items-center gap-3 w-full p-2.5 bg-[#202c33] hover:bg-[#2a3942] text-white rounded-xl text-sm font-medium transition border border-[#2a3942]">
                        <i class="fa-solid fa-download text-[#f59e0b] w-5"></i> <span data-i18n="clip_save">Сохранить</span>
                    </button>
                    <button type="button" onclick="window.execDeleteAction()" class="flex items-center gap-3 w-full p-2.5 bg-[#202c33] hover:bg-red-950/40 text-red-400 rounded-xl text-sm font-medium transition border border-red-900/30">
                        <i class="fa-solid fa-trash-can w-5"></i> <span data-i18n="clip_delete">Удалить</span>
                    </button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('clipboard-modal');
    }

    // Настройка превью в зависимости от типа (Текст, Фото, Видео)
    const previewEl = document.getElementById('clipboard-preview');
    if (type === 'image') {
        previewEl.innerHTML = `<img src="${content}" class="max-h-24 rounded-lg object-contain">`;
    } else if (type === 'video') {
        previewEl.innerHTML = `<video src="${content}" class="max-h-24 rounded-lg object-contain"></video>`;
    } else {
        previewEl.innerText = content.length > 150 ? content.substring(0, 150) + '...' : content;
    }

    // Показываем кнопку "Сохранить" только для фото и видео
    const saveBtn = document.getElementById('clip-save-btn');
    if (type === 'image' || type === 'video') {
        saveBtn.style.display = 'flex';
    } else {
        saveBtn.style.display = 'none';
    }

    modal.style.display = 'flex';
    setTimeout(() => modal.querySelector('.app-modal-content').classList.replace('scale-95', 'scale-100'), 10);
    if (typeof window.applyTranslations === 'function') window.applyTranslations();
};

window.closeClipboardModal = function() {
    const modal = document.getElementById('clipboard-modal');
    if (modal) {
        modal.querySelector('.app-modal-content').classList.replace('scale-100', 'scale-95');
        setTimeout(() => modal.style.display = 'none', 200);
    }
};

// --- ФУНКЦИИ КНОПОК ---

window.execCopyAction = function() {
    if (!window.currentClipContent) return;
    navigator.clipboard.writeText(window.currentClipContent).then(() => {
        let dict = window.i18n ? (window.i18n[window.appLang || 'en'] || window.i18n['en']) : {};
        if (window.showToast) window.showToast(dict.clip_copied || "Copied", "", "", "");
        window.closeClipboardModal();
    });
};

window.execPasteAction = async function() {
    try {
        const text = await navigator.clipboard.readText();
        let activeInput = document.activeElement;
        // Ищем поле чата, если курсор не стоит в инпуте
        if (!activeInput || (activeInput.tagName !== 'INPUT' && activeInput.tagName !== 'TEXTAREA')) {
            activeInput = document.getElementById('msg-input') || document.querySelector('input[type="text"]');
        }
        if (activeInput) {
            const start = activeInput.selectionStart || 0;
            const end = activeInput.selectionEnd || 0;
            activeInput.value = activeInput.value.slice(0, start) + text + activeInput.value.slice(end);
            activeInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    } catch (err) {}
    window.closeClipboardModal();
};

window.execSaveAction = function() {
    if (!window.currentClipContent || window.currentClipType === 'text') return;
    const a = document.createElement('a');
    a.href = window.currentClipContent;
    // Назначаем правильный формат файла
    let ext = window.currentClipType === 'video' ? 'mp4' : 'jpg';
    a.download = `HF_Media_${Date.now()}.${ext}`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    let dict = window.i18n ? (window.i18n[window.appLang || 'en'] || window.i18n['en']) : {};
    if (window.showToast) window.showToast(dict.clip_saved || "Saved", "", "", "");
    window.closeClipboardModal();
};

window.execDeleteAction = function() {
    if (window.currentTargetElement) {
        // Находим весь блок сообщения и удаляем его с экрана
        const msgBlock = window.currentTargetElement.closest('.message') || window.currentTargetElement;
        msgBlock.remove();
    }
    let dict = window.i18n ? (window.i18n[window.appLang || 'en'] || window.i18n['en']) : {};
    if (window.showToast) window.showToast(dict.clip_deleted || "Deleted", "", "", "");
    window.closeClipboardModal();
};


// --- ПЕРЕХВАТЧИК НАЖАТИЙ (ГАСТИТ МЕНЮ CHROME) ---

function handleContextMenuRequest(e, target) {
    if (!target) return;
    
    let content = '';
    let type = 'text';

    if (target.tagName === 'IMG') {
        content = target.src;
        type = 'image';
    } else if (target.tagName === 'VIDEO') {
        content = target.src || target.querySelector('source')?.src;
        type = 'video';
    } else {
        content = target.innerText || target.value || '';
        type = 'text';
        if (!content.trim()) return; // Игнорируем пустые места
    }

    if (content) {
        e.preventDefault(); // Блокируем стандартное окно Chrome
        window.openClipboardMenu(content, type, target);
    }
}

// Перехват правого клика
document.addEventListener('contextmenu', function(e) {
    const target = e.target.closest('img, video, .msg-text, .message p');
    if (target) handleContextMenuRequest(e, target);
});

// Перехват долгого тапа на телефоне
let touchTimer = null;
document.addEventListener('touchstart', function(e) {
    const target = e.target.closest('img, video, .msg-text, .message p');
    if (!target) return;
    
    touchTimer = setTimeout(() => {
        handleContextMenuRequest(e, target);
    }, 500); // 0.5 секунды для срабатывания
}, { passive: false });

document.addEventListener('touchend', function() {
    if (touchTimer) clearTimeout(touchTimer);
}, { passive: true });

document.addEventListener('touchmove', function() {
    if (touchTimer) clearTimeout(touchTimer);
}, { passive: true });


// --- ДОБАВЛЯЕМ СЛОВАРЬ ДЛЯ CLIPBOARD (ЕСЛИ ЕЩЕ НЕТ) ---
if (window.i18n) {
    if (window.i18n.en) Object.assign(window.i18n.en, {clip_title: "Actions", clip_copy: "Copy", clip_paste: "Paste", clip_save: "Save", clip_delete: "Delete", clip_copied: "Copied", clip_saved: "Saved", clip_deleted: "Deleted"});
    if (window.i18n.ru) Object.assign(window.i18n.ru, {clip_title: "Действия", clip_copy: "Копировать", clip_paste: "Вставить", clip_save: "Сохранить", clip_delete: "Удалить", clip_copied: "Скопировано", clip_saved: "Сохранено", clip_deleted: "Удалено"});
}

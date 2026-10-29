// ==========================================
// МОДУЛЬ БУФЕРА ОБМЕНА И КОНТЕКСТНОГО МЕНЮ (CLIPBOARD.JS)
// ==========================================

window.clipboardData = JSON.parse(localStorage.getItem('hf_clipboard_history')) || [];

// Открытие контекстного меню для элемента (Текст, Картинка, Файл)
window.openClipboardMenu = function(content, type = 'text') {
    if(window.closeAllMenus) window.closeAllMenus();

    let dict = window.i18n ? (window.i18n[window.appLang || 'en'] || window.i18n['en']) : {};

    // Создаем модальное меню, если его еще нет
    let modal = document.getElementById('clipboard-modal');
    if (!modal) {
        const modalHTML = `
        <div id="clipboard-modal" class="app-modal" onclick="if(event.target===this) window.closeClipboardModal();">
            <div class="app-modal-content flex flex-col p-4 max-w-sm w-full bg-[#111b21] border border-[#2a3942] rounded-2xl shadow-2xl">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-white font-bold text-base"><i class="fa-solid fa-clipboard text-[#00a884] mr-2"></i> <span data-i18n="clip_title">Clipboard Actions</span></h3>
                    <div class="close-sheet-btn cursor-pointer text-[#8696a0] hover:text-white" onclick="window.closeClipboardModal()"><i class="fa-solid fa-xmark text-lg"></i></div>
                </div>
                <div id="clipboard-preview" class="bg-[#202c33] p-2.5 rounded-xl text-xs text-[#e9edef] mb-3 max-h-28 overflow-y-auto break-all border border-[#2a3942]"></div>
                <div class="flex flex-col gap-2">
                    <button type="button" onclick="window.execCopyAction()" class="flex items-center gap-3 w-full p-2.5 bg-[#202c33] hover:bg-[#2a3942] text-white rounded-xl text-sm font-medium transition border border-[#2a3942]">
                        <i class="fa-solid fa-copy text-[#00a884] w-5"></i> <span data-i18n="clip_copy">Copy</span>
                    </button>
                    <button type="button" onclick="window.execPasteAction()" class="flex items-center gap-3 w-full p-2.5 bg-[#202c33] hover:bg-[#2a3942] text-white rounded-xl text-sm font-medium transition border border-[#2a3942]">
                        <i class="fa-solid fa-paste text-[#3b82f6] w-5"></i> <span data-i18n="clip_paste">Paste from Clipboard</span>
                    </button>
                    <button id="clip-save-btn" type="button" onclick="window.execSaveAction()" class="flex items-center gap-3 w-full p-2.5 bg-[#202c33] hover:bg-[#2a3942] text-white rounded-xl text-sm font-medium transition border border-[#2a3942] hidden">
                        <i class="fa-solid fa-download text-[#f59e0b] w-5"></i> <span data-i18n="clip_save">Save / Download</span>
                    </button>
                    <button type="button" onclick="window.execDeleteAction()" class="flex items-center gap-3 w-full p-2.5 bg-[#202c33] hover:bg-red-950/40 text-red-400 rounded-xl text-sm font-medium transition border border-red-900/30">
                        <i class="fa-solid fa-trash-can w-5"></i> <span data-i18n="clip_delete">Delete</span>
                    </button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('clipboard-modal');
    }

    // Сохраняем текущий контент для действий
    window.currentClipContent = content;
    window.currentClipType = type;

    // Отображаем превью контента
    const previewEl = document.getElementById('clipboard-preview');
    if (previewEl) {
        if (type === 'image') {
            previewEl.innerHTML = `<img src="${content}" class="max-h-24 mx-auto rounded-lg object-contain">`;
        } else {
            previewEl.innerText = content;
        }
    }

    // Показываем или скрываем кнопку сохранения медиа
    const saveBtn = document.getElementById('clip-save-btn');
    if (saveBtn) {
        if (type === 'image' || type === 'file') {
            saveBtn.classList.remove('hidden');
        } else {
            saveBtn.classList.add('hidden');
        }
    }

    modal.classList.add('active');
    if (typeof window.applyTranslations === 'function') window.applyTranslations();
};

window.closeClipboardModal = function() {
    const modal = document.getElementById('clipboard-modal');
    if (modal) modal.classList.remove('active');
};

// --- ФУНКЦИИ ДЕЙСТВИЙ ---

// 1. Копирование
window.execCopyAction = function() {
    if (!window.currentClipContent) return;
    navigator.clipboard.writeText(window.currentClipContent).then(() => {
        let dict = window.i18n ? (window.i18n[window.appLang || 'en'] || window.i18n['en']) : {};
        if (window.showToast) window.showToast(dict.clip_copied || "Copied", dict.clip_copied_desc || "Text copied to clipboard", "", "");
        window.closeClipboardModal();
    }).catch(err => {
        console.error('Copy failed', err);
    });
};

// 2. Вставка (в активное поле ввода текста/чата)
window.execPasteAction = async function() {
    try {
        const text = await navigator.clipboard.readText();
        let activeInput = document.activeElement;
        
        // Если фокус не в поле ввода, ищем стандартное поле чата или поиска
        if (!activeInput || (activeInput.tagName !== 'INPUT' && activeInput.tagName !== 'TEXTAREA')) {
            activeInput = document.getElementById('msg-input') || document.getElementById('search-input') || document.querySelector('input[type="text"]');
        }

        if (activeInput) {
            const start = activeInput.selectionStart || 0;
            const end = activeInput.selectionEnd || 0;
            const val = activeInput.value;
            activeInput.value = val.slice(0, start) + text + val.slice(end);
            activeInput.selectionStart = activeInput.selectionEnd = start + text.length;
            activeInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            let dict = window.i18n ? (window.i18n[window.appLang || 'en'] || window.i18n['en']) : {};
            if (window.showToast) window.showToast(dict.clip_pasted || "Pasted", dict.clip_pasted_desc || "Content pasted", "", "");
        }
    } catch (err) {
        alert("Clipboard read permission denied or not supported.");
    }
    window.closeClipboardModal();
};

// 3. Сохранение / Скачивание файла или картинки в галерею
window.execSaveAction = function() {
    if (!window.currentClipContent) return;
    const a = document.createElement('a');
    a.href = window.currentClipContent;
    a.download = 'HelloFriends_Media_' + Date.now();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    let dict = window.i18n ? (window.i18n[window.appLang || 'en'] || window.i18n['en']) : {};
    if (window.showToast) window.showToast(dict.clip_saved || "Saved", dict.clip_saved_desc || "File downloaded successfully", "", "");
    window.closeClipboardModal();
};

// 4. Удаление элемента
window.execDeleteAction = function() {
    window.currentClipContent = null;
    let dict = window.i18n ? (window.i18n[window.appLang || 'en'] || window.i18n['en']) : {};
    if (window.showToast) window.showToast(dict.clip_deleted || "Deleted", dict.clip_deleted_desc || "Item removed", "", "");
    window.closeClipboardModal();
};

// Добавляем ключи в глобальный словарь window.i18n динамически при загрузке (на случай если ключи нужны)
if (window.i18n) {
    if (!window.i18n.en) window.i18n.en = {};
    Object.assign(window.i18n.en, {
        clip_title: "Clipboard Actions", clip_copy: "Copy", clip_paste: "Paste from Clipboard",
        clip_save: "Save / Download", clip_delete: "Delete", clip_copied: "Copied",
        clip_copied_desc: "Text copied to clipboard", clip_pasted: "Pasted", clip_pasted_desc: "Content pasted",
        clip_saved: "Saved", clip_saved_desc: "File downloaded successfully", clip_deleted: "Deleted", clip_deleted_desc: "Item removed"
    });
    if (!window.i18n.ru) window.i18n.ru = {};
    Object.assign(window.i18n.ru, {
        clip_title: "Буфер обмена", clip_copy: "Копировать", clip_paste: "Вставить из буфера",
        clip_save: "Сохранить / Скачать", clip_delete: "Удалить", clip_copied: "Скопировано",
        clip_copied_desc: "Текст скопирован в буфер", clip_pasted: "Вставлено", clip_pasted_desc: "Контент вставлен в поле",
        clip_saved: "Сохранено", clip_saved_desc: "Файл успешно скачан", clip_deleted: "Удалено", clip_deleted_desc: "Элемент удален"
    });
}

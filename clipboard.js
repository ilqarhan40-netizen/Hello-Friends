// ==========================================
// ГЛОБАЛЬНЫЙ CLIPBOARD.JS (ТЕКСТ, ФОТО, ВИДЕО, ЛОКАЦИИ, ССЫЛКИ)
// Работает во всех комнатах и чатах экосистемы
// ==========================================

// 1. ЖЕСТКАЯ БЛОКИРОВКА МЕНЮ CHROME ДЛЯ ВСЕХ ЭЛЕМЕНТОВ СООБЩЕНИЙ
(function blockChromeMenu() {
    if (!document.getElementById('hf-clip-styles')) {
        const style = document.createElement('style');
        style.id = 'hf-clip-styles';
        style.innerHTML = `
            .message, .msg-content, img, video, iframe, a, [data-clipboard] {
                -webkit-touch-callout: none !important;
                -webkit-user-select: none !important;
                user-select: none !important;
            }
            input, textarea, [contenteditable="true"] {
                -webkit-user-select: text !important;
                user-select: text !important;
            }
        `;
        document.head.appendChild(style);
    }
})();

window.currentClipContent = null;
window.currentClipType = 'text';
window.currentTargetElement = null; 

window.openClipboardMenu = function(content, type, targetEl) {
    if (window.closeAllMenus) window.closeAllMenus();
    
    window.currentClipContent = content;
    window.currentClipType = type;
    window.currentTargetElement = targetEl;

    let dict = window.i18n ? (window.i18n[window.appLang || 'en'] || window.i18n['en']) : {};

    let modal = document.getElementById('clipboard-modal');
    if (!modal) {
        const modalHTML = `
        <div id="clipboard-modal" class="app-modal" onclick="if(event.target===this) window.closeClipboardModal();" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999; justify-content:center; align-items:center;">
            <div class="app-modal-content flex flex-col p-4 max-w-sm w-full bg-[#111b21] border border-[#2a3942] rounded-2xl shadow-2xl scale-95 transition-transform duration-200">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-white font-bold text-base"><i class="fa-solid fa-clipboard text-[#00a884] mr-2"></i> <span data-i18n="clip_title">Actions</span></h3>
                    <div class="cursor-pointer text-[#8696a0] hover:text-white px-2" onclick="window.closeClipboardModal()"><i class="fa-solid fa-xmark text-lg"></i></div>
                </div>
                
                <div id="clipboard-preview" class="bg-[#202c33] p-2.5 rounded-xl text-xs text-[#e9edef] mb-3 max-h-32 overflow-y-auto break-all border border-[#2a3942] flex justify-center items-center text-center"></div>
                
                <div class="flex flex-col gap-2">
                    <button type="button" onclick="window.execCopyAction()" class="flex items-center gap-3 w-full p-2.5 bg-[#202c33] hover:bg-[#2a3942] text-white rounded-xl text-sm font-medium transition border border-[#2a3942]">
                        <i class="fa-solid fa-copy text-[#00a884] w-5"></i> <span data-i18n="clip_copy">Copy</span>
                    </button>
                    <button type="button" onclick="window.execPasteAction()" class="flex items-center gap-3 w-full p-2.5 bg-[#202c33] hover:bg-[#2a3942] text-white rounded-xl text-sm font-medium transition border border-[#2a3942]">
                        <i class="fa-solid fa-paste text-[#3b82f6] w-5"></i> <span data-i18n="clip_paste">Paste</span>
                    </button>
                    <button id="clip-save-btn" type="button" onclick="window.execSaveAction()" class="flex items-center gap-3 w-full p-2.5 bg-[#202c33] hover:bg-[#2a3942] text-white rounded-xl text-sm font-medium transition border border-[#2a3942]">
                        <i class="fa-solid fa-download text-[#f59e0b] w-5"></i> <span data-i18n="clip_save">Save</span>
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

    // Настраиваем превью под любой тип контента
    const previewEl = document.getElementById('clipboard-preview');
    if (type === 'image') {
        previewEl.innerHTML = `<img src="${content}" class="max-h-24 rounded-lg object-contain">`;
    } else if (type === 'video') {
        previewEl.innerHTML = `<video src="${content}" class="max-h-24 rounded-lg object-contain"></video>`;
    } else if (type === 'location') {
        previewEl.innerHTML = `<i class="fa-solid fa-map-location-dot text-3xl text-[#3b82f6] mb-1"></i><br><span>Location Map</span>`;
    } else if (type === 'link') {
        previewEl.innerHTML = `<i class="fa-solid fa-link text-xl text-[#00a884] mr-2"></i> ${content}`;
    } else {
        previewEl.innerText = content.length > 100 ? content.substring(0, 100) + '...' : content;
    }

    // Сохранить можно только фото и видео. Карты и тексты - только копировать
    const saveBtn = document.getElementById('clip-save-btn');
    if (type === 'image' || type === 'video') saveBtn.style.display = 'flex';
    else saveBtn.style.display = 'none';

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

// --- ФУНКЦИИ ---

window.execCopyAction = async function() {
    if (!window.currentClipContent) return;
    let dict = window.i18n ? (window.i18n[window.appLang || 'en'] || window.i18n['en']) : {};

    try {
        if (window.currentClipType === 'image') {
            const res = await fetch(window.currentClipContent);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({[blob.type]: blob})]);
        } else {
            // Для текста, локаций (iframe src) и ссылок просто копируем их как текст/URL
            await navigator.clipboard.writeText(window.currentClipContent);
        }
        if (window.showToast) window.showToast(dict.clip_copied || "Copied", "", "", "");
    } catch (err) {
        if (window.currentClipType === 'image' && window.showToast) {
            window.showToast("Use Save", "Image copying blocked by device.", "", "");
        } else {
            // Фолбэк на старый метод копирования, если устройство капризное
            const el = document.createElement('textarea');
            el.value = window.currentClipContent;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            if (window.showToast) window.showToast(dict.clip_copied || "Copied", "", "", "");
        }
    }
    window.closeClipboardModal();
};

window.execPasteAction = async function() {
    try {
        const text = await navigator.clipboard.readText();
        if (!text) return;

        let activeInput = document.activeElement;
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
    if (!window.currentClipContent || (window.currentClipType !== 'image' && window.currentClipType !== 'video')) return;
    const a = document.createElement('a');
    a.href = window.currentClipContent;
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
        // Ищем корневой блок сообщения, чтобы удалить всё целиком
        const msgBlock = window.currentTargetElement.closest('.message, .msg-content') || window.currentTargetElement;
        msgBlock.remove();
    }
    let dict = window.i18n ? (window.i18n[window.appLang || 'en'] || window.i18n['en']) : {};
    if (window.showToast) window.showToast(dict.clip_deleted || "Deleted", "", "", "");
    window.closeClipboardModal();
};

// --- ВСЕЯДНЫЙ ПЕРЕХВАТЧИК ---

function handleContextRequest(e) {
    // 1. Ищем ЛЮБОЙ элемент, по которому кликнули (включая локации, ссылки, чат-блоки)
    const target = e.target.closest('.message, .msg-content, img, video, iframe, a');
    if (!target) return;

    let content = '';
    let type = 'text';

    // 2. Распознаем, что именно внутри
    if (target.tagName === 'IFRAME') {
        content = target.src; 
        type = 'location'; // Это локация (карта)
    } else if (target.tagName === 'IMG') {
        content = target.src;
        type = 'image';
    } else if (target.tagName === 'VIDEO') {
        content = target.src || target.querySelector('source')?.src;
        type = 'video';
    } else if (target.tagName === 'A') {
        content = target.href;
        type = 'link';
    } else {
        // Если кликнули на сам блок .message, ищем внутри него медиа или локации
        const iframe = target.querySelector('iframe');
        const img = target.querySelector('img');
        const video = target.querySelector('video');
        const link = target.querySelector('a');

        if (iframe) {
            content = iframe.src;
            type = 'location';
        } else if (img) {
            content = img.src;
            type = 'image';
        } else if (video) {
            content = video.src || video.querySelector('source')?.src;
            type = 'video';
        } else if (link) {
            content = link.href;
            type = 'link';
        } else {
            // Если ничего нет, берем текст сообщения
            content = target.innerText || target.textContent || '';
            type = 'text';
            if (!content.trim()) return;
        }
    }

    if (content) {
        e.preventDefault(); 
        e.stopPropagation(); 
        window.openClipboardMenu(content, type, target);
    }
}

// Захватываем события везде по всему приложению
document.addEventListener('contextmenu', function(e) {
    if (e.target.closest('.message, .msg-content, img, video, iframe, a')) {
        handleContextRequest(e);
    }
}, true);

let touchTimer = null;
document.addEventListener('touchstart', function(e) {
    if (e.target.closest('.message, .msg-content, img, video, iframe, a')) {
        touchTimer = setTimeout(() => {
            handleContextRequest(e);
        }, 400); 
    }
}, { passive: false, capture: true });

document.addEventListener('touchend', function() { if (touchTimer) clearTimeout(touchTimer); }, true);
document.addEventListener('touchmove', function() { if (touchTimer) clearTimeout(touchTimer); }, true);

// --- ГЛОБАЛЬНЫЕ СЛОВАРИ (Мультиязычность) ---
if (window.i18n) {
    const clipDicts = {
        en: {clip_title: "Actions", clip_copy: "Copy", clip_paste: "Paste", clip_save: "Save", clip_delete: "Delete", clip_copied: "Copied", clip_saved: "Saved", clip_deleted: "Deleted"},
        ru: {clip_title: "Действия", clip_copy: "Копировать", clip_paste: "Вставить", clip_save: "Сохранить", clip_delete: "Удалить", clip_copied: "Скопировано", clip_saved: "Сохранено", clip_deleted: "Удалено"},
        de: {clip_title: "Aktionen", clip_copy: "Kopieren", clip_paste: "Einfügen", clip_save: "Speichern", clip_delete: "Löschen", clip_copied: "Kopiert", clip_saved: "Gespeichert", clip_deleted: "Gelöscht"},
        kk: {clip_title: "Әрекеттер", clip_copy: "Көшіру", clip_paste: "Кірістіру", clip_save: "Сақтау", clip_delete: "Жою", clip_copied: "Көшірілді", clip_saved: "Сақталды", clip_deleted: "Жойылды"},
        az: {clip_title: "Hərəkətlər", clip_copy: "Kopyala", clip_paste: "Yerləşdir", clip_save: "Yadda saxla", clip_delete: "Sil", clip_copied: "Kopyalandı", clip_saved: "Saxlanıldı", clip_deleted: "Silindi"},
        tr: {clip_title: "Eylemler", clip_copy: "Kopyala", clip_paste: "Yapıştır", clip_save: "Kaydet", clip_delete: "Sil", clip_copied: "Kopyalandı", clip_saved: "Kaydedildi", clip_deleted: "Silindi"},
        ar: {clip_title: "إجراءات", clip_copy: "نسخ", clip_paste: "لصق", clip_save: "حفظ", clip_delete: "حذف", clip_copied: "تم النسخ", clip_saved: "تم الحفظ", clip_deleted: "تم الحذف"},
        it: {clip_title: "Azioni", clip_copy: "Copia", clip_paste: "Incolla", clip_save: "Salva", clip_delete: "Elimina", clip_copied: "Copiato", clip_saved: "Salvato", clip_deleted: "Eliminato"},
        es: {clip_title: "Acciones", clip_copy: "Copiar", clip_paste: "Pegar", clip_save: "Guardar", clip_delete: "Eliminar", clip_copied: "Copiado", clip_saved: "Guardado", clip_deleted: "Eliminado"},
        fr: {clip_title: "Actions", clip_copy: "Copier", clip_paste: "Coller", clip_save: "Enregistrer", clip_delete: "Supprimer", clip_copied: "Copié", clip_saved: "Enregistré", clip_deleted: "Supprimé"},
        pt: {clip_title: "Ações", clip_copy: "Copiar", clip_paste: "Colar", clip_save: "Salvar", clip_delete: "Excluir", clip_copied: "Copiado", clip_saved: "Salvo", clip_deleted: "Excluído"},
        ja: {clip_title: "アクション", clip_copy: "コピー", clip_paste: "貼り付け", clip_save: "保存", clip_delete: "削除", clip_copied: "コピーしました", clip_saved: "保存しました", clip_deleted: "削除しました"},
        zh: {clip_title: "操作", clip_copy: "复制", clip_paste: "粘贴", clip_save: "保存", clip_delete: "删除", clip_copied: "已复制", clip_saved: "已保存", clip_deleted: "已删除"}
    };
    for (let lang in clipDicts) {
        if (window.i18n[lang]) {
            Object.assign(window.i18n[lang], clipDicts[lang]);
        }
    }
                }
            

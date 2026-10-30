// ==========================================
// CLIPBOARD.JS - Полностью автономный модуль (Исправленные селекторы)
// ==========================================

(function initClipboardStyles() {
    if (!document.getElementById('hf-clip-styles')) {
        const style = document.createElement('style');
        style.id = 'hf-clip-styles';
        style.innerHTML = `
            .chat-bubble-wrapper img, .chat-bubble-wrapper video, .chat-bubble-wrapper iframe, .chat-bubble-wrapper a {
                -webkit-touch-callout: none !important;
                -webkit-user-select: none !important;
                user-select: none !important;
                pointer-events: auto; 
            }
            .chat-bubble {
                -webkit-touch-callout: none !important; 
            }
            body.clipboard-open { overflow: hidden; }
        `;
        document.head.appendChild(style);
    }
})();

// Встроенный словарь для 100% автономной мультиязычности
const clipDict = {
    en: { clip_photo: "Photo Action", clip_video: "Video Action", clip_text: "Text Action", clip_loc: "Location", clip_link: "Link", clip_copy: "Copy", clip_paste: "Paste & Send", clip_save: "Save", clip_forward: "Forward", clip_del: "Delete" },
    ru: { clip_photo: "Действие с фото", clip_video: "Действие с видео", clip_text: "Действие с текстом", clip_loc: "Локация", clip_link: "Ссылка", clip_copy: "Скопировать", clip_paste: "Вставить и отправить", clip_save: "Сохранить", clip_forward: "Переслать", clip_del: "Удалить" },
    kk: { clip_photo: "Фото әрекеті", clip_video: "Видео әрекеті", clip_text: "Мәтін әрекеті", clip_loc: "Локация", clip_link: "Сілтеме", clip_copy: "Көшіру", clip_paste: "Кірістіру және жіберу", clip_save: "Сақтау", clip_forward: "Қайта жіберу", clip_del: "Өшіру" },
    az: { clip_photo: "Şəkil əməliyyatı", clip_video: "Video əməliyyatı", clip_text: "Mətn əməliyyatı", clip_loc: "Məkan", clip_link: "Link", clip_copy: "Kopyala", clip_paste: "Yerləşdir və göndər", clip_save: "Yadda saxla", clip_forward: "Yönləndir", clip_del: "Sil" }
    // При необходимости можно добавить остальные языки
};

window.currentClipContent = null;
window.currentClipType = 'text';
window.currentTargetElement = null; 

// Внутренний буфер приложения для медиафайлов
window.internalAppClipboard = { content: null, type: null, blob: null };

// Открытие модального окна и автоматический перевод
window.openClipboardMenu = function(content, type, targetEl) {
    if (typeof window.closeDropdown === 'function') window.closeDropdown();
    
    window.currentClipContent = content;
    window.currentClipType = type;
    window.currentTargetElement = targetEl; // Это наш .chat-bubble-wrapper
    document.body.classList.add('clipboard-open');

    // Определяем язык
    let userLang = localStorage.getItem('hf_app_lang') || window.appLang || 'en';
    if (userLang === 'auto') userLang = window.appLang || 'en';
    const langDict = clipDict[userLang.substring(0,2)] || clipDict['en'];

    let titleText = langDict.clip_text;
    if (type === 'image') titleText = langDict.clip_photo;
    else if (type === 'video') titleText = langDict.clip_video;
    else if (type === 'location') titleText = langDict.clip_loc;
    else if (type === 'link') titleText = langDict.clip_link;

    let modal = document.getElementById('clipboard-modal-clean');
    if (!modal) {
        const modalHTML = `
        <div id="clipboard-modal-clean" onclick="if(event.target===this) window.closeClipboardModal();" style="display:flex; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:99999; justify-content:center; align-items:flex-end; padding-bottom: 2rem;">
            <div class="flex flex-col p-5 w-full max-w-[350px] bg-[#0b141a] border border-[#2a3942] rounded-2xl shadow-2xl">
                <div class="text-center mb-4"><h3 class="text-white font-bold text-sm tracking-wide" id="clip-title-text">${titleText}</h3></div>
                
                <div class="flex flex-col gap-2">
                    <button type="button" onclick="window.execCopyAction()" class="flex items-center justify-center gap-3 w-full py-3 bg-[#182229] hover:bg-[#202c33] text-[#d1d7db] rounded-xl text-sm font-medium transition border border-[#202c33]">
                        <i class="fa-regular fa-copy text-[#8696a0]"></i> <span id="clip-text-copy">${langDict.clip_copy}</span>
                    </button>
                    
                    <button id="clip-paste-btn" type="button" onclick="window.execPasteAction()" class="flex items-center justify-center gap-3 w-full py-3 bg-[#182229] hover:bg-[#202c33] text-[#00a884] rounded-xl text-sm font-bold transition border border-[#00a884]/30">
                        <i class="fa-solid fa-paste"></i> <span id="clip-text-paste">${langDict.clip_paste}</span>
                    </button>
                    
                    <button id="clip-save-btn" type="button" onclick="window.execSaveAction()" class="flex items-center justify-center gap-3 w-full py-3 bg-[#182229] hover:bg-[#202c33] text-[#f59e0b] rounded-xl text-sm font-medium transition border border-[#202c33]">
                        <i class="fa-solid fa-download"></i> <span id="clip-text-save">${langDict.clip_save}</span>
                    </button>
                    
                    <button type="button" onclick="window.execForwardAction()" class="flex items-center justify-center gap-3 w-full py-3 bg-[#182229] hover:bg-[#202c33] text-[#a855f7] rounded-xl text-sm font-medium transition border border-[#202c33]">
                        <i class="fa-solid fa-share"></i> <span id="clip-text-forward">${langDict.clip_forward}</span>
                    </button>
                    
                    <button type="button" onclick="window.execDeleteAction()" class="flex items-center justify-center gap-3 w-full py-3 mt-1 bg-red-950/20 hover:bg-red-950/40 text-[#ef4444] rounded-xl text-sm font-medium transition border border-red-900/30">
                        <i class="fa-regular fa-trash-can"></i> <span id="clip-text-del">${langDict.clip_del}</span>
                    </button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('clipboard-modal-clean');
    } else {
        document.getElementById('clip-title-text').innerText = titleText;
        document.getElementById('clip-text-copy').innerText = langDict.clip_copy;
        document.getElementById('clip-text-paste').innerText = langDict.clip_paste;
        document.getElementById('clip-text-save').innerText = langDict.clip_save;
        document.getElementById('clip-text-forward').innerText = langDict.clip_forward;
        document.getElementById('clip-text-del').innerText = langDict.clip_del;
    }

    document.getElementById('clip-save-btn').style.display = (type === 'image' || type === 'video') ? 'flex' : 'none';
    modal.style.display = 'flex';
};

window.closeClipboardModal = function() {
    const modal = document.getElementById('clipboard-modal-clean');
    if (modal) { modal.style.display = 'none'; document.body.classList.remove('clipboard-open'); }
};

// --- КОПИРОВАНИЕ (В ПАМЯТЬ) ---
window.execCopyAction = async function() {
    if (!window.currentClipContent) return;
    
    window.internalAppClipboard.content = window.currentClipContent;
    window.internalAppClipboard.type = window.currentClipType;
    window.internalAppClipboard.blob = null;

    try {
        if (window.currentClipType === 'image' || window.currentClipType === 'video') {
            const res = await fetch(window.currentClipContent);
            const blob = await res.blob();
            window.internalAppClipboard.blob = blob; 
            
            if (window.currentClipType === 'image' && blob.type.includes('image')) {
                await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            } else {
                await navigator.clipboard.writeText(window.currentClipContent); 
            }
        } else {
            await navigator.clipboard.writeText(window.currentClipContent);
        }
        if (window.showToast) window.showToast("✔", "Copied", "", "");
    } catch (err) {
        const el = document.createElement('textarea');
        el.value = window.currentClipContent;
        document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
        if (window.showToast) window.showToast("✔", "Copied", "", "");
    }
    window.closeClipboardModal();
};

// --- ВСТАВКА (ИСПОЛЬЗУЕТ ВАШУ ФУНКЦИЮ handleMediaUpload) ---
window.execPasteAction = async function() {
    const inputField = document.getElementById('chat-input') || document.getElementById('conf-chat-input') || document.getElementById('voice-chat-input');
    
    // Вставка Фото/Видео - СРАЗУ ИДЕТ ОТПРАВКА!
    if (window.internalAppClipboard.blob && (window.internalAppClipboard.type === 'image' || window.internalAppClipboard.type === 'video')) {
        let extension = window.internalAppClipboard.type === 'video' ? '.mp4' : '.jpg';
        let mime = window.internalAppClipboard.type === 'video' ? 'video/mp4' : 'image/jpeg';
        
        const file = new File([window.internalAppClipboard.blob], `media_copy${extension}`, { type: mime });
        
        if (typeof window.handleMediaUpload === 'function') {
            // Имитируем выбор файла через инпут
            const mockEvent = { target: { files: [file] } };
            window.handleMediaUpload(mockEvent); // Это сразу отправит файл в Firebase
            if (window.showToast) window.showToast("✈️", "Media Sent", "", "");
        }
    } 
    // Вставка текста
    else {
        try {
            const text = await navigator.clipboard.readText();
            if (text && inputField) { inputField.value += text; inputField.focus(); }
        } catch (err) {
            if (window.internalAppClipboard.type === 'text' && inputField) {
                inputField.value += window.internalAppClipboard.content;
                inputField.focus();
            }
        }
    }
    window.closeClipboardModal();
};

window.execSaveAction = async function() {
    if (!window.currentClipContent || (window.currentClipType !== 'image' && window.currentClipType !== 'video')) return;
    try {
        const response = await fetch(window.currentClipContent);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `Saved_${Date.now()}.${window.currentClipType === 'video' ? 'mp4' : 'jpg'}`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
    } catch (e) {
        const a = document.createElement('a');
        a.href = window.currentClipContent; a.download = `Saved_${Date.now()}`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    if (window.showToast) window.showToast("💾", "Saved", "", "");
    window.closeClipboardModal();
};

window.execForwardAction = function() {
    if (window.currentClipContent) {
        window.hfForwardData = { content: window.currentClipContent, type: window.currentClipType, blob: window.internalAppClipboard.blob };
        if (window.showToast) window.showToast("➥", "Select chat", "", "");
    }
    window.closeClipboardModal();
};

// --- УДАЛЕНИЕ (ВИЗУАЛЬНОЕ + FIREBASE НАПРЯМУЮ) ---
window.execDeleteAction = function() {
    if (window.currentTargetElement) { // Это .chat-bubble-wrapper
        const msgId = window.currentTargetElement.getAttribute('data-id');
        
        window.currentTargetElement.style.opacity = '0';
        setTimeout(() => window.currentTargetElement.remove(), 300);
        
        // Удаляем из базы
        if (msgId && window.currentRoomId && typeof firebase !== 'undefined') {
            firebase.database().ref(window.currentRoomId).child(msgId).remove();
        }
    }
    window.closeClipboardModal();
};

// --- УМНЫЙ ПЕРЕХВАТЧИК КЛИКОВ (С учетом ваших классов) ---
function handleContextRequest(e, wrapper, exactTarget) {
    let content = '', type = 'text';

    // Проверяем, на что ИМЕННО нажал пользователь внутри .chat-bubble-wrapper
    if (exactTarget.tagName === 'IMG') { content = exactTarget.src; type = 'image'; } 
    else if (exactTarget.tagName === 'VIDEO') { content = exactTarget.src || exactTarget.querySelector('source')?.src; type = 'video'; } 
    else if (exactTarget.tagName === 'IFRAME') { content = exactTarget.src; type = 'location'; } 
    else if (exactTarget.tagName === 'A') { content = exactTarget.href; type = 'link'; } 
    else {
        const selection = window.getSelection().toString();
        if (selection.trim().length > 0) return; // Разрешить копирование текста стандартными средствами, если он выделен
        content = wrapper.innerText || wrapper.textContent || ''; type = 'text';
        if (!content.trim()) return;
    }

    if (content) {
        // Глушим системное меню
        e.preventDefault();
        e.stopPropagation();
        // Передаем контент и wrapper (для функции удаления)
        window.openClipboardMenu(content, type, wrapper);
    }
}

// Захват ПКМ (Десктоп)
document.addEventListener('contextmenu', function(e) {
    const wrapper = e.target.closest('.chat-bubble-wrapper');
    if (wrapper) { e.preventDefault(); handleContextRequest(e, wrapper, e.target); }
});

// Захват долгого нажатия (Мобильные / Планшеты)
let touchTimer = null;
let touchMoved = false;

document.addEventListener('touchstart', function(e) {
    const wrapper = e.target.closest('.chat-bubble-wrapper');
    if (!wrapper) return;
    
    touchMoved = false;
    touchTimer = setTimeout(() => {
        if (touchMoved) return; 
        if (e.cancelable) e.preventDefault(); // Глушит Google Lens
        handleContextRequest(e, wrapper, e.target);
    }, 450); 
}, { passive: false });

document.addEventListener('touchend', function() { if (touchTimer) clearTimeout(touchTimer); });
document.addEventListener('touchmove', function() { touchMoved = true; if (touchTimer) clearTimeout(touchTimer); });

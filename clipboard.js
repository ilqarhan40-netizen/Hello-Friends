// ==========================================
// CLIPBOARD.JS - Умный буфер обмена 
// (Автономный, конвертация медиа, интеграция с локациями и переводами)
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
            .chat-bubble { -webkit-touch-callout: none !important; }
            body.clipboard-open { overflow: hidden; }
        `;
        document.head.appendChild(style);
    }
})();

// Словари буфера. Они внедрятся в ВАШ глобальный window.i18n
const clipDict = {
    en: { clip_photo: "Photo Action", clip_video: "Video Action", clip_text: "Text Action", clip_loc: "Location", clip_link: "Link", clip_copy: "Copy", clip_paste: "Paste & Send", clip_save: "Save", clip_forward: "Forward", clip_del: "Delete" },
    ru: { clip_photo: "Действие с фото", clip_video: "Действие с видео", clip_text: "Действие с текстом", clip_loc: "Локация", clip_link: "Ссылка", clip_copy: "Скопировать", clip_paste: "Вставить и Отправить", clip_save: "Сохранить", clip_forward: "Переслать", clip_del: "Удалить" },
    kk: { clip_photo: "Фото әрекеті", clip_video: "Видео әрекеті", clip_text: "Мәтін әрекеті", clip_loc: "Локация", clip_link: "Сілтеме", clip_copy: "Көшіру", clip_paste: "Кірістіру және Жіберу", clip_save: "Сақтау", clip_forward: "Қайта жіберу", clip_del: "Өшіру" },
    az: { clip_photo: "Şəkil əməliyyatı", clip_video: "Video əməliyyatı", clip_text: "Mətn əməliyyatı", clip_loc: "Məkan", clip_link: "Link", clip_copy: "Kopyala", clip_paste: "Yerləşdir və Göndər", clip_save: "Yadda saxla", clip_forward: "Yönləndir", clip_del: "Sil" }
};

// Мягко внедряем переводы в ваш основной словарь приложения
const checkClipI18n = setInterval(() => {
    if (window.i18n && window.i18n.en) {
        clearInterval(checkClipI18n);
        for (let sysLang in window.i18n) {
            Object.assign(window.i18n[sysLang], clipDict[sysLang] || clipDict['en']);
        }
        if (typeof window.applyTranslations === 'function') window.applyTranslations();
    }
}, 100);

window.currentClipContent = null;
window.currentClipType = 'text';
window.currentTargetElement = null; 
window.internalAppClipboard = { content: null, type: null, blob: null };

// === ОТКРЫТИЕ МЕНЮ И ЛОКАЛИЗАЦИЯ ===
window.openClipboardMenu = function(content, type, targetEl) {
    if (typeof window.closeDropdown === 'function') window.closeDropdown();
    
    window.currentClipContent = content;
    window.currentClipType = type;
    window.currentTargetElement = targetEl; 
    document.body.classList.add('clipboard-open');

    let titleKey = 'clip_text';
    if (type === 'image') titleKey = 'clip_photo';
    else if (type === 'video') titleKey = 'clip_video';
    else if (type === 'location') titleKey = 'clip_loc';
    else if (type === 'link') titleKey = 'clip_link';

    let modal = document.getElementById('clipboard-modal-clean');
    if (!modal) {
        const modalHTML = `
        <div id="clipboard-modal-clean" onclick="if(event.target===this) window.closeClipboardModal();" style="display:flex; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:99999; justify-content:center; align-items:flex-end; padding-bottom: 2rem;">
            <div class="flex flex-col p-5 w-full max-w-[350px] bg-[#0b141a] border border-[#2a3942] rounded-2xl shadow-2xl">
                <div class="text-center mb-4"><h3 class="text-white font-bold text-sm tracking-wide" id="clip-title-text" data-i18n="${titleKey}">Action</h3></div>
                
                <div class="flex flex-col gap-2">
                    <button type="button" onclick="window.execCopyAction()" class="flex items-center justify-center gap-3 w-full py-3 bg-[#182229] hover:bg-[#202c33] text-[#d1d7db] rounded-xl text-sm font-medium transition border border-[#202c33]">
                        <i class="fa-regular fa-copy text-[#8696a0]"></i> <span data-i18n="clip_copy">Copy</span>
                    </button>
                    
                    <button id="clip-paste-btn" type="button" onclick="window.execPasteAction()" class="flex items-center justify-center gap-3 w-full py-3 bg-[#182229] hover:bg-[#202c33] text-[#00a884] rounded-xl text-sm font-bold transition border border-[#00a884]/30">
                        <i class="fa-solid fa-paste"></i> <span data-i18n="clip_paste">Paste & Send</span>
                    </button>
                    
                    <button id="clip-save-btn" type="button" onclick="window.execSaveAction()" class="flex items-center justify-center gap-3 w-full py-3 bg-[#182229] hover:bg-[#202c33] text-[#f59e0b] rounded-xl text-sm font-medium transition border border-[#202c33]">
                        <i class="fa-solid fa-download"></i> <span data-i18n="clip_save">Save</span>
                    </button>
                    
                    <button type="button" onclick="window.execForwardAction()" class="flex items-center justify-center gap-3 w-full py-3 bg-[#182229] hover:bg-[#202c33] text-[#a855f7] rounded-xl text-sm font-medium transition border border-[#202c33]">
                        <i class="fa-solid fa-share"></i> <span data-i18n="clip_forward">Forward</span>
                    </button>
                    
                    <button type="button" onclick="window.execDeleteAction()" class="flex items-center justify-center gap-3 w-full py-3 mt-1 bg-red-950/20 hover:bg-red-950/40 text-[#ef4444] rounded-xl text-sm font-medium transition border border-red-900/30">
                        <i class="fa-regular fa-trash-can"></i> <span data-i18n="clip_del">Delete</span>
                    </button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('clipboard-modal-clean');
    } else {
        document.getElementById('clip-title-text').setAttribute('data-i18n', titleKey);
    }

    // Триггерим ВАШУ функцию перевода
    if (typeof window.applyTranslations === 'function') window.applyTranslations();
    document.getElementById('clip-save-btn').style.display = (type === 'image' || type === 'video') ? 'flex' : 'none';
    modal.style.display = 'flex';
};

window.closeClipboardModal = function() {
    const modal = document.getElementById('clipboard-modal-clean');
    if (modal) { modal.style.display = 'none'; document.body.classList.remove('clipboard-open'); }
};

// === КОПИРОВАНИЕ (ФОТО КОНВЕРТИРУЕМ В PNG ДЛЯ БУФЕРА СИСТЕМЫ) ===
window.execCopyAction = async function() {
    if (!window.currentClipContent) return;
    window.internalAppClipboard.content = window.currentClipContent;
    window.internalAppClipboard.type = window.currentClipType;
    window.internalAppClipboard.blob = null;

    try {
        if (window.currentClipType === 'image') {
            const res = await fetch(window.currentClipContent);
            const blob = await res.blob();
            window.internalAppClipboard.blob = blob; // Сохранили оригинал для чата
            
            // Чтобы фото вставилось в Telegram/WhatsApp, оно ДОЛЖНО быть PNG
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = window.currentClipContent;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width; canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(pngBlob => {
                    try { navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]); } catch(e){}
                }, 'image/png');
            };
            if (window.showToast) window.showToast("✔", "Copied", "", "");
        } 
        else if (window.currentClipType === 'video') {
            const res = await fetch(window.currentClipContent);
            window.internalAppClipboard.blob = await res.blob(); // Оригинал видео в памяти
            await navigator.clipboard.writeText(window.currentClipContent); // В систему - ссылку
            if (window.showToast) window.showToast("✔", "Copied", "", "");
        } 
        else {
            // Текст, Локация, Ссылка
            await navigator.clipboard.writeText(window.currentClipContent);
            if (window.showToast) window.showToast("✔", "Copied", "", "");
        }
    } catch (err) {
        // Жесткий фолбэк для старых устройств
        const el = document.createElement('textarea'); el.value = window.currentClipContent;
        document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
        if (window.showToast) window.showToast("✔", "Copied link", "", "");
    }
    window.closeClipboardModal();
};

// === ВСТАВКА (И ОТПРАВКА) ===
window.execPasteAction = async function() {
    const inputField = document.getElementById('chat-input') || document.getElementById('conf-chat-input') || document.getElementById('voice-chat-input');
    
    // 1. ВСТАВКА ФОТО/ВИДЕО
    if (window.internalAppClipboard.blob && (window.internalAppClipboard.type === 'image' || window.internalAppClipboard.type === 'video')) {
        let extension = window.internalAppClipboard.type === 'video' ? '.mp4' : '.jpg';
        let mime = window.internalAppClipboard.type === 'video' ? 'video/mp4' : 'image/jpeg';
        const file = new File([window.internalAppClipboard.blob], `media_copy${extension}`, { type: mime });
        
        if (typeof window.handleMediaUpload === 'function') {
            window.handleMediaUpload({ target: { files: [file] } }); // Отправка!
            if (window.showToast) window.showToast("✈️", "Media Sent", "", "");
        }
    } 
    // 2. ВСТАВКА И ОТПРАВКА ЛОКАЦИИ (Имитирует логику chat.js)
    else if (window.internalAppClipboard.type === 'location') {
        if (typeof firebase !== 'undefined' && window.currentRoomId) {
            let isVoiceTab = window.currentIndex === 1;
            let isConfTab = window.currentIndex === 2;
            let targetDbRoom = window.currentRoomId || 'global';
            
            if (isConfTab) targetDbRoom = (window.currentRoomId && window.currentRoomId !== 'global') ? window.currentRoomId : 'video_room_global';
            else if (isVoiceTab) targetDbRoom = (window.currentRoomId && window.currentRoomId !== 'global') ? window.currentRoomId : 'global';

            const url = window.internalAppClipboard.content;
            
            firebase.database().ref(targetDbRoom).push({
                userId: window.myProfileInfo.id || 'guest',
                name: window.myUsername || 'User',
                text: "📍 Shared Location",
                isLocation: true,
                embedLink: url,
                mapLink: url,
                sessionId: window.mySessionId || 'sess',
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                photo: window.myProfileInfo.photo || 'https://ui-avatars.com/api/?name=U',
                flag: window.myProfileInfo.flag || '🌐',
                flagCode: window.myProfileInfo.flagCode || 'un',
                langCode: window.myProfileInfo.langCode || 'en',
                isVoiceRoomMsg: isVoiceTab,
                isConfMsg: isConfTab
            });
            if (window.showToast) window.showToast("📍", "Location Sent", "", "");
        }
    }
    // 3. ВСТАВКА ТЕКСТА
    else {
        try {
            const text = await navigator.clipboard.readText();
            if (text && inputField) { inputField.value += text; inputField.focus(); }
        } catch (err) {
            if (window.internalAppClipboard.type === 'text' && inputField) {
                inputField.value += window.internalAppClipboard.content; inputField.focus();
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
        const a = document.createElement('a'); a.href = window.currentClipContent; a.download = `Saved_${Date.now()}`;
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

window.execDeleteAction = function() {
    if (window.currentTargetElement) {
        const msgId = window.currentTargetElement.getAttribute('data-id');
        window.currentTargetElement.style.opacity = '0';
        setTimeout(() => window.currentTargetElement.remove(), 300);
        
        if (msgId && window.currentRoomId && typeof firebase !== 'undefined') {
            firebase.database().ref(window.currentRoomId).child(msgId).remove();
        }
    }
    window.closeClipboardModal();
};

// === ПЕРЕХВАТЧИК (ТОЧНЫЙ ПОИСК IFRAME) ===
function handleContextRequest(e, wrapper, exactTarget) {
    let content = '', type = 'text';

    // 1. Ищем карту (Iframe), даже если клик был по защитному слою
    const iframe = wrapper.querySelector('iframe');
    
    if (iframe && iframe.src) { content = iframe.src; type = 'location'; } 
    else if (exactTarget.tagName === 'IMG') { content = exactTarget.src; type = 'image'; } 
    else if (exactTarget.tagName === 'VIDEO') { content = exactTarget.src || exactTarget.querySelector('source')?.src; type = 'video'; } 
    else if (exactTarget.tagName === 'A') { content = exactTarget.href; type = 'link'; } 
    else {
        const selection = window.getSelection().toString();
        if (selection.trim().length > 0) return; // Разрешить копирование текста стандартно
        content = wrapper.innerText || wrapper.textContent || ''; type = 'text';
        if (!content.trim()) return;
    }

    if (content) {
        e.preventDefault(); e.stopPropagation();
        window.openClipboardMenu(content, type, wrapper);
    }
}

document.addEventListener('contextmenu', function(e) {
    const wrapper = e.target.closest('.chat-bubble-wrapper');
    if (wrapper) { e.preventDefault(); handleContextRequest(e, wrapper, e.target); }
});

let touchTimer = null; let touchMoved = false;
document.addEventListener('touchstart', function(e) {
    const wrapper = e.target.closest('.chat-bubble-wrapper');
    if (!wrapper) return;
    touchMoved = false;
    touchTimer = setTimeout(() => {
        if (touchMoved) return; 
        if (e.cancelable) e.preventDefault(); 
        handleContextRequest(e, wrapper, e.target);
    }, 450); 
}, { passive: false });

document.addEventListener('touchend', function() { if (touchTimer) clearTimeout(touchTimer); });
document.addEventListener('touchmove', function() { touchMoved = true; if (touchTimer) clearTimeout(touchTimer); });

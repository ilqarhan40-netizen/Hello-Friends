// ==========================================
// CLIPBOARD.JS - Умный буфер обмена 
// (Авто-инжектор кнопок "Три точки", защита от Base64, мультиязычность)
// ==========================================

(function initClipboardStyles() {
    if (!document.getElementById('hf-clip-styles')) {
        const style = document.createElement('style');
        style.id = 'hf-clip-styles';
        style.innerHTML = `
            /* Стили для кнопки "Три точки" под медиа */
            .media-action-bar {
                display: flex;
                justify-content: flex-end;
                padding-top: 6px;
                margin-top: 4px;
                border-top: 1px solid rgba(255,255,255,0.1);
                width: 100%;
            }
            .media-action-btn {
                background: rgba(17, 27, 33, 0.6);
                color: #8696a0;
                border: 1px solid rgba(42, 57, 66, 0.8);
                padding: 4px 14px;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .media-action-btn:hover, .media-action-btn:active { 
                background: #00a884; 
                color: #111b21; 
                border-color: #00a884;
            }
            
            /* Блокировка системных меню */
            .chat-bubble-wrapper img, .chat-bubble-wrapper video, .chat-bubble-wrapper iframe {
                -webkit-touch-callout: none !important;
                -webkit-user-select: none !important;
                user-select: none !important;
                pointer-events: auto; 
            }
            body.clipboard-open { overflow: hidden; }
        `;
        document.head.appendChild(style);
    }
})();

// === СЛОВАРИ ===
const clipDict = {
    en: { clip_photo: "Photo", clip_video: "Video", clip_text: "Text", clip_loc: "Location", clip_link: "Link", clip_copy: "Copy", clip_paste: "Paste & Send", clip_save: "Save", clip_forward: "Forward", clip_del: "Delete" },
    ru: { clip_photo: "Фото", clip_video: "Видео", clip_text: "Текст", clip_loc: "Локация", clip_link: "Ссылка", clip_copy: "Копировать", clip_paste: "Отправить скопированное", clip_save: "Сохранить", clip_forward: "Переслать", clip_del: "Удалить" },
    kk: { clip_photo: "Фото", clip_video: "Видео", clip_text: "Мәтін", clip_loc: "Локация", clip_link: "Сілтеме", clip_copy: "Көшіру", clip_paste: "Кірістіру/Жіберу", clip_save: "Сақтау", clip_forward: "Қайта жіберу", clip_del: "Өшіру" },
    az: { clip_photo: "Şəkil", clip_video: "Video", clip_text: "Mətn", clip_loc: "Məkan", clip_link: "Link", clip_copy: "Kopyala", clip_paste: "Yerləşdir/Göndər", clip_save: "Yadda saxla", clip_forward: "Yönləndir", clip_del: "Sil" }
};

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

// === 1. АВТО-ИНЖЕКТОР КНОПОК "ТРИ ТОЧКИ" (БЕЗ ИЗМЕНЕНИЯ HTML) ===
function injectActionButtons(wrapper) {
    // Если кнопка уже есть, пропускаем
    if (wrapper.querySelector('.media-action-bar')) return;

    const img = wrapper.querySelector('img:not(.w-8):not(.rounded-full)'); 
    const vid = wrapper.querySelector('video');
    const iframe = wrapper.querySelector('iframe');
    const bubble = wrapper.querySelector('.chat-bubble');

    let content = null;
    let type = null;

    if (iframe && iframe.src) { content = iframe.src; type = 'location'; }
    else if (img && img.src && !img.src.includes('ui-avatars') && !img.src.includes('flagcdn')) { content = img.src; type = 'image'; }
    else if (vid) { content = vid.src || vid.querySelector('source')?.src; type = 'video'; }

    // Если это медиа, добавляем панель с 3 точками
    if (content && bubble) {
        const actionBar = document.createElement('div');
        actionBar.className = 'media-action-bar';
        actionBar.innerHTML = `<button class="media-action-btn" title="Actions"><i class="fa-solid fa-ellipsis"></i></button>`;
        
        // Вешаем клик на кнопку
        actionBar.querySelector('button').onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.openClipboardMenu(content, type, wrapper);
        };
        
        bubble.appendChild(actionBar);
    }
}

// Наблюдатель (Observer), который следит за появлением новых сообщений в чате
const chatObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Если это HTML элемент
                if (node.classList.contains('chat-bubble-wrapper')) {
                    injectActionButtons(node);
                } else {
                    const wrappers = node.querySelectorAll('.chat-bubble-wrapper');
                    wrappers.forEach(w => injectActionButtons(w));
                }
            }
        });
    });
});

// Запускаем слежку за главным контейнером
setTimeout(() => {
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
        chatObserver.observe(chatContainer, { childList: true, subtree: true });
        // Проверяем те, что уже загрузились
        document.querySelectorAll('.chat-bubble-wrapper').forEach(w => injectActionButtons(w));
    }
}, 2000);


// === 2. ПЕРЕХВАТЧИК СИСТЕМНОЙ ВСТАВКИ (ЗАЩИТА ОТ КОДОВ В ТЕКСТЕ) ===
document.addEventListener('paste', function(e) {
    let activeInput = document.activeElement;
    if (!activeInput || (activeInput.id !== 'chat-input' && activeInput.id !== 'conf-chat-input' && activeInput.id !== 'voice-chat-input')) return; 

    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
            e.preventDefault();
            const file = items[i].getAsFile();
            if (typeof window.handleMediaUpload === 'function') {
                window.handleMediaUpload({ target: { files: [file] } });
            }
            return;
        }
    }

    let pasteText = (e.clipboardData || window.clipboardData).getData('text');
    if (!pasteText) return;

    // Блокируем страшный код картинки (base64) и превращаем его в файл
    if (pasteText.startsWith('data:image/') || pasteText.startsWith('data:video/')) {
        e.preventDefault();
        fetch(pasteText).then(res => res.blob()).then(blob => {
            const ext = pasteText.startsWith('data:video/') ? '.mp4' : '.jpg';
            const file = new File([blob], `pasted_media${ext}`, { type: blob.type });
            if (typeof window.handleMediaUpload === 'function') {
                window.handleMediaUpload({ target: { files: [file] } });
            }
        });
        return;
    }

    // Вставка карты
    if (window.internalAppClipboard.type === 'location' && (pasteText === window.internalAppClipboard.content || pasteText.includes('google.com/maps/embed'))) {
        e.preventDefault();
        sendLocationDirectly(pasteText);
        window.internalAppClipboard = { content: null, type: null, blob: null };
        return;
    }
});

function sendLocationDirectly(url) {
    if (typeof firebase !== 'undefined' && window.currentRoomId) {
        let isVoiceTab = window.currentIndex === 1;
        let isConfTab = window.currentIndex === 2;
        let targetDbRoom = window.currentRoomId || 'global';
        if (isConfTab) targetDbRoom = (window.currentRoomId && window.currentRoomId !== 'global') ? window.currentRoomId : 'video_room_global';
        else if (isVoiceTab) targetDbRoom = (window.currentRoomId && window.currentRoomId !== 'global') ? window.currentRoomId : 'global';

        firebase.database().ref(targetDbRoom).push({
            userId: window.myProfileInfo.id || 'guest', name: window.myUsername || 'User',
            text: "📍 Shared Location", isLocation: true, embedLink: url, mapLink: url,
            sessionId: window.mySessionId || 'sess', timestamp: firebase.database.ServerValue.TIMESTAMP,
            photo: window.myProfileInfo.photo || 'https://ui-avatars.com/api/?name=U',
            flag: window.myProfileInfo.flag || '🌐', flagCode: window.myProfileInfo.flagCode || 'un',
            langCode: window.myProfileInfo.langCode || 'en', isVoiceRoomMsg: isVoiceTab, isConfMsg: isConfTab
        });
        if (window.showToast) window.showToast("📍", "Location Sent", "", "");
    }
}


// === 3. МЕНЮ ИКОНОК (НОВЫЙ КОМПАКТНЫЙ ДИЗАЙН) ===
window.openClipboardMenu = function(content, type, targetEl) {
    if (typeof window.closeDropdown === 'function') window.closeDropdown();
    window.currentClipContent = content; window.currentClipType = type; window.currentTargetElement = targetEl; 
    document.body.classList.add('clipboard-open');

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
            <div class="flex flex-col p-4 w-full max-w-[350px] bg-[#0b141a] border border-[#2a3942] rounded-3xl shadow-2xl">
                
                <div class="flex justify-between items-center mb-4 px-2 border-b border-[#202c33] pb-2">
                    <h3 class="text-[#00a884] font-bold text-sm tracking-wide uppercase" id="clip-title-text">${titleText}</h3>
                    <i class="fa-solid fa-xmark text-[#8696a0] text-lg cursor-pointer" onclick="window.closeClipboardModal()"></i>
                </div>
                
                <div class="grid grid-cols-4 gap-2 mb-2">
                    <!-- Копировать -->
                    <div class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execCopyAction()">
                        <div class="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-white text-lg border border-[#2a3942]"><i class="fa-regular fa-copy"></i></div>
                        <span class="text-[0.6rem] text-[#8696a0] font-bold text-center leading-tight" id="clip-text-copy">${langDict.clip_copy}</span>
                    </div>
                    <!-- Скачать/Сохранить (Только для медиа) -->
                    <div id="clip-save-btn" class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execSaveAction()">
                        <div class="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-[#f59e0b] text-lg border border-[#2a3942]"><i class="fa-solid fa-download"></i></div>
                        <span class="text-[0.6rem] text-[#8696a0] font-bold text-center leading-tight" id="clip-text-save">${langDict.clip_save}</span>
                    </div>
                    <!-- Переслать -->
                    <div class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execForwardAction()">
                        <div class="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-[#a855f7] text-lg border border-[#2a3942]"><i class="fa-solid fa-share"></i></div>
                        <span class="text-[0.6rem] text-[#8696a0] font-bold text-center leading-tight" id="clip-text-forward">${langDict.clip_forward}</span>
                    </div>
                    <!-- Удалить -->
                    <div class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execDeleteAction()">
                        <div class="w-12 h-12 rounded-full bg-red-950/30 flex items-center justify-center text-[#ef4444] text-lg border border-red-900/40"><i class="fa-regular fa-trash-can"></i></div>
                        <span class="text-[0.6rem] text-[#ef4444] font-bold text-center leading-tight" id="clip-text-del">${langDict.clip_del}</span>
                    </div>
                </div>

                <!-- Вставить (Широкая кнопка внизу) -->
                <button id="clip-paste-btn" type="button" onclick="window.execPasteAction()" class="flex items-center justify-center gap-2 w-full py-3.5 mt-2 bg-[#00a884] active:scale-95 text-[#111b21] rounded-2xl text-sm font-bold transition shadow-[0_0_15px_rgba(0,168,132,0.3)]">
                    <i class="fa-solid fa-paper-plane"></i> <span id="clip-text-paste">${langDict.clip_paste}</span>
                </button>
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
    
    if (typeof window.applyTranslations === 'function') window.applyTranslations();
    document.getElementById('clip-save-btn').style.display = (type === 'image' || type === 'video') ? 'flex' : 'none';
    modal.style.display = 'flex';
};

window.closeClipboardModal = function() {
    const modal = document.getElementById('clipboard-modal-clean');
    if (modal) { modal.style.display = 'none'; document.body.classList.remove('clipboard-open'); }
};

// === 4. ДЕЙСТВИЯ ===
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
            
            if (window.currentClipType === 'image') {
                try {
                    const img = new Image(); img.crossOrigin = "Anonymous"; img.src = window.currentClipContent;
                    img.onload = () => {
                        const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
                        canvas.getContext('2d').drawImage(img, 0, 0);
                        canvas.toBlob(pngBlob => { navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]).catch(e=>{}); }, 'image/png');
                    };
                } catch(e) {}
            } else {
                if (!window.currentClipContent.startsWith('data:')) await navigator.clipboard.writeText(window.currentClipContent);
            }
        } else {
            await navigator.clipboard.writeText(window.currentClipContent);
        }
        if (window.showToast) window.showToast("✔", "Copied", "", "");
    } catch (err) {
        if (!window.currentClipContent.startsWith('data:')) {
            const el = document.createElement('textarea'); el.value = window.currentClipContent;
            document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
        }
    }
    window.closeClipboardModal();
};

window.execPasteAction = async function() {
    const inputField = document.getElementById('chat-input') || document.getElementById('conf-chat-input') || document.getElementById('voice-chat-input');
    
    if (window.internalAppClipboard.blob && (window.internalAppClipboard.type === 'image' || window.internalAppClipboard.type === 'video')) {
        let extension = window.internalAppClipboard.type === 'video' ? '.mp4' : '.jpg';
        let mime = window.internalAppClipboard.type === 'video' ? 'video/mp4' : 'image/jpeg';
        const file = new File([window.internalAppClipboard.blob], `media_copy${extension}`, { type: mime });
        
        if (typeof window.handleMediaUpload === 'function') {
            window.handleMediaUpload({ target: { files: [file] } });
            if (window.showToast) window.showToast("✈️", "Sent", "", "");
        }
    } else if (window.internalAppClipboard.type === 'location') {
        sendLocationDirectly(window.internalAppClipboard.content);
    } else {
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
        const a = document.createElement('a'); a.href = url; a.download = `Saved_${Date.now()}.${window.currentClipType === 'video' ? 'mp4' : 'jpg'}`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
    } catch (e) {}
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

// === 5. ДОЛГИЙ ТАП (ОСТАВЛЯЕМ ТОЛЬКО ДЛЯ ОБЫЧНОГО ТЕКСТА) ===
function handleTextContextRequest(e, wrapper) {
    // Если внутри есть медиа - игнорируем (для них теперь кнопка 3 точки)
    if (wrapper.querySelector('img:not(.w-8)') || wrapper.querySelector('video') || wrapper.querySelector('iframe')) return;
    
    const selection = window.getSelection().toString();
    if (selection.trim().length > 0) return; // Разрешить копирование текста стандартно
    
    let content = wrapper.innerText || wrapper.textContent || ''; 
    if (!content.trim()) return;

    e.preventDefault(); e.stopPropagation();
    window.openClipboardMenu(content, 'text', wrapper);
}

let touchTimer = null; let touchMoved = false;
document.addEventListener('touchstart', function(e) {
    const wrapper = e.target.closest('.chat-bubble-wrapper');
    if (!wrapper) return;
    touchMoved = false;
    touchTimer = setTimeout(() => {
        if (touchMoved) return; 
        handleTextContextRequest(e, wrapper);
    }, 500); 
}, { passive: false });

document.addEventListener('touchend', function() { if (touchTimer) clearTimeout(touchTimer); });
document.addEventListener('touchmove', function() { touchMoved = true; if (touchTimer) clearTimeout(touchTimer); });

document.addEventListener('contextmenu', function(e) {
    const wrapper = e.target.closest('.chat-bubble-wrapper');
    if (wrapper) { 
        if (!wrapper.querySelector('img:not(.w-8)') && !wrapper.querySelector('video') && !wrapper.querySelector('iframe')) {
            e.preventDefault(); handleTextContextRequest(e, wrapper); 
        }
    }
});

// ==========================================
// CLIPBOARD.JS - Абсолютно автономный Умный Буфер Обмена
// (УБИЙЦА GOOGLE LENS, Прямая отправка медиа, 100% удаление)
// ==========================================

(function initClipboardStyles() {
    if (!document.getElementById('hf-clip-styles')) {
        const style = document.createElement('style'); style.id = 'hf-clip-styles';
        style.innerHTML = `
            /* НАМЕРТВО ГЛУШИМ GOOGLE LENS И СИСТЕМНЫЕ МЕНЮ */
            img, video, iframe, a {
                -webkit-touch-callout: none !important;
                -webkit-user-drag: none !important;
                -khtml-user-drag: none !important;
                -moz-user-drag: none !important;
                -o-user-drag: none !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
                pointer-events: auto;
            }
            .chat-bubble-wrapper, .chat-bubble { 
                -webkit-touch-callout: none !important;
                -webkit-tap-highlight-color: transparent !important;
            }
            
            /* СТИЛИ НАШЕГО МЕНЮ "ТРИ ТОЧКИ" */
            .media-action-bar { display: flex; justify-content: flex-end; padding-top: 6px; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.1); width: 100%; }
            .media-action-btn { background: rgba(17, 27, 33, 0.6); color: #8696a0; border: 1px solid rgba(42, 57, 66, 0.8); padding: 4px 14px; border-radius: 12px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
            .media-action-btn:hover, .media-action-btn:active { background: #00a884; color: #111b21; border-color: #00a884; }
            body.clipboard-open { overflow: hidden; }
        `;
        document.head.appendChild(style);
    }
})();

// === ТОТАЛЬНЫЙ УБИЙЦА СИСТЕМНЫХ ФУНКЦИЙ GOOGLE ===
// Блокируем вызов системных контекстных меню на самой ранней стадии
window.addEventListener('contextmenu', function(e) {
    if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO' || e.target.tagName === 'IFRAME') {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
    // Также блокируем на всем сообщении чата
    if (e.target.closest('.chat-bubble-wrapper')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
}, { capture: true, passive: false });

// Блокируем системное перетаскивание картинок
window.addEventListener('dragstart', function(e) {
    if (e.target.tagName === 'IMG' || e.target.tagName === 'A' || e.target.tagName === 'VIDEO') {
        e.preventDefault();
        return false;
    }
}, { capture: true });


// === СЛОВАРИ (13 ЯЗЫКОВ) ===
const clipDict = {
    en: { clip_photo: "Photo", clip_video: "Video", clip_text: "Text", clip_loc: "Location", clip_link: "Link", clip_copy: "Copy", clip_paste: "Paste & Send", clip_save: "Save", clip_forward: "Forward", clip_del: "Delete" },
    ru: { clip_photo: "Фото", clip_video: "Видео", clip_text: "Текст", clip_loc: "Локация", clip_link: "Ссылка", clip_copy: "Копировать", clip_paste: "Вставить и Отправить", clip_save: "Сохранить", clip_forward: "Переслать", clip_del: "Удалить" },
    kk: { clip_photo: "Фото", clip_video: "Видео", clip_text: "Мәтін", clip_loc: "Локация", clip_link: "Сілтеме", clip_copy: "Көшіру", clip_paste: "Кірістіру/Жіберу", clip_save: "Сақтау", clip_forward: "Қайта жіберу", clip_del: "Өшіру" },
    az: { clip_photo: "Şəkil", clip_video: "Video", clip_text: "Mətn", clip_loc: "Məkan", clip_link: "Link", clip_copy: "Kopyala", clip_paste: "Yerləşdir/Göndər", clip_save: "Yadda saxla", clip_forward: "Yönləndir", clip_del: "Sil" }
};
const checkClipI18n = setInterval(() => {
    if (window.i18n && window.i18n.en) {
        clearInterval(checkClipI18n);
        for (let sysLang in window.i18n) Object.assign(window.i18n[sysLang], clipDict[sysLang] || clipDict['en']);
        if (typeof window.applyTranslations === 'function') window.applyTranslations();
    }
}, 100);

window.currentClipContent = null; window.currentClipType = 'text'; window.currentTargetElement = null; 
window.internalAppClipboard = { content: null, type: null };


// === МАГИЯ 1: ИНЖЕКТОР ТОЧНЫХ FIREBASE ID ===
function initClipboardPatches() {
    if (typeof window.handleNewMessage === 'function' && !window.handleNewMessage.clipPatched) {
        const originalHandle = window.handleNewMessage;
        window.handleNewMessage = async function(snapshot) {
            await originalHandle(snapshot);
            document.querySelectorAll('.chat-bubble-wrapper:not([data-firebase-id])').forEach(w => w.setAttribute('data-firebase-id', snapshot.key));
        };
        window.handleNewMessage.clipPatched = true;
    }
}
setInterval(initClipboardPatches, 500);

// === МАГИЯ 2: СИНХРОНИЗАТОР УДАЛЕНИЙ FIREBASE ===
let currentTrackedRoom = null;
let removeListener = null;
setInterval(() => {
    let activeRoom = window.currentRoomId;
    if (window.currentIndex === 2 && activeRoom === 'global') activeRoom = 'video_room_global';

    if (activeRoom && activeRoom !== currentTrackedRoom && typeof firebase !== 'undefined') {
        if (currentTrackedRoom && removeListener) firebase.database().ref(currentTrackedRoom).off('child_removed', removeListener);
        currentTrackedRoom = activeRoom;
        
        removeListener = firebase.database().ref(currentTrackedRoom).on('child_removed', (snapshot) => {
            const domElement = document.querySelector(`[data-firebase-id="${snapshot.key}"]`);
            if (domElement) {
                const group = domElement.closest('.flex.flex-col.w-full.mt-3.mb-2');
                if (group) group.remove(); else domElement.remove();
            }
        });
    }
}, 1000);


// === ПОИСКОВИК МЕДИА ===
function getMediaFromWrapper(wrapper) {
    const bubble = wrapper.querySelector('.chat-bubble'); if (!bubble) return { content: null, type: 'text' };
    const vid = bubble.querySelector('video'); const iframe = bubble.querySelector('iframe');
    const img = bubble.querySelector('img:not(.w-8):not(.rounded-full)'); 
    if (vid) return { content: vid.src || vid.querySelector('source')?.src, type: 'video' };
    else if (iframe && iframe.src) return { content: iframe.src, type: 'location' };
    else if (img && img.src && !img.src.includes('ui-avatars') && !img.src.includes('flagcdn')) return { content: img.src, type: 'image' };
    return { content: null, type: 'text' };
}

// === АВТО-ИНЖЕКТОР КНОПОК "ТРИ ТОЧКИ" ===
function injectActionButtons(wrapper) {
    if (wrapper.querySelector('.media-action-bar')) return;
    const bubble = wrapper.querySelector('.chat-bubble'); if (!bubble) return;
    const media = getMediaFromWrapper(wrapper);
    if (media.content && media.type !== 'text') {
        const actionBar = document.createElement('div'); actionBar.className = 'media-action-bar';
        actionBar.innerHTML = `<button class="media-action-btn" title="Actions"><i class="fa-solid fa-ellipsis"></i></button>`;
        actionBar.querySelector('button').onclick = (e) => { 
            e.preventDefault(); e.stopPropagation(); 
            window.openClipboardMenu(media.content, media.type, wrapper); 
        };
        bubble.appendChild(actionBar);
    }
}
const chatObserver = new MutationObserver((m) => { m.forEach((mut) => { mut.addedNodes.forEach((node) => { if (node.nodeType === 1) { if (node.classList.contains('chat-bubble-wrapper')) injectActionButtons(node); else node.querySelectorAll('.chat-bubble-wrapper').forEach(w => injectActionButtons(w)); } }); }); });
setTimeout(() => { const chatContainer = document.getElementById('chat-messages'); if (chatContainer) { chatObserver.observe(chatContainer, { childList: true, subtree: true }); document.querySelectorAll('.chat-bubble-wrapper').forEach(w => injectActionButtons(w)); } }, 2000);


// === ТОТАЛЬНЫЙ ПЕРЕХВАТЧИК ВСТАВКИ С КЛАВИАТУРЫ ===
document.addEventListener('paste', function(e) {
    let activeInput = document.activeElement;
    if (!activeInput || (activeInput.id !== 'chat-input' && activeInput.id !== 'conf-chat-input' && activeInput.id !== 'voice-chat-input')) return; 

    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
            e.preventDefault();
            if (typeof window.handleMediaUpload === 'function') window.handleMediaUpload({ target: { files: [items[i].getAsFile()] } });
            return;
        }
    }

    let pasteText = (e.clipboardData || window.clipboardData).getData('text');
    if (!pasteText) return;

    // ЕСЛИ ВСТАВЛЯЮТ ГИГАНТСКИЙ КОД (BASE64) КАРТИНКИ
    if (pasteText.startsWith('data:image/') || pasteText.startsWith('data:video/')) {
        e.preventDefault(); 
        const isVideo = pasteText.startsWith('data:video/');
        sendMediaDirectly(pasteText, isVideo ? 'video' : 'image');
        return; 
    }
    
    // Вставка локации
    if (window.internalAppClipboard.type === 'location' && pasteText && (pasteText === window.internalAppClipboard.content || pasteText.includes('google.com/maps/embed'))) {
        e.preventDefault(); sendLocationDirectly(pasteText); window.internalAppClipboard = { content: null, type: null };
    }
});


// === ФУНКЦИИ ПРЯМОЙ МОМЕНТАЛЬНОЙ ОТПРАВКИ ===
function sendLocationDirectly(url) {
    if (typeof firebase !== 'undefined' && window.currentRoomId) {
        let isVoiceTab = window.currentIndex === 1; let isConfTab = window.currentIndex === 2;
        let targetDbRoom = window.currentRoomId || 'global';
        if (isConfTab && targetDbRoom === 'global') targetDbRoom = 'video_room_global';

        firebase.database().ref(targetDbRoom).push({
            userId: window.myProfileInfo.id || 'guest', name: window.myUsername || 'User',
            text: "📍 Shared Location", isLocation: true, embedLink: url, mapLink: url,
            sessionId: window.mySessionId || 'sess', timestamp: firebase.database.ServerValue.TIMESTAMP,
            photo: window.myProfileInfo.photo || 'https://ui-avatars.com/api/?name=U', flag: window.myProfileInfo.flag || '🌐', flagCode: window.myProfileInfo.flagCode || 'un', langCode: window.myProfileInfo.langCode || 'en', isVoiceRoomMsg: isVoiceTab, isConfMsg: isConfTab
        });
        if (window.showToast) window.showToast("📍", "Location Sent", "", "");
    }
}

function sendMediaDirectly(mediaUrl, type) {
    if (typeof firebase !== 'undefined' && window.currentRoomId) {
        let isVoiceTab = window.currentIndex === 1; let isConfTab = window.currentIndex === 2;
        let targetDbRoom = window.currentRoomId || 'global';
        if (isConfTab && targetDbRoom === 'global') targetDbRoom = 'video_room_global';

        firebase.database().ref(targetDbRoom).push({
            userId: window.myProfileInfo.id || 'guest', name: window.myUsername || 'User',
            text: type === 'video' ? "📹 Video" : "🖼️ Photo", 
            mediaUrl: mediaUrl, 
            mediaType: type,
            sessionId: window.mySessionId || 'sess', timestamp: firebase.database.ServerValue.TIMESTAMP,
            photo: window.myProfileInfo.photo || 'https://ui-avatars.com/api/?name=U', flag: window.myProfileInfo.flag || '🌐', flagCode: window.myProfileInfo.flagCode || 'un', langCode: window.myProfileInfo.langCode || 'en', isVoiceRoomMsg: isVoiceTab, isConfMsg: isConfTab
        });
        if (window.showToast) window.showToast("✈️", "Media Sent", "", "");
    }
}


// === МЕНЮ "ТРИ ТОЧКИ" ===
window.openClipboardMenu = function(content, type, targetEl) {
    if (typeof window.closeDropdown === 'function') window.closeDropdown();
    window.currentClipContent = content; window.currentClipType = type; window.currentTargetElement = targetEl; 
    document.body.classList.add('clipboard-open');

    let userLang = localStorage.getItem('hf_app_lang') || window.appLang || 'en';
    if (userLang === 'auto') userLang = window.appLang || 'en';
    const langDict = clipDict[userLang.substring(0,2)] || clipDict['en'];

    let titleText = langDict.clip_text;
    if (type === 'image') titleText = langDict.clip_photo; else if (type === 'video') titleText = langDict.clip_video; else if (type === 'location') titleText = langDict.clip_loc;

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
                    <div class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execCopyAction()"><div class="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-white text-lg border border-[#2a3942]"><i class="fa-regular fa-copy"></i></div><span class="text-[0.6rem] text-[#8696a0] font-bold text-center leading-tight" id="clip-text-copy">${langDict.clip_copy}</span></div>
                    <div id="clip-save-btn" class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execSaveAction()"><div class="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-[#f59e0b] text-lg border border-[#2a3942]"><i class="fa-solid fa-download"></i></div><span class="text-[0.6rem] text-[#8696a0] font-bold text-center leading-tight" id="clip-text-save">${langDict.clip_save}</span></div>
                    <div class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execForwardAction()"><div class="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-[#a855f7] text-lg border border-[#2a3942]"><i class="fa-solid fa-share"></i></div><span class="text-[0.6rem] text-[#8696a0] font-bold text-center leading-tight" id="clip-text-forward">${langDict.clip_forward}</span></div>
                    <div class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execDeleteAction()"><div class="w-12 h-12 rounded-full bg-red-950/30 flex items-center justify-center text-[#ef4444] text-lg border border-red-900/40"><i class="fa-regular fa-trash-can"></i></div><span class="text-[0.6rem] text-[#ef4444] font-bold text-center leading-tight" id="clip-text-del">${langDict.clip_del}</span></div>
                </div>
                <button id="clip-paste-btn" type="button" onclick="window.execPasteAction()" class="flex items-center justify-center gap-2 w-full py-3.5 mt-2 bg-[#00a884] active:scale-95 text-[#111b21] rounded-2xl text-sm font-bold transition shadow-[0_0_15px_rgba(0,168,132,0.3)]"><i class="fa-solid fa-paper-plane"></i> <span id="clip-text-paste">${langDict.clip_paste}</span></button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML); modal = document.getElementById('clipboard-modal-clean');
    } else {
        document.getElementById('clip-title-text').innerText = titleText; document.getElementById('clip-text-copy').innerText = langDict.clip_copy; document.getElementById('clip-text-paste').innerText = langDict.clip_paste; document.getElementById('clip-text-save').innerText = langDict.clip_save; document.getElementById('clip-text-forward').innerText = langDict.clip_forward; document.getElementById('clip-text-del').innerText = langDict.clip_del;
    }
    
    if (typeof window.applyTranslations === 'function') window.applyTranslations();
    document.getElementById('clip-save-btn').style.display = (type === 'image' || type === 'video') ? 'flex' : 'none';
    modal.style.display = 'flex';
};

window.closeClipboardModal = function() {
    const modal = document.getElementById('clipboard-modal-clean');
    if (modal) { modal.style.display = 'none'; document.body.classList.remove('clipboard-open'); }
};

// === ДЕЙСТВИЯ КНОПОК ===
window.execCopyAction = async function() {
    if (!window.currentClipContent) return;
    window.internalAppClipboard.content = window.currentClipContent; window.internalAppClipboard.type = window.currentClipType;

    try {
        if (window.currentClipType === 'text' || window.currentClipType === 'link') {
            await navigator.clipboard.writeText(window.currentClipContent);
        }
        if (window.showToast) window.showToast("✔", "Copied", "", "");
    } catch (err) {}
    window.closeClipboardModal();
};

window.execPasteAction = async function() {
    const inputField = document.getElementById('chat-input') || document.getElementById('conf-chat-input') || document.getElementById('voice-chat-input');
    
    // МГНОВЕННАЯ ПРЯМАЯ ОТПРАВКА БЕЗ ТОРМОЗОВ И ФАЙЛОВ!
    if (window.internalAppClipboard.type === 'image' || window.internalAppClipboard.type === 'video') {
        sendMediaDirectly(window.internalAppClipboard.content, window.internalAppClipboard.type);
        window.internalAppClipboard = { content: null, type: null }; 
    } 
    else if (window.internalAppClipboard.type === 'location') {
        sendLocationDirectly(window.internalAppClipboard.content);
        window.internalAppClipboard = { content: null, type: null }; 
    } 
    else {
        try {
            const text = await navigator.clipboard.readText();
            if (text && inputField && !text.startsWith('data:')) { inputField.value += text; inputField.focus(); }
        } catch (err) {
            if (window.internalAppClipboard.type === 'text' && inputField) { inputField.value += window.internalAppClipboard.content; inputField.focus(); }
        }
    }
    window.closeClipboardModal();
};

window.execSaveAction = async function() {
    if (!window.currentClipContent || (window.currentClipType !== 'image' && window.currentClipType !== 'video')) return;
    try {
        const a = document.createElement('a'); a.href = window.currentClipContent; a.download = `Saved_${Date.now()}.${window.currentClipType === 'video' ? 'mp4' : 'jpg'}`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e) {}
    if (window.showToast) window.showToast("💾", "Saved", "", "");
    window.closeClipboardModal();
};

// Функция пересылки: запоминает медиа и просит перейти в другой чат
window.execForwardAction = function() {
    if (window.currentClipContent) {
        window.internalAppClipboard.content = window.currentClipContent; 
        window.internalAppClipboard.type = window.currentClipType;
        if (window.showToast) window.showToast("➥", "Go to chat and tap Paste", "", "");
    }
    window.closeClipboardModal();
};

// === 100% НАДЁЖНОЕ УДАЛЕНИЕ ИЗ FIREBASE ===
window.execDeleteAction = function() {
    if (!window.currentTargetElement) return;

    const msgId = window.currentTargetElement.getAttribute('data-firebase-id');
    let targetDbRoom = window.currentRoomId;
    if (window.currentIndex === 2 && targetDbRoom === 'global') targetDbRoom = 'video_room_global';

    if (msgId && typeof firebase !== 'undefined') {
        firebase.database().ref(targetDbRoom).child(msgId).remove();
    } else if (typeof firebase !== 'undefined') {
        // Запасной план поиска
        firebase.database().ref(targetDbRoom).once('value', (snapshot) => {
            let targetRef = null;
            snapshot.forEach((child) => {
                const data = child.val();
                if (window.currentClipType === 'image' || window.currentClipType === 'video') {
                    if (data.mediaUrl && String(data.mediaUrl).substring(0, 100) === String(window.currentClipContent).substring(0, 100)) targetRef = child.ref;
                } else if (window.currentClipType === 'location') {
                    if (data.embedLink === window.currentClipContent) targetRef = child.ref;
                } else {
                    if (data.originalText === window.currentClipContent || data.text === window.currentClipContent) targetRef = child.ref;
                }
            });
            if (targetRef) targetRef.remove();
        });
    }

    window.currentTargetElement.style.opacity = '0';
    setTimeout(() => {
        const group = window.currentTargetElement.closest('.flex.flex-col.w-full.mt-3.mb-2');
        if (group) group.remove(); else window.currentTargetElement.remove();
    }, 300);
    
    window.closeClipboardModal();
};

// === ДОЛГИЙ ТАП (ТОЛЬКО ДЛЯ ОБЫЧНОГО ТЕКСТА) ===
// Мы заблокировали Google Lens, поэтому здесь просто вызываем наше меню для текста
function handleTextContextRequest(e, wrapper) {
    if (wrapper.querySelector('.chat-bubble img') || wrapper.querySelector('.chat-bubble video') || wrapper.querySelector('.chat-bubble iframe')) return;
    const selection = window.getSelection().toString();
    if (selection.trim().length > 0) return; 
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
        if (e.cancelable) e.preventDefault(); 
        handleTextContextRequest(e, wrapper);
    }, 350); 
}, { passive: false });

document.addEventListener('touchend', function() { if (touchTimer) clearTimeout(touchTimer); });
document.addEventListener('touchmove', function() { touchMoved = true; if (touchTimer) clearTimeout(touchTimer); }, { passive: true });

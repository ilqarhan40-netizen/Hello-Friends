// ==========================================
// CLIPBOARD.JS - Абсолютно автономный Умный Буфер Обмена
// (Глобальная синхронизация удалений Firebase, Блокировка текстового копирования медиа)
// ==========================================

(function initClipboardStyles() {
    if (!document.getElementById('hf-clip-styles')) {
        const style = document.createElement('style'); style.id = 'hf-clip-styles';
        style.innerHTML = `
            .media-action-bar { display: flex; justify-content: flex-end; padding-top: 6px; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.1); width: 100%; }
            .media-action-btn { background: rgba(17, 27, 33, 0.6); color: #8696a0; border: 1px solid rgba(42, 57, 66, 0.8); padding: 4px 14px; border-radius: 12px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
            .media-action-btn:hover, .media-action-btn:active { background: #00a884; color: #111b21; border-color: #00a884; }
            img, video, iframe { -webkit-touch-callout: none !important; -webkit-user-drag: none !important; -webkit-user-select: none !important; user-select: none !important; pointer-events: auto; }
            .chat-bubble-wrapper { -webkit-touch-callout: none !important; }
            body.clipboard-open { overflow: hidden; }
        `;
        document.head.appendChild(style);
    }
})();

// === СЛОВАРИ (13 ЯЗЫКОВ + АВТОМАШТАБИРОВАНИЕ) ===
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
window.internalAppClipboard = { content: null, type: null, blob: null };


// === МАГИЯ 1: ИНЖЕКТОР ТОЧНЫХ FIREBASE ID (БЕЗ ПРАВОК CHAT.JS) ===
function initClipboardPatches() {
    if (typeof window.handleNewMessage === 'function' && !window.handleNewMessage.clipPatched) {
        const originalHandle = window.handleNewMessage;
        window.handleNewMessage = async function(snapshot) {
            await originalHandle(snapshot);
            // Присваиваем сообщениям их точный ID из базы для 100% надёжного удаления
            document.querySelectorAll('.chat-bubble-wrapper:not([data-firebase-id])').forEach(w => w.setAttribute('data-firebase-id', snapshot.key));
        };
        window.handleNewMessage.clipPatched = true;
    }
}
setInterval(initClipboardPatches, 500);

// === МАГИЯ 2: СИНХРОНИЗАТОР УДАЛЕНИЙ FIREBASE ===
// Если кто-то удалил сообщение, оно мгновенно исчезает у всех в комнате!
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


// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
function base64ToBlob(base64, mime) {
    const commaIndex = base64.indexOf(','); const b64Data = commaIndex !== -1 ? base64.slice(commaIndex + 1) : base64;
    const byteCharacters = atob(b64Data); const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512); const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
        byteArrays.push(new Uint8Array(byteNumbers));
    }
    return new Blob(byteArrays, { type: mime });
}

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
        actionBar.querySelector('button').onclick = (e) => { e.preventDefault(); e.stopPropagation(); window.openClipboardMenu(media.content, media.type, wrapper); };
        bubble.appendChild(actionBar);
    }
}
const chatObserver = new MutationObserver((m) => { m.forEach((mut) => { mut.addedNodes.forEach((node) => { if (node.nodeType === 1) { if (node.classList.contains('chat-bubble-wrapper')) injectActionButtons(node); else node.querySelectorAll('.chat-bubble-wrapper').forEach(w => injectActionButtons(w)); } }); }); });
setTimeout(() => { const chatContainer = document.getElementById('chat-messages'); if (chatContainer) { chatObserver.observe(chatContainer, { childList: true, subtree: true }); document.querySelectorAll('.chat-bubble-wrapper').forEach(w => injectActionButtons(w)); } }, 2000);


// === ТОТАЛЬНЫЙ ПЕРЕХВАТЧИК ВСТАВКИ С КЛАВИАТУРЫ ===
document.addEventListener('paste', function(e) {
    let activeInput = document.activeElement;
    if (!activeInput || (activeInput.id !== 'chat-input' && activeInput.id !== 'conf-chat-input' && activeInput.id !== 'voice-chat-input')) return; 

    let pasteText = (e.clipboardData || window.clipboardData).getData('text');
    if (!pasteText) return;

    if (pasteText.startsWith('data:image/') || pasteText.startsWith('data:video/')) {
        e.preventDefault(); 
        const mimeMatch = pasteText.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,/);
        const mime = mimeMatch ? mimeMatch[1] : (pasteText.startsWith('data:video/') ? 'video/mp4' : 'image/jpeg');
        const file = new File([base64ToBlob(pasteText, mime)], `pasted_media${mime.includes('video') ? '.mp4' : '.jpg'}`, { type: mime });
        if (typeof window.handleMediaUpload === 'function') window.handleMediaUpload({ target: { files: [file] } });
        return; 
    }
    if (window.internalAppClipboard.type === 'location' && pasteText && (pasteText === window.internalAppClipboard.content || pasteText.includes('google.com/maps/embed'))) {
        e.preventDefault(); sendLocationDirectly(pasteText); window.internalAppClipboard = { content: null, type: null, blob: null };
    }
});

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


// === 4. ДЕЙСТВИЯ (БЕЗ ТЕКСТА ДЛЯ МЕДИА) ===
window.execCopyAction = async function() {
    if (!window.currentClipContent) return;
    window.internalAppClipboard.content = window.currentClipContent; window.internalAppClipboard.type = window.currentClipType; window.internalAppClipboard.blob = null;

    try {
        if (window.currentClipType === 'image' || window.currentClipType === 'video') {
            if (window.currentClipContent.startsWith('data:')) {
                const mimeMatch = window.currentClipContent.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,/);
                const mime = mimeMatch ? mimeMatch[1] : (window.currentClipType === 'video' ? 'video/mp4' : 'image/jpeg');
                window.internalAppClipboard.blob = base64ToBlob(window.currentClipContent, mime);
            } else {
                const res = await fetch(window.currentClipContent); window.internalAppClipboard.blob = await res.blob(); 
            }

            // Пытаемся засунуть PNG в буфер. Если не выйдет - не страшно, оно есть в памяти для зелёной кнопки.
            if (window.currentClipType === 'image') {
                try {
                    const img = new Image(); img.crossOrigin = "Anonymous"; img.src = window.currentClipContent;
                    img.onload = () => {
                        const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
                        canvas.getContext('2d').drawImage(img, 0, 0);
                        canvas.toBlob(pngBlob => { navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]).catch(e=>{}); }, 'image/png');
                    };
                } catch(e) {}
            }
            // ВАЖНО: Мы больше НЕ копируем ссылку медиа в текстовый буфер.
        } else {
            // Обычный текст копируется текстом
            await navigator.clipboard.writeText(window.currentClipContent);
        }
        if (window.showToast) window.showToast("✔", "Copied", "", "");
    } catch (err) {
        if (window.currentClipType === 'text') {
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

window.execForwardAction = function() {
    if (window.currentClipContent) {
        window.hfForwardData = { content: window.currentClipContent, type: window.currentClipType, blob: window.internalAppClipboard.blob };
        if (window.showToast) window.showToast("➥", "Select chat", "", "");
    }
    window.closeClipboardModal();
};


// === 100% НАДЁЖНОЕ УДАЛЕНИЕ ИЗ FIREBASE ===
window.execDeleteAction = function() {
    if (!window.currentTargetElement) return;

    // Сначала пытаемся удалить по точному ключу, который мы внедрили через авто-инжектор
    const msgId = window.currentTargetElement.getAttribute('data-firebase-id');
    let targetDbRoom = window.currentRoomId;
    if (window.currentIndex === 2 && targetDbRoom === 'global') targetDbRoom = 'video_room_global';

    if (msgId && typeof firebase !== 'undefined') {
        firebase.database().ref(targetDbRoom).child(msgId).remove();
    } else if (typeof firebase !== 'undefined') {
        // Запасной план (Умное удаление), если это старое сообщение без ключа
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

    // Визуальное удаление для того, кто нажал (Остальные увидят удаление благодаря синхронизатору)
    window.currentTargetElement.style.opacity = '0';
    setTimeout(() => {
        const group = window.currentTargetElement.closest('.flex.flex-col.w-full.mt-3.mb-2');
        if (group) group.remove(); else window.currentTargetElement.remove();
    }, 300);
    
    window.closeClipboardModal();
};


// === ДОЛГИЙ ТАП (ТОЛЬКО ДЛЯ ОБЫЧНОГО ТЕКСТА) ===
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
        if (e.cancelable && !wrapper.querySelector('.chat-bubble img') && !wrapper.querySelector('.chat-bubble video') && !wrapper.querySelector('.chat-bubble iframe')) {
            e.preventDefault(); 
        }
        handleTextContextRequest(e, wrapper);
    }, 350); 
}, { passive: false });

document.addEventListener('touchend', function() { if (touchTimer) clearTimeout(touchTimer); });
document.addEventListener('touchmove', function() { touchMoved = true; if (touchTimer) clearTimeout(touchTimer); }, { passive: true });

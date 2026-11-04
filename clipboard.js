// ==========================================
// CLIPBOARD.JS - ФИНАЛЬНАЯ МЕХАНИКА (Файлы, Удаление, Анти-кэш)
// ==========================================

(function initClipboardStyles() {
    if (!document.getElementById('hf-clip-styles')) {
        const style = document.createElement('style');
        style.id = 'hf-clip-styles';
        style.innerHTML = `
            .media-action-bar { display: flex; justify-content: flex-end; padding-top: 6px; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.1); width: 100%; }
            .media-action-btn { background: rgba(17, 27, 33, 0.6); color: #8696a0; border: 1px solid rgba(42, 57, 66, 0.8); padding: 4px 14px; border-radius: 12px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
            .media-action-btn:hover, .media-action-btn:active { background: #00a884; color: #111b21; border-color: #00a884; }
            .chat-bubble-wrapper img, .chat-bubble-wrapper video, .chat-bubble-wrapper iframe { -webkit-touch-callout: none !important; -webkit-user-select: none !important; user-select: none !important; pointer-events: auto; }
            body.clipboard-open { overflow: hidden; }
        `;
        document.head.appendChild(style);
    }
})();

window.addEventListener('contextmenu', function(e) {
    if (e.target.closest('.chat-bubble-wrapper')) {
        e.preventDefault(); e.stopPropagation(); return false;
    }
}, { capture: true, passive: false });

window.addEventListener('dragstart', function(e) {
    if (e.target.closest('.chat-bubble-wrapper')) {
        if (e.target.tagName === 'IMG' || e.target.tagName === 'A' || e.target.tagName === 'VIDEO') {
            e.preventDefault(); return false;
        }
    }
}, { capture: true });


window.currentClipContent = null; window.currentClipType = 'text'; window.currentTargetElement = null; 
window.internalAppClipboard = { content: null, type: null, blob: null };

// === 1. ИСПРАВЛЕННЫЙ ПОИСК ФАЙЛОВ (ВКЛЮЧАЯ ДОКУМЕНТЫ) ===
function getMediaFromWrapper(wrapper) {
    const bubble = wrapper.querySelector('.chat-bubble'); if (!bubble) return { content: null, type: 'text' };
    
    // Сначала ищем видео
    const vid = bubble.querySelector('video');
    if (vid) {
        const vSrc = vid.src || vid.querySelector('source')?.src;
        if (vSrc) return { content: vSrc, type: 'video' };
    }
    
    // Ищем документы/файлы (по иконке скачивания или классу)
    const docLink = bubble.querySelector('a[download], a[href*="alt=media"]');
    if (docLink && !docLink.href.includes('google.com/maps')) { // Исключаем локации
        return { content: docLink.href, type: 'document' };
    }

    // Ищем локацию
    const iframe = bubble.querySelector('iframe');
    if (iframe && iframe.src) return { content: iframe.src, type: 'location' };
    
    // Ищем фото
    const img = bubble.querySelector('img:not(.w-8):not(.rounded-full)');
    if (img && img.src && !img.src.includes('ui-avatars') && !img.src.includes('flagcdn')) return { content: img.src, type: 'image' };
    
    // Если ничего нет — это просто текст
    return { content: bubble.innerText || bubble.textContent || '', type: 'text' };
}


function injectActionButtons(wrapper) {
    if (wrapper.querySelector('.media-action-bar')) return;
    const media = getMediaFromWrapper(wrapper);

    if (media.content && media.type !== 'text') {
        const actionBar = document.createElement('div'); actionBar.className = 'media-action-bar';
        actionBar.innerHTML = `<button class="media-action-btn" title="Actions"><i class="fa-solid fa-ellipsis"></i></button>`;
        
        actionBar.querySelector('button').onclick = (e) => {
            e.preventDefault(); e.stopPropagation(); 
            const freshMedia = getMediaFromWrapper(wrapper); 
            window.openClipboardMenu(freshMedia.content, freshMedia.type, wrapper);
        };
        const bubble = wrapper.querySelector('.chat-bubble');
        if (bubble) bubble.appendChild(actionBar);
    }
}

let observerTimeout = null;
const chatObserver = new MutationObserver((mutations) => {
    if (observerTimeout) clearTimeout(observerTimeout);
    observerTimeout = setTimeout(() => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { 
                    if (node.classList.contains('chat-bubble-wrapper')) injectActionButtons(node);
                    else node.querySelectorAll('.chat-bubble-wrapper').forEach(w => injectActionButtons(w));
                }
            });
        });
    }, 50); 
});

setTimeout(() => {
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
        chatObserver.observe(chatContainer, { childList: true, subtree: true });
        document.querySelectorAll('.chat-bubble-wrapper').forEach(w => injectActionButtons(w));
    }
}, 2000);


window.openClipboardMenu = function(content, type, targetEl) {
    if (typeof window.closeDropdown === 'function') window.closeDropdown();
    window.currentClipContent = content; window.currentClipType = type; window.currentTargetElement = targetEl; 
    document.body.classList.add('clipboard-open');

    let titleText = "Text";
    if (type === 'image') titleText = "Photo";
    else if (type === 'video') titleText = "Video";
    else if (type === 'location') titleText = "Location";
    else if (type === 'document') titleText = "Document";

    const isOutgoing = targetEl.classList.contains('outgoing') || targetEl.closest('.outgoing') !== null;
    
    let deleteButtonsHTML = '';
    if (isOutgoing) {
        deleteButtonsHTML = `
            <div class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execDeleteAction('me')">
                <div class="w-12 h-12 rounded-full bg-orange-950/30 flex items-center justify-center text-orange-500 text-lg border border-orange-900/40"><i class="fa-solid fa-eye-slash"></i></div>
                <span class="text-[0.6rem] text-orange-500 font-bold text-center leading-tight">Delete for me</span>
            </div>
            <div class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execDeleteAction('all')">
                <div class="w-12 h-12 rounded-full bg-red-950/30 flex items-center justify-center text-[#ef4444] text-lg border border-red-900/40"><i class="fa-regular fa-trash-can"></i></div>
                <span class="text-[0.6rem] text-[#ef4444] font-bold text-center leading-tight">Delete for all</span>
            </div>
        `;
    } else {
        deleteButtonsHTML = `
            <div class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execDeleteAction('me')">
                <div class="w-12 h-12 rounded-full bg-red-950/30 flex items-center justify-center text-[#ef4444] text-lg border border-red-900/40"><i class="fa-solid fa-eye-slash"></i></div>
                <span class="text-[0.6rem] text-[#ef4444] font-bold text-center leading-tight">Delete for me</span>
            </div>
        `;
    }

    const commonButtons = `
        <div class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execCopyAction()">
            <div class="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-white text-lg border border-[#2a3942]"><i class="fa-regular fa-copy"></i></div>
            <span class="text-[0.6rem] text-[#8696a0] font-bold text-center leading-tight">Copy</span>
        </div>
        <div id="clip-save-btn" class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" style="display: ${(type === 'image' || type === 'video' || type === 'document') ? 'flex' : 'none'}" onclick="window.execSaveAction()">
            <div class="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-[#f59e0b] text-lg border border-[#2a3942]"><i class="fa-solid fa-download"></i></div>
            <span class="text-[0.6rem] text-[#8696a0] font-bold text-center leading-tight">Save</span>
        </div>
        <div class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execForwardAction()">
            <div class="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-[#a855f7] text-lg border border-[#2a3942]"><i class="fa-solid fa-share"></i></div>
            <span class="text-[0.6rem] text-[#8696a0] font-bold text-center leading-tight">Forward</span>
        </div>
    `;

    let modal = document.getElementById('clipboard-modal-clean');
    if (modal) modal.remove(); 

    const modalHTML = `
    <div id="clipboard-modal-clean" onclick="if(event.target===this) window.closeClipboardModal();" style="display:flex; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:99999; justify-content:center; align-items:flex-end; padding-bottom: 2rem;">
        <div class="flex flex-col p-4 w-full max-w-[350px] bg-[#0b141a] border border-[#2a3942] rounded-3xl shadow-2xl">
            <div class="flex justify-between items-center mb-4 px-2 border-b border-[#202c33] pb-2">
                <h3 class="text-[#00a884] font-bold text-sm tracking-wide uppercase">${titleText}</h3>
                <i class="fa-solid fa-xmark text-[#8696a0] text-lg cursor-pointer hover:text-white" onclick="window.closeClipboardModal()"></i>
            </div>
            
            <div class="flex flex-wrap justify-center gap-3 mb-2">
                ${commonButtons}
                ${deleteButtonsHTML}
            </div>
            
            <button type="button" onclick="window.execPasteAction()" class="flex items-center justify-center gap-2 w-full py-3.5 mt-2 bg-[#00a884] active:scale-95 text-[#111b21] rounded-2xl text-sm font-bold transition shadow-[0_0_15px_rgba(0,168,132,0.3)]">
                <i class="fa-solid fa-paper-plane"></i> <span>Paste & Send</span>
            </button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.closeClipboardModal = function() {
    const modal = document.getElementById('clipboard-modal-clean');
    if (modal) { modal.style.display = 'none'; document.body.classList.remove('clipboard-open'); }
};

// === 2. ЖЕСТКИЙ АНТИ-КЭШ ДЛЯ ФАЙЛОВ ПРИ КОПИРОВАНИИ ===
window.execCopyAction = async function() {
    if (!window.currentClipContent) return;
    
    window.internalAppClipboard.content = window.currentClipContent;
    window.internalAppClipboard.type = window.currentClipType;

    try {
        if (['image', 'video', 'document'].includes(window.currentClipType)) {
            // Агрессивный сброс кэша для Firebase Storage
            let fetchUrl = window.currentClipContent;
            if (fetchUrl.includes('?')) {
                fetchUrl += `&ignoreCache=${Date.now()}`;
            } else {
                fetchUrl += `?ignoreCache=${Date.now()}`;
            }
            // mode: 'cors' и cache: 'no-cache' заставляют браузер тянуть оригинал
            const res = await fetch(fetchUrl, { cache: "no-cache", mode: "cors" });
            window.internalAppClipboard.blob = await res.blob();
        } else {
            await navigator.clipboard.writeText(window.currentClipContent);
        }
        if (window.showToast) window.showToast("✔", "Copied", "", "");
    } catch (err) {
        console.error("Ошибка копирования:", err);
    }
    window.closeClipboardModal();
};

// === 3. ПРАВИЛЬНАЯ ВСТАВКА ВИДЕО И ДОКУМЕНТОВ ===
window.execPasteAction = async function() {
    const inputField = document.getElementById('chat-input') || document.getElementById('conf-chat-input') || document.getElementById('voice-chat-input');
    
    if (window.internalAppClipboard.blob && ['image', 'video', 'document'].includes(window.internalAppClipboard.type)) {
        let extension = '.jpg';
        let mime = 'image/jpeg';
        
        if (window.internalAppClipboard.type === 'video') {
            extension = '.mp4';
            mime = 'video/mp4';
        } else if (window.internalAppClipboard.type === 'document') {
            extension = '.pdf'; // По умолчанию для документа, если не знаем точный
            mime = 'application/pdf';
        }
        
        const uniqueFilename = `media_copy_${Date.now()}${extension}`;
        const file = new File([window.internalAppClipboard.blob], uniqueFilename, { type: mime });
        
        // Отправляем как реальный файл
        if (typeof window.handleMediaUpload === 'function') {
            window.handleMediaUpload({ target: { files: [file] } });
            if (window.showToast) window.showToast("✈️", "Sent", "", "");
        }
    } else if (window.internalAppClipboard.type === 'location') {
        if (typeof sendLocationDirectly === 'function') sendLocationDirectly(window.internalAppClipboard.content);
    } else {
        if (window.internalAppClipboard.type === 'text' && inputField) {
            inputField.value += window.internalAppClipboard.content; inputField.focus();
        }
    }
    
    window.internalAppClipboard = { content: null, type: null, blob: null }; 
    window.closeClipboardModal();
};

window.execSaveAction = async function() {
    if (!window.currentClipContent || !['image', 'video', 'document'].includes(window.currentClipType)) return;
    try {
        const response = await fetch(window.currentClipContent);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const extension = window.currentClipType === 'video' ? 'mp4' : (window.currentClipType === 'document' ? 'pdf' : 'jpg');
        const a = document.createElement('a'); a.href = url; a.download = `Saved_${Date.now()}.${extension}`;
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

// === 4. УМНОЕ УДАЛЕНИЕ: ЗАПОМИНАЕМ СКРЫТОЕ В LOCALSTORAGE ===
window.execDeleteAction = function(deleteType) {
    if (!window.currentTargetElement) return window.closeClipboardModal();
    
    // Ищем конкретный пузырь, а не всю группу
    const wrapper = window.currentTargetElement.closest('.chat-bubble-wrapper') || window.currentTargetElement;
    const msgId = wrapper.getAttribute('data-id') || wrapper.getAttribute('data-firebase-id'); 
    
    if (deleteType === 'me' && msgId) {
        // Прячем у себя
        wrapper.style.setProperty('display', 'none', 'important');
        
        // Записываем в черный список, чтобы не появилось после перезагрузки
        let deletedMsgs = JSON.parse(localStorage.getItem('hf_deleted_messages') || '[]');
        if (!deletedMsgs.includes(msgId)) {
            deletedMsgs.push(msgId);
            localStorage.setItem('hf_deleted_messages', JSON.stringify(deletedMsgs));
        }
    }

    // Удаление из базы у всех (если есть права)
    if (deleteType === 'all' && msgId && typeof firebase !== 'undefined' && window.currentRoomId) {
        let targetDbRoom = window.currentRoomId || 'global';
        if (window.currentIndex === 2 && targetDbRoom === 'global') targetDbRoom = 'video_room_global';
        
        firebase.database().ref(targetDbRoom).child(msgId).remove().then(() => {
             wrapper.style.setProperty('display', 'none', 'important');
        }).catch(err => {
             console.error("Нет прав на удаление у всех", err);
        });
    }
    
    window.closeClipboardModal();
};

// === 5. ИСПРАВЛЕННЫЙ СЛУШАТЕЛЬ УДАЛЕНИЙ (СИНХРОНИЗАЦИЯ) ===
let currentTrackedRoom = null;
let removeListener = null;

setInterval(() => {
    let activeRoom = window.currentRoomId || 'global';
    if (window.currentIndex === 2 && activeRoom === 'global') activeRoom = 'video_room_global';

    if (activeRoom && activeRoom !== currentTrackedRoom && typeof firebase !== 'undefined') {
        if (currentTrackedRoom && removeListener) {
            firebase.database().ref(currentTrackedRoom).off('child_removed', removeListener);
        }
        currentTrackedRoom = activeRoom;
        
        removeListener = firebase.database().ref(currentTrackedRoom).on('child_removed', (snapshot) => {
            const deletedId = snapshot.key;
            
            // Скрываем элемент в реальном времени, если кто-то другой его удалил
            const el = document.querySelector(`.chat-bubble-wrapper[data-id="${deletedId}"], .chat-bubble-wrapper[data-firebase-id="${deletedId}"]`);
            if (el) {
                el.style.setProperty('display', 'none', 'important');
            }
        });
    }
    
    // ПРИ ЗАГРУЗКЕ: проверяем черный список и прячем то, что удалили "для себя"
    const deletedMsgs = JSON.parse(localStorage.getItem('hf_deleted_messages') || '[]');
    if (deletedMsgs.length > 0) {
        deletedMsgs.forEach(id => {
            const el = document.querySelector(`.chat-bubble-wrapper[data-id="${id}"], .chat-bubble-wrapper[data-firebase-id="${id}"]`);
            if (el && el.style.display !== 'none') {
                el.style.setProperty('display', 'none', 'important');
            }
        });
    }
    
}, 1000);
        

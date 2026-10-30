// ==========================================
// CLIPBOARD.JS - Умный буфер обмена (ФИНАЛЬНАЯ РАБОЧАЯ ВЕРСИЯ)
// Откачено до стабильного состояния: удаление у всех, правильное копирование видео
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

// === ТОТАЛЬНЫЙ УБИЙЦА СИСТЕМНЫХ МЕНЮ (ТОЛЬКО ВНУТРИ ЧАТА) ===
window.addEventListener('contextmenu', function(e) {
    const inChat = e.target.closest('#chat-messages') || e.target.closest('.chat-bubble-wrapper');
    if (inChat) {
        if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO' || e.target.tagName === 'IFRAME' || e.target.closest('.chat-bubble-wrapper')) { 
            e.preventDefault(); e.stopPropagation(); return false; 
        }
    }
}, { capture: true, passive: false });

window.addEventListener('dragstart', function(e) {
    const inChat = e.target.closest('#chat-messages') || e.target.closest('.chat-bubble-wrapper');
    if (inChat && (e.target.tagName === 'IMG' || e.target.tagName === 'A' || e.target.tagName === 'VIDEO')) { 
        e.preventDefault(); return false; 
    }
}, { capture: true });

// === СЛОВАРИ ===
const clipDict = {
    en: { clip_photo: "Photo", clip_video: "Video", clip_text: "Text", clip_loc: "Location", clip_link: "Link", clip_copy: "Copy", clip_paste: "Paste & Send", clip_save: "Save", clip_forward: "Forward", clip_del: "Delete" },
    ru: { clip_photo: "Фото", clip_video: "Видео", clip_text: "Текст", clip_loc: "Локация", clip_link: "Ссылка", clip_copy: "Копировать", clip_paste: "Вставить и Отправить", clip_save: "Сохранить", clip_forward: "Переслать", clip_del: "Удалить" },
    kk: { clip_photo: "Фото", clip_video: "Видео", clip_text: "Мәтін", clip_loc: "Локация", clip_link: "Сілтеме", clip_copy: "Көшіру", clip_paste: "Кірістіру/Жіберу", clip_save: "Сақтау", clip_forward: "Қайта жіберу", clip_del: "Өшіру" },
    az: { clip_photo: "Şəkil", clip_video: "Video", clip_text: "Mətn", clip_loc: "Məkan", clip_link: "Link", clip_copy: "Kopyala", clip_paste: "Yerləşdir/Göndər", clip_save: "Yadda saxla", clip_forward: "Yönləndir", clip_del: "Sil" },
    de: { clip_photo: "Foto", clip_video: "Video", clip_text: "Text", clip_loc: "Standort", clip_link: "Link", clip_copy: "Kopieren", clip_paste: "Einfügen & Senden", clip_save: "Speichern", clip_forward: "Weiterleiten", clip_del: "Löschen" },
    tr: { clip_photo: "Fotoğraf", clip_video: "Video", clip_text: "Metin", clip_loc: "Konum", clip_link: "Bağlantı", clip_copy: "Kopyala", clip_paste: "Yapıştır & Gönder", clip_save: "Kaydet", clip_forward: "İlet", clip_del: "Sil" },
    ar: { clip_photo: "صورة", clip_video: "فيديو", clip_text: "نص", clip_loc: "الموقع", clip_link: "رابط", clip_copy: "نسخ", clip_paste: "لصق وإرسال", clip_save: "حفظ", clip_forward: "إرسال", clip_del: "حذف" },
    it: { clip_photo: "Foto", clip_video: "Video", clip_text: "Testo", clip_loc: "Posizione", clip_link: "Link", clip_copy: "Copia", clip_paste: "Incolla e Invia", clip_save: "Salva", clip_forward: "Inoltra", clip_del: "Elimina" },
    es: { clip_photo: "Foto", clip_video: "Video", clip_text: "Texto", clip_loc: "Ubicación", clip_link: "Enlace", clip_copy: "Copiar", clip_paste: "Pegar y Enviar", clip_save: "Guardar", clip_forward: "Reenviar", clip_del: "Eliminar" },
    fr: { clip_photo: "Photo", clip_video: "Vidéo", clip_text: "Texte", clip_loc: "Emplacement", clip_link: "Lien", clip_copy: "Copier", clip_paste: "Coller & Envoyer", clip_save: "Enregistrer", clip_forward: "Transférer", clip_del: "Supprimer" },
    pt: { clip_photo: "Foto", clip_video: "Vídeo", clip_text: "Texto", clip_loc: "Localização", clip_link: "Link", clip_copy: "Copiar", clip_paste: "Colar e Enviar", clip_save: "Salvar", clip_forward: "Encaminhar", clip_del: "Excluir" },
    ja: { clip_photo: "写真", clip_video: "ビデオ", clip_text: "テキスト", clip_loc: "位置情報", clip_link: "リンク", clip_copy: "コピー", clip_paste: "貼り付けて送信", clip_save: "保存", clip_forward: "転送", clip_del: "削除" },
    zh: { clip_photo: "照片", clip_video: "视频", clip_text: "文本", clip_loc: "位置", clip_link: "链接", clip_copy: "复制", clip_paste: "粘贴并发送", clip_save: "保存", clip_forward: "转发", clip_del: "删除" }
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

window.currentClipContent = null; window.currentClipType = 'text'; window.currentTargetElement = null; 
window.internalAppClipboard = { content: null, type: null, blob: null };

// === 1. АВТО-ИНЖЕКТОР КНОПОК "ТРИ ТОЧКИ" (ТОЛЬКО ДЛЯ МЕДИА) ===
function getMediaFromWrapper(wrapper) {
    const bubble = wrapper.querySelector('.chat-bubble'); if (!bubble) return { content: null, type: 'text' };
    
    const vid = bubble.querySelector('video');
    const iframe = bubble.querySelector('iframe');
    const img = bubble.querySelector('img:not(.w-8):not(.rounded-full)');

    if (vid) {
        const vSrc = vid.src || vid.querySelector('source')?.src;
        if (vSrc) return { content: vSrc, type: 'video' };
    }
    if (iframe && iframe.src) return { content: iframe.src, type: 'location' };
    if (img && img.src && !img.src.includes('ui-avatars') && !img.src.includes('flagcdn')) return { content: img.src, type: 'image' };
    
    return { content: bubble.innerText || bubble.textContent || '', type: 'text' };
}

function injectActionButtons(wrapper) {
    const bubble = wrapper.querySelector('.chat-bubble');
    if (!bubble || wrapper.querySelector('.media-action-bar')) return;

    const media = getMediaFromWrapper(wrapper);

    // Добавляем "три точки" ТОЛЬКО если это не текст
    if (media.content && media.type !== 'text') {
        const actionBar = document.createElement('div'); actionBar.className = 'media-action-bar';
        actionBar.innerHTML = `<button class="media-action-btn" title="Actions"><i class="fa-solid fa-ellipsis"></i></button>`;
        
        actionBar.querySelector('button').onclick = (e) => {
            e.preventDefault(); e.stopPropagation(); 
            const freshMedia = getMediaFromWrapper(wrapper);
            window.openClipboardMenu(freshMedia.content, freshMedia.type, wrapper);
        };
        bubble.appendChild(actionBar);
    }
}

let observerTimeout = null;
const chatObserver = new MutationObserver(() => {
    if (observerTimeout) clearTimeout(observerTimeout);
    observerTimeout = setTimeout(() => {
        document.querySelectorAll('.chat-bubble-wrapper').forEach(w => injectActionButtons(w));
    }, 50); 
});

setTimeout(() => {
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
        chatObserver.observe(chatContainer, { childList: true, subtree: true });
        document.querySelectorAll('.chat-bubble-wrapper').forEach(w => injectActionButtons(w));
    }
}, 2000);

// === 2. ЗАЩИТА ВСТАВКИ С КЛАВИАТУРЫ ===
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

    if (pasteText.startsWith('data:image/') || pasteText.startsWith('data:video/') || pasteText.length > 5000) {
        e.preventDefault(); return; 
    }

    if (window.internalAppClipboard.type === 'location' && (pasteText === window.internalAppClipboard.content || pasteText.includes('google.com/maps/embed'))) {
        e.preventDefault();
        sendLocationDirectly(pasteText);
        window.internalAppClipboard = { content: null, type: null, blob: null };
    }
});

function sendLocationDirectly(url) {
    if (typeof firebase !== 'undefined' && window.currentRoomId) {
        let isVoiceTab = window.currentIndex === 1; let isConfTab = window.currentIndex === 2;
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

// === 3. МЕНЮ ===
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

    let modal = document.getElementById('clipboard-modal-clean');
    if (!modal) {
        const modalHTML = `
        <div id="clipboard-modal-clean" onclick="if(event.target===this) window.closeClipboardModal();" style="display:flex; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:99999; justify-content:center; align-items:flex-end; padding-bottom: env(safe-area-inset-bottom, 2rem);">
            <div class="flex flex-col p-4 w-full max-w-[350px] bg-[#0b141a] border border-[#2a3942] rounded-3xl shadow-2xl">
                <div class="flex justify-between items-center mb-4 px-2 border-b border-[#202c33] pb-2">
                    <h3 class="text-[#00a884] font-bold text-sm tracking-wide uppercase" id="clip-title-text">${titleText}</h3>
                    <i class="fa-solid fa-xmark text-[#8696a0] text-lg cursor-pointer" onclick="window.closeClipboardModal()"></i>
                </div>
                <div class="grid grid-cols-4 gap-2 mb-2">
                    <div class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execCopyAction()">
                        <div class="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-white text-lg border border-[#2a3942]"><i class="fa-regular fa-copy"></i></div>
                        <span class="text-[0.6rem] text-[#8696a0] font-bold text-center leading-tight" id="clip-text-copy">${langDict.clip_copy}</span>
                    </div>
                    <div id="clip-save-btn" class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execSaveAction()">
                        <div class="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-[#f59e0b] text-lg border border-[#2a3942]"><i class="fa-solid fa-download"></i></div>
                        <span class="text-[0.6rem] text-[#8696a0] font-bold text-center leading-tight" id="clip-text-save">${langDict.clip_save}</span>
                    </div>
                    <div class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execForwardAction()">
                        <div class="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-[#a855f7] text-lg border border-[#2a3942]"><i class="fa-solid fa-share"></i></div>
                        <span class="text-[0.6rem] text-[#8696a0] font-bold text-center leading-tight" id="clip-text-forward">${langDict.clip_forward}</span>
                    </div>
                    <div class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execDeleteAction()">
                        <div class="w-12 h-12 rounded-full bg-red-950/30 flex items-center justify-center text-[#ef4444] text-lg border border-red-900/40"><i class="fa-regular fa-trash-can"></i></div>
                        <span class="text-[0.6rem] text-[#ef4444] font-bold text-center leading-tight" id="clip-text-del">${langDict.clip_del}</span>
                    </div>
                </div>
                <button id="clip-paste-btn" type="button" onclick="window.execPasteAction()" class="flex items-center justify-center gap-2 w-full py-3.5 mt-2 bg-[#00a884] active:scale-95 text-[#111b21] rounded-2xl text-sm font-bold transition shadow-[0_0_15px_rgba(0,168,132,0.3)]">
                    <i class="fa-solid fa-paper-plane"></i> <span id="clip-text-paste">${langDict.clip_paste}</span>
                </button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('clipboard-modal-clean');
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

// === 4. ДЕЙСТВИЯ (ОТКАЧЕНО ДО РАБОЧИХ ОРИГИНАЛОВ) ===
window.execCopyAction = async function() {
    if (!window.currentClipContent) return;
    window.internalAppClipboard.content = window.currentClipContent;
    window.internalAppClipboard.type = window.currentClipType;
    window.internalAppClipboard.blob = null; 

    try {
        if (window.currentClipType === 'image' || window.currentClipType === 'video') {
            // ЧИСТЫЙ FETCH, БЕЗ СБРОСА КЭША (чтобы не ломать токены Firebase Storage)
            const res = await fetch(window.currentClipContent);
            const blob = await res.blob();
            window.internalAppClipboard.blob = blob;
            
            if (window.currentClipType === 'image') {
                try {
                    const img = new Image();
                    img.crossOrigin = "Anonymous"; 
                    img.src = window.currentClipContent;
                    
                    img.onload = () => {
                        try {
                            const canvas = document.createElement('canvas'); 
                            canvas.width = img.width; canvas.height = img.height;
                            canvas.getContext('2d').drawImage(img, 0, 0);
                            canvas.toBlob(pngBlob => { 
                                navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]).catch(()=>{}); 
                            }, 'image/png');
                        } catch(e) {}
                    };
                } catch(e) {}
            } else if (window.currentClipType === 'video') {
                navigator.clipboard.writeText(window.currentClipContent).catch(()=>{});
            }
        } else {
            await navigator.clipboard.writeText(window.currentClipContent);
        }
        if (window.showToast) window.showToast("✔", "Copied", "", "");
    } catch (err) {
        navigator.clipboard.writeText(window.currentClipContent).catch(()=>{});
    }
    window.closeClipboardModal();
};

window.execPasteAction = async function() {
    const inputField = document.getElementById('chat-input') || document.getElementById('conf-chat-input') || document.getElementById('voice-chat-input');
    
    if (window.internalAppClipboard.blob && (window.internalAppClipboard.type === 'image' || window.internalAppClipboard.type === 'video')) {
        const isVid = window.internalAppClipboard.type === 'video';
        const ext = isVid ? '.mp4' : '.jpg';
        const mime = isVid ? 'video/mp4' : 'image/jpeg';
        
        // Жестко задаем правильный MIME-тип для видео
        const uniqueFilename = `media_${Date.now()}${ext}`;
        const file = new File([window.internalAppClipboard.blob], uniqueFilename, { type: mime });
        
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
    
    window.internalAppClipboard = { content: null, type: null, blob: null };
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

// === ИСПРАВЛЕННОЕ УДАЛЕНИЕ (100% УДАЛЯЕТ ИЗ БД У ВСЕХ) ===
window.execDeleteAction = function() {
    if (window.currentTargetElement) {
        const wrapper = window.currentTargetElement;
        const msgId = wrapper.getAttribute('data-id'); // Берем ТОЛЬКО точный ID сообщения
        
        // 1. Скрываем визуально у себя (как было в твоем оригинальном коде)
        wrapper.style.opacity = '0';
        setTimeout(() => wrapper.remove(), 300);

        // 2. Бьем прямо в базу по точному пути, чтобы удалить у всех
        if (msgId && typeof firebase !== 'undefined' && window.currentRoomId) {
            firebase.database().ref(window.currentRoomId).child(msgId).remove();
        }
    }
    window.closeClipboardModal();
};

// === 5. ДОЛГИЙ ТАП (ТОЛЬКО ДЛЯ ТЕКСТА) ===
function handleTextContextRequest(wrapper) {
    if (wrapper.querySelector('img:not(.w-8)') || wrapper.querySelector('video') || wrapper.querySelector('iframe')) return;
    const selection = window.getSelection().toString();
    if (selection.trim().length > 0) return; 
    let content = wrapper.innerText || wrapper.textContent || ''; 
    if (!content.trim()) return;
    window.openClipboardMenu(content, 'text', wrapper);
}

let touchTimer = null; let touchMoved = false;

document.addEventListener('touchstart', function(e) {
    const wrapper = e.target.closest('.chat-bubble-wrapper');
    if (!wrapper) return;
    touchMoved = false;
    touchTimer = setTimeout(() => {
        if (touchMoved) return; 
        handleTextContextRequest(wrapper); 
    }, 500); 
}, { passive: true }); 

document.addEventListener('touchend', function(e) { 
    if (touchTimer) clearTimeout(touchTimer); 
});
document.addEventListener('touchmove', function() { 
    touchMoved = true; 
    if (touchTimer) clearTimeout(touchTimer); 
}, { passive: true });

document.addEventListener('contextmenu', function(e) {
    const wrapper = e.target.closest('.chat-bubble-wrapper');
    if (wrapper) { 
        if (!wrapper.querySelector('img:not(.w-8)') && !wrapper.querySelector('video') && !wrapper.querySelector('iframe')) {
            e.preventDefault(); 
            handleTextContextRequest(wrapper); 
        }
    }
});



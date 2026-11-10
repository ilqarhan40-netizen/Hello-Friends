// ==========================================
// CLIPBOARD.JS - ФИНАЛЬНАЯ СБОРКА 
// (Постоянная зеленая кнопка + Мгновенное копирование + Перехват системной вставки)
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

const clipDict = {
    en: { clip_photo: "Photo", clip_video: "Video", clip_text: "Text", clip_loc: "Location", clip_link: "Link", clip_copy: "Copy", clip_paste: "Paste & Send", clip_save: "Save", clip_forward: "Forward", clip_del_me: "Delete for me", clip_del_all: "Delete for all" },
    ru: { clip_photo: "Фото", clip_video: "Видео", clip_text: "Текст", clip_loc: "Локация", clip_link: "Ссылка", clip_copy: "Копировать", clip_paste: "Вставить и Отправить", clip_save: "Сохранить", clip_forward: "Переслать", clip_del_me: "Удалить у меня", clip_del_all: "Удалить у всех" },
    kk: { clip_photo: "Фото", clip_video: "Видео", clip_text: "Мәтін", clip_loc: "Локация", clip_link: "Сілтеме", clip_copy: "Көшіру", clip_paste: "Кірістіру/Жіберу", clip_save: "Сақтау", clip_forward: "Қайта жіберу", clip_del_me: "Менен өшіру", clip_del_all: "Барлығынан өшіру" },
    az: { clip_photo: "Şəkil", clip_video: "Video", clip_text: "Mətn", clip_loc: "Məkan", clip_link: "Link", clip_copy: "Kopyala", clip_paste: "Yerləşdir/Göndər", clip_save: "Yadda saxla", clip_forward: "Yönləndir", clip_del_me: "Məndən sil", clip_del_all: "Hamıdan sil" },
    de: { clip_photo: "Foto", clip_video: "Video", clip_text: "Text", clip_loc: "Standort", clip_link: "Link", clip_copy: "Kopieren", clip_paste: "Einfügen & Senden", clip_save: "Speichern", clip_forward: "Weiterleiten", clip_del_me: "Für mich löschen", clip_del_all: "Für alle löschen" },
    tr: { clip_photo: "Fotoğraf", clip_video: "Video", clip_text: "Metin", clip_loc: "Konum", clip_link: "Bağlantı", clip_copy: "Kopyala", clip_paste: "Yapıştır & Gönder", clip_save: "Kaydet", clip_forward: "İlet", clip_del_me: "Benden sil", clip_del_all: "Herkesten sil" },
    ar: { clip_photo: "صورة", clip_video: "فيديو", clip_text: "نص", clip_loc: "الموقع", clip_link: "رابط", clip_copy: "نسخ", clip_paste: "لصق وإرسال", clip_save: "حفظ", clip_forward: "إرسال", clip_del_me: "حذف لدي", clip_del_all: "حذف لدى الجميع" },
    it: { clip_photo: "Foto", clip_video: "Video", clip_text: "Testo", clip_loc: "Posizione", clip_link: "Link", clip_copy: "Copia", clip_paste: "Incolla e Invia", clip_save: "Salva", clip_forward: "Inoltra", clip_del_me: "Elimina per me", clip_del_all: "Elimina per tutti" },
    es: { clip_photo: "Foto", clip_video: "Video", clip_text: "Texto", clip_loc: "Ubicación", clip_link: "Enlace", clip_copy: "Copiar", clip_paste: "Pegar y Enviar", clip_save: "Guardar", clip_forward: "Reenviar", clip_del_me: "Eliminar para mí", clip_del_all: "Eliminar para todos" },
    fr: { clip_photo: "Photo", clip_video: "Vidéo", clip_text: "Texte", clip_loc: "Emplacement", clip_link: "Lien", clip_copy: "Copier", clip_paste: "Coller & Envoyer", clip_save: "Enregistrer", clip_forward: "Transférer", clip_del_me: "Supprimer pour moi", clip_del_all: "Supprimer pour tous" },
    pt: { clip_photo: "Foto", clip_video: "Vídeo", clip_text: "Texto", clip_loc: "Localização", clip_link: "Link", clip_copy: "Copiar", clip_paste: "Colar e Enviar", clip_save: "Salvar", clip_forward: "Encaminhar", clip_del_me: "Excluir para mim", clip_del_all: "Excluir para todos" },
    ja: { clip_photo: "写真", clip_video: "ビデオ", clip_text: "テキスト", clip_loc: "位置情報", clip_link: "リンク", clip_copy: "コピー", clip_paste: "貼り付けて送信", clip_save: "保存", clip_forward: "転送", clip_del_me: "自分のみ削除", clip_del_all: "全員から削除" },
    zh: { clip_photo: "照片", clip_video: "视频", clip_text: "文本", clip_loc: "位置", clip_link: "链接", clip_copy: "复制", clip_paste: "粘贴并发送", clip_save: "保存", clip_forward: "转发", clip_del_me: "为我删除", clip_del_all: "为所有人删除" }
};

const checkClipI18n = setInterval(() => {
    if (window.i18n && window.i18n.en) {
        clearInterval(checkClipI18n);
        for (let sysLang in window.i18n) { Object.assign(window.i18n[sysLang], clipDict[sysLang] || clipDict['en']); }
        if (typeof window.applyTranslations === 'function') window.applyTranslations();
    }
}, 100);

window.currentClipContent = null; window.currentClipType = 'text'; window.currentTargetElement = null; 
window.internalAppClipboard = { content: null, type: null };

function getMediaFromWrapper(wrapper) {
    const bubble = wrapper.querySelector('.chat-bubble'); if (!bubble) return { content: null, type: 'text' };
    const vid = bubble.querySelector('video');
    if (vid) { const vSrc = vid.src || vid.querySelector('source')?.src; if (vSrc) return { content: vSrc, type: 'video' }; }
    const iframe = bubble.querySelector('iframe');
    if (iframe && iframe.src) return { content: iframe.src, type: 'location' };
    const docLink = bubble.querySelector('a[href*="alt=media"]');
    if (docLink && !docLink.href.includes('google.com/maps') && !docLink.querySelector('img')) {
        return { content: docLink.href, type: 'document' };
    }
    const img = bubble.querySelector('img:not(.w-8):not(.rounded-full)');
    if (img && img.src && !img.src.includes('ui-avatars') && !img.src.includes('flagcdn')) return { content: img.src, type: 'image' };
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

    let userLang = localStorage.getItem('hf_app_lang') || window.appLang || 'en';
    if (userLang === 'auto') userLang = window.appLang || 'en';
    const langDict = clipDict[userLang.substring(0,2)] || clipDict['en'];

    let titleText = langDict.clip_text;
    if (type === 'image') titleText = langDict.clip_photo;
    else if (type === 'video') titleText = langDict.clip_video;
    else if (type === 'location') titleText = langDict.clip_loc;
    else if (type === 'document') titleText = langDict.clip_link || "Document";

    const isOutgoing = targetEl.classList.contains('outgoing') || targetEl.closest('.outgoing') !== null;
    
    let deleteButtonsHTML = '';
    if (isOutgoing) {
        deleteButtonsHTML = `
            <div class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execDeleteAction('me')">
                <div class="w-12 h-12 rounded-full bg-orange-950/30 flex items-center justify-center text-orange-500 text-lg border border-orange-900/40"><i class="fa-solid fa-eye-slash"></i></div>
                <span class="text-[0.6rem] text-orange-500 font-bold text-center leading-tight">${langDict.clip_del_me}</span>
            </div>
            <div class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execDeleteAction('all')">
                <div class="w-12 h-12 rounded-full bg-red-950/30 flex items-center justify-center text-[#ef4444] text-lg border border-red-900/40"><i class="fa-regular fa-trash-can"></i></div>
                <span class="text-[0.6rem] text-[#ef4444] font-bold text-center leading-tight">${langDict.clip_del_all}</span>
            </div>
        `;
    } else {
        deleteButtonsHTML = `
            <div class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execDeleteAction('me')">
                <div class="w-12 h-12 rounded-full bg-red-950/30 flex items-center justify-center text-[#ef4444] text-lg border border-red-900/40"><i class="fa-solid fa-eye-slash"></i></div>
                <span class="text-[0.6rem] text-[#ef4444] font-bold text-center leading-tight">${langDict.clip_del_me}</span>
            </div>
        `;
    }

    const commonButtons = `
        <div class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execCopyAction()">
            <div class="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-white text-lg border border-[#2a3942]"><i class="fa-regular fa-copy"></i></div>
            <span class="text-[0.6rem] text-[#8696a0] font-bold text-center leading-tight">${langDict.clip_copy}</span>
        </div>
        <div id="clip-save-btn" class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" style="display: ${(type === 'image' || type === 'video' || type === 'document') ? 'flex' : 'none'}" onclick="window.execSaveAction()">
            <div class="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-[#f59e0b] text-lg border border-[#2a3942]"><i class="fa-solid fa-download"></i></div>
            <span class="text-[0.6rem] text-[#8696a0] font-bold text-center leading-tight">${langDict.clip_save}</span>
        </div>
        <div class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition" onclick="window.execForwardAction()">
            <div class="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-[#a855f7] text-lg border border-[#2a3942]"><i class="fa-solid fa-share"></i></div>
            <span class="text-[0.6rem] text-[#8696a0] font-bold text-center leading-tight">${langDict.clip_forward}</span>
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
                <i class="fa-solid fa-paper-plane"></i> <span>${langDict.clip_paste}</span>
            </button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    if (typeof window.applyTranslations === 'function') window.applyTranslations();
};

window.closeClipboardModal = function() {
    const modal = document.getElementById('clipboard-modal-clean');
    if (modal) { modal.style.display = 'none'; document.body.classList.remove('clipboard-open'); }
};

window.execCopyAction = function() {
    if (!window.currentClipContent) return;
    
    window.internalAppClipboard = {
        content: window.currentClipContent,
        type: window.currentClipType
    };

    try { navigator.clipboard.writeText(window.currentClipContent); } catch(err) {}

    if (window.showToast) window.showToast("✔", "Copied", "", "");
    window.closeClipboardModal();
};

window.execPasteAction = async function() {
    const clip = window.internalAppClipboard;
    
    if (!clip || !clip.content) {
        // Если буфер пуст, просто закрываем окно, ничего не ломая
        return window.closeClipboardModal();
    }

    if (['image', 'video', 'document'].includes(clip.type)) {
        try {
            const res = await fetch(clip.content);
            const blob = await res.blob();
            let extension = '.jpg'; let mime = 'image/jpeg';
            if (clip.type === 'video') { extension = '.mp4'; mime = 'video/mp4'; }
            if (clip.type === 'document') { extension = '.pdf'; mime = 'application/pdf'; }

            const file = new File([blob], `media_copy_${Date.now()}${extension}`, { type: mime });
            if (typeof window.handleMediaUpload === 'function') {
                window.handleMediaUpload({ target: { files: [file] } });
                if (window.showToast) window.showToast("✈️", "Sent", "", "");
            }
        } catch (err) {
            const inputField = document.getElementById('chat-input') || document.getElementById('conf-chat-input') || document.getElementById('voice-chat-input');
            if (inputField) { inputField.value += clip.content; inputField.focus(); }
        }
    } else {
        const inputField = document.getElementById('chat-input') || document.getElementById('conf-chat-input') || document.getElementById('voice-chat-input');
        if (inputField) { inputField.value += clip.content; inputField.focus(); }
    }
    
    window.internalAppClipboard = { content: null, type: null }; 
    window.closeClipboardModal();
};

window.addEventListener('paste', async function(e) {
    const clip = window.internalAppClipboard;
    if (clip && clip.content && ['image', 'video', 'document'].includes(clip.type)) {
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        if (pastedText === clip.content) {
            e.preventDefault(); 
            try {
                const res = await fetch(clip.content);
                const blob = await res.blob();
                let extension = '.jpg'; let mime = 'image/jpeg';
                if (clip.type === 'video') { extension = '.mp4'; mime = 'video/mp4'; }
                if (clip.type === 'document') { extension = '.pdf'; mime = 'application/pdf'; }

                const file = new File([blob], `media_copy_${Date.now()}${extension}`, { type: mime });
                if (typeof window.handleMediaUpload === 'function') {
                    window.handleMediaUpload({ target: { files: [file] } });
                    if (window.showToast) window.showToast("✈️", "Sent", "", "");
                }
                window.internalAppClipboard = { content: null, type: null };
            } catch(err) {}
        }
    }
});

window.execSaveAction = async function() {
    if (!window.currentClipContent || !['image', 'video', 'document'].includes(window.currentClipType)) return;
    try {
        const response = await fetch(window.currentClipContent);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        let extension = 'jpg';
        if (window.currentClipType === 'video') extension = 'mp4';
        if (window.currentClipType === 'document') extension = 'pdf';
        const a = document.createElement('a'); a.href = url; a.download = `Saved_${Date.now()}.${extension}`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
    } catch (e) {}
    if (window.showToast) window.showToast("💾", "Saved", "", "");
    window.closeClipboardModal();
};

window.execForwardAction = function() {
    if (window.currentClipContent) {
        window.hfForwardData = { content: window.currentClipContent, type: window.currentClipType };
        if (window.showToast) window.showToast("➥", "Select chat", "", "");
    }
    window.closeClipboardModal();
};

window.execDeleteAction = function(deleteType) {
    if (!window.currentTargetElement) return window.closeClipboardModal();
    const wrapper = window.currentTargetElement.closest('.chat-bubble-wrapper') || window.currentTargetElement;
    const msgId = wrapper.getAttribute('data-id') || wrapper.getAttribute('data-firebase-id'); 
    wrapper.style.setProperty('display', 'none', 'important');

    if (deleteType === 'me' && msgId) {
        try {
            let deletedMsgs = JSON.parse(localStorage.getItem('hf_deleted_msgs') || '[]');
            if (!deletedMsgs.includes(msgId)) {
                deletedMsgs.push(msgId);
                localStorage.setItem('hf_deleted_msgs', JSON.stringify(deletedMsgs));
            }
        } catch(e) {}
    }

    if (deleteType === 'all' && msgId && typeof firebase !== 'undefined' && window.currentRoomId) {
        let targetDbRoom = window.currentRoomId || 'global';
        if (window.currentIndex === 2 && targetDbRoom === 'global') targetDbRoom = 'video_room_global';
        firebase.database().ref(targetDbRoom).child(msgId).remove().catch(err => {
            wrapper.style.display = 'flex';
        });
    }
    window.closeClipboardModal();
};

let currentTrackedRoom = null;
let removeListener = null;

setInterval(() => {
    let activeRoom = window.currentRoomId || 'global';
    if (window.currentIndex === 2 && activeRoom === 'global') activeRoom = 'video_room_global';

    if (activeRoom && activeRoom !== currentTrackedRoom && typeof firebase !== 'undefined') {
        if (currentTrackedRoom && removeListener) { firebase.database().ref(currentTrackedRoom).off('child_removed', removeListener); }
        currentTrackedRoom = activeRoom;
        
        removeListener = firebase.database().ref(currentTrackedRoom).on('child_removed', (snapshot) => {
            const deletedId = snapshot.key;
            const el = document.querySelector(`.chat-bubble-wrapper[data-id="${deletedId}"], .chat-bubble-wrapper[data-firebase-id="${deletedId}"]`);
            if (el) { el.style.setProperty('display', 'none', 'important'); }
        });
    }

    try {
        const deletedMsgs = JSON.parse(localStorage.getItem('hf_deleted_msgs') || '[]');
        deletedMsgs.forEach(id => {
            const el = document.querySelector(`.chat-bubble-wrapper[data-id="${id}"], .chat-bubble-wrapper[data-firebase-id="${id}"]`);
            if (el && el.style.display !== 'none') { el.style.setProperty('display', 'none', 'important'); }
        });
    } catch(e) {}
}, 1000);

// ==========================================
// MODULE: ARCHIVE & DATA CENTER (FIREBASE SYNCED)
// ==========================================

window.updateTopTabsGlow = function() {
    const tabs = document.querySelectorAll('[onclick^="window.switchArchiveTab"]');
    tabs.forEach(tab => {
        let isUnread = false;
        let onclickCode = tab.getAttribute('onclick');
        
        if (onclickCode.includes('mail')) isUnread = window.mailArchiveDB && window.mailArchiveDB.some(m => m.unread);
        if (onclickCode.includes('docs')) isUnread = window.docsArchiveDB && window.docsArchiveDB.some(m => m.unread);
        if (onclickCode.includes('media')) isUnread = window.mediaArchiveDB && window.mediaArchiveDB.some(m => m.unread);

        if (isUnread) {
            tab.classList.add('border-[#00a884]', 'shadow-[0_0_15px_rgba(0,168,132,0.6)]', 'bg-[#1a2938]');
            tab.classList.remove('border-[#2a3942]', 'bg-[#111b21]');
        } else {
            tab.classList.remove('border-[#00a884]', 'shadow-[0_0_15px_rgba(0,168,132,0.6)]', 'bg-[#1a2938]');
            tab.classList.add('border-[#2a3942]', 'bg-[#111b21]');
        }
    });
};

window.docsArchiveDB = window.docsArchiveDB || [];
window.mediaArchiveDB = window.mediaArchiveDB || [];
window.mailArchiveDB = window.mailArchiveDB || [];
window.currentArchiveTab = 'mail';

window.switchArchiveTab = function(tab) {
    window.currentArchiveTab = tab;
    const title = document.getElementById('archive-section-title');
    const readerView = document.getElementById('email-reader-view');
    const listView = document.getElementById('email-list-view');
    
    if (readerView) { readerView.classList.add('hidden'); readerView.classList.remove('flex'); }
    if (listView) listView.classList.remove('hidden');

    if (tab === 'mail') {
        if (title) title.innerText = "Corporate Mailbox";
        window.renderArchiveList('email', window.mailArchiveDB);
    } else if (tab === 'docs') {
        if (title) title.innerText = "Saved Documents";
        window.renderArchiveList('doc', window.docsArchiveDB);
    } else if (tab === 'media') {
        if (title) title.innerText = "Media & Videos";
        window.renderArchiveList('media', window.mediaArchiveDB);
    }
};

window.renderArchiveList = function(type, dbArray) {
    const list = document.getElementById('archive-list');
    if (!list) return;
    
    if (!dbArray || dbArray.length === 0) {
        list.innerHTML = '<p class="text-center text-sm text-[#8696a0] mt-4" data-i18n="repo_empty">Repository is empty.</p>';
        return;
    }
    
    list.innerHTML = '';
    
    dbArray.forEach(item => {
        let icon = '<i class="fa-solid fa-file-lines text-4xl"></i>';
        let iconColor = 'text-[#a29bfe]';
        
        if (type === 'email') { 
            icon = '<i class="fa-solid fa-envelope text-4xl"></i>'; 
            iconColor = 'text-[#00a884]'; 
        } else if (type === 'media') { 
            icon = item.isVideo ? '<i class="fa-solid fa-video text-4xl"></i>' : '<i class="fa-solid fa-image text-4xl"></i>'; 
            iconColor = 'text-green-400'; 
        }

        let glowClass = item.unread 
            ? 'border-[#00a884] shadow-[0_0_15px_rgba(0,168,132,0.6)] bg-[#1a2938]' 
            : 'border-[#2a3942] bg-[#111b21]';
            
        let textBold = item.unread ? 'text-white font-bold' : 'text-[#e9edef]';
        let safeTitle = (item.title || item.subject || 'File').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        // Правильное отображение времени из Firebase
        let subtitle = item.date || item.size || 'Saved Item';
        if (item.timestamp) {
            const d = new Date(item.timestamp);
            subtitle = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }

        let sender = item.sender || item.from || 'System';
        let clickAction = type === 'email' ? `onclick="window.viewSpecificEmail('${item.id}')"` : '';

        let domItem = document.createElement('div');
        domItem.id = item.id;
        domItem.className = `flex items-center gap-3 p-2 rounded-2xl mb-3 border border-transparent transition relative`;
        
        domItem.innerHTML = `
            <div class="relative w-24 h-24 shrink-0 rounded-xl border flex items-center justify-center transition cursor-pointer overflow-hidden ${glowClass}" ${clickAction}>
                <div class="${iconColor} pr-3">${icon}</div>
                
                <button onclick="window.openArchiveActionMenu(event, '${item.id}', '${safeTitle}', '${type}')" class="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center text-[#8696a0] hover:text-white hover:bg-black/30 transition z-[100]">
                    <i class="fa-solid fa-ellipsis-vertical text-xl"></i>
                </button>
            </div>
            
            <div class="flex flex-col flex-1 overflow-hidden cursor-pointer pl-1" ${clickAction}>
                <div class="flex justify-between items-center w-full mb-1">
                    <span class="text-[0.75rem] text-[#00a884] font-bold truncate max-w-[70%] uppercase tracking-wider">${sender}</span>
                    <span class="text-[0.7rem] text-[#8696a0] font-mono">${subtitle}</span>
                </div>
                <span class="${textBold} text-[0.95rem] truncate w-full leading-tight">${safeTitle}</span>
            </div>
        `;
        list.appendChild(domItem);
    });

    window.updateTopTabsGlow(); 
};

window.viewSpecificEmail = function(id) {
    const email = window.mailArchiveDB.find(e => String(e.id) === String(id));
    if (!email) return;
    
    // Снимаем метку "Непрочитано" в Firebase с жесткой проверкой ошибок
    const myId = window.myProfileInfo?.id || localStorage.getItem('hf_active_user');
    const database = (typeof db !== 'undefined') ? db : (typeof firebase !== 'undefined' ? firebase.database() : null);
    
    if (myId && myId !== 'guest' && database) {
        database.ref('emails/' + myId + '/' + id).update({ unread: false })
        .catch(err => {
            alert("Ошибка сервера при сохранении статуса прочтения: " + err.message);
        });
    }

    email.unread = false;
    window.renderArchiveList('email', window.mailArchiveDB);
    
    const subEl = document.getElementById('email-read-subject');
    if(subEl) subEl.innerText = email.subject || 'No Subject';
    const fromEl = document.getElementById('email-read-from');
    if(fromEl) fromEl.innerText = email.from || 'Unknown';
    
    let displayDate = email.date || '';
    if (email.timestamp) {
        const d = new Date(email.timestamp);
        displayDate = d.toLocaleString();
    }
    const dateEl = document.getElementById('email-read-date');
    if(dateEl) dateEl.innerText = displayDate;
    
    let bodyText = email.text || email.body || 'Empty message';
    const bodyEl = document.getElementById('email-read-body');
    if(bodyEl) bodyEl.innerHTML = bodyText.replace(/\n/g, '<br>');

    const actionBtn = document.getElementById('email-read-action-btn');
    if (actionBtn) {
        let safeSubject = (email.subject || 'No Subject').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        actionBtn.onclick = (e) => window.openArchiveActionMenu(e, email.id, safeSubject, 'email');
    }
    
    const lView = document.getElementById('email-list-view');
    if(lView) lView.classList.add('hidden');
    const rView = document.getElementById('email-reader-view');
    if(rView) { rView.classList.remove('hidden'); rView.classList.add('flex'); }
};

window.backToEmailList = function() {
    const rView = document.getElementById('email-reader-view');
    if(rView) { rView.classList.add('hidden'); rView.classList.remove('flex'); }
    const lView = document.getElementById('email-list-view');
    if(lView) lView.classList.remove('hidden');
};

window.openArchiveActionMenu = function(e, itemId, itemTitle, itemType) {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    let itemContent = "No content available.";
    let fileUrl = null;

    if (itemType === 'email' && window.mailArchiveDB) {
        let mail = window.mailArchiveDB.find(m => String(m.id) === String(itemId));
        if (mail) itemContent = mail.text || mail.body || "";
    } else if (itemType === 'doc' && window.docsArchiveDB) {
        let doc = window.docsArchiveDB.find(d => String(d.id) === String(itemId));
        if (doc) { itemContent = doc.content || "Document Data"; fileUrl = doc.url || doc.mediaUrl; }
    } else if (itemType === 'media' && window.mediaArchiveDB) {
        let media = window.mediaArchiveDB.find(m => String(m.id) === String(itemId));
        if (media) { itemContent = "Media File"; fileUrl = media.url || media.mediaUrl; }
    }

    window.currentArchiveItem = { id: itemId, title: itemTitle, content: itemContent, type: itemType, url: fileUrl };

    const modal = document.getElementById('archive-action-modal');
    const contentBox = document.getElementById('archive-action-content');
    if (!modal || !contentBox) return;
    const titleEl = document.getElementById('action-modal-title');
    if (titleEl) titleEl.innerText = itemTitle || "File Action";
    
    const phoneScreen = document.querySelector('.mobile-screen') || document.querySelector('#phone-body') || document.body;
    if (modal.parentElement !== phoneScreen) phoneScreen.appendChild(modal);
    modal.classList.remove('fixed'); modal.classList.add('absolute');
    
    modal.classList.remove('hidden'); modal.classList.add('flex');
    setTimeout(() => { contentBox.classList.remove('translate-y-full'); }, 10);
};

window.closeArchiveActionMenu = function() {
    const modal = document.getElementById('archive-action-modal');
    const contentBox = document.getElementById('archive-action-content');
    if(contentBox) contentBox.classList.add('translate-y-full');
    setTimeout(() => { if(modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); } }, 300);
};

window.archiveAction = function(actionType) {
    if (!window.currentArchiveItem) return;
    const { id, content, type, url, title } = window.currentArchiveItem;

    if (actionType === 'delete') {
        const myId = window.myProfileInfo?.id || localStorage.getItem('hf_active_user');
        const database = (typeof db !== 'undefined') ? db : (typeof firebase !== 'undefined' ? firebase.database() : null);

        if (type === 'email' && window.mailArchiveDB) { 
            // 1. Убираем письмо с экрана локально
            window.mailArchiveDB = window.mailArchiveDB.filter(i => String(i.id) !== String(id)); 
            window.renderArchiveList('email', window.mailArchiveDB); 
            
            // 2. Уничтожаем в Firebase с жесткой проверкой ошибок
            if (myId && myId !== 'guest' && database) {
                database.ref('emails/' + myId + '/' + id).remove()
                .then(() => console.log("Письмо успешно удалено из базы"))
                .catch(err => {
                    alert("ВНИМАНИЕ! База данных отклонила удаление. Причина: " + err.message);
                });
            }

            const readerView = document.getElementById('email-reader-view');
            if (readerView && !readerView.classList.contains('hidden') && window.backToEmailList) { window.backToEmailList(); }
        }
        else if (type === 'doc' && window.docsArchiveDB) { 
            window.docsArchiveDB = window.docsArchiveDB.filter(i => String(i.id) !== String(id)); 
            window.renderArchiveList('doc', window.docsArchiveDB); 
        }
        else if (type === 'media' && window.mediaArchiveDB) { 
            window.mediaArchiveDB = window.mediaArchiveDB.filter(i => String(i.id) !== String(id)); 
            window.renderArchiveList('media', window.mediaArchiveDB); 
        }
        
        const domItem = document.getElementById(id); if (domItem) domItem.remove();
        if (window.showToast) window.showToast("Deleted", "Item removed", "", "");

    } else if (actionType === 'copy') {
        navigator.clipboard.writeText(content).then(() => { if (window.showToast) window.showToast("Copied", "Copied to clipboard", "", ""); });
    } else if (actionType === 'save') {
        if (url) {
            const a = document.createElement('a'); a.href = url; a.download = title || 'downloaded_file';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        } else {
            const blob = new Blob([content], { type: 'text/plain' });
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = blobUrl; a.download = `${type}_${id}.txt`;
            document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(blobUrl);
        }
        if (window.showToast) window.showToast("Saved", "Downloaded to device", "", "");
    }
    window.closeArchiveActionMenu();
};

window.smartArchive = function() {
    if (window.showToast) window.showToast("Notice", "Chat backup is disabled.", "", "");
    if (window.closeTrashModal) window.closeTrashModal(); 
};

// --- СЛУШАТЕЛЬ FIREBASE (ЧИТАЕМ ИЗ ПРАВИЛЬНОГО УЗЛА EMAILS) ---
function connectMailListener() {
    const myId = window.myProfileInfo?.id || localStorage.getItem('hf_active_user');
    if (!myId || myId === 'guest') return;

    const database = (typeof db !== 'undefined') ? db : (typeof firebase !== 'undefined' ? firebase.database() : null);
    
    if (database) {
        database.ref('emails/' + myId).on('value', (snapshot) => {
            const data = snapshot.val();
            window.mailArchiveDB = [];
            
            if (data) {
                Object.keys(data).forEach(key => {
                    let mailItem = data[key];
                    mailItem.id = key; 
                    // Если поле unread не существует, ставим true (новое письмо)
                    if (mailItem.unread === undefined) mailItem.unread = true;
                    window.mailArchiveDB.push(mailItem);
                });
                
                // Сортировка: новые письма сверху
                window.mailArchiveDB.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            }
            
            if (window.currentArchiveTab === 'mail' && window.renderArchiveList) {
                window.renderArchiveList('email', window.mailArchiveDB);
            }
            if (window.updateTopTabsGlow) window.updateTopTabsGlow(); 
        });
    } else {
        setTimeout(connectMailListener, 500);
    }
}

// Запускаем слушатель с задержкой, чтобы профиль юзера успел загрузиться
setTimeout(connectMailListener, 2000);
        
window.closeArchiveAndGoToChat = function() {
    const archiveScreen = document.getElementById('archive') || document.getElementById('cloud-storage-screen');
    if (archiveScreen) {
        archiveScreen.classList.add('hidden');
        archiveScreen.style.display = 'none';
    }
    if (typeof window.switchTab === 'function') {
        window.switchTab(1); 
    }
};

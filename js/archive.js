// ==========================================
// MODULE: ARCHIVE & DATA CENTER (Email, Docs, Media)
// ==========================================

// --- 1. ОТПРАВКА ПОЧТЫ И АВТОСОХРАНЕНИЕ ---
window.sendEmailForm = function(event) {
    event.preventDefault();
    const to = document.getElementById('email-to').value.trim();
    const subject = document.getElementById('email-subject').value.trim();
    const text = document.getElementById('email-text').value.trim();

    const btn = document.querySelector('#email-form-element button[type="submit"]');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>...';

    setTimeout(() => {
        btn.innerHTML = origText;
        if (window.showToast) window.showToast("Success", "Email sent & archived!", "", "");
        document.getElementById('email-form-element').reset();
        if (window.closeEmailModal) window.closeEmailModal();

        window.mailArchiveDB = window.mailArchiveDB || [];
        let mailDate = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        let newMailId = 'mail_sent_' + Date.now();
        window.mailArchiveDB.unshift({
            id: newMailId, unread: false, date: mailDate, from: 'To: ' + to, subject: subject, text: text
        });
        
        if (window.currentArchiveTab === 'mail' && window.renderArchiveList) {
            window.renderArchiveList('email', window.mailArchiveDB);
        }
    }, 800);
};

// --- 2. ЛОГИКА АРХИВА И ВКЛАДОК ---
window.docsArchiveDB = window.docsArchiveDB || [];
window.mediaArchiveDB = window.mediaArchiveDB || [];
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
        let icon = '<i class="fa-solid fa-file"></i>';
        let iconColor = 'text-[#a29bfe]';
        
        if (type === 'email') { 
            icon = '<i class="fa-solid fa-at"></i>'; 
            iconColor = 'text-[#8696a0]'; 
        } else if (type === 'media') { 
            icon = item.isVideo ? '<i class="fa-solid fa-video"></i>' : '<i class="fa-solid fa-image"></i>'; 
            iconColor = 'text-green-400'; 
        }

        let bgClass = item.unread ? 'bg-[#202c33] border-[#3b82f6]/30' : 'bg-[#111b21] border-[#2a3942] opacity-80';
        let textBold = item.unread ? 'text-white font-bold' : 'text-[#e9edef]';
        let safeTitle = (item.title || item.subject || 'File').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        let subtitle = item.date || item.size || 'Saved Item';
        let sender = item.sender || item.from || 'System';
        let clickAction = type === 'email' ? `onclick="window.viewSpecificEmail('${item.id}')"` : '';
        
        let domItem = document.createElement('div');
        domItem.id = item.id;
        domItem.className = `flex items-center justify-between p-3 rounded-xl border hover:border-blue-400 transition shadow-sm ${bgClass} mb-2 relative`;
        
        domItem.innerHTML = `
            <div class="flex items-center gap-3 flex-1 overflow-hidden ${type==='email' ? 'cursor-pointer' : ''}" ${clickAction}>
                <div class="w-10 h-10 shrink-0 rounded-full bg-[#111b21] border border-[#2a3942] flex items-center justify-center ${iconColor}">${icon}</div>
                <div class="flex flex-col flex-1 overflow-hidden">
                    <div class="flex justify-between items-center w-full"><span class="text-xs text-[#8696a0] truncate max-w-[70%]">${sender}</span><span class="text-[0.65rem] text-[#8696a0] pr-2">${subtitle}</span></div>
                    <span class="${textBold} text-sm truncate w-full mt-0.5">${safeTitle}</span>
                </div>
            </div>
            <button onclick="window.openArchiveActionMenu(event, '${item.id}', '${safeTitle}', '${type}')" class="text-[#8696a0] hover:text-white transition p-2 text-xl shrink-0 ml-1 relative z-[100]">
                <i class="fa-solid fa-ellipsis-vertical pointer-events-none"></i>
            </button>
        `;
        list.appendChild(domItem);
    });
};

window.viewSpecificEmail = function(id) {
    const email = window.mailArchiveDB.find(e => String(e.id) === String(id));
    if (!email) return;
    email.unread = false;
    window.renderArchiveList('email', window.mailArchiveDB);
    
    const subEl = document.getElementById('email-read-subject');
    if(subEl) subEl.innerText = email.subject || 'No Subject';
    const fromEl = document.getElementById('email-read-from');
    if(fromEl) fromEl.innerText = email.from || 'Unknown';
    const dateEl = document.getElementById('email-read-date');
    if(dateEl) dateEl.innerText = email.date || '';
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

// --- 3. ТРИ ТОЧКИ (ДЕЙСТВИЯ) ---
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
        if (type === 'email' && window.mailArchiveDB) { 
            window.mailArchiveDB = window.mailArchiveDB.filter(i => String(i.id) !== String(id)); 
            window.renderArchiveList('email', window.mailArchiveDB); 
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

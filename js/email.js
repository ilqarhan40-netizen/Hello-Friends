// --- EMAIL СИСТЕМА (Авто-поиск ID по визитке/профилю, Архив Входящие/Отправленные, Офлайн-доставка, i18n 13 языков и Верхний Баннер) ---

window._emailDirectTargetId = null;
window._emailDirectTargetEmail = '';
window._mailBannerQueue = window._mailBannerQueue || [];
window.mailArchiveDB = Array.isArray(window.mailArchiveDB) ? window.mailArchiveDB : [];
window._mailArchiveFolder = window._mailArchiveFolder || 'inbox';
window._isMailArchiveViewActive = false;

window._EMAIL_BANNER_DICT = {
    ru: { new_mail_title: 'НОВОЕ ПИСЬМО', new_mail_from: 'Новое письмо от', btn_skip: 'Пропустить', btn_open_mail: 'Перейти в письмо', email_sending: 'Отправка...', email_success: 'Отправлено! ✔️', email_failed: 'Ошибка ❌', attached: 'Прикреплено!', file_uploaded: 'Файл загружен.', folder_inbox: 'Входящие', folder_sent: 'Отправленные', empty_inbox: 'Во входящих пока пусто.', empty_sent: 'Отправленных писем пока нет.', to_label: 'Кому:' },
    en: { new_mail_title: 'NEW EMAIL', new_mail_from: 'New email from', btn_skip: 'Skip', btn_open_mail: 'Open email', email_sending: 'Sending...', email_success: 'Success! ✔️', email_failed: 'Failed ❌', attached: 'Attached!', file_uploaded: 'File securely uploaded.', folder_inbox: 'Inbox', folder_sent: 'Sent', empty_inbox: 'Inbox is empty.', empty_sent: 'No sent emails yet.', to_label: 'To:' },
    az: { new_mail_title: 'YENİ MƏKTUB', new_mail_from: 'Yeni məktub:', btn_skip: 'Keç', btn_open_mail: 'Məktuba keç', email_sending: 'Göndərilir...', email_success: 'Göndərildi! ✔️', email_failed: 'Xəta ❌', attached: 'Əlavə edildi!', file_uploaded: 'Fayl yükləndi.', folder_inbox: 'Gələnlər', folder_sent: 'Göndərilənlər', empty_inbox: 'Gələnlər qutusu boşdur.', empty_sent: 'Göndərilmiş məktub yoxdur.', to_label: 'Kimə:' },
    tr: { new_mail_title: 'YENİ E-POSTA', new_mail_from: 'Yeni e-posta:', btn_skip: 'Geç', btn_open_mail: 'E-postaya git', email_sending: 'Gönderiliyor...', email_success: 'Gönderildi! ✔️', email_failed: 'Hata ❌', attached: 'Eklendi!', file_uploaded: 'Dosya yüklendi.', folder_inbox: 'Gelenler', folder_sent: 'Gönderilenler', empty_inbox: 'Gelen kutusu boş.', empty_sent: 'Gönderilen e-posta yok.', to_label: 'Kime:' },
    de: { new_mail_title: 'NEUE E-MAIL', new_mail_from: 'Neue E-Mail von', btn_skip: 'Überspringen', btn_open_mail: 'Öffnen', email_sending: 'Wird gesendet...', email_success: 'Gesendet! ✔️', email_failed: 'Fehler ❌', attached: 'Angehängt!', file_uploaded: 'Datei hochgeladen.', folder_inbox: 'Eingang', folder_sent: 'Gesendet', empty_inbox: 'Posteingang ist leer.', empty_sent: 'Noch keine gesendeten E-Mails.', to_label: 'An:' },
    kk: { new_mail_title: 'ЖАҢА ХАТ', new_mail_from: 'Жаңа хат:', btn_skip: 'Өткізіп жіберу', btn_open_mail: 'Хатқа өту', email_sending: 'Жіберілуде...', email_success: 'Жіберілді! ✔️', email_failed: 'Қате ❌', attached: 'Тіркелді!', file_uploaded: 'Файл жүктелді.', folder_inbox: 'Кіріс', folder_sent: 'Жіберілгендер', empty_inbox: 'Кіріс хаттар жоқ.', empty_sent: 'Жіберілген хаттар жоқ.', to_label: 'Кімге:' },
    ar: { new_mail_title: 'بريد جديد', new_mail_from: 'رسالة جديدة من', btn_skip: 'تخطي', btn_open_mail: 'فتح الرسالة', email_sending: 'جارٍ الإرسال...', email_success: 'تم الإرسال! ✔️', email_failed: 'فشل ❌', attached: 'تم الإرفاق!', file_uploaded: 'تم رفع الملف.', folder_inbox: 'الوارد', folder_sent: 'المرسل', empty_inbox: 'صندوق الوارد فارغ.', empty_sent: 'لا توجد رسائل مرسلة.', to_label: 'إلى:' },
    it: { new_mail_title: 'NUOVA EMAIL', new_mail_from: 'Nuova email da', btn_skip: 'Salta', btn_open_mail: 'Apri email', email_sending: 'Invio...', email_success: 'Inviata! ✔️', email_failed: 'Errore ❌', attached: 'Allegato!', file_uploaded: 'File caricato.', folder_inbox: 'In arrivo', folder_sent: 'Inviate', empty_inbox: 'Nessuna email ricevuta.', empty_sent: 'Nessuna email inviata.', to_label: 'A:' },
    es: { new_mail_title: 'NUEVO CORREO', new_mail_from: 'Nuevo correo de', btn_skip: 'Omitir', btn_open_mail: 'Ir al correo', email_sending: 'Enviando...', email_success: '¡Enviado! ✔️', email_failed: 'Error ❌', attached: '¡Adjuntado!', file_uploaded: 'Archivo subido.', folder_inbox: 'Recibidos', folder_sent: 'Enviados', empty_inbox: 'Bandeja de entrada vacía.', empty_sent: 'No hay correos enviados.', to_label: 'Para:' },
    fr: { new_mail_title: 'NOUVEL E-MAIL', new_mail_from: 'Nouvel e-mail de', btn_skip: 'Ignorer', btn_open_mail: 'Ouvrir', email_sending: 'Envoi...', email_success: 'Envoyé ! ✔️', email_failed: 'Échec ❌', attached: 'Joint !', file_uploaded: 'Fichier téléchargé.', folder_inbox: 'Reçus', folder_sent: 'Envoyés', empty_inbox: 'Boîte de réception vide.', empty_sent: 'Aucun e-mail envoyé.', to_label: 'À :' },
    pt: { new_mail_title: 'NOVO E-MAIL', new_mail_from: 'Novo e-mail de', btn_skip: 'Pular', btn_open_mail: 'Abrir e-mail', email_sending: 'Enviando...', email_success: 'Enviado! ✔️', email_failed: 'Erro ❌', attached: 'Anexado!', file_uploaded: 'Arquivo enviado.', folder_inbox: 'Recebidos', folder_sent: 'Enviados', empty_inbox: 'Caixa de entrada vazia.', empty_sent: 'Nenhum e-mail enviado.', to_label: 'Para:' },
    ja: { new_mail_title: '新着メール', new_mail_from: '新着メール:', btn_skip: 'スキップ', btn_open_mail: 'メールを開く', email_sending: '送信中...', email_success: '送信完了! ✔️', email_failed: '失敗 ❌', attached: '添付完了!', file_uploaded: 'アップロード完了。', folder_inbox: '受信トレイ', folder_sent: '送信済み', empty_inbox: '受信メールはありません。', empty_sent: '送信メールはありません。', to_label: '宛先:' },
    zh: { new_mail_title: '新邮件', new_mail_from: '新邮件来自', btn_skip: '跳过', btn_open_mail: '查看邮件', email_sending: '发送中...', email_success: '已发送! ✔️', email_failed: '失败 ❌', attached: '已附加!', file_uploaded: '文件已上传。', folder_inbox: '收件箱', folder_sent: '已发送', empty_inbox: '收件箱为空。', empty_sent: '暂无已发送邮件。', to_label: '收件人:' }
};

window._getMailDb = function() {
    if (typeof db !== 'undefined' && db) return db;
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) return firebase.database();
    return null;
};

window._sanitizeEmailKey = function(email) {
    return String(email || '').trim().toLowerCase().replace(/[.#$\[\]\/]/g, ',');
};

window._formatMailDate = function(ts) {
    const d = ts ? new Date(ts) : new Date();
    if (isNaN(d.getTime())) return new Date().toLocaleDateString();
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Глубокое извлечение всех email-адресов из любого объекта профиля / визитки (на любой глубине)
window._extractEmailsFromObj = function(obj, depth = 0, out = new Set()) {
    if (!obj || depth > 5) return out;
    if (typeof obj === 'string') {
        const matches = obj.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if (matches) {
            matches.forEach(m => out.add(m.trim().toLowerCase()));
        }
        return out;
    }
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            window._extractEmailsFromObj(obj[i], depth + 1, out);
        }
        return out;
    }
    if (typeof obj === 'object') {
        const keys = Object.keys(obj);
        for (let i = 0; i < keys.length; i++) {
            window._extractEmailsFromObj(obj[keys[i]], depth + 1, out);
        }
    }
    return out;
};

window._objMatchesEmail = function(obj, targetEmailLower) {
    if (!obj || !targetEmailLower) return false;
    const found = window._extractEmailsFromObj(obj);
    return found.has(targetEmailLower);
};

window.openEmailModal = function() {
    if (window.closeDropdown) window.closeDropdown();
    const modal = document.getElementById('email-modal');
    if (modal) modal.classList.add('active');
};

window.openDirectEmail = function(email, targetUserId = null) {
    window.openEmailModal();
    const cleanEmail = String(email || '').trim();
    const toInput = document.getElementById('email-to');
    if (toInput && cleanEmail) toInput.value = cleanEmail;

    window._emailDirectTargetEmail = cleanEmail.toLowerCase();
    if (targetUserId) {
        window._emailDirectTargetId = String(targetUserId);
    } else if (cleanEmail) {
        const found = (window.participants || []).find(p =>
            p && p.id && p.id !== 'ai' && window._objMatchesEmail(p, cleanEmail.toLowerCase())
        );
        window._emailDirectTargetId = found ? String(found.id) : null;
    } else {
        window._emailDirectTargetId = null;
    }
};

// Автоматический поиск уникального ID получателя по email (визитка / участники / Firebase)
window.resolveEmailTargetId = async function(toEmail, database) {
    const cleanLower = String(toEmail || '').trim().toLowerCase();
    const safeFallback = window._sanitizeEmailKey(cleanLower);
    if (!cleanLower) return safeFallback;

    // 1. Быстрый глубокий поиск среди всех загруженных участников (учитывает любые поля визитки)
    const fromParticipants = (window.participants || []).find(p => {
        if (!p || !p.id || p.id === 'ai') return false;
        if (String(p.id).toLowerCase() === cleanLower) return true;
        return window._objMatchesEmail(p, cleanLower);
    });
    if (fromParticipants && fromParticipants.id) {
        return String(fromParticipants.id);
    }

    // 2. Проверка собственного профиля (если отправляем письмо на свой же email)
    if (window.myProfileInfo && window.myProfileInfo.id && window._objMatchesEmail(window.myProfileInfo, cleanLower)) {
        return String(window.myProfileInfo.id);
    }

    // 3. Сохранённый ID, если письмо открыли из визитки через openDirectEmail
    if (window._emailDirectTargetId && window._emailDirectTargetEmail === cleanLower) {
        return String(window._emailDirectTargetId);
    }

    // 4. Глубокий поиск по Firebase (users + резервные ветки визиток/профилей)
    if (database) {
        const branches = ['users', 'profiles', 'cards', 'business_cards', 'cv'];
        for (let i = 0; i < branches.length; i++) {
            try {
                const snap = await database.ref(branches[i]).once('value');
                if (!snap || !snap.exists()) continue;
                let matchedId = null;
                snap.forEach(child => {
                    if (matchedId) return;
                    const val = child.val();
                    if (!val) return;
                    if (String(child.key).toLowerCase() === cleanLower || window._objMatchesEmail(val, cleanLower)) {
                        matchedId = String(val.uid || val.userId || val.id || child.key);
                    }
                });
                if (matchedId) return matchedId;
            } catch (err) {
                // Ветка может отсутствовать или быть закрыта правилами — идём дальше
            }
        }
    }

    // 5. Резервный ключ по нормализованному email
    return safeFallback;
};

window.handleEmailAttachment = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const textEl = document.getElementById('email-text');
    textEl.value += `\n[Uploading ${file.name}...]`;
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result;
        const database = window._getMailDb();
        if (!database) return;
        const newRef = database.ref('email_attachments').push();
        newRef.set({
            name: file.name,
            data: base64Data,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            textEl.value = textEl.value.replace(
                `\n[Uploading ${file.name}...]`,
                `\n📎 Attachment Link: https://secure-cloud.hf/file/${newRef.key}`
            );
            const dict = window.getEmailBannerI18n();
            if (window.showToast) {
                window.showToast(dict.attached || 'Attached!', dict.file_uploaded || 'File securely uploaded.', '', '');
            }
        });
    };
    reader.readAsDataURL(file);
};

// ==========================================
// АРХИВ ПОЧТЫ: ВХОДЯЩИЕ И ОТПРАВЛЕННЫЕ
// ==========================================
window._upsertMailItem = function(item) {
    if (!item || !item.id) return;
    window.mailArchiveDB = Array.isArray(window.mailArchiveDB) ? window.mailArchiveDB : [];
    const idx = window.mailArchiveDB.findIndex(m => m && String(m.id) === String(item.id));
    if (idx >= 0) {
        window.mailArchiveDB[idx] = Object.assign({}, window.mailArchiveDB[idx], item);
    } else {
        window.mailArchiveDB.unshift(item);
    }
    window.mailArchiveDB.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
};

window._updateMailUnreadBadges = function() {
    const inboxItems = (window.mailArchiveDB || []).filter(m => m && m.folder !== 'sent');
    const unreadCount = inboxItems.filter(m => Boolean(m.unread)).length;

    const badgeEl = document.getElementById('mail-badge');
    const archiveMenuBadge = document.getElementById('archive-unread-badge');
    if (badgeEl) {
        if (unreadCount > 0) badgeEl.classList.remove('hidden');
        else badgeEl.classList.add('hidden');
    }
    if (archiveMenuBadge) {
        if (unreadCount > 0) archiveMenuBadge.classList.remove('hidden');
        else archiveMenuBadge.classList.add('hidden');
    }
    return unreadCount;
};

window.switchMailFolder = function(folder) {
    window._mailArchiveFolder = (folder === 'sent') ? 'sent' : 'inbox';
    window._hfRenderEmailArchive();
};

window._hfRenderEmailArchive = function() {
    window._isMailArchiveViewActive = true;
    const list = document.getElementById('archive-list');
    const unreadCount = window._updateMailUnreadBadges();
    if (!list) return;

    const d = window.getEmailBannerI18n();
    const currentFolder = window._mailArchiveFolder || 'inbox';

    const inboxItems = (window.mailArchiveDB || []).filter(m => m && m.folder !== 'sent');
    const sentItems = (window.mailArchiveDB || []).filter(m => m && m.folder === 'sent');
    const visibleItems = (currentFolder === 'sent') ? sentItems : inboxItems;

    const inboxBtnClass = currentFolder === 'inbox'
        ? 'bg-[#00a884] text-[#111b21] shadow-sm'
        : 'bg-[#202c33] text-[#8696a0] hover:text-white';
    const sentBtnClass = currentFolder === 'sent'
        ? 'bg-[#00a884] text-[#111b21] shadow-sm'
        : 'bg-[#202c33] text-[#8696a0] hover:text-white';

    list.innerHTML = `
        <div id="hf-mail-folder-tabs" class="flex gap-2 mb-3">
            <button type="button" onclick="window.switchMailFolder('inbox')" class="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${inboxBtnClass}">
                <i class="fa-solid fa-inbox"></i>
                <span>${window._escapeEmailHtml(d.folder_inbox || 'Inbox')}</span>
                ${unreadCount > 0 ? `<span class="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[0.65rem] leading-none">${unreadCount}</span>` : `<span class="opacity-75 text-[0.7rem]">(${inboxItems.length})</span>`}
            </button>
            <button type="button" onclick="window.switchMailFolder('sent')" class="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${sentBtnClass}">
                <i class="fa-solid fa-paper-plane"></i>
                <span>${window._escapeEmailHtml(d.folder_sent || 'Sent')}</span>
                <span class="opacity-75 text-[0.7rem]">(${sentItems.length})</span>
            </button>
        </div>
    `;

    if (visibleItems.length === 0) {
        const emptyText = currentFolder === 'sent'
            ? (d.empty_sent || 'No sent emails yet.')
            : (d.empty_inbox || 'Inbox is empty.');
        list.innerHTML += `<p class="text-center text-sm text-[#8696a0] mt-6">${window._escapeEmailHtml(emptyText)}</p>`;
        return;
    }

    visibleItems.forEach(mail => {
        const isSent = mail.folder === 'sent';
        const isUnread = !isSent && Boolean(mail.unread);
        const unreadDot = isUnread
            ? `<div class="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)] shrink-0"></div>`
            : ``;
        const bgClass = isUnread ? 'bg-[#202c33] border-[#3b82f6]/40' : 'bg-[#111b21] border-[#2a3942] opacity-90';
        const textBold = isUnread ? 'text-white font-bold' : 'text-[#e9edef]';
        const safeSubject = String(mail.subject || 'No Subject').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const dateLabel = mail.date || window._formatMailDate(mail.timestamp);

        const senderLabel = isSent
            ? `${d.to_label || 'To:'} ${mail.to || String(mail.from || '').replace(/^To:\s*/i, '')}`
            : `${mail.fromFlag ? mail.fromFlag + ' ' : ''}${mail.from || 'System'}`;

        const iconHtml = (!isSent && mail.fromPhoto)
            ? `<img src="${window._escapeEmailHtml(mail.fromPhoto)}" class="w-10 h-10 shrink-0 rounded-full object-cover border border-[#2a3942]">`
            : `<div class="w-10 h-10 shrink-0 rounded-full bg-[#111b21] border border-[#2a3942] flex items-center justify-center text-[#8696a0]">
                   <i class="fa-solid ${isSent ? 'fa-paper-plane text-[#00a884]' : 'fa-envelope text-blue-400'}"></i>
               </div>`;

        const item = document.createElement('div');
        item.id = mail.id;
        item.className = `flex items-center justify-between p-3 rounded-xl border hover:border-[#00a884] transition shadow-sm ${bgClass} mb-2 relative`;
        item.innerHTML = `
            <div class="flex items-center gap-3 flex-1 overflow-hidden cursor-pointer" onclick="window.viewSpecificEmail('${mail.id}')">
                ${iconHtml}
                <div class="flex flex-col flex-1 overflow-hidden">
                    <div class="flex justify-between items-center w-full gap-2">
                        <span class="text-xs text-[#8696a0] truncate">${window._escapeEmailHtml(senderLabel)}</span>
                        <span class="text-[0.65rem] text-[#8696a0] shrink-0">${window._escapeEmailHtml(dateLabel)}</span>
                    </div>
                    <span class="${textBold} text-sm truncate w-full mt-0.5">${window._escapeEmailHtml(mail.subject || 'No Subject')}</span>
                </div>
                ${unreadDot}
            </div>
            <button onclick="window.openArchiveActionMenu(event, '${mail.id}', '${safeSubject}', 'email')" class="text-[#8696a0] hover:text-white transition p-2 text-xl shrink-0 ml-1 relative z-[100]">
                <i class="fa-solid fa-ellipsis-vertical pointer-events-none"></i>
            </button>
        `;
        list.appendChild(item);
    });
};

window.renderEmailArchive = window._hfRenderEmailArchive;

// Хук на переключение вкладок архива и просмотр письма (независимо от порядка загрузки скриптов)
window._bindMailArchiveHooks = function() {
    window.renderEmailArchive = window._hfRenderEmailArchive;

    if (typeof window.switchArchiveTab === 'function' && !window.switchArchiveTab._hfMailWrapped) {
        const origSwitch = window.switchArchiveTab;
        const wrappedSwitch = function(tab) {
            window._isMailArchiveViewActive = (tab === 'mail' || tab === 'email');
            const res = origSwitch.apply(this, arguments);
            if (window._isMailArchiveViewActive) {
                window._hfRenderEmailArchive();
            }
            return res;
        };
        wrappedSwitch._hfMailWrapped = true;
        window.switchArchiveTab = wrappedSwitch;
    }

    if (typeof window.viewSpecificEmail === 'function' && !window.viewSpecificEmail._hfMailWrapped) {
        const origView = window.viewSpecificEmail;
        const wrappedView = function(id) {
            const mail = (window.mailArchiveDB || []).find(e => e && String(e.id) === String(id));
            if (mail && mail.unread && mail.folder !== 'sent') {
                mail.unread = false;
                const database = window._getMailDb();
                if (database && mail.dbPath) {
                    database.ref(mail.dbPath + '/unread').set(false).catch(() => {});
                } else if (database && window.myProfileInfo?.id) {
                    database.ref('emails/' + window.myProfileInfo.id + '/' + id + '/unread').set(false).catch(() => {});
                }
                window._updateMailUnreadBadges();
                if (window._isMailArchiveViewActive) window._hfRenderEmailArchive();
            }
            return origView.apply(this, arguments);
        };
        wrappedView._hfMailWrapped = true;
        window.viewSpecificEmail = wrappedView;
    }
};

window.addEventListener('load', () => {
    window._bindMailArchiveHooks();
    setTimeout(window._bindMailArchiveHooks, 800);
});

window.sendEmailForm = function(e) {
    e.preventDefault();

    const dict = window.getEmailBannerI18n();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalHTML = btn.innerHTML;

    btn.innerText = dict.email_sending || 'Sending...';
    btn.classList.add('animate-pulse');

    const to = document.getElementById('email-to').value.trim();
    const subj = document.getElementById('email-subject').value.trim();
    const text = document.getElementById('email-text').value.trim();
    const templateParams = {
        to_email: to,
        subject: subj,
        message: text,
        from_name: window.myUsername || 'User'
    };

    // 1. Отправка через EmailJS
    emailjs.send("service_9pdd32d", "template_slxkkuk", templateParams, "NXn0TeAF95L5qScxO").then(async function() {

        // 2. Firebase (Входящие получателя, Отправленные отправителя и Верхний Баннер по ID)
        try {
            const database = window._getMailDb();
            const myId = String(window.myProfileInfo?.id || localStorage.getItem('hf_active_user') || '');
            const targetId = await window.resolveEmailTargetId(to, database);

            console.log('[Email] Delivered in Firebase to targetId:', targetId, 'for email:', to);

            if (database) {
                // А. Сохраняем письмо во ВХОДЯЩИЕ получателя по его уникальному ID
                const inboxRef = database.ref('emails/' + targetId).push();
                await inboxRef.set({
                    folder: 'inbox',
                    to: to,
                    from: window.myUsername || window.myProfileInfo?.name || 'User',
                    fromId: myId,
                    fromPhoto: window.myProfileInfo?.photo || '',
                    fromFlag: window.myProfileInfo?.flag || '',
                    subject: subj,
                    text: text,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    unread: true
                });

                // Б. Сохраняем копию в ОТПРАВЛЕННЫЕ себе (даже при тестовой отправке на свой же email)
                if (myId && myId !== 'guest') {
                    const sentRef = database.ref('emails/' + myId).push();
                    const sentPayload = {
                        folder: 'sent',
                        to: to,
                        from: 'To: ' + to,
                        toId: String(targetId),
                        subject: subj,
                        text: text,
                        timestamp: firebase.database.ServerValue.TIMESTAMP,
                        unread: false
                    };
                    await sentRef.set(sentPayload);

                    // Сразу добавляем в локальный архив «Отправленные», не дожидаясь задержки сети
                    window._upsertMailItem({
                        id: sentRef.key,
                        dbPath: 'emails/' + myId + '/' + sentRef.key,
                        folder: 'sent',
                        to: to,
                        from: 'To: ' + to,
                        subject: subj || 'No Subject',
                        text: text || '',
                        timestamp: Date.now(),
                        date: window._formatMailDate(Date.now()),
                        unread: false
                    });
                    if (window._isMailArchiveViewActive) window._hfRenderEmailArchive();
                }

                // В. Кладём уведомление в mail_notifications/{targetId} — дождётся получателя даже офлайн
                await database.ref('mail_notifications/' + targetId).push({
                    mailId: inboxRef.key,
                    fromId: myId,
                    from: window.myUsername || window.myProfileInfo?.name || 'User',
                    fromFlag: window.myProfileInfo?.flag || '',
                    fromPhoto: window.myProfileInfo?.photo || '',
                    subject: subj,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });

                // Г. Внешний push (если подключён)
                if (typeof window.sendPushNotification === 'function' && String(myId) !== String(targetId)) {
                    try {
                        window.sendPushNotification(
                            targetId,
                            { type: 'email', mailId: inboxRef.key, fromName: window.myUsername || 'User' },
                            '📧 ' + (dict.new_mail_title || 'NEW EMAIL'),
                            `${window.myUsername || 'User'}${subj ? ': ' + subj : ''}`
                        );
                    } catch (pushErr) {}
                }
            }
        } catch (err) {
            console.error('Firebase mail notify failed:', err);
        }

        window._emailDirectTargetId = null;
        window._emailDirectTargetEmail = '';

        btn.classList.remove('animate-pulse');
        btn.innerText = dict.email_success || 'Success! ✔️';
        btn.style.background = '#00a884';
        btn.style.color = '#111b21';

        setTimeout(() => {
            document.getElementById('email-form-element')?.reset();
            btn.innerHTML = originalHTML;
            btn.style.background = '';
            btn.style.color = '';
            document.getElementById('email-modal')?.classList.remove('active');
        }, 2000);
    }, function(error) {
        btn.classList.remove('animate-pulse');
        btn.innerText = dict.email_failed || 'Failed ❌';
        btn.style.background = '#ef4444';
        setTimeout(() => { btn.innerHTML = originalHTML; btn.style.background = ''; }, 3000);
        alert('EmailJS Error: ' + JSON.stringify(error));
    });
};

// ==========================================
// ОТДЕЛЬНЫЙ ВЕРХНИЙ БАННЕР НОВОГО ПИСЬМА (1-в-1 СТИЛЬ ПРОПУЩЕННЫХ ВЫЗОВОВ)
// ==========================================
window.getEmailBannerI18n = function() {
    const fix = { kz: 'kk', cn: 'zh', jp: 'ja', ae: 'ar', sa: 'ar', eg: 'ar', gb: 'en', us: 'en', uk: 'en', br: 'pt', mx: 'es' };
    const norm = (v) => {
        if (!v) return '';
        const s = String(v).trim().toLowerCase();
        if (!s || s === 'auto' || s === 'un') return '';
        const b = s.split(/[-_]/)[0].substring(0, 2);
        return fix[b] || b;
    };

    const eco = norm(window.appLang) || norm(localStorage.getItem('hf_app_lang'));
    const prof = (typeof window.getSmartLang === 'function' && window.myProfileInfo)
        ? norm(window.getSmartLang(window.myProfileInfo))
        : '';
    const code = (eco && window._EMAIL_BANNER_DICT[eco])
        ? eco
        : ((prof && window._EMAIL_BANNER_DICT[prof]) ? prof : 'en');

    const localDict = window._EMAIL_BANNER_DICT[code] || window._EMAIL_BANNER_DICT.en;
    const globalDict = (window.i18n && (window.i18n[code] || window.i18n.en)) || {};
    return Object.assign({}, globalDict, localDict);
};

window._escapeEmailHtml = function(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};

window.enqueueNewMailBanner = function(dbKey, data, notifyPath) {
    if (!data) return;
    if (window._activeNewMailBanner) {
        window._mailBannerQueue.push({ dbKey, data, notifyPath });
        return;
    }
    window.showNewMailBanner(dbKey, data, notifyPath);
};

window.showNewMailBanner = function(dbKey, data, notifyPath) {
    if (!data) return;
    const d = window.getEmailBannerI18n();

    let stack = document.getElementById('hf-top-banner-stack');
    if (!stack) {
        stack = document.createElement('div');
        stack.id = 'hf-top-banner-stack';
        stack.className = 'fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-sm flex flex-col gap-2.5 pointer-events-none';
        document.body.appendChild(stack);
    }

    let el = document.getElementById('hf-banner-new-mail');
    if (!el) {
        el = document.createElement('div');
        el.id = 'hf-banner-new-mail';
        el.className = 'pointer-events-auto bg-[#111b21]/95 backdrop-blur-md border border-[#00a884] rounded-2xl shadow-[0_0_24px_rgba(0,168,132,0.35)] p-3.5 flex flex-col gap-3';
        stack.appendChild(el);
    }

    const fromName = window._escapeEmailHtml((data.from || 'User').split(' ')[0]);
    const fromFlag = window._escapeEmailHtml(data.fromFlag || '');
    const subjText = window._escapeEmailHtml(data.subject || '');

    const title = window._escapeEmailHtml(d.new_mail_title || 'NEW EMAIL');
    const mainLine = `${fromFlag ? fromFlag + ' ' : ''}${window._escapeEmailHtml(d.new_mail_from || 'New email from')} ${fromName}`;
    const btnSkip = window._escapeEmailHtml(d.btn_skip || 'Skip');
    const btnOpen = window._escapeEmailHtml(d.btn_open_mail || 'Open email');

    window._activeNewMailBanner = {
        dbKey: dbKey || null,
        notifyPath: notifyPath || null,
        mailId: data.mailId || null
    };

    const avatarHtml = data.fromPhoto
        ? `<img src="${window._escapeEmailHtml(data.fromPhoto)}" class="w-11 h-11 rounded-full object-cover border-2 border-[#00a884] shrink-0">`
        : `<div class="w-11 h-11 rounded-full bg-[#202c33] border-2 border-[#00a884] flex items-center justify-center text-[#00a884] text-lg shrink-0"><i class="fa-solid fa-envelope"></i></div>`;

    el.innerHTML = `
        <div class="flex items-center gap-3">
            ${avatarHtml}
            <div class="flex flex-col overflow-hidden">
                <span class="text-[#00a884] text-[0.7rem] font-bold uppercase tracking-wider">${title}</span>
                <span class="text-white text-sm font-bold leading-snug truncate">${mainLine}</span>
                ${subjText ? `<span class="text-[#8696a0] text-xs truncate">${subjText}</span>` : ''}
            </div>
        </div>
        <div class="flex gap-2.5 w-full">
            <button onclick="window.closeNewMailBanner(true)" class="flex-1 py-2.5 rounded-xl bg-[#2a3942] hover:bg-[#374a56] text-[#e9edef] text-xs font-bold transition">${btnSkip}</button>
            <button onclick="window.openNewMailFromBanner()" class="flex-1 py-2.5 rounded-xl bg-[#00a884] hover:bg-[#00c49a] text-[#111b21] text-xs font-bold transition flex items-center justify-center"><i class="fa-solid fa-envelope-open mr-1.5"></i>${btnOpen}</button>
        </div>
    `;

    const mailAudio = window.sndEmail || window.sndMsg;
    if (typeof window.playSafeSound === 'function' && mailAudio) {
        window.playSafeSound(mailAudio, [200, 100, 200]);
    } else if (mailAudio) {
        try { mailAudio.play().catch(() => {}); } catch (e) {}
    }
};

window.closeNewMailBanner = function(showNext = true) {
    const active = window._activeNewMailBanner;
    const database = window._getMailDb();

    if (active && active.notifyPath && database) {
        database.ref(active.notifyPath).remove().catch(() => {});
    } else if (active && active.dbKey && window.myProfileInfo?.id && database) {
        database.ref('mail_notifications/' + window.myProfileInfo.id + '/' + active.dbKey).remove().catch(() => {});
    }
    document.getElementById('hf-banner-new-mail')?.remove();
    window._activeNewMailBanner = null;

    if (showNext && window._mailBannerQueue.length > 0) {
        const nextItem = window._mailBannerQueue.shift();
        setTimeout(() => {
            window.showNewMailBanner(nextItem.dbKey, nextItem.data, nextItem.notifyPath);
        }, 180);
    }
};

window.openNewMailFromBanner = function() {
    const mailId = window._activeNewMailBanner ? window._activeNewMailBanner.mailId : null;
    window.closeNewMailBanner(false);

    window._mailArchiveFolder = 'inbox';
    if (typeof window.switchTab === 'function') window.switchTab(5);
    if (typeof window.switchArchiveTab === 'function') window.switchArchiveTab('mail');
    if (mailId && typeof window.viewSpecificEmail === 'function') {
        setTimeout(() => window.viewSpecificEmail(mailId), 250);
    }
};

// Надёжный радар: синхронизирует и Архив писем (Входящие/Отправленные), и Уведомления (онлайн + офлайн)
(function initMailNotificationRadar() {
    window._seenMailNotifyKeys = window._seenMailNotifyKeys || new Set();
    window._mailRadarPaths = window._mailRadarPaths || new Set();
    window._mailArchivePaths = window._mailArchivePaths || new Set();

    const attachNotifyPath = (database, pathRoot) => {
        if (!pathRoot || window._mailRadarPaths.has(pathRoot)) return;
        window._mailRadarPaths.add(pathRoot);

        database.ref(pathRoot).on('child_added', (snapshot) => {
            const data = snapshot.val();
            if (!data) return;
            const dedupeKey = data.mailId ? ('mail_' + data.mailId) : ('key_' + snapshot.key);
            if (window._seenMailNotifyKeys.has(dedupeKey)) return;
            window._seenMailNotifyKeys.add(dedupeKey);
            window.enqueueNewMailBanner(snapshot.key, data, pathRoot + '/' + snapshot.key);
        });
    };

    const attachArchivePath = (database, pathRoot) => {
        if (!pathRoot || window._mailArchivePaths.has(pathRoot)) return;
        window._mailArchivePaths.add(pathRoot);

        const ref = database.ref(pathRoot);

        ref.on('child_added', (snap) => {
            const val = snap.val();
            if (!val) return;
            const isSent = (val.folder === 'sent') || (val.folder !== 'inbox' && typeof val.from === 'string' && val.from.startsWith('To: '));

            window._upsertMailItem({
                id: snap.key,
                dbPath: pathRoot + '/' + snap.key,
                folder: isSent ? 'sent' : 'inbox',
                to: val.to || (isSent ? String(val.from || '').replace(/^To:\s*/i, '') : ''),
                from: val.from || 'System',
                fromPhoto: val.fromPhoto || '',
                fromFlag: val.fromFlag || '',
                subject: val.subject || 'No Subject',
                text: val.text || val.body || '',
                timestamp: val.timestamp || Date.now(),
                date: window._formatMailDate(val.timestamp),
                unread: isSent ? false : Boolean(val.unread)
            });

            window._updateMailUnreadBadges();
            if (window._isMailArchiveViewActive) window._hfRenderEmailArchive();
        });

        ref.on('child_changed', (snap) => {
            const val = snap.val();
            if (!val) return;
            const isSent = (val.folder === 'sent') || (val.folder !== 'inbox' && typeof val.from === 'string' && val.from.startsWith('To: '));

            window._upsertMailItem({
                id: snap.key,
                folder: isSent ? 'sent' : 'inbox',
                unread: isSent ? false : Boolean(val.unread)
            });

            window._updateMailUnreadBadges();
            if (window._isMailArchiveViewActive) window._hfRenderEmailArchive();
        });

        ref.on('child_removed', (snap) => {
            window.mailArchiveDB = (window.mailArchiveDB || []).filter(m => m && String(m.id) !== String(snap.key));
            window._updateMailUnreadBadges();
            if (window._isMailArchiveViewActive) window._hfRenderEmailArchive();
        });
    };

    const timer = setInterval(() => {
        const myId = window.myProfileInfo?.id;
        const database = window._getMailDb();
        if (!myId || myId === 'guest' || !database) return;

        clearInterval(timer);
        window._bindMailArchiveHooks();

        // Подписка на основной ID пользователя
        attachNotifyPath(database, 'mail_notifications/' + myId);
        attachArchivePath(database, 'emails/' + myId);

        // Резервная подписка на все email-адреса из собственного профиля/визитки
        const myEmails = window._extractEmailsFromObj(window.myProfileInfo);
        myEmails.forEach(mail => {
            const safeEmailKey = window._sanitizeEmailKey(mail);
            if (safeEmailKey && safeEmailKey !== String(myId)) {
                attachNotifyPath(database, 'mail_notifications/' + safeEmailKey);
                attachArchivePath(database, 'emails/' + safeEmailKey);
            }
        });
    }, 800);
})();

// --- EMAIL СИСТЕМА (Авто-поиск ID по визитке/профилю, Офлайн-доставка, i18n 13 языков и Верхний Баннер) ---

window._emailDirectTargetId = null;
window._emailDirectTargetEmail = '';
window._mailBannerQueue = window._mailBannerQueue || [];

window._EMAIL_BANNER_DICT = {
    ru: { new_mail_title: 'НОВОЕ ПИСЬМО', new_mail_from: 'Новое письмо от', btn_skip: 'Пропустить', btn_open_mail: 'Перейти в письмо', email_sending: 'Отправка...', email_success: 'Отправлено! ✔️', email_failed: 'Ошибка ❌', attached: 'Прикреплено!', file_uploaded: 'Файл загружен.' },
    en: { new_mail_title: 'NEW EMAIL', new_mail_from: 'New email from', btn_skip: 'Skip', btn_open_mail: 'Open email', email_sending: 'Sending...', email_success: 'Success! ✔️', email_failed: 'Failed ❌', attached: 'Attached!', file_uploaded: 'File securely uploaded.' },
    az: { new_mail_title: 'YENİ MƏKTUB', new_mail_from: 'Yeni məktub:', btn_skip: 'Keç', btn_open_mail: 'Məktuba keç', email_sending: 'Göndərilir...', email_success: 'Göndərildi! ✔️', email_failed: 'Xəta ❌', attached: 'Əlavə edildi!', file_uploaded: 'Fayl yükləndi.' },
    tr: { new_mail_title: 'YENİ E-POSTA', new_mail_from: 'Yeni e-posta:', btn_skip: 'Geç', btn_open_mail: 'E-postaya git', email_sending: 'Gönderiliyor...', email_success: 'Gönderildi! ✔️', email_failed: 'Hata ❌', attached: 'Eklendi!', file_uploaded: 'Dosya yüklendi.' },
    de: { new_mail_title: 'NEUE E-MAIL', new_mail_from: 'Neue E-Mail von', btn_skip: 'Überspringen', btn_open_mail: 'Öffnen', email_sending: 'Wird gesendet...', email_success: 'Gesendet! ✔️', email_failed: 'Fehler ❌', attached: 'Angehängt!', file_uploaded: 'Datei hochgeladen.' },
    kk: { new_mail_title: 'ЖАҢА ХАТ', new_mail_from: 'Жаңа хат:', btn_skip: 'Өткізіп жіберу', btn_open_mail: 'Хатқа өту', email_sending: 'Жіберілуде...', email_success: 'Жіберілді! ✔️', email_failed: 'Қате ❌', attached: 'Тіркелді!', file_uploaded: 'Файл жүктелді.' },
    ar: { new_mail_title: 'بريد جديد', new_mail_from: 'رسالة جديدة من', btn_skip: 'تخطي', btn_open_mail: 'فتح الرسالة', email_sending: 'جارٍ الإرسال...', email_success: 'تم الإرسال! ✔️', email_failed: 'فشل ❌', attached: 'تم الإرفاق!', file_uploaded: 'تم رفع الملف.' },
    it: { new_mail_title: 'NUOVA EMAIL', new_mail_from: 'Nuova email da', btn_skip: 'Salta', btn_open_mail: 'Apri email', email_sending: 'Invio...', email_success: 'Inviata! ✔️', email_failed: 'Errore ❌', attached: 'Allegato!', file_uploaded: 'File caricato.' },
    es: { new_mail_title: 'NUEVO CORREO', new_mail_from: 'Nuevo correo de', btn_skip: 'Omitir', btn_open_mail: 'Ir al correo', email_sending: 'Enviando...', email_success: '¡Enviado! ✔️', email_failed: 'Error ❌', attached: '¡Adjuntado!', file_uploaded: 'Archivo subido.' },
    fr: { new_mail_title: 'NOUVEL E-MAIL', new_mail_from: 'Nouvel e-mail de', btn_skip: 'Ignorer', btn_open_mail: 'Ouvrir', email_sending: 'Envoi...', email_success: 'Envoyé ! ✔️', email_failed: 'Échec ❌', attached: 'Joint !', file_uploaded: 'Fichier téléchargé.' },
    pt: { new_mail_title: 'NOVO E-MAIL', new_mail_from: 'Novo e-mail de', btn_skip: 'Pular', btn_open_mail: 'Abrir e-mail', email_sending: 'Enviando...', email_success: 'Enviado! ✔️', email_failed: 'Erro ❌', attached: 'Anexado!', file_uploaded: 'Arquivo enviado.' },
    ja: { new_mail_title: '新着メール', new_mail_from: '新着メール:', btn_skip: 'スキップ', btn_open_mail: 'メールを開く', email_sending: '送信中...', email_success: '送信完了! ✔️', email_failed: '失敗 ❌', attached: '添付完了!', file_uploaded: 'アップロード完了。' },
    zh: { new_mail_title: '新邮件', new_mail_from: '新邮件来自', btn_skip: '跳过', btn_open_mail: '查看邮件', email_sending: '发送中...', email_success: '已发送! ✔️', email_failed: '失败 ❌', attached: '已附加!', file_uploaded: '文件已上传。' }
};

window._sanitizeEmailKey = function(email) {
    return String(email || '').trim().toLowerCase().replace(/[.#$\[\]\/]/g, ',');
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

    // 4. Глубокий поиск по Firebase (users + резервные ветки визиток/профилей, без капризного orderByChild)
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

    // 5. Резервный ключ по нормализованному email (если адрес вообще не привязан к аккаунту)
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
        const database = (typeof db !== 'undefined') ? db : firebase.database();
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
    emailjs.send("service_md6pprq", "template_slxkkuk", templateParams, "NXn0TeAF95L5qScxO").then(async function() {

        // 2. Firebase (Входящие, Исходящие и Офлайн/Онлайн Верхний Баннер по ID)
        try {
            const database = (typeof db !== 'undefined') ? db : firebase.database();
            const myId = String(window.myProfileInfo?.id || localStorage.getItem('hf_active_user') || '');
            const targetId = await window.resolveEmailTargetId(to, database);

            console.log('[Email] Delivered in Firebase to targetId:', targetId, 'for email:', to);

            // А. Сохраняем письмо во входящие ПОЛУЧАТЕЛЯ по его уникальному ID
            const inboxRef = database.ref('emails/' + targetId).push();
            await inboxRef.set({
                from: window.myUsername || window.myProfileInfo?.name || 'User',
                fromId: myId,
                fromPhoto: window.myProfileInfo?.photo || '',
                fromFlag: window.myProfileInfo?.flag || '',
                subject: subj,
                text: text,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                unread: true
            });

            // Б. Сохраняем копию в исходящие ОТПРАВИТЕЛЮ (если не пишем сами себе)
            if (myId && myId !== 'guest' && String(myId) !== String(targetId)) {
                database.ref('emails/' + myId).push({
                    from: 'To: ' + to,
                    toId: String(targetId),
                    subject: subj,
                    text: text,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    unread: false
                }).catch(() => {});
            }

            // В. Кладём уведомление в mail_notifications/{targetId} — дождётся получателя даже если он сейчас офлайн
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
    const database = (typeof db !== 'undefined') ? db : (typeof firebase !== 'undefined' ? firebase.database() : null);

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

    if (typeof window.switchTab === 'function') window.switchTab(5);
    if (typeof window.switchArchiveTab === 'function') window.switchArchiveTab('mail');
    if (mailId && typeof window.viewSpecificEmail === 'function') {
        setTimeout(() => window.viewSpecificEmail(mailId), 200);
    }
};

// Надёжный радар mail_notifications (ловит уведомления и сразу онлайн, и после входа офлайн-пользователя)
(function initMailNotificationRadar() {
    window._seenMailNotifyKeys = window._seenMailNotifyKeys || new Set();
    window._mailRadarPaths = window._mailRadarPaths || new Set();

    const attachPath = (database, pathRoot) => {
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

    const timer = setInterval(() => {
        const myId = window.myProfileInfo?.id;
        const database = (typeof db !== 'undefined') ? db : (typeof firebase !== 'undefined' && firebase.database ? firebase.database() : null);
        if (!myId || myId === 'guest' || !database) return;

        clearInterval(timer);
        attachPath(database, 'mail_notifications/' + myId);

        // Резервная подписка на все email-адреса из собственного профиля/визитки
        const myEmails = window._extractEmailsFromObj(window.myProfileInfo);
        myEmails.forEach(mail => {
            const safeEmailKey = window._sanitizeEmailKey(mail);
            if (safeEmailKey && safeEmailKey !== String(myId)) {
                attachPath(database, 'mail_notifications/' + safeEmailKey);
            }
        });
    }, 800);
})();

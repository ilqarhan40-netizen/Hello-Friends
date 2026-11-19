// --- EMAIL СИСТЕМА (Интеграция с i18n, Firebase Архив и Изолированный Баннер Почты) ---

window.openEmailModal = function() {
    if (window.closeDropdown) window.closeDropdown();
    document.getElementById('email-modal').classList.add('active');
};

window.openDirectEmail = function(email) {
    window.openEmailModal();
    if (email) document.getElementById('email-to').value = email;
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
        newRef.set({ name: file.name, data: base64Data, timestamp: firebase.database.ServerValue.TIMESTAMP }).then(() => {
            textEl.value = textEl.value.replace(`\n[Uploading ${file.name}...]`, `\n📎 Attachment Link: https://secure-cloud.hf/file/${newRef.key}`);

            const dict = window.getEmailBannerI18n();
            const titleText = dict['attached'] || "Attached!";
            const descText = dict['file_uploaded'] || "File securely uploaded.";

            if (window.showToast) window.showToast(titleText, descText, "", "");
        });
    };
    reader.readAsDataURL(file);
};

window.sendEmailForm = function(e) {
    e.preventDefault();

    const dict = window.getEmailBannerI18n();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalHTML = btn.innerHTML;

    btn.innerText = dict['email_sending'] || 'Sending...';
    btn.classList.add('animate-pulse');

    const to = document.getElementById('email-to').value.trim();
    const subj = document.getElementById('email-subject').value.trim();
    const text = document.getElementById('email-text').value.trim();
    const templateParams = {
        to_email: to,
        subject: subj,
        message: text,
        from_name: window.myUsername || "User"
    };

    // 1. Отправка через EmailJS
    emailjs.send("service_md6pprq", "template_slxkkuk", templateParams, "NXn0TeAF95L5qScxO").then(function() {

        // 2. Firebase (Входящие, Исходящие и Изолированный Сигнал Нового Письма)
        try {
            const database = (typeof db !== 'undefined') ? db : firebase.database();
            const safeId = to.replace(/\./g, ',');
            const myId = window.myProfileInfo?.id || localStorage.getItem('hf_active_user');

            database.ref('users').orderByChild('email').equalTo(to).once('value', function(snapshot) {
                let targetId = safeId;

                if (snapshot && snapshot.exists()) {
                    snapshot.forEach(function(child) {
                        targetId = child.key; // Точный ID получателя
                    });
                }

                // А. Сохраняем письмо в архив ПОЛУЧАТЕЛЯ (Входящее)
                const inboxRef = database.ref('emails/' + targetId).push();
                inboxRef.set({
                    from: window.myUsername || "User",
                    subject: subj,
                    text: text,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    unread: true
                });

                // Б. Сохраняем копию в архив ОТПРАВИТЕЛЯ (Исходящее) - если не пишем сами себе
                if (myId && myId !== 'guest' && myId !== targetId) {
                    database.ref('emails/' + myId).push({
                        from: "To: " + to,
                        subject: subj,
                        text: text,
                        timestamp: firebase.database.ServerValue.TIMESTAMP,
                        unread: false
                    });
                }

                // В. Отправляем сигнал строго в отдельную ветку mail_notifications
                database.ref('mail_notifications/' + targetId).push({
                    mailId: inboxRef.key,
                    from: window.myUsername || "User",
                    fromFlag: window.myProfileInfo?.flag || '🌐',
                    fromPhoto: window.myProfileInfo?.photo || '',
                    subject: subj,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
            });
        } catch (err) {
            console.log("Firebase push failed:", err);
        }

        btn.classList.remove('animate-pulse');
        btn.innerText = dict['email_success'] || 'Success! ✔️';
        btn.style.background = '#00a884';
        btn.style.color = '#111b21';

        setTimeout(() => {
            document.getElementById('email-form-element').reset();
            btn.innerHTML = originalHTML;
            btn.style.background = '';
            btn.style.color = '';
            document.getElementById('email-modal').classList.remove('active');
        }, 2000);
    }, function(error) {
        btn.classList.remove('animate-pulse');
        btn.innerText = dict['email_failed'] || 'Failed ❌';
        btn.style.background = '#ef4444';
        setTimeout(() => { btn.innerHTML = originalHTML; btn.style.background = ''; }, 3000);
        alert("EmailJS Error: " + JSON.stringify(error));
    });
};

// ==========================================
// ОТДЕЛЬНЫЙ ВЕРХНИЙ БАННЕР НОВОГО ПИСЬМА (i18n СТРОГО ПО ПРОФИЛЮ ПОЛУЧАТЕЛЯ)
// ==========================================
window.getEmailBannerI18n = function() {
    const raw = (typeof window.getSmartLang === 'function' && window.myProfileInfo)
        ? window.getSmartLang(window.myProfileInfo)
        : 'en';
    const base = String(raw || 'en').toLowerCase().split(/[-_]/)[0].substring(0, 2);
    const fix = { kz: 'kk', cn: 'zh', jp: 'ja', ae: 'ar', gb: 'en', us: 'en' };
    const code = fix[base] || base;
    if (window.i18n) {
        return window.i18n[code] || window.i18n['en'] || {};
    }
    return {};
};

window._escapeEmailHtml = function(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};

window.showNewMailBanner = function(dbKey, data) {
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

    const fromName = window._escapeEmailHtml(data.from || '');
    const fromFlag = window._escapeEmailHtml(data.fromFlag || '✉️');
    const subjText = window._escapeEmailHtml(data.subject || '');

    const title = d.new_mail_title || 'NEW EMAIL';
    const baseMsg = d.new_mail_text || 'You have a new email';
    const subLine = [fromName ? `${fromFlag} ${fromName}` : '', subjText].filter(Boolean).join(' • ');

    window._activeNewMailBanner = {
        dbKey: dbKey || null,
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
                <span class="text-white text-sm font-bold leading-snug truncate">${baseMsg}</span>
                ${subLine ? `<span class="text-[#8696a0] text-xs truncate">${subLine}</span>` : ''}
            </div>
        </div>
        <div class="flex gap-2.5 w-full">
            <button onclick="window.closeNewMailBanner()" class="flex-1 py-2.5 rounded-xl bg-[#2a3942] hover:bg-[#374a56] text-[#e9edef] text-xs font-bold transition">${d.btn_later || 'Later'}</button>
            <button onclick="window.openNewMailFromBanner()" class="flex-1 py-2.5 rounded-xl bg-[#00a884] hover:bg-[#00c49a] text-[#111b21] text-xs font-bold transition flex items-center justify-center"><i class="fa-solid fa-envelope-open mr-1.5"></i>${d.btn_open_mail || 'Open'}</button>
        </div>
    `;

    if (window.sndMsg) {
        try { window.sndMsg.play().catch(() => {}); } catch (e) {}
    }
};

window.closeNewMailBanner = function() {
    const active = window._activeNewMailBanner;
    const myId = window.myProfileInfo?.id || localStorage.getItem('hf_active_user');
    const database = (typeof db !== 'undefined') ? db : (typeof firebase !== 'undefined' ? firebase.database() : null);

    if (active && active.dbKey && myId && database) {
        database.ref('mail_notifications/' + myId + '/' + active.dbKey).remove().catch(() => {});
    }
    document.getElementById('hf-banner-new-mail')?.remove();
    window._activeNewMailBanner = null;
};

window.openNewMailFromBanner = function() {
    const mailId = window._activeNewMailBanner ? window._activeNewMailBanner.mailId : null;
    window.closeNewMailBanner();

    if (typeof window.switchTab === 'function') window.switchTab(5);
    if (typeof window.switchArchiveTab === 'function') window.switchArchiveTab('mail');
    if (mailId && typeof window.viewSpecificEmail === 'function') {
        setTimeout(() => window.viewSpecificEmail(mailId), 200);
    }
};

// Надёжный запуск слушателя mail_notifications (ждёт профиль и Firebase)
(function initMailNotificationRadar() {
    window._seenMailNotifyKeys = window._seenMailNotifyKeys || new Set();
    const timer = setInterval(() => {
        const myId = window.myProfileInfo?.id;
        const database = (typeof db !== 'undefined') ? db : (typeof firebase !== 'undefined' && firebase.database ? firebase.database() : null);
        if (!myId || myId === 'guest' || !database) return;

        clearInterval(timer);
        database.ref('mail_notifications/' + myId).on('child_added', (snapshot) => {
            const data = snapshot.val();
            if (!data || window._seenMailNotifyKeys.has(snapshot.key)) return;
            window._seenMailNotifyKeys.add(snapshot.key);
            window.showNewMailBanner(snapshot.key, data);
        });
    }, 800);
})();

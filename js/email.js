// --- EMAIL СИСТЕМА (Интеграция с i18n, Firebase Архив и Радар Уведомлений) ---

window.openEmailModal = function() { 
    if(window.closeDropdown) window.closeDropdown(); 
    document.getElementById('email-modal').classList.add('active'); 
};

window.openDirectEmail = function(email) { 
    window.openEmailModal(); 
    if(email) document.getElementById('email-to').value = email; 
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
            
            const dict = window.i18n ? (window.i18n[window.appLang] || window.i18n['en'] || {}) : {};
            const titleText = dict['attached'] || "Attached!";
            const descText = dict['file_uploaded'] || "File securely uploaded.";
            
            if(window.showToast) window.showToast(titleText, descText, "", ""); 
        }); 
    }; 
    reader.readAsDataURL(file); 
};

window.sendEmailForm = function(e) {
    e.preventDefault();
    
    const dict = window.i18n ? (window.i18n[window.appLang] || window.i18n['en'] || {}) : {};
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
        
        // 2. Бронебойный Firebase (Входящие, Исходящие и Сигнал)
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
                database.ref('emails/' + targetId).push({
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
                        unread: false // Свои письма читать не надо
                    });
                }
                
                // В. Бросаем сигнал-ракету для вызова уведомления
                database.ref('notifications/' + targetId).push({
                    type: 'email',
                    from: window.myUsername || "User",
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
// РАДАР УВЕДОМЛЕНИЙ (Слушает папку notifications)
// ==========================================
function startNotificationRadar() {
    const myId = window.myProfileInfo?.id || localStorage.getItem('hf_active_user');
    if (!myId || myId === 'guest') return; // Гости радар не используют

    const database = (typeof db !== 'undefined') ? db : (typeof firebase !== 'undefined' ? firebase.database() : null);
    if (!database) {
        setTimeout(startNotificationRadar, 1000);
        return;
    }

    // Слушаем добавление новых записей (child_added) в папку notifications
    database.ref('notifications/' + myId).on('child_added', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        if (data.type === 'email') {
            const notifyBox = document.getElementById('notify-new-mail');
            const fromEl = document.getElementById('notify-mail-from');
            const subjEl = document.getElementById('notify-mail-subj');

            // Если HTML-разметка уведомления есть на странице, выводим данные
            if (notifyBox && fromEl && subjEl) {
                fromEl.innerText = "От: " + (data.from || "Unknown");
                subjEl.innerText = data.subject || "У вас новое сообщение";
                
                // Включаем карточку на экране (как в видеозвонках)
                notifyBox.style.display = 'flex';

                // Если нужно, чтобы карточка сама исчезла через 7 секунд (убери //, если хочешь включить таймер)
                /* setTimeout(() => { notifyBox.style.display = 'none'; }, 7000); */
            }
        }

        // КРИТИЧЕСКИ ВАЖНО: Удаляем сигнал из базы сразу после показа! 
        // Иначе при каждой перезагрузке страницы будут сыпаться старые уведомления.
        snapshot.ref.remove().catch(err => console.log("Ошибка очистки радара:", err));
    });
}

// Даем профилю 3 секунды на загрузку и запускаем радар
setTimeout(startNotificationRadar, 3000);

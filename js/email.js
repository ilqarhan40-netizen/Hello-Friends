// --- EMAIL СИСТЕМА (Интеграция с i18n экосистемой и Firebase) ---

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
    
    const to = document.getElementById('email-to').value; 
    const subj = document.getElementById('email-subject').value; 
    const text = document.getElementById('email-text').value; 
    const templateParams = {
        to_email: to,
        subject: subj,
        message: text,
        from_name: window.myUsername || "User"
    };
    
    // Отправка через EmailJS (Ключ исправлен на заглавную O)
    emailjs.send("service_md6pprq", "template_slxkkuk", templateParams, "NXn0TeAF95L5qScxO").then(function() {
        
        // === БРОНЕБОЙНЫЙ СИГНАЛ В FIREBASE (АРХИВ + УВЕДОМЛЕНИЕ) ===
        try {
            const database = (typeof db !== 'undefined') ? db : firebase.database();
            const safeId = to.replace(/\./g, ','); // Запасной ID, если юзер не найден
            
            database.ref('users').orderByChild('email').equalTo(to).once('value', function(snapshot) {
                let targetId = safeId;
                
                if (snapshot && snapshot.exists()) {
                    snapshot.forEach(function(child) {
                        targetId = child.key; // Берем точный ID пользователя из базы
                    });
                }

                // 1. Отправляем письмо в АРХИВ
                database.ref('emails/' + targetId).push({
                    from: window.myUsername || "User",
                    subject: subj,
                    text: text,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
                
                // 2. Бросаем метку для всплывающего УВЕДОМЛЕНИЯ
                database.ref('notifications/' + targetId).push({
                    type: 'email',
                    from: window.myUsername || "User",
                    subject: subj,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
            });
        } catch (err) {
            console.log("Firebase block ignored:", err);
        }
        // === КОНЕЦ ===

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
            
            const toastTitle = dict['email_title'] || "Email Sent";
            const toastDesc = dict['email_sent_toast'] || "Securely delivered via EmailJS";
            if(window.showToast) window.showToast(toastTitle, toastDesc, "", ""); 
        }, 2000); 
    }, function(error) { 
        btn.classList.remove('animate-pulse'); 
        btn.innerText = dict['email_failed'] || 'Failed ❌'; 
        btn.style.background = '#ef4444'; 
        
        setTimeout(() => { 
            btn.innerHTML = originalHTML; 
            btn.style.background = ''; 
        }, 3000); 
        
        alert("Error: " + JSON.stringify(error)); 
    });
};

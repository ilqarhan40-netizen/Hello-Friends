// --- EMAIL СИСТЕМА (Интеграция с i18n экосистемой) ---
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
        const newRef = db.ref('email_attachments').push(); 
        newRef.set({ name: file.name, data: base64Data, timestamp: firebase.database.ServerValue.TIMESTAMP }).then(() => { 
            textEl.value = textEl.value.replace(`\n[Uploading ${file.name}...]`, `\n📎 Attachment Link: https://secure-cloud.hf/file/${newRef.key}`); 
            
            // Берем переводы для тоста прикрепления файла из i18n
            const dict = window.i18n[window.appLang] || window.i18n['en'];
            const titleText = dict['attached'] || "Attached!";
            const descText = dict['file_uploaded'] || "File securely uploaded.";
            
            if(window.showToast) window.showToast(titleText, descText, "", ""); 
        }); 
    }; 
    reader.readAsDataURL(file); 
};

window.sendEmailForm = function(e) {
    e.preventDefault();
    
    // Подключаем словарь на лету
    const dict = window.i18n[window.appLang] || window.i18n['en'];
    
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
    
    emailjs.send("service_md6pprq", "template_slxkkuk", templateParams, "NXn0TeAF95L5qScxO").then(function() {
        
        // === БЛОК 3: ПИНОК ПУШ-УВЕДОМЛЕНИЯ О ПИСЬМЕ ===
        if (window.sendPushNotification) {
            window.sendPushNotification(
                to, // Отправляем пуш на email получателя
                { type: 'email', titleText: 'Новое письмо', bodyText: `От: ${window.myUsername || 'User'}` }, 
                'Новое письмо', 
                `Вам пришло письмо от ${window.myUsername || 'User'}`
            );
        }
        // ==============================================

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

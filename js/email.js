// --- EMAIL СИСТЕМА ---
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
            
            // Всплывающее окно с HTML-атрибутами для твоего переводчика
            if(window.showToast) window.showToast("<span data-i18n='attached'>Attached!</span>", "<span data-i18n='file_uploaded'>File uploaded</span>", "", ""); 
        }); 
    }; 
    reader.readAsDataURL(file); 
};

window.sendEmailForm = function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    
    // Запоминаем оригинальный ключ кнопки (например, send_button), чтобы вернуть его в конце
    const originalI18n = btn.getAttribute('data-i18n'); 
    
    // Меняем атрибут на "Отправка" - твоя система сама поменяет текст
    btn.setAttribute('data-i18n', 'sending'); 
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
            
        btn.classList.remove('animate-pulse'); 
        
        // Меняем атрибут на "Успех"
        btn.setAttribute('data-i18n', 'success'); 
        btn.style.background = '#00a884'; 
        btn.style.color = '#111b21'; 
        
        setTimeout(() => { 
            document.getElementById('email-form-element').reset(); 
            
            // Возвращаем кнопке её изначальный атрибут
            if(originalI18n) {
                btn.setAttribute('data-i18n', originalI18n);
            } else {
                btn.removeAttribute('data-i18n');
            }
            
            btn.style.background = ''; 
            btn.style.color = ''; 
            document.getElementById('email-modal').classList.remove('active');
            
            // Передаем HTML-строку в уведомление, чтобы система перевела его на лету
            if(window.showToast) window.showToast("<span data-i18n='email_sent_title'>Email Sent</span>", "<span data-i18n='email_sent_toast'>Delivered</span>", "", ""); 
        }, 2000); 
    }, function(error) { 
        btn.classList.remove('animate-pulse'); 
        
        // Меняем атрибут на "Ошибка"
        btn.setAttribute('data-i18n', 'failed'); 
        btn.style.background = '#ef4444'; 
        
        setTimeout(() => { 
            if(originalI18n) btn.setAttribute('data-i18n', originalI18n);
            btn.style.background = ''; 
        }, 3000); 
        
        alert("Error: " + JSON.stringify(error)); 
    });
};

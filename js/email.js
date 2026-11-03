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
            if(window.showToast) window.showToast("Attached!", "File securely uploaded to cloud.", "", ""); 
        }); 
    }; 
    reader.readAsDataURL(file); 
};

window.sendEmailForm = function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText; 
    btn.innerText = 'Sending...'; 
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
        btn.innerText = 'Success! ✔️'; 
        btn.style.background = '#00a884'; 
        btn.style.color = '#111b21'; 
        setTimeout(() => { 
            document.getElementById('email-form-element').reset(); 
            btn.innerText = originalText; 
            btn.style.background = ''; 
            btn.style.color = ''; 
            document.getElementById('email-modal').classList.remove('active');
            if(window.showToast) window.showToast("Email Sent", "Securely delivered via EmailJS", "", ""); 
        }, 2000); 
    }, function(error) { 
        btn.classList.remove('animate-pulse'); 
        btn.innerText = 'Failed ❌'; 
        btn.style.background = '#ef4444'; 
        setTimeout(() => { btn.innerText = originalText; btn.style.background = ''; }, 3000); 
        alert("Ошибка: " + JSON.stringify(error)); 
    });
};

// Отдельный независимый модуль для отправки почты через EmailJS
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

    // Отправка с полным набором ключей
    emailjs.send("service_md6pprq", "template_slxkkuk", templateParams, "NXn0TeAF95L5qScxO")
    .then(function() {
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

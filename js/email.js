// --- ЛОКАЛЬНЫЙ СЛОВАРЬ ДЛЯ EMAIL (13 ЯЗЫКОВ) ---
const emailDict = {
    en: { sending: "Sending...", success: "Success! ✔️", failed: "Failed ❌", toastTitle: "Email Sent", toastDesc: "Securely delivered via EmailJS", errAlert: "Error: ", attachTitle: "Attached!", attachDesc: "File securely uploaded to cloud.", uploading: "Uploading", attachLink: "Attachment Link" },
    ru: { sending: "Отправка...", success: "Успешно! ✔️", failed: "Ошибка ❌", toastTitle: "Отправлено", toastDesc: "Письмо безопасно доставлено", errAlert: "Ошибка: ", attachTitle: "Прикреплено!", attachDesc: "Файл загружен в облако.", uploading: "Загрузка", attachLink: "Ссылка на вложение" },
    az: { sending: "Göndərilir...", success: "Uğurlu! ✔️", failed: "Xəta ❌", toastTitle: "Göndərildi", toastDesc: "Təhlükəsiz çatdırıldı", errAlert: "Xəta: ", attachTitle: "Əlavə edildi!", attachDesc: "Fayl buluda yükləndi.", uploading: "Yüklənir", attachLink: "Qoşma Linki" },
    kk: { sending: "Жіберілуде...", success: "Сәтті! ✔️", failed: "Қате ❌", toastTitle: "Хат жіберілді", toastDesc: "Қауіпсіз жеткізілді", errAlert: "Қате: ", attachTitle: "Тіркелді!", attachDesc: "Файл бұлтқа жүктелді.", uploading: "Жүктелуде", attachLink: "Тіркеме сілтемесі" },
    de: { sending: "Senden...", success: "Erfolg! ✔️", failed: "Fehler ❌", toastTitle: "E-Mail gesendet", toastDesc: "Sicher zugestellt", errAlert: "Fehler: ", attachTitle: "Angehängt!", attachDesc: "Datei in die Cloud hochgeladen.", uploading: "Hochladen", attachLink: "Anhang-Link" },
    tr: { sending: "Gönderiliyor...", success: "Başarılı! ✔️", failed: "Başarısız ❌", toastTitle: "E-posta Gönderildi", toastDesc: "Güvenli teslim edildi", errAlert: "Hata: ", attachTitle: "Eklendi!", attachDesc: "Dosya buluta yüklendi.", uploading: "Yükleniyor", attachLink: "Ek Bağlantısı" },
    ar: { sending: "جارٍ الإرسال...", success: "نجاح! ✔️", failed: "فشل ❌", toastTitle: "تم الإرسال", toastDesc: "تم التسليم بأمان", errAlert: "خطأ: ", attachTitle: "تم الإرفاق!", attachDesc: "تم رفع الملف للسحابة.", uploading: "جارٍ الرفع", attachLink: "رابط المرفق" },
    it: { sending: "Invio...", success: "Successo! ✔️", failed: "Fallito ❌", toastTitle: "Email inviata", toastDesc: "Consegnata in sicurezza", errAlert: "Errore: ", attachTitle: "Allegato!", attachDesc: "File caricato sul cloud.", uploading: "Caricamento", attachLink: "Link allegato" },
    es: { sending: "Enviando...", success: "¡Éxito! ✔️", failed: "Falló ❌", toastTitle: "Correo enviado", toastDesc: "Entregado de forma segura", errAlert: "Error: ", attachTitle: "¡Adjunto!", attachDesc: "Archivo subido a la nube.", uploading: "Subiendo", attachLink: "Enlace adjunto" },
    fr: { sending: "Envoi...", success: "Succès ! ✔️", failed: "Échec ❌", toastTitle: "E-mail envoyé", toastDesc: "Livré en toute sécurité", errAlert: "Erreur: ", attachTitle: "Joint !", attachDesc: "Fichier téléchargé sur le cloud.", uploading: "Téléchargement", attachLink: "Lien de la pièce jointe" },
    pt: { sending: "Enviando...", success: "Sucesso! ✔️", failed: "Falhou ❌", toastTitle: "E-mail enviado", toastDesc: "Entregue com segurança", errAlert: "Erro: ", attachTitle: "Anexado!", attachDesc: "Arquivo enviado para a nuvem.", uploading: "Enviando", attachLink: "Link do anexo" },
    ja: { sending: "送信中...", success: "成功！ ✔️", failed: "失敗 ❌", toastTitle: "メール送信完了", toastDesc: "安全に配信されました", errAlert: "エラー: ", attachTitle: "添付完了！", attachDesc: "ファイルがアップロードされました。", uploading: "アップロード中", attachLink: "添付リンク" },
    zh: { sending: "发送中...", success: "成功！ ✔️", failed: "失败 ❌", toastTitle: "邮件已发送", toastDesc: "安全送达", errAlert: "错误: ", attachTitle: "已附加！", attachDesc: "文件已安全上传至云端。", uploading: "上传中", attachLink: "附件链接" }
};

// Функция определения текущего языка
function getEmailLang() {
    return window.appLang || localStorage.getItem('hf_app_lang') || 'en';
}

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

    // Получаем переводы
    const lang = getEmailLang();
    const t = emailDict[lang] || emailDict['en'];
    
    const textEl = document.getElementById('email-text'); 
    textEl.value += `\n[${t.uploading} ${file.name}...]`; 
    
    const reader = new FileReader(); 
    reader.onload = function(e) { 
        const base64Data = e.target.result; 
        const newRef = db.ref('email_attachments').push(); 
        
        newRef.set({ name: file.name, data: base64Data, timestamp: firebase.database.ServerValue.TIMESTAMP }).then(() => { 
            textEl.value = textEl.value.replace(`\n[${t.uploading} ${file.name}...]`, `\n📎 ${t.attachLink}: https://secure-cloud.hf/file/${newRef.key}`); 
            if(window.showToast) window.showToast(t.attachTitle, t.attachDesc, "", ""); 
        }); 
    }; 
    reader.readAsDataURL(file); 
};

window.sendEmailForm = function(e) {
    e.preventDefault();
    
    // Получаем переводы
    const lang = getEmailLang();
    const t = emailDict[lang] || emailDict['en'];

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText; 
    
    btn.innerText = t.sending; 
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
        btn.innerText = t.success; 
        btn.style.background = '#00a884'; 
        btn.style.color = '#111b21'; 
        
        setTimeout(() => { 
            document.getElementById('email-form-element').reset(); 
            btn.innerText = originalText; 
            btn.style.background = ''; 
            btn.style.color = ''; 
            document.getElementById('email-modal').classList.remove('active');
            if(window.showToast) window.showToast(t.toastTitle, t.toastDesc, "", ""); 
        }, 2000); 
        
    }, function(error) { 
        btn.classList.remove('animate-pulse'); 
        btn.innerText = t.failed; 
        btn.style.background = '#ef4444'; 
        
        setTimeout(() => { 
            btn.innerText = originalText; 
            btn.style.background = ''; 
        }, 3000); 
        
        alert(t.errAlert + JSON.stringify(error)); 
    });
};
         
// --- БЛОК АВТОМАТИЧЕСКОЙ МУЛЬТИЯЗЫЧНОСТИ ДЛЯ EMAIL-ФОРМЫ ---
(function initEmailTranslationBlock() {
    // 1. Словарь для формы
    const emailDict = {
        en: { email_title: "Send Email", email_to: "Recipient (To)", email_subj: "Subject", email_msg: "Write your message here...", email_clear: "Clear", email_send: "Send" },
        ru: { email_title: "Отправить Email", email_to: "Получатель (Кому)", email_subj: "Тема", email_msg: "Напишите сообщение...", email_clear: "Очистить", email_send: "Отправить" },
        az: { email_title: "E-poçt Göndər", email_to: "Alıcı (Kimə)", email_subj: "Mövzu", email_msg: "Mesajınızı bura yazın...", email_clear: "Təmizlə", email_send: "Göndər" },
        kk: { email_title: "Хат жіберу", email_to: "Алушы (Кімге)", email_subj: "Тақырыбы", email_msg: "Хабарламаңызды жазыңыз...", email_clear: "Тазалау", email_send: "Жіберу" },
        de: { email_title: "E-Mail senden", email_to: "Empfänger", email_subj: "Betreff", email_msg: "Nachricht hier schreiben...", email_clear: "Löschen", email_send: "Senden" },
        tr: { email_title: "E-posta Gönder", email_to: "Alıcı", email_subj: "Konu", email_msg: "Mesajınızı buraya yazın...", email_clear: "Temizle", email_send: "Gönder" },
        ar: { email_title: "إرسال بريد", email_to: "المستلم", email_subj: "الموضوع", email_msg: "اكتب رسالتك هنا...", email_clear: "مسح", email_send: "إرسال" },
        it: { email_title: "Invia Email", email_to: "Destinatario", email_subj: "Oggetto", email_msg: "Scrivi qui il tuo messaggio...", email_clear: "Pulisci", email_send: "Invia" },
        es: { email_title: "Enviar Correo", email_to: "Destinatario", email_subj: "Asunto", email_msg: "Escribe tu mensaje aquí...", email_clear: "Borrar", email_send: "Enviar" },
        fr: { email_title: "Envoyer E-mail", email_to: "Destinataire", email_subj: "Sujet", email_msg: "Écrivez votre message ici...", email_clear: "Effacer", email_send: "Envoyer" },
        pt: { email_title: "Enviar E-mail", email_to: "Destinatário", email_subj: "Assunto", email_msg: "Escreva sua mensagem aqui...", email_clear: "Limpar", email_send: "Enviar" },
        ja: { email_title: "メールを送信", email_to: "宛先", email_subj: "件名", email_msg: "ここにメッセージを書く...", email_clear: "クリア", email_send: "送信" },
        zh: { email_title: "发送邮件", email_to: "收件人", email_subj: "主题", email_msg: "在此处编写您的信息...", email_clear: "清除", email_send: "发送" }
    };

    // 2. Функция внедрения
    function applyEmailInjection() {
        // Добавляем слова в глобальный словарь window.i18n
        if (window.i18n) {
            Object.keys(emailDict).forEach(lang => {
                if (!window.i18n[lang]) window.i18n[lang] = {};
                Object.assign(window.i18n[lang], emailDict[lang]);
            });
        }

        // Находим форму и проставляем атрибуты data-i18n
        const modal = document.getElementById('email-modal');
        if (modal && !modal.dataset.i18nInjected) {
            const title = modal.querySelector('h2');
            if (title) title.innerHTML = `<i class="fa-solid fa-envelope text-red-400 mr-2"></i> <span data-i18n="email_title">Send Email</span>`;
            
            const toInput = document.getElementById('email-to');
            if (toInput) toInput.setAttribute('data-i18n-placeholder', 'email_to');

            const subjInput = document.getElementById('email-subject');
            if (subjInput) subjInput.setAttribute('data-i18n-placeholder', 'email_subj');

            const msgInput = document.getElementById('email-text');
            if (msgInput) msgInput.setAttribute('data-i18n-placeholder', 'email_msg');

            const clearBtn = modal.querySelector('button[type="button"]');
            if (clearBtn) clearBtn.innerHTML = `<i class="fa-solid fa-eraser"></i> <span data-i18n="email_clear">Clear</span>`;

            const sendBtn = modal.querySelector('button[type="submit"]');
            if (sendBtn) sendBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> <span data-i18n="email_send">Send</span>`;
            
            // Отмечаем, что внедрение прошло, чтобы не дублировать
            modal.dataset.i18nInjected = "true";

            // Вызываем перевод немедленно
            if (window.applyTranslations) window.applyTranslations();
        }
    }

    // 3. Запускаем после загрузки DOM или немедленно, если уже загружен
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyEmailInjection);
    } else {
        applyEmailInjection();
    }
})();
// --- КОНЕЦ БЛОКА МУЛЬТИЯЗЫЧНОСТИ ---

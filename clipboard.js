// ==========================================
// ПЕРЕХВАТ ВСТАВКИ ФОТО И ВИДЕО (PASTE)
// ==========================================
document.addEventListener('paste', function(e) {
    let clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    let items = clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
            let file = items[i].getAsFile();
            if (!file) continue;

            if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                e.preventDefault(); 
                
                let mediaTypeStr = file.type.startsWith('image/') ? 'фото' : 'видео';
                
                if (confirm(`Отправить скопированное ${mediaTypeStr} в чат?`)) {
                    
                    // ВАЖНО: Замени 'media-upload-input' на реальный ID твоего скрытого <input type="file">
                    let fileInput = document.getElementById('media-upload-input'); 
                    
                    if (fileInput) {
                        let dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        fileInput.files = dataTransfer.files;
                        
                        let event = new Event('change', { bubbles: true });
                        fileInput.dispatchEvent(event);
                    } else if (typeof window.uploadMediaFile === 'function') {
                        window.uploadMediaFile(file);
                    } else {
                        if (window.showToast) window.showToast("Ошибка", "Не найден загрузчик файлов. Проверь ID в clipboard.js", "", "");
                    }
                }
                break; 
            }
        }
    }
});

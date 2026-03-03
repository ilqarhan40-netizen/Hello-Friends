require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https'); // Встроенный модуль, работает всегда!

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/send-email', (req, res) => {
    const { to, subject, text } = req.body;

    // Упаковываем письмо для веб-шлюза
    const postData = JSON.stringify({
        _subject: subject,
        message: text,
        _captcha: "false" // Отключаем капчу
    });

    // Настраиваем отправку через открытый порт 443 (HTTPS)
    const options = {
        hostname: 'formsubmit.co',
        path: `/ajax/${to}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    console.log(`🚀 Отправка письма на ${to} через веб-шлюз...`);

    const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => data += chunk);
        response.on('end', () => {
            console.log("✅ Ответ шлюза:", data);
            res.status(200).json({ success: true, message: "Письмо ушло через шлюз!" });
        });
    });

    request.on('error', (error) => {
        console.error('❌ Ошибка веб-шлюза:', error.message);
        res.status(500).json({ success: false, error: error.message });
    });

    request.write(postData);
    request.end();
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Сервер "Hello Friends" запущен на порту ${PORT} (Режим: Веб-шлюз)`));

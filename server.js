require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();

// Базовые настройки
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Главный маршрут для отправки почты
app.post('/api/send-email', async (req, res) => {
    try {
        const { to, subject, text } = req.body;

        // Настройка транспорта с учетом особенностей сети Render
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false, // Обязательно false для порта 587
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                // Позволяет обойти сетевые блокировки IPv6 на Render
                rejectUnauthorized: false,
                minVersion: "TLSv1.2"
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            text: text
        };

        console.log(`📡 Попытка отправки письма на ${to}...`);
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Письмо успешно отправлено:', info.response);

        res.status(200).json({ success: true, message: 'Письмо успешно отправлено!' });

    } catch (error) {
        console.error('❌ ОШИБКА ПОЧТЫ:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Слушаем порт (динамический для Render или 8080 для дома)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 Сервер "Hello Friends" запущен на порту ${PORT}`);
});

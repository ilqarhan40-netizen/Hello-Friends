require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/send-email', async (req, res) => {
    try {
        const { to, subject, text } = req.body;

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            // 🚀 СЕКРЕТНОЕ ОРУЖИЕ: Форсируем старый добрый IPv4,
            // чтобы обойти сломанный маршрут Render!
            family: 4 
        });

        console.log("📡 Попытка отправки через IPv4...");
        
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            text: text
        });

        console.log("✅ Письмо успешно ушло!");
        res.status(200).json({ success: true });

    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Hello Friends Server online on port ${PORT}`));

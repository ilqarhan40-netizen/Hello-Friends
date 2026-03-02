require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();

// Разрешаем приложению общаться с сервером
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Чтобы показывался index.html

// 💸 НОВЫЙ МАРШРУТ: Для банковских переводов
app.post('/api/transfer', (req, res) => {
    console.log('\n💸 Получен запрос на перевод денег...');
    const { to, amount } = req.body;

    if (!to || !amount) {
        console.error('❌ ОШИБКА: Не указан получатель или сумма!');
        return res.status(400).json({ success: false, error: 'Неверные данные' });
    }

    // Генерируем "банковский" ID транзакции на стороне сервера
    const transactionId = "TXN-" + Math.floor(Math.random() * 100000000);

    console.log(`✅ ПЕРЕВОД ОДОБРЕН: $${amount} для пользователя ${to}. ID: ${transactionId}`);

    // Отправляем успешный ответ и ID обратно в браузер
    res.status(200).json({ success: true, transactionId: transactionId, message: 'Перевод успешно выполнен' });
});

// ✉️ МАРШРУТ: Для отправки писем (остается без изменений)
app.post('/api/send-email', async (req, res) => {
    try {
        console.log('\n⏳ Получен запрос на отправку письма...');
        const { to, subject, text } = req.body;

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            throw new Error("Сервер не видит логин или пароль в файле .env!");
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });

        const mailOptions = { from: process.env.EMAIL_USER, to: to, subject: subject, text: text };
        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ УСПЕХ! Письмо отправлено:', info.response);
        res.status(200).json({ success: true, message: 'Письмо отправлено!' });

    } catch (error) {
        console.error('❌ ОШИБКА ОТПРАВКИ ПИСЬМА:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Запуск сервера
const PORT = 8080;
app.listen(PORT, () => {
    console.log(`🚀 СЕРВЕР УСПЕШНО ЗАПУЩЕН НА ПОРТУ ${PORT}`);
});
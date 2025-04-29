const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();

const TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

app.use(bodyParser.json());

// Обработка входящих обновлений от Telegram
app.post('/webhook', async (req, res) => {
  const body = req.body;

  // Обработка команды /start
  if (body.message && body.message.text === '/start') {
    const chatId = body.message.chat.id;

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: 'Привет! Выберите опцию:',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Кнопка 1', callback_data: 'button1' }],
          [{ text: 'Кнопка 2', callback_data: 'button2' }]
        ]
      }
    });
  }

  // Обработка нажатий на инлайн-кнопки
  if (body.callback_query) {
    const chatId = body.callback_query.message.chat.id;
    const data = body.callback_query.data;

    let responseText = '';

    if (data === 'button1') {
      responseText = 'Вы нажали кнопку 1!';
    } else if (data === 'button2') {
      responseText = 'Вы нажали кнопку 2!';
    } else {
      responseText = 'Неизвестная команда.';
    }

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: responseText
    });
  }

  res.sendStatus(200);
});

// Проверка работы сервера
app.get('/', (req, res) => {
  res.send('Бот работает!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

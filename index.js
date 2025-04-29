const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();

const TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  const message = req.body.message?.text;
  const chatId = req.body.message?.chat?.id;

  if (message === '/start') {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: 'Привет! Я всегда онлайн!',
    });
  }

  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.send('Бот работает!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');

const token = process.env.TELEGRAM_TOKEN;
const ADMIN_ID = 6091948159;

const bot = new TelegramBot(token);
const userStates = {};

// Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userStates[chatId] = null;

  bot.sendMessage(chatId, 'Привет! Это бот Diogonal777. Выберите действие:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Задать вопрос', callback_data: 'ask' }],
        [{ text: 'Мои проекты', callback_data: 'projects' }],
        [{ text: 'О боте', callback_data: 'about' }]
      ]
    }
  });
});

// Обработка кнопок
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;

  if (data === 'ask') {
    bot.editMessageText('Выберите тему вопроса:', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Тема 1', callback_data: 'topic1' }],
          [{ text: 'Тема 2', callback_data: 'topic2' }],
          [{ text: 'Тема 3', callback_data: 'topic3' }],
          [{ text: 'Назад', callback_data: 'back_to_main' }]
        ]
      }
    });
  }

  if (data === 'projects') {
    bot.editMessageText('Это тест 1', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [[{ text: 'Назад', callback_data: 'back_to_main' }]]
      }
    });
  }

  if (data === 'about') {
    bot.editMessageText('Это тест 2', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [[{ text: 'Назад', callback_data: 'back_to_main' }]]
      }
    });
  }

  const topicTitles = {
  topic1: 'Тема 1',
  topic2: 'Тема 2',
  topic3: 'Тема 3'
};

if (['topic1', 'topic2', 'topic3'].includes(data)) {
  const topicTitle = topicTitles[data];
  userStates[chatId] = { step: 'waiting_question', topic: topicTitle };
  bot.editMessageText(`Вы выбрали ${topicTitle}. Напишите ваш вопрос:`, {
    chat_id: chatId,
    message_id: messageId
  });
}

  if (data === 'back_to_main') {
    userStates[chatId] = null;
    bot.editMessageText('Привет! Это бот Diogonal777. Выберите действие:', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Задать вопрос', callback_data: 'ask' }],
          [{ text: 'Мои проекты', callback_data: 'projects' }],
          [{ text: 'О боте', callback_data: 'about' }]
        ]
      }
    });
  }
  if (data.startsWith('reply_')) {
  const targetId = data.split('_')[1];
  userStates[ADMIN_ID] = { step: 'awaiting_reply', targetId };
  bot.sendMessage(ADMIN_ID, 'Напишите ответ для пользователя:');
}

if (data.startsWith('ignore_')) {
  const targetId = data.split('_')[1];
  bot.sendMessage(targetId, 'Ваш вопрос был просмотрен, но остался без ответа.');
  bot.sendMessage(ADMIN_ID, 'Вопрос был проигнорирован.');
}

});

// Обработка текстов от пользователя
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const state = userStates[chatId];

  if (msg.chat.id === ADMIN_ID && userStates[ADMIN_ID]?.step === 'awaiting_reply') {
  const targetId = userStates[ADMIN_ID].targetId;
  bot.sendMessage(targetId, `Ответ от администратора:\n\n${msg.text}`);
  bot.sendMessage(ADMIN_ID, 'Ответ отправлен.');
  userStates[ADMIN_ID] = null;
  return;
  }
  
  if (state && state.step === 'waiting_question') {
    const userName = `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim();
    const username = msg.from.username ? `@${msg.from.username}` : '(юзернейм отсутствует)';
    const topic = state.topic;

    userStates[chatId] = {
  ...state,
  lastQuestion: text
};

// Отправляем администратору
bot.sendMessage(ADMIN_ID,
  `Новый вопрос:\n\nОт: ${userName} (${username})\nID: ${chatId}\nТема: ${topic}\n\nВопрос:\n${text}`, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Ответить', callback_data: `reply_${chatId}` },
          { text: '❌ Игнорировать', callback_data: `ignore_${chatId}` }
        ]
      ]
    }
});

// Подтверждение пользователю
bot.sendMessage(chatId, 'Ваш вопрос отправлен!', {
  reply_markup: {
    inline_keyboard: [
      [{ text: 'Назад', callback_data: 'back_to_main' }]
    ]
  }
});


    userStates[chatId] = null;
  }
});


// ВАЖНО: Express-сервер должен быть снаружи
const app = express();
app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

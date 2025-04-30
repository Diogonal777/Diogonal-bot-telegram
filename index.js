const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');

const token = process.env.TELEGRAM_TOKEN;
const ADMIN_ID = 6091948159;

const bot = new TelegramBot(token);
const userStates = {};
const userQuestions = {};

// Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userStates[chatId] = null;

  bot.sendMessage(chatId, 'Привет! Это бот Diogonal777. Выберите действие:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Задать вопрос', callback_data: 'ask' }],
        [{ text: 'Мои проекты', callback_data: 'projects' }],
        [{ text: 'Обо мне', callback_data: 'about me' }],
        [{ text: 'О боте', callback_data: 'about bot' }]
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
          [{ text: 'Семья L.E.G.E.N.D.A', callback_data: 'topic1' }],
          [{ text: 'Канал', callback_data: 'topic2' }],
          [{ text: 'Личное', callback_data: 'topic3' }],
          [{ text: 'Назад', callback_data: 'back_to_main' }]
        ]
      }
    });
  }

  if (data === 'projects') {
    bot.editMessageText('Проекты Diogpnal777:\n\nСайт: https://diogonal777.github.io/Diogonal-game\nМобильная игра: (потом добавлю)\nСайт: https://taplink.cc/diogonal\nСемья в Grand mobile: https://taplink.cc/l.e.g.e.n.d.a', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [[{ text: 'Назад', callback_data: 'back_to_main' }]]
      }
    });
  }

  if (data === 'about me') {
    bot.editMessageText('Я Diogonal777 (Вадим).\nКогда скучно создаю разные проекты.', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [[{ text: 'Назад', callback_data: 'back_to_main' }]]
      }
    });
  }
  
  if (data === 'about bot') {
    bot.editMessageText('Создаю я бот с небольшой помощью chat GPT. В основном код пишу сам.\n\nБот отвечает в течении минуты. Я буду развивать его\nЕсли что-то не работает напишите мне @Diogonal777', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');

const token = process.env.TELEGRAM_TOKEN;
const ADMIN_ID = 6091948159;

const bot = new TelegramBot(token);
const userStates = {};
const userQuestions = {};

// Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userStates[chatId] = null;

  bot.sendMessage(chatId, 'Привет! Это бот Diogonal777. Выберите действие:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Задать вопрос', callback_data: 'ask' }],
        [{ text: 'Мои проекты', callback_data: 'projects' }],
        [{ text: 'Обо мне', callback_data: 'about me' }],
        [{ text: 'О боте', callback_data: 'about bot' }]
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
          [{ text: 'Семья L.E.G.E.N.D.A', callback_data: 'topic1' }],
          [{ text: 'Канал', callback_data: 'topic2' }],
          [{ text: 'Личное', callback_data: 'topic3' }],
          [{ text: 'Назад', callback_data: 'back_to_main' }]
        ]
      }
    });
  }

  if (data === 'projects') {
    bot.editMessageText('Проекты Diogonal777:\n\nСайт: https://diogonal777.github.io/Diogonal-game\nМобильная игра: (потом добавлю)\nСайт: https://taplink.cc/diogonal\nСемья в Grand mobile: https://taplink.cc/l.e.g.e.n.d.a', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [[{ text: 'Назад', callback_data: 'back_to_main' }]]
      }
    });
  }

  if (data === 'about me') {
    bot.editMessageText('Я Diogonal777 (Вадим).\nКогда скучно создаю разные проекты.', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [[{ text: 'Назад', callback_data: 'back_to_main' }]]
      }
    });
  }

  if (data === 'about bot') {
    bot.editMessageText('Создаю я бота с небольшой помощью chat GPT. В основном код пишу сам.\n\nБот отвечает в течение минуты. Я буду развивать его. Если что-то не работает — напишите мне @Diogonal777', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [[{ text: 'Назад', callback_data: 'back_to_main' }]]
      }
    });
  }

  const topicTitles = {
    topic1: 'Семья L.E.G.E.N.D.A',
    topic2: 'Канал',
    topic3: 'Личное'
  };

  if (['topic1', 'topic2', 'topic3'].includes(data)) {
    const topicTitle = topicTitles[data];
    userStates[chatId] = { step: 'waiting_question', topic: topicTitle };
    bot.editMessageText(`Вы выбрали тему: ${topicTitle}. Напишите ваш вопрос:`, {
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
          [{ text: 'Обо мне', callback_data: 'about me' }],
          [{ text: 'О боте', callback_data: 'about bot' }]
        ]
      }
    });
  }

  if (data.startsWith('reply_')) {
    const targetId = data.split('_')[1];
    const question = userQuestions[targetId]?.question || '(вопрос не найден)';
    userStates[ADMIN_ID] = { step: 'awaiting_reply', targetId };

    bot.sendMessage(ADMIN_ID, `Напишите ответ для пользователя ${targetId}:\n\nВопрос: ${question}`);
    bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: messageId
    });
  }

  if (data.startsWith('ignore_')) {
    const targetId = data.split('_')[1];
    bot.sendMessage(targetId, 'Ваш вопрос был отклонён администратором.');
    bot.sendMessage(ADMIN_ID, `Вы проигнорировали вопрос от ${targetId}.`);
    bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: messageId
    });
  }
});

// Обработка сообщений
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const state = userStates[chatId];

  if (chatId === ADMIN_ID && userStates[ADMIN_ID]?.step === 'awaiting_reply') {
    const targetId = userStates[ADMIN_ID].targetId;
    const question = userQuestions[targetId]?.question || '(вопрос не найден)';
    bot.sendMessage(targetId, `Ваш вопрос:\n${question}\n\nОтвет администратора:\n${text}`);
    bot.sendMessage(ADMIN_ID, 'Ответ отправлен.');
    userStates[ADMIN_ID] = null;
    return;
  }

  if (state && state.step === 'waiting_question') {
    const userName = `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim();
    const username = msg.from.username ? `@${msg.from.username}` : '(юзернейм отсутствует)';
    const topic = state.topic;

    userQuestions[chatId] = {
      question: text,
      topic,
      username,
      name: userName
    };

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

    bot.sendMessage(chatId, 'Ваш вопрос отправлен! Ожидайте ответа.', {
      reply_markup: {
        inline_keyboard: [[{ text: 'Назад', callback_data: 'back_to_main' }]]
      }
    });

    userStates[chatId] = null;
  }
});


// Запуск сервера Express
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

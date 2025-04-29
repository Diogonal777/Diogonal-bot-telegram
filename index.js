const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_TOKEN;
const ADMIN_ID = 6091948159; // ← замени на свой Telegram ID

const bot = new TelegramBot(token, { polling: true });

const userStates = {};

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

  if (['topic1', 'topic2', 'topic3'].includes(data)) {
    userStates[chatId] = { step: 'waiting_question', topic: data };
    bot.editMessageText(`Вы выбрали ${data}. Напишите ваш вопрос:`, {
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
});

// Обработка текстов от пользователя
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  const state = userStates[chatId];
  if (state && state.step === 'waiting_question') {
    const userName = `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim();
    const topic = state.topic;

    // Отправляем вопрос админу
    bot.sendMessage(ADMIN_ID, `Новый вопрос от ${userName} (ID: ${chatId})\nТема: ${topic}\nВопрос: ${text}`);

    // Подтверждение пользователю
    bot.sendMessage(chatId, 'Спасибо, ваш вопрос отправлен!');
    userStates[chatId] = null;

    // Возврат в главное меню
    bot.sendMessage(chatId, 'Что хотите сделать дальше?', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Задать вопрос', callback_data: 'ask' }],
          [{ text: 'Мои проекты', callback_data: 'projects' }],
          [{ text: 'О боте', callback_data: 'about' }]
        ]
      }
    });
  }
});

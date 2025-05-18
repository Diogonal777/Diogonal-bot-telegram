// Основной файл бота Telegram
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { casinoMenu, setBet, playGame } = require('./game/casino');
const { startDuel, handleDuelResponse, activeDuels } = require('./game/duel');
const { startRPG, handleRPGCallback, playerExists } = require('./game/rpg');
const { getBalance, updateBalance } = require('./currency');

// Константы
const ADMIN_ID = 6091948159;
const token = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_TOKEN'; // Замените на свой токен
const PORT = process.env.PORT || 3000;

// Инициализация бота и Express-приложения
const bot = new TelegramBot(token, {
  polling: true // Используйте webhook в производственной среде
});
const app = express();

// Отслеживание состояний пользователей
const userStates = {};
const userQuestions = {};
const pendingQuestions = [];

// Топики для вопросов
const topicTitles = {
  topic1: 'Семья L.E.G.E.N.D.A',
  topic2: 'Канал',
  topic3: 'Личное'
};

// Google Sheets credentials from environment variables
const GOOGLE_CREDENTIALS = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID || "diogonal777-telegram-bot",
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY ? 
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : 
    '',
  client_email: process.env.GOOGLE_CLIENT_EMAIL || "bot-sheets@diogonal777-telegram-bot.iam.gserviceaccount.com",
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.GOOGLE_CERT_URL,
  universe_domain: "googleapis.com"
};

// Create auth client
let authClient = null;

// Директории и файлы для данных
const dataDir = path.join(__dirname, 'data');
const historyFile = path.join(dataDir, 'history.json');
const statsFile = path.join(dataDir, 'stats.json');

// Создаем папку для данных, если её нет
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Создаем файл истории, если его нет
if (!fs.existsSync(historyFile)) {
  fs.writeFileSync(historyFile, JSON.stringify([]), 'utf8');
}

// Создаем файл статистики, если его нет
if (!fs.existsSync(statsFile)) {
  fs.writeFileSync(
    statsFile, 
    JSON.stringify({ 
      total: 0, 
      answered: 0, 
      ignored: 0, 
      users: [], 
      week: getCurrentWeek() 
    }), 
    'utf8'
  );
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

/**
 * Получает текущий номер недели
 * @returns {number} - Номер недели
 */
function getCurrentWeek() {
  const now = new Date();
  const onejan = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((((now - onejan) / 86400000) + onejan.getDay() + 1) / 7);
}

/**
 * Сохраняет запись в историю
 * @param {object} entry - Запись для сохранения
 * @param {boolean} update - Нужно ли обновить существующую запись
 */
function saveToHistory(entry, update = false) {
  try {
    const data = JSON.parse(fs.readFileSync(historyFile, 'utf8'));

    if (update) {
      const index = data.findIndex(e =>
        e.userId === entry.userId &&
        e.question === entry.question
      );

      if (index !== -1) {
        if (!data[index].answer) {
          data[index].answer = entry.answer;
          data[index].timestamp = new Date().toISOString();
        }
      } else {
        // fallback - if not found, add it
        data.push(entry);
      }
    } else {
      const duplicate = data.find(e =>
        e.userId === entry.userId &&
        e.question === entry.question
      );

      if (!duplicate) {
        data.push(entry);
      }
    }

    fs.writeFileSync(historyFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving to history:', err);
  }
}

/**
 * Загружает статистику
 * @returns {object} - Объект статистики
 */
function loadStats() {
  try {
    if (!fs.existsSync(statsFile)) {
      return { total: 0, answered: 0, ignored: 0, users: [], week: getCurrentWeek() };
    }
    return JSON.parse(fs.readFileSync(statsFile, 'utf8'));
  } catch (err) {
    console.error('Error loading stats:', err);
    return { total: 0, answered: 0, ignored: 0, users: [], week: getCurrentWeek() };
  }
}

/**
 * Сохраняет статистику
 * @param {object} stats - Объект статистики
 */
function saveStats(stats) {
  try {
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving stats:', err);
  }
}

/**
 * Инициализирует клиент аутентификации Google
 * @returns {Promise<object>} - Аутентифицированный клиент
 */
async function getAuthClient() {
  if (authClient) return authClient;
  
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: GOOGLE_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    authClient = await auth.getClient();
    return authClient;
  } catch (error) {
    console.error('Google Sheets auth error:', error);
    throw error;
  }
}

/**
 * Добавляет данные в Google таблицу
 * @param {string} spreadsheetId - ID Google таблицы
 * @param {string} range - Диапазон ячеек (например, 'Sheet1!A:C')
 * @param {Array} values - Значения для добавления
 * @returns {Promise<object>} - Ответ API Sheets
 */
async function appendToSheet(spreadsheetId, range, values) {
  try {
    if (!spreadsheetId) {
      console.warn('No spreadsheet ID provided, skipping sheet update');
      return null;
    }
    
    const sheets = google.sheets({ version: 'v4', auth: await getAuthClient() });
    
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [values] }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error appending to sheet:', error);
    throw error;
  }
}

// ==================== ОБРАБОТЧИКИ СООБЩЕНИЙ ====================

/**
 * Обрабатывает callback-запросы (нажатия на кнопки)
 * @param {object} query - Объект запроса
 */
async function handleCallbackQuery(query) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;

  // Проверяем, относится ли callback к RPG-игре
  if (data.startsWith('rpg_') || data === 'rpg_start') {
    // Передаем обработку модулю RPG
    if (handleRPGCallback(bot, query)) {
      return;
    }
  }

  // Игровое меню казино
  if (data === 'casino') {
    casinoMenu(bot, chatId);
    return;
  }

  if (['random', 'blackjack', 'dice', 'slot'].includes(data)) {
    userStates[chatId] = { step: 'casino_bet', gameType: data };
    return setBet(bot, chatId, data);
  }

  // Обработка дуэлей
  if (data.startsWith('accept_duel_') || data.startsWith('reject_duel_')) {
    const duelId = data.substring(data.indexOf('_duel_') + 6);
    const accepted = data.startsWith('accept');
    await handleDuelResponse(bot, duelId, accepted);
    return;
  }

  // Сброс статистики по неделям
  const stats = loadStats();
  if (getCurrentWeek() !== stats.week) {
    stats.total = 0;
    stats.answered = 0;
    stats.ignored = 0;
    stats.users = [];
    stats.week = getCurrentWeek();
    saveStats(stats);
  }

  // Статистика для админа
  if (chatId === ADMIN_ID && data === 'admin_stats') {
    const userList = stats.users.join('\n') || '(нет данных)';
    bot.sendMessage(chatId,
      `📊 Статистика:\n\n` +
      `Всего вопросов: ${stats.total}\n` +
      `Отвечено: ${stats.answered}\n` +
      `Проигнорировано: ${stats.ignored}\n\n` +
      `Писали:\n${userList}`
    );
    return;
  }

  // Очередь вопросов для админа
  if (chatId === ADMIN_ID && data === 'admin_queue') {
    if (pendingQuestions.length === 0) {
      return bot.sendMessage(chatId, 'Очередь пуста — все вопросы обработаны.');
    }

    pendingQuestions.forEach((q, i) => {
      const text = `#${i + 1}\nОт: ${q.userName}\nID: ${q.userId}\nТема: ${q.topic}\nВопрос: ${q.question}`;

      bot.sendMessage(ADMIN_ID, text, {
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Ответить', callback_data: `reply_${q.userId}_${encodeURIComponent(q.question)}` },
            { text: '❌ Игнорировать', callback_data: `ignore_${q.userId}_${encodeURIComponent(q.question)}` }
          ]]
        }
      });
    });
    return;
  }

  // Выгрузка истории для админа
  if (chatId === ADMIN_ID && data === 'admin_history_file') {
    try {
      const data = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      if (!data.length) return bot.sendMessage(chatId, 'История пуста.');

      const lines = data.map((entry, i) => {
        return [
          `#${i + 1}`,
          `Дата: ${entry.timestamp}`,
          `Пользователь: ${entry.userName} (ID: ${entry.userId})`,
          `Тема: ${entry.topic}`,
          `Вопрос: ${entry.question}`,
          `Ответ: ${entry.answer || '(ещё нет)'}`,
          `---`
        ].join('\n');
      });

      const text = lines.join('\n\n');
      const filePath = path.join(dataDir, 'history.txt');
      fs.writeFileSync(filePath, text);
      bot.sendDocument(chatId, filePath);
    } catch (err) {
      console.error('Error reading history:', err);
      bot.sendMessage(chatId, 'Ошибка при чтении истории.');
    }
    return;
  }

  // Ответ админа на вопрос
  if (data.startsWith('reply_')) {
    const parts = data.split('_');
    const targetId = parseInt(parts[1]);
    const question = decodeURIComponent(parts.slice(2).join('_'));
    const stats = loadStats();
    stats.answered++;
    saveStats(stats);
    userStates[ADMIN_ID] = { step: 'awaiting_reply', targetId };

    bot.sendMessage(ADMIN_ID, `Напишите ответ для ${userQuestions[targetId]?.username || '(пользователь)'} (${targetId}):\n\nВопрос: ${question}`);

    const index = pendingQuestions.findIndex(q => q.userId == targetId && q.question === question);
    if (index !== -1) pendingQuestions.splice(index, 1);

    bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: messageId
    });
    return;
  }

  // Игнорирование вопроса админом
  if (data.startsWith('ignore_')) {
    const parts = data.split('_');
    const targetId = parseInt(parts[1]);
    const question = decodeURIComponent(parts.slice(2).join('_'));
    const stats = loadStats();
    stats.ignored++;
    saveStats(stats);
    bot.sendMessage(targetId, 'Ваш вопрос был отклонён администратором.');
    bot.sendMessage(ADMIN_ID, `Вы проигнорировали вопрос от ${targetId}.`);

    const index = pendingQuestions.findIndex(q => q.userId == targetId && q.question === question);
    if (index !== -1) pendingQuestions.splice(index, 1);

    bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: messageId
    });
    return;
  }

  // Основное меню бота
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
  } else if (data === 'projects') {
    bot.editMessageText('Проекты Diogonal777:\n\nСайт: https://diogonal777.github.io/Diogonal-game\nМобильная игра: (потом добавлю)\nСайт: https://taplink.cc/diogonal\nСемья в Grand mobile: https://taplink.cc/l.e.g.e.n.d.a', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [[{ text: 'Назад', callback_data: 'back_to_main' }]]
      }
    });
  } else if (data === 'about me') {
    bot.editMessageText('Я Diogonal777 (Вадим).\nКогда скучно программирую.', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [[{ text: 'Назад', callback_data: 'back_to_main' }]]
      }
    });
  } else if (data === 'about bot') {
    bot.editMessageText('Создаю я бота с небольшой помощью chat GPT. В основном код пишу сам.\n\nБот отвечает в течение минуты. Я буду развивать его. Если что-то не работает — напишите мне @Diogonal777', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [[{ text: 'Назад', callback_data: 'back_to_main' }]]
      }
    });
  }

  // Выбор темы вопроса
  if (['topic1', 'topic2', 'topic3'].includes(data)) {
    const topicTitle = topicTitles[data];
    userStates[chatId] = { step: 'waiting_question', topic: topicTitle };
    bot.editMessageText(`Вы выбрали тему: ${topicTitle}. Напишите ваш вопрос:`, {
      chat_id: chatId,
      message_id: messageId
    });
  }

  // Возврат в главное меню
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
}

/**
 * Обрабатывает обычные сообщения
 * @param {object} msg - Объект сообщения
 */
function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  if (!text) return;
  
  const state = userStates[chatId];

  // Обработка ставки в казино
  if (state && state.step === 'casino_bet') {
    const betAmount = parseInt(text);
    if (isNaN(betAmount)) {
      bot.sendMessage(chatId, 'Пожалуйста, введите число для ставки.');
      return;
    }
    
    playGame(bot, chatId, state.gameType, betAmount);
    userStates[chatId] = null;
    return;
  }

  // Обработка ответа админа на вопрос
  if (chatId === ADMIN_ID && state && state.step === 'awaiting_reply') {
    const targetId = state.targetId;
    const answer = text;

    try {
      bot.sendMessage(targetId, `Ответ на ваш вопрос:\n\n${answer}`);
      
      // Обновляем историю вопросов с ответом
      const entry = {
        userId: targetId,
        question: userQuestions[targetId]?.question || 'Unknown question',
        answer: answer,
        timestamp: new Date().toISOString()
      };
      
      saveToHistory(entry, true);
      
      // Сохраняем в Google Sheets, если настроено
      try {
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;
        if (spreadsheetId) {
          const values = [
            new Date().toISOString(),
            targetId,
            userQuestions[targetId]?.username || 'Unknown',
            userQuestions[targetId]?.question || 'Unknown question',
            answer
          ];
          appendToSheet(spreadsheetId, 'Answers!A:E', values);
        }
      } catch (err) {
        console.error('Google Sheets error:', err);
      }
      
      bot.sendMessage(ADMIN_ID, `Ответ отправлен пользователю ${targetId}.`);
    } catch (err) {
      console.error('Error sending answer:', err);
      bot.sendMessage(ADMIN_ID, `Ошибка при отправке ответа: ${err}`);
    }
    
    userStates[ADMIN_ID] = null;
    return;
  }

  // Обработка нового вопроса
  if (state && state.step === 'waiting_question') {
    const question = text;
    const userName = msg.from?.first_name + (msg.from?.last_name ? ' ' + msg.from.last_name : '');
    const userInfo = `${userName} (@${msg.from?.username || 'no_username'})`;
    
    // Загружаем статистику
    const stats = loadStats();
    stats.total++;
    if (!stats.users.includes(userInfo)) {
      stats.users.push(userInfo);
    }
    saveStats(stats);
    
    // Сохраняем вопрос в историю
    const entry = {
      userId: chatId,
      userName: userInfo,
      topic: state.topic,
      question: question,
      timestamp: new Date().toISOString()
    };
    
    userQuestions[chatId] = {
      topic: state.topic,
      question: question,
      username: userInfo
    };
    
    saveToHistory(entry);
    
    // Добавляем в очередь ожидающих вопросов
    pendingQuestions.push({
      userId: chatId,
      userName: userInfo,
      topic: state.topic,
      question: question
    });
    
    // Уведомляем админа и пользователя
    bot.sendMessage(ADMIN_ID, `Новый вопрос:\nОт: ${userInfo}\nID: ${chatId}\nТема: ${state.topic}\nВопрос: ${question}`);
    bot.sendMessage(chatId, 'Спасибо за ваш вопрос! Я отвечу в ближайшее время.');
    
    userStates[chatId] = null;
  }
}

/**
 * Обрабатывает команды для админа
 * @param {object} msg - Объект сообщения
 */
function handleAdminCommand(msg) {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, 'Панель администратора:', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📊 Статистика', callback_data: 'admin_stats' },
          { text: '📋 Очередь', callback_data: 'admin_queue' }
        ],
        [
          { text: '📥 Выгрузить историю', callback_data: 'admin_history_file' }
        ]
      ]
    }
  });
}

// ==================== НАСТРОЙКА БОТА ====================

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

// Команда /admin
bot.onText(/\/admin/, (msg) => {
  if (msg.chat.id === ADMIN_ID) {
    handleAdminCommand(msg);
  }
});

// Обработчик сообщений
bot.on('message', (msg) => {
  if (msg.text && !msg.text.startsWith('/')) {
    handleMessage(msg);
  }
});

// Обработчик callback-запросов
bot.on('callback_query', (query) => {
  handleCallbackQuery(query);
});

// Запуск Express-сервера
app.get('/', (req, res) => {
  res.send('Telegram bot server is running!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

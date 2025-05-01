// === TELEGRAM BOT DIOGONAL777 ===
// Этот файл обрабатывает Telegram-бота с меню, админкой и Google Таблицами

// ===================== Подключение библиотек =====================
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { Readable } = require('stream');

// ===================== Основные переменные и константы =====================
const token = process.env.TELEGRAM_TOKEN;
const ADMIN_ID = 6091948159;
const bot = new TelegramBot(token);
const app = express();
const PORT = process.env.PORT || 3000;

const userStates = {};
const userQuestions = {};
const pendingQuestions = [];

// ===================== Работа с файлами истории и статистики =====================
const historyFile = path.join(__dirname, 'history.json');
const statsFile = path.join(__dirname, 'stats.json');
if (!fs.existsSync(historyFile)) fs.writeFileSync(historyFile, JSON.stringify([]));

// ===================== Подключение и авторизация Google API =====================
const GOOGLE_CREDENTIALS = {
  type: "service_account",
  project_id: "diogonal777-telegram-bot",
  private_key_id: "376dbb2cdcaf3e68575cb8c8a7d760d217dbd397",
  private_key: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDNY+zYjFCmVAIh
... (вставь свой полный ключ) ...
-----END PRIVATE KEY-----`,
  client_email: "bot-sheets@diogonal777-telegram-bot.iam.gserviceaccount.com",
  client_id: "102693091709790752792",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/..."
};

const auth = new google.auth.GoogleAuth({
  credentials: GOOGLE_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

async function appendToSheet(spreadsheetId, range, values) {
  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] }
  });
}
// ===================== Функции: работа со статистикой =====================
function getCurrentWeek() {
  const now = new Date();
  const onejan = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((((now - onejan) / 86400000) + onejan.getDay() + 1) / 7);
}

function loadStats() {
  try {
    if (!fs.existsSync(statsFile)) {
      return { total: 0, answered: 0, ignored: 0, users: [], week: getCurrentWeek() };
    }
    return JSON.parse(fs.readFileSync(statsFile, 'utf8'));
  } catch {
    return { total: 0, answered: 0, ignored: 0, users: [], week: getCurrentWeek() };
  }
}

function saveStats(stats) {
  fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
}

let stats = loadStats();

// ===================== Функции: сохранение истории вопросов =====================
function saveToHistory(entry, update = false) {
  try {
    const data = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    if (update) {
      const index = data.findIndex(e =>
        e.userId === entry.userId && e.question === entry.question
      );
      if (index !== -1 && !data[index].answer) {
        data[index].answer = entry.answer;
        data[index].timestamp = new Date().toISOString();
      } else {
        data.push(entry);
      }
    } else {
      const duplicate = data.find(e =>
        e.userId === entry.userId && e.question === entry.question
      );
      if (!duplicate) data.push(entry);
    }
    fs.writeFileSync(historyFile, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Ошибка при сохранении в историю:', err);
  }
}

// ===================== Команда /start — главное меню =====================
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
// ===================== Обработка callback-кнопок =====================
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;

  // --- Админская кнопка: очередь ---
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

  // --- Ответить на вопрос ---
  if (data.startsWith('reply_')) {
    const parts = data.split('_');
    const targetId = parts[1];
    const question = decodeURIComponent(parts.slice(2).join('_'));

    userStates[ADMIN_ID] = { step: 'awaiting_reply', targetId };

    bot.sendMessage(ADMIN_ID, `Напишите ответ для пользователя ${userQuestions[targetId]?.username || '(пользователь)'} (${targetId}):\n\nВопрос: ${question}`);

    const index = pendingQuestions.findIndex(q => q.userId == targetId && q.question === question);
    if (index !== -1) pendingQuestions.splice(index, 1);

    bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: messageId
    });
    return;
  }

  // --- Игнорировать вопрос ---
  if (data.startsWith('ignore_')) {
    const parts = data.split('_');
    const targetId = parts[1];
    const question = decodeURIComponent(parts.slice(2).join('_'));

    bot.sendMessage(targetId, 'Ваш вопрос был отклонён администратором.');
    bot.sendMessage(ADMIN_ID, `Вы проигнорировали вопрос от ${targetId}.`);

    const index = pendingQuestions.findIndex(q => q.userId == targetId && q.question === question);
    if (index !== -1) pendingQuestions.splice(index, 1);

    saveToHistory({
      userId: targetId,
      userName: userQuestions[targetId]?.name || '(неизвестно)',
      topic: userQuestions[targetId]?.topic || '(неизвестно)',
      question,
      answer: '(вопрос проигнорирован)',
      timestamp: new Date().toISOString()
    }, true);

    bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: messageId
    });
    return;
  }

  // --- Пользовательские кнопки ---
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
    return;
  }

  if (data === 'projects') {
    bot.editMessageText('Это тест 1', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [[{ text: 'Назад', callback_data: 'back_to_main' }]]
      }
    });
    return;
  }

  if (data === 'about bot') {
    bot.editMessageText('Это тест 2', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [[{ text: 'Назад', callback_data: 'back_to_main' }]]
      }
    });
    return;
  }

  if (['topic1', 'topic2', 'topic3'].includes(data)) {
    userStates[chatId] = { step: 'waiting_question', topic: data };
    bot.editMessageText(`Вы выбрали ${data}. Напишите ваш вопрос:`, {
      chat_id: chatId,
      message_id: messageId
    });
    return;
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
    return;
  }

  // --- История (текстовый файл) ---
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
      const filePath = path.join(__dirname, 'history.txt');
      fs.writeFileSync(filePath, text);
      bot.sendDocument(chatId, filePath);
    } catch {
      bot.sendMessage(chatId, 'Ошибка при чтении истории.');
    }
  }

  bot.answerCallbackQuery(query.id);
});
// ===================== Обработка текстовых сообщений =====================
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const state = userStates[chatId];

  // Админ отвечает на вопрос
  if (msg.chat.id === ADMIN_ID && userStates[ADMIN_ID]?.step === 'awaiting_reply') {
    const targetId = userStates[ADMIN_ID].targetId;
    const question = userQuestions[targetId]?.question || '(вопрос не найден)';

    bot.sendMessage(targetId, `Ваш вопрос:\n${question}\n\nОтвет администратора:\n${text}`);
    bot.sendMessage(ADMIN_ID, 'Ответ отправлен.');

    appendToSheet(
      '111tEpDpi7RzCYbhcpxGFgWbxMQtuwYTRPcC2CXPH5ZU',
      'Лист1!A1',
      [
        new Date().toLocaleString(),
        targetId,
        userQuestions[targetId]?.name || '(неизвестно)',
        userQuestions[targetId]?.username || '',
        userQuestions[targetId]?.topic || '',
        question,
        text
      ]
    );

    saveToHistory({
      userId: targetId,
      userName: userQuestions[targetId]?.name || '(неизвестно)',
      topic: userQuestions[targetId]?.topic || '(неизвестно)',
      question,
      answer: text,
      timestamp: new Date().toISOString()
    }, true);

    stats.answered++;
    saveStats(stats);
    userStates[ADMIN_ID] = null;
    return;
  }

  // Пользователь задаёт вопрос
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

    pendingQuestions.push({
      userId: chatId,
      userName: `${userName} (${username})`,
      topic,
      question: text
    });

    saveToHistory({
      userId: chatId,
      userName,
      username,
      topic,
      question: text,
      answer: '',
      timestamp: new Date().toISOString()
    });

    stats.total++;
    if (!stats.users.includes(userName)) stats.users.push(userName);
    saveStats(stats);

    bot.sendMessage(chatId, 'Ваш вопрос отправлен! Ожидайте ответа.', {
      reply_markup: {
        inline_keyboard: [[{ text: 'Назад', callback_data: 'back_to_main' }]]
      }
    });

    // Отправка админу
    bot.sendMessage(ADMIN_ID,
      `Новый вопрос:\n\nОт: ${userName} (${username})\nID: ${chatId}\nТема: ${topic}\n\nВопрос:\n${text}`, {
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Ответить', callback_data: `reply_${chatId}_${encodeURIComponent(text)}` },
            { text: '❌ Игнорировать', callback_data: `ignore_${chatId}_${encodeURIComponent(text)}` }
          ]]
        }
      });

    userStates[chatId] = null;
  }
});

// ===================== Команда /admin с кнопками =====================
bot.onText(/\/admin/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) {
    return bot.sendMessage(msg.chat.id, 'Это команда только для администратора.');
  }

  bot.sendMessage(ADMIN_ID, 'Выберите действие:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '1. Админ панель', url: 'https://diogonal-bot-telegram.onrender.com/admin' }],
        [{ text: '2. Очередь', callback_data: 'admin_queue' }],
        [{ text: '3. История (файл)', callback_data: 'admin_history_file' }],
        [
          { text: '4. Статистика (таблица)', url: 'https://docs.google.com/spreadsheets/d/1yJ8FDwfC9txPFSr3DSzhQ4bsIJ5XzQJAp_JvxLdXEOs/edit' },
          { text: '5. История (таблица)', url: 'https://docs.google.com/spreadsheets/d/111tEpDpi7RzCYbhcpxGFgWbxMQtuwYTRPcC2CXPH5ZU/edit' }
        ]
      ]
    }
  });
});

// ===================== Веб-сервер Express =====================
app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get('/admin', (req, res) => {
  let html = `
    <html><head><meta charset="UTF-8"><title>Очередь</title>
    <style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #ccc;padding:8px}th{background:#eee}tr:hover{background:#f5f5f5}</style></head><body>
    <h2>Очередь вопросов</h2><table><tr><th>#</th><th>Пользователь</th><th>Тема</th><th>Вопрос</th></tr>
  `;

  pendingQuestions.forEach((q, i) => {
    html += `<tr><td>${i + 1}</td><td>${q.userName}<br><small>ID: ${q.userId}</small></td><td>${q.topic}</td><td>${q.question}</td></tr>`;
  });

  html += `</table><p>Всего: ${pendingQuestions.length}</p></body></html>`;
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');

const token = process.env.TELEGRAM_TOKEN;
const ADMIN_ID = 6091948159;

const bot = new TelegramBot(token);
const userStates = {};
const userQuestions = {};
const pendingQuestions = [];
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');
const historyFile = path.join(__dirname, 'history.json');
if (!fs.existsSync(historyFile)) {
  fs.writeFileSync(historyFile, JSON.stringify([]));
}

let stats = loadStats();
const statsFile = path.join(__dirname, 'stats.json');

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

function getCurrentWeek() {
  const now = new Date();
  const onejan = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((((now - onejan) / 86400000) + onejan.getDay() + 1) / 7);
}

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
        // fallback — если не найдено, добавим
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

    fs.writeFileSync(historyFile, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Ошибка при сохранении в историю:', err);
  }
}

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
  if (getCurrentWeek() !== stats.week) {
  stats = { total: 0, answered: 0, ignored: 0, users: [], week: getCurrentWeek() };
  saveStats(stats);
}

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
  const parts = data.split('_');
  const targetId = parts[1];
  const question = decodeURIComponent(parts.slice(2).join('_'));
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
 }
  
if (data.startsWith('ignore_')) {
  const parts = data.split('_');
  const targetId = parts[1];
  const question = decodeURIComponent(parts.slice(2).join('_'));
  stats.ignored++;
  saveStats(stats);
  bot.sendMessage(targetId, 'Ваш вопрос был отклонён администратором.');
  bot.sendMessage(ADMIN_ID, `Вы проигнорировали вопрос от ${targetId}.`);

  const index = pendingQuestions.findIndex(q => q.userId == targetId && q.question === question);
  if (index !== -1) pendingQuestions.splice(index, 1);

  // сохраняем в историю
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
 }
});

// Обработка сообщений
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const state = userStates[chatId];
  if (getCurrentWeek() !== stats.week) {
  stats = { total: 0, answered: 0, ignored: 0, users: [], week: getCurrentWeek() };
  saveStats(stats);
}

  if (chatId === ADMIN_ID && userStates[ADMIN_ID]?.step === 'awaiting_reply') {
    const targetId = userStates[ADMIN_ID].targetId;
    const question = userQuestions[targetId]?.question || '(вопрос не найден)';
    bot.sendMessage(targetId, `Ваш вопрос:\n${question}\n\nОтвет администратора:\n${text}`);
    bot.sendMessage(ADMIN_ID, 'Ответ отправлен.');
    saveToHistory({
     userId: targetId,
     userName: userQuestions[targetId]?.name || '(неизвестно)',
     topic: userQuestions[targetId]?.topic || '(неизвестно)',
     question: question,
     answer: text,
     timestamp: new Date().toISOString()
    }, true);

    userStates[ADMIN_ID] = null;
    return;
  }

  if (state && state.step === 'waiting_question') {
    const userName = `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim();
    const username = msg.from.username ? `@${msg.from.username}` : '(юзернейм отсутствует)';
    const topic = state.topic;
    stats.total++;
     if (!stats.users.includes(userName)) stats.users.push(userName);
     saveStats(stats);
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

    bot.sendMessage(ADMIN_ID,
      `Новый вопрос:\n\nОт: ${userName} (${username})\nID: ${chatId}\nТема: ${topic}\n\nВопрос:\n${text}`, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Ответить', callback_data: `reply_${chatId}_${encodeURIComponent(text)}` },
              { text: '❌ Игнорировать', callback_data: `ignore_${chatId}_${encodeURIComponent(text)}` }
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
app.get('/admin', (req, res) => {
  let html = `
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Админ-панель</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 8px; }
        th { background-color: #f4f4f4; }
        tr:hover { background-color: #f0f0f0; }
        .small { font-size: 0.9em; color: gray; }
      </style>
    </head>
    <body>
      <h1>Очередь вопросов</h1>
      <table>
        <tr><th>#</th><th>Пользователь</th><th>Тема</th><th>Вопрос</th></tr>
  `;

  pendingQuestions.forEach((q, i) => {
    html += `<tr>
      <td>${i + 1}</td>
      <td>${q.userName}<br><span class="small">ID: ${q.userId}</span></td>
      <td>${q.topic}</td>
      <td>${q.question}</td>
    </tr>`;
  });

  html += `
      </table>
      <p>Всего в очереди: ${pendingQuestions.length}</p>
    </body>
    </html>
  `;

  res.send(html);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
bot.onText(/\/stats/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;

  const userList = Array.from(stats.users).join('\n') || '(нет данных)';
  bot.sendMessage(ADMIN_ID,
  `📊 Статистика за эту неделю:\n\n` +
  `Всего вопросов: ${stats.total}\n` +
  `Отвечено: ${stats.answered}\n` +
  `Проигнорировано: ${stats.ignored}\n\n` +
  `Писали:\n${stats.users.join('\n') || '(никто)'}`
  );
});

bot.onText(/\/history/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;

  try {
    const data = JSON.parse(fs.readFileSync(historyFile, 'utf8'));

    if (!data.length) {
      return bot.sendMessage(ADMIN_ID, 'История пуста.');
    }

    const lines = data.map((entry, i) => {
      return [
        `#${i + 1}`,
        `Дата: ${new Date(entry.timestamp).toLocaleString()}`,
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

    bot.sendDocument(ADMIN_ID, filePath, {}, {
      filename: 'history.txt',
      contentType: 'text/plain'
    });

  } catch (err) {
    console.error('Ошибка при отправке истории:', err);
    bot.sendMessage(ADMIN_ID, 'Произошла ошибка при чтении истории.');
  }
});

bot.onText(/^\/(stats|history)$/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) {
    return bot.sendMessage(msg.chat.id, 'Это команда для администратора.');
  }
});

bot.onText(/\/очередь/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;

  if (pendingQuestions.length === 0) {
    return bot.sendMessage(ADMIN_ID, 'Очередь пуста — все вопросы обработаны.');
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
});

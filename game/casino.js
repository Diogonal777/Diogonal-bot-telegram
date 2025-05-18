// Логика для казино
const { startGame, GAMES } = require('./gameLogic');

/**
 * Отображает меню казино
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 */
function casinoMenu(bot, chatId) {
  bot.sendMessage(chatId, '🎰 Выберите игру:', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🎲 Случайное число', callback_data: 'random' },
          { text: '🃏 Блэкджек', callback_data: 'blackjack' }
        ],
        [
          { text: '🎯 Кости', callback_data: 'dice' },
          { text: '🎰 Слоты', callback_data: 'slot' }
        ],
        [
          { text: '« Назад', callback_data: 'back_to_main' }
        ]
      ]
    }
  });
}

/**
 * Просит пользователя указать сумму ставки
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 * @param {string} gameType - Тип выбранной игры
 */
function setBet(bot, chatId, gameType) {
  const game = GAMES[gameType];
  
  if (!game) {
    return bot.sendMessage(chatId, 'Игра недоступна');
  }
  
  let gameName;
  switch (gameType) {
    case 'random': gameName = 'Случайное число'; break;
    case 'blackjack': gameName = 'Блэкджек'; break;
    case 'dice': gameName = 'Кости'; break;
    case 'slot': gameName = 'Слоты'; break;
    default: gameName = gameType;
  }
  
  bot.sendMessage(
    chatId, 
    `Вы выбрали: ${gameName}\n\nМинимальная ставка: ${game.minBet}\nМаксимальная ставка: ${game.maxBet}\nВыигрыш: x${game.winMultiplier}\n\nУкажите сумму ставки:`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '« Назад к играм', callback_data: 'casino' }
          ]
        ]
      }
    }
  );
}

/**
 * Запускает выбранную игру
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 * @param {string} gameType - Тип игры
 * @param {number} betAmount - Сумма ставки
 */
function playGame(bot, chatId, gameType, betAmount) {
  startGame(bot, chatId, gameType, betAmount);
}

module.exports = { casinoMenu, setBet, playGame };

// Игровая логика для всех игр казино
const { getBalance, updateBalance } = require('../currency');

// Конфигурации игр
const GAMES = {
  random: {
    minBet: 10,
    maxBet: 1000,
    winMultiplier: 1.8
  },
  blackjack: {
    minBet: 20,
    maxBet: 1500,
    winMultiplier: 2.0
  },
  dice: {
    minBet: 5,
    maxBet: 500,
    winMultiplier: 1.5
  },
  slot: {
    minBet: 15,
    maxBet: 1200,
    winMultiplier: 2.5
  }
};

/**
 * Offer to play another round
 */
function offerPlayAgain(bot, chatId, gameType) {
  bot.sendMessage(chatId, 'Хотите сыграть еще раз?', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Да', callback_data: gameType },
          { text: 'Другая игра', callback_data: 'casino' },
          { text: 'Нет', callback_data: 'back_to_main' }
        ]
      ]
    }
  });
}

/**
 * Simple 50/50 game
 */
function playRandomGame() {
  const win = Math.random() >= 0.5;
  return {
    win,
    message: win ? 'Вы угадали!' : 'Не повезло, попробуйте еще раз!'
  };
}

/**
 * Simulated blackjack game
 */
function playBlackjackGame() {
  const playerCard1 = Math.floor(Math.random() * 10) + 1;
  const playerCard2 = Math.floor(Math.random() * 10) + 1;
  const dealerCard1 = Math.floor(Math.random() * 10) + 1;
  const dealerCard2 = Math.floor(Math.random() * 10) + 1;
  
  const playerSum = playerCard1 + playerCard2;
  const dealerSum = dealerCard1 + dealerCard2;
  
  const win = playerSum > dealerSum;
  return {
    win,
    message: `Ваши карты: ${playerCard1}, ${playerCard2} (${playerSum})\nКарты дилера: ${dealerCard1}, ${dealerCard2} (${dealerSum})`
  };
}

/**
 * Dice rolling game
 */
function playDiceGame() {
  const playerRoll = Math.floor(Math.random() * 6) + 1;
  const botRoll = Math.floor(Math.random() * 6) + 1;
  
  const win = playerRoll > botRoll;
  return {
    win,
    message: `Вы выбросили: ${playerRoll}\nБот выбросил: ${botRoll}`
  };
}

/**
 * Slot machine game
 */
function playSlotGame() {
  const symbols = ['🍎', '🍊', '🍋', '🍒', '💎', '7️⃣'];
  const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
  const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
  const reel3 = symbols[Math.floor(Math.random() * symbols.length)];
  
  const win = reel1 === reel2 || reel2 === reel3 || reel1 === reel3;
  return {
    win,
    message: `[ ${reel1} | ${reel2} | ${reel3} ]`
  };
}

/**
 * Play a round of the selected game
 * @param {string} gameType 
 * @param {number} userId 
 * @param {number} betAmount 
 * @returns {Promise<{win: boolean, message: string}>}
 */
async function playGameRound(gameType, userId, betAmount) {
  switch (gameType) {
    case 'random':
      return playRandomGame();
    case 'blackjack':
      return playBlackjackGame();
    case 'dice':
      return playDiceGame();
    case 'slot':
      return playSlotGame();
    default:
      throw new Error('Unsupported game type');
  }
}

/**
 * Starts a game session
 * @param {object} bot - Telegram bot instance
 * @param {number} chatId - User's chat ID
 * @param {string} gameType - Type of game
 * @param {number} betAmount - Amount being bet
 * @return {Promise<void>}
 */
async function startGame(bot, chatId, gameType, betAmount) {
  try {
    // Validate game type
    if (!GAMES[gameType]) {
      return bot.sendMessage(chatId, 'Игра недоступна');
    }
    
    // Get current balance
    const balance = await getBalance(chatId);
    
    // Validate bet amount
    if (betAmount > balance) {
      return bot.sendMessage(chatId, `Недостаточно средств. Ваш баланс: ${balance}`);
    }
    
    const game = GAMES[gameType];
    if (betAmount < game.minBet || betAmount > game.maxBet) {
      return bot.sendMessage(chatId, 
        `Ставка должна быть между ${game.minBet} и ${game.maxBet}`);
    }
    
    // Generic game logic
    const result = await playGameRound(gameType, chatId, betAmount);
    
    if (result.win) {
      const winAmount = Math.floor(betAmount * game.winMultiplier);
      await updateBalance(chatId, winAmount);
      bot.sendMessage(chatId, `🎉 Вы выиграли ${winAmount} монет!\n${result.message}\nВаш баланс: ${await getBalance(chatId)}`);
    } else {
      await updateBalance(chatId, -betAmount);
      bot.sendMessage(chatId, `😢 Вы проиграли ${betAmount} монет.\n${result.message}\nВаш баланс: ${await getBalance(chatId)}`);
    }
    
    // Offer to play again
    offerPlayAgain(bot, chatId, gameType);
    
  } catch (error) {
    console.error('Game error:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при запуске игры');
  }
}

module.exports = { startGame, GAMES, playRandomGame, playBlackjackGame, playDiceGame, playSlotGame };

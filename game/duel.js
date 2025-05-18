// Логика для дуэлей между пользователями
const { getBalance, updateBalance } = require('../currency');

// Отслеживание активных дуэлей
const activeDuels = new Map();

/**
 * Начинает дуэль между пользователями
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} challengerId - ID пользователя, который бросил вызов
 * @param {number} opponentId - ID пользователя-оппонента
 * @param {number} amount - Сумма ставки
 */
async function startDuel(bot, challengerId, opponentId, amount) {
  try {
    // Проверяем корректность входных данных
    if (!challengerId || !opponentId || amount <= 0) {
      return bot.sendMessage(challengerId, 'Некорректные параметры дуэли');
    }
    
    // Проверяем, достаточно ли у пользователя средств
    const challengerBalance = await getBalance(challengerId);
    if (challengerBalance < amount) {
      return bot.sendMessage(
        challengerId, 
        `Недостаточно средств для дуэли. Ваш баланс: ${challengerBalance}`
      );
    }
    
    // Создаем запрос на дуэль
    const duelId = `${challengerId}_${opponentId}_${Date.now()}`;
    activeDuels.set(duelId, { 
      challengerId, 
      opponentId, 
      amount, 
      status: 'pending' 
    });
    
    // Отправляем вызов оппоненту
    bot.sendMessage(
      opponentId,
      `Пользователь предлагает вам дуэль на ${amount} монет!\nПринять?`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Принять', callback_data: `accept_duel_${duelId}` },
              { text: 'Отклонить', callback_data: `reject_duel_${duelId}` }
            ]
          ]
        }
      }
    );
    
    // Уведомляем инициатора дуэли
    bot.sendMessage(
      challengerId,
      `Вызов на дуэль отправлен. Ожидайте ответа противника.`
    );
    
    // Устанавливаем таймер истечения вызова
    setTimeout(() => {
      const duel = activeDuels.get(duelId);
      if (duel && duel.status === 'pending') {
        activeDuels.delete(duelId);
        bot.sendMessage(challengerId, 'Время ожидания дуэли истекло.');
        bot.sendMessage(opponentId, 'Время для принятия дуэли истекло.');
      }
    }, 300000); // 5 minutes
    
  } catch (error) {
    console.error('Duel error:', error);
    bot.sendMessage(challengerId, 'Произошла ошибка при создании дуэли');
  }
}

/**
 * Handle duel acceptance
 * @param {object} bot - Telegram bot instance
 * @param {string} duelId - ID of the duel
 * @param {boolean} accepted - Whether the duel was accepted
 */
async function handleDuelResponse(bot, duelId, accepted) {
  const duel = activeDuels.get(duelId);
  if (!duel) {
    return bot.sendMessage(
      0, // This will be fixed in the callback handler
      'Эта дуэль больше недоступна.'
    );
  }
  
  if (!accepted) {
    activeDuels.delete(duelId);
    bot.sendMessage(duel.challengerId, 'Противник отклонил вызов на дуэль.');
    bot.sendMessage(duel.opponentId, 'Вы отклонили вызов на дуэль.');
    return;
  }
  
  // Check opponent's balance
  const opponentBalance = await getBalance(duel.opponentId);
  if (opponentBalance < duel.amount) {
    activeDuels.delete(duelId);
    bot.sendMessage(
      duel.challengerId, 
      'Противник не имеет достаточно средств для дуэли.'
    );
    bot.sendMessage(
      duel.opponentId, 
      `У вас недостаточно средств для дуэли. Баланс: ${opponentBalance}`
    );
    return;
  }
  
  // Process the duel
  duel.status = 'active';
  activeDuels.set(duelId, duel);
  
  // Determine winner (50/50 chance)
  const challengerWins = Math.random() >= 0.5;
  const winnerId = challengerWins ? duel.challengerId : duel.opponentId;
  const loserId = challengerWins ? duel.opponentId : duel.challengerId;
  
  // Update balances
  await updateBalance(winnerId, duel.amount);
  await updateBalance(loserId, -duel.amount);
  
  // Send results to both participants
  bot.sendMessage(
    duel.challengerId,
    challengerWins 
      ? `🏆 Вы победили в дуэли и выиграли ${duel.amount} монет!` 
      : `😢 Вы проиграли дуэль и потеряли ${duel.amount} монет.`
  );
  
  bot.sendMessage(
    duel.opponentId,
    challengerWins 
      ? `😢 Вы проиграли дуэль и потеряли ${duel.amount} монет.` 
      : `🏆 Вы победили в дуэли и выиграли ${duel.amount} монет!`
  );
  
  // Clean up
  activeDuels.delete(duelId);
}

module.exports = { 
  startDuel,
  handleDuelResponse,
  activeDuels
};

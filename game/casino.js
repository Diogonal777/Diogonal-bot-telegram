function playCasino(bot, chatId) {
    bot.sendMessage(chatId, "Выберите ставку:", {
        reply_markup: {
            keyboard: [
                ['10', '50', '100'],
                ['Игра ', 'Выход'],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
        },
    });

// Обработка нажатия кнопок с ставками
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    if (['10', '50', '100'].includes(msg.text)) {
        const bet = parseInt(msg.text);
        if (bet > userFunds) {
            bot.sendMessage(chatId, "Недостаточно средств для этой ставки.");
        } else {
            // Логика игры: выигрыш или проигрыш
            const win = Math.random() < 0.5; // Заменить на вашу логику
            if (win) {
                userFunds += bet;
                bot.sendMessage(chatId, `Вы выиграли! Теперь у вас: ${userFunds}`);
            } else {
                userFunds -= bet;
                bot.sendMessage(chatId, `Вы проиграли! Теперь у вас: ${userFunds}`);
            }
        }
    } else if (msg.text === 'Игра') {
        bot.sendMessage(chatId, "Выберите ставку:");
        // Отправка меню с кнопками ставок вновь
    } else if (msg.text === 'Выход') {
        bot.sendMessage(chatId, "Спасибо за игру! До свидания!");
    } else {
        bot.sendMessage(chatId, "Пожалуйста, выберите правильную опцию.");
    }
});
}
module.exports = { userFunds };
module.exports = { playCasino };

function casinoMenu(bot, chatId) {
    const keyboard = {
        inline_keyboard: [
            [{ text: "🎲 Рандом", callback_data: "random" }],
            [{ text: "🃏 Black Jack", callback_data: "blackjack" }],
            [{ text: "🎲 Кости", callback_data: "dice" }],
            [{ text: "🎰 Игровой автомат", callback_data: "slot" }]
        ]
    };
    bot.sendMessage(chatId, "🎰 Добро пожаловать в казино!\nВыберите игру:", { reply_markup: keyboard });
}

async function setBet(bot, chatId, gameType) {
    bot.sendMessage(chatId, `💰 Напишите вашу ставку (не больше 100000) для **${gameType}**.`);
}

async function playGame(bot, chatId, gameType, bet) {
    if (bet > 100000) {
        bot.sendMessage(chatId, "❌ Ставка слишком большая! Максимальная сумма — 100000.");
        return;
    }

    let result;
    switch (gameType) {
        case "random":
            result = Math.random() < 0.5 ? "✅ Победа! 🎉" : "❌ Проигрыш...";
            break;
        case "blackjack":
            result = playBlackJack();
            break;
        case "dice":
            result = playDice();
            break;
        case "slot":
            result = playSlot();
            break;
        default:
            result = "❌ Ошибка! Попробуйте снова.";
    }

    bot.sendMessage(chatId, `🎰 Результат игры **${gameType}**:\n${result}`);
}

// Логика игр
function playBlackJack() {
    const playerScore = Math.floor(Math.random() * 21) + 1;
    const dealerScore = Math.floor(Math.random() * 21) + 1;
    return `🃏 Ваш счет: ${playerScore}, счет дилера: ${dealerScore}. ` +
        (playerScore > dealerScore ? "✅ Победа!" : "❌ Вы проиграли...");
}

function playDice() {
    const playerRoll = Math.floor(Math.random() * 6) + 1;
    const botRoll = Math.floor(Math.random() * 6) + 1;
    return `🎲 Вы бросили: ${playerRoll}, бот бросил: ${botRoll}. ` +
        (playerRoll > botRoll ? "✅ Вы победили!" : "❌ Проигрыш...");
}

function playSlot() {
    const symbols = ["🍒", "🔔", "⭐", "7️⃣", "🍀"];
    const slotResult = [symbols[Math.floor(Math.random() * symbols.length)],
                        symbols[Math.floor(Math.random() * symbols.length)],
                        symbols[Math.floor(Math.random() * symbols.length)]];
    return `🎰 Ваша комбинация: ${slotResult.join(" | ")}\n` +
        (slotResult[0] === slotResult[1] && slotResult[1] === slotResult[2] ? "✅ Джекпот!" : "❌ Попробуйте ещё...");
}

module.exports = { casinoMenu, setBet, playGame };

function playCasino(chatId) {
    const result = Math.random() < 0.5 ? "Вы проиграли 😢" : "Вы выиграли 100 монет! 🎉";
    bot.sendMessage(chatId, `🎰 Казино бросает кости...\n${result}`);
}
module.exports = { playCasino };

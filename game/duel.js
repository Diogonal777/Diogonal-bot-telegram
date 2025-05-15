function startDuel(chatId) {
    bot.sendMessage(chatId, "⚔️ Дуэль началась! Выберите действие: Атака, Защита, Магия.");
}
module.exports = { startDuel };

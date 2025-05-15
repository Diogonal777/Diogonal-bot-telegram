const { User } = require("./database");

async function getBalance(userId) {
    let user = await User.findOne({ userId });
    if (!user) {
        user = new User({ userId });
        await user.save();
    }
    return user.balance;
}

async function updateBalance(userId, amount) {
    let user = await User.findOne({ userId });
    if (!user) {
        user = new User({ userId });
        await user.save();
    }
    user.balance += amount;
    await user.save();
    return user.balance;
}

module.exports = { getBalance, updateBalance };

const mongoose = require("mongoose");

mongoose.connect("mongodb+srv://YOUR_MONGO_URL", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
    userId: Number,
    balance: { type: Number, default: 100 }  // Начальный баланс
});

const User = mongoose.model("User", userSchema);

module.exports = { User };
const mongoose = require("mongoose");

mongoose.connect("mongodb+srv://YOUR_MONGO_URL", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
    userId: Number,
    balance: { type: Number, default: 100 }  // Начальный баланс
});

const User = mongoose.model("User", userSchema);

module.exports = { User };

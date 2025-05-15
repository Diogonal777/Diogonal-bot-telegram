// currency.js
const { db } = require('./firebase'); // Импортируем инициализированный экземпляр Firestore

/**
 * Получает баланс пользователя.
 *
 * Если пользователь не найден, создаёт запись с начальными 100 монетами.
 *
 * @param {number|string} userId — идентификатор пользователя.
 * @returns {Promise<number>} баланс пользователя.
 */
async function getBalance(userId) {
  const userRef = db.collection("users").doc(String(userId));
  const docSnap = await userRef.get();

  if (!docSnap.exists) {
    // Создаём пользователя с начальным балансом 100
    await userRef.set({ balance: 100 });
    return 100;
  }

  return docSnap.data().balance;
}

/**
 * Обновляет баланс пользователя.
 *
 * @param {number|string} userId — идентификатор пользователя.
 * @param {number} amount — сумма, на которую нужно изменить баланс.
 * @returns {Promise<number>} новый баланс пользователя.
 */
async function updateBalance(userId, amount) {
  const userRef = db.collection("users").doc(String(userId));
  const docSnap = await userRef.get();
  let currentBalance = 0;

  if (!docSnap.exists) {
    // Если пользователя нет, создаём его с начальным балансом 100
    currentBalance = 100;
  } else {
    currentBalance = docSnap.data().balance;
  }

  const newBalance = currentBalance + amount;
  await userRef.set({ balance: newBalance });
  return newBalance;
}

module.exports = { getBalance, updateBalance };

import { db, doc, getDoc, setDoc } from "./firebase.js";

async function getBalance(userId) {
    const userRef = doc(db, "users", String(userId));
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        // Создаем пользователя с первоначальным балансом (например, 100)
        await setDoc(userRef, { balance: 100 });
        return 100;
    }
    const data = userSnap.data();
    return data.balance;
}

async function updateBalance(userId, amount) {
    const userRef = doc(db, "users", String(userId));
    const userSnap = await getDoc(userRef);
    let currentBalance = 0;
  
    if (!userSnap.exists()) {
        // Если пользователь не существует, то создаем с начальными 100 монетами
        currentBalance = 100;
    } else {
        currentBalance = userSnap.data().balance;
    }
  
    const newBalance = currentBalance + amount;
    await setDoc(userRef, { balance: newBalance });
    return newBalance;
}

export { getBalance, updateBalance };

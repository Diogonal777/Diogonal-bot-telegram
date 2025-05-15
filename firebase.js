import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBI9shbtF-E7EXGY5xrLYoh5_AyKzmyl80",
  authDomain: "database-fot-tg-bot.firebaseapp.com",
  projectId: "database-fot-tg-bot",
  storageBucket: "database-fot-tg-bot.firebasestorage.app",
  messagingSenderId: "565333513096",
  appId: "1:565333513096:web:09d011af5c72fe8c97603d",
  measurementId: "G-244JWB8K2Z"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, doc, setDoc, getDoc };

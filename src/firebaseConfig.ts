import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDbn5rXkJec4YLUZGa1hrI0x6wSahAhET0",
  authDomain: "food-track-7bec0.firebaseapp.com",
  projectId: "food-track-7bec0",
  storageBucket: "food-track-7bec0.firebasestorage.app",
  messagingSenderId: "1008407401936",
  appId: "1:1008407401936:web:f8ff46e7ce5ca9ae0595d5",
  databaseURL:
    "https://food-track-7bec0-default-rtdb.europe-west1.firebasedatabase.app/",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const storage = getStorage(app);
const db = getFirestore(app);
const database = getDatabase(app);
const functions = getFunctions(app);

export { auth, provider, storage, db, database, functions, onAuthStateChanged };

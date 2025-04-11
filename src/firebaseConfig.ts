import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  connectAuthEmulator,
} from "firebase/auth";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";

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

// Connect to local emulator if running locally

if (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
) {
  console.warn("Running in local environment, connecting to emulators");
  connectAuthEmulator(auth, "http://localhost:9099");
  connectStorageEmulator(storage, "localhost", 9199);
  connectFirestoreEmulator(db, "localhost", 8080);
  connectDatabaseEmulator(database, "localhost", 9000);
  connectFunctionsEmulator(functions, "localhost", 5001);
}

export { auth, provider, storage, db, database, functions, onAuthStateChanged };

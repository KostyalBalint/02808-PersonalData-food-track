import { initializeApp, } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";


// Your web app's Firebase configuration
export const firebaseConfig = {
    apiKey: "AIzaSyDbn5rXkJec4YLUZGa1hrI0x6wSahAhET0",
    authDomain: "food-track-7bec0.firebaseapp.com",
    projectId: "food-track-7bec0",
    storageBucket: "food-track-7bec0.firebasestorage.app",
    messagingSenderId: "1008407401936",
    appId: "1:1008407401936:web:f8ff46e7ce5ca9ae0595d5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
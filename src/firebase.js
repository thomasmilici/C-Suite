import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "quinta-os-manager.firebaseapp.com",
    projectId: "quinta-os-manager",
    storageBucket: "quinta-os-manager.firebasestorage.app",
    messagingSenderId: "194677445294",
    appId: "1:194677445294:web:216b0874fdb6353936d33f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');
export const googleProvider = new GoogleAuthProvider();

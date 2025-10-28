// ========================================
// Import the functions you need from the SDKs you need
// ========================================
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// ========================================
// CLIENT CODE (Old Configuration)
// ========================================
// const firebaseConfig = {
//   apiKey: "AIzaSyAzXM2fd2WcR_EdiNh19bA4NOaYmeaAPRU",
//   authDomain: "logitx-73d4e.firebaseapp.com",
//   projectId: "logitx-73d4e",
//   storageBucket: "logitx-73d4e.appspot.com",
//   messagingSenderId: "85610136507",
//   appId: "1:85610136507:web:271daaed8c3f8c6a57ba9e",
//   measurementId: "G-845MSEVQ62",
// };

// ========================================
// CHANGES BY DEVELOPER (New Configuration)
// Your web app's Firebase configuration
// ========================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
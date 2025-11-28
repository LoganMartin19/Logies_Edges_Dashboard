// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";

// --- Firebase Config (from Vercel envs) ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FB_API_KEY,
  authDomain: process.env.REACT_APP_FB_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FB_PROJECT_ID,
  appId: process.env.REACT_APP_FB_APP_ID,
  messagingSenderId: process.env.REACT_APP_FB_MESSAGING_SENDER_ID, // <-- IMPORTANT for web push
};

// --- Initialise App ---
export const app = initializeApp(firebaseConfig);

// --- Auth ---
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// --- Messaging (Web Push) ---
/**
 * Returns Firebase Messaging instance if supported,
 * otherwise returns null safely.
 */
let _messagingPromise;

export function getMessagingSafe() {
  if (!_messagingPromise) {
    _messagingPromise = isSupported().then((supported) => {
      if (!supported) {
        console.log("[push] FCM messaging not supported in this browser");
        return null;
      }
      return getMessaging(app);
    });
  }
  return _messagingPromise;
}
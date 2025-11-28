// src/pushNotifications.js
import { getToken } from "firebase/messaging";
import { getMessagingSafe } from "./firebase";
import { registerPushToken } from "./api";

const VAPID_KEY = process.env.REACT_APP_FB_VAPID_KEY;

/**
 * Ask for browser notification permission + register FCM token
 * for the currently logged-in user.
 */
export async function ensureWebPushForCurrentUser() {
  try {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      console.log("[push] Notifications not supported in this environment");
      return;
    }

    const messaging = await getMessagingSafe();
    if (!messaging) {
      console.log("[push] Firebase messaging not supported in this browser");
      return;
    }

    if (Notification.permission === "denied") {
      console.log("[push] Notifications are blocked by the user");
      return;
    }

    if (Notification.permission !== "granted") {
      const res = await Notification.requestPermission();
      if (res !== "granted") {
        console.log("[push] User did not grant notifications");
        return;
      }
    }

    if (!VAPID_KEY) {
      console.warn("[push] Missing REACT_APP_FB_VAPID_KEY");
      return;
    }

    // ⭐ SERVICE WORKER IS REQUIRED FOR REAL TOKENS ⭐
    const swReg = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (!token) {
      console.warn("[push] No FCM token obtained");
      return;
    }

    await registerPushToken(token, "web");
    console.log("[push] Token registered:", token.substring(0, 12), "…");

  } catch (err) {
    console.error("[push] ensureWebPushForCurrentUser error:", err);
  }
}
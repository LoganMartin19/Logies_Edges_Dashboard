/* global self, importScripts */
importScripts("https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyA1Hg7VoGXxrVfpVTK7pGO7zMiiOK0B8DI",
  authDomain: "logies-edges.firebaseapp.com",
  projectId: "logies-edges",
  storageBucket: "logies-edges.firebasestorage.app",
  messagingSenderId: "456333434841",
  appId: "1:456333434841:web:b226feff71878ee363c3c8",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "New pick", {
    body: body || "",
  });
});
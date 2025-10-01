importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAWaL9PudugFC6PmFvORuUgY6ypFD3RiKI",
    authDomain: "open-chat-ece02.firebaseapp.com",
    projectId: "open-chat-ece02",
    storageBucket: "open-chat-ece02.firebasestorage.app",
    messagingSenderId: "33272456665",
    appId: "1:33272456665:web:4b02cdb56f87c16845a5c8"
});

const messaging = firebase.messaging();

// This handles notifications when your app is in the background or closed
messaging.onBackgroundMessage((payload) => {
  console.log("Received background message:", payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/chat-icon.png"
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

console.log(window.firebase);  // Add this line

// Request notification permission
if (Notification.permission !== "granted") {
  Notification.requestPermission().then(permission => {
    if (permission === "granted") {
      console.log("Notification permission granted.");
    }
  });
}


// Initialize Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyAWaL9PudugFC6PmFvORuUgY6ypFD3RiKI",
    authDomain: "open-chat-ece02.firebaseapp.com",
    projectId: "open-chat-ece02",
    storageBucket: "open-chat-ece02.firebasestorage.app",
    messagingSenderId: "33272456665",
    appId: "1:33272456665:web:4b02cdb56f87c16845a5c8"
  };
firebase.initializeApp(firebaseConfig);


const db = firebase.firestore();
const messagesRef = db.collection("messages");


// Request notification permission and get token
// Initialize Messaging
const messaging = firebase.messaging();

async function requestPermission() {
  try {
    // Register the service worker manually
    const registration = await navigator.serviceWorker.register("/chat-open/firebase-messaging-sw.js");
    console.log("Service Worker registered:", registration);

    // Request notification permission
    const status = await Notification.requestPermission();
    if (status !== "granted") {
      console.log("Permission denied.");
      return;
    }
    console.log("Notification permission granted.");

    // Get FCM token (pass SW registration here)
    const token = await messaging.getToken({
      vapidKey: "YOUR_VAPID_KEY_HERE",
      serviceWorkerRegistration: registration
    });
    console.log("FCM Token:", token);

    // Save token in Firestore
    await firebase.firestore().collection("fcmTokens").doc(token).set({ token });

  } catch (err) {
    console.error("Error getting permission or token", err);
  }
}

requestPermission();




async function sendPushToAll(title, body) {
  // Get all tokens from Firestore
  const snapshot = await firebase.firestore().collection("fcmTokens").get();
  snapshot.forEach(async (doc) => {
    const token = doc.id; // since token is doc id
    await fetch("https://open-chat.harry390plays2.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, title, body })
    });
  });
}


// Send a message
function sendMessage() {
  const name = document.getElementById("name").value;
  const text = document.getElementById("message").value;
  if (name && text) {
    messagesRef.add({
      name: name,
      text: text,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById("message").value = "";

    // 🔔 Trigger push for everyone
    sendPushToAll("新しいブツが送信された", `${name}: ${text}`);
  }
}

// Function to convert URLs in text to clickable links
function linkify(text) {
  const urlPattern = /(\bhttps?:\/\/[^\s<]+)/gi;
  return text.replace(urlPattern, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

// Listen for new messages
let knownMessageIds = new Set(); // To keep track of known message IDs
messagesRef.orderBy("timestamp").onSnapshot(snapshot => {
  const messagesDiv = document.getElementById("messages");

  snapshot.forEach(doc => {
    const msg = doc.data();
    const id = doc.id;

    if (!knownMessageIds.has(id)) {
      // Use linkify to convert URLs to links
      const safeText = linkify(msg.text);
      messagesDiv.innerHTML += `<p><strong>${msg.name}:</strong> ${safeText}</p>`;
      knownMessageIds.add(id);
    }
  });

  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});


// Add event listener to the message input field to send message on Enter key press
const input = document.getElementById("message");
  const sendButton = document.getElementById("sendButton");
  input.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent form submission if inside a form
      sendButton.click();
    }
  }
);






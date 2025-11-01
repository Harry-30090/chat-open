console.log(window.firebase);

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAWaL9PudugFC6PmFvORuUgY6ypFD3RiKI",
  authDomain: "open-chat-ece02.firebaseapp.com",
  projectId: "open-chat-ece02",
  storageBucket: "open-chat-ece02.firebasestorage.app",
  messagingSenderId: "33272456665",
  appId: "1:33272456665:web:4b02cdb56f87c16845a5c8",
};
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const messaging = firebase.messaging();

// ✅ Get FCM token using compat SDK
async function requestPermission() {
  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register("/chat-open/firebase-messaging-sw.js");
    console.log("Service Worker registered:", registration);

    // ✅ Wait for service worker to be ready (active state)
    await navigator.serviceWorker.ready;
    console.log("Service Worker is ready");

    const status = await Notification.requestPermission();
    if (status !== "granted") {
      console.log("Permission denied.");
      return;
    }
    console.log("Notification permission granted.");

    const token = await messaging.getToken({
      vapidKey: "BF_xHDTe14X2srYfx7j1MLLCykJOftFmUQplrvYm3wPnurq4CiwMUnI_FondyjLPtXN-UkrVFvktz8eAzFP2rMw",
      serviceWorkerRegistration: registration,
    });

    console.log("✅ FCM Token:", token);

    const user = auth.currentUser;
    if (!user) {
      console.warn("No user logged in, skipping token save.");
      return;
    }

    // 🔹 Save only one token per user
    await db.collection("fcmTokens").doc(user.uid).set({
      uid: user.uid,
      token,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    console.log("✅ Token saved for user:", user.uid, token);

  } catch (err) {
    console.error("Error getting permission or token", err);
  }
}

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  const userDoc = await db.collection("users").doc(user.uid).get();
  const username = userDoc.exists ? userDoc.data().username : "名無し";

  window.currentUsername = username;
  console.log("Logged in as:", username);

  // ✅ Enable sending only after username is loaded
  document.getElementById("sendButton").disabled = false;
  document.getElementById("message").placeholder = `${username} として送信...`;

  // ✅ Request notification permission after login
  requestPermission();
});

document.getElementById("logoutButton").onclick = () => {
  auth.signOut().then(() => {
    location.href = "login.html";
  });
};

const messagesRef = db.collection("messages");

async function sendPushToAll(title, body) {
  console.log("🟦 sendPushToAll called:", title, body);

  const user = auth.currentUser;
  if (!user) {
    console.warn("⚠️ No logged-in user, skipping push send");
    return;
  }

  const tokensSnapshot = await db.collection("fcmTokens").get();

  const promises = tokensSnapshot.docs
    .filter(doc => doc.id !== user.uid) // skip yourself
    .map(async (doc) => {
      const data = doc.data();
      const token = data.token;

      if (!token) return;
      console.log("📨 Sending push to:", doc.id, token);

      const response = await fetch("https://open-chat.harry390plays2.workers.dev/", {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, title, body }),
      });

      if (!response.ok) {
        console.warn("⚠️ Failed to send push:", await response.text());
      }
    });

  await Promise.all(promises);
  console.log("✅ Push notifications sent to all other users.");
}

// Send a message
async function sendMessage() {
  console.log(
    "✅ Message sent to Firestore, now triggering push notification..."
  );
  const text = document.getElementById("message").value.trim();
  if (!text) return;

  const user = auth.currentUser;
  if (!user) {
    alert("ログインしてください");
    location.href = "login.html";
    return;
  }

  // Wait for username if not yet loaded
  let username = window.currentUsername;
  if (!username) {
    const userDoc = await db.collection("users").doc(user.uid).get();
    username = userDoc.exists ? userDoc.data().username : "名無し";
    window.currentUsername = username; // cache for later
  }

  try {
    await messagesRef.add({
      name: username,
      text: text,
      uid: user.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });

    console.log("✅ Firestore message added!");

    document.getElementById("message").value = "";

    console.log("📨 Calling sendPushToAll() now...");
    sendPushToAll("新しいブツが送信された", `${username}: ${text}`);
  } catch (err) {
    console.error("メッセージ送信エラー:", err);
  }
}

// Function to convert URLs in text to clickable links
function linkify(text) {
  const urlPattern = /(\bhttps?:\/\/[^\s<]+)/gi;
  return text.replace(
    urlPattern,
    (url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  );
}

// Listen for new messages
let knownMessageIds = new Set(); // To keep track of known message IDs
messagesRef.orderBy("timestamp").onSnapshot((snapshot) => {
  const messagesDiv = document.getElementById("messages");

  snapshot.forEach((doc) => {
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
});

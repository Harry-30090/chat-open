// Firebase init
const firebaseConfig = {
  apiKey: "AIzaSyAWaL9PudugFC6PmFvORuUgY6ypFD3RiKI",
  authDomain: "open-chat-ece02.firebaseapp.com",
  projectId: "open-chat-ece02",
};
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("ログインしてください。");
    location.href = "login.html";
    return;
  }

  const userDoc = await db.collection("users").doc(user.uid).get();
  const userData = userDoc.data();

  // 🚨 Only admins can continue
  if (!userData || userData.role !== "admin") {
    alert("アクセス権がありません。");
    await auth.signOut();
    location.href = "login.html";
    return;
  }

  // ✅ Only load admin UI if user is admin
  console.log("Admin confirmed:", userData.username);
  loadUsers();
});

const uidInput = document.getElementById("uid");
const reasonInput = document.getElementById("reason");
const durationSelect = document.getElementById("duration");
const customDateInput = document.getElementById("customDate");
const statusMsg = document.getElementById("status");
const userTable = document.getElementById("userTable").querySelector("tbody");

// Format helper
const formatDate = (ts) =>
  ts?.toDate ? ts.toDate().toLocaleString("ja-JP") : "無期限";

// 🧠 Ban button
document.getElementById("banBtn").onclick = async () => {
  const uid = uidInput.value.trim();
  const reason = reasonInput.value.trim() || "なし";
  const preset = durationSelect.value;
  const customDate = customDateInput.value;

  if (!uid) return alert("UIDを入力してください。");

  let bannedUntil = null;

  // ⏳ 1️⃣ Check for custom date-time input first
  if (customDate) {
    bannedUntil = new Date(customDate);
    if (isNaN(bannedUntil.getTime())) {
      return alert("無効な日付です。");
    }
  } else if (preset !== "none") {
    // ⏱️ 2️⃣ Quick preset durations
    const now = new Date();
    const days =
      preset === "1d" ? 1 : preset === "7d" ? 7 : preset === "30d" ? 30 : 0;
    bannedUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  try {
    await db
      .collection("users")
      .doc(uid)
      .update({
        role: "banned",
        banReason: reason,
        bannedUntil: bannedUntil
          ? firebase.firestore.Timestamp.fromDate(bannedUntil)
          : null,
      });
    statusMsg.textContent = `✅ ${uid} をBANしました（理由: ${reason}）`;
    loadUsers();
  } catch (e) {
    console.error(e);
    statusMsg.textContent = "❌ BAN失敗: " + e.message;
  }
};

// 🟢 Unban
document.getElementById("unbanBtn").onclick = async () => {
  const uid = uidInput.value.trim();
  if (!uid) return alert("UIDを入力してください。");

  try {
    await db.collection("users").doc(uid).update({
      role: "user",
      banReason: firebase.firestore.FieldValue.delete(),
      bannedUntil: firebase.firestore.FieldValue.delete(),
    });
    statusMsg.textContent = `✅ ${uid} のBANを解除しました`;
    loadUsers();
  } catch (e) {
    console.error(e);
    statusMsg.textContent = "❌ 解除失敗: " + e.message;
  }
};

// 👀 Load all users
async function loadUsers() {
  userTable.innerHTML = "";
  const snap = await db.collection("users").get();
  snap.forEach((doc) => {
    const u = doc.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${doc.id}</td>
      <td>${u.username || "名無し"}</td>
      <td class="${u.role === "banned" ? "banned" : ""}">
        ${u.role || "user"}
      </td>
      <td>${u.banReason || "-"}</td>
      <td>${formatDate(u.bannedUntil)}</td>
    `;
    userTable.appendChild(tr);
  });
}

// ==============================
// 💬 MESSAGE MANAGEMENT (Admin only)
// ==============================

async function loadMessages() {
  const messagesDiv = document.getElementById("messages");
  messagesDiv.innerHTML = "読み込み中...";

  try {
    const snapshot = await db.collection("messages").orderBy("timestamp", "desc").limit(100).get();

    if (snapshot.empty) {
      messagesDiv.textContent = "メッセージがありません。";
      return;
    }

    messagesDiv.innerHTML = "";
    snapshot.forEach((doc) => {
      const msg = doc.data();
      const div = document.createElement("div");
      div.className = "msg";
      div.style.borderBottom = "1px solid hsl(194 22% 27%)";
      div.style.padding = "8px";
      div.innerHTML = `
        <strong>${msg.name || "名無し"}</strong>:
        ${msg.text || "(空メッセージ)"} <br>
        <small>${msg.timestamp?.toDate().toLocaleString() || "時刻不明"}</small>
        <button style="margin-left:10px;" onclick="deleteMessage('${doc.id}')">🗑 削除</button>
      `;
      messagesDiv.appendChild(div);
    });
  } catch (err) {
    console.error("❌ メッセージ読み込みエラー:", err);
    messagesDiv.textContent = "メッセージを取得できませんでした。";
  }
}

// 🗑 Delete a message
async function deleteMessage(messageId) {
  if (!confirm("このメッセージを本当に削除しますか？")) return;

  try {
    await db.collection("messages").doc(messageId).delete();
    alert("✅ メッセージを削除しました。");
    loadMessages(); // Refresh list
  } catch (err) {
    console.error("削除エラー:", err);
    alert("❌ 削除に失敗しました。");
  }
}

// Load messages after confirming admin access
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  const userDoc = await db.collection("users").doc(user.uid).get();
  const userData = userDoc.data();

  if (userData && userData.role === "admin") {
    loadMessages(); // Only load for admins
  }
});

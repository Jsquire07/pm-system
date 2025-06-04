const { createClient } = supabase;

const supabaseClient = createClient(
  'https://qqlsttamprrcljljcqrk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbHN0dGFtcHJyY2xqbGpjcXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NTQ2NTcsImV4cCI6MjA2NDQzMDY1N30.spAzwuJkcbU8WfgTYsivEC_TT1VTji7YGAEfIeh-44g'
);

const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const typingIndicator = document.getElementById("typingIndicator");

const user = JSON.parse(localStorage.getItem("loggedInUser")) || {};
const username = user.name || user.username || "Unknown";

let lastMessageId = 0;
const userColors = {};

function getUserColor(name) {
  if (!userColors[name]) {
    const hash = name.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    const colors = ["#4fc3f7", "#81c784", "#ffb74d", "#e57373", "#ba68c8"];
    userColors[name] = colors[hash % colors.length];
  }
  return userColors[name];
}

async function loadMessages(initial = false) {
  const { data, error } = await supabaseClient
    .from("messages")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Failed to load messages:", error);
    return;
  }

  if (initial) chatBox.innerHTML = "";

  data.forEach((msg) => {
    if (msg.id > lastMessageId) {
      appendMessage(msg);
      lastMessageId = msg.id;
    }
  });

  scrollToBottom();
}

function appendMessage({ id, username, text, created_at }) {
  const div = document.createElement("div");
  div.className = "message";
  div.dataset.id = id;

  const timestamp = new Date(created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isMine = username === user.name;
  const userColor = getUserColor(username);
  const highlightedText = text.replace(/@(\w+)/g, '<span class="mention">@$1</span>');

  div.innerHTML = `
    <div class="meta" style="color: ${userColor}">
      <strong>${username || "Unknown"}</strong>
      <span class="timestamp">${timestamp}</span>
      ${isMine ? `
        <button class="edit-btn">✏️</button>
        <button class="delete-btn">🗑</button>
      ` : ""}
    </div>
    <div class="text">${highlightedText}</div>
  `;

  chatBox.appendChild(div);

  if (isMine) {
    div.querySelector(".edit-btn").onclick = () => editMessage(id, text);
    div.querySelector(".delete-btn").onclick = () => deleteMessage(id, div);
  }
}

function editMessage(id, oldText) {
  const newText = prompt("Edit your message:", oldText);
  if (newText && newText !== oldText) {
    supabaseClient
      .from("messages")
      .update({ text: newText })
      .eq("id", id);
  }
}

function deleteMessage(id, element) {
  if (confirm("Delete this message?")) {
    supabaseClient
      .from("messages")
      .delete()
      .eq("id", id);
    element.remove();
  }
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  const { error } = await supabaseClient.from("messages").insert([
    {
      username,
      text: message,
    },
  ]);

  if (error) {
    alert("Failed to send message.");
    console.error("Insert error:", error);
    return;
  }

  chatInput.value = "";
});

chatInput.addEventListener("input", () => {
  typingIndicator.textContent = `${username} is typing...`;
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => typingIndicator.textContent = "", 1000);
});

let typingTimeout;
let isAtBottom = true;

chatBox.addEventListener("scroll", () => {
  isAtBottom = chatBox.scrollTop + chatBox.clientHeight >= chatBox.scrollHeight - 20;
});

function scrollToBottom() {
  if (isAtBottom) {
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadMessages(true);
  setInterval(() => loadMessages(false), 1000);
});

// chat.js — realtime, right-aligned "mine" bubbles, same hooks

const supabaseClient = window.supabase.createClient(
  'https://qqlsttamprrcljljcqrk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbHN0dGFtcHJyY2xqbGpjcXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NTQ2NTcsImV4cCI6MjA2NDQzMDY1N30.spAzwuJkcbU8WfgTYsivEC_TT1VTji7YGAEfIeh-44g'
);

const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const typingIndicator = document.getElementById("typingIndicator");

const user = JSON.parse(localStorage.getItem("loggedInUser")) || {};
const currentUsername = user.name || user.username || "Unknown";

let lastMessageId = 0;
let typingTimeout;
let isAtBottom = true;
const userColors = {};

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function getUserColor(name) {
  if (!userColors[name]) {
    const hash = name.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    const colors = ["#4fc3f7", "#81c784", "#ffb74d", "#e57373", "#ba68c8"];
    userColors[name] = colors[hash % colors.length];
  }
  return userColors[name];
}

async function loadMessages(initial = false) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Failed to load messages:", error);
    return;
  }

  if (initial) chatBox.innerHTML = "";

  data.forEach(msg => {
    if (msg.id > lastMessageId) {
      appendMessage(msg);
      lastMessageId = msg.id;
    }
  });

  scrollToBottom();
}

function appendMessage({ id, username, text, created_at }) {
  if (chatBox.querySelector(`.message[data-id="${id}"]`)) return;

  const author = username || "Unknown";
  const mine = author === currentUsername;

  const div = document.createElement("div");
  div.className = `message${mine ? " mine" : ""}`;
  div.dataset.id = id;

  const ts = created_at
    ? new Date(created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  const color = getUserColor(author);
  const safe = escapeHtml(text || "");
  const highlighted = safe.replace(/@(\w+)/g, '<span class="mention">@$1</span>');

  div.innerHTML = `
    <div class="meta" style="${mine ? "justify-content:flex-end;" : ""}">
      <strong style="color:${color}">${escapeHtml(author)}</strong>
      <span class="timestamp">${ts}</span>
      ${mine ? `
        <button class="edit-btn" title="Edit">✏️</button>
        <button class="delete-btn" title="Delete">🗑</button>
      ` : ""}
    </div>
    <div class="text">${highlighted}</div>
  `;

  chatBox.appendChild(div);

  if (mine) {
    div.querySelector(".edit-btn").onclick = () => editMessage(id, text);
    div.querySelector(".delete-btn").onclick = () => deleteMessage(id, div);
  }
}

function updateMessageInDom(id, newText) {
  const el = chatBox.querySelector(`.message[data-id="${id}"] .text`);
  if (!el) return;
  const safe = escapeHtml(newText || "");
  el.innerHTML = safe.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
}

function removeMessageFromDom(id) {
  const el = chatBox.querySelector(`.message[data-id="${id}"]`);
  if (el) el.remove();
}

async function editMessage(id, oldText) {
  const newText = prompt("Edit your message:", oldText);
  if (newText && newText !== oldText) {
    const { error } = await supabase.from("messages").update({ text: newText }).eq("id", id);
    if (error) console.error("Edit error:", error);
  }
}

async function deleteMessage(id, element) {
  if (confirm("Delete this message?")) {
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) console.error("Delete error:", error);
    else element.remove();
  }
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  const { error } = await supabase.from("messages").insert([
    { username: currentUsername, text: message }
  ]);

  if (error) {
    alert("Failed to send message.");
    console.error("Insert error:", error);
    return;
  }

  chatInput.value = "";
  typingIndicator.textContent = "";
});

chatInput.addEventListener("input", () => {
  typingIndicator.textContent = "Typing…";
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => (typingIndicator.textContent = ""), 1000);
});

chatBox.addEventListener("scroll", () => {
  isAtBottom = chatBox.scrollTop + chatBox.clientHeight >= chatBox.scrollHeight - 20;
});

function scrollToBottom() {
  if (isAtBottom) chatBox.scrollTop = chatBox.scrollHeight;
}

function logout() {
  localStorage.removeItem("loggedInUser");
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadMessages(true);

  supabase
    .channel("messages-stream")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
      appendMessage(payload.new);
      scrollToBottom();
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
      updateMessageInDom(payload.new.id, payload.new.text);
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload) => {
      removeMessageFromDom(payload.old.id);
    })
    .subscribe((status) => {
      if (status !== "SUBSCRIBED") {
        console.warn("Realtime not available, falling back to polling.");
        setInterval(() => loadMessages(false), 2000);
      }
    });
});

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
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
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
  // Avoid duplicate DOM if realtime + initial fetch overlap
  if (chatBox.querySelector(`.message[data-id="${id}"]`)) return;

  const div = document.createElement("div");
  const author = username || "Unknown";
  const mine = author === currentUsername;
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

function editMessage(id, oldText) {
  const newText = prompt("Edit your message:", oldText);
  if (newText && newText !== oldText) {
    supabaseClient.from("messages").update({ text: newText }).eq("id", id);
  }
}

function deleteMessage(id, element) {
  if (confirm("Delete this message?")) {
    supabaseClient.from("messages").delete().eq("id", id);
    // DOM will also update via realtime; remove immediately for snappier UX
    element.remove();
  }
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  const { error } = await supabaseClient.from("messages").insert([
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
  // Keep the indicator subtle; just show "typing…" locally
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

document.addEventListener("DOMContentLoaded", async () => {
  await loadMessages(true);

  // Prefer realtime; fall back gracefully if not available
  try {
    const channel = supabaseClient
      .channel("messages-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          appendMessage(payload.new);
          scrollToBottom();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => updateMessageInDom(payload.new.id, payload.new.text)
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) => removeMessageFromDom(payload.old.id)
      )
      .subscribe();
  } catch (e) {
    console.warn("Realtime not available; staying on manual load.", e);
    setInterval(() => loadMessages(false), 1000);
  }
});

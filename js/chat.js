// ===== Chat.js — realtime chat with Supabase =====
// Right-aligned "mine" bubbles, live updates, typing indicator, edit/delete

// ===== Supabase client setup =====
const supabase = window.supabase.createClient(
  "https://qqlsttamprrcljljcqrk.supabase.co",
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbHN0dGFtcHJyY2xqbGpjcXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NTQ2NTcsImV4cCI6MjA2NDQzMDY1N30.spAzwuJkcbU8WfgTYsivEC_TT1VTji7YGAEfIeh-44g'
);

// ===== DOM elements =====
const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const typingIndicator = document.getElementById("typingIndicator");

// ===== Current user info =====
const user = JSON.parse(localStorage.getItem("loggedInUser")) || {};
const currentUsername = user.name || user.username || "Unknown";

// ===== State tracking =====
let lastMessageId = 0; // Track last seen message ID
let typingTimeout;     // For typing indicator delay
let isAtBottom = true; // Auto-scroll toggle
const userColors = {}; // Store assigned colors per user

// ===== Escape HTML to prevent injection =====
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// ===== Assign consistent color per username =====
function getUserColor(name) {
  if (!userColors[name]) {
    const hash = name.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    const colors = ["#4fc3f7", "#81c784", "#ffb74d", "#e57373", "#ba68c8"];
    userColors[name] = colors[hash % colors.length];
  }
  return userColors[name];
}

// ===== Load all messages from Supabase =====
async function loadMessages(initial = false) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Failed to load messages:", error);
    return;
  }

  if (initial) chatBox.innerHTML = ""; // Clear box on first load

  data.forEach(msg => {
    if (msg.id > lastMessageId) { // Only append new messages
      appendMessage(msg);
      lastMessageId = msg.id;
    }
  });

  scrollToBottom(); // Scroll if user is at bottom
}

// ===== Render a message into DOM =====
function appendMessage({ id, username, text, created_at }) {
  if (chatBox.querySelector(`.message[data-id="${id}"]`)) return; // Skip duplicates

  const author = username || "Unknown";
  const mine = author === currentUsername; // Check if message is mine

  const div = document.createElement("div");
  div.className = `message${mine ? " mine" : ""}`; // Add "mine" class for styling
  div.dataset.id = id;

  // Format timestamp (HH:MM)
  const ts = created_at
    ? new Date(created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  // Escape text and highlight mentions
  const color = getUserColor(author);
  const safe = escapeHtml(text || "");
  const highlighted = safe.replace(/@(\w+)/g, '<span class="mention">@$1</span>');

  // Build message HTML
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

  // Add edit/delete handlers for own messages
  if (mine) {
    div.querySelector(".edit-btn").onclick = () => editMessage(id, text);
    div.querySelector(".delete-btn").onclick = () => deleteMessage(id, div);
  }
}

// ===== Update message text in DOM =====
function updateMessageInDom(id, newText) {
  const el = chatBox.querySelector(`.message[data-id="${id}"] .text`);
  if (!el) return;
  const safe = escapeHtml(newText || "");
  el.innerHTML = safe.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
}

// ===== Remove message from DOM =====
function removeMessageFromDom(id) {
  const el = chatBox.querySelector(`.message[data-id="${id}"]`);
  if (el) el.remove();
}

// ===== Edit a message (prompt user) =====
async function editMessage(id, oldText) {
  const newText = prompt("Edit your message:", oldText);
  if (newText && newText !== oldText) {
    const { error } = await supabase.from("messages").update({ text: newText }).eq("id", id);
    if (error) console.error("Edit error:", error);
  }
}

// ===== Delete a message =====
async function deleteMessage(id, element) {
  if (confirm("Delete this message?")) {
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) console.error("Delete error:", error);
    else element.remove(); // Remove from DOM
  }
}

// ===== Handle new message form submit =====
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

  chatInput.value = ""; // Clear input
  typingIndicator.textContent = ""; // Reset typing indicator
});

// ===== Typing indicator handling =====
chatInput.addEventListener("input", () => {
  typingIndicator.textContent = "Typing…";
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => (typingIndicator.textContent = ""), 1000);
});

// ===== Track if user is scrolled to bottom =====
chatBox.addEventListener("scroll", () => {
  isAtBottom = chatBox.scrollTop + chatBox.clientHeight >= chatBox.scrollHeight - 20;
});

// ===== Scroll to bottom if allowed =====
function scrollToBottom() {
  if (isAtBottom) chatBox.scrollTop = chatBox.scrollHeight;
}

// ===== Logout handling =====
function logout() {
  localStorage.removeItem("loggedInUser");
  window.location.href = "index.html";
}

// ===== Initialize chat on page load =====
document.addEventListener("DOMContentLoaded", async () => {
  await loadMessages(true); // Initial load of all messages

  // Subscribe to realtime updates via Supabase channel
  const channel = supabase
    .channel("public:messages") // Channel name (unique)
    // Listen for new messages
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        appendMessage(payload.new);
        scrollToBottom();
      }
    )
    // Listen for edits
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages" },
      (payload) => {
        updateMessageInDom(payload.new.id, payload.new.text);
      }
    )
    // Listen for deletes
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "messages" },
      (payload) => {
        removeMessageFromDom(payload.old.id);
      }
    )
    .subscribe((status) => {
      console.log("Realtime status:", status); // Log realtime connection status
    });
});

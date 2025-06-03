import { supabase } from './supabase.js';

const chatBox = document.getElementById('chatBox');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

// Use stored or fallback username
let username = localStorage.getItem("currentUser");
if (!username) {
  username = prompt("Enter your name:");
  localStorage.setItem("currentUser", username || "Guest");
}

// Load messages on page load
async function loadMessages() {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    return;
  }

  chatBox.innerHTML = ""; // clear old content
  data.forEach(displayMessage);
}

// Display a message in the chat box
function displayMessage(msg) {
  const messageEl = document.createElement("div");
  messageEl.className = "message";

  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  messageEl.innerHTML = `
    <strong>${msg.username}</strong>: ${msg.text}
    <span class="timestamp">${time}</span>
  `;

  chatBox.appendChild(messageEl);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Send a message
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  const { error } = await supabase.from("messages").insert([{ username, text }]);
  if (error) {
    console.error("Error sending message:", error);
    return;
  }

  chatInput.value = "";
});

// Realtime updates
supabase
  .channel("realtime:messages")
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "messages"
  }, (payload) => {
    displayMessage(payload.new);
  })
  .subscribe();

loadMessages();

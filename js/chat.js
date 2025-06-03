import { supabase } from './supabase.js';

const chatBox = document.getElementById('chatBox');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

let username = localStorage.getItem("currentUser");

if (!username) {
  username = prompt("Enter your name:");
  localStorage.setItem("currentUser", username);
}


// Fetch and display old messages
async function loadMessages() {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return console.error(error);
  data.forEach(displayMessage);
}

function displayMessage(msg) {
  const msgEl = document.createElement("div");
  msgEl.className = "message";
  msgEl.innerHTML = `<strong>${msg.username}</strong>: ${msg.text} <span class="timestamp">${new Date(msg.created_at).toLocaleTimeString()}</span>`;
  chatBox.appendChild(msgEl);
  chatBox.scrollTop = chatBox.scrollHeight;
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  const { error } = await supabase.from("messages").insert([{ username, text }]);
  if (error) console.error(error);
  chatInput.value = "";
});

// Realtime listener
supabase
  .channel("chat-room")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
    displayMessage(payload.new);
  })
  .subscribe();

loadMessages();

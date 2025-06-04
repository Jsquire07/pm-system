const { createClient } = supabase;

const supabaseClient = createClient(
  'https://qqlsttamprrcljljcqrk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbHN0dGFtcHJyY2xqbGpjcXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NTQ2NTcsImV4cCI6MjA2NDQzMDY1N30.spAzwuJkcbU8WfgTYsivEC_TT1VTji7YGAEfIeh-44g'
);

const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");

const user = JSON.parse(localStorage.getItem("loggedInUser")) || {};
const username = user.name || user.username || "Unknown";

let lastMessageId = 0;

// Load all messages on page load
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

// Append message
function appendMessage({ username, text, created_at }) {
  const div = document.createElement("div");
  div.className = "message";
  const timestamp = new Date(created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  div.innerHTML = `
    <div class="meta"><strong>${username || "Unknown"}</strong> ${timestamp}</div>
    <div class="text">${text}</div>
  `;

  chatBox.appendChild(div);
}

// Scroll to bottom
function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Handle message send
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

// Load initial messages
document.addEventListener("DOMContentLoaded", () => {
  loadMessages(true);
  setInterval(() => loadMessages(false), 1000); // check every second
});

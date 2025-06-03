const supabase = window.supabase.createClient(
  "https://qqlsttamprrcljljcqrk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // your actual anon key
);

const messagesContainer = document.getElementById("messages");
const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");

const user = JSON.parse(localStorage.getItem("loggedInUser"));
const username = user?.name || "Unknown";

function formatTimestamp(isoString) {
  const date = new Date(isoString);
  const options = { hour: "2-digit", minute: "2-digit", hour12: true };
  const time = date.toLocaleTimeString("en-AU", options);
  const day = date.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
  return `${time} • ${day}`;
}

function renderMessage(msg) {
  const div = document.createElement("div");
  div.className = "message";
  div.innerHTML = `
    <div class="meta"><strong>${msg.username || "Unknown"}</strong> — ${formatTimestamp(msg.created_at)}</div>
    <div class="text">${msg.text}</div>
  `;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function loadMessages() {
  const { data, error } = await supabase.from("messages").select("*").order("created_at", { ascending: true });
  if (error) return console.error("Error loading messages:", error);
  messagesContainer.innerHTML = "";
  data.forEach(renderMessage);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const { error } = await supabase.from("messages").insert([
    { username: username, text }
  ]);

  if (error) return alert("Failed to send message");

  input.value = "";
  loadMessages();
});

document.addEventListener("DOMContentLoaded", () => {
  loadMessages();

  // Optional: Poll every 3 seconds to refresh
  setInterval(loadMessages, 3000);
});

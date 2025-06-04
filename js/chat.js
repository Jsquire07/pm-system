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

// Fetch and display all messages
async function loadMessages() {
  const { data, error } = await supabaseClient
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load messages:", error);
    return;
  }

  chatBox.innerHTML = "";
  data.forEach(msg => appendMessage(msg));
  scrollToBottom();
}

// Append a new message to the chat box
function appendMessage({ username, text, created_at }) {
  const div = document.createElement("div");
  div.className = "message";
  const timestamp = new Date(created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  div.innerHTML = `
    <div class="meta"><strong>${username || "Unknown"}</strong> ${timestamp}</div>
    <div class="text">${text}</div>
  `;

  chatBox.appendChild(div);
}

// Scroll chat to bottom
function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Submit new message
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  const { error } = await supabaseClient.from("messages").insert([
    {
      username,
      text: message
    }
  ]);

  if (error) {
    alert("Failed to send message.");
    console.error("Insert error:", error);
    return;
  }

  chatInput.value = "";
});

// Subscribe to real-time messages
supabaseClient
  .channel('realtime-messages')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => {
      appendMessage(payload.new);
      scrollToBottom();
    }
  )
  .subscribe();

document.addEventListener("DOMContentLoaded", loadMessages);

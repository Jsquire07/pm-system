const { createClient } = supabase;
const supabaseClient = createClient(
  'https://qqlsttamprrcljljcqrk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbHN0dGFtcHJyY2xqbGpjcXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NTQ2NTcsImV4cCI6MjA2NDQzMDY1N30.spAzwuJkcbU8WfgTYsivEC_TT1VTji7YGAEfIeh-44g'
);

const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");

const user = JSON.parse(localStorage.getItem("loggedInUser")) || { name: "Unknown" };

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
  chatBox.scrollTop = chatBox.scrollHeight;
}

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

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  const { error } = await supabaseClient.from("messages").insert([{
    username: user.name || "Unknown",
    text: message
  }]);

  if (error) {
    alert("Failed to send message.");
    console.error("Insert error:", error);
    return;
  }

  chatInput.value = "";
});

supabaseClient
  .channel('messages-realtime')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    payload => {
      appendMessage(payload.new);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  )
  .subscribe();

document.addEventListener("DOMContentLoaded", loadMessages);

const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");

const user = JSON.parse(localStorage.getItem("loggedInUser")) || { name: "Unknown" };

async function loadMessages() {
  const { data, error } = await supabase
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
  const time = new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  div.innerHTML = `
    <div><strong>${username || "Unknown"}</strong><span class="timestamp">${time}</span></div>
    <div class="text">${text}</div>
  `;
  chatBox.appendChild(div);
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  const { error } = await supabase.from("messages").insert([{
    username: user.name || "Unknown",
    text: message
  }]);

  if (error) {
    console.error("Failed to send message:", error);
    return;
  }

  chatInput.value = "";
});

// Real-time updates
supabase
  .channel('public:messages')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    payload => {
      appendMessage(payload.new);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  )
  .subscribe();

loadMessages();

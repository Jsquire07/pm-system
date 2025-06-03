const supabase = window.supabase.createClient(
  "https://qqlsttamprrcljljcqrk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // use your actual public anon key
);

const messagesContainer = document.getElementById("messages");
const form = document.getElementById("chatForm");
const input = document.getElementById("chatInput");

const user = JSON.parse(localStorage.getItem("loggedInUser")) || { name: "Unknown" };

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const { error } = await supabase.from("messages").insert([
    {
      username: user.name,
      text: text
    }
  ]);

  if (error) {
    alert("Error sending message.");
    return;
  }

  input.value = "";
});

function formatTimestamp(iso) {
  const date = new Date(iso);
  return date.toLocaleString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function renderMessage(msg) {
  const div = document.createElement("div");
  div.className = "message" + (msg.username === user.name ? " you" : "");
  div.innerHTML = `
    <div class="meta">${msg.username} • ${formatTimestamp(msg.created_at)}</div>
    <div>${msg.text}</div>
  `;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function loadMessages() {
  const { data, error } = await supabase.from("messages").select("*").order("created_at", { ascending: true });
  if (error) return alert("Failed to load messages.");

  messagesContainer.innerHTML = "";
  data.forEach(renderMessage);
}

loadMessages();

supabase
  .channel('realtime:messages')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
    if (payload.eventType === "INSERT") {
      renderMessage(payload.new);
    }
  })
  .subscribe();

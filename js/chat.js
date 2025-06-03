const { createClient } = supabase;
const supabaseClient = createClient(
  'https://qqlsttamprrcljljcqrk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbHN0dGFtcHJyY2xqbGpjcXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NTQ2NTcsImV4cCI6MjA2NDQzMDY1N30.spAzwuJkcbU8WfgTYsivEC_TT1VTji7YGAEfIeh-44g'
);

const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const typingIndicator = document.getElementById("typingIndicator");

const user = JSON.parse(localStorage.getItem("loggedInUser")) || {};
const username = user.name || user.username || "Unknown";

function getUserColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 40%)`;
}

async function loadMessages() {
  const { data, error } = await supabaseClient
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return console.error("Load error:", error);
  chatBox.innerHTML = "";
  data.forEach(msg => appendMessage(msg));
  chatBox.scrollTop = chatBox.scrollHeight;
}

function appendMessage({ id, username: msgUser, text, created_at }) {
  const div = document.createElement("div");
  div.className = "message";

  const timestamp = new Date(created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isOwn = (msgUser === username);
  const mentionRegex = /@(\w+)/g;
  const highlighted = text.replace(mentionRegex, '<span class="mention">@$1</span>');

  div.innerHTML = `
    <div class="meta">
      <strong style="color: ${getUserColor(msgUser)};">${msgUser}</strong> ${timestamp}
      ${isOwn ? `
        <button class="edit-btn" data-id="${id}">✏️</button>
        <button class="delete-btn" data-id="${id}">🗑️</button>
      ` : ""}
    </div>
    <div class="text" data-id="${id}">${highlighted}</div>
  `;

  chatBox.appendChild(div);
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  const { error } = await supabaseClient.from("messages").insert([
    { username: username, text: message }
  ]);

  if (error) return alert("Send failed.");
  chatInput.value = "";
});

chatBox.addEventListener("click", async (e) => {
  const id = e.target.dataset.id;

  if (e.target.classList.contains("delete-btn")) {
    if (confirm("Delete this message?")) {
      await supabaseClient.from("messages").delete().eq("id", id);
    }
  }

  if (e.target.classList.contains("edit-btn")) {
    const textEl = chatBox.querySelector(`.text[data-id="${id}"]`);
    const currentText = textEl.textContent;
    const newText = prompt("Edit your message:", currentText);
    if (newText && newText !== currentText) {
      await supabaseClient.from("messages").update({ text: newText }).eq("id", id);
    }
  }
});

// Typing indicator logic
let typingTimeout;
chatInput.addEventListener("input", () => {
  supabaseClient.from("typing").upsert({ username: username }, { onConflict: ["username"] });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    supabaseClient.from("typing").delete().eq("username", username);
  }, 3000);
});

supabaseClient
  .channel("typing-watch")
  .on("postgres_changes", { event: "INSERT", table: "typing" }, payload => {
    if (payload.new.username !== username)
      typingIndicator.textContent = `${payload.new.username} is typing...`;
  })
  .on("postgres_changes", { event: "DELETE", table: "typing" }, () => {
    typingIndicator.textContent = "";
  })
  .subscribe();

supabaseClient
  .channel("realtime:messages")
  .on("postgres_changes", { event: "INSERT", table: "messages" }, payload => {
    appendMessage(payload.new);
    chatBox.scrollTop = chatBox.scrollHeight;
  })
  .subscribe();

document.addEventListener("DOMContentLoaded", loadMessages);
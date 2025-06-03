const { createClient } = supabase;

const supabaseClient = createClient(
  'https://qqlsttamprrcljljcqrk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbHN0dGFtcHJyY2xqbGpjcXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NTQ2NTcsImV4cCI6MjA2NDQzMDY1N30.spAzwuJkcbU8WfgTYsivEC_TT1VTji7YGAEfIeh-44g'
);

const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const typingIndicator = document.getElementById("typingIndicator");

const user = JSON.parse(localStorage.getItem("loggedInUser")) || { name: "Unknown" };
const username = user.name || "Unknown";

// Generate a consistent color per username
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
}

function highlightMentions(text) {
  return text.replace(/@(\w+)/g, `<span class="mention">@$1</span>`);
}

function appendMessage({ id, username, text, created_at }) {
  const existing = document.querySelector(`.message[data-id="${id}"]`);
  if (existing) return;

  const div = document.createElement("div");
  div.className = "message";
  div.dataset.id = id;

  const timestamp = new Date(created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const color = stringToColor(username);

  div.innerHTML = `
    <div class="meta">
      <strong style="color: ${color}">${username}</strong> ${timestamp}
      ${username === user.name
        ? `<button onclick="editMessage('${id}')">✏️</button>
           <button onclick="deleteMessage('${id}')">🗑️</button>`
        : ""}
    </div>
    <div class="text" data-id="${id}">${highlightMentions(text)}</div>
  `;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function deleteMessage(id) {
  await supabaseClient.from("messages").delete().eq("id", id);
}

async function editMessage(id) {
  const current = document.querySelector(`.text[data-id="${id}"]`);
  const newText = prompt("Edit your message:", current.textContent);
  if (newText && newText !== current.textContent) {
    await supabaseClient.from("messages").update({ text: newText }).eq("id", id);
  }
}

async function loadMessages() {
  const { data, error } = await supabaseClient
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return console.error("Failed to load messages:", error);

  if (!window.__initialMessageIDs) window.__initialMessageIDs = new Set();
  data.forEach(msg => {
    appendMessage(msg);
    window.__initialMessageIDs.add(msg.id);
  });
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  const { error } = await supabaseClient.from("messages").insert([
    { username, text: message }
  ]);

  if (!error) chatInput.value = "";
});

chatInput.addEventListener("input", () => {
  supabaseClient.from("typing").upsert({ username }, { onConflict: ['username'] });

  clearTimeout(window.__typingTimeout);
  window.__typingTimeout = setTimeout(() => {
    supabaseClient.from("typing").delete().eq("username", username);
  }, 2000);
});

// Real-time: INSERT, UPDATE, DELETE
supabaseClient
  .channel('chat-sync')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'messages'
  }, payload => {
    const { eventType, new: newMsg, old: oldMsg } = payload;

    if (eventType === 'INSERT') {
      if (!window.__initialMessageIDs?.has(newMsg.id)) appendMessage(newMsg);
    } else if (eventType === 'UPDATE') {
      const textEl = document.querySelector(`.text[data-id="${newMsg.id}"]`);
      if (textEl) textEl.innerHTML = highlightMentions(newMsg.text);
    } else if (eventType === 'DELETE') {
      const msgEl = document.querySelector(`.message[data-id="${oldMsg.id}"]`);
      if (msgEl) msgEl.remove();
    }

    chatBox.scrollTop = chatBox.scrollHeight;
  })
  .subscribe();

// Real-time: Typing Indicator
supabaseClient
  .channel('typing-channel')
  .on('postgres_changes', { event: 'INSERT', table: 'typing' }, payload => {
    if (payload.new.username !== username) {
      typingIndicator.textContent = `${payload.new.username} is typing...`;
    }
  })
  .on('postgres_changes', { event: 'DELETE', table: 'typing' }, payload => {
    if (payload.old.username !== username) {
      typingIndicator.textContent = "";
    }
  })
  .subscribe();

document.addEventListener("DOMContentLoaded", loadMessages);

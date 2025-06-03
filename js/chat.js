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

async function editMessage(id) {
  const el = document.querySelector(`.text[data-id="${id}"]`);
  const current = el?.textContent || "";
  const updated = prompt("Edit your message:", current);
  if (updated && updated !== current) {
    await supabaseClient.from("messages").update({ text: updated }).eq("id", id);
  }
}

async function deleteMessage(id) {
  await supabaseClient.from("messages").delete().eq("id", id);
}

async function loadMessages() {
  const { data } = await supabaseClient
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });

  chatBox.innerHTML = "";
  data.forEach(appendMessage);
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  await supabaseClient.from("messages").insert([{ username, text }]);
  chatInput.value = "";
});

// Typing indicator
chatInput.addEventListener("input", () => {
  supabaseClient.from("typing").upsert({ username }, { onConflict: ['username'] });
  clearTimeout(window.__typeClear);
  window.__typeClear = setTimeout(() => {
    supabaseClient.from("typing").delete().eq("username", username);
  }, 2000);
});

// Realtime listeners
supabaseClient
  .from("messages")
  .on("INSERT", payload => appendMessage(payload.new))
  .on("UPDATE", payload => {
    const el = document.querySelector(`.text[data-id="${payload.new.id}"]`);
    if (el) el.innerHTML = highlightMentions(payload.new.text);
  })
  .on("DELETE", payload => {
    const el = document.querySelector(`.message[data-id="${payload.old.id}"]`);
    if (el) el.remove();
  })
  .subscribe();

// Typing listeners
supabaseClient
  .from("typing")
  .on("INSERT", payload => {
    if (payload.new.username !== username) {
      typingIndicator.textContent = `${payload.new.username} is typing...`;
    }
  })
  .on("DELETE", payload => {
    if (payload.old.username !== username) {
      typingIndicator.textContent = "";
    }
  })
  .subscribe();

document.addEventListener("DOMContentLoaded", loadMessages);

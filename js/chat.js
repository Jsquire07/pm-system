const supabase = window.supabase.createClient(
  "https://qqlsttamprrcljljcqrk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbHN0dGFtcHJyY2xqbGpjcXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NTQ2NTcsImV4cCI6MjA2NDQzMDY1N30.spAzwuJkcbU8WfgTYsivEC_TT1VTji7YGAEfIeh-44g"
);

const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chatInput");
const chatForm = document.getElementById("chatForm");
const currentUser = JSON.parse(localStorage.getItem("loggedInUser")) || { name: "Unknown" };

async function loadMessages() {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return console.error("Failed to load messages:", error);

  chatMessages.innerHTML = "";
  data.forEach(msg => {
    const div = document.createElement("div");
    div.textContent = `${msg.username}: ${msg.text}`;
    chatMessages.appendChild(div);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  const { error } = await supabase.from("messages").insert([
    {
      username: currentUser.name,
      text
    }
  ]);

  if (error) {
    alert("Error sending message.");
    console.error(error);
  } else {
    chatInput.value = "";
    loadMessages();
  }
});

function logout() {
  localStorage.removeItem("loggedInUser");
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", loadMessages);

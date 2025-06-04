import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://qqlsttamprrcljljcqrk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzIiwiaWF0IjoxNzQ4ODU0NjU3LCJleHAiOjIwNjQ0MzA2NTd9.spAzwuJkcbU8WfgTYsivEC_TT1VTji7YGAEfIeh-44g"
);

const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const imageInput = document.getElementById("imageInput");
const cameraButton = document.getElementById("cameraButton");
const cameraStream = document.getElementById("cameraStream");
const cameraCanvas = document.getElementById("cameraCanvas");
const typingIndicator = document.getElementById("typingIndicator");

const user = JSON.parse(localStorage.getItem("loggedInUser")) || {};
const username = user.name || user.username || "Unknown";

let lastMessageId = 0;
const userColors = {};

function getUserColor(name) {
  if (!userColors[name]) {
    const hash = name.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    const colors = ["#4fc3f7", "#81c784", "#ffb74d", "#e57373", "#ba68c8"];
    userColors[name] = colors[hash % colors.length];
  }
  return userColors[name];
}

function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

function appendMessage({ id, username, text, created_at, image_url }) {
  const div = document.createElement("div");
  div.className = "message";
  div.dataset.id = id;

  const timestamp = new Date(created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const userColor = getUserColor(username);
  const highlightedText = text?.replace(/@(\\w+)/g, '<span class="mention">@$1</span>');

  div.innerHTML = `
    <div class="meta" style="color: ${userColor}">
      <strong>${username}</strong>
      <span class="timestamp">${timestamp}</span>
    </div>
    ${highlightedText ? `<div class="text">${highlightedText}</div>` : ""}
    ${image_url ? `<img src="${image_url}" style="max-width: 200px; margin-top: 5px;">` : ""}
  `;

  chatBox.appendChild(div);
}

async function loadMessages(initial = false) {
  const { data, error } = await supabase
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

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = chatInput.value.trim();
  let imageUrl = null;

  if (imageInput.files.length > 0) {
    const file = imageInput.files[0];
    const fileName = `${Date.now()}_${file.name}`;

    const { data, error: uploadError } = await supabase.storage
      .from("chat-images")
      .upload(fileName, file, { upsert: true });

    if (uploadError) return alert("Image upload failed");

    const { data: publicUrl } = supabase.storage
      .from("chat-images")
      .getPublicUrl(fileName);

    imageUrl = publicUrl?.publicUrl;
  }

  if (!text && !imageUrl) return;

  const { error } = await supabase.from("messages").insert([
    { username, text, image_url: imageUrl },
  ]);

  if (error) {
    alert("Failed to send message.");
    console.error("Insert error:", error);
    return;
  }

  chatInput.value = "";
  imageInput.value = "";
});

setInterval(() => loadMessages(false), 1000);
loadMessages(true);

chatInput.addEventListener("input", () => {
  typingIndicator.textContent = `${username} is typing...`;
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => (typingIndicator.textContent = ""), 1000);
});

let typingTimeout;

cameraButton.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    cameraStream.srcObject = stream;
    cameraStream.hidden = false;

    setTimeout(async () => {
      const context = cameraCanvas.getContext("2d");
      context.drawImage(cameraStream, 0, 0, 200, 150);
      cameraCanvas.toBlob(async (blob) => {
        const fileName = `camera_${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("chat-images")
          .upload(fileName, blob, { upsert: true });

        const { data: publicUrl } = supabase.storage
          .from("chat-images")
          .getPublicUrl(fileName);

        await supabase.from("messages").insert([
          { username, text: "", image_url: publicUrl?.publicUrl },
        ]);

        stream.getTracks().forEach((track) => track.stop());
        cameraStream.hidden = true;
      }, "image/jpeg");
    }, 1000);
  } catch (err) {
    alert("Could not access camera.");
    console.error(err);
  }
});

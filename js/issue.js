// ===== Parse URL for issue ID =====
const urlParams = new URLSearchParams(window.location.search);
const issueId = urlParams.get("id");

// ===== DOM elements for issue fields =====
const titleEl = document.getElementById("issue-title");
const statusEl = document.getElementById("issue-status");
const descriptionEl = document.getElementById("issue-description");
const assigneeEl = document.getElementById("assignee");
const priorityEl = document.getElementById("priority");
const dueDateEl = document.getElementById("due-date");
const dueTimeEl = document.getElementById("due-time");
const categoryEl = document.getElementById("category");

let issue = null; // Holds the current issue/task data

// ===== Notification (toast) helper =====
function toast(msg, type = "info") {
  const container = document.getElementById("notificationContainer");
  if (!container) return alert(msg); // Fallback if container missing
  const n = document.createElement("div");
  n.className = `notification ${type}`;
  n.textContent = msg;
  container.appendChild(n);
  setTimeout(() => n.remove(), 3200); // Auto-remove after ~3.2s
}

// ===== Load issue details on page load =====
(async function loadIssue() {
  if (!issueId) {
    // No ID provided → show error message
    document.querySelector(".issue-view").innerHTML = `
      <h2>Issue not found</h2>
      <p><a href="board.html">Return to board</a></p>
    `;
    return;
  }

  // Fetch the task/issue from Supabase
  const { data, error } = await supabase.from("tasks").select("*").eq("id", issueId).single();
  if (error || !data) {
    // Handle missing/invalid issue
    document.querySelector(".issue-view").innerHTML = `
      <h2>Issue not found</h2>
      <p><a href="board.html">Return to board</a></p>
    `;
    return;
  }
  issue = data;

  // Fill issue title
  titleEl.innerText = issue.title || "(Untitled)";

  // Try to display column name instead of raw status ID
  let statusText = issue.status || "(Unknown)";
  try {
    const { data: col } = await supabase.from("columns").select("name").eq("id", issue.status).single();
    if (col && col.name) statusText = col.name;
  } catch (_) {}
  statusEl.innerText = statusText;

  // Fill issue details into form fields
  descriptionEl.value = issue.description || "";
  priorityEl.value = issue.priority || "Medium";
  dueDateEl.value = issue.dueDate || "";
  dueTimeEl.value = issue.dueTime || "";
  categoryEl.value = issue.category || "";

  // ===== Populate assignee dropdown =====
  const { data: employees } = await supabase.from("users").select("*");
  assigneeEl.innerHTML = `<option value="">Unassigned</option>`;
  (employees || []).forEach(emp => {
    const opt = document.createElement("option");
    opt.value = emp.name;
    opt.textContent = emp.name;
    assigneeEl.appendChild(opt);
  });
  assigneeEl.value = issue.assignee || "";
})();

// ===== Save issue changes =====
async function saveIssueChanges() {
  const updatedTask = {
    description: descriptionEl.value,
    assignee: assigneeEl.value || null,
    priority: priorityEl.value || null,
    dueDate: dueDateEl.value || null,
    dueTime: dueTimeEl.value || null,
    category: categoryEl.value || null
  };

  // Disable buttons while saving
  const btns = document.querySelectorAll('.actions button');
  btns.forEach(b => b.disabled = true);

  // Update in Supabase
  const { error } = await supabase.from("tasks").update(updatedTask).eq("id", issueId);

  // Re-enable buttons
  btns.forEach(b => b.disabled = false);

  if (error) {
    console.error(error);
    return toast("Error saving issue", "error");
  }
  toast("Changes saved", "success");
}

// ===== Delete issue =====
async function deleteIssue() {
  if (!confirm("Are you sure you want to delete this issue?")) return;
  const { error } = await supabase.from("tasks").delete().eq("id", issueId);
  if (error) {
    console.error(error);
    return toast("Error deleting issue", "error");
  }
  toast("Issue deleted", "success");
  // Redirect back to board after short delay
  setTimeout(() => (window.location.href = "board.html"), 400);
}

// ===== Category color util (for consistency) =====
function getColorForCategory(category) {
  switch (category) {
    case "Coding": return "#d0e7ff";
    case "Design": return "#ffe0f0";
    case "Marketing": return "#fff4cc";
    case "Scripting": return "#cce0ff";
    case "Animation": return "#ffd6cc";
    case "Testing": return "#e6ffe6";
    case "UI/UX": return "#e0f7ff";
    case "Worldbuilding": return "#f9e0ff";
    case "Narrative": return "#e6d1f2";
    case "Audio": return "#fff0e0";
    case "Community": return "#e0ffe9";
    default: return "#e8f0fa";
  }
}

// ===== Logout =====
function logout() {
  localStorage.removeItem("loggedInUser");
  window.location.href = "index.html";
}

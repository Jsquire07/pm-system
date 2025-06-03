const urlParams = new URLSearchParams(window.location.search);
const issueId = urlParams.get("id");

const titleEl = document.getElementById("issue-title");
const statusEl = document.getElementById("issue-status");
const descriptionEl = document.getElementById("issue-description");
const assigneeEl = document.getElementById("assignee");
const priorityEl = document.getElementById("priority");
const dueDateEl = document.getElementById("due-date");
const dueTimeEl = document.getElementById("due-time");
const categoryEl = document.getElementById("category");

let issue = null;

(async function loadIssue() {
  const { data, error } = await supabase.from("tasks").select("*").eq("id", issueId).single();

  if (error || !data) {
    document.querySelector(".issue-view").innerHTML = `
      <h2>Issue not found</h2>
      <p><a href="board.html">Return to board</a></p>
    `;
    return;
  }

  issue = data;

  titleEl.innerText = issue.title || "(Untitled)";
  statusEl.innerText = issue.status || "(Unknown)";
  descriptionEl.value = issue.description || "";
  priorityEl.value = issue.priority || "Medium";
  dueDateEl.value = issue.dueDate || "";
  dueTimeEl.value = issue.dueTime || "";
  categoryEl.value = issue.category || "";

  const { data: employees } = await supabase.from("users").select("*");
  assigneeEl.innerHTML = `<option value="">Unassigned</option>`;
  employees.forEach(emp => {
    const opt = document.createElement("option");
    opt.value = emp.name;
    opt.textContent = emp.name;
    assigneeEl.appendChild(opt);
  });
  assigneeEl.value = issue.assignee || "";
})();

async function saveIssueChanges() {
  const updatedTask = {
    description: descriptionEl.value,
    assignee: assigneeEl.value,
    priority: priorityEl.value,
    dueDate: dueDateEl.value,
    dueTime: dueTimeEl.value,
    category: categoryEl.value
  };

  const { error } = await supabase.from("tasks").update(updatedTask).eq("id", issueId);
  if (error) return alert("Error saving issue: " + error.message);
  alert("Changes saved!");
}

async function deleteIssue() {
  if (!confirm("Are you sure you want to delete this issue?")) return;
  const { error } = await supabase.from("tasks").delete().eq("id", issueId);
  if (error) return alert("Error deleting issue: " + error.message);
  window.location.href = "board.html";
}

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

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}

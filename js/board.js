let currentFilters = {
  title: "",
  assignee: "",
  priority: "",
  category: "",
  dueDate: ""
};

async function getTasks() {
  const { data, error } = await supabase.from("tasks").select("*");
  return data || [];
}


async function getColumns() {
  const { data, error } = await supabase.from('columns').select('*').order('order');
  return data || [];
}

async function saveColumns(columns) {
  for (const col of columns) {
    await supabase
      .from('columns')
      .update({ order: col.order })
      .eq('id', col.id);
  }
}


let editingColumnId = null;

function openNewColumnModal() {
  editingColumnId = null;
  document.getElementById("columnModalTitle").textContent = "New Column";
  document.getElementById("columnNameInput").value = "";
  document.getElementById("columnModal").style.display = "flex";
}
function closeColumnModal() {
  document.getElementById("columnForm").reset();
  document.getElementById("columnModal").style.display = "none";
}

document.getElementById("columnForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("columnNameInput").value.trim();
  const columns = await getColumns();

  if (editingColumnId) {
    const col = columns.find(c => c.id === editingColumnId);
    if (col) {
      const { error } = await supabase
        .from("columns")
        .update({ name })
        .eq("id", editingColumnId);
      if (error) console.error("Column update error:", error);
    }
  } else {
    const newColumn = {
      id: Date.now(), // or crypto.randomUUID() if your `id` is UUID type
      name,
      order: columns.length,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from("columns").insert([newColumn]);
    if (error) {
      console.error("Column insert error:", error);
      return;
    }
  }

  closeColumnModal();
  loadBoard();
});


async function editColumn(id) {
  const columns = await getColumns();
  const col = columns.find(c => String(c.id) === String(id));
  if (!col) return;

  editingColumnId = col.id;
  document.getElementById("columnModalTitle").textContent = "Edit Column";
  document.getElementById("columnNameInput").value = col.name;
  document.getElementById("columnModal").style.display = "flex";
}

async function deleteColumn(id) {
  if (!confirm("Delete this column?")) return;

  await supabase.from("columns").delete().eq("id", id);
  await supabase.from("tasks").delete().eq("status", id); // Clean up related tasks
  loadBoard();
}

async function moveColumn(id, direction) {
  const columns = await getColumns();
  columns.sort((a, b) => a.order - b.order);
  const index = columns.findIndex(c => String(c.id) === String(id));
  const swapIndex = index + direction;

  if (index === -1 || swapIndex < 0 || swapIndex >= columns.length) return;

  // Add animation class
  document.querySelectorAll('.column').forEach(el => el.classList.add("moving"));

  // Swap order
  const tempOrder = columns[index].order;
  columns[index].order = columns[swapIndex].order;
  columns[swapIndex].order = tempOrder;

  await saveColumns(columns);

  // Remove animation class after delay
  setTimeout(() => {
    document.querySelectorAll('.column').forEach(el => el.classList.remove("moving"));
  }, 300);

  loadBoard();
}

async function loadBoard() {
  const columns = await getColumns();
  const tasks = await getTasks();
  const container = document.getElementById("columns");
  container.innerHTML = "";

  columns.sort((a, b) => a.order - b.order);

  // Populate filters
  const { data: employees } = await supabase.from('users').select('*');
  const employeeSelect = document.getElementById("filterAssignee");
  if (employeeSelect) {
    employeeSelect.innerHTML = '<option value="">All Assignees</option>';
    employees.forEach(emp => {
      const opt = document.createElement("option");
      opt.value = emp.name;
      opt.textContent = emp.name;
      employeeSelect.appendChild(opt);
    });
  }

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const column = document.createElement("div");
    column.className = "column fade-in";
    column.dataset.id = col.id;

    const filteredTasks = tasks.filter(task =>
      task.status == col.id &&
      (currentFilters.title === "" || task.title.toLowerCase().includes(currentFilters.title.toLowerCase())) &&
      (currentFilters.assignee === "" || task.assignee === currentFilters.assignee) &&
      (currentFilters.priority === "" || task.priority === currentFilters.priority) &&
      (currentFilters.category === "" || task.category === currentFilters.category) &&
      (currentFilters.dueDate === "" || new Date(task.dueDate) <= new Date(currentFilters.dueDate))
    );

    const isFirst = i === 0;
    const isLast = i === columns.length - 1;

    column.innerHTML = `
      <h2>
        ${col.name} (${filteredTasks.length})
        <span class="column-controls">
          <button onclick="moveColumn('${col.id}', -1)" ${isFirst ? "disabled" : ""}>←</button>
          <button onclick="moveColumn('${col.id}', 1)" ${isLast ? "disabled" : ""}>→</button>
          <button onclick="editColumn('${col.id}')">✏️</button>
          <button onclick="deleteColumn('${col.id}')">🗑</button>
        </span>
      </h2>
      <div class="card-list" id="${col.id}"></div>
    `;

    container.appendChild(column);
    setTimeout(() => column.classList.add("active"), 10);

    filteredTasks.forEach(task => {
      const card = createCardElement(task);
      card.classList.add("fade-in");
      column.querySelector(".card-list").appendChild(card);
      setTimeout(() => card.classList.add("active"), 10);
    });
  }
}

function addCard() {
  openTaskModal();
}

function openTaskModal() {
  const modal = document.getElementById("taskModal");
  const assigneeDropdown = document.getElementById("newTaskAssignee");
  assigneeDropdown.innerHTML = `<option value="">Unassigned</option>`;

  const employees = JSON.parse(localStorage.getItem("employees")) || [];
  employees.forEach(emp => {
    const opt = document.createElement("option");
    opt.value = emp.name;
    opt.textContent = emp.name;
    assigneeDropdown.appendChild(opt);
  });

  modal.style.display = "flex";
  document.getElementById("newTaskTitle").focus();
}


function closeTaskModal() {
  document.getElementById("newTaskForm").reset();
  document.getElementById("taskModal").style.display = "none";
}

document.getElementById("newTaskForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("newTaskTitle").value;
  const description = document.getElementById("newTaskDescription").value;
  const assignee = document.getElementById("newTaskAssignee").value || null;
  const priority = document.getElementById("newTaskPriority").value || null;
  const dueDate = document.getElementById("newTaskDueDate").value || null;
  const dueTime = document.getElementById("newTaskDueTime").value || null;
  const category = document.getElementById("newTaskCategory").value || null;
  const status = (await getColumns())[0]?.id || "todo"; // fallback to first column

  const task = {
    title,
    description,
    assignee,
    priority,
    dueDate,
    dueTime,
    category,
    status
  };

  const { error } = await supabase.from("tasks").insert([task]);
  if (error) console.error("Supabase Insert Error:", error);

  closeTaskModal();
  loadBoard();
});


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


function createCardElement(task) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = task.id;
  card.style.backgroundColor = task.color || "#e8f0fa";


  card.innerHTML = `
    <div class="card-title">${task.title}</div>
    <div class="card-description">${task.description}</div>
    <div class="card-meta">
      ${task.assignee ? `<span class="badge assignee">${task.assignee}</span>` : ""}
      ${task.priority ? `<span class="badge priority ${task.priority.toLowerCase()}">${task.priority}</span>` : ""}
      ${task.dueDate ? `<span class="badge due-date">📅 ${task.dueDate}</span>` : ""}
      ${task.dueTime ? ` <span class="badge due-time"> ${task.dueTime}</span>` : ""}
      ${task.category ? `<span class="badge">${task.category}</span>` : ""}

    </div>
    <div class="move-buttons">
      <button class="move-left" title="Move Left">&lt;</button>
      <button class="move-right" title="Move Right">&gt;</button>
    </div>
  `;

  // Button click handlers
  card.querySelector(".move-left").addEventListener("click", (e) => {
    e.stopPropagation();
    moveTask(task.id, -1);
  });

  card.querySelector(".move-right").addEventListener("click", (e) => {
    e.stopPropagation();
    moveTask(task.id, 1);
  });


  card.addEventListener("click", () => {
    window.location.href = `issue.html?id=${task.id}`;
  });

  return card;
}


function enableDragAndDrop() {
  document.querySelectorAll(".card-list").forEach((column) => {
    column.addEventListener("dragover", (e) => e.preventDefault());

    column.addEventListener("drop", async (e) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData("text/plain");

      const { data: tasks } = await supabase.from("tasks").select("*").eq("id", taskId);
      const task = tasks?.[0];
      if (!task) return;

      const newStatus = column.id;

      await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
      loadBoard();
    });
  });
}

async function moveTask(taskId, direction) {
  const { data: taskData, error: taskError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (taskError || !taskData) return console.error("Task not found", taskError);

  const columns = await getColumns();
  columns.sort((a, b) => a.order - b.order);

  const currentIndex = columns.findIndex(c => String(c.id) === String(taskData.status));
  const newIndex = currentIndex + direction;

  if (newIndex < 0 || newIndex >= columns.length) return;

  const newStatus = columns[newIndex].id;

  // Animate cards
  document.querySelectorAll('.card').forEach(el => el.classList.add("moving"));
  setTimeout(() => {
    document.querySelectorAll('.card').forEach(el => el.classList.remove("moving"));
  }, 300);

  const { error } = await supabase
    .from("tasks")
    .update({ status: newStatus })
    .eq("id", taskId);

  if (error) return console.error("Task move failed:", error);

  loadBoard();
}

document.addEventListener("DOMContentLoaded", () => {
  loadBoard();

  document.getElementById("filterAssignee").addEventListener("change", e => {
    currentFilters.assignee = e.target.value;
    loadBoard();
  });
  document.getElementById("filterPriority").addEventListener("change", e => {
    currentFilters.priority = e.target.value;
    loadBoard();
  });
  document.getElementById("filterCategory").addEventListener("change", e => {
    currentFilters.category = e.target.value;
    loadBoard();
  });
  document.getElementById("filterDueDate").addEventListener("change", e => {
    currentFilters.dueDate = e.target.value;
    loadBoard();
  });
});

function resetFilters() {
  location.reload();
  currentFilters = {
    title: "",
    assignee: "",
    priority: "",
    category: "",
    dueDate: ""
  };
  document.getElementById("filterAssignee").value = "";
  document.getElementById("filterPriority").value = "";
  document.getElementById("filterCategory").value = "";
  document.getElementById("filterDueDate").value = "";
  loadBoard();

}

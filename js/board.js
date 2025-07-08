const urlParams = new URLSearchParams(window.location.search);
const boardId = urlParams.get("id");

if (!boardId) {
  alert("No board selected. Returning to dashboard.");
  window.location.href = "dashboard.html";
}

let currentFilters = {
  title: "",
  assignee: "",
  priority: "",
  category: "",
  dueDate: ""
};

async function getTasks() {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("board_id", boardId);

  if (error) {
    console.error("Error fetching tasks:", error.message);
    return [];
  }

  return data || [];
}

async function getColumns() {
  const { data, error } = await supabase
    .from("columns")
    .select("*")
    .eq("board_id", boardId)
    .order("order", { ascending: true });

  if (error) {
    console.error("Error fetching columns:", error.message);
    return [];
  }

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
      await supabase
        .from("columns")
        .update({ name })
        .eq("id", editingColumnId);
    }
  } else {
    const newColumn = {
      name,
      order: columns.length,
      created_at: new Date().toISOString(),
      board_id: boardId
    };

    const { error } = await supabase.from("columns").insert([newColumn]);
    if (error) {
      console.error("Error creating column:", error.message);
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
  await supabase.from("tasks")
  .delete()
  .eq("status", id)
  .eq("board_id", boardId);
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

  enableDragAndDrop();

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
  const status = (await getColumns())[0]?.id || "todo";

  const task = {
    title,
    description,
    assignee,
    priority,
    dueDate,
    dueTime,
    category,
    status,
    board_id: boardId
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
  document.querySelectorAll(".card").forEach(card => {
    card.setAttribute("draggable", true);
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", card.dataset.id);
      e.dataTransfer.effectAllowed = "move";
    });
  });

  document.querySelectorAll(".card-list").forEach(column => {
    column.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    column.addEventListener("drop", async (e) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData("text/plain");
      const cardElement = document.querySelector(`.card[data-id="${taskId}"]`);
      if (!cardElement) return;

      const currentColumnId = cardElement.closest('.card-list')?.id;
      const newColumnId = column.id;
      if (currentColumnId === newColumnId) return;

      const scrollY = window.scrollY;

      // Get all cards' positions before DOM update
      const allCards = document.querySelectorAll(".card");
      const positions = new Map();
      allCards.forEach(card => {
        positions.set(card, card.getBoundingClientRect());
      });

      // Update in Supabase
      const { error } = await supabase
        .from("tasks")
        .update({ status: newColumnId })
        .eq("id", taskId);

      if (error) return console.error("Task update error:", error);

      // Move DOM card to new column
      column.appendChild(cardElement);

      // Get all cards' new positions
      const newPositions = new Map();
      allCards.forEach(card => {
        newPositions.set(card, card.getBoundingClientRect());
      });

      // Animate position changes
      allCards.forEach(card => {
        const oldRect = positions.get(card);
        const newRect = newPositions.get(card);
        if (!oldRect || !newRect) return;

        const dx = oldRect.left - newRect.left;
        const dy = oldRect.top - newRect.top;

        if (dx !== 0 || dy !== 0) {
          card.style.transform = `translate(${dx}px, ${dy}px)`;
          card.style.transition = "transform 0s";

          requestAnimationFrame(() => {
            card.style.transition = "transform 300ms ease";
            card.style.transform = "translate(0, 0)";
          });

          setTimeout(() => {
            card.style.transform = "";
            card.style.transition = "";
          }, 300);
        }
      });

      window.scrollTo({ top: scrollY });
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

  const cardElement = document.querySelector(`.card[data-id="${taskId}"]`);
  if (!cardElement) return;

  const currentColumn = document.querySelector(`.card-list[id="${taskData.status}"]`);
  const newColumn = document.querySelector(`.card-list[id="${newStatus}"]`);
  if (!newColumn || !currentColumn) return;

  const scrollY = window.scrollY;

  // Step 1: Record the initial position of all cards
  const allCards = document.querySelectorAll('.card');
  const positions = new Map();
  allCards.forEach(card => {
    positions.set(card, card.getBoundingClientRect());
  });

  // Step 2: Move the card in Supabase
  const { error } = await supabase
    .from("tasks")
    .update({ status: newStatus })
    .eq("id", taskId);
  if (error) return console.error("Task move failed:", error);

  // Step 3: Move card DOM element to new column
  newColumn.appendChild(cardElement);

  // Step 4: Recalculate positions after the move
  const newPositions = new Map();
  allCards.forEach(card => {
    newPositions.set(card, card.getBoundingClientRect());
  });

  // Step 5: Animate cards from old position to new
  allCards.forEach(card => {
    const oldRect = positions.get(card);
    const newRect = newPositions.get(card);

    if (!oldRect || !newRect) return;

    const dx = oldRect.left - newRect.left;
    const dy = oldRect.top - newRect.top;

    if (dx !== 0 || dy !== 0) {
      card.style.transform = `translate(${dx}px, ${dy}px)`;
      card.style.transition = "transform 0s";

      requestAnimationFrame(() => {
        card.style.transition = "transform 300ms ease";
        card.style.transform = "translate(0, 0)";
      });

      setTimeout(() => {
        card.style.transform = "";
        card.style.transition = "";
      }, 300);
    }
  });

  window.scrollTo({ top: scrollY });
}

document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    alert("Not logged in.");
    window.location.href = "index.html";
    return;
  }
  
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

  // ✅ ADD THIS HERE
  const leaveBtn = document.getElementById("leaveBoardBtn");
  if (leaveBtn) {
    leaveBtn.addEventListener("click", leaveBoard);
  }
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
async function leaveBoard() {
  if (!confirm("Are you sure you want to leave this board?")) return;

  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    alert("No user logged in.");
    return;
  }

  const { error } = await supabase
    .from('board_members')
    .delete()
    .match({ board_id: boardId, user_id: user.id });

  if (error) {
    console.error("Error leaving board:", error);
    alert("Failed to leave board. Try again.");
    return;
  }

  alert("You have left the board.");
  window.location.href = "dashboard.html";
}

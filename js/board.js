// ===== Get board ID from URL =====
const urlParams = new URLSearchParams(window.location.search); // Read URL parameters
const boardId = urlParams.get("id"); // Get "id" (board ID) from query string

// If no board ID found, alert and return user to dashboard
if (!boardId) {
  alert("No board selected. Returning to dashboard.");
  window.location.href = "dashboard.html";
}

// ===== Store current filters (used when displaying tasks) =====
let currentFilters = {
  title: "",
  assignee: "",
  priority: "",
  category: "",
  dueDate: ""
};

// ===== Fetch all tasks for this board =====
async function getTasks() {
  const { data, error } = await supabase
    .from("tasks") // Select from "tasks" table
    .select("*")   // Get all columns
    .eq("board_id", boardId); // Only tasks belonging to this board

  if (error) {
    console.error("Error fetching tasks:", error.message);
    return []; // Return empty array on error
  }

  return data || []; // Return tasks or empty if none
}

// ===== Fetch all columns for this board =====
async function getColumns() {
  const { data, error } = await supabase
    .from("columns") // Select from "columns" table
    .select("*")     // Get all columns
    .eq("board_id", boardId) // Filter by board
    .order("order", { ascending: true }); // Order columns by their "order" field

  if (error) {
    console.error("Error fetching columns:", error.message);
    return [];
  }

  return data || [];
}

// ===== Save updated column order back to database =====
async function saveColumns(columns) {
  for (const col of columns) {
    await supabase
      .from('columns')
      .update({ order: col.order }) // Update order field
      .eq('id', col.id); // Match specific column by ID
  }
}

// ===== Column modal handling =====
let editingColumnId = null; // Track which column is being edited (null = new column)

// Open modal to create a new column
function openNewColumnModal() {
  editingColumnId = null; // Reset edit state
  document.getElementById("columnModalTitle").textContent = "New Column";
  document.getElementById("columnNameInput").value = ""; // Empty input field
  document.getElementById("columnModal").style.display = "flex"; // Show modal
}

// Close column modal
function closeColumnModal() {
  document.getElementById("columnForm").reset(); // Reset form
  document.getElementById("columnModal").style.display = "none"; // Hide modal
}

// ===== Logout (clear session + redirect) =====
function logout() {
  localStorage.removeItem("loggedInUser"); // Clear stored user
  window.location.href = "index.html"; // Go to login page
}

// ===== Create / Edit Column Form Handling =====
document.getElementById("columnForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("columnNameInput").value.trim(); // Get name input
  const columns = await getColumns();

  if (editingColumnId) {
    // Editing an existing column
    const col = columns.find(c => c.id === editingColumnId);
    if (col) {
      await supabase
        .from("columns")
        .update({ name }) // Update column name
        .eq("id", editingColumnId);
      showNotification("Column name updated.", "success");
    }
  } else {
    // Creating a new column
    const newColumn = {
      name,
      order: columns.length, // Place at end of list
      created_at: new Date().toISOString(),
      board_id: boardId
    };

    const { error } = await supabase.from("columns").insert([newColumn]);
    if (error) {
      console.error("Error creating column:", error.message);
      showNotification("Failed to create column.", "error");
    } else {
      showNotification("New column added.", "success");
    }
  }

  closeColumnModal(); // Close modal
  loadBoard(); // Refresh board
});

// ===== Edit an existing column =====
async function editColumn(id) {
  const columns = await getColumns();
  const col = columns.find(c => String(c.id) === String(id));
  if (!col) return;

  editingColumnId = col.id; // Track ID of column being edited
  document.getElementById("columnModalTitle").textContent = "Edit Column";
  document.getElementById("columnNameInput").value = col.name; // Fill with current name
  document.getElementById("columnModal").style.display = "flex"; // Show modal
}

// ===== Delete a column and its tasks =====
async function deleteColumn(id) {
  if (!confirm("Delete this column?")) return; // Ask for confirmation

  await supabase.from("columns").delete().eq("id", id); // Delete column
  await supabase.from("tasks").delete().eq("status", id).eq("board_id", boardId); // Delete tasks in this column
  showNotification("Column deleted.", "success");
  loadBoard(); // Refresh board
}

// ===== Move column left or right =====
async function moveColumn(id, direction) {
  const columns = await getColumns();
  columns.sort((a, b) => a.order - b.order); // Sort by order
  const index = columns.findIndex(c => String(c.id) === String(id)); // Find current column index
  const swapIndex = index + direction; // Determine new index

  // Check if move is valid
  if (index === -1 || swapIndex < 0 || swapIndex >= columns.length) return;

  // Add temporary CSS class for animation
  document.querySelectorAll('.column').forEach(el => el.classList.add("moving"));

  // Swap order values
  const tempOrder = columns[index].order;
  columns[index].order = columns[swapIndex].order;
  columns[swapIndex].order = tempOrder;

  await saveColumns(columns); // Save new order in DB

  // Remove animation effect after 300ms
  setTimeout(() => {
    document.querySelectorAll('.column').forEach(el => el.classList.remove("moving"));
  }, 300);

  loadBoard(); // Reload updated board
}

// ===== Load Board UI (columns + tasks) =====
async function loadBoard() {
  const columns = await getColumns(); // Fetch columns
  const tasks = await getTasks(); // Fetch tasks
  const container = document.getElementById("columns");
  container.innerHTML = ""; // Clear existing board

  columns.sort((a, b) => a.order - b.order); // Ensure sorted order
  enableDragAndDrop(); // Enable drag-drop for tasks

  // Populate employee filter dropdown
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

  // Build each column with tasks
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const column = document.createElement("div");
    column.className = "column fade-in"; // Add animation
    column.dataset.id = col.id;

    // Apply filters to tasks shown in this column
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

    // Column header with controls + task counter
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

    container.appendChild(column); // Add column to board
    setTimeout(() => column.classList.add("active"), 10); // Trigger CSS animation

    // Render each task in this column
    filteredTasks.forEach(task => {
      const card = createCardElement(task); // Create task card
      card.classList.add("fade-in");
      column.querySelector(".card-list").appendChild(card);
      setTimeout(() => card.classList.add("active"), 10); // Animate card
    });
  }
}


// ===== Add new task card =====
function addCard() {
  openTaskModal(); // Opens modal for task creation
}

// ===== Open Task Modal =====
function openTaskModal() {
  const modal = document.getElementById("taskModal");
  const assigneeDropdown = document.getElementById("newTaskAssignee");
  assigneeDropdown.innerHTML = `<option value="">Unassigned</option>`; // Default option

  // Load employees from localStorage for assignment
  const employees = JSON.parse(localStorage.getItem("employees")) || [];
  employees.forEach(emp => {
    const opt = document.createElement("option");
    opt.value = emp.name;
    opt.textContent = emp.name;
    assigneeDropdown.appendChild(opt);
  });

  modal.style.display = "flex"; // Show modal
  document.getElementById("newTaskTitle").focus(); // Focus on title input
}

// ===== Close Task Modal =====
function closeTaskModal() {
  document.getElementById("newTaskForm").reset(); // Reset form fields
  document.getElementById("taskModal").style.display = "none"; // Hide modal
}

// ===== Handle New Task Form Submission =====
document.getElementById("newTaskForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Collect task form values
  const title = document.getElementById("newTaskTitle").value;
  const description = document.getElementById("newTaskDescription").value;
  const assignee = document.getElementById("newTaskAssignee").value || null;
  const priority = document.getElementById("newTaskPriority").value || null;
  const dueDate = document.getElementById("newTaskDueDate").value || null;
  const dueTime = document.getElementById("newTaskDueTime").value || null;
  const category = document.getElementById("newTaskCategory").value || null;
  const status = (await getColumns())[0]?.id || "todo"; // Place in first column if available

  // Create task object
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

  // Insert into Supabase
  const { error } = await supabase.from("tasks").insert([task]);
  if (error) {
    console.error("Supabase Insert Error:", error);
    showNotification("Failed to create task.", "error");
  } else {
    showNotification("Task created successfully.", "success");
  }

  closeTaskModal(); // Hide modal
  loadBoard(); // Reload board
});

// ===== Category Color Mapping =====
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
    default: return "#e8f0fa"; // Default fallback color
  }
}

// ===== Create Task Card DOM Element =====
function createCardElement(task) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = task.id;
  card.style.backgroundColor = task.color || "#e8f0fa"; // Use saved color or fallback

  // Build card HTML
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

  // Task move buttons (left/right)
  card.querySelector(".move-left").addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent triggering card click
    moveTask(task.id, -1);
  });
  card.querySelector(".move-right").addEventListener("click", (e) => {
    e.stopPropagation();
    moveTask(task.id, 1);
  });

  // Clicking the card opens issue page
  card.addEventListener("click", () => {
    window.location.href = `issue.html?id=${task.id}`;
  });

  return card;
}

// ===== Drag and Drop for Task Cards =====
function enableDragAndDrop() {
  // Make cards draggable
  document.querySelectorAll(".card").forEach(card => {
    card.setAttribute("draggable", true);
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", card.dataset.id); // Store task ID
      e.dataTransfer.effectAllowed = "move";
    });
  });

  // Allow columns to receive cards
  document.querySelectorAll(".card-list").forEach(column => {
    column.addEventListener("dragover", (e) => e.preventDefault());

    // Handle drop event
    column.addEventListener("drop", async (e) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData("text/plain");
      const cardElement = document.querySelector(`.card[data-id="${taskId}"]`);
      if (!cardElement) return;

      const currentColumnId = cardElement.closest('.card-list')?.id;
      const newColumnId = column.id;
      if (currentColumnId === newColumnId) return; // Ignore if same column

      const scrollY = window.scrollY;

      // Record old positions for animation
      const allCards = document.querySelectorAll(".card");
      const positions = new Map();
      allCards.forEach(card => positions.set(card, card.getBoundingClientRect()));

      // Update Supabase with new status
      const { error } = await supabase.from("tasks").update({ status: newColumnId }).eq("id", taskId);
      if (error) return console.error("Task update error:", error);

      // Move card in DOM
      column.appendChild(cardElement);

      // Record new positions for animation
      const newPositions = new Map();
      allCards.forEach(card => newPositions.set(card, card.getBoundingClientRect()));

      // Animate smooth transition
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

      window.scrollTo({ top: scrollY }); // Keep scroll position
    });
  });
}

// ===== Move Task Left or Right (via buttons) =====
async function moveTask(taskId, direction) {
  // Fetch task info
  const { data: taskData, error: taskError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (taskError || !taskData) return console.error("Task not found", taskError);

  // Determine new column index
  const columns = await getColumns();
  columns.sort((a, b) => a.order - b.order);

  const currentIndex = columns.findIndex(c => String(c.id) === String(taskData.status));
  const newIndex = currentIndex + direction;
  if (newIndex < 0 || newIndex >= columns.length) return; // Stop if outside range

  const newStatus = columns[newIndex].id;

  // Locate DOM elements
  const cardElement = document.querySelector(`.card[data-id="${taskId}"]`);
  if (!cardElement) return;
  const currentColumn = document.querySelector(`.card-list[id="${taskData.status}"]`);
  const newColumn = document.querySelector(`.card-list[id="${newStatus}"]`);
  if (!newColumn || !currentColumn) return;

  const scrollY = window.scrollY;

  // Record positions before move
  const allCards = document.querySelectorAll('.card');
  const positions = new Map();
  allCards.forEach(card => positions.set(card, card.getBoundingClientRect()));

  // Update Supabase with new status
  const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
  if (error) return console.error("Task move failed:", error);

  // Move card in DOM
  newColumn.appendChild(cardElement);

  // Record new positions
  const newPositions = new Map();
  allCards.forEach(card => newPositions.set(card, card.getBoundingClientRect()));

  // Animate cards smoothly
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

  window.scrollTo({ top: scrollY }); // Restore scroll position
}

// ===== Initialize App on Page Load =====
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    alert("Not logged in.");
    window.location.href = "index.html";
    return;
  }

  loadBoard(); // Load board contents

  // Filter dropdown listeners
  document.getElementById("filterAssignee").addEventListener("change", e => {
    currentFilters.assignee = e.target.value;
    showNotification("Filters applied.", "info");
    loadBoard();
  });
  document.getElementById("filterPriority").addEventListener("change", e => {
    currentFilters.priority = e.target.value;
    showNotification("Filters applied.", "info");
    loadBoard();
  });
  document.getElementById("filterCategory").addEventListener("change", e => {
    currentFilters.category = e.target.value;
    showNotification("Filters applied.", "info");
    loadBoard();
  });
  document.getElementById("filterDueDate").addEventListener("change", e => {
    currentFilters.dueDate = e.target.value;
    showNotification("Filters applied.", "info");
    loadBoard();
  });

  // Leave board modal button
  const leaveBtn = document.getElementById("leaveBoardBtn");
  if (leaveBtn) {
    leaveBtn.addEventListener("click", () => {
      document.getElementById("leaveBoardModal").style.display = "flex";
    });
  }
});

// ===== Modal cancel for leaving board =====
document.getElementById("cancelLeaveBtn").addEventListener("click", () => {
  document.getElementById("leaveBoardModal").style.display = "none";
});

// ===== Reset Filters =====
function resetFilters() {
  location.reload(); // Refresh page
  currentFilters = { title: "", assignee: "", priority: "", category: "", dueDate: "" };
  document.getElementById("filterAssignee").value = "";
  document.getElementById("filterPriority").value = "";
  document.getElementById("filterCategory").value = "";
  document.getElementById("filterDueDate").value = "";
  showNotification("Filters reset.", "info");
  loadBoard();
}

// ===== Leave Board Handling =====
document.getElementById("confirmLeaveBtn").addEventListener("click", leaveBoard);

async function leaveBoard() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    alert("No user logged in.");
    return;
  }

  // Remove membership in Supabase
  const { error } = await supabase
    .from('board_members')
    .delete()
    .match({ board_id: boardId, user_id: user.id });

  if (error) {
    console.error("Error leaving board:", error);
    showNotification("Failed to leave board. Try again.", "error");
    return;
  }

  showNotification("You have left the board.", "success");
  window.location.href = "dashboard.html"; // Redirect after leaving
}

// ===== Notification Helper =====
function showNotification(message, type = "info") {
  const container = document.getElementById("notificationContainer");
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  container.appendChild(notification);
  setTimeout(() => {
    notification.remove();
  }, 3400); // Auto-remove after ~3.4s
}

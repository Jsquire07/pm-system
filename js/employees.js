function showNotification(message, type = "info") {
  const container = document.getElementById("notificationContainer");
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  container.appendChild(notification);
  setTimeout(() => notification.remove(), 3400);
}

function showConfirm(message, onConfirm) {
  const modal = document.getElementById("confirmModal");
  const messageEl = document.getElementById("confirmModalMessage");
  const yesBtn = document.getElementById("confirmYesBtn");
  const cancelBtn = document.getElementById("confirmCancelBtn");

  messageEl.textContent = message;
  modal.style.display = "flex";

  yesBtn.replaceWith(yesBtn.cloneNode(true));
  cancelBtn.replaceWith(cancelBtn.cloneNode(true));

  const newYesBtn = document.getElementById("confirmYesBtn");
  const newCancelBtn = document.getElementById("confirmCancelBtn");

  newYesBtn.addEventListener("click", () => {
    modal.style.display = "none";
    if (onConfirm) onConfirm();
  });

  newCancelBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });
}

function logout() {
  localStorage.removeItem("loggedInUser");
  window.location.href = "index.html";
}

/* ===== Permissions ===== */
let canManage = false;         // computed at load
let currentUser = null;        // { id, ... }

/* ===== Employees state ===== */
let allEmployees = [];
let searchQuery = "";

/* ===== CRUD with permission checks ===== */

async function addEmployee() {
  if (!canManage) return showNotification("You don’t have permission to add employees.", "error");

  const name = document.getElementById("emp-name").value.trim();
  const role = document.getElementById("emp-role").value.trim();
  const email = document.getElementById("emp-email").value.trim();
  const password = document.getElementById("emp-password").value;

  if (!name || !role || !email || !password) {
    showNotification("Please fill in all fields.", "error");
    return;
  }

  try {
    const hashedPassword = await dcodeIO.bcrypt.hash(password, 10);
    const { error } = await supabase
      .from("users")
      .insert([{ name, role, email, password: hashedPassword }]);

    if (error) {
      showNotification("Error saving employee: " + error.message, "error");
      return;
    }

    showNotification("Employee added!", "success");
    document.getElementById("addEmployeeForm").reset();
    await renderEmployees();
  } catch (e) {
    console.error(e);
    showNotification("Unexpected error while adding employee.", "error");
  }
}

async function editEmployee(id) {
  if (!canManage) return showNotification("You don’t have permission to edit employees.", "error");

  const emp = allEmployees.find((x) => String(x.id) === String(id));
  if (!emp) return;

  const newName = prompt("Name", emp.name || "");
  if (newName === null) return;
  const newRole = prompt("Role", emp.role || "");
  if (newRole === null) return;
  const newEmail = prompt("Email", emp.email || "");
  if (newEmail === null) return;

  const { error } = await supabase
    .from("users")
    .update({ name: newName.trim(), role: newRole.trim(), email: newEmail.trim() })
    .eq("id", id);

  if (error) {
    showNotification("Error updating employee: " + error.message, "error");
  } else {
    showNotification("Employee updated.", "success");
    await renderEmployees();
  }
}

async function removeEmployee(id) {
  if (!canManage) return showNotification("You don’t have permission to remove employees.", "error");

  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) {
    showNotification("Error removing employee: " + error.message, "error");
  } else {
    showNotification("Employee removed successfully.", "success");
    await renderEmployees();
  }
}

/* ===== Render ===== */

async function renderEmployees() {
  const tbody = document.getElementById("employeeList");
  const empty = document.getElementById("employeeEmpty");
  tbody.innerHTML = "";

  const { data: employees, error } = await supabase.from("users").select("*");
  if (error) {
    tbody.innerHTML = `<tr><td colspan="4">Error loading employees.</td></tr>`;
    empty.style.display = "none";
    return;
  }

  allEmployees = employees || [];

  const filtered = allEmployees.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (e.name || "").toLowerCase().includes(q) ||
      (e.role || "").toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q)
    );
  });

  if (filtered.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  filtered.forEach((emp) => {
    const tr = document.createElement("tr");
    const actionsCell = canManage
      ? `
        <div class="actions-cell">
          <button class="icon-btn" title="Edit" data-action="edit" data-id="${emp.id}">✏️</button>
          <button class="icon-btn" title="Remove" data-action="remove" data-id="${emp.id}">🗑</button>
        </div>`
      : ``; // view-only: no buttons

    tr.innerHTML = `
      <td>${emp.name || ""}</td>
      <td>${emp.role || ""}</td>
      <td>${emp.email || ""}</td>
      <td>${actionsCell}</td>
    `;
    tbody.appendChild(tr);
  });

  // Wire actions (if allowed)
  if (canManage) {
    tbody.querySelectorAll("button.icon-btn").forEach((btn) => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === "remove") {
        btn.addEventListener("click", () => {
          const who = (allEmployees.find((x) => String(x.id) === String(id)) || {}).name || "this user";
          showConfirm(`Remove ${who}?`, () => removeEmployee(id));
        });
      } else if (action === "edit") {
        btn.addEventListener("click", () => editEmployee(id));
      }
    });
  }
}

/* ===== Permissions UI helpers ===== */

function applyPermissionsUI() {
  // Hide add form card for view-only users
  const addForm = document.getElementById("addEmployeeForm");
  if (addForm) {
    const addSection = addForm.closest(".card");
    if (addSection) addSection.style.display = canManage ? "" : "none";
  }

  // Hide the Actions header if view-only
  const actionsHeader = document.getElementById("actionsHeader");
  if (actionsHeader) actionsHeader.style.display = canManage ? "" : "none";
}

/* ===== Init ===== */
document.addEventListener("DOMContentLoaded", async () => {
  // Auth gate
  currentUser = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!currentUser) {
    showNotification("Not logged in.", "error");
    window.location.href = "index.html";
    return;
  }

  try {
    // Always fetch fresh to pick up is_manager (localStorage may not include it)
    const { data: me, error: meErr } = await supabase
      .from("users")
      .select("id, is_manager")
      .eq("id", currentUser.id)
      .single();

    if (meErr) {
      console.warn("Failed to fetch current user; defaulting to view-only.", meErr);
      canManage = false;
    } else {
      canManage = !!me?.is_manager;
    }
  } catch (e) {
    console.warn("User fetch error; defaulting to view-only.", e);
    canManage = false;
  }

  applyPermissionsUI();
  await renderEmployees();

  // Form submit
  const addForm = document.getElementById("addEmployeeForm");
  if (addForm) {
    addForm.addEventListener("submit", (e) => {
      e.preventDefault();
      addEmployee();
    });
  }

  // Live search with light debounce
  const searchInput = document.getElementById("employeeSearch");
  let t;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(t);
    t = setTimeout(() => {
      searchQuery = e.target.value.trim();
      renderEmployees();
    }, 150);
  });
});

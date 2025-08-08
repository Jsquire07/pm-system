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
  // Keep consistent with the rest of the app
  localStorage.removeItem("loggedInUser");
  window.location.href = "index.html";
}

/* ===== Employees ===== */

let allEmployees = [];
let searchQuery = "";

async function addEmployee() {
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
    await renderEmployees(); // refresh
  } catch (e) {
    console.error(e);
    showNotification("Unexpected error while adding employee.", "error");
  }
}

async function renderEmployees() {
  const tbody = document.getElementById("employeeList");
  const empty = document.getElementById("employeeEmpty");
  tbody.innerHTML = "";

  // Fetch once; filter on client for snappy UX
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
    tr.innerHTML = `
      <td>${emp.name || ""}</td>
      <td>${emp.role || ""}</td>
      <td>${emp.email || ""}</td>
      <td>
        <div class="actions-cell">
          <button class="icon-btn" title="Edit" data-action="edit" data-id="${emp.id}">✏️</button>
          <button class="icon-btn" title="Remove" data-action="remove" data-id="${emp.id}">🗑</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Wire actions
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

async function editEmployee(id) {
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
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) {
    showNotification("Error removing employee: " + error.message, "error");
  } else {
    showNotification("Employee removed successfully.", "success");
    await renderEmployees();
  }
}

/* ===== Init ===== */
document.addEventListener("DOMContentLoaded", () => {
  // Auth gate (same as other pages)
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    showNotification("Not logged in.", "error");
    window.location.href = "index.html";
    return;
  }

  renderEmployees();

  document.getElementById("addEmployeeForm").addEventListener("submit", (e) => {
    e.preventDefault();
    addEmployee();
  });

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

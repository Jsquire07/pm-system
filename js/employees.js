function showNotification(message, type = "info") {
    const container = document.getElementById("notificationContainer");

    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3400);
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

async function addEmployee() {
    const name = document.getElementById("emp-name").value.trim();
    const role = document.getElementById("emp-role").value.trim();
    const email = document.getElementById("emp-email").value.trim();
    const password = document.getElementById("emp-password").value;

    if (!name || !role || !email || !password) {
        showNotification("Please fill in all fields.", "error");
        return;
    }

    const hashedPassword = await dcodeIO.bcrypt.hash(password, 10);

    const { data, error } = await supabase
        .from("users")
        .insert([{ name, role, email, password: hashedPassword }]);

    if (error) {
        showNotification("Error saving employee: " + error.message, "error");
        return;
    }

    showNotification("Employee added!", "success");
    document.getElementById("addEmployeeForm").reset();
    renderEmployees();
}

async function renderEmployees() {
    const list = document.getElementById("employeeList");
    list.innerHTML = "";

    const { data: employees, error } = await supabase.from("users").select("*");

    if (error) {
        list.innerHTML = `<li>Error loading employees.</li>`;
        return;
    }

    employees.forEach(emp => {
        const li = document.createElement("li");
        li.innerHTML = `
            <span><strong>${emp.name}</strong> (${emp.role}) — ${emp.email}</span>
            <button onclick="confirmRemoveEmployee(${emp.id}, '${emp.name}')">Remove</button>
        `;
        list.appendChild(li);
    });
}

function confirmRemoveEmployee(id, name) {
    showConfirm(`Are you sure you want to remove ${name}?`, () => {
        removeEmployee(id);
    });
}

async function removeEmployee(id) {
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) {
        showNotification("Error removing employee: " + error.message, "error");
    } else {
        showNotification("Employee removed successfully.", "success");
        renderEmployees();
    }
}

function logout() {
    localStorage.removeItem("currentUser");
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
    renderEmployees();

    document.getElementById("addEmployeeForm").addEventListener("submit", (e) => {
        e.preventDefault();
        addEmployee();
    });
});

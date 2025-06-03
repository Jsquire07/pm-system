function getEmployees() {
  return JSON.parse(localStorage.getItem("employees")) || [];
}

function saveEmployees(employees) {
  localStorage.setItem("employees", JSON.stringify(employees));
}

async function addEmployee() {
  const name = document.getElementById("emp-name").value.trim();
  const role = document.getElementById("emp-role").value.trim();
  const email = document.getElementById("emp-email").value.trim();
  const password = document.getElementById("emp-password").value;

  if (!name || !role || !email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  const hashedPassword = await dcodeIO.bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("users")
    .insert([{ name, role, email, password: hashedPassword }]);

  if (error) {
    alert("Error saving employee: " + error.message);
    return;
  }

  alert("Employee added!");
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

  employees.forEach((emp, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span><strong>${emp.name}</strong> (${emp.role}) — ${emp.email}</span>
      <button onclick="removeEmployee(${emp.id})">Remove</button>
    `;
    list.appendChild(li);
  });
}

async function removeEmployee(id) {
  await supabase.from("users").delete().eq("id", id);
  renderEmployees();
}

function removeEmployee(index) {
  const employees = getEmployees();
  employees.splice(index, 1);
  saveEmployees(employees);
  renderEmployees();
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

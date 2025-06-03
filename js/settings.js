// === CATEGORIES ===
function loadCategories() {
  const categories = JSON.parse(localStorage.getItem("categories")) || [];
  const list = document.getElementById("categoryList");
  list.innerHTML = "";

  categories.forEach((cat, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span><span class="category-color-box" style="background:${cat.color}"></span> ${cat.name}</span>
      <span class="category-controls">
        <button onclick="editCategory(${index})">Edit</button>
        <button onclick="deleteCategory(${index})">Delete</button>
      </span>
    `;
    list.appendChild(li);
  });

  // Also update dropdown in defaults
  const columnDropdown = document.getElementById("defaultColumn");
  if (columnDropdown) {
    columnDropdown.innerHTML = "";
    const columns = getColumns().sort((a, b) => a.order - b.order);
    columns.forEach(col => {
      const opt = document.createElement("option");
      opt.value = col.id;
      opt.textContent = col.name;
      columnDropdown.appendChild(opt);
    });
  }
}

document.getElementById("categoryForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("newCategoryName").value;
  const color = document.getElementById("newCategoryColor").value;
  const categories = JSON.parse(localStorage.getItem("categories")) || [];

  categories.push({ name, color });
  localStorage.setItem("categories", JSON.stringify(categories));
  e.target.reset();
  loadCategories();
});

function deleteCategory(index) {
  const categories = JSON.parse(localStorage.getItem("categories")) || [];
  categories.splice(index, 1);
  localStorage.setItem("categories", JSON.stringify(categories));
  loadCategories();
}

function editCategory(index) {
  const categories = JSON.parse(localStorage.getItem("categories")) || [];
  const cat = categories[index];
  const newName = prompt("Edit name:", cat.name);
  const newColor = prompt("Edit color hex:", cat.color);
  if (newName && newColor) {
    categories[index] = { name: newName, color: newColor };
    localStorage.setItem("categories", JSON.stringify(categories));
    loadCategories();
  }
}

// === SETTINGS ===
function loadSettings() {
  const settings = JSON.parse(localStorage.getItem("settings")) || {};

  document.getElementById("darkModeToggle").checked = settings.darkMode || false;
  document.getElementById("compactLayoutToggle").checked = settings.compactLayout || false;
  document.getElementById("defaultPriority").value = settings.defaultPriority || "Medium";
  document.getElementById("defaultColumn").value = settings.defaultColumn || "";
  document.getElementById("reminderToggle").checked = settings.reminders || false;
  document.getElementById("soundToggle").checked = settings.sound || false;
}

function saveSettings() {
  const settings = {
    darkMode: document.getElementById("darkModeToggle").checked,
    compactLayout: document.getElementById("compactLayoutToggle").checked,
    defaultPriority: document.getElementById("defaultPriority").value,
    defaultColumn: document.getElementById("defaultColumn").value,
    reminders: document.getElementById("reminderToggle").checked,
    sound: document.getElementById("soundToggle").checked
  };
  localStorage.setItem("settings", JSON.stringify(settings));
}

document.querySelectorAll(".settings-container input, .settings-container select").forEach(el => {
  el.addEventListener("change", saveSettings);
});

loadCategories();
loadSettings();
function logout() {
  localStorage.removeItem("currentUser"); // optional
  window.location.href = "index.html"; // or login.html
}

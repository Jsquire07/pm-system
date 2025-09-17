document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    showNotification("Not logged in.", "error");
    window.location.href = "index.html";
    return;
  }

  const welcome = document.getElementById("welcomeMessage");
  const boardList = document.getElementById("boardsList");
  welcome.textContent = `Welcome, ${user.name}!`;

  // Step 1: Get board memberships
  const { data: memberships, error: membershipError } = await supabase
    .from("board_members")
    .select("board_id")
    .eq("user_id", user.id);

  if (membershipError) {
    console.error("Error loading memberships:", membershipError.message);
    boardList.innerHTML = "<p>Error loading your boards.</p>";
    return;
  }

  const boardIds = memberships.map(m => m.board_id);

  if (boardIds.length === 0) {
    boardList.innerHTML = "<p>No boards yet. Create or join one!</p>";
    return;
  }

  // Step 2: Get boards
  const { data: boards, error: boardError } = await supabase
    .from("boards")
    .select("*")
    .in("id", boardIds);

  if (boardError) {
    console.error("Error loading boards:", boardError.message);
    boardList.innerHTML = "<p>Error loading your boards.</p>";
    return;
  }

  // Step 3: Fetch owners
  const ownerIds = [...new Set(boards.map(b => b.owner_id))];
  const { data: owners, error: ownersError } = await supabase
    .from("users")
    .select("id, name")
    .in("id", ownerIds);

  if (ownersError) {
    console.error("Error loading owners:", ownersError.message);
  }

  // Step 4: Render each board
  boards.forEach(board => {
    const isOwner = String(board.owner_id) === String(user.id);
    const owner = owners.find(u => u.id === board.owner_id);
    const ownerDisplay = owner ? `${owner.name} (${owner.id})` : `Unknown (${board.owner_id})`;

    const card = document.createElement("div");
    card.className = "card";
    card.style.backgroundColor = board.theme_color || "#ffffff";

    const icon = board.icon_url
      ? `<img src="${board.icon_url}" alt="Board Icon" style="width:40px; height:40px; border-radius:8px; margin-bottom:10px;">`
      : "";

    card.innerHTML = `
      <h2>${board.name}</h2>
      ${icon}
      <p class="board-description">${board.description || "No description provided."}</p>
      <p>Owner: ${ownerDisplay}</p>
      <p>Join Code: <code>${board.code}</code> 
        <button class="copy-code-btn" data-code="${board.code}">📋 Copy</button>
      </p>
      <a href="board.html?id=${board.id}" class="button">Open Board</a>
      ${isOwner ? `
        <a href="board_settings.html?id=${board.id}"
           class="button settings"
           onclick="localStorage.setItem('currentBoardId', '${board.id}')">⚙️ Settings</a>
      ` : ""}
    `;

    boardList.appendChild(card);
  });

  // Copy join code handlers
  document.querySelectorAll(".copy-code-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const code = btn.dataset.code;
      navigator.clipboard.writeText(code)
        .then(() => showNotification(`Copied join code: ${code}`, "success"))
        .catch(() => showNotification("Failed to copy join code.", "error"));
    });
  });

  // Universal Search
  const searchInput = document.getElementById("dashboardSearch");
  const searchResults = document.getElementById("searchResults");

  searchInput.addEventListener("input", async () => {
    const query = searchInput.value.trim().toLowerCase();
    searchResults.innerHTML = "";
    if (!query) {
      searchResults.style.display = "none";
      return;
    }

    const [boardsRes, employeesRes, columnsRes, tasksRes] = await Promise.all([
      supabase.from("boards").select("*").ilike("name", `%${query}%`),
      supabase.from("users").select("*").or(`name.ilike.%${query}%,email.ilike.%${query}%`),
      supabase.from("columns").select("*").ilike("name", `%${query}%`),
      supabase.from("tasks").select("*").ilike("title", `%${query}%`)
    ]);

    const results = [];

    if (boardsRes.data) {
      boardsRes.data.forEach(b => results.push({
        label: `📋 Board: ${b.name}`,
        action: () => window.location.href = `board.html?id=${b.id}`
      }));
    }

    if (employeesRes.data) {
      employeesRes.data.forEach(e => results.push({
        label: `👤 Employee: ${e.name} (${e.email})`,
        action: () => window.location.href = `employees.html`
      }));
    }

    if (columnsRes.data) {
      columnsRes.data.forEach(c => results.push({
        label: `🗂️ Column: ${c.name}`,
        action: () => window.location.href = `board.html?id=${c.board_id}`
      }));
    }

    if (tasksRes.data) {
      tasksRes.data.forEach(t => results.push({
        label: `✅ Task: ${t.title}`,
        action: () => window.location.href = `board.html?id=${t.board_id}`
      }));
    }

    if (results.length === 0) {
      searchResults.innerHTML = `<div>No results found</div>`;
    } else {
      results.forEach(r => {
        const div = document.createElement("div");
        div.textContent = r.label;
        div.addEventListener("click", r.action);
        searchResults.appendChild(div);
      });
    }

    searchResults.style.display = "block";
  });

  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.style.display = "none";
    }
  });
});

function showNotification(message, type = "info") {
  const container = document.getElementById("notificationContainer");

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  container.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

async function logout() {
  await supabase.auth.signOut();
  localStorage.clear();
  window.location.href = "index.html";
}


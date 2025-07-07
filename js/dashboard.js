document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    showToast("Not logged in. Redirecting...", "error");
    setTimeout(() => window.location.href = "index.html", 1500);
    return;
  }

  const welcome = document.getElementById("welcomeMessage");
  const boardList = document.getElementById("boardsList");
  const searchInput = document.querySelector(".search-box input");
  welcome.textContent = `Welcome, ${user.name}!`;

  let allBoards = [];

  try {
    const { data: memberships } = await supabase
      .from("board_members")
      .select("board_id")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      boardList.innerHTML = "<p class='empty-state'>No boards yet. Create or join one!</p>";
      return;
    }

    const boardIds = memberships.map(m => m.board_id);
    const { data: boards } = await supabase
      .from("boards")
      .select("*")
      .in("id", boardIds);

    allBoards = boards; // Save for filtering
    renderBoards(allBoards);

  } catch (err) {
    console.error("Error loading boards:", err.message);
    boardList.innerHTML = "<p class='error-state'>Failed to load your boards.</p>";
    showToast("Error loading boards.", "error");
  }

  // Search filter
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();
    const filtered = allBoards.filter(board =>
      board.name.toLowerCase().includes(query)
    );
    renderBoards(filtered);
  });
});

// Render boards
function renderBoards(boards) {
  const boardList = document.getElementById("boardsList");
  boardList.innerHTML = "";
  boards.forEach(board => {
    const isOwner = String(board.owner_id) === String(JSON.parse(localStorage.getItem("loggedInUser")).id);
    const card = document.createElement("div");
    card.className = "board-card fade-in";
    card.style.backgroundColor = board.theme_color || "#1f1f1f";

    card.innerHTML = `
      <h3>${board.name}</h3>
      <p>${board.description || "No description provided."}</p>
      <div class="tags">
        <span class="tag">Code: ${board.code}</span>
        ${isOwner ? '<span class="tag owner">Owner</span>' : ''}
      </div>
      <div class="board-actions">
        <a href="board.html?id=${board.id}" class="button small primary">Open</a>
        ${isOwner ? `<a href="board_settings.html?id=${board.id}" class="button small secondary">Settings</a>` : ""}
      </div>
    `;
    boardList.appendChild(card);

    setTimeout(() => card.classList.add("active"), 100);
  });
}

// Toast notification
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("visible"), 100);
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// Logout
function logout() {
  localStorage.removeItem("loggedInUser");
  showToast("Logged out successfully.", "success");
  setTimeout(() => window.location.href = "index.html", 1000);
}

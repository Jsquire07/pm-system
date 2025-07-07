document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    alert("Not logged in.");
    window.location.href = "index.html";
    return;
  }

  const welcome = document.getElementById("welcomeMessage");
  const boardList = document.getElementById("boardsList");
  welcome.textContent = `Welcome, ${user.name}!`;

  // Get board memberships
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

  // Get boards
  const { data: boards, error: boardError } = await supabase
    .from("boards")
    .select("*")
    .in("id", boardIds);

  if (boardError) {
    console.error("Error loading boards:", boardError.message);
    boardList.innerHTML = "<p>Error loading your boards.</p>";
    return;
  }

  // Render each board
  boards.forEach(board => {
    const isOwner = String(board.owner_id) === String(user.id);

    const card = document.createElement("div");
    card.className = "card";
    card.style.backgroundColor = board.theme_color || "#1f1f1f";

    const icon = board.icon_url
      ? `<img src="${board.icon_url}" alt="Board Icon" class="board-icon">`
      : "";

    card.innerHTML = `
      ${icon}
      <h2>${board.name}</h2>
      <p class="board-description">${board.description || "No description provided."}</p>
      <p class="board-meta">Join Code: <code>${board.code}</code></p>
      <a href="board.html?id=${board.id}" class="button">Open Board</a>
      ${isOwner ? `
        <a href="board_settings.html?id=${board.id}" class="button settings">⚙️ Settings</a>
      ` : ""}
    `;

    boardList.appendChild(card);
  });
});

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

  // Step 1: Get all board memberships for the logged-in user
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

  // Step 2: Fetch all boards the user is a member of
  const { data: boards, error: boardError } = await supabase
    .from("boards")
    .select("*")
    .in("id", boardIds);

  if (boardError) {
    console.error("Error loading boards:", boardError.message);
    boardList.innerHTML = "<p>Error loading your boards.</p>";
    return;
  }

  // Step 3: Render the board cards
  boards.forEach(board => {
    const isOwner = String(board.owner_id) === String(user.id);


    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
    <h2>${board.name}</h2>
    <p>Owner ID: ${board.owner_id}</p>
    <p>Join Code: <code>${board.code}</code></p>
    <a href="board.html?id=${board.id}" class="button">Open Board</a>
    ${isOwner ? `<a href="board_settings.html?id=${board.id}" class="button" style="margin-left: 10px;">⚙️ Settings</a>` : ""}
  `;

    boardList.appendChild(card);
  });


});

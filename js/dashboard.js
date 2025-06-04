document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user) {
    alert("Not logged in.");
    window.location.href = "index.html";
    return;
  }

  document.getElementById("welcomeMessage").innerText = `Welcome, ${user.name}!`;

  const { data: boards, error } = await supabase
    .from("boards")
    .select("*")
    .contains("members", [user.id]);

  const boardList = document.getElementById("boardsList");

  if (error) {
    boardList.innerHTML = "<p>Error loading boards.</p>";
    console.error(error);
    return;
  }

  if (!boards || boards.length === 0) {
    boardList.innerHTML = "<p>No boards yet. Create or join one!</p>";
    return;
  }

  boards.forEach(board => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h2>${board.name}</h2>
      <p>Owner ID: ${board.owner}</p>
      <p>Join Code: <code>${board.code}</code></p>
      <a href="board.html?id=${board.id}" class="button">Open Board</a>
    `;
    boardList.appendChild(card);
  });
});

function logout() {
  localStorage.removeItem("loggedInUser");
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    alert("Not logged in.");
    window.location.href = "index.html";
    return;
  }

  const form = document.getElementById("createBoardForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const boardName = document.getElementById("boardName").value;
    const boardCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Insert new board into Supabase
    const { data, error } = await supabase
      .from("boards")
      .insert([
        {
          name: boardName,
          owner_id: user.id,
          code: boardCode,
        },
      ])
      .select(); // Necessary to get the inserted board's ID

    if (error) {
      console.error("Error creating board:", error.message);
      alert("Failed to create board.");
      return;
    }

    if (!data || !data[0]) {
      console.error("No board data returned after creation.");
      alert("Board created but no data returned.");
      return;
    }

    const boardId = data[0].id;

    // Add the user as a member of the board
    const memberInsert = await supabase.from("board_members").insert([
      {
        board_id: boardId,
        user_id: user.id,
      },
    ]);

    if (memberInsert.error) {
      console.error("Failed to add user to board_members:", memberInsert.error.message);
      alert("Board created, but failed to assign you as a member.");
      return;
    }

    // Success — redirect to dashboard
    window.location.href = "dashboard.html";
  });
});

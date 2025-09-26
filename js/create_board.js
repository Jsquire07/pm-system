// ===== Logout function =====
function logout() {
  localStorage.removeItem("loggedInUser"); // Clear saved login info
  window.location.href = "index.html";     // Redirect to login page
}

// ===== Page Initialization =====
document.addEventListener("DOMContentLoaded", () => {
  // Check if a user is logged in
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    alert("Not logged in.");               // Warn if not logged in
    window.location.href = "index.html";   // Redirect to login
    return;
  }

  // ===== Handle Create Board Form =====
  const form = document.getElementById("createBoardForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get board name from input
    const boardName = document.getElementById("boardName").value;

    // Generate a random 6-digit board code
    const boardCode = Math.floor(100000 + Math.random() * 900000).toString();

    // ===== Insert new board into Supabase =====
    const { data, error } = await supabase
      .from("boards")
      .insert([
        {
          name: boardName,
          owner_id: user.id,  // Current user is owner
          code: boardCode,    // Unique 6-digit code
        },
      ])
      .select(); // Needed to get the inserted board’s ID back

    if (error) {
      console.error("Error creating board:", error.message);
      alert("Failed to create board.");
      return;
    }

    if (!data || !data[0]) {
      // If insert succeeded but no data returned
      console.error("No board data returned after creation.");
      alert("Board created but no data returned.");
      return;
    }

    const boardId = data[0].id; // Extract new board ID

    // ===== Add the user as a member of the new board =====
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

    // ===== Success: Redirect to dashboard =====
    window.location.href = "dashboard.html";
  });
});

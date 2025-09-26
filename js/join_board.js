// ===== Logout helper =====
function logout() {
  localStorage.removeItem("loggedInUser");
  window.location.href = "index.html";
}

// ===== Main logic =====
document.addEventListener("DOMContentLoaded", () => {
  // Grab current logged-in user from localStorage
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    alert("Not logged in.");
    window.location.href = "index.html";
    return;
  }

  const form = document.getElementById("joinBoardForm");
  const message = document.getElementById("joinMessage");

  // ===== Handle join board form submission =====
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const code = document.getElementById("joinCode").value.trim();

    // Guard: user object must exist and have an email
    if (!user || !user.email) {
      alert("You must be logged in to join a board.");
      return;
    }

    // Step 1: Look up board by its unique join code
    const { data: board, error } = await supabase
      .from("boards")
      .select("*")
      .eq("code", code)
      .single();

    if (error || !board) {
      message.style.color = "red";
      message.textContent = "❌ Invalid board code.";
      return;
    }

    // Step 2: Check if the user is already a member of this board
    const { data: existing, error: existErr } = await supabase
      .from("board_members")
      .select("*")
      .eq("user_id", user.id)
      .eq("board_id", board.id)
      .single();

    if (existing) {
      message.style.color = "orange";
      message.textContent = "⚠️ You're already a member of this board.";
      return;
    }

    // Step 3: Insert new membership into board_members table
    const { error: insertErr } = await supabase.from("board_members").insert([
      { user_id: user.id, board_id: board.id }
    ]);

    if (insertErr) {
      message.style.color = "red";
      message.textContent = "❌ Failed to join board.";
      return;
    }

    // Step 4: Success — notify user and reset form
    message.style.color = "green";
    message.textContent = `✅ Joined board "${board.name}" successfully!`;
    form.reset();
  });
});

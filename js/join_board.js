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

  const form = document.getElementById("joinBoardForm");
  const message = document.getElementById("joinMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = document.getElementById("joinCode").value.trim();

    if (!user || !user.email) {
      alert("You must be logged in to join a board.");
      return;
    }

    // Find board by code
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

    // Check if user is already a member
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

    // Add user to board
    const { error: insertErr } = await supabase.from("board_members").insert([
      { user_id: user.id, board_id: board.id }
    ]);

    if (insertErr) {
      message.style.color = "red";
      message.textContent = "❌ Failed to join board.";
      return;
    }

    message.style.color = "green";
    message.textContent = `✅ Joined board "${board.name}" successfully!`;
    form.reset();
  });
});

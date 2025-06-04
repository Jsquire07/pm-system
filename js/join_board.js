document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("joinBoardForm");
  const message = document.getElementById("joinMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = document.getElementById("joinCode").value.trim();
    const user = JSON.parse(localStorage.getItem("currentUser"));

    if (!user || !user.email) {
      alert("You must be logged in to join a board.");
      return;
    }

    const { data: board, error } = await supabase
      .from("boards")
      .select("*")
      .eq("join_code", code)
      .single();

    if (error || !board) {
      message.style.color = "red";
      message.textContent = "❌ Invalid board code.";
      return;
    }

    const { data: existing, error: existErr } = await supabase
      .from("user_board")
      .select("*")
      .eq("user_id", user.email)
      .eq("board_id", board.id)
      .single();

    if (existing) {
      message.style.color = "orange";
      message.textContent = "⚠️ You're already a member of this board.";
      return;
    }

    const { error: insertErr } = await supabase.from("user_board").insert([
      { user_id: user.email, board_id: board.id }
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

const user = JSON.parse(localStorage.getItem("loggedInUser"));
if (!user) {
  alert("Not logged in.");
  window.location.href = "index.html";
  return;
}

document.addEventListener("DOMContentLoaded", async () => {
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!loggedInUser) {
    window.location.href = "login.html";
    return;
  }

  const form = document.getElementById("createBoardForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const boardName = document.getElementById("boardName").value;

    // Insert board into Supabase
    const { data, error } = await supabase
      .from("boards")
      .insert([
        {
          name: boardName,
          owner_id: loggedInUser.id,
          code: Math.floor(100000 + Math.random() * 900000).toString(),
        },
      ]);

    if (error) {
      console.error("Error creating board:", error.message);
    } else {
      // Optional: Add the creator as a member
      await supabase.from("board_members").insert([
        { board_id: data[0].id, user_id: loggedInUser.id },
      ]);

      window.location.href = "dashboard.html";
    }
  });
});

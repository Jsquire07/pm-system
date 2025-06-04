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

    const { data, error } = await supabase
      .from("boards")
      .insert([
        {
          name: boardName,
          owner_id: user.id,
          code: Math.floor(100000 + Math.random() * 900000).toString(),
        },
      ]);

    if (error) {
      console.error("Error creating board:", error.message);
    } else {
      await supabase.from("board_members").insert([
        { board_id: data[0].id, user_id: user.id },
      ]);

      window.location.href = "dashboard.html";
    }
  });
});

const user = JSON.parse(localStorage.getItem("loggedInUser"));
if (!user) {
  alert("Not logged in.");
  window.location.href = "index.html";
  return;
}


document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("createBoardForm");
  const successMsg = document.getElementById("successMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const boardName = document.getElementById("boardName").value.trim();

    if (!boardName) return;

    const user = JSON.parse(localStorage.getItem("currentUser"));
    if (!user || !user.email) {
      alert("You must be logged in to create a board.");
      return;
    }

    const joinCode = Math.floor(100000 + Math.random() * 900000).toString();

    const { data, error } = await supabase.from("boards").insert([{
      name: boardName,
      owner: user.email,
      join_code: joinCode
    }]);

    if (error) {
      console.error("Error creating board:", error);
      alert("Failed to create board.");
      return;
    }

    successMsg.textContent = `✅ Board created! Share this join code: ${joinCode}`;
    form.reset();
  });
});

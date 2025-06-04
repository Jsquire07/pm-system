document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    alert("Not logged in.");
    window.location.href = "index.html";
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const boardId = urlParams.get("id");

  if (!boardId) {
    alert("No board selected.");
    window.location.href = "dashboard.html";
    return;
  }

  // Fetch board data
  const { data: board, error: boardError } = await supabase
    .from("boards")
    .select("*")
    .eq("id", boardId)
    .single();

  if (boardError || !board) {
    alert("Board not found.");
    window.location.href = "dashboard.html";
    return;
  }

  // Restrict access to board owner
  if (String(board.owner_id) !== String(user.id)) {
  alert("Access denied. Only the board owner can manage settings.");
  window.location.href = "dashboard.html";
  return;
}


  // Populate board fields
  document.getElementById("boardName").value = board.name || "";
  document.getElementById("boardDescription").value = board.description || "";
  document.getElementById("boardColor").value = board.theme_color || "#ffffff";
  document.getElementById("boardIcon").value = board.icon_url || "";

  // Handle form submission
  document.getElementById("boardForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const updatedBoard = {
      name: document.getElementById("boardName").value.trim(),
      description: document.getElementById("boardDescription").value.trim(),
      theme_color: document.getElementById("boardColor").value,
      icon_url: document.getElementById("boardIcon").value.trim()
    };

    const { error: updateError } = await supabase
      .from("boards")
      .update(updatedBoard)
      .eq("id", boardId);

    if (updateError) {
      alert("Failed to update board.");
      console.error(updateError);
    } else {
      alert("Board updated successfully!");
    }
  });

  // Load board members
  loadMembers(boardId, user.id);
});

async function loadMembers(boardId, ownerId) {
  const { data: members, error } = await supabase
    .from("board_members")
    .select("*, users(name, email)")
    .eq("board_id", boardId);

  if (error) {
    console.error("Error loading members:", error.message);
    return;
  }

  const container = document.getElementById("membersList");
  container.innerHTML = "";

  members.forEach(member => {
    const isOwner = member.user_id === ownerId;

    const div = document.createElement("div");
    div.className = "member-row";

    div.innerHTML = `
      <strong>${member.users?.name || "Unknown User"}</strong>
      <span>${member.users?.email || ""}</span>
      <select ${isOwner ? "disabled" : ""} data-user="${member.user_id}">
        <option value="view" ${member.permission === "view" ? "selected" : ""}>View Only</option>
        <option value="edit" ${member.permission === "edit" ? "selected" : ""}>Can Edit</option>
      </select>
      ${isOwner ? `<span class="badge">Owner</span>` : `<button data-kick="${member.user_id}">Kick</button>`}
    `;

    container.appendChild(div);
  });

  // Permission change handler
  container.querySelectorAll("select").forEach(select => {
    select.addEventListener("change", async (e) => {
      const userId = e.target.dataset.user;
      const newPermission = e.target.value;

      const { error } = await supabase
        .from("board_members")
        .update({ permission: newPermission })
        .eq("user_id", userId)
        .eq("board_id", boardId);

      if (error) {
        alert("Failed to update permission.");
        console.error(error);
      }
    });
  });

  // Kick button handler
  container.querySelectorAll("button[data-kick]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.kick;
      if (!confirm("Are you sure you want to remove this member?")) return;

      const { error } = await supabase
        .from("board_members")
        .delete()
        .eq("user_id", userId)
        .eq("board_id", boardId);

      if (error) {
        alert("Failed to remove member.");
        console.error(error);
      } else {
        loadMembers(boardId, ownerId);
      }
    });
  });
}

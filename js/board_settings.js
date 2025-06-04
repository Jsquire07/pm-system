document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    alert("Not logged in.");
    window.location.href = "index.html";
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  let boardId = urlParams.get("id");

  if (!boardId) {
    boardId = localStorage.getItem("currentBoardId");
  } else {
    localStorage.setItem("currentBoardId", boardId);
  }

  if (!boardId) {
    alert("No board selected.");
    return;
  }

  const { data: board, error } = await supabase
    .from("boards")
    .select("*")
    .eq("id", boardId)
    .single();

  if (error || !board) {
    alert("Failed to load board settings.");
    return;
  }

  if (board.owner_id !== user.id) {
    alert("Only the board owner can access settings.");
    window.location.href = "dashboard.html";
    return;
  }

  // Set form values
  document.getElementById("boardName").value = board.name;
  document.getElementById("boardDescription").value = board.description || "";
  document.getElementById("boardColor").value = board.theme_color || "#ffffff";

  const iconPreview = document.getElementById("iconPreview");
  if (board.icon_url) {
    iconPreview.src = board.icon_url;
    iconPreview.style.display = "block";
  }

  // Save form
  document.getElementById("boardForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("boardName").value.trim();
    const description = document.getElementById("boardDescription").value.trim();
    const color = document.getElementById("boardColor").value;
    const fileInput = document.getElementById("boardIconFile");
    let iconUrl = board.icon_url;

    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const fileName = `${boardId}_${file.name}`;
      const { data: storageData, error: uploadError } = await supabase
        .storage
        .from("icons")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        alert("Failed to upload icon.");
        console.error(uploadError);
        return;
      }

      const { data: publicUrlData } = supabase
        .storage
        .from("icons")
        .getPublicUrl(fileName);

      iconUrl = publicUrlData.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("boards")
      .update({
        name,
        description,
        theme_color: color,
        icon_url: iconUrl
      })
      .eq("id", boardId);

    if (updateError) {
      alert("Failed to save changes.");
      console.error(updateError);
    } else {
      alert("Board updated successfully.");
      window.location.reload();
    }
  });

  // Load members (simplified without join)
  const { data: membersData, error: memberError } = await supabase
    .from("board_members")
    .select("*")
    .eq("board_id", boardId);

  const membersList = document.getElementById("membersList");
  if (memberError) {
    membersList.innerHTML = "<p>Error loading members.</p>";
    return;
  }

  membersList.innerHTML = membersData
    .map(member => `
      <div class="member">
        <strong>${member.user_id}</strong>
        <select data-user="${member.user_id}" class="permission-select">
          <option value="view" ${member.permission === "view" ? "selected" : ""}>View</option>
          <option value="edit" ${member.permission === "edit" ? "selected" : ""}>Edit</option>
        </select>
        <button class="kick-btn" data-user="${member.user_id}">❌ Kick</button>
      </div>
    `)
    .join("");

  document.querySelectorAll(".kick-btn").forEach(button => {
    button.addEventListener("click", async () => {
      const userId = button.getAttribute("data-user");
      await supabase
        .from("board_members")
        .delete()
        .eq("user_id", userId)
        .eq("board_id", boardId);
      window.location.reload();
    });
  });

  document.querySelectorAll(".permission-select").forEach(select => {
    select.addEventListener("change", async () => {
      const userId = select.getAttribute("data-user");
      const newPermission = select.value;
      await supabase
        .from("board_members")
        .update({ permission: newPermission })
        .eq("user_id", userId)
        .eq("board_id", boardId);
    });
  });
});

async function loadMembers(boardId, ownerId) {
    // Step 1: Get all members of this board
    const { data: members, error: memberError } = await supabase
        .from("board_members")
        .select("*")
        .eq("board_id", boardId);

    if (memberError) {
        console.error("Error loading board members:", memberError.message);
        return;
    }

    // Step 2: Get all users
    const { data: users, error: userError } = await supabase
        .from("users")
        .select("id, name, email");

    if (userError) {
        console.error("Error loading users:", userError.message);
        return;
    }

    // Step 3: Match each board member with their user details
    const container = document.getElementById("membersList");
    container.innerHTML = "";

    members.forEach(member => {
        const user = users.find(u => String(u.id) === String(member.user_id));
        const isOwner = String(member.user_id) === String(ownerId);

        const div = document.createElement("div");
        div.className = "member-row";
        div.innerHTML = `
      <strong>${user?.name || "Unknown"}</strong>
      <span>${user?.email || ""}</span>
      <select ${isOwner ? "disabled" : ""} data-user="${member.user_id}">
        <option value="view" ${member.permission === "view" ? "selected" : ""}>View Only</option>
        <option value="edit" ${member.permission === "edit" ? "selected" : ""}>Can Edit</option>
      </select>
      ${isOwner ? `<span class="badge">Owner</span>` : `<button data-kick="${member.user_id}">Kick</button>`}
    `;
        container.appendChild(div);
    });

    // Change permission handler
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
                loadMembers(boardId, ownerId); // reload
            }
        });
    });
}

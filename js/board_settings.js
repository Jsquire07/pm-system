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
    document.getElementById("iconPreview").src = board.icon_url || "";
    document.getElementById("iconPreview").style.display = board.icon_url ? "block" : "none";

    // Handle form submission
    document.getElementById("boardForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("boardName").value.trim();
        const description = document.getElementById("boardDescription").value.trim();
        const theme_color = document.getElementById("boardColor").value;
        const file = document.getElementById("boardIconFile").files[0];

        let icon_url = board.icon_url;

        if (file) {
            const fileName = `icon_${board.id}_${Date.now()}`;
            const { data, error: uploadError } = await supabase.storage
                .from("board-icons")
                .upload(fileName, file, { cacheControl: "3600", upsert: true });

            if (uploadError) {
                alert("Failed to upload icon.");
                console.error(uploadError);
                return;
            }

            const { data: publicUrlData } = supabase
                .storage
                .from("board-icons")
                .getPublicUrl(fileName);

            icon_url = publicUrlData?.publicUrl;
        }

        const { error: updateError } = await supabase
            .from("boards")
            .update({
                name,
                description,
                theme_color,
                icon_url
            })
            .eq("id", boardId);

        if (updateError) {
            alert("Failed to update board.");
            console.error(updateError);
        } else {
            alert("Board updated successfully!");
            document.getElementById("iconPreview").src = icon_url;
            document.getElementById("iconPreview").style.display = "block";
        }
    });

    // Load board members
    loadMembers(boardId, user.id);
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

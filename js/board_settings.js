function showNotification(message, type = "info") {
    const container = document.getElementById("notificationContainer");

    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3400);
}

document.addEventListener("DOMContentLoaded", async () => {
    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!user) {
        showNotification("Not logged in.", "error");
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
        showNotification("No board selected.", "error");
        return;
    }

    const { data: board, error } = await supabase
        .from("boards")
        .select("*")
        .eq("id", boardId)
        .single();

    if (error || !board) {
        showNotification("Failed to load board settings.", "error");
        return;
    }

    if (String(board.owner_id) !== String(user.id)) {
        showNotification("Only the board owner can access settings.", "error");
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

        const { error: updateError } = await supabase
            .from("boards")
            .update({
                name,
                description,
                theme_color: color
            })
            .eq("id", boardId);

        if (updateError) {
            console.error(updateError);
            showNotification("Failed to save changes.", "error");
        } else {
            showNotification("Board updated successfully.", "success");
        }
    });

    await loadMembers(boardId, board.owner_id);
});

function showConfirm(message, onConfirm) {
    const modal = document.getElementById("confirmModal");
    const messageEl = document.getElementById("confirmModalMessage");
    const yesBtn = document.getElementById("confirmYesBtn");
    const cancelBtn = document.getElementById("confirmCancelBtn");

    messageEl.textContent = message;
    modal.style.display = "flex";

    // Clear previous click handlers
    yesBtn.replaceWith(yesBtn.cloneNode(true));
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));

    // Get fresh buttons
    const newYesBtn = document.getElementById("confirmYesBtn");
    const newCancelBtn = document.getElementById("confirmCancelBtn");

    newYesBtn.addEventListener("click", () => {
        modal.style.display = "none";
        if (onConfirm) onConfirm();
    });

    newCancelBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });
}


async function loadMembers(boardId, ownerId) {
    const { data: members, error: memberError } = await supabase
        .from("board_members")
        .select("*")
        .eq("board_id", boardId);

    if (memberError) {
        console.error(memberError.message);
        showNotification("Error loading members.", "error");
        return;
    }

    const { data: users, error: userError } = await supabase
        .from("users")
        .select("id, name, email");

    if (userError) {
        console.error(userError.message);
        showNotification("Error loading user details.", "error");
        return;
    }

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
            ${isOwner ? `<span class="badge">Owner</span>` : `<button class="kick-btn" data-user="${member.user_id}">❌ Kick</button>`}
        `;
        container.appendChild(div);
    });

    container.querySelectorAll(".kick-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const userId = btn.dataset.user;

        showConfirm("Are you sure you want to remove this member?", async () => {
            const { error } = await supabase
                .from("board_members")
                .delete()
                .eq("user_id", userId)
                .eq("board_id", boardId);

            if (error) {
                console.error(error);
                showNotification("Failed to remove member.", "error");
            } else {
                showNotification("Member removed.", "success");
                loadMembers(boardId, ownerId);
            }
        });
    });
});

}

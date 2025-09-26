// Function to display a temporary notification message on the screen
function showNotification(message, type = "info") {
  const container = document.getElementById("notificationContainer"); // Container for notifications
  const notification = document.createElement("div"); // Create a new div for the notification
  notification.className = `notification ${type}`; // Add CSS classes (info, error, success, etc.)
  notification.textContent = message; // Set the message text
  container.appendChild(notification); // Add it to the page
  setTimeout(() => notification.remove(), 3400); // Auto-remove after ~3.4 seconds
}

// Run when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", async () => {
  // Check if a user is logged in (retrieved from localStorage)
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    showNotification("Not logged in.", "error"); // Show error if no user
    window.location.href = "index.html"; // Redirect to login
    return;
  }

  // Get board ID from URL or fallback to localStorage
  const urlParams = new URLSearchParams(window.location.search);
  let boardId = urlParams.get("id");
  if (!boardId) boardId = localStorage.getItem("currentBoardId");
  else localStorage.setItem("currentBoardId", boardId);

  // If no board ID found, stop and show error
  if (!boardId) {
    showNotification("No board selected.", "error");
    return;
  }

  // Logout function clears user data and redirects to login
  function logout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
  }

  // Fetch board data from Supabase
  const { data: board, error } = await supabase
    .from("boards")
    .select("*")
    .eq("id", boardId)
    .single();

  // Handle fetch failure
  if (error || !board) {
    showNotification("Failed to load board settings.", "error");
    return;
  }

  // Only the board owner is allowed to access settings
  if (String(board.owner_id) !== String(user.id)) {
    showNotification("Only the board owner can access settings.", "error");
    window.location.href = "dashboard.html";
    return;
  }

  // ===== Populate form fields with board data =====
  const nameEl = document.getElementById("boardName");
  const descEl = document.getElementById("boardDescription");
  const colorEl = document.getElementById("boardColor");
  const swatchEl = document.getElementById("boardColorSwatch");
  const iconPreview = document.getElementById("iconPreview");
  const pageTitle = document.getElementById("pageTitle");

  nameEl.value = board.name || "";
  descEl.value = board.description || "";
  colorEl.value = board.theme_color || "#ffffff";
  if (swatchEl) swatchEl.style.background = colorEl.value;

  if (iconPreview && board.icon_url) {
    iconPreview.src = board.icon_url; // Show uploaded icon if exists
    iconPreview.style.display = "block";
  }

  if (pageTitle) pageTitle.textContent = `Board Settings — ${board.name}`;

  // ===== Live color swatch update =====
  colorEl.addEventListener("input", () => {
    if (swatchEl) swatchEl.style.background = colorEl.value;
  });

  // ===== Save form changes =====
  document.getElementById("boardForm").addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent default form reload

    // Collect form values
    const name = nameEl.value.trim();
    const description = descEl.value.trim();
    const color = colorEl.value;

    // Update board in Supabase
    const { error: updateError } = await supabase
      .from("boards")
      .update({ name, description, theme_color: color })
      .eq("id", boardId);

    // Handle update result
    if (updateError) {
      console.error(updateError);
      showNotification("Failed to save changes.", "error");
    } else {
      showNotification("Board updated successfully.", "success");
      if (pageTitle) pageTitle.textContent = `Board Settings — ${name || "Untitled"}`;
    }
  });

  // Load members list for the board
  await loadMembers(boardId, board.owner_id);
});

// Function to show a confirmation modal (Yes/Cancel)
function showConfirm(message, onConfirm) {
  const modal = document.getElementById("confirmModal");
  const messageEl = document.getElementById("confirmModalMessage");
  const yesBtn = document.getElementById("confirmYesBtn");
  const cancelBtn = document.getElementById("confirmCancelBtn");

  messageEl.textContent = message; // Set modal message
  modal.style.display = "flex"; // Show modal

  // Reset old button event listeners by cloning
  yesBtn.replaceWith(yesBtn.cloneNode(true));
  cancelBtn.replaceWith(cancelBtn.cloneNode(true));

  const newYes = document.getElementById("confirmYesBtn");
  const newCancel = document.getElementById("confirmCancelBtn");

  // Handle confirm button click
  newYes.addEventListener("click", () => {
    modal.style.display = "none";
    if (onConfirm) onConfirm();
  });

  // Handle cancel button click
  newCancel.addEventListener("click", () => (modal.style.display = "none"));
}

// Function to load members of a board
async function loadMembers(boardId, ownerId) {
  // Get board members from Supabase
  const { data: members, error: memberError } = await supabase
    .from("board_members")
    .select("*")
    .eq("board_id", boardId);

  if (memberError) {
    console.error(memberError.message);
    showNotification("Error loading members.", "error");
    return;
  }

  // Get all users for lookup
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id, name, email");

  if (userError) {
    console.error(userError.message);
    showNotification("Error loading user details.", "error");
    return;
  }

  const container = document.getElementById("membersList");
  container.innerHTML = ""; // Clear previous list

  // Render each member in the list
  (members || []).forEach((member) => {
    const u = (users || []).find((x) => String(x.id) === String(member.user_id));
    const isOwner = String(member.user_id) === String(ownerId);

    const div = document.createElement("div");
    div.className = "member-row";
    div.innerHTML = `
      <strong>${u?.name || "Unknown"}</strong>
      <span>${u?.email || ""}</span>
      ${isOwner
        ? `<span class="badge">Owner</span>`
        : `<button class="kick-btn" data-user="${member.user_id}">❌ Kick</button>`
      }
    `;
    container.appendChild(div);
  });

  // Add kick functionality for non-owner members
  container.querySelectorAll(".kick-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const userId = btn.dataset.user;
      showConfirm("Remove this member from the board?", async () => {
        // Remove member from Supabase
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
          loadMembers(boardId, ownerId); // Refresh list
        }
      });
    });
  });
}

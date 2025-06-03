document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname.split("/").pop().split("?")[0].toLowerCase();

  document.querySelectorAll(".sidebar-button").forEach(link => {
    const href = link.getAttribute("href");
    if (!href) return;

    // Strip everything after ? and compare lowercase
    const cleanHref = href.split("?")[0].toLowerCase();

    if (currentPath === cleanHref) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
});

function logout() {
  localStorage.removeItem("loggedInUser");
  window.location.href = "login.html";
}

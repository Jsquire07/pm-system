form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const name = nameInput.value.trim();

  try {
    let endpoint = creatingAccount ? "/api/register" : "/api/login";
    let payload = creatingAccount ? { name, email, password } : { email, password };

    const res = await fetch("http://localhost:5000" + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      errorMsg.textContent = data.error || "Something went wrong";
      return;
    }

    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("loggedInUser", JSON.stringify(data.user));
      window.location.href = "dashboard.html";
    } else {
      errorMsg.textContent = data.message;
      if (creatingAccount) toggleMode();
    }
  } catch (err) {
    errorMsg.textContent = "Server unreachable.";
  }
});

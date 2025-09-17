// login.js
const supabase = window.supabase.createClient(
  "https://qqlsttamprrcljljcqrk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbHN0dGFtcHJyY2xqbGpjcXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NTQ2NTcsImV4cCI6MjA2NDQzMDY1N30.spAzwuJkcbU8WfgTYsivEC_TT1VTji7YGAEfIeh-44g"
);

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const nameInput = document.getElementById("register-name");
const registerFields = document.getElementById("registerFields");
const toggleLink = document.getElementById("toggleLink");
const errorMsg = document.getElementById("login-error");
const formTitle = document.getElementById("formTitle");
const loginBtn = document.getElementById("loginBtn");

let creatingAccount = false;

function toggleMode() {
  creatingAccount = !creatingAccount;
  registerFields.style.display = creatingAccount ? "block" : "none";
  formTitle.textContent = creatingAccount ? "Create Account" : "Employee Login";
  loginBtn.textContent = creatingAccount ? "Create Account" : "Login";
  toggleLink.textContent = creatingAccount ? "Back to Login" : "Create an account";
  errorMsg.textContent = "";

  registerFields.style.opacity = 0;
  setTimeout(() => {
    registerFields.style.transition = "opacity 0.4s ease";
    registerFields.style.opacity = creatingAccount ? 1 : 0;
  }, 100);
}

toggleLink.addEventListener("click", toggleMode);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const name = nameInput.value.trim();

  try {
    let endpoint = creatingAccount ? "/api/register" : "/api/login";
    let payload = creatingAccount
      ? { name, email, password }
      : { email, password };

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
      if (creatingAccount) toggleMode(); // flip back to login mode
    }
  } catch (err) {
    errorMsg.textContent = "Server unreachable.";
  }
});

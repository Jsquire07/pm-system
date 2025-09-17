// js/login.js
document.addEventListener("DOMContentLoaded", () => {
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
  }

  toggleLink.addEventListener("click", toggleMode);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.textContent = "";

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const name = nameInput.value.trim();

    try {
      if (creatingAccount) {
        // ✅ Register with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name } // store custom user metadata
          }
        });

        if (error) {
          errorMsg.textContent = error.message;
          return;
        }

        errorMsg.textContent = "Account created! Please check your email to confirm.";
        toggleMode(); // go back to login mode
      } else {
        // ✅ Login with Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          errorMsg.textContent = "Invalid email or password.";
          return;
        }

        // Store session in localStorage
        localStorage.setItem("token", data.session.access_token);
        localStorage.setItem("loggedInUser", JSON.stringify(data.user));

        // Redirect
        window.location.href = "dashboard.html";
      }
    } catch (err) {
      errorMsg.textContent = "Something went wrong.";
    }
  });
});

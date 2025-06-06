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

// Toggle animated form mode
function toggleMode() {
  creatingAccount = !creatingAccount;
  registerFields.style.display = creatingAccount ? "block" : "none";
  formTitle.textContent = creatingAccount ? "Create Account" : "Employee Login";
  loginBtn.textContent = creatingAccount ? "Create Account" : "Login";
  toggleLink.textContent = creatingAccount ? "Back to Login" : "Create an account";
  errorMsg.textContent = "";

  // Smooth fade animation
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
  const inputPassword = passwordInput.value;

  if (creatingAccount) {
    const name = nameInput.value.trim();
    if (!name) {
      errorMsg.textContent = "Please enter your name.";
      return;
    }

    const hashedPassword = await dcodeIO.bcrypt.hash(inputPassword, 10);
    const { error } = await supabase.from("users").insert([
      { name, email, password: hashedPassword }
    ]);

    if (error) {
      errorMsg.textContent = "Failed to create account. Email may already exist.";
      return;
    }

    const { data: user } = await supabase.from("users").select("*").eq("email", email).single();
    localStorage.setItem("loggedInUser", JSON.stringify(user));
    window.location.href = "dashboard.html";
    return;
  }

  const { data: user, error } = await supabase.from("users").select("*").eq("email", email).single();

  if (error || !user) {
    errorMsg.textContent = "Invalid credentials.";
    return;
  }

  const passwordMatch = await dcodeIO.bcrypt.compare(inputPassword, user.password);
  if (!passwordMatch) {
    errorMsg.textContent = "Invalid credentials.";
    return;
  }

  localStorage.setItem("loggedInUser", JSON.stringify(user));
  window.location.href = "dashboard.html";
});

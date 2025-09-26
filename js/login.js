// ===== Initialize Supabase client =====
const supabase = window.supabase.createClient(
  "https://qqlsttamprrcljljcqrk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbHN0dGFtcHJyY2xqbGpjcXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NTQ2NTcsImV4cCI6MjA2NDQzMDY1N30.spAzwuJkcbU8WfgTYsivEC_TT1VTji7YGAEfIeh-44g"
);

// ===== DOM references =====
const form = document.getElementById("loginForm");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const nameInput = document.getElementById("register-name");
const registerFields = document.getElementById("registerFields");
const toggleLink = document.getElementById("toggleLink");
const errorMsg = document.getElementById("login-error");
const formTitle = document.getElementById("formTitle");
const loginBtn = document.getElementById("loginBtn");

// Track login vs register state
let creatingAccount = false;

// ===== Toggle between Login and Register modes =====
function toggleMode() {
  creatingAccount = !creatingAccount;

  // Switch visible fields
  registerFields.style.display = creatingAccount ? "block" : "none";

  // Update UI labels
  formTitle.textContent = creatingAccount ? "Create Account" : "Employee Login";
  loginBtn.textContent = creatingAccount ? "Create Account" : "Login";
  toggleLink.textContent = creatingAccount ? "Back to Login" : "Create an account";
  errorMsg.textContent = "";

  // Smooth fade-in/out animation
  registerFields.style.opacity = 0;
  setTimeout(() => {
    registerFields.style.transition = "opacity 0.4s ease";
    registerFields.style.opacity = creatingAccount ? 1 : 0;
  }, 100);
}
toggleLink.addEventListener("click", toggleMode);

// ===== Handle form submission =====
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";

  const email = emailInput.value.trim();
  const inputPassword = passwordInput.value;

  // === Create account flow ===
  if (creatingAccount) {
    const name = nameInput.value.trim();
    if (!name) {
      errorMsg.textContent = "Please enter your name.";
      return;
    }

    // 1. Hash password before saving
    const hashedPassword = await dcodeIO.bcrypt.hash(inputPassword, 10);

    // 2. Insert user into Supabase
    const { error: insertError } = await supabase.from("users").insert([
      { name, email, password: hashedPassword }
    ]);

    if (insertError) {
      errorMsg.textContent = "Failed to create account. Email may already exist.";
      return;
    }

    // 3. Fetch user row to store in localStorage
    const { data, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email);

    if (fetchError || !data || data.length === 0) {
      errorMsg.textContent = "Error retrieving account.";
      return;
    }

    // 4. Save session locally and redirect
    const user = data[0];
    localStorage.setItem("loggedInUser", JSON.stringify(user));
    window.location.href = "dashboard.html";
    return;
  }

  // === Login flow ===
  // 1. Get user record by email
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, password")
    .eq("email", email);

  if (error || !data || data.length === 0) {
    errorMsg.textContent = "Invalid credentials.";
    return;
  }

  const user = data[0];

  // 2. Compare entered password with stored hash
  const passwordMatch = await dcodeIO.bcrypt.compare(inputPassword, user.password);
  if (!passwordMatch) {
    errorMsg.textContent = "Invalid credentials.";
    return;
  }

  // 3. Store session locally and redirect
  localStorage.setItem("loggedInUser", JSON.stringify(user));
  window.location.href = "dashboard.html";
});

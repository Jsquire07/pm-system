const supabase = window.supabase.createClient(
  "https://qqlsttamprrcljljcqrk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbHN0dGFtcHJyY2xqbGpjcXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NTQ2NTcsImV4cCI6MjA2NDQzMDY1N30.spAzwuJkcbU8WfgTYsivEC_TT1VTji7YGAEfIeh-44g"
);

let isRegistering = false;
const form = document.getElementById("loginForm");
const errorMsg = document.getElementById("login-error");
const toggleLink = document.getElementById("toggleLink");

toggleLink.addEventListener("click", () => {
  isRegistering = !isRegistering;
  document.getElementById("formTitle").textContent = isRegistering ? "Create Account" : "Employee Login";
  document.getElementById("loginBtn").textContent = isRegistering ? "Create Account" : "Login";
  document.getElementById("registerFields").style.display = isRegistering ? "block" : "none";
  toggleLink.textContent = isRegistering ? "Back to Login" : "Create an account";
  errorMsg.textContent = "";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (isRegistering) {
    const name = document.getElementById("register-name").value.trim();
    const role = document.getElementById("register-role").value;

    const { data: existing } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
    if (existing) {
      errorMsg.textContent = "Account already exists.";
      return;
    }

    const hashedPassword = await dcodeIO.bcrypt.hash(password, 10);
    const { data, error } = await supabase.from("users").insert([
      { name, email, password: hashedPassword, role }
    ]);

    if (error) {
      errorMsg.textContent = "Account creation failed.";
      console.error(error);
      return;
    }

    errorMsg.textContent = "✅ Account created! You can now log in.";
    toggleLink.click();
    return;
  }

  // LOGIN
  const { data: user, error } = await supabase.from("users").select("*").eq("email", email).single();
  if (error || !user) {
    errorMsg.textContent = "Invalid credentials.";
    return;
  }

  const match = await dcodeIO.bcrypt.compare(password, user.password);
  if (!match) {
    errorMsg.textContent = "Invalid credentials.";
    return;
  }

  localStorage.setItem("loggedInUser", JSON.stringify(user));
  window.location.href = "dashboard.html";
});

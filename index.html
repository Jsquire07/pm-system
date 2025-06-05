const supabase = window.supabase.createClient(
  "https://qqlsttamprrcljljcqrk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbHN0dGFtcHJyY2xqbGpjcXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NTQ2NTcsImV4cCI6MjA2NDQzMDY1N30.spAzwuJkcbU8WfgTYsivEC_TT1VTji7YGAEfIeh-44g"
);

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("login-email").value.trim();
  const inputPassword = document.getElementById("login-password").value;

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !user) {
    document.getElementById("login-error").textContent = "Invalid credentials.";
    return;
  }

  const passwordMatch = await dcodeIO.bcrypt.compare(inputPassword, user.password);
  if (!passwordMatch) {
    document.getElementById("login-error").textContent = "Invalid credentials.";
    return;
  }

  // ✅ Set Supabase Auth Session so protected pages work
  await supabase.auth.signInWithPassword({ email, password: inputPassword });

  // ✅ Store user in localStorage so frontend can access details
  localStorage.setItem("loggedInUser", JSON.stringify(user));

  window.location.href = "dashboard.html";
});

import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // only server has this
);

const JWT_SECRET = process.env.JWT_SECRET || "super-secret";

// Helper: validate email format
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 🔹 REGISTER
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  // 1. Server-side validation
  if (!name || name.length < 2) return res.status(400).json({ error: "Invalid name" });
  if (!isValidEmail(email)) return res.status(400).json({ error: "Invalid email" });
  if (!password || password.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 chars" });

  try {
    // 2. Check if email already exists
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // 3. Hash password securely
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4. Insert user into database
    const { data, error } = await supabase
      .from("users")
      .insert([{ name, email, password: hashedPassword }])
      .select("id, name, email")
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: "Account created", user: data });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// 🔹 LOGIN
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  // 1. Validation
  if (!isValidEmail(email)) return res.status(400).json({ error: "Invalid email" });
  if (!password) return res.status(400).json({ error: "Password required" });

  try {
    // 2. Fetch user
    const { data: users, error } = await supabase
      .from("users")
      .select("id, name, email, password")
      .eq("email", email)
      .limit(1);

    if (error || !users || users.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = users[0];

    // 3. Check password
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    // 4. Issue JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// 🔹 Middleware to protect routes
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Missing token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // attach user info
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

// 🔹 Example protected route
app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// Start server
const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Secure server running on http://localhost:${PORT}`));

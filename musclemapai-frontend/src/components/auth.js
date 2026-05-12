import { useState } from "react";
import { supabase } from "../supabase";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [awaitingVerification, setAwaitingVerification] = useState(false);

async function handleAuth() {
  if (mode === "signin") {
    await supabase.auth.signInWithPassword({ email, password });
    return;
  }

  // SIGN UP MODE
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    alert(error.message);
    return;
  }

  // If Supabase requires email verification, user will NOT be logged in yet
  setAwaitingVerification(true);
}

if (awaitingVerification) {
  return (
    <div style={{ padding: 20 }}>
      <h2>Verify Your Email</h2>
      <p>
        We sent a verification link to <strong>{email}</strong>.
        <br />
        Please check your inbox and click the link to activate your account.
      </p>

      <p style={{ marginTop: 20, color: "gray" }}>
        After verifying, return here and sign in.
      </p>
    </div>
  );
}

  return (
    <div style={{ padding: 20 }}>
      <h2>{mode === "signin" ? "Sign In" : "Create Account"}</h2>

      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", marginBottom: 10 }}
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: "block", marginBottom: 10 }}
      />

      <button onClick={handleAuth}>
        {mode === "signin" ? "Sign In" : "Sign Up"}
      </button>

      <p
        style={{ marginTop: 10, cursor: "pointer", color: "red" }}
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </p>
    </div>
  );
}
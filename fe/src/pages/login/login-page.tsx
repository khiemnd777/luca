import { type FormEvent, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@store/auth-store";

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const [search] = useSearchParams();
  const redirect = search.get("redirect") || "/";
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate(redirect, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "64px auto" }}>
      <h1 style={{ marginBottom: 16 }}>Login</h1>
      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
        {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}
        <button type="submit" disabled={submitting} style={{ width: "100%" }}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChefHat, ShieldCheck, ArrowRight, UserCircle2 } from "lucide-react";
import { useAuth } from "../lib/auth";

const demos = [
  { role: "Admin", email: "wendy.h@example.net", desc: "Full policies & management access" },
  { role: "Manager", email: "walt.e@example.net", desc: "Verification, analytics & shifts" },
  { role: "Chef", email: "ivan.p@example.net", desc: "Recipes, allergen control & line tickets" },
  { role: "Staff", email: "zoe.m@example.net", desc: "Ground station execution & incident filing" },
];

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("zoe.m@example.net");
  const [password, setPassword] = useState("Demo@1234!");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      nav("/");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "var(--copper-gradient)",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              margin: "0 auto 16px",
              boxShadow: "0 8px 24px rgba(224, 122, 56, 0.4)",
            }}
          >
            <ChefHat size={30} />
          </div>
          <div className="brand-badge">Evidence-Grounded Ops</div>
          <h1>Sign in to the Pass</h1>
          <p className="muted" style={{ fontSize: 13.5, marginTop: 8 }}>
            Verified SOP citations, organizational memory, and human-in-the-loop escalation.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-sub)", marginBottom: 6 }}>
              Kitchen Email
            </label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. zoe.m@example.net"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-sub)", marginBottom: 6 }}>
              Passcode
            </label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
          </div>
        </div>

        {err && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              background: "var(--rose-bg)",
              border: "1px solid var(--rose-border)",
              color: "var(--rose)",
              fontSize: 13,
            }}
          >
            {err}
          </div>
        )}

        <button
          className="btn"
          type="submit"
          disabled={loading}
          style={{ width: "100%", marginTop: 22, height: 48, fontSize: 15 }}
        >
          {loading ? "Authenticating…" : "Enter service"} <ArrowRight size={16} />
        </button>

        <div style={{ margin: "26px 0 14px", borderTop: "1px solid var(--border-subtle)", position: "relative" }}>
          <span
            style={{
              position: "absolute",
              top: "-10px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#191410",
              padding: "0 12px",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
            }}
          >
            Or select role credential
          </span>
        </div>

        <div className="demo">
          {demos.map((d) => (
            <button
              type="button"
              key={d.email}
              onClick={() => {
                setEmail(d.email);
                setPassword("Demo@1234!");
              }}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong style={{ display: "block", fontSize: 13.5, color: "var(--text-main)" }}>
                  {d.role}
                </strong>
                <span className="mono muted" style={{ fontSize: 11.5 }}>
                  {d.email}
                </span>
              </div>
              <UserCircle2 size={18} color="var(--copper-light)" />
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}

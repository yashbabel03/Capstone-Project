import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

const demos = [
  ["Admin", "wendy.h@example.net"],
  ["Manager", "walt.e@example.net"],
  ["Chef", "ivan.p@example.net"],
  ["Staff", "zoe.m@example.net"],
];

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("zoe.m@example.net");
  const [password, setPassword] = useState("Demo@1234!");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await login(email, password);
      nav("/");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Login failed");
    }
  }

  return (
    <div className="login">
      <form className="card login-card" onSubmit={submit}>
        <small className="mono muted">EVIDENCE-GROUNDED OPS</small>
        <h1>Sign in to the pass</h1>
        <p className="muted">Cited procedures, incident memory, and manager verification. Not autonomous control.</p>
        <label>Email</label>
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div style={{ height: 10 }} />
        <label>Password</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <p className="err">{err}</p>}
        <div style={{ height: 14 }} />
        <button className="btn" type="submit">
          Enter service
        </button>
        <div className="demo">
          {demos.map(([role, mail]) => (
            <button
              type="button"
              key={mail}
              onClick={() => {
                setEmail(mail);
                setPassword("Demo@1234!");
              }}
            >
              <strong>{role}</strong>
              <div className="muted mono">{mail}</div>
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}

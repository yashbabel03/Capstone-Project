import { useEffect, useState } from "react";
import { api, type Role, type User } from "../lib/api";

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff" as Role,
    department: "kitchen",
  });
  const [msg, setMsg] = useState("");

  async function load() {
    setUsers((await api.users()).users);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <small className="mono muted">RBAC</small>
      <h2>People</h2>
      <form
        className="card grid"
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg("");
          try {
            await api.createUser(form);
            setForm({ name: "", email: "", password: "", role: "staff", department: "kitchen" });
            setMsg("Account created.");
            load();
          } catch (ex) {
            setMsg(ex instanceof Error ? ex.message : "Create failed");
          }
        }}
      >
        <strong>Invite staff</strong>
        <div className="grid grid-3">
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="input" placeholder="Password (8+)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            <option value="staff">staff</option>
            <option value="chef">chef</option>
            <option value="manager">manager</option>
            <option value="admin">admin</option>
          </select>
          <input className="input" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        </div>
        <button className="btn" type="submit">
          Create user
        </button>
        {msg && <p className="muted">{msg}</p>}
      </form>
      <div className="card" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Dept</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id || u.email}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.department}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

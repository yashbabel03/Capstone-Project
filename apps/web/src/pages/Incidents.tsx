import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Incident } from "../lib/api";

export function Incidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [form, setForm] = useState({ title: "", description: "", equipment: "WALK-IN-FZ-01", severity: "medium" });

  async function load() {
    setIncidents((await api.incidents()).incidents);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <small className="mono muted">REPORT → VERIFY → MEMORY</small>
      <h2>Incidents</h2>
      <form
        className="card grid"
        onSubmit={async (e) => {
          e.preventDefault();
          await api.createIncident(form);
          setForm({ ...form, title: "", description: "" });
          load();
        }}
      >
        <div className="grid grid-3">
          <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="input" placeholder="Equipment" value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} />
          <select className="input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            <option>low</option>
            <option>medium</option>
            <option>high</option>
            <option>critical</option>
          </select>
        </div>
        <textarea placeholder="What happened" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button className="btn">File incident</button>
      </form>
      <div className="card" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Title</th>
              <th>Equipment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((i) => (
              <tr key={i._id}>
                <td className="muted">{new Date(i.createdAt).toLocaleString()}</td>
                <td>
                  <Link to={`/incidents/${i._id}`}>{i.title}</Link>
                </td>
                <td className="mono">{i.equipment}</td>
                <td>
                  <span className="badge">{i.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

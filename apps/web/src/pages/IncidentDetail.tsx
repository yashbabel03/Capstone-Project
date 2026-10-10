import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type Incident, type User } from "../lib/api";
import { useAuth } from "../lib/auth";

export function IncidentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [people, setPeople] = useState<User[]>([]);
  const [assignee, setAssignee] = useState("");
  const [form, setForm] = useState({ cause: "", actionTaken: "", resolution: "" });

  async function load() {
    if (!id) return;
    const r = await api.incident(id);
    setIncident(r.incident);
    setForm({
      cause: r.incident.cause || "",
      actionTaken: r.incident.actionTaken || "",
      resolution: r.incident.resolution || "",
    });
  }
  useEffect(() => {
    load();
    api.directory().then((r) => setPeople(r.users)).catch(() => setPeople([]));
  }, [id]);

  if (!incident) return <p>Loading…</p>;
  const manager = user && ["manager", "admin"].includes(user.role);

  return (
    <div>
      <small className="mono muted">{incident.source}</small>
      <h2>{incident.title}</h2>
      <div className="row">
        <span className="badge danger">{incident.severity}</span>
        <span className="badge">{incident.status}</span>
        <span className="mono muted">{incident.equipment}</span>
      </div>
      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <div className="card">
          <h3>Situation</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{incident.description}</p>
          <h3>Organizational memory</h3>
          <label>Cause</label>
          <textarea value={form.cause} onChange={(e) => setForm({ ...form, cause: e.target.value })} />
          <label>Action taken</label>
          <textarea value={form.actionTaken} onChange={(e) => setForm({ ...form, actionTaken: e.target.value })} />
          <label>Resolution</label>
          <textarea value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} />
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn" onClick={async () => { await api.resolveIncident(incident._id, form); load(); }}>
              Mark resolved
            </button>
            {manager && incident.status === "resolved" && (
              <button className="btn ghost" onClick={async () => { await api.verifyIncident(incident._id); load(); }}>
                Manager verify
              </button>
            )}
          </div>
          {manager && (
            <div className="row" style={{ marginTop: 12 }}>
              <select className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">Assign to…</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
              <button
                className="btn ghost"
                type="button"
                disabled={!assignee}
                onClick={async () => {
                  await api.assignIncident(incident._id, assignee);
                  load();
                }}
              >
                Assign
              </button>
            </div>
          )}
        </div>
        <div className="card">
          <h3>Similar past incidents</h3>
          <p className="muted">References only — not a diagnosis.</p>
          {(incident.similarIncidentIds ?? []).length === 0 && <p>No indexed matches yet.</p>}
          {(incident.similarIncidentIds ?? []).map((s) => (
            <div key={s._id} className="source">
              <strong>{s.title}</strong>
              <div>
                {s.status} · {s.equipment}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

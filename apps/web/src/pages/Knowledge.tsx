import { useEffect, useState } from "react";
import { api, type Doc } from "../lib/api";
import { useAuth } from "../lib/auth";

export function Knowledge() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [q, setQ] = useState("");
  const canUpload = user && ["admin", "manager"].includes(user.role);

  async function load() {
    const r = await api.documents(q);
    setDocs(r.documents);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="row space">
        <div>
          <small className="mono muted">TRUSTED LIBRARY</small>
          <h2>Knowledge repository</h2>
        </div>
      </div>
      <div className="row" style={{ margin: "12px 0 18px" }}>
        <input className="input" style={{ maxWidth: 360 }} placeholder="Search title or code" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn ghost" onClick={load}>
          Filter
        </button>
      </div>
      {canUpload && <UploadForm onDone={load} />}
      <div className="card" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Title</th>
              <th>Type</th>
              <th>Version</th>
              <th>Roles</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d._id}>
                <td className="mono">{d.code}</td>
                <td>{d.title}</td>
                <td>{d.type}</td>
                <td>v{d.currentVersion}</td>
                <td>{d.applicableRoles.join(", ")}</td>
                <td>{d.reviewDate ? new Date(d.reviewDate).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UploadForm({ onDone }: { onDone: () => void }) {
  const [msg, setMsg] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setMsg("Uploading and ingesting…");
    try {
      await api.uploadDocument(form);
      setMsg("Published and indexed.");
      onDone();
    } catch (ex) {
      setMsg(ex instanceof Error ? ex.message : "Upload failed");
    }
  }
  return (
    <form className="card grid" onSubmit={submit}>
      <strong>New version / document (manager+)</strong>
      <div className="grid grid-3">
        <input className="input" name="title" placeholder="Title" required />
        <input className="input" name="code" placeholder="SOP-XX-000" required />
        <input className="input" name="version" placeholder="1.0" defaultValue="1.0" />
        <select className="input" name="type" defaultValue="sop">
          <option value="sop">SOP</option>
          <option value="food_safety">Food safety</option>
          <option value="allergen">Allergen</option>
          <option value="recipe">Recipe</option>
          <option value="equipment_manual">Equipment</option>
          <option value="training">Training</option>
        </select>
        <input className="input" name="reviewDate" type="date" />
        <input className="input" type="file" name="file" required />
      </div>
      <input className="input" name="applicableRoles" defaultValue='["staff","chef","manager","admin"]' />
      <button className="btn" type="submit">
        Ingest
      </button>
      {msg && <p className="muted">{msg}</p>}
    </form>
  );
}

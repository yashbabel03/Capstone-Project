import { useEffect, useState } from "react";
import { api, type Audit } from "../lib/api";

export function AuditPage() {
  const [logs, setLogs] = useState<Audit[]>([]);
  useEffect(() => {
    api.audit().then((r) => setLogs(r.logs));
  }, []);
  return (
    <div>
      <small className="mono muted">IMMUTABLE TRACE</small>
      <h2>Audit log</h2>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Resource</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l._id}>
                <td className="muted">{new Date(l.createdAt).toLocaleString()}</td>
                <td>{l.actorEmail}</td>
                <td className="mono">{l.action}</td>
                <td>{l.resource}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

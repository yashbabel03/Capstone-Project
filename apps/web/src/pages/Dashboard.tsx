import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Incident, type Sensor } from "../lib/api";
import { useAuth } from "../lib/auth";

export function Dashboard() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);

  useEffect(() => {
    api.incidents().then((r) => setIncidents(r.incidents));
    api.sensors().then((r) => setSensors(r.sensors));
  }, []);

  const open = incidents.filter((i) => !["verified", "closed"].includes(i.status));

  return (
    <div>
      <div className="row space">
        <div>
          <small className="mono muted">STATION BOARD</small>
          <h2>Good service, {user?.name.split(" ")[0]}</h2>
        </div>
        <Link className="btn" to="/assistant">
          Describe a situation
        </Link>
      </div>
      <div className="grid grid-4" style={{ marginTop: 18 }}>
        <div className="card kpi">
          <span>Open incidents</span>
          <b>{open.length}</b>
        </div>
        <div className="card kpi">
          <span>Sensors in alarm</span>
          <b>{sensors.filter((s) => s.status === "alarm").length}</b>
        </div>
        <div className="card kpi">
          <span>Your role</span>
          <b style={{ fontSize: 22 }}>{user?.role}</b>
        </div>
        <div className="card kpi">
          <span>Department</span>
          <b style={{ fontSize: 22 }}>{user?.department}</b>
        </div>
      </div>
      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <div className="card">
          <h3>Live queue</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Incident</th>
                <th>Severity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {incidents.slice(0, 8).map((i) => (
                <tr key={i._id}>
                  <td>
                    <Link to={`/incidents/${i._id}`}>{i.title}</Link>
                    <div className="muted">{i.equipment}</div>
                  </td>
                  <td>
                    <span className={`badge ${i.severity === "critical" || i.severity === "high" ? "danger" : "warn"}`}>
                      {i.severity}
                    </span>
                  </td>
                  <td>{i.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>Simulated probes</h3>
          <p className="muted">Not connected to physical hardware.</p>
          {sensors.map((s) => (
            <div key={s.sensorId} className="row space" style={{ padding: "10px 0", borderBottom: "1px solid #2c221a" }}>
              <div>
                <strong>{s.name}</strong>
                <div className="muted mono">{s.sensorId}</div>
              </div>
              <span className={`badge ${s.status === "ok" ? "sage" : "danger"}`}>
                {s.value}
                {s.unit} · {s.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowUpRight, CheckCircle2, Flame, ShieldAlert, Sparkles, ThermometerSnowflake } from "lucide-react";
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
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Station Greeting Header */}
      <div className="row space" style={{ alignItems: "flex-end" }}>
        <div>
          <div className="brand-badge">Station Control · Live Shift</div>
          <h2>Welcome to the pass, {user?.name.split(" ")[0]}</h2>
          <p className="muted" style={{ marginTop: 4, fontSize: 14 }}>
            Evidence-grounded operational guidance, incident tracking, and active temperature monitoring.
          </p>
        </div>
        <Link className="btn" to="/assistant">
          <Sparkles size={16} /> Consult Assistant
        </Link>
      </div>

      {/* KPI Cards with Staggered Entrance */}
      <div className="grid grid-4">
        <div className="card kpi">
          <div className="row space">
            <span>Open Incidents</span>
            <ShieldAlert size={18} color="var(--copper-light)" />
          </div>
          <b>{open.length}</b>
        </div>
        <div className="card kpi">
          <div className="row space">
            <span>Sensors in Alarm</span>
            <Flame size={18} color={sensors.some((s) => s.status === "alarm") ? "var(--rose)" : "var(--emerald)"} />
          </div>
          <b style={{ color: sensors.some((s) => s.status === "alarm") ? "var(--rose)" : "inherit" }}>
            {sensors.filter((s) => s.status === "alarm").length}
          </b>
        </div>
        <div className="card kpi">
          <div className="row space">
            <span>Your Clearance</span>
            <CheckCircle2 size={18} color="var(--emerald)" />
          </div>
          <b style={{ fontSize: 26, textTransform: "capitalize" }}>{user?.role}</b>
        </div>
        <div className="card kpi">
          <div className="row space">
            <span>Station / Dept</span>
            <ThermometerSnowflake size={18} color="var(--copper-light)" />
          </div>
          <b style={{ fontSize: 26, textTransform: "capitalize" }}>{user?.department}</b>
        </div>
      </div>

      {/* Active Incident Queue & Probes */}
      <div className="grid grid-2">
        <div className="card">
          <div className="row space" style={{ marginBottom: 16 }}>
            <div>
              <h3>Active Incident Queue</h3>
              <p className="muted" style={{ fontSize: 13 }}>Prioritized by severity & time logged</p>
            </div>
            <Link to="/incidents" className="btn ghost sm">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Incident & Equipment</th>
                <th>Severity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {incidents.slice(0, 6).map((i) => (
                <tr key={i._id}>
                  <td>
                    <Link to={`/incidents/${i._id}`} style={{ fontWeight: 600, color: "var(--text-main)" }}>
                      {i.title}
                    </Link>
                    <div className="muted mono" style={{ fontSize: 12, marginTop: 2 }}>{i.equipment}</div>
                  </td>
                  <td>
                    <span className={`badge ${i.severity === "critical" || i.severity === "high" ? "danger" : "warn"}`}>
                      {i.severity}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${i.status === "verified" ? "sage" : "warn"}`}>
                      {i.status}
                    </span>
                  </td>
                </tr>
              ))}
              {incidents.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: "28px 0", color: "var(--text-muted)" }}>
                    No active incidents reported. Station is clear.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="row space" style={{ marginBottom: 16 }}>
            <div>
              <h3>Telemetry & Probes</h3>
              <p className="muted" style={{ fontSize: 13 }}>Live continuous HACCP readings</p>
            </div>
            <Link to="/iot" className="btn ghost sm">
              Simulate <ArrowUpRight size={14} />
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sensors.map((s) => (
              <div
                key={s.sensorId}
                className="row space"
                style={{
                  padding: "14px 16px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <strong style={{ fontSize: 14.5 }}>{s.name}</strong>
                  <div className="muted mono" style={{ fontSize: 12, marginTop: 2 }}>
                    {s.location} · {s.sensorId}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className={`badge ${s.status === "ok" ? "sage" : "danger"}`}>
                    {s.value}
                    {s.unit} · {s.status.toUpperCase()}
                  </span>
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                    Safe: {s.minSafe}° to {s.maxSafe}°
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

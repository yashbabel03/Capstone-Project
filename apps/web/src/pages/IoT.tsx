import { useEffect, useState } from "react";
import { api, type Sensor } from "../lib/api";
import { useAuth } from "../lib/auth";

export function IoT() {
  const { user } = useAuth();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [value, setValue] = useState(-9);
  const manager = user && ["manager", "admin"].includes(user.role);

  async function load() {
    setSensors((await api.sensors()).sensors);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <small className="mono muted">SIMULATION ONLY</small>
      <h2>Temperature sensors</h2>
      <p className="muted">This project does not connect to physical probes. Use the slider to demonstrate an excursion that can open an incident.</p>
      <div className="grid grid-2">
        <div className="card">
          {sensors.map((s) => (
            <div key={s.sensorId} className="row space" style={{ padding: "12px 0", borderBottom: "1px solid #2c221a" }}>
              <div>
                <strong>{s.name}</strong>
                <div className="muted">
                  {s.location} · safe {s.minSafe}–{s.maxSafe}
                  {s.unit}
                </div>
              </div>
              <span className={`badge ${s.status === "ok" ? "sage" : "danger"}`}>
                {s.value}
                {s.unit}
              </span>
            </div>
          ))}
        </div>
        {manager && (
          <form
            className="card"
            onSubmit={async (e) => {
              e.preventDefault();
              await api.simulate("WALK-IN-FZ-01", value);
              load();
            }}
          >
            <h3>Force walk-in freezer reading</h3>
            <input className="input" type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} />
            <p className="muted">Values warmer than -15°C (maxSafe + 3) create a simulated alarm incident.</p>
            <button className="btn">Push reading</button>
          </form>
        )}
      </div>
    </div>
  );
}

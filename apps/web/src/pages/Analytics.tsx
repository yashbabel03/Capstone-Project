import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, type Analytics } from "../lib/api";

export function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  useEffect(() => {
    api.analytics().then(setData);
  }, []);
  if (!data) return <p>Loading intelligence…</p>;
  return (
    <div>
      <small className="mono muted">OPERATIONS INTELLIGENCE</small>
      <h2>Gaps, recurrence, currency</h2>
      <div className="grid grid-4" style={{ marginTop: 16 }}>
        {Object.entries(data.kpis).map(([k, v]) => (
          <div className="card kpi" key={k}>
            <span>{k}</span>
            <b>{v}</b>
          </div>
        ))}
      </div>
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Recurring equipment</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={data.recurring}>
                <XAxis dataKey="equipment" stroke="#b9a894" />
                <YAxis stroke="#b9a894" />
                <Tooltip />
                <Bar dataKey="count" fill="#d4783c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3>Outdated documents</h3>
          {data.outdated.length === 0 && <p className="muted">All published docs are inside review window.</p>}
          {data.outdated.map((d) => (
            <div key={d._id} className="source">
              {d.code} · {d.title} · review {d.reviewDate ? new Date(d.reviewDate).toLocaleDateString() : ""}
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Knowledge gaps (low-confidence or escalated queries)</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Query</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {data.knowledgeGaps.map((g, i) => (
              <tr key={i}>
                <td>{g.query}</td>
                <td>{(g.confidence * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Send, User as UserIcon, ShieldAlert, BookOpen, AlertTriangle, Sparkles, CornerDownLeft } from "lucide-react";
import { api, type AssistantResponse } from "../lib/api";

type Turn = { id: number; role: "user" | "bot"; text: string; data?: AssistantResponse };

const SUGGESTIONS = [
  "Walk-in freezer is at -9°C for about 25 minutes, door was closed. What do I do?",
  "How do I change and safely dispose of fryer oil?",
  "A guest has a peanut allergy and prep touched peanut utensils. What are the steps?",
  "What are the mandatory kitchen closing checklist items?",
];

export function Assistant() {
  const nav = useNavigate();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const idRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setErr("");
    setInput("");
    const history = turns.map((t) => ({ role: t.role, content: t.text }));
    setTurns((t) => [...t, { id: idRef.current++, role: "user", text: q }]);
    setBusy(true);
    try {
      const data = await api.query(q, history);
      setTurns((t) => [...t, { id: idRef.current++, role: "bot", text: data.answer, data }]);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Query failed");
      setTurns((t) => [
        ...t,
        { id: idRef.current++, role: "bot", text: "Sorry — I couldn't reach the retrieval service. Check connection." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function openIncident(turn: Turn) {
    const question = [...turns].reverse().find((x) => x.role === "user" && x.id < turn.id);
    return async () => {
      const created = await api.createIncident({
        title: (question?.text ?? turn.text).slice(0, 80),
        description: `${question?.text ?? ""}\n\nAssistant Guidance:\n${turn.text}`,
        equipment: "WALK-IN-FZ-01",
        severity: turn.data?.escalate ? "high" : "medium",
        source: "assistant",
      });
      nav(`/incidents/${created.incident._id}`);
    };
  }

  return (
    <div className="chatbot">
      <div className="chatbot-head">
        <div>
          <div className="brand-badge">RAG Copilot · Grounded Knowledge</div>
          <h2>Kitchen Operations Assistant</h2>
        </div>
        <span className="badge sage">
          <Sparkles size={14} /> Groq LLM Active
        </span>
      </div>

      <div className="chat-scroll">
        {turns.length === 0 && (
          <div className="chat-intro">
            <p className="muted" style={{ fontSize: 14.5 }}>
              Describe a situation in plain, natural language. The assistant retrieves current standard operating
              procedures (SOPs), verifies evidence, and explicitly flags when escalation to management is required.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", fontWeight: 600 }}>
                Suggested inquiries
              </span>
              <div className="row">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="chip" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {turns.map((t) => (
          <div key={t.id} className={`msg ${t.role}`}>
            <div className="avatar">
              {t.role === "user" ? <UserIcon size={17} /> : <Bot size={17} />}
            </div>
            <div className="msg-body">
              <div className="bubble">{t.text}</div>

              {t.data && (
                <div className="msg-meta">
                  <span className={`badge ${t.data.escalate ? "danger" : "sage"}`}>
                    Confidence {(t.data.confidence * 100).toFixed(0)}%
                  </span>
                  {t.data.escalate && (
                    <span className="badge warn">
                      <AlertTriangle size={13} /> Escalate to Manager
                    </span>
                  )}
                  <button className="btn ghost sm" onClick={openIncident(t)}>
                    <ShieldAlert size={13} /> Open Incident Ticket
                  </button>
                </div>
              )}

              {t.data?.sources?.length ? (
                <details className="sources">
                  <summary className="row" style={{ gap: 6, display: "inline-flex" }}>
                    <BookOpen size={14} /> {t.data.sources.length} Cited SOP Reference(s)
                  </summary>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                    {t.data.sources.map((s, i) => (
                      <div className="source" key={i}>
                        <div className="row space">
                          <strong style={{ color: "var(--copper-light)" }}>
                            {s.code} v{s.version}
                          </strong>
                          <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            Match {((s.score || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div style={{ fontSize: 12.5, color: "var(--text-sub)", marginTop: 2 }}>{s.section}</div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 4, fontStyle: "italic" }}>
                          "{s.excerpt}"
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}

              {t.data?.similar_incidents?.length ? (
                <details className="sources">
                  <summary>
                    {t.data.similar_incidents.length} Similar Past Incident(s) — Reference only
                  </summary>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                    {t.data.similar_incidents.map((s) => (
                      <div className="source" key={s.incident_id}>
                        <strong style={{ color: "var(--text-main)" }}>{s.title}</strong>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Equipment: {s.equipment} · Relevance: {((s.score || 0) * 100).toFixed(0)}%
                        </div>
                        <div style={{ fontSize: 12, marginTop: 2 }}>{s.excerpt}</div>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          </div>
        ))}

        {busy && (
          <div className="msg bot">
            <div className="avatar">
              <Bot size={17} />
            </div>
            <div className="bubble typing" style={{ padding: "14px 20px" }}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {err && (
        <div
          style={{
            margin: "0 0 10px",
            padding: "8px 14px",
            background: "var(--rose-bg)",
            color: "var(--rose)",
            borderRadius: "var(--radius-sm)",
            fontSize: 13,
          }}
        >
          {err}
        </div>
      )}

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          value={input}
          placeholder="Describe any station anomaly or procedure question… (Press Enter to send)"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button className="btn" disabled={busy || !input.trim()}>
          <Send size={16} /> Send
        </button>
      </form>
      <p className="muted chat-foot">
        Evidence-grounded operational guidance. Does not replace certified food-safety protocols.
      </p>
    </div>
  );
}

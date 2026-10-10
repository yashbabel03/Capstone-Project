import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Send, User as UserIcon } from "lucide-react";
import { api, type AssistantResponse } from "../lib/api";

type Turn = { id: number; role: "user" | "bot"; text: string; data?: AssistantResponse };

const SUGGESTIONS = [
  "Walk-in freezer is at -9C for about 25 minutes, door was closed. What do I do?",
  "How do I change and dispose of fryer oil?",
  "A guest has a peanut allergy and food touched a surface with peanuts. What are the steps?",
  "What are the kitchen closing checklist items?",
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
        { id: idRef.current++, role: "bot", text: "Sorry — I couldn't reach the retrieval service. Try again." },
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
        description: `${question?.text ?? ""}\n\nAssistant:\n${turn.text}`,
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
          <small className="mono muted">PERMISSION-AWARE CHAT</small>
          <h2>Operations assistant</h2>
        </div>
        <span className="badge sage">
          <Bot size={14} /> grounded
        </span>
      </div>

      <div className="chat-scroll">
        {turns.length === 0 && (
          <div className="chat-intro">
            <p className="muted">
              Ask about a situation in plain language. Every answer cites the document, version, and section — and
              escalates when the evidence is thin instead of guessing.
            </p>
            <div className="row">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t) => (
          <div key={t.id} className={`msg ${t.role}`}>
            <div className="avatar">{t.role === "user" ? <UserIcon size={15} /> : <Bot size={15} />}</div>
            <div className="msg-body">
              <div className="bubble">{t.text}</div>
              {t.data && (
                <div className="msg-meta">
                  <span className={`badge ${t.data.escalate ? "danger" : "sage"}`}>
                    confidence {(t.data.confidence * 100).toFixed(0)}%
                  </span>
                  {t.data.escalate && <span className="badge warn">escalate</span>}
                  <button className="btn ghost sm" onClick={openIncident(t)}>
                    Open incident
                  </button>
                </div>
              )}
              {t.data?.sources?.length ? (
                <details className="sources">
                  <summary>{t.data.sources.length} cited source(s)</summary>
                  {t.data.sources.map((s, i) => (
                    <div className="source" key={i}>
                      <strong>
                        {s.code} v{s.version}
                      </strong>{" "}
                      · {s.section}
                      <div>{s.excerpt}</div>
                    </div>
                  ))}
                </details>
              ) : null}
              {t.data?.similar_incidents?.length ? (
                <details className="sources">
                  <summary>{t.data.similar_incidents.length} similar incident(s) — references only</summary>
                  {t.data.similar_incidents.map((s) => (
                    <div className="source" key={s.incident_id}>
                      <strong>{s.title}</strong>
                      <div>
                        {s.equipment} · score {(s.score * 100).toFixed(0)}%
                      </div>
                      <div>{s.excerpt}</div>
                    </div>
                  ))}
                </details>
              ) : null}
            </div>
          </div>
        ))}

        {busy && (
          <div className="msg bot">
            <div className="avatar">
              <Bot size={15} />
            </div>
            <div className="bubble typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {err && <p className="err">{err}</p>}

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          value={input}
          placeholder="Describe the situation…  (Enter to send · Shift+Enter for a new line)"
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
      <p className="muted chat-foot">Decision support only. Not a food-safety guarantee.</p>
    </div>
  );
}

import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../ui.jsx";

export default function PollsTab() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setPolls(await api.get("/polls"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h2 className="section-title">Lunch polls</h2>
      <p className="section-sub">Vote with your student ID. One vote per poll.</p>
      {loading ? (
        <p className="muted">Loading polls…</p>
      ) : polls.length === 0 ? (
        <div className="empty-state">
          <div className="big">🗳️</div>
          No polls right now. Check back later!
        </div>
      ) : (
        <div className="grid grid-2">
          {polls.map((p) => (
            <PollCard key={p.id} poll={p} onVoted={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function PollCard({ poll, onVoted }) {
  const toast = useToast();
  const [optionId, setOptionId] = useState(null);
  const [studentId, setStudentId] = useState("");
  const [showResults, setShowResults] = useState(poll.isClosed);
  const [busy, setBusy] = useState(false);

  const total = poll.totalVotes || 0;

  const vote = async () => {
    if (!optionId) return toast("Select an option first", "error");
    if (!studentId.trim()) return toast("Enter your student ID", "error");
    setBusy(true);
    try {
      await api.post(`/polls/${poll.id}/vote`, { studentId, optionId });
      toast("Vote counted. Thanks!");
      setShowResults(true);
      onVoted();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card stack">
      <div className="spread">
        <h3 style={{ margin: 0 }}>{poll.question}</h3>
        {poll.isClosed ? (
          <span className="pill warn">Closed</span>
        ) : (
          <span className="pill green">Open</span>
        )}
      </div>
      {poll.deadline && (
        <div className="muted" style={{ fontSize: 13 }}>
          {poll.isClosed ? "Closed on " : "Voting closes "} {poll.deadline}
        </div>
      )}

      {showResults ? (
        <div className="stack">
          {poll.options.map((o) => {
            const pct = total ? Math.round((o.votes / total) * 100) : 0;
            return (
              <div key={o.id}>
                <div className="spread" style={{ fontSize: 14, marginBottom: 4 }}>
                  <span>{o.text}</span>
                  <span className="muted">{o.votes} · {pct}%</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          <div className="muted" style={{ fontSize: 13 }}>{total} total vote{total === 1 ? "" : "s"}</div>
          {!poll.isClosed && (
            <button className="btn-ghost" onClick={() => setShowResults(false)}>← Back to voting</button>
          )}
        </div>
      ) : (
        <div className="stack">
          {poll.options.map((o) => (
            <label
              key={o.id}
              className="row"
              style={{
                cursor: "pointer",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: optionId === o.id ? "rgba(52,211,153,0.12)" : "transparent",
              }}
            >
              <input
                type="radio"
                name={`poll-${poll.id}`}
                style={{ width: "auto" }}
                checked={optionId === o.id}
                onChange={() => setOptionId(o.id)}
              />
              <span>{o.text}</span>
            </label>
          ))}
          <input
            placeholder="Your student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />
          <div className="row" style={{ gap: 8 }}>
            <button className="btn-primary" onClick={vote} disabled={busy}>
              {busy ? "Submitting…" : "Submit vote"}
            </button>
            <button className="btn-ghost" onClick={() => setShowResults(true)}>View results</button>
          </div>
        </div>
      )}
    </div>
  );
}

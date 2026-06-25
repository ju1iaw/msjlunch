import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Modal, useToast } from "../ui.jsx";

export default function AdminPolls() {
  const toast = useToast();
  const [polls, setPolls] = useState([]);
  const [creating, setCreating] = useState(false);

  const load = async () => setPolls(await api.get("/polls"));
  useEffect(() => {
    load();
  }, []);

  const remove = async (poll) => {
    if (!confirm(`Delete poll "${poll.question}" and all its votes?`)) return;
    try {
      await api.del(`/polls/${poll.id}`, { admin: true });
      toast("Poll deleted");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  return (
    <div>
      <div className="spread" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="section-title">Polls</h2>
          <p className="section-sub">Create polls with a deadline and view live results.</p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>+ New poll</button>
      </div>

      {polls.length === 0 ? (
        <div className="empty-state"><div className="big">🗳️</div>No polls yet.</div>
      ) : (
        <div className="grid grid-2">
          {polls.map((p) => (
            <div key={p.id} className="card stack">
              <div className="spread">
                <h3 style={{ margin: 0 }}>{p.question}</h3>
                <span className={`pill ${p.isClosed ? "warn" : "green"}`}>{p.isClosed ? "Closed" : "Open"}</span>
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                {p.deadline ? `Deadline: ${p.deadline}` : "No deadline"} · {p.totalVotes} vote{p.totalVotes === 1 ? "" : "s"}
              </div>
              <div className="stack" style={{ gap: 10 }}>
                {p.options.map((o) => {
                  const pct = p.totalVotes ? Math.round((o.votes / p.totalVotes) * 100) : 0;
                  return (
                    <div key={o.id}>
                      <div className="spread" style={{ fontSize: 14, marginBottom: 4 }}>
                        <span>{o.text}</span>
                        <span className="muted">{o.votes} · {pct}%</span>
                      </div>
                      <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
              <button className="btn-danger" onClick={() => remove(p)} style={{ alignSelf: "flex-start" }}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <PollForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function PollForm({ onClose, onSaved }) {
  const toast = useToast();
  const [question, setQuestion] = useState("");
  const [deadline, setDeadline] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [busy, setBusy] = useState(false);

  const setOpt = (i, v) => setOptions(options.map((o, idx) => (idx === i ? v : o)));
  const addOpt = () => setOptions([...options, ""]);
  const removeOpt = (i) => setOptions(options.filter((_, idx) => idx !== i));

  const save = async (e) => {
    e.preventDefault();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim()) return toast("Question is required", "error");
    if (opts.length < 2) return toast("Add at least two options", "error");
    setBusy(true);
    try {
      await api.post("/polls", { question, deadline: deadline || null, options: opts }, { admin: true });
      toast("Poll created");
      onSaved();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="New poll" onClose={onClose}>
      <form onSubmit={save}>
        <div className="field">
          <label>Question *</label>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Which dessert should we add?" />
        </div>
        <div className="field">
          <label>Deadline (optional)</label>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <label>Options</label>
        <div className="stack" style={{ marginBottom: 14 }}>
          {options.map((o, i) => (
            <div key={i} className="row" style={{ gap: 8 }}>
              <input value={o} onChange={(e) => setOpt(i, e.target.value)} placeholder={`Option ${i + 1}`} />
              {options.length > 2 && (
                <button type="button" className="btn-danger" onClick={() => removeOpt(i)}>✕</button>
              )}
            </div>
          ))}
        </div>
        <button type="button" className="btn-secondary" onClick={addOpt} style={{ marginBottom: 16 }}>+ Add option</button>
        <button className="btn-primary" style={{ width: "100%" }} disabled={busy}>
          {busy ? "Creating…" : "Create poll"}
        </button>
      </form>
    </Modal>
  );
}

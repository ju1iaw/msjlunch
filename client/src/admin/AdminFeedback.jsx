import { useEffect, useState } from "react";
import { api } from "../api.js";
import { StarRating, useToast } from "../ui.jsx";

export default function AdminFeedback() {
  const [mode, setMode] = useState("dish");

  return (
    <div>
      <h2 className="section-title">Feedback</h2>
      <p className="section-sub">Review dish ratings by category and read general feedback.</p>

      <div className="tabs" style={{ maxWidth: 460, marginBottom: 22 }}>
        <div className={`tab ${mode === "dish" ? "active" : ""}`} onClick={() => setMode("dish")}>🍽️ Dish ratings</div>
        <div className={`tab ${mode === "general" ? "active" : ""}`} onClick={() => setMode("general")}>✍️ General</div>
      </div>

      {mode === "dish" ? <DishFeedback /> : <GeneralFeedback />}
    </div>
  );
}

function DishFeedback() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState({});

  useEffect(() => {
    api.get("/items").then(setItems);
  }, []);

  const toggle = async (id) => {
    if (open[id]) {
      setOpen({ ...open, [id]: null });
      return;
    }
    const summary = await api.get(`/feedback/dish/${id}`);
    setOpen({ ...open, [id]: summary });
  };

  return (
    <div className="stack">
      {items.map((it) => (
        <div key={it.id} className="card">
          <div className="spread" style={{ cursor: "pointer" }} onClick={() => toggle(it.id)}>
            <div className="row" style={{ gap: 12 }}>
              <strong>{it.name}</strong>
              <span className="pill green">♥ {it.favoriteCount}</span>
            </div>
            <span className="link">{open[it.id] ? "Hide" : "View ratings"}</span>
          </div>
          {open[it.id] && (
            <div className="stack" style={{ marginTop: 14 }}>
              {Object.entries(open[it.id]).map(([cat, agg]) => (
                <div key={cat} className="spread">
                  <span>{cat}</span>
                  <div className="row" style={{ gap: 10 }}>
                    {agg.count > 0 ? (
                      <>
                        <StarRating value={Math.round(agg.avg)} readOnly onChange={() => {}} />
                        <span className="muted">{agg.avg} ({agg.count})</span>
                      </>
                    ) : (
                      <span className="muted">No ratings yet</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function GeneralFeedback() {
  const toast = useToast();
  const [list, setList] = useState([]);

  useEffect(() => {
    api.get("/feedback/general", { admin: true }).then(setList).catch((e) => toast(e.message, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (list.length === 0) return <div className="empty-state">No general feedback yet.</div>;

  return (
    <div className="stack">
      {list.map((f) => (
        <div key={f.id} className="card">
          <p style={{ margin: 0, lineHeight: 1.5 }}>{f.body}</p>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>{f.created_at}</div>
        </div>
      ))}
    </div>
  );
}

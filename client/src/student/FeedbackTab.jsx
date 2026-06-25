import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../ui.jsx";
import { DishCard, DishModal } from "./DishViews.jsx";

export default function FeedbackTab({ me, requireLogin }) {
  const [mode, setMode] = useState("dish");

  return (
    <div>
      <h2 className="section-title">Share your feedback</h2>
      <p className="section-sub">Rate specific dishes or drop a general note for the kitchen.</p>

      <div className="tabs" style={{ maxWidth: 460, marginBottom: 22 }}>
        <div className={`tab ${mode === "dish" ? "active" : ""}`} onClick={() => setMode("dish")}>
          🍽️ Rate a dish
        </div>
        <div className={`tab ${mode === "general" ? "active" : ""}`} onClick={() => setMode("general")}>
          ✍️ General feedback
        </div>
      </div>

      {mode === "dish" ? <DishFeedback me={me} requireLogin={requireLogin} /> : <GeneralFeedback />}
    </div>
  );
}

function DishFeedback({ me, requireLogin }) {
  const [items, setItems] = useState([]);
  const [openItem, setOpenItem] = useState(null);

  const load = async () => setItems(await api.get("/items"));
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <p className="muted" style={{ fontSize: 13 }}>
        Pick a dish to rate it on taste, portion size, freshness and presentation.
      </p>
      <div className="grid grid-3">
        {items.map((it) => (
          <DishCard
            key={it.id}
            item={it}
            me={me}
            requireLogin={requireLogin}
            onOpen={() => setOpenItem(it.id)}
            onChanged={load}
          />
        ))}
      </div>
      {openItem && (
        <DishModal
          itemId={openItem}
          me={me}
          requireLogin={requireLogin}
          onClose={() => setOpenItem(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function GeneralFeedback() {
  const toast = useToast();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!body.trim()) return toast("Write something first", "error");
    setBusy(true);
    try {
      await api.post("/feedback/general", { body });
      setBody("");
      toast("Thanks! Your feedback was submitted.");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <label>Your feedback</label>
      <textarea
        rows={6}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Tell us what you think about the lunch program…"
      />
      <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        General feedback is anonymous and read periodically. For faster impact, rate specific dishes.
      </p>
      <button className="btn-primary" onClick={submit} disabled={busy} style={{ marginTop: 8 }}>
        {busy ? "Submitting…" : "Submit feedback"}
      </button>
    </div>
  );
}

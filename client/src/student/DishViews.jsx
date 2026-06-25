import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Avatar, Modal, StarRating, useToast } from "../ui.jsx";

function Allergens({ value }) {
  const list = (value || "").split(",").map((s) => s.trim()).filter(Boolean).filter((s) => s.toLowerCase() !== "none");
  if (list.length === 0) return <span className="pill green">No listed allergens</span>;
  return (
    <div className="tag-list">
      {list.map((a) => (
        <span key={a} className="pill allergen">⚠ {a}</span>
      ))}
    </div>
  );
}

export function DishCard({ item, me, requireLogin, onChanged, onOpen }) {
  const toast = useToast();
  const [fav, setFav] = useState(item.isFavorite);
  const [count, setCount] = useState(item.favoriteCount ?? 0);

  useEffect(() => {
    setFav(item.isFavorite);
    setCount(item.favoriteCount ?? 0);
  }, [item.isFavorite, item.favoriteCount]);

  const toggleFav = async (e) => {
    e.stopPropagation();
    if (!me) return requireLogin();
    try {
      const r = await api.post(`/favorites/${item.id}`);
      setFav(r.isFavorite);
      setCount(r.favoriteCount);
      toast(r.isFavorite ? `Added ${item.name} to favorites` : "Removed from favorites");
      onChanged && onChanged();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  return (
    <div className="card dish-card" onClick={() => onOpen(item)} style={{ cursor: "pointer" }}>
      <Avatar item={item} />
      <div className="dish-body">
        <div className="spread">
          <span className="dish-name">{item.name}</span>
          <button className={`heart ${fav ? "on" : ""}`} onClick={toggleFav} title="Favorite">
            {fav ? "♥" : "♡"}
          </button>
        </div>
        {item.description && <div className="dish-desc">{item.description}</div>}
        <div style={{ marginTop: 4 }}>
          <Allergens value={item.allergens} />
        </div>
        <div className="dish-row">
          <span className="pill">♥ {count} favorite{count === 1 ? "" : "s"}</span>
          <span className="link">Details →</span>
        </div>
      </div>
    </div>
  );
}

export function DishModal({ itemId, me, requireLogin, onClose, onChanged }) {
  const toast = useToast();
  const [item, setItem] = useState(null);
  const [categories, setCategories] = useState([]);
  const [ratings, setRatings] = useState({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [it, cats] = await Promise.all([
      api.get(`/items/${itemId}`),
      api.get("/feedback/categories"),
    ]);
    setItem(it);
    setCategories(cats);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  const toggleFav = async () => {
    if (!me) return requireLogin();
    try {
      const r = await api.post(`/favorites/${item.id}`);
      setItem({ ...item, isFavorite: r.isFavorite, favoriteCount: r.favoriteCount });
      onChanged && onChanged();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const submitFeedback = async () => {
    if (Object.keys(ratings).length === 0) return toast("Pick a rating first", "error");
    setBusy(true);
    try {
      const r = await api.post("/feedback/dish", { itemId: item.id, ratings });
      setItem({ ...item, feedback: r.summary });
      setRatings({});
      toast("Thanks for your feedback!");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (!item) {
    return (
      <Modal title="Loading…" onClose={onClose}>
        <p className="muted">Loading dish…</p>
      </Modal>
    );
  }

  const ingredients = (item.ingredients || "").split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <Modal title={item.name} onClose={onClose} wide>
      <Avatar item={item} />
      <div className="spread" style={{ marginTop: 16 }}>
        <span className="pill">♥ {item.favoriteCount} favorite{item.favoriteCount === 1 ? "" : "s"}</span>
        <button className={`btn-secondary ${item.isFavorite ? "" : ""}`} onClick={toggleFav}>
          {item.isFavorite ? "♥ Favorited" : "♡ Add to favorites"}
        </button>
      </div>

      {item.description && <p style={{ lineHeight: 1.5 }}>{item.description}</p>}

      <div className="divider" />
      <label>Ingredients</label>
      {ingredients.length ? (
        <div className="tag-list">
          {ingredients.map((i) => (
            <span key={i} className="pill">{i}</span>
          ))}
        </div>
      ) : (
        <span className="muted">Not listed</span>
      )}

      <div style={{ marginTop: 16 }}>
        <label>Allergens</label>
        <Allergens value={item.allergens} />
      </div>

      <div className="divider" />
      <h4 style={{ margin: "0 0 4px" }}>Rate this dish</h4>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Help the kitchen improve by rating each category (1–5 stars).
      </p>
      <div className="stack">
        {categories.map((cat) => {
          const agg = item.feedback?.[cat];
          return (
            <div key={cat} className="spread">
              <div>
                <div style={{ fontWeight: 600 }}>{cat}</div>
                {agg && agg.count > 0 && (
                  <div className="muted" style={{ fontSize: 12 }}>
                    Avg {agg.avg} ★ ({agg.count} rating{agg.count === 1 ? "" : "s"})
                  </div>
                )}
              </div>
              <StarRating value={ratings[cat] || 0} onChange={(n) => setRatings({ ...ratings, [cat]: n })} />
            </div>
          );
        })}
      </div>
      <button className="btn-primary" style={{ marginTop: 16, width: "100%" }} onClick={submitFeedback} disabled={busy}>
        {busy ? "Submitting…" : "Submit feedback"}
      </button>
    </Modal>
  );
}

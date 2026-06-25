import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../ui.jsx";
import { DishCard, DishModal } from "./DishViews.jsx";

export default function ProfileTab({ me, notifs, reloadNotifs, onBack, requireLogin }) {
  const toast = useToast();
  const [favorites, setFavorites] = useState([]);
  const [openItem, setOpenItem] = useState(null);

  const loadFavs = async () => {
    if (!me) return;
    try {
      setFavorites(await api.get("/favorites"));
    } catch (err) {
      toast(err.message, "error");
    }
  };

  useEffect(() => {
    loadFavs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  // Mark notifications read when viewing profile
  useEffect(() => {
    if (me && notifs.some((n) => !n.is_read)) {
      api.post("/notifications/read").then(reloadNotifs).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  if (!me) {
    return (
      <div className="empty-state">
        <div className="big">👤</div>
        <p>Log in to view your favorites and notifications.</p>
        <button className="btn-primary" onClick={requireLogin}>Log in</button>
      </div>
    );
  }

  return (
    <div>
      <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 8 }}>← Back to menu</button>
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="row" style={{ gap: 14 }}>
          <div className="brand-mark" style={{ width: 52, height: 52, fontSize: 24 }}>👤</div>
          <div>
            <h2 style={{ margin: 0 }}>{me.contact}</h2>
            <p className="muted" style={{ margin: 0 }}>
              Signed in via {me.contactType} · {favorites.length} favorite{favorites.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: 4 }}>🔔 Notifications</h3>
      <p className="section-sub">We'll let you know when your favorites are on an upcoming menu.</p>
      {notifs.length === 0 ? (
        <div className="empty-state">No notifications yet. Favorite some dishes to get alerts!</div>
      ) : (
        <div className="stack" style={{ marginBottom: 28 }}>
          {notifs.map((n) => (
            <div key={n.id} className="card row" style={{ gap: 12, padding: 14 }}>
              <span style={{ fontSize: 22 }}>🍴</span>
              <div>
                <div style={{ fontWeight: 600 }}>{n.body}</div>
                <div className="muted" style={{ fontSize: 12 }}>{n.created_at}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ marginBottom: 4 }}>♥ Your favorite dishes</h3>
      <p className="section-sub">Tap a dish to view details or remove it.</p>
      {favorites.length === 0 ? (
        <div className="empty-state">
          <div className="big">♡</div>
          No favorites yet. Tap the heart on any dish to save it here.
        </div>
      ) : (
        <div className="grid grid-3">
          {favorites.map((it) => (
            <DishCard
              key={it.id}
              item={it}
              me={me}
              requireLogin={requireLogin}
              onOpen={() => setOpenItem(it.id)}
              onChanged={loadFavs}
            />
          ))}
        </div>
      )}

      {openItem && (
        <DishModal
          itemId={openItem}
          me={me}
          requireLogin={requireLogin}
          onClose={() => setOpenItem(null)}
          onChanged={loadFavs}
        />
      )}
    </div>
  );
}

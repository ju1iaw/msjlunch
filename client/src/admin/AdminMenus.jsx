import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Modal, fmtDate, useToast } from "../ui.jsx";

export default function AdminMenus() {
  const toast = useToast();
  const [menus, setMenus] = useState([]);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const [m, it] = await Promise.all([api.get("/menus"), api.get("/items")]);
    setMenus(m);
    setItems(it);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (menu) => {
    if (!confirm(`Delete the menu for ${menu.date}?`)) return;
    try {
      await api.del(`/menus/${menu.id}`, { admin: true });
      toast("Menu deleted");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  return (
    <div>
      <div className="spread" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="section-title">Daily menus</h2>
          <p className="section-sub">Pick a date and choose which dishes are served. Favoriting students get notified.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({})} disabled={items.length === 0}>
          + New menu
        </button>
      </div>

      {items.length === 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <span className="muted">Create some dishes first, then you can build menus.</span>
        </div>
      )}

      {menus.length === 0 ? (
        <div className="empty-state"><div className="big">📅</div>No menus yet.</div>
      ) : (
        <div className="grid grid-2">
          {menus.map((m) => (
            <div key={m.id} className="card stack">
              <div className="spread">
                <h3 style={{ margin: 0 }}>{fmtDate(m.date)}</h3>
                <span className="pill">{m.items.length} dishes</span>
              </div>
              <div className="tag-list">
                {m.items.map((it) => (
                  <span key={it.id} className="pill">{it.name}</span>
                ))}
                {m.items.length === 0 && <span className="muted">No dishes</span>}
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn-secondary" onClick={() => setEditing(m)}>Edit</button>
                <button className="btn-danger" onClick={() => remove(m)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <MenuForm
          menu={editing.id ? editing : null}
          allItems={items}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function MenuForm({ menu, allItems, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!menu;
  const [date, setDate] = useState(menu?.date || new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState(new Set(menu?.items.map((i) => i.id) || []));
  const [busy, setBusy] = useState(false);

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!date) return toast("Pick a date", "error");
    setBusy(true);
    try {
      const payload = { date, itemIds: [...selected] };
      if (isEdit) await api.put(`/menus/${menu.id}`, payload, { admin: true });
      else await api.post("/menus", payload, { admin: true });
      toast(isEdit ? "Menu updated" : "Menu created");
      onSaved();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit menu" : "New menu"} onClose={onClose} wide>
      <form onSubmit={save}>
        <div className="field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={isEdit} />
          {isEdit && <p className="muted" style={{ fontSize: 12 }}>Date can't be changed when editing.</p>}
        </div>
        <label>Dishes on this day ({selected.size} selected)</label>
        <div className="grid grid-2" style={{ marginTop: 8 }}>
          {allItems.map((it) => {
            const on = selected.has(it.id);
            return (
              <label
                key={it.id}
                className="row"
                style={{
                  cursor: "pointer",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: on ? "rgba(52,211,153,0.12)" : "transparent",
                }}
              >
                <input type="checkbox" style={{ width: "auto" }} checked={on} onChange={() => toggle(it.id)} />
                <span>{it.name}</span>
              </label>
            );
          })}
        </div>
        <button className="btn-primary" style={{ width: "100%", marginTop: 18 }} disabled={busy}>
          {busy ? "Saving…" : isEdit ? "Save menu" : "Create menu"}
        </button>
      </form>
    </Modal>
  );
}

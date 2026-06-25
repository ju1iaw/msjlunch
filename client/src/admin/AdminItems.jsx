import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { Avatar, Modal, useToast } from "../ui.jsx";

export default function AdminItems() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // item or {} for new
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get("/items");
      data.sort((a, b) => b.favoriteCount - a.favoriteCount);
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (item) => {
    if (!confirm(`Delete "${item.name}"? This also removes it from menus and favorites.`)) return;
    try {
      await api.del(`/items/${item.id}`, { admin: true });
      toast("Dish deleted");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const totalFavs = items.reduce((s, i) => s + i.favoriteCount, 0);

  return (
    <div>
      <div className="spread" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="section-title">Dishes</h2>
          <p className="section-sub">{items.length} dishes · {totalFavs} total favorites across all dishes</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({})}>+ New dish</button>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="grid grid-3">
          {items.map((it) => (
            <div key={it.id} className="card dish-card">
              <Avatar item={it} />
              <div className="dish-body">
                <div className="spread">
                  <span className="dish-name">{it.name}</span>
                  <span className="pill green">♥ {it.favoriteCount}</span>
                </div>
                {it.description && <div className="dish-desc">{it.description}</div>}
                {it.allergens && it.allergens.toLowerCase() !== "none" && (
                  <div className="muted" style={{ fontSize: 12 }}>Allergens: {it.allergens}</div>
                )}
                <div className="row" style={{ marginTop: "auto", gap: 8 }}>
                  <button className="btn-secondary" onClick={() => setEditing(it)}>Edit</button>
                  <button className="btn-danger" onClick={() => remove(it)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ItemForm
          item={editing.id ? editing : null}
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

function ItemForm({ item, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!item;
  const [name, setName] = useState(item?.name || "");
  const [description, setDescription] = useState(item?.description || "");
  const [ingredients, setIngredients] = useState(item?.ingredients || "");
  const [allergens, setAllergens] = useState(item?.allergens || "");
  const [preview, setPreview] = useState(item?.image_path || "");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();

  const onFile = (e) => {
    const f = e.target.files[0];
    if (f) setPreview(URL.createObjectURL(f));
  };

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast("Name is required", "error");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("description", description);
      fd.append("ingredients", ingredients);
      fd.append("allergens", allergens);
      if (fileRef.current?.files[0]) fd.append("image", fileRef.current.files[0]);
      if (isEdit) await api.putForm(`/items/${item.id}`, fd);
      else await api.postForm("/items", fd);
      toast(isEdit ? "Dish updated" : "Dish created");
      onSaved();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit dish" : "New dish"} onClose={onClose}>
      <form onSubmit={save}>
        <div className="field">
          <label>Photo</label>
          <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
            {preview ? (
              <img src={preview} alt="preview" style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 12 }} />
            ) : (
              <div className="dish-photo placeholder" style={{ width: 120, height: 90, borderRadius: 12 }}>🍽️</div>
            )}
            <div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ padding: 8 }} />
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Take a photo or upload from your device.</p>
            </div>
          </div>
        </div>
        <div className="field">
          <label>Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken Teriyaki Bowl" />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="field">
          <label>Ingredients (comma separated)</label>
          <textarea rows={2} value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="Chicken, rice, soy sauce" />
        </div>
        <div className="field">
          <label>Allergens (comma separated)</label>
          <input value={allergens} onChange={(e) => setAllergens(e.target.value)} placeholder="Soy, Wheat" />
        </div>
        <button className="btn-primary" style={{ width: "100%" }} disabled={busy}>
          {busy ? "Saving…" : isEdit ? "Save changes" : "Create dish"}
        </button>
      </form>
    </Modal>
  );
}

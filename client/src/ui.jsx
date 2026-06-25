import { createContext, useCallback, useContext, useEffect, useState } from "react";

// ---------- Toast ----------
const ToastCtx = createContext(() => {});
export function useToast() {
  return useContext(ToastCtx);
}
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const show = useCallback((message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && <div className={`toast ${toast.type === "error" ? "error" : ""}`}>{toast.message}</div>}
    </ToastCtx.Provider>
  );
}

// ---------- Modal ----------
export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={wide ? { maxWidth: 720 } : undefined} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ---------- Star rating ----------
export function StarRating({ value, onChange, readOnly }) {
  return (
    <div className="row" style={{ gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`star ${value >= n ? "on" : ""}`}
          style={readOnly ? { cursor: "default" } : undefined}
          onClick={() => !readOnly && onChange(n)}
        >
          ★
        </span>
      ))}
    </div>
  );
}

// ---------- Image helper ----------
export function dishImageUrl(item) {
  return item.image_path || "";
}

export function Avatar({ item }) {
  if (item.image_path) {
    return <img className="dish-photo" src={item.image_path} alt={item.name} />;
  }
  return <div className="dish-photo placeholder">🍽️</div>;
}

export function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, getStudentToken, setStudentToken } from "../api.js";
import { Modal, useToast } from "../ui.jsx";
import MenuTab from "./MenuTab.jsx";
import PollsTab from "./PollsTab.jsx";
import FeedbackTab from "./FeedbackTab.jsx";
import ProfileTab from "./ProfileTab.jsx";

const TABS = [
  { id: "menu", label: "Menu", icon: "📅" },
  { id: "polls", label: "Polls", icon: "🗳️" },
  { id: "feedback", label: "Feedback", icon: "💬" },
];

export default function StudentApp() {
  const toast = useToast();
  const [me, setMe] = useState(null);
  const [view, setView] = useState("menu");
  const [showLogin, setShowLogin] = useState(false);
  const [notifs, setNotifs] = useState([]);

  const loadMe = useCallback(async () => {
    if (!getStudentToken()) {
      setMe(null);
      return;
    }
    try {
      const data = await api.get("/student/me");
      setMe(data);
    } catch {
      setStudentToken(null);
      setMe(null);
    }
  }, []);

  const loadNotifs = useCallback(async () => {
    if (!getStudentToken()) {
      setNotifs([]);
      return;
    }
    try {
      setNotifs(await api.get("/notifications"));
    } catch {
      setNotifs([]);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  useEffect(() => {
    loadNotifs();
  }, [me, loadNotifs]);

  const logout = () => {
    setStudentToken(null);
    setMe(null);
    setView("menu");
    toast("Logged out");
  };

  const unread = useMemo(() => notifs.filter((n) => !n.is_read).length, [notifs]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">🥗</div>
          <div>
            <h1>Mission San Jose Lunch Menus</h1>
            <p>Fresh menus, polls & feedback</p>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {me ? (
            <>
              <button
                className="btn-secondary"
                onClick={() => setView("profile")}
                title="Notifications & favorites"
              >
                🔔 {unread > 0 && <span className="badge-count">{unread}</span>}
              </button>
              <button className="btn-secondary" onClick={() => setView("profile")}>👤 Profile</button>
              <button className="btn-ghost" onClick={logout}>Log out</button>
            </>
          ) : (
            <button className="btn-primary" onClick={() => setShowLogin(true)}>Log in</button>
          )}
          <Link to="/admin" className="btn-ghost">Admin</Link>
        </div>
      </header>

      <div className="container">
        {view !== "profile" && (
          <div className="tabs" style={{ marginBottom: 24 }}>
            {TABS.map((t) => (
              <div
                key={t.id}
                className={`tab ${view === t.id ? "active" : ""}`}
                onClick={() => setView(t.id)}
              >
                {t.icon} {t.label}
              </div>
            ))}
          </div>
        )}

        {view === "menu" && <MenuTab me={me} requireLogin={() => setShowLogin(true)} onFavoriteChange={loadNotifs} />}
        {view === "polls" && <PollsTab />}
        {view === "feedback" && <FeedbackTab me={me} requireLogin={() => setShowLogin(true)} />}
        {view === "profile" && (
          <ProfileTab
            me={me}
            notifs={notifs}
            reloadNotifs={loadNotifs}
            onBack={() => setView("menu")}
            requireLogin={() => setShowLogin(true)}
          />
        )}
      </div>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={async () => {
            setShowLogin(false);
            await loadMe();
            toast("Welcome! Your favorites are now saved.");
          }}
        />
      )}
    </div>
  );
}

function LoginModal({ onClose, onSuccess }) {
  const toast = useToast();
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!contact.trim()) return;
    setBusy(true);
    try {
      const data = await api.post("/student/login", { contact });
      setStudentToken(data.token);
      onSuccess();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Log in to save favorites" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Sign in with your email or phone number to favorite dishes and get notified when they're on
        an upcoming menu. No password needed.
      </p>
      <form onSubmit={submit}>
        <div className="field">
          <label>Email or phone number</label>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="you@example.com or 555-123-4567"
            autoFocus
          />
        </div>
        <button className="btn-primary" style={{ width: "100%" }} disabled={busy}>
          {busy ? "Signing in…" : "Continue"}
        </button>
      </form>
    </Modal>
  );
}

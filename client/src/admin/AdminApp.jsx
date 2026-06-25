import { useState } from "react";
import { Link } from "react-router-dom";
import { api, getAdminToken, setAdminToken } from "../api.js";
import { useToast } from "../ui.jsx";
import AdminItems from "./AdminItems.jsx";
import AdminMenus from "./AdminMenus.jsx";
import AdminPolls from "./AdminPolls.jsx";
import AdminRoster from "./AdminRoster.jsx";
import AdminFeedback from "./AdminFeedback.jsx";

const NAV = [
  { id: "items", label: "Dishes", icon: "🍽️" },
  { id: "menus", label: "Menus", icon: "📅" },
  { id: "polls", label: "Polls", icon: "🗳️" },
  { id: "roster", label: "Student roster", icon: "🪪" },
  { id: "feedback", label: "Feedback", icon: "💬" },
];

export default function AdminApp() {
  const [authed, setAuthed] = useState(!!getAdminToken());
  const [tab, setTab] = useState("items");

  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />;

  const logout = () => {
    setAdminToken(null);
    setAuthed(false);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">🛠️</div>
          <div>
            <h1>Mission San Jose Lunch — Admin</h1>
            <p>Manage dishes, menus, polls & more</p>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link to="/" className="btn-ghost">View student site ↗</Link>
          <button className="btn-ghost" onClick={logout}>Log out</button>
        </div>
      </header>

      <div className="container">
        <div className="tabs" style={{ marginBottom: 24 }}>
          {NAV.map((n) => (
            <div key={n.id} className={`tab ${tab === n.id ? "active" : ""}`} onClick={() => setTab(n.id)}>
              {n.icon} {n.label}
            </div>
          ))}
        </div>

        {tab === "items" && <AdminItems />}
        {tab === "menus" && <AdminMenus />}
        {tab === "polls" && <AdminPolls />}
        {tab === "roster" && <AdminRoster />}
        {tab === "feedback" && <AdminFeedback />}
      </div>
    </div>
  );
}

function AdminLogin({ onSuccess }) {
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await api.post("/admin/login", { username, password });
      setAdminToken(data.token);
      onSuccess();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="auth-wrap">
        <div className="brand" style={{ justifyContent: "center", marginBottom: 20 }}>
          <div className="brand-mark">🛠️</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18 }}>Admin sign in</h1>
            <p className="muted" style={{ margin: 0 }}>Mission San Jose Lunch Menus</p>
          </div>
        </div>
        <form className="card auth-card" onSubmit={submit}>
          <div className="field">
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn-primary" style={{ width: "100%" }} disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="muted center" style={{ fontSize: 12, marginTop: 16, marginBottom: 0 }}>
            Default login — admin / admin123
          </p>
          <p className="center" style={{ marginTop: 14, marginBottom: 0 }}>
            <Link to="/" className="link">← Back to student site</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

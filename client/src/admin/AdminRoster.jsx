import { useEffect, useRef, useState } from "react";
import { api, getAdminToken } from "../api.js";
import { useToast } from "../ui.jsx";

export default function AdminRoster() {
  const toast = useToast();
  const [info, setInfo] = useState({ count: 0, sample: [] });
  const [schoolYear, setSchoolYear] = useState("");
  const [replace, setReplace] = useState(true);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();

  const load = async () => setInfo(await api.get("/admin/students", { admin: true }));
  useEffect(() => {
    load();
  }, []);

  const upload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files[0];
    if (!file) return toast("Choose a CSV file first", "error");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("schoolYear", schoolYear);
      fd.append("replace", String(replace));
      // postForm uses admin token automatically
      const res = await fetch("/api/admin/students/csv", {
        method: "POST",
        headers: { Authorization: `Bearer ${getAdminToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      toast(`Added ${data.added} student IDs. Roster now has ${data.total}.`);
      fileRef.current.value = "";
      load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2 className="section-title">Student roster</h2>
      <p className="section-sub">
        Upload a CSV of valid student IDs each school year. Students must enter a valid ID to vote in polls,
        which blocks duplicate and invalid votes.
      </p>

      <div className="grid grid-2">
        <form className="card stack" onSubmit={upload}>
          <h3 style={{ margin: 0 }}>Upload roster CSV</h3>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            One student ID per line (first column). A header row like <code>student_id</code> is ignored.
          </p>
          <div className="field">
            <label>School year (optional)</label>
            <input value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} placeholder="2025-2026" />
          </div>
          <div className="field">
            <label>CSV file</label>
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ padding: 8 }} />
          </div>
          <label className="row" style={{ gap: 8, fontWeight: 400 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={replace} onChange={(e) => setReplace(e.target.checked)} />
            Replace the existing roster (uncheck to add to it)
          </label>
          <button className="btn-primary" disabled={busy}>{busy ? "Uploading…" : "Upload CSV"}</button>
        </form>

        <div className="card stack">
          <div className="spread">
            <h3 style={{ margin: 0 }}>Current roster</h3>
            <span className="pill green">{info.count} IDs</span>
          </div>
          {info.sample.length === 0 ? (
            <span className="muted">No student IDs uploaded yet.</span>
          ) : (
            <>
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>Showing first {info.sample.length}:</p>
              <div className="tag-list">
                {info.sample.map((s) => (
                  <span key={s.student_id} className="pill">{s.student_id}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

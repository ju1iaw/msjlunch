import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { fmtDate } from "../ui.jsx";
import { DishCard, DishModal } from "./DishViews.jsx";

function startOfWeek(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay()); // Sunday start
  return date;
}
function iso(d) {
  return d.toISOString().slice(0, 10);
}
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MenuTab({ me, requireLogin, onFavoriteChange }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [menus, setMenus] = useState({});
  const [selected, setSelected] = useState(iso(new Date()));
  const [openItem, setOpenItem] = useState(null);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const load = useCallback(async () => {
    const from = iso(days[0]);
    const to = iso(days[6]);
    const data = await api.get(`/menus?from=${from}&to=${to}`);
    const map = {};
    for (const m of data) map[m.date] = m;
    setMenus(map);
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const todayIso = iso(new Date());
  const selectedMenu = menus[selected];

  const shiftWeek = (delta) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + delta * 7);
    setWeekStart(d);
  };

  const monthLabel = days[0].toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div>
      <div className="spread" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="section-title">This week's menu</h2>
          <p className="section-sub">Tap any day to see what's being served.</p>
        </div>
        <div className="row">
          <button className="btn-secondary" onClick={() => shiftWeek(-1)}>←</button>
          <button className="btn-secondary" onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</button>
          <button className="btn-secondary" onClick={() => shiftWeek(1)}>→</button>
        </div>
      </div>

      <div className="muted" style={{ marginBottom: 10, fontWeight: 600 }}>{monthLabel}</div>

      <div className="week-strip">
        {days.map((d) => {
          const key = iso(d);
          const menu = menus[key];
          const items = menu?.items || [];
          return (
            <div
              key={key}
              className={`day-cell ${key === todayIso ? "today" : ""} ${selected === key ? "" : ""}`}
              style={selected === key ? { borderColor: "var(--green-accent)" } : undefined}
              onClick={() => setSelected(key)}
            >
              <div className="day-dow">{DOW[d.getDay()]}</div>
              <div className="day-num">{d.getDate()}</div>
              {items.slice(0, 3).map((it) => (
                <div key={it.id} className="day-item">{it.name}</div>
              ))}
              {items.length > 3 && <div className="muted" style={{ fontSize: 11 }}>+{items.length - 3} more</div>}
              {items.length === 0 && <div className="muted" style={{ fontSize: 11 }}>No menu</div>}
            </div>
          );
        })}
      </div>

      <div className="divider" />

      <h3 style={{ marginBottom: 4 }}>{fmtDate(selected)}</h3>
      {selectedMenu && selectedMenu.items.length > 0 ? (
        <>
          <p className="section-sub">{selectedMenu.items.length} dishes on the menu</p>
          <div className="grid grid-3">
            {selectedMenu.items.map((it) => (
              <DishCard
                key={it.id}
                item={it}
                me={me}
                requireLogin={requireLogin}
                onOpen={() => setOpenItem(it.id)}
                onChanged={() => {
                  load();
                  onFavoriteChange && onFavoriteChange();
                }}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="big">🍽️</div>
          No menu posted for this day yet. Check back soon!
        </div>
      )}

      {openItem && (
        <DishModal
          itemId={openItem}
          me={me}
          requireLogin={requireLogin}
          onClose={() => setOpenItem(null)}
          onChanged={() => {
            load();
            onFavoriteChange && onFavoriteChange();
          }}
        />
      )}
    </div>
  );
}

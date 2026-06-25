import express from "express";
import cors from "cors";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import db, { hashPassword } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 4000;

export const FEEDBACK_CATEGORIES = ["Taste", "Portion Size", "Freshness", "Presentation"];

const app = express();
app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`);
  },
});
const uploadImage = multer({ storage: imageStorage, limits: { fileSize: 8 * 1024 * 1024 } });
const uploadCsv = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

// ---- Auth tokens (in-memory) ----
const adminTokens = new Map(); // token -> adminId
const studentTokens = new Map(); // token -> studentId

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!adminTokens.has(token)) return res.status(401).json({ error: "Admin authentication required" });
  req.adminId = adminTokens.get(token);
  next();
}

function getStudent(req) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  return studentTokens.has(token) ? studentTokens.get(token) : null;
}

function requireStudent(req, res, next) {
  const id = getStudent(req);
  if (!id) return res.status(401).json({ error: "Please log in to continue" });
  req.studentId = id;
  next();
}

const asyncRoute = (fn) => (req, res) => {
  try {
    fn(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Server error" });
  }
};

// ================= AUTH =================
app.post("/api/admin/login", asyncRoute((req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare("SELECT * FROM admins WHERE username = ?").get(username);
  if (!admin || admin.password_hash !== hashPassword(password || "")) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  const token = makeToken();
  adminTokens.set(token, admin.id);
  res.json({ token, username: admin.username });
}));

app.post("/api/student/login", asyncRoute((req, res) => {
  let { contact, contactType } = req.body;
  contact = (contact || "").trim().toLowerCase();
  if (!contact) return res.status(400).json({ error: "Email or phone is required" });
  if (!["email", "phone"].includes(contactType)) {
    contactType = contact.includes("@") ? "email" : "phone";
  }
  let student = db.prepare("SELECT * FROM students WHERE contact = ?").get(contact);
  if (!student) {
    const info = db
      .prepare("INSERT INTO students (contact, contact_type) VALUES (?, ?)")
      .run(contact, contactType);
    student = { id: info.lastInsertRowid, contact, contact_type: contactType };
  }
  const token = makeToken();
  studentTokens.set(token, student.id);
  res.json({ token, student: { id: student.id, contact: student.contact, contactType: student.contact_type } });
}));

app.get("/api/student/me", requireStudent, asyncRoute((req, res) => {
  const s = db.prepare("SELECT id, contact, contact_type FROM students WHERE id = ?").get(req.studentId);
  res.json({ id: s.id, contact: s.contact, contactType: s.contact_type });
}));

// ================= ITEMS =================
function favoriteCountFor(itemId) {
  return db.prepare("SELECT COUNT(*) AS c FROM favorites WHERE item_id = ?").get(itemId).c;
}

function dishFeedbackSummary(itemId) {
  const rows = db
    .prepare("SELECT category, AVG(rating) AS avg, COUNT(*) AS count FROM dish_feedback WHERE item_id = ? GROUP BY category")
    .all(itemId);
  const summary = {};
  for (const cat of FEEDBACK_CATEGORIES) summary[cat] = { avg: null, count: 0 };
  for (const r of rows) summary[r.category] = { avg: Math.round(r.avg * 10) / 10, count: r.count };
  return summary;
}

app.get("/api/items", asyncRoute((req, res) => {
  const studentId = getStudent(req);
  const items = db.prepare("SELECT * FROM items ORDER BY name COLLATE NOCASE").all();
  const favSet = new Set(
    studentId ? db.prepare("SELECT item_id FROM favorites WHERE student_id = ?").all(studentId).map((r) => r.item_id) : []
  );
  res.json(
    items.map((it) => ({
      ...it,
      favoriteCount: favoriteCountFor(it.id),
      isFavorite: favSet.has(it.id),
    }))
  );
}));

app.get("/api/items/:id", asyncRoute((req, res) => {
  const studentId = getStudent(req);
  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found" });
  const isFavorite = studentId
    ? !!db.prepare("SELECT 1 FROM favorites WHERE student_id = ? AND item_id = ?").get(studentId, item.id)
    : false;
  res.json({
    ...item,
    favoriteCount: favoriteCountFor(item.id),
    isFavorite,
    feedback: dishFeedbackSummary(item.id),
  });
}));

app.post("/api/items", requireAdmin, uploadImage.single("image"), asyncRoute((req, res) => {
  const { name, description, ingredients, allergens } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Item name is required" });
  const imagePath = req.file ? `/uploads/${req.file.filename}` : "";
  const info = db
    .prepare("INSERT INTO items (name, description, image_path, ingredients, allergens) VALUES (?, ?, ?, ?, ?)")
    .run(name.trim(), description || "", imagePath, ingredients || "", allergens || "");
  res.json(db.prepare("SELECT * FROM items WHERE id = ?").get(info.lastInsertRowid));
}));

app.put("/api/items/:id", requireAdmin, uploadImage.single("image"), asyncRoute((req, res) => {
  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found" });
  const { name, description, ingredients, allergens } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : item.image_path;
  db.prepare(
    "UPDATE items SET name = ?, description = ?, image_path = ?, ingredients = ?, allergens = ? WHERE id = ?"
  ).run(
    (name ?? item.name).trim(),
    description ?? item.description,
    imagePath,
    ingredients ?? item.ingredients,
    allergens ?? item.allergens,
    item.id
  );
  res.json(db.prepare("SELECT * FROM items WHERE id = ?").get(item.id));
}));

app.delete("/api/items/:id", requireAdmin, asyncRoute((req, res) => {
  db.prepare("DELETE FROM items WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
}));

// ================= MENUS =================
function menuWithItems(menu) {
  const items = db
    .prepare(
      `SELECT i.* FROM items i JOIN menu_items mi ON mi.item_id = i.id WHERE mi.menu_id = ? ORDER BY i.name COLLATE NOCASE`
    )
    .all(menu.id)
    .map((it) => ({ ...it, favoriteCount: favoriteCountFor(it.id) }));
  return { ...menu, items };
}

function generateMenuNotifications(menuDate, itemIds) {
  const todayIso = new Date().toISOString().slice(0, 10);
  if (menuDate < todayIso) return; // only notify for today/future menus
  const insert = db.prepare(
    "INSERT INTO notifications (student_id, item_id, body, menu_date) VALUES (?, ?, ?, ?)"
  );
  for (const itemId of itemIds) {
    const item = db.prepare("SELECT name FROM items WHERE id = ?").get(itemId);
    if (!item) continue;
    const fans = db.prepare("SELECT student_id FROM favorites WHERE item_id = ?").all(itemId);
    for (const f of fans) {
      const exists = db
        .prepare("SELECT 1 FROM notifications WHERE student_id = ? AND item_id = ? AND menu_date = ?")
        .get(f.student_id, itemId, menuDate);
      if (!exists) {
        insert.run(f.student_id, itemId, `${item.name} is on the menu for ${menuDate}!`, menuDate);
      }
    }
  }
}

app.get("/api/menus", asyncRoute((req, res) => {
  const { from, to } = req.query;
  let rows;
  if (from && to) {
    rows = db.prepare("SELECT * FROM menus WHERE date BETWEEN ? AND ? ORDER BY date").all(from, to);
  } else {
    rows = db.prepare("SELECT * FROM menus ORDER BY date").all();
  }
  res.json(rows.map(menuWithItems));
}));

app.get("/api/menus/by-date/:date", asyncRoute((req, res) => {
  const menu = db.prepare("SELECT * FROM menus WHERE date = ?").get(req.params.date);
  if (!menu) return res.json({ date: req.params.date, items: [] });
  res.json(menuWithItems(menu));
}));

const saveMenu = db.transaction((date, itemIds, existingId) => {
  let menuId = existingId;
  if (menuId) {
    db.prepare("UPDATE menus SET date = ? WHERE id = ?").run(date, menuId);
    db.prepare("DELETE FROM menu_items WHERE menu_id = ?").run(menuId);
  } else {
    const existing = db.prepare("SELECT id FROM menus WHERE date = ?").get(date);
    if (existing) {
      menuId = existing.id;
      db.prepare("DELETE FROM menu_items WHERE menu_id = ?").run(menuId);
    } else {
      menuId = db.prepare("INSERT INTO menus (date) VALUES (?)").run(date).lastInsertRowid;
    }
  }
  const ins = db.prepare("INSERT OR IGNORE INTO menu_items (menu_id, item_id) VALUES (?, ?)");
  for (const id of itemIds) ins.run(menuId, id);
  return menuId;
});

app.post("/api/menus", requireAdmin, asyncRoute((req, res) => {
  const { date, itemIds } = req.body;
  if (!date) return res.status(400).json({ error: "A date is required" });
  const ids = Array.isArray(itemIds) ? itemIds : [];
  const menuId = saveMenu(date, ids, null);
  generateMenuNotifications(date, ids);
  res.json(menuWithItems(db.prepare("SELECT * FROM menus WHERE id = ?").get(menuId)));
}));

app.put("/api/menus/:id", requireAdmin, asyncRoute((req, res) => {
  const menu = db.prepare("SELECT * FROM menus WHERE id = ?").get(req.params.id);
  if (!menu) return res.status(404).json({ error: "Menu not found" });
  const { date, itemIds } = req.body;
  const ids = Array.isArray(itemIds) ? itemIds : [];
  const menuId = saveMenu(date || menu.date, ids, menu.id);
  generateMenuNotifications(date || menu.date, ids);
  res.json(menuWithItems(db.prepare("SELECT * FROM menus WHERE id = ?").get(menuId)));
}));

app.delete("/api/menus/:id", requireAdmin, asyncRoute((req, res) => {
  db.prepare("DELETE FROM menus WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
}));

// ================= POLLS =================
function pollWithOptions(poll, includeCounts = true) {
  const options = db.prepare("SELECT * FROM poll_options WHERE poll_id = ? ORDER BY id").all(poll.id);
  const totalVotes = db.prepare("SELECT COUNT(*) AS c FROM poll_votes WHERE poll_id = ?").get(poll.id).c;
  const withCounts = options.map((o) => ({
    ...o,
    votes: includeCounts ? db.prepare("SELECT COUNT(*) AS c FROM poll_votes WHERE option_id = ?").get(o.id).c : 0,
  }));
  const isClosed = poll.deadline ? poll.deadline < new Date().toISOString().slice(0, 10) : false;
  return { ...poll, options: withCounts, totalVotes, isClosed };
}

app.get("/api/polls", asyncRoute((req, res) => {
  const polls = db.prepare("SELECT * FROM polls ORDER BY created_at DESC").all();
  res.json(polls.map((p) => pollWithOptions(p)));
}));

app.post("/api/polls/:id/vote", asyncRoute((req, res) => {
  const { studentId, optionId } = req.body;
  const sid = (studentId || "").trim();
  if (!sid) return res.status(400).json({ error: "Student ID is required to vote" });
  const valid = db.prepare("SELECT 1 FROM valid_students WHERE student_id = ?").get(sid);
  if (!valid) return res.status(403).json({ error: "That student ID is not on the valid roster" });
  const poll = db.prepare("SELECT * FROM polls WHERE id = ?").get(req.params.id);
  if (!poll) return res.status(404).json({ error: "Poll not found" });
  if (poll.deadline && poll.deadline < new Date().toISOString().slice(0, 10)) {
    return res.status(403).json({ error: "This poll has closed" });
  }
  const option = db.prepare("SELECT * FROM poll_options WHERE id = ? AND poll_id = ?").get(optionId, poll.id);
  if (!option) return res.status(400).json({ error: "Invalid option" });
  const already = db.prepare("SELECT 1 FROM poll_votes WHERE poll_id = ? AND student_id = ?").get(poll.id, sid);
  if (already) return res.status(409).json({ error: "This student ID has already voted in this poll" });
  db.prepare("INSERT INTO poll_votes (poll_id, option_id, student_id) VALUES (?, ?, ?)").run(poll.id, option.id, sid);
  res.json(pollWithOptions(poll));
}));

app.post("/api/polls", requireAdmin, asyncRoute((req, res) => {
  const { question, deadline, options } = req.body;
  if (!question || !question.trim()) return res.status(400).json({ error: "Poll question is required" });
  const opts = (options || []).map((o) => (typeof o === "string" ? o : o.text)).filter((o) => o && o.trim());
  if (opts.length < 2) return res.status(400).json({ error: "Add at least two options" });
  const pollId = db.prepare("INSERT INTO polls (question, deadline) VALUES (?, ?)").run(question.trim(), deadline || null).lastInsertRowid;
  const ins = db.prepare("INSERT INTO poll_options (poll_id, text) VALUES (?, ?)");
  for (const o of opts) ins.run(pollId, o.trim());
  res.json(pollWithOptions(db.prepare("SELECT * FROM polls WHERE id = ?").get(pollId)));
}));

app.put("/api/polls/:id", requireAdmin, asyncRoute((req, res) => {
  const poll = db.prepare("SELECT * FROM polls WHERE id = ?").get(req.params.id);
  if (!poll) return res.status(404).json({ error: "Poll not found" });
  const { question, deadline } = req.body;
  db.prepare("UPDATE polls SET question = ?, deadline = ? WHERE id = ?").run(
    question ?? poll.question,
    deadline ?? poll.deadline,
    poll.id
  );
  res.json(pollWithOptions(db.prepare("SELECT * FROM polls WHERE id = ?").get(poll.id)));
}));

app.delete("/api/polls/:id", requireAdmin, asyncRoute((req, res) => {
  db.prepare("DELETE FROM polls WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
}));

// ================= FEEDBACK =================
app.get("/api/feedback/categories", (req, res) => res.json(FEEDBACK_CATEGORIES));

app.post("/api/feedback/general", asyncRoute((req, res) => {
  const { body } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: "Feedback cannot be empty" });
  db.prepare("INSERT INTO general_feedback (body) VALUES (?)").run(body.trim());
  res.json({ ok: true });
}));

app.get("/api/feedback/general", requireAdmin, asyncRoute((req, res) => {
  res.json(db.prepare("SELECT * FROM general_feedback ORDER BY created_at DESC").all());
}));

app.post("/api/feedback/dish", asyncRoute((req, res) => {
  const { itemId, ratings } = req.body;
  const item = db.prepare("SELECT 1 FROM items WHERE id = ?").get(itemId);
  if (!item) return res.status(404).json({ error: "Item not found" });
  if (!ratings || typeof ratings !== "object") return res.status(400).json({ error: "Ratings required" });
  const ins = db.prepare("INSERT INTO dish_feedback (item_id, category, rating) VALUES (?, ?, ?)");
  let count = 0;
  for (const cat of FEEDBACK_CATEGORIES) {
    const r = Number(ratings[cat]);
    if (r >= 1 && r <= 5) {
      ins.run(itemId, cat, r);
      count++;
    }
  }
  if (count === 0) return res.status(400).json({ error: "Please rate at least one category" });
  res.json({ ok: true, summary: dishFeedbackSummary(itemId) });
}));

app.get("/api/feedback/dish/:itemId", asyncRoute((req, res) => {
  res.json(dishFeedbackSummary(req.params.itemId));
}));

// ================= FAVORITES =================
app.get("/api/favorites", requireStudent, asyncRoute((req, res) => {
  const items = db
    .prepare(
      `SELECT i.* FROM items i JOIN favorites f ON f.item_id = i.id WHERE f.student_id = ? ORDER BY f.created_at DESC`
    )
    .all(req.studentId)
    .map((it) => ({ ...it, favoriteCount: favoriteCountFor(it.id), isFavorite: true }));
  res.json(items);
}));

app.post("/api/favorites/:itemId", requireStudent, asyncRoute((req, res) => {
  const itemId = Number(req.params.itemId);
  const item = db.prepare("SELECT 1 FROM items WHERE id = ?").get(itemId);
  if (!item) return res.status(404).json({ error: "Item not found" });
  const existing = db.prepare("SELECT 1 FROM favorites WHERE student_id = ? AND item_id = ?").get(req.studentId, itemId);
  if (existing) {
    db.prepare("DELETE FROM favorites WHERE student_id = ? AND item_id = ?").run(req.studentId, itemId);
    return res.json({ isFavorite: false, favoriteCount: favoriteCountFor(itemId) });
  }
  db.prepare("INSERT INTO favorites (student_id, item_id) VALUES (?, ?)").run(req.studentId, itemId);
  res.json({ isFavorite: true, favoriteCount: favoriteCountFor(itemId) });
}));

// ================= NOTIFICATIONS =================
app.get("/api/notifications", requireStudent, asyncRoute((req, res) => {
  res.json(db.prepare("SELECT * FROM notifications WHERE student_id = ? ORDER BY created_at DESC").all(req.studentId));
}));

app.post("/api/notifications/read", requireStudent, asyncRoute((req, res) => {
  db.prepare("UPDATE notifications SET is_read = 1 WHERE student_id = ?").run(req.studentId);
  res.json({ ok: true });
}));

// ================= VALID STUDENTS (CSV) =================
app.get("/api/admin/students", requireAdmin, asyncRoute((req, res) => {
  const count = db.prepare("SELECT COUNT(*) AS c FROM valid_students").get().c;
  const sample = db.prepare("SELECT student_id, school_year FROM valid_students ORDER BY student_id LIMIT 25").all();
  res.json({ count, sample });
}));

app.post("/api/admin/students/csv", requireAdmin, uploadCsv.single("file"), asyncRoute((req, res) => {
  if (!req.file) return res.status(400).json({ error: "CSV file is required" });
  const { schoolYear, replace } = req.body;
  const text = req.file.buffer.toString("utf-8");
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const ins = db.prepare("INSERT OR IGNORE INTO valid_students (student_id, school_year) VALUES (?, ?)");
  const apply = db.transaction(() => {
    if (replace === "true" || replace === true) db.prepare("DELETE FROM valid_students").run();
    let added = 0;
    for (const line of lines) {
      const cell = line.split(",")[0].trim();
      if (!cell) continue;
      if (/^student[_ ]?id$/i.test(cell) || /^id$/i.test(cell)) continue; // skip header
      const r = ins.run(cell, schoolYear || "");
      if (r.changes) added++;
    }
    return added;
  });
  const added = apply();
  const count = db.prepare("SELECT COUNT(*) AS c FROM valid_students").get().c;
  res.json({ added, total: count });
}));

// ---- serve built client (production) ----
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.listen(PORT, () => console.log(`Lunch menu server running on http://localhost:${PORT}`));

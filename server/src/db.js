import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "lunch.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    image_path TEXT DEFAULT '',
    ingredients TEXT DEFAULT '',
    allergens TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    menu_id INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    PRIMARY KEY (menu_id, item_id)
  );

  CREATE TABLE IF NOT EXISTS polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    deadline TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS poll_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    text TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS poll_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_id INTEGER NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE (poll_id, student_id)
  );

  CREATE TABLE IF NOT EXISTS valid_students (
    student_id TEXT PRIMARY KEY,
    school_year TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact TEXT UNIQUE NOT NULL,
    contact_type TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE (student_id, item_id)
  );

  CREATE TABLE IF NOT EXISTS general_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    body TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS dish_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    rating INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    menu_date TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

export function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Seed a default admin account if none exists.
const adminCount = db.prepare("SELECT COUNT(*) AS c FROM admins").get().c;
if (adminCount === 0) {
  db.prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)").run(
    "admin",
    hashPassword("admin123")
  );
  console.log("Seeded default admin -> username: admin, password: admin123");
}

// Seed some demo data the first time the DB is created so the app isn't empty.
const itemCount = db.prepare("SELECT COUNT(*) AS c FROM items").get().c;
if (itemCount === 0) {
  const insertItem = db.prepare(
    "INSERT INTO items (name, description, ingredients, allergens) VALUES (?, ?, ?, ?)"
  );
  const demoItems = [
    ["Cheese Pizza", "Classic stone-baked cheese pizza.", "Flour, tomato, mozzarella, olive oil", "Wheat, Dairy"],
    ["Teriyaki Chicken Bowl", "Grilled chicken over steamed rice.", "Chicken, rice, soy sauce, sesame", "Soy, Sesame"],
    ["Garden Salad", "Fresh greens with house vinaigrette.", "Lettuce, tomato, cucumber, carrot", "None"],
    ["Bean & Cheese Burrito", "Warm flour tortilla with beans and cheese.", "Tortilla, pinto beans, cheddar", "Wheat, Dairy"],
    ["Spaghetti Marinara", "Pasta with classic marinara sauce.", "Pasta, tomato, garlic, basil", "Wheat"],
    ["Fruit Cup", "Seasonal mixed fruit.", "Melon, grapes, pineapple", "None"],
  ];
  const ids = demoItems.map((it) => insertItem.run(...it).lastInsertRowid);

  const insertMenu = db.prepare("INSERT INTO menus (date) VALUES (?)");
  const insertMenuItem = db.prepare(
    "INSERT INTO menu_items (menu_id, item_id) VALUES (?, ?)"
  );
  const today = new Date();
  for (let d = 0; d < 5; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const iso = date.toISOString().slice(0, 10);
    const menuId = insertMenu.run(iso).lastInsertRowid;
    // rotate a few items per day
    insertMenuItem.run(menuId, ids[d % ids.length]);
    insertMenuItem.run(menuId, ids[(d + 1) % ids.length]);
    insertMenuItem.run(menuId, ids[(d + 2) % ids.length]);
  }

  const insertPoll = db.prepare(
    "INSERT INTO polls (question, deadline) VALUES (?, ?)"
  );
  const deadline = new Date(today);
  deadline.setDate(today.getDate() + 7);
  const pollId = insertPoll.run(
    "Which new entrée should we add to the menu?",
    deadline.toISOString().slice(0, 10)
  ).lastInsertRowid;
  const insertOption = db.prepare(
    "INSERT INTO poll_options (poll_id, text) VALUES (?, ?)"
  );
  ["Korean BBQ Bowl", "Veggie Buddha Bowl", "Chicken Tikka Wrap", "Loaded Nachos"].forEach((o) =>
    insertOption.run(pollId, o)
  );

  const insertValid = db.prepare(
    "INSERT OR IGNORE INTO valid_students (student_id, school_year) VALUES (?, ?)"
  );
  ["1001", "1002", "1003", "1004", "1005"].forEach((s) =>
    insertValid.run(s, "2025-2026")
  );

  console.log("Seeded demo items, menus, a poll, and sample student IDs (1001-1005).");
}

export default db;

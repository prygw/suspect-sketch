const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'witnesssketch.db');

// Ensure data directory exists
const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'active',
    current_phase TEXT NOT NULL DEFAULT 'rapport',
    composite_profile TEXT NOT NULL DEFAULT '{}',
    sketch_count INTEGER NOT NULL DEFAULT 0,
    next_question TEXT
  );

  CREATE TABLE IF NOT EXISTS interview_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    phase TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT,
    skipped INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );

  CREATE TABLE IF NOT EXISTS sketches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    image_data TEXT NOT NULL,
    prompt_used TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );
`);

// Run cleanup on server start and every 6 hours
function cleanExpiredSessions(maxAgeDays = 30) {
  const cleanup = db.transaction((days) => {
    db.prepare(`
      DELETE FROM interview_history WHERE session_id IN (
        SELECT id FROM sessions
        WHERE created_at < datetime('now', '-' || ? || ' days')
      )
    `).run(days);

    db.prepare(`
      DELETE FROM sketches WHERE session_id IN (
        SELECT id FROM sessions
        WHERE created_at < datetime('now', '-' || ? || ' days')
      )
    `).run(days);

    return db.prepare(`
      DELETE FROM sessions
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `).run(days);
  });

  const sessionResult = cleanup(maxAgeDays);
  console.log(`Cleaned ${sessionResult.changes} expired sessions`);
}

// Run on startup
cleanExpiredSessions();

// Run every 6 hours
setInterval(() => cleanExpiredSessions(), 6 * 60 * 60 * 1000);

module.exports = db;
module.exports.cleanExpiredSessions = cleanExpiredSessions;

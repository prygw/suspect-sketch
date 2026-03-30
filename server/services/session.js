const db = require('../db/sqlite');
const { v4: uuidv4 } = require('uuid');

// --- Transaction helper ---
// Wrap multi-step database operations in a transaction to ensure atomicity.
// better-sqlite3's .transaction() returns a function that, when called,
// runs the wrapped function inside BEGIN/COMMIT (with automatic ROLLBACK on error).
function runInTransaction(fn) {
  const transaction = db.transaction(fn);
  return transaction();
}

// Default empty composite profile structure
function createEmptyProfile() {
  return {
    context: {
      location: null,
      lighting: null,
      distance: null,
      duration: null,
      confidence: null,
    },
    description: {
      globalImpression: null,
      faceLabel: null,
      holisticTraits: {
        masculinity: null,
        attractiveness: null,
        distinctiveness: null,
        perceivedHealth: null,
        perceivedAge: null,
        perceivedThreat: null,
        perceivedWeight: null,
      },
      faceShape: null,
      hair: null,
      forehead: null,
      eyes: null,
      eyebrows: null,
      nose: null,
      cheeks: null,
      mouth: null,
      chin: null,
      ears: null,
      skin: null,
      facialHair: null,
      age: null,
      build: null,
      height: null,
      clothing: null,
      footwear: null,
      accessories: null,
      itemsCarried: null,
      distinguishingFeatures: [],
    },
    refinements: [],
    similarTo: null,
  };
}

// The initial rapport question used at session start and on restart.
const INITIAL_RAPPORT_QUESTION = "Welcome. I'm here to help you build a picture of the person you saw. Before we begin, I want you to know — there are no wrong answers, and it's completely okay if you don't remember something. How are you feeling right now?";

function createSession() {
  const id = uuidv4();
  const profile = createEmptyProfile();

  // Wrap in a transaction: insert the session row AND store the initial
  // next_question in one atomic operation.
  runInTransaction(() => {
    db.prepare(`
      INSERT INTO sessions (id, composite_profile, next_question)
      VALUES (?, ?, ?)
    `).run(id, JSON.stringify(profile), INITIAL_RAPPORT_QUESTION);
  });

  return { id, profile, currentPhase: 'rapport', sketchCount: 0 };
}

function getSession(id) {
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  if (!row) return null;

  const history = db.prepare(
    'SELECT * FROM interview_history WHERE session_id = ? ORDER BY created_at ASC'
  ).all(id);

  const sketches = db.prepare(
    'SELECT id, version, prompt_used, created_at FROM sketches WHERE session_id = ? ORDER BY version ASC'
  ).all(id);

  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    currentPhase: row.current_phase,
    compositeProfile: JSON.parse(row.composite_profile),
    sketchCount: row.sketch_count,
    nextQuestion: row.next_question,
    interviewHistory: history,
    sketches,
  };
}

function updateProfile(sessionId, profile) {
  db.prepare(`
    UPDATE sessions
    SET composite_profile = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(JSON.stringify(profile), sessionId);
}

function updatePhase(sessionId, phase) {
  db.prepare(`
    UPDATE sessions
    SET current_phase = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(phase, sessionId);
}

// Store the next unanswered question so it can be retrieved when a session is resumed.
function updateNextQuestion(sessionId, question) {
  db.prepare(`
    UPDATE sessions
    SET next_question = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(question, sessionId);
}

function addInterviewEntry(sessionId, phase, question, answer, skipped = false) {
  db.prepare(`
    INSERT INTO interview_history (session_id, phase, question, answer, skipped)
    VALUES (?, ?, ?, ?, ?)
  `).run(sessionId, phase, question, answer, skipped ? 1 : 0);
}

// Uses a transaction: reads the current sketch_count, inserts the new sketch,
// and increments the count — all atomically.
function addSketch(sessionId, imageData, promptUsed) {
  return runInTransaction(() => {
    const currentCount = db.prepare(
      'SELECT sketch_count FROM sessions WHERE id = ?'
    ).get(sessionId).sketch_count;

    const newVersion = currentCount + 1;

    db.prepare(`
      INSERT INTO sketches (session_id, version, image_data, prompt_used)
      VALUES (?, ?, ?, ?)
    `).run(sessionId, newVersion, imageData, promptUsed);

    db.prepare(`
      UPDATE sessions
      SET sketch_count = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newVersion, sessionId);

    return newVersion;
  });
}

function getSketch(sessionId, version) {
  return db.prepare(
    'SELECT * FROM sketches WHERE session_id = ? AND version = ?'
  ).get(sessionId, version);
}

function getLatestSketch(sessionId) {
  return db.prepare(
    'SELECT * FROM sketches WHERE session_id = ? ORDER BY version DESC LIMIT 1'
  ).get(sessionId);
}

// Mark a session as completed. Called when the session is exported.
function finalizeSession(sessionId) {
  db.prepare(`
    UPDATE sessions
    SET status = 'completed', updated_at = datetime('now')
    WHERE id = ?
  `).run(sessionId);
}

// Reset a session: clear interview history, reset profile to empty,
// set phase back to 'rapport', restore status to 'active', and
// store the initial rapport question. Implements the
// "witness wants to restart" feature.
function resetSession(sessionId) {
  runInTransaction(() => {
    const profile = createEmptyProfile();
    db.prepare(`
      UPDATE sessions
      SET composite_profile = ?,
          current_phase = 'rapport',
          status = 'active',
          next_question = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(JSON.stringify(profile), INITIAL_RAPPORT_QUESTION, sessionId);

    db.prepare('DELETE FROM interview_history WHERE session_id = ?').run(sessionId);
  });
}

module.exports = {
  INITIAL_RAPPORT_QUESTION,
  runInTransaction,
  createEmptyProfile,
  createSession,
  getSession,
  updateProfile,
  updatePhase,
  updateNextQuestion,
  addInterviewEntry,
  addSketch,
  getSketch,
  getLatestSketch,
  finalizeSession,
  resetSession,
};

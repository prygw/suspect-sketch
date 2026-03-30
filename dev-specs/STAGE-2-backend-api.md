# Stage 2: Backend API & Session Management

## Goal
Build out the full Express API layer — session creation, session retrieval, answer submission, sketch refinement, revert, and export endpoints. Wire up SQLite for persistent session storage with the composite profile data structure. No AI integration yet — this stage uses stub/mock responses so the API contract is solid before plugging in Gemini.

## Prerequisites
- Stage 1 complete (Express server running, SQLite connected, tables created)

---

## Step-by-Step Instructions

### 2.1 — Create the Session Service

This service handles all database operations for sessions.

**Create `server/services/session.js`:**

```js
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
```

---

### 2.2 — Build out the route handlers

**Replace `server/routes/session.js` entirely:**

```js
const express = require('express');
const router = express.Router();
const sessionService = require('../services/session');

/**
 * ===================================================================
 * API Response Shape Reference
 * ===================================================================
 *
 * POST   /api/session
 *   201: { sessionId: string, currentPhase: string, question: string,
 *          sketch: null, profile: object }
 *
 * GET    /api/session/:id
 *   200: Full session object (id, createdAt, updatedAt, status,
 *        currentPhase, compositeProfile, sketchCount, nextQuestion,
 *        interviewHistory, sketches)
 *
 * POST   /api/session/:id/answer
 *   200: { question: string,
 *          sketch: { imageData: "base64", version: number } | null,
 *          profile: object, phase: string,
 *          warning?: string }   // present when AI fell back to backup questions
 *
 * POST   /api/session/:id/refine
 *   200: { question: string,
 *          sketch: { imageData: "base64", version: number } | null,
 *          profile: object, phase: string }
 *
 * POST   /api/session/:id/revert
 *   200: { message: string,
 *          sketch: { imageData: "base64", version: number } | null,
 *          profile: object }
 *
 * POST   /api/session/:id/export
 *   200 (JSON): { sketch: string|null, report: object }
 *   200 (PDF):  binary PDF attachment
 *   200 (PNG):  binary image attachment
 *
 * POST   /api/session/:id/restart
 *   200: { sessionId: string, currentPhase: "rapport",
 *          question: string, sketch: null, profile: object }
 *
 * GET    /api/session/:id/sketch/:version
 *   200: { version: number, imageData: string,
 *          promptUsed: string, createdAt: string }
 *
 * Error responses (all endpoints):
 *   404: { error: "Session not found" } (or "Sketch not found")
 *   400: { error: "<validation message>" }
 *   500: { error: "<failure message>" }
 * ===================================================================
 */

// POST /api/session — Create new interview session
router.post('/', (req, res) => {
  try {
    const session = sessionService.createSession();
    res.status(201).json({
      sessionId: session.id,
      currentPhase: session.currentPhase,
      question: sessionService.INITIAL_RAPPORT_QUESTION,
      sketch: null,
      profile: session.profile,
    });
  } catch (err) {
    console.error('Error creating session:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/session/:id — Get full session state
router.get('/:id', (req, res) => {
  try {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (err) {
    console.error('Error getting session:', err);
    res.status(500).json({ error: 'Failed to retrieve session' });
  }
});

// POST /api/session/:id/answer — Submit witness answer
router.post('/:id/answer', (req, res) => {
  try {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { answer, skip } = req.body;

    if (!answer && !skip) {
      return res.status(400).json({ error: 'Must provide "answer" or "skip: true"' });
    }

    // The current unanswered question is stored in the session.
    const currentQuestion = session.nextQuestion || 'Initial rapport question';

    // Record the answer in interview history
    sessionService.addInterviewEntry(
      req.params.id,
      session.currentPhase,
      currentQuestion,
      skip ? null : answer,
      !!skip
    );

    // STUB: In Stage 3, this will call the interview engine (Gemini)
    // to parse the answer, update the profile, determine the next question,
    // and decide whether to generate a sketch.
    const nextQuestion = `[STUB] Next question for phase: ${session.currentPhase}`;
    const sketchData = null; // Stage 4 will generate sketches

    // Persist the next question so the session can be resumed later.
    sessionService.updateNextQuestion(req.params.id, nextQuestion);

    res.json({
      question: nextQuestion,
      sketch: sketchData,
      profile: session.compositeProfile,
      phase: session.currentPhase,
    });
  } catch (err) {
    console.error('Error processing answer:', err);
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

// POST /api/session/:id/refine — Submit sketch feedback
router.post('/:id/refine', (req, res) => {
  try {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { feedback, confidence } = req.body;

    if (!feedback) {
      return res.status(400).json({ error: 'Must provide "feedback"' });
    }

    // --- Input validation for confidence ---
    if (confidence !== undefined && confidence !== null) {
      const conf = Number(confidence);
      if (isNaN(conf) || !Number.isFinite(conf) || conf < 1 || conf > 10) {
        return res.status(400).json({
          error: 'Confidence must be a number between 1 and 10',
        });
      }
    }

    // Record refinement in profile — wrap profile update + history write
    // in a transaction so they stay in sync.
    sessionService.runInTransaction(() => {
      const profile = session.compositeProfile;
      profile.refinements.push({
        iteration: profile.refinements.length + 1,
        feedback,
        confidence: confidence || null,
        timestamp: new Date().toISOString(),
      });
      sessionService.updateProfile(req.params.id, profile);

      // Record in interview history
      sessionService.addInterviewEntry(
        req.params.id,
        'refinement',
        'What needs to change in this sketch?',
        feedback,
        false
      );
    });

    // Re-read profile after transaction
    const updatedSession = sessionService.getSession(req.params.id);

    // STUB: Stage 4 will regenerate the sketch here
    res.json({
      question: "How about now? Better, worse, or about the same?",
      sketch: null,
      profile: updatedSession.compositeProfile,
      phase: 'refinement',
    });
  } catch (err) {
    console.error('Error processing refinement:', err);
    res.status(500).json({ error: 'Failed to process refinement' });
  }
});

// POST /api/session/:id/revert — Revert to a previous sketch version
router.post('/:id/revert', (req, res) => {
  try {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { version } = req.body;
    if (!version || typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
      return res.status(400).json({ error: 'Version must be a positive integer' });
    }

    const sketch = sessionService.getSketch(req.params.id, version);
    if (!sketch) {
      return res.status(404).json({ error: `Sketch version ${version} not found` });
    }

    res.json({
      message: `Reverted to sketch version ${version}`,
      sketch: { imageData: sketch.image_data, version: sketch.version },
      profile: session.compositeProfile,
    });
  } catch (err) {
    console.error('Error reverting sketch:', err);
    res.status(500).json({ error: 'Failed to revert sketch' });
  }
});

// POST /api/session/:id/export — Export final sketch and report
router.post('/:id/export', (req, res) => {
  try {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Mark session as completed upon export
    sessionService.finalizeSession(req.params.id);

    const latestSketch = sessionService.getLatestSketch(req.params.id);

    // STUB: Stage 8 will generate a proper PDF report
    res.json({
      sketch: latestSketch ? latestSketch.image_data : null,
      report: {
        sessionId: session.id,
        createdAt: session.createdAt,
        compositeProfile: session.compositeProfile,
        interviewHistory: session.interviewHistory,
        sketchCount: session.sketchCount,
        finalConfidence: session.compositeProfile.refinements.length > 0
          ? session.compositeProfile.refinements[session.compositeProfile.refinements.length - 1].confidence
          : null,
      },
    });
  } catch (err) {
    console.error('Error exporting session:', err);
    res.status(500).json({ error: 'Failed to export session' });
  }
});

// POST /api/session/:id/restart — Reset session for witness restart
router.post('/:id/restart', (req, res) => {
  try {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    sessionService.resetSession(req.params.id);

    res.json({
      sessionId: req.params.id,
      currentPhase: 'rapport',
      question: sessionService.INITIAL_RAPPORT_QUESTION,
      sketch: null,
      profile: sessionService.createEmptyProfile(),
    });
  } catch (err) {
    console.error('Error restarting session:', err);
    res.status(500).json({ error: 'Failed to restart session' });
  }
});

// GET /api/session/:id/sketch/:version — Get a specific sketch image
router.get('/:id/sketch/:version', (req, res) => {
  try {
    const version = parseInt(req.params.version, 10);
    if (isNaN(version) || version < 1) {
      return res.status(400).json({ error: 'Version must be a positive integer' });
    }
    const sketch = sessionService.getSketch(req.params.id, version);
    if (!sketch) {
      return res.status(404).json({ error: 'Sketch not found' });
    }
    res.json({
      version: sketch.version,
      imageData: sketch.image_data,
      promptUsed: sketch.prompt_used,
      createdAt: sketch.created_at,
    });
  } catch (err) {
    console.error('Error getting sketch:', err);
    res.status(500).json({ error: 'Failed to retrieve sketch' });
  }
});

module.exports = router;
```

---

### 2.3 — Manual API testing

Use `curl` to verify every endpoint works. Run these in order:

**Create a session:**
```bash
curl -X POST http://localhost:3001/api/session | jq
```
Save the returned `sessionId` — you'll use it below. For these examples, assume it's `abc-123`.

**Get session state:**
```bash
curl http://localhost:3001/api/session/abc-123 | jq
```

**Submit an answer:**
```bash
curl -X POST http://localhost:3001/api/session/abc-123/answer \
  -H 'Content-Type: application/json' \
  -d '{"answer": "I was in a parking lot, it was dark outside"}' | jq
```

**Skip a question:**
```bash
curl -X POST http://localhost:3001/api/session/abc-123/answer \
  -H 'Content-Type: application/json' \
  -d '{"skip": true}' | jq
```

**Submit refinement feedback:**
```bash
curl -X POST http://localhost:3001/api/session/abc-123/refine \
  -H 'Content-Type: application/json' \
  -d '{"feedback": "nose should be wider", "confidence": 5}' | jq
```

**Submit refinement with invalid confidence (should return 400):**
```bash
curl -X POST http://localhost:3001/api/session/abc-123/refine \
  -H 'Content-Type: application/json' \
  -d '{"feedback": "nose should be wider", "confidence": 15}' | jq
# Should return: {"error": "Confidence must be a number between 1 and 10"}
```

**Restart a session:**
```bash
curl -X POST http://localhost:3001/api/session/abc-123/restart | jq
```

**Export session:**
```bash
curl -X POST http://localhost:3001/api/session/abc-123/export | jq
```

**404 for non-existent session:**
```bash
curl http://localhost:3001/api/session/nonexistent | jq
# Should return: {"error": "Session not found"}
```

---

### 2.4 — Add input validation middleware (optional but recommended)

**Create `server/middleware/validate.js`:**

```js
function validateSessionExists(sessionService) {
  return (req, res, next) => {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    req.session = session;
    next();
  };
}

module.exports = { validateSessionExists };
```

This lets you simplify route handlers by removing the repeated null-check pattern. Apply it to routes like:

```js
router.get('/:id', validateSessionExists(sessionService), (req, res) => {
  res.json(req.session);
});
```

---

## Definition of Done

- [ ] `POST /api/session` creates a session and returns a UUID, initial question, and empty profile
- [ ] `GET /api/session/:id` returns the full session state including history, sketches, and `nextQuestion`
- [ ] `POST /api/session/:id/answer` records an answer in `interview_history` and returns a stub next question
- [ ] `POST /api/session/:id/answer` persists the next question in the `next_question` column
- [ ] `POST /api/session/:id/answer` with `{"skip": true}` records a skipped entry
- [ ] `POST /api/session/:id/refine` records feedback in the composite profile's `refinements` array
- [ ] `POST /api/session/:id/refine` validates that `confidence` (if provided) is a number between 1 and 10
- [ ] `POST /api/session/:id/revert` returns the specified sketch version (or 404 if not found)
- [ ] `POST /api/session/:id/export` returns the composite profile and interview history, and marks session as 'completed'
- [ ] `POST /api/session/:id/restart` clears history, resets profile, sets phase to 'rapport', returns initial question
- [ ] `GET /api/session/:id/sketch/:version` returns a specific sketch
- [ ] `GET /api/session/:id/sketch/:version` returns 400 for non-numeric or non-positive version values (e.g., `/sketch/abc`, `/sketch/0`, `/sketch/-1`)
- [ ] `POST /api/session/:id/revert` returns 400 for non-integer or non-positive version values (e.g., `version: -1`, `version: 0.5`)
- [ ] All endpoints return 404 for non-existent sessions
- [ ] All endpoints return 400 for missing required fields
- [ ] All endpoints return 500 with error message on unexpected errors
- [ ] Multi-step DB operations (addSketch, refine, resetSession, createSession) use transactions
- [ ] Database has entries in `sessions`, `interview_history` tables after testing
- [ ] `sessions` table includes a `next_question` column storing the current unanswered question

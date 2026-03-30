# Stage 1: Project Scaffolding & Setup

## Goal
Set up the monorepo structure with a React (Vite) frontend, Express backend, and SQLite database. By the end of this stage, you should be able to run both the client and server, have them communicate via a proxy, and have a working database connection.

---

## Prerequisites

- Node.js v18+ installed
- npm or yarn
- A code editor
- Basic familiarity with React, Express, and SQL

---

## Step-by-Step Instructions

### 1.1 — Initialize the project root

From the `glitchproject/` directory:

```bash
npm init -y
```

Edit the generated `package.json` to add workspace scripts:

```json
{
  "name": "witnesssketch",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

Install the root dependency:

```bash
npm install
```

---

### 1.2 — Scaffold the React frontend

```bash
npm create vite@latest client -- --template react
cd client
npm install
npm install tailwindcss @tailwindcss/vite
```

**Configure Tailwind with Vite** — edit `client/vite.config.js`:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

**Add Tailwind to your CSS** — replace the contents of `client/src/index.css` with:

```css
@import "tailwindcss";
```

**Clean up the starter files:**
- Delete `client/src/App.css`
- Replace `client/src/App.jsx` with a minimal placeholder:

```jsx
function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <h1 className="text-3xl font-bold text-gray-800">WitnessSketch</h1>
    </div>
  );
}

export default App;
```

**Verify it works:**

```bash
npm run dev
```

You should see the Vite dev server on `http://localhost:3000` with "WitnessSketch" displayed and Tailwind styles applied.

---

### 1.3 — Scaffold the Express backend

From the project root:

```bash
mkdir -p server/routes server/services server/prompts server/db
cd server
npm init -y
npm install express cors better-sqlite3 uuid dotenv
npm install --save-dev nodemon
```

**Edit `server/package.json`** to add the dev script:

```json
{
  "scripts": {
    "dev": "nodemon index.js",
    "start": "node index.js"
  }
}
```

**Create `server/.env`:**

```
PORT=3001
GEMINI_API_KEY=your_key_here
```

**Create `server/index.js`:**

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sessionRoutes = require('./routes/session');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/session', sessionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Create `server/routes/session.js`** (stub):

```js
const express = require('express');
const router = express.Router();

// POST /api/session — Create a new session
router.post('/', (req, res) => {
  res.json({ sessionId: 'stub-id', message: 'Session created' });
});

// GET /api/session/:id — Get session state
router.get('/:id', (req, res) => {
  res.json({ sessionId: req.params.id, message: 'Session retrieved' });
});

module.exports = router;
```

**Verify it works:**

```bash
npm run dev
```

Then in another terminal:

```bash
curl http://localhost:3001/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

---

### 1.4 — Set up SQLite database

**Create `server/db/sqlite.js`:**

```js
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

module.exports = db;
```

**Test the database** by adding a quick check in `server/index.js` (add this before `app.listen`):

```js
// Verify DB connection
const db = require('./db/sqlite');
const testRow = db.prepare('SELECT 1 as test').get();
console.log('Database connected:', testRow.test === 1 ? 'OK' : 'FAIL');
```

---

### 1.5 — Verify the full-stack proxy

With both client and server running, verify the proxy works from the React app. Temporarily update `client/src/App.jsx`:

```jsx
import { useEffect, useState } from 'react';

function App() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold text-gray-800">WitnessSketch</h1>
      {health ? (
        <p className="text-green-600">Server connected: {health.timestamp}</p>
      ) : (
        <p className="text-red-600">Connecting to server...</p>
      )}
    </div>
  );
}

export default App;
```

Run from the project root:

```bash
npm run dev
```

You should see both the client (port 3000) and server (port 3001) start. The React app should show a green "Server connected" message.

---

### 1.6 — Add `.gitignore`

Create `glitchproject/.gitignore`:

```
node_modules/
server/data/
server/.env
client/dist/
.DS_Store
```

---

## File Checklist

After this stage, your project should look like:

```
glitchproject/
├── package.json               # Root with concurrently scripts
├── .gitignore
├── SPEC.md
├── client/
│   ├── package.json
│   ├── vite.config.js         # With proxy and Tailwind
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── index.css           # Tailwind import
│       └── App.jsx             # Placeholder with health check
├── server/
│   ├── package.json
│   ├── .env                    # GEMINI_API_KEY placeholder
│   ├── index.js                # Express entry point
│   ├── routes/
│   │   └── session.js          # Stub routes
│   ├── services/               # Empty, populated in later stages
│   ├── prompts/                # Empty, populated in later stages
│   └── db/
│       └── sqlite.js           # Database setup with tables
└── dev-specs/
    └── ...
```

## Definition of Done

- [ ] `npm run dev` from root starts both client and server
- [ ] Client loads on `http://localhost:3000` with Tailwind styles working
- [ ] Server responds to `GET /api/health` on port 3001
- [ ] Client successfully fetches `/api/health` through the Vite proxy (green message shown)
- [ ] SQLite database file is created at `server/data/witnesssketch.db`
- [ ] `sessions`, `interview_history`, and `sketches` tables exist
- [ ] `.gitignore` excludes `node_modules/`, `server/data/`, and `server/.env`

# Stage 9: Polish & Deployment

## Goal
Finalize the application for production use on a personal server. This includes session cleanup, error handling, production build configuration, and full deployment behind Nginx + Cloudflare.

## Prerequisites
- Stages 1-8 complete (full application working end-to-end)
- A server (e.g., Ubuntu VPS) with Node.js 18+, npm, and Nginx installed
- A domain name pointed to Cloudflare DNS

---

## Step-by-Step Instructions

### 9.1 — Session auto-expiry

Sessions contain witness data and should not persist indefinitely.

**Add to `server/db/sqlite.js`:**

```js
// Run cleanup on server start and every 6 hours.
// All three deletes must be atomic: wrap in a transaction so that if the
// process is interrupted mid-cleanup, no partial deletes are committed
// and no orphaned history/sketch rows are left without a parent session.
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
```

---

### 9.2 — Error handling middleware

**Add a global error handler to `server/index.js`:**

```js
// At the end, after all routes
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});
```

---

### 9.3 — Production build configuration

**Add a build script to `client/package.json`:**

The Vite build is already configured by default. Verify:

```bash
cd client
npm run build
```

This produces a `client/dist/` directory with the static frontend build.

**Serve the static frontend from Express in production.**

**Add to `server/index.js`:**

```js
const path = require('path');

// In production, serve the React build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

  // All non-API routes serve the React app (for client-side routing)
  app.get('*path', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
    }
  });
}
```

**Add production start scripts to the root `package.json`:**

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "build": "cd client && npm run build",
    "start": "cd server && NODE_ENV=production node index.js"
  }
}
```

---

### 9.4 — Environment variable validation

**Add startup validation to `server/index.js`:**

```js
// Validate required env vars
const REQUIRED_ENV = ['GEMINI_API_KEY'];
const PLACEHOLDER_VALUES = ['your_key_here', 'your-key-here', 'your_api_key', 'sk-xxx', ''];
for (const key of REQUIRED_ENV) {
  const value = (process.env[key] || '').trim();
  if (!value || PLACEHOLDER_VALUES.includes(value.toLowerCase())) {
    console.error(`Missing or placeholder value for required environment variable: ${key}`);
    console.error(`Please set a valid ${key} in server/.env`);
    process.exit(1);
  }
}
```

This rejects both missing and placeholder values (e.g., the default `your_key_here` in the `.env` template).

---

### 9.5 — Frontend error boundary

**Create `client/src/components/ErrorBoundary.jsx`:**

```jsx
import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4">
              An unexpected error occurred. Please refresh the page to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

**Wrap the app in `client/src/main.jsx`:**

```jsx
import ErrorBoundary from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
```

---

### 9.6 — PM2 process management

PM2 keeps the Node.js app running, restarts it on crash, and manages logs.

**Install PM2 globally:**

```bash
npm install -g pm2
```

**Create `ecosystem.config.js` in the project root:**

```js
module.exports = {
  apps: [
    {
      name: 'witnesssketch',
      script: 'server/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      restart_delay: 1000,
      max_restarts: 10,
    },
  ],
};
```

**Useful PM2 commands:**

```bash
pm2 start ecosystem.config.js   # Start the app
pm2 status                       # Check running processes
pm2 logs witnesssketch           # View logs
pm2 restart witnesssketch        # Restart the app
pm2 stop witnesssketch           # Stop the app
pm2 save                         # Save current process list
pm2 startup                      # Generate startup script (run on boot)
```

---

### 9.7 — Nginx reverse proxy configuration

Nginx sits in front of the Node.js app and serves static files directly. Cloudflare handles SSL, so Nginx listens on port 80.

**Create `/etc/nginx/sites-available/witnesssketch`:**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    client_max_body_size 10m;

    # Proxy API requests to the Node.js app
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;

        # Proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (in case needed)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Serve React static build for all other routes
    location / {
        root /home/ubuntu/Desktop/glitchproject/client/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

**Enable the site and reload Nginx:**

```bash
sudo ln -s /etc/nginx/sites-available/witnesssketch /etc/nginx/sites-enabled/
sudo nginx -t          # Test config for syntax errors
sudo systemctl reload nginx
```

---

### 9.8 — Cloudflare setup

Cloudflare provides DNS, SSL/TLS termination, and optional caching. Complete these steps in the Cloudflare dashboard:

- [ ] Add your domain to Cloudflare (it will prompt you to update nameservers at your registrar)
- [ ] Create an **A record** pointing to your server's public IP address (proxy status: Proxied/orange cloud)
- [ ] Go to **SSL/TLS** settings and set encryption mode to **Full** (not "Full Strict", since we use HTTP between Cloudflare and Nginx)
- [ ] Under **SSL/TLS > Edge Certificates**, enable **Always Use HTTPS**
- [ ] (Optional) Under **Caching > Configuration**, set caching level to "Standard" to cache static assets (JS, CSS, images)

---

### 9.9 — Final smoke test checklist

Run through the entire application end-to-end:

1. Start the app with `npm run dev`
2. Landing page loads with all sections
3. Click "Start a Witness Interview" — session is created, navigates to interview
4. Answer 15+ questions across all phases
5. Verify phase transitions happen correctly in the status bar
6. Verify sketches appear after free recall phase
7. Verify sketch updates during feature recall
8. Enter refinement phase — submit corrections and a confidence rating
9. Click "Finish & Export" — modal appears
10. Download PDF — verify all sections are present and correct
11. Download PNG — verify it's the final sketch
12. Go back to landing page and start a new session — verify it's clean
13. Try accessing a non-existent session ID — verify error handling

---

### 9.10 — Deployment checklist

Step-by-step commands to deploy the app from scratch on the server:

```bash
# 1. Clone the repo
git clone <your-repo-url> /home/ubuntu/Desktop/glitchproject
cd /home/ubuntu/Desktop/glitchproject

# 2. Install dependencies (root, client, server)
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# 3. Create server/.env with your Gemini API key
echo "GEMINI_API_KEY=your-key-here" > server/.env

# 4. Build the frontend
cd client && npm run build && cd ..

# 5. Start the app with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the printed command to enable auto-start on reboot

# 6. Set up Nginx
sudo cp /etc/nginx/sites-available/witnesssketch /etc/nginx/sites-available/witnesssketch.bak 2>/dev/null
sudo tee /etc/nginx/sites-available/witnesssketch > /dev/null << 'NGINX'
server {
    listen 80;
    server_name yourdomain.com;

    client_max_body_size 10m;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        root /home/ubuntu/Desktop/glitchproject/client/dist;
        try_files $uri $uri/ /index.html;
    }
}
NGINX
sudo ln -sf /etc/nginx/sites-available/witnesssketch /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 7. Verify
curl http://localhost:3001/api/health
# Then open your domain in a browser and confirm the app loads
```

---

## Definition of Done

- [ ] Sessions older than 30 days are automatically deleted (sessions, history, and sketches)
- [ ] Cleanup runs on server start and every 6 hours
- [ ] Session cleanup runs atomically — all three table deletes are wrapped in a single `db.transaction()` so a crash mid-cleanup cannot leave orphaned rows
- [ ] Global error handler catches unhandled exceptions without leaking stack traces in production
- [ ] `npm run build` produces a working static build in `client/dist/`
- [ ] `npm start` serves the app in production mode (static files + API from one server)
- [ ] Missing or placeholder `GEMINI_API_KEY` (e.g., `your_key_here`) causes a clear error on startup, not a runtime crash
- [ ] Frontend ErrorBoundary catches React errors and shows a recovery UI
- [ ] PM2 is running the app and will restart it on crash
- [ ] `pm2 startup` is configured so the app starts on server reboot
- [ ] Nginx is serving the React build and proxying `/api` to the Node.js app
- [ ] Domain is configured in Cloudflare with an A record pointing to the server
- [ ] Cloudflare SSL/TLS mode is set to "Full" and "Always Use HTTPS" is enabled
- [ ] App is accessible via the domain in a browser (full end-to-end smoke test passes)

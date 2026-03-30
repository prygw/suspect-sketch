require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const sessionRoutes = require('./routes/session');

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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: { error: 'Too many requests, please slow down' },
});

app.use('/api/', apiLimiter);

// Routes
app.use('/api/session', sessionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

// Verify DB connection
const db = require('./db/sqlite');
const testRow = db.prepare('SELECT 1 as test').get();
console.log('Database connected:', testRow.test === 1 ? 'OK' : 'FAIL');

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Global error handler (must be after all routes)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

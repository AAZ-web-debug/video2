require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const seedDatabase = require('./db/seed');
const videoRoutes = require('./routes/videoRoutes');
const VideoController = require('./controllers/videoController');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend assets
const publicPath = path.resolve(__dirname, '../public');
app.use(express.static(publicPath));

// API Routes
app.use('/api/videos', videoRoutes);
app.get('/api/character', VideoController.getCharacter);
app.get('/api/style-guide', VideoController.getStyleGuide);

// Health / Info endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    module: 'AlgoVerse Person 2 — Video Module',
    version: '1.0.0',
    character: 'Ada',
    timestamp: new Date().toISOString()
  });
});

// Fallback for SPA frontend routing
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'Endpoint not found' });
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Seed data and start server
function startServer() {
  seedDatabase();
  const server = app.listen(PORT, () => {
    console.log(`[AlgoVerse Video Module] Running at http://localhost:${PORT}`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };

const express = require('express');
const router = express.Router();
const VideoController = require('../controllers/videoController');

// Gateway recommendations (2 pre-made + 1 freshly generated)
router.get('/gateway/recommendations', VideoController.getGatewayRecommendations);

// List all videos
router.get('/', VideoController.getAllVideos);

// Get specific video by ID
router.get('/:id', VideoController.getVideoById);

// Generate script (shot list)
router.post('/generate/script', VideoController.generateScript);

// Generate full video (asynchronous job)
router.post('/generate', VideoController.generateVideo);

// Submit structured feedback
router.post('/:id/feedback', VideoController.submitFeedback);

// Regenerate video (enforces rolling 24h limit)
router.post('/:id/regenerate', VideoController.regenerateVideo);

// Generation job / video status
router.get('/:id/status', VideoController.getGenerationStatus);

// Shot visual asset
router.get('/:id/shots/:shotNumber/visual', VideoController.getShotVisual);

// Streamable video package manifest
router.get('/:id/stream', VideoController.getVideoStreamManifest);

// User limit status
router.get('/limits/:userId/:topicId', VideoController.getLimitStatus);

module.exports = router;

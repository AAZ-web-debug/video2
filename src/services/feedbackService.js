const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const { getAdjustmentForCategory, ALLOWED_FEEDBACK_CATEGORIES } = require('../config/feedback_adjustments');

class FeedbackService {
  static submitFeedback({ videoId, userId, category }) {
    if (!videoId) {
      throw new Error('videoId is required');
    }
    if (!userId) {
      throw new Error('userId is required');
    }

    const { category: validCategory, adjustmentInstruction } = getAdjustmentForCategory(category);

    // Verify video exists
    const video = db.prepare('SELECT id FROM videos WHERE id = ?').get(videoId);
    if (!video) {
      const err = new Error(`Video with ID "${videoId}" not found`);
      err.statusCode = 404;
      throw err;
    }

    const feedbackId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO video_feedbacks (id, video_id, user_id, category, adjustment_instruction, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(feedbackId, videoId, userId, validCategory, adjustmentInstruction, now);

    return {
      feedbackId,
      videoId,
      userId,
      category: validCategory,
      adjustmentInstruction,
      createdAt: now
    };
  }

  static getFeedbacksForVideo(videoId) {
    return db.prepare('SELECT * FROM video_feedbacks WHERE video_id = ? ORDER BY created_at DESC').all(videoId);
  }

  static getLatestFeedbackForVideo(videoId) {
    return db.prepare('SELECT * FROM video_feedbacks WHERE video_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1').get(videoId);
  }

  static getAllowedCategories() {
    return ALLOWED_FEEDBACK_CATEGORIES;
  }
}

module.exports = FeedbackService;

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const FeedbackService = require('../services/feedbackService');
const { FEEDBACK_ADJUSTMENTS, ALLOWED_FEEDBACK_CATEGORIES } = require('../config/feedback_adjustments');
const db = require('../db/connection');

describe('Structured Feedback System', () => {
  const testVideoId = 'arrays-what-is-an-array';
  const testUserId = 'test-feedback-user';

  beforeEach(() => {
    db.prepare('DELETE FROM video_feedbacks WHERE user_id = ?').run(testUserId);
  });

  test('accepts all 5 allowed categories and maps them to exact predefined instructions', () => {
    for (const category of ALLOWED_FEEDBACK_CATEGORIES) {
      const result = FeedbackService.submitFeedback({
        videoId: testVideoId,
        userId: testUserId,
        category
      });

      assert.strictEqual(result.category, category);
      assert.strictEqual(result.adjustmentInstruction, FEEDBACK_ADJUSTMENTS[category]);
      assert.ok(result.feedbackId);
    }
  });

  test('rejects arbitrary free-text complaints or unauthorized categories', () => {
    const invalidCategories = [
      'make it funny',
      'terrible music',
      'add random explosions',
      'unrestricted user complaint text',
      ''
    ];

    for (const invalidCat of invalidCategories) {
      assert.throws(
        () => FeedbackService.submitFeedback({
          videoId: testVideoId,
          userId: testUserId,
          category: invalidCat
        }),
        /Invalid feedback category/
      );
    }
  });

  test('retrieves the latest feedback for a video to influence next generation', () => {
    FeedbackService.submitFeedback({
      videoId: testVideoId,
      userId: testUserId,
      category: 'pacing'
    });

    FeedbackService.submitFeedback({
      videoId: testVideoId,
      userId: testUserId,
      category: 'narration clarity'
    });

    const latest = FeedbackService.getLatestFeedbackForVideo(testVideoId);
    assert.strictEqual(latest.category, 'narration clarity');
    assert.strictEqual(latest.adjustment_instruction, FEEDBACK_ADJUSTMENTS['narration clarity']);
  });
});

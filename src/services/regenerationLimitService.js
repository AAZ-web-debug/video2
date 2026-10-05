const SharedRegenerationState = require('../models/SharedRegenerationState');

const MAX_REGENERATIONS = 3;
const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

class RegenerationLimitService {
  /**
   * Check status without incrementing.
   */
  static checkLimit(userId, topicId) {
    const record = SharedRegenerationState.get(userId, topicId);
    if (!record) {
      return {
        allowed: true,
        attemptCount: 0,
        remainingAttempts: MAX_REGENERATIONS,
        resetsInMs: 0
      };
    }

    const lastAttemptTime = new Date(record.last_attempt_at).getTime();
    const elapsed = Date.now() - lastAttemptTime;

    if (elapsed >= ROLLING_WINDOW_MS) {
      return {
        allowed: true,
        attemptCount: 0,
        remainingAttempts: MAX_REGENERATIONS,
        resetsInMs: 0
      };
    }

    const remaining = Math.max(0, MAX_REGENERATIONS - record.attempt_count);
    const resetsInMs = Math.max(0, ROLLING_WINDOW_MS - elapsed);

    return {
      allowed: record.attempt_count < MAX_REGENERATIONS,
      attemptCount: record.attempt_count,
      remainingAttempts: remaining,
      resetsInMs
    };
  }

  /**
   * Atomically verify limit and increment attempt count.
   * Throws if limit exceeded within rolling 24h.
   */
  static verifyAndConsumeAttempt(userId, topicId) {
    const record = SharedRegenerationState.get(userId, topicId);
    const now = new Date();
    const nowIso = now.toISOString();

    if (!record) {
      // First attempt
      SharedRegenerationState.upsert(userId, topicId, 1, nowIso);
      return {
        allowed: true,
        attemptCount: 1,
        remainingAttempts: MAX_REGENERATIONS - 1,
        resetsInMs: ROLLING_WINDOW_MS
      };
    }

    const lastAttemptTime = new Date(record.last_attempt_at).getTime();
    const elapsed = now.getTime() - lastAttemptTime;

    // Has 24 hours passed?
    if (elapsed >= ROLLING_WINDOW_MS) {
      // Reset window with attempt count 1
      SharedRegenerationState.upsert(userId, topicId, 1, nowIso);
      return {
        allowed: true,
        attemptCount: 1,
        remainingAttempts: MAX_REGENERATIONS - 1,
        resetsInMs: ROLLING_WINDOW_MS
      };
    }

    // Still in the 24-hour window: check attempt count
    if (record.attempt_count >= MAX_REGENERATIONS) {
      const resetsInMs = ROLLING_WINDOW_MS - elapsed;
      const hours = Math.ceil(resetsInMs / (1000 * 60 * 60));
      const error = new Error(`Regeneration limit reached: maximum ${MAX_REGENERATIONS} attempts per rolling 24 hours. Resets in approximately ${hours} hour(s).`);
      error.statusCode = 429;
      error.resetsInMs = resetsInMs;
      error.attemptCount = record.attempt_count;
      throw error;
    }

    // Increment count within window
    const newCount = record.attempt_count + 1;
    SharedRegenerationState.upsert(userId, topicId, newCount, nowIso);

    return {
      allowed: true,
      attemptCount: newCount,
      remainingAttempts: MAX_REGENERATIONS - newCount,
      resetsInMs: ROLLING_WINDOW_MS - elapsed
    };
  }
}

module.exports = RegenerationLimitService;

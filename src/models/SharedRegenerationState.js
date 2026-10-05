const db = require('../db/connection');

class SharedRegenerationState {
  static get(userId, topicId) {
    return db.prepare(`
      SELECT user_id, topic_id, attempt_count, last_attempt_at
      FROM shared_regeneration_states
      WHERE user_id = ? AND topic_id = ?
    `).get(userId, topicId);
  }

  static upsert(userId, topicId, attemptCount, lastAttemptAt) {
    db.prepare(`
      INSERT INTO shared_regeneration_states (user_id, topic_id, attempt_count, last_attempt_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, topic_id) DO UPDATE SET
        attempt_count = excluded.attempt_count,
        last_attempt_at = excluded.last_attempt_at
    `).run(userId, topicId, attemptCount, lastAttemptAt);

    return this.get(userId, topicId);
  }

  static reset(userId, topicId) {
    const now = new Date().toISOString();
    return this.upsert(userId, topicId, 0, now);
  }
}

module.exports = SharedRegenerationState;

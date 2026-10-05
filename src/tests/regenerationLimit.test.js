const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const db = require('../db/connection');
const RegenerationLimitService = require('../services/regenerationLimitService');
const SharedRegenerationState = require('../models/SharedRegenerationState');

describe('Shared Regeneration Limit (Max 3 / 24hr Window)', () => {
  const userA = 'test-user-alpha';
  const userB = 'test-user-beta';
  const topicArrays = 'Arrays';
  const topicLinkedLists = 'LinkedLists';

  beforeEach(() => {
    // Clear test records
    db.prepare("DELETE FROM shared_regeneration_states WHERE user_id LIKE 'test-user-%'").run();
  });

  test('allows first, second, and third regenerations, then blocks the fourth', () => {
    // Attempt 1
    const res1 = RegenerationLimitService.verifyAndConsumeAttempt(userA, topicArrays);
    assert.strictEqual(res1.allowed, true);
    assert.strictEqual(res1.attemptCount, 1);
    assert.strictEqual(res1.remainingAttempts, 2);

    // Attempt 2
    const res2 = RegenerationLimitService.verifyAndConsumeAttempt(userA, topicArrays);
    assert.strictEqual(res2.allowed, true);
    assert.strictEqual(res2.attemptCount, 2);
    assert.strictEqual(res2.remainingAttempts, 1);

    // Attempt 3
    const res3 = RegenerationLimitService.verifyAndConsumeAttempt(userA, topicArrays);
    assert.strictEqual(res3.allowed, true);
    assert.strictEqual(res3.attemptCount, 3);
    assert.strictEqual(res3.remainingAttempts, 0);

    // Attempt 4 -> MUST BE BLOCKED
    assert.throws(
      () => RegenerationLimitService.verifyAndConsumeAttempt(userA, topicArrays),
      (err) => {
        assert.strictEqual(err.statusCode, 429);
        assert.match(err.message, /Regeneration limit reached/);
        return true;
      }
    );
  });

  test('resets attempt counter after 24 hours have passed', () => {
    // Simulate 3 attempts recorded 25 hours ago
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    SharedRegenerationState.upsert(userA, topicArrays, 3, twentyFiveHoursAgo);

    // Check status
    const status = RegenerationLimitService.checkLimit(userA, topicArrays);
    assert.strictEqual(status.allowed, true);
    assert.strictEqual(status.attemptCount, 0);

    // Consuming attempt resets counter to 1
    const res = RegenerationLimitService.verifyAndConsumeAttempt(userA, topicArrays);
    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.attemptCount, 1);
    assert.strictEqual(res.remainingAttempts, 2);
  });

  test('maintains independent limits for different topics for the same user', () => {
    // Exhaust topic Arrays
    RegenerationLimitService.verifyAndConsumeAttempt(userA, topicArrays);
    RegenerationLimitService.verifyAndConsumeAttempt(userA, topicArrays);
    RegenerationLimitService.verifyAndConsumeAttempt(userA, topicArrays);

    assert.throws(
      () => RegenerationLimitService.verifyAndConsumeAttempt(userA, topicArrays),
      /Regeneration limit reached/
    );

    // Different topic should have full 3 attempts available
    const linkedListRes = RegenerationLimitService.verifyAndConsumeAttempt(userA, topicLinkedLists);
    assert.strictEqual(linkedListRes.allowed, true);
    assert.strictEqual(linkedListRes.attemptCount, 1);
  });

  test('maintains independent limits for different users for the same topic', () => {
    // Exhaust user A
    RegenerationLimitService.verifyAndConsumeAttempt(userA, topicArrays);
    RegenerationLimitService.verifyAndConsumeAttempt(userA, topicArrays);
    RegenerationLimitService.verifyAndConsumeAttempt(userA, topicArrays);

    // User B should still be allowed
    const userBRes = RegenerationLimitService.verifyAndConsumeAttempt(userB, topicArrays);
    assert.strictEqual(userBRes.allowed, true);
    assert.strictEqual(userBRes.attemptCount, 1);
  });
});

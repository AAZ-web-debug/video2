const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { app } = require('../server');
const seedDatabase = require('../db/seed');
const db = require('../db/connection');

let server;
let baseUrl;

describe('Video Module API Integration', () => {
  before(async () => {
    seedDatabase();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(() => new Promise((resolve) => {
    if (server.closeAllConnections) server.closeAllConnections();
    server.close(resolve);
  }));

  test('GET /api/videos returns the seeded reference videos', async () => {
    const res = await fetch(`${baseUrl}/api/videos`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.count >= 6, `Expected at least 6 videos, found ${json.count}`);

    // Verify first reference video
    const v1 = json.data.find(v => v.id === 'arrays-what-is-an-array');
    assert.ok(v1);
    assert.strictEqual(v1.topic_id, 'Arrays');
    assert.strictEqual(v1.concept, 'What is an Array?');
    assert.strictEqual(v1.source_type, 'REFERENCE');
  });

  test('GET /api/videos/gateway/recommendations returns 2 pre-made + 1 generated video', async () => {
    const res = await fetch(`${baseUrl}/api/videos/gateway/recommendations?topic=Arrays`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.pre_made_videos.length, 2);
    assert.ok(json.data.generated_video);
  });

  test('GET /api/videos/:id returns complete video with structured shots', async () => {
    const res = await fetch(`${baseUrl}/api/videos/arrays-what-is-an-array`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.id, 'arrays-what-is-an-array');
    assert.strictEqual(json.data.shots.length, 9);
    assert.strictEqual(json.data.shots[0].shot_number, 1);
    assert.ok(json.data.shots[0].visual_description);
    assert.ok(json.data.shots[0].narration_text);
    assert.ok(json.data.shots[0].duration_seconds > 0);
  });

  test('POST /api/videos/generate/script validates inputs and generates strict shot list', async () => {
    const res = await fetch(`${baseUrl}/api/videos/generate/script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'Arrays',
        concept: 'Index-Based Access',
        target_duration: 75
      })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.target_duration_seconds, 75);
    assert.ok(json.data.shots.length >= 4);

    // Sum of durations must equal target_duration_seconds
    const sum = json.data.shots.reduce((a, s) => a + s.duration_seconds, 0);
    assert.strictEqual(sum, 75);
  });

  test('POST /api/videos/generate queues an asynchronous generation job', async () => {
    const res = await fetch(`${baseUrl}/api/videos/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'test-api-user-1',
        topic: 'Arrays',
        concept: 'Search',
        target_duration: 75,
        skip_encode: true
      })
    });
    assert.strictEqual(res.status, 202);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.job_id);
    assert.ok(json.video_id);
    assert.ok(['QUEUED', 'GENERATING_SCRIPT', 'COMPLETED'].includes(json.status));

    // Verify status endpoint returns the queued/processing job
    const statusRes = await fetch(`${baseUrl}/api/videos/${json.video_id}/status?job_id=${json.job_id}`);
    const statusJson = await statusRes.json();
    assert.strictEqual(statusJson.success, true);
    assert.ok(statusJson.status);
  });

  test('POST /api/videos/:id/feedback validates category and records structured feedback', async () => {
    const res = await fetch(`${baseUrl}/api/videos/arrays-what-is-an-array/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'test-api-user-2',
        category: 'pacing'
      })
    });
    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.category, 'pacing');
    assert.match(json.data.adjustmentInstruction, /shortening slow shots/);
  });

  test('POST /api/videos/:id/regenerate blocks after 3 attempts with 429', async () => {
    const testRegenUser = 'test-regen-cap-user';
    // Clear state
    db.prepare('DELETE FROM shared_regeneration_states WHERE user_id = ?').run(testRegenUser);

    // 1st regen -> 202
    const r1 = await fetch(`${baseUrl}/api/videos/arrays-what-is-an-array/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: testRegenUser, skip_encode: true })
    });
    assert.strictEqual(r1.status, 202);

    // 2nd regen -> 202
    const r2 = await fetch(`${baseUrl}/api/videos/arrays-what-is-an-array/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: testRegenUser, skip_encode: true })
    });
    assert.strictEqual(r2.status, 202);

    // 3rd regen -> 202
    const r3 = await fetch(`${baseUrl}/api/videos/arrays-what-is-an-array/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: testRegenUser, skip_encode: true })
    });
    assert.strictEqual(r3.status, 202);

    // 4th regen -> MUST BE 429 BLOCKED
    const r4 = await fetch(`${baseUrl}/api/videos/arrays-what-is-an-array/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: testRegenUser, skip_encode: true })
    });
    assert.strictEqual(r4.status, 429);
    const json4 = await r4.json();
    assert.strictEqual(json4.success, false);
    assert.match(json4.error, /Regeneration limit reached/);
    assert.strictEqual(json4.attempt_count, 3);
    assert.ok(json4.current_video);
  });
});

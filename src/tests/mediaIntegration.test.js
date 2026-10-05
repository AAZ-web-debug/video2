const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const cp = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const { app } = require('../server');
const db = require('../db/connection');
const Video = require('../models/Video');
const FeedbackService = require('../services/feedbackService');
const JobQueueService = require('../services/jobQueueService');
const ScriptGenerationService = require('../services/scriptGenerationService');

let server;
let baseUrl;

describe('Real Media & MP4 Video Assembly Integration', () => {
  before(async () => {
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

  const expectedVideos = [
    { filename: 'what-is-an-array.mp4', expectedDuration: 75, concept: 'What is an Array?' },
    { filename: 'index-based-access.mp4', expectedDuration: 70, concept: 'Index-Based Access' },
    { filename: 'insertion.mp4', expectedDuration: 80, concept: 'Insertion' },
    { filename: 'deletion.mp4', expectedDuration: 75, concept: 'Deletion' },
    { filename: 'traversal.mp4', expectedDuration: 72, concept: 'Traversal' },
    { filename: 'search.mp4', expectedDuration: 78, concept: 'Search' }
  ];

  test('all six reference MP4 files exist on disk with valid file size (>500KB)', () => {
    const videoDir = path.resolve(__dirname, '../../public/videos/arrays');
    for (const v of expectedVideos) {
      const filePath = path.join(videoDir, v.filename);
      assert.ok(fs.existsSync(filePath), `Expected file ${v.filename} to exist on disk`);
      const stat = fs.statSync(filePath);
      assert.ok(stat.size > 500000, `Expected ${v.filename} to be > 500KB, got ${stat.size} bytes`);
    }
  });

  test('each reference MP4 file contains valid H.264 video and AAC audio streams', () => {
    const videoDir = path.resolve(__dirname, '../../public/videos/arrays');
    for (const v of expectedVideos) {
      const filePath = path.join(videoDir, v.filename);
      let probeOutput = '';
      try {
        cp.execFileSync(ffmpegPath, ['-i', filePath], { stdio: 'pipe' });
      } catch (err) {
        // FFmpeg exits with code 1 on -i without output, but outputs stream information to stderr
        probeOutput = err.stderr ? err.stderr.toString() : '';
      }

      assert.match(probeOutput, /Video: h264/, `${v.filename} must contain an H.264 video stream`);
      assert.match(probeOutput, /Audio: aac/, `${v.filename} must contain an AAC audio stream`);
      assert.match(probeOutput, /Duration: 00:01:/, `${v.filename} duration must be 60-90s (around 1 minute)`);
    }
  });

  test('database records for reference videos link directly to playable MP4 URLs', () => {
    const videos = Video.getAll({ topicId: 'Arrays', sourceType: 'REFERENCE' });
    assert.strictEqual(videos.length, 6);

    for (const video of videos) {
      assert.ok(video.video_url.startsWith('/videos/arrays/'), `Video ${video.id} url must point to /videos/arrays/`);
      assert.ok(video.video_url.endsWith('.mp4'), `Video ${video.id} url must end with .mp4`);
      assert.ok(video.duration_seconds >= 60 && video.duration_seconds <= 90);
    }
  });

  test('frontend static server serves playable reference MP4 with video/mp4 MIME type', async () => {
    const res = await fetch(`${baseUrl}/videos/arrays/what-is-an-array.mp4`, { method: 'HEAD' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'video/mp4');
    const contentLength = parseInt(res.headers.get('content-length'), 10);
    assert.ok(contentLength > 500000, 'Content length should be > 500KB');
  });

  test('feedback category modifies the prompt and reaches the next generation request', async () => {
    const testVideoId = 'arrays-what-is-an-array';
    const testUserId = 'test-feedback-verify-user';

    // Submit 'pacing' feedback
    const feedbackResult = FeedbackService.submitFeedback({
      videoId: testVideoId,
      userId: testUserId,
      category: 'pacing'
    });

    assert.ok(feedbackResult.adjustmentInstruction);

    // Latest feedback retrieval
    const latestFeedback = FeedbackService.getLatestFeedbackForVideo(testVideoId);
    assert.strictEqual(latestFeedback.adjustment_instruction, feedbackResult.adjustmentInstruction);

    // Generate script with feedback adjustment
    const script = await ScriptGenerationService.generateScript({
      topic: 'Arrays',
      concept: 'What is an Array?',
      feedbackAdjustment: latestFeedback.adjustment_instruction,
      targetDuration: 75
    });

    assert.strictEqual(script.target_duration_seconds, 75);
    // Verify script shot 1 narration contains the adjusted pacing terminology
    assert.ok(script.shots[0].narration_text.includes('pacing'));
  });

  test('fresh video generation produces an actual playable MP4 file on disk and becomes COMPLETED', async () => {
    // Queue generation job
    const job = JobQueueService.createJob({
      userId: 'test-real-media-user',
      topicId: 'Arrays',
      concept: 'Deletion',
      targetDuration: 75
    });

    assert.strictEqual(job.status, 'QUEUED');

    // Poll until COMPLETED
    let isCompleted = false;
    let finalJob = null;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 1000));
      finalJob = JobQueueService.getJob(job.id);
      if (finalJob.status === 'COMPLETED') {
        isCompleted = true;
        break;
      }
      if (finalJob.status === 'FAILED') {
        assert.fail(`Job failed unexpectedly: ${finalJob.error_message}`);
      }
    }

    assert.strictEqual(isCompleted, true, 'Generation job should reach COMPLETED status');
    assert.strictEqual(finalJob.progress, 100);

    // Verify video record in DB
    const createdVideo = Video.getById(finalJob.video_id);
    assert.ok(createdVideo, 'Generated video must exist in database');
    assert.strictEqual(createdVideo.source_type, 'GENERATED');
    assert.ok(createdVideo.video_url.endsWith('.mp4'), 'Generated video URL must be an .mp4 file');

    // Verify actual file exists on disk
    const diskPath = path.resolve(__dirname, '../../public', createdVideo.video_url.replace(/^\//, ''));
    assert.ok(fs.existsSync(diskPath), `Generated MP4 file must exist at ${diskPath}`);
    assert.ok(fs.statSync(diskPath).size > 100000, 'Generated MP4 file size must be > 100KB');

    // Verify streamable via HTTP
    const res = await fetch(`${baseUrl}${createdVideo.video_url}`, { method: 'HEAD' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'video/mp4');
  });
});

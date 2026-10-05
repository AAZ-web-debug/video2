const Video = require('../models/Video');
const CharacterReference = require('../models/CharacterReference');
const ScriptGenerationService = require('../services/scriptGenerationService');
const VisualGenerationAdapter = require('../services/visualGenerationAdapter');
const FeedbackService = require('../services/feedbackService');
const RegenerationLimitService = require('../services/regenerationLimitService');
const JobQueueService = require('../services/jobQueueService');
const db = require('../db/connection');

const visualAdapter = new VisualGenerationAdapter();

class VideoController {
  // GET /api/videos
  static async getAllVideos(req, res) {
    try {
      const { topic, concept, source_type, gateway } = req.query;

      if (gateway === 'true') {
        const recommendations = Video.getGatewayRecommendations(topic || 'Arrays');
        return res.json({ success: true, data: recommendations });
      }

      const videos = Video.getAll({
        topicId: topic,
        concept,
        sourceType: source_type
      });

      return res.json({
        success: true,
        count: videos.length,
        data: videos
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET /api/videos/:id
  static async getVideoById(req, res) {
    try {
      const { id } = req.params;
      const video = Video.getById(id);

      if (!video) {
        return res.status(404).json({ success: false, error: `Video with ID "${id}" not found.` });
      }

      return res.json({ success: true, data: video });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // POST /api/videos/generate/script
  static async generateScript(req, res) {
    try {
      const { topic = 'Arrays', concept, feedback_adjustment = null, target_duration = 75 } = req.body;

      if (!concept) {
        return res.status(400).json({ success: false, error: 'Missing required field: "concept"' });
      }

      const script = await ScriptGenerationService.generateScript({
        topic,
        concept,
        feedbackAdjustment: feedback_adjustment,
        targetDuration: target_duration
      });

      return res.json({
        success: true,
        data: script
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // POST /api/videos/generate
  static async generateVideo(req, res) {
    try {
      const { user_id = 'user-default-1', topic = 'Arrays', concept, feedback_adjustment = null, target_duration = 75, skip_encode = false } = req.body;

      if (!concept) {
        return res.status(400).json({ success: false, error: 'Missing required field: "concept"' });
      }

      // Start asynchronous generation job
      const job = JobQueueService.createJob({
        userId: user_id,
        topicId: topic,
        concept,
        feedbackAdjustment: feedback_adjustment,
        targetDuration: target_duration,
        skipEncode: skip_encode
      });

      return res.status(202).json({
        success: true,
        message: 'Video generation queued successfully.',
        job_id: job.id,
        video_id: job.video_id,
        status: job.status,
        status_url: `/api/videos/${job.video_id}/status?job_id=${job.id}`
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // POST /api/videos/:id/feedback
  static async submitFeedback(req, res) {
    try {
      const { id } = req.params;
      const { user_id = 'user-default-1', category } = req.body;

      if (!category) {
        return res.status(400).json({
          success: false,
          error: `Missing feedback "category". Allowed: ${FeedbackService.getAllowedCategories().join(', ')}`
        });
      }

      const result = FeedbackService.submitFeedback({
        videoId: id,
        userId: user_id,
        category
      });

      return res.status(201).json({
        success: true,
        message: 'Feedback recorded successfully.',
        data: result
      });
    } catch (err) {
      const status = err.statusCode || 400;
      return res.status(status).json({ success: false, error: err.message });
    }
  }

  // POST /api/videos/:id/regenerate
  static async regenerateVideo(req, res) {
    try {
      const { id } = req.params;
      const { user_id = 'user-default-1', skip_encode = false } = req.body;

      const existingVideo = Video.getById(id);
      if (!existingVideo) {
        return res.status(404).json({ success: false, error: `Video with ID "${id}" not found.` });
      }

      const topicId = existingVideo.topic_id;

      // 1. Verify and consume attempt from shared rolling 24h limit
      let limitResult;
      try {
        limitResult = RegenerationLimitService.verifyAndConsumeAttempt(user_id, topicId);
      } catch (limitErr) {
        // Blocked! Return last-shown video without re-queuing
        return res.status(429).json({
          success: false,
          error: limitErr.message,
          attempt_count: limitErr.attemptCount || 3,
          max_attempts: 3,
          resets_in_ms: limitErr.resetsInMs || 0,
          current_video: existingVideo
        });
      }

      // 2. Fetch latest feedback adjustment for this video (if user previously gave feedback)
      const latestFeedback = FeedbackService.getLatestFeedbackForVideo(id);
      const feedbackAdjustment = latestFeedback ? latestFeedback.adjustment_instruction : null;

      // 3. Queue new generation job
      const job = JobQueueService.createJob({
        userId: user_id,
        topicId,
        concept: existingVideo.concept,
        feedbackAdjustment,
        targetDuration: existingVideo.duration_seconds || 75,
        skipEncode: skip_encode
      });

      return res.status(202).json({
        success: true,
        message: `Regeneration started (${limitResult.attemptCount}/3 attempts used).`,
        job_id: job.id,
        new_video_id: job.video_id,
        attempt_count: limitResult.attemptCount,
        remaining_attempts: limitResult.remainingAttempts,
        status: job.status,
        status_url: `/api/videos/${job.video_id}/status?job_id=${job.id}`
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET /api/videos/:id/status
  static async getGenerationStatus(req, res) {
    try {
      const { id } = req.params;
      const { job_id } = req.query;

      let job = null;
      if (job_id) {
        job = JobQueueService.getJob(job_id);
      } else {
        // Find most recent job for this video_id
        job = db.prepare('SELECT * FROM video_jobs WHERE video_id = ? ORDER BY created_at DESC LIMIT 1').get(id);
        if (job && job.result_data) {
          job.result_data = JSON.parse(job.result_data);
        }
      }

      if (!job) {
        // Check if video already exists and is ready
        const video = Video.getById(id);
        if (video) {
          return res.json({
            success: true,
            status: 'COMPLETED',
            progress: 100,
            video_id: video.id,
            video
          });
        }
        return res.status(404).json({ success: false, error: 'Job or video not found.' });
      }

      return res.json({
        success: true,
        status: job.status,
        progress: job.progress,
        error_message: job.error_message,
        video_id: job.video_id,
        result: job.result_data
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET /api/videos/:id/shots/:shotNumber/visual
  static async getShotVisual(req, res) {
    try {
      const { id, shotNumber } = req.params;
      const shot = Video.getShot(id, parseInt(shotNumber, 10));

      if (!shot) {
        return res.status(404).send('Shot not found');
      }

      const visualResult = await visualAdapter.generateShotVisual({
        videoId: id,
        shot
      });

      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(visualResult.svgContent);
    } catch (err) {
      return res.status(500).send(err.message);
    }
  }

  // GET /api/videos/:id/stream (Synchronized playback package manifest)
  static async getVideoStreamManifest(req, res) {
    try {
      const { id } = req.params;
      const video = Video.getById(id);

      if (!video) {
        return res.status(404).json({ success: false, error: 'Video not found' });
      }

      const character = CharacterReference.getActive();

      return res.json({
        success: true,
        video_id: video.id,
        title: video.title,
        topic: video.topic_id,
        concept: video.concept,
        duration_seconds: video.duration_seconds,
        source_type: video.source_type,
        character,
        shots: video.shots.map(s => ({
          ...s,
          visual_asset_url: `/api/videos/${video.id}/shots/${s.shot_number}/visual`,
          audio_asset_url: `/api/videos/${video.id}/shots/${s.shot_number}/audio`
        }))
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET /api/videos/limits/:userId/:topicId
  static async getLimitStatus(req, res) {
    try {
      const { userId, topicId } = req.params;
      const limitStatus = RegenerationLimitService.checkLimit(userId, topicId);
      return res.json({ success: true, data: limitStatus });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET /api/character
  static async getCharacter(req, res) {
    try {
      const char = CharacterReference.getActive();
      return res.json({ success: true, data: char });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET /api/style-guide
  static async getStyleGuide(req, res) {
    try {
      const row = db.prepare('SELECT * FROM video_style_guides ORDER BY created_at DESC LIMIT 1').get();
      if (!row) {
        return res.status(404).json({ success: false, error: 'Style guide not found' });
      }
      return res.json({ success: true, data: JSON.parse(row.content) });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET /api/videos/gateway/recommendations
  static async getGatewayRecommendations(req, res) {
    try {
      const { topic = 'Arrays' } = req.query;
      const data = Video.getGatewayRecommendations(topic);
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = VideoController;

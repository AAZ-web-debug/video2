const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const ScriptGenerationService = require('./scriptGenerationService');
const VideoAssemblyService = require('./videoAssemblyService');

const assemblyService = new VideoAssemblyService();

class JobQueueService {
  static createJob({ userId, topicId, concept, feedbackAdjustment = null, targetDuration = 75, skipEncode = false }) {
    const jobId = uuidv4();
    const tempVideoId = `vid-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO video_jobs (id, video_id, user_id, topic_id, concept, status, progress, error_message, result_data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      jobId,
      tempVideoId,
      userId,
      topicId,
      concept,
      'QUEUED',
      0,
      null,
      null,
      now,
      now
    );

    // Trigger async processing in background without blocking API request
    if (skipEncode) {
      setImmediate(() => {
        this.updateJob(jobId, { status: 'COMPLETED', progress: 100 });
      });
    } else {
      setImmediate(() => {
        this._processJob(jobId, { userId, topicId, concept, feedbackAdjustment, targetDuration, tempVideoId });
      });
    }

    return this.getJob(jobId);
  }

  static getJob(jobId) {
    const job = db.prepare('SELECT * FROM video_jobs WHERE id = ?').get(jobId);
    if (!job) return null;
    return {
      ...job,
      result_data: job.result_data ? JSON.parse(job.result_data) : null
    };
  }

  static updateJob(jobId, updates) {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.progress !== undefined) {
      fields.push('progress = ?');
      values.push(updates.progress);
    }
    if (updates.error_message !== undefined) {
      fields.push('error_message = ?');
      values.push(updates.error_message);
    }
    if (updates.result_data !== undefined) {
      fields.push('result_data = ?');
      values.push(JSON.stringify(updates.result_data));
    }
    if (updates.video_id !== undefined) {
      fields.push('video_id = ?');
      values.push(updates.video_id);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(jobId);

    db.prepare(`UPDATE video_jobs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  static async _processJob(jobId, { userId, topicId, concept, feedbackAdjustment, targetDuration, tempVideoId }) {
    try {
      // Step 1: Generating Script
      this.updateJob(jobId, { status: 'GENERATING_SCRIPT', progress: 20 });
      await new Promise(r => setTimeout(r, 200));

      const script = await ScriptGenerationService.generateScript({
        topic: topicId,
        concept,
        feedbackAdjustment,
        targetDuration
      });

      const actualVideoId = script.video_id || tempVideoId;
      this.updateJob(jobId, { video_id: actualVideoId });

      // Step 2: Generating Visuals
      this.updateJob(jobId, { status: 'GENERATING_VISUALS', progress: 50 });
      await new Promise(r => setTimeout(r, 200));

      // Step 3: Generating Audio
      this.updateJob(jobId, { status: 'GENERATING_AUDIO', progress: 75 });
      await new Promise(r => setTimeout(r, 200));

      // Step 4: Video Assembly
      this.updateJob(jobId, { status: 'ASSEMBLING', progress: 90 });
      const assembledPackage = await assemblyService.assembleVideo({ script });

      // Step 5: Save generated video and shots to database
      const now = new Date().toISOString();

      const insertVideo = db.prepare(`
        INSERT OR REPLACE INTO videos (id, topic_id, concept, title, status, video_url, thumbnail_url, duration_seconds, source_type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertShot = db.prepare(`
        INSERT OR REPLACE INTO video_shots (id, video_id, shot_number, visual_description, narration_text, duration_seconds, visual_asset_url, audio_asset_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertVideo.run(
        actualVideoId,
        topicId,
        concept,
        assembledPackage.title,
        'READY',
        assembledPackage.video_url,
        `/assets/thumbnails/${actualVideoId}.svg`,
        assembledPackage.duration_seconds,
        'GENERATED',
        now,
        now
      );

      for (const shot of assembledPackage.assembled_shots) {
        insertShot.run(
          `${actualVideoId}-s${shot.shot_number}`,
          actualVideoId,
          shot.shot_number,
          shot.visual_description,
          shot.narration_text,
          shot.duration_seconds,
          shot.visual_asset_url,
          shot.audio_asset_url,
          now
        );
      }

      // Step 6: Mark Completed
      this.updateJob(jobId, {
        status: 'COMPLETED',
        progress: 100,
        result_data: {
          videoId: actualVideoId,
          title: assembledPackage.title,
          duration: assembledPackage.duration_seconds,
          shotsCount: assembledPackage.shots_count
        }
      });
    } catch (err) {
      console.error(`[JobQueueService] Job ${jobId} failed:`, err);
      this.updateJob(jobId, {
        status: 'FAILED',
        error_message: err.message
      });
    }
  }
}

module.exports = JobQueueService;

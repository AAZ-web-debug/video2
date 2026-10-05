const db = require('../db/connection');

class Video {
  static getAll({ topicId = null, concept = null, sourceType = null } = {}) {
    let query = 'SELECT * FROM videos WHERE 1=1';
    const params = [];

    if (topicId) {
      query += ' AND LOWER(topic_id) = LOWER(?)';
      params.push(topicId);
    }
    if (concept) {
      query += ' AND LOWER(concept) = LOWER(?)';
      params.push(concept);
    }
    if (sourceType) {
      query += ' AND UPPER(source_type) = UPPER(?)';
      params.push(sourceType);
    }

    query += ' ORDER BY created_at ASC';
    return db.prepare(query).all(...params);
  }

  static getById(id) {
    const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
    if (!video) return null;

    const shots = db.prepare('SELECT * FROM video_shots WHERE video_id = ? ORDER BY shot_number ASC').all(id);
    return {
      ...video,
      shots
    };
  }

  static getShots(videoId) {
    return db.prepare('SELECT * FROM video_shots WHERE video_id = ? ORDER BY shot_number ASC').all(videoId);
  }

  static getShot(videoId, shotNumber) {
    return db.prepare('SELECT * FROM video_shots WHERE video_id = ? AND shot_number = ?').get(videoId, shotNumber);
  }

  /**
   * Gateway Recommendation API:
   * Returns "2 pre-made videos + 1 freshly generated video" as specified in prompt section 14.
   */
  static getGatewayRecommendations(topicId = 'Arrays') {
    const referenceVideos = db.prepare(`
      SELECT * FROM videos 
      WHERE LOWER(topic_id) = LOWER(?) AND source_type = 'REFERENCE' 
      ORDER BY created_at ASC LIMIT 2
    `).all(topicId);

    const generatedVideos = db.prepare(`
      SELECT * FROM videos 
      WHERE LOWER(topic_id) = LOWER(?) AND source_type = 'GENERATED' 
      ORDER BY created_at DESC LIMIT 1
    `).all(topicId);

    // If no generated video yet, fallback to third reference video
    let selectedGenerated = generatedVideos[0];
    if (!selectedGenerated) {
      selectedGenerated = db.prepare(`
        SELECT * FROM videos 
        WHERE LOWER(topic_id) = LOWER(?) AND source_type = 'REFERENCE' 
        ORDER BY created_at ASC LIMIT 1 OFFSET 2
      `).get(topicId);
    }

    return {
      topic: topicId,
      pre_made_videos: referenceVideos.map(v => this.getById(v.id)),
      generated_video: selectedGenerated ? this.getById(selectedGenerated.id) : null
    };
  }
}

module.exports = Video;

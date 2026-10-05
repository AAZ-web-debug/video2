const fs = require('fs');
const path = require('path');
const db = require('./connection');
const { v4: uuidv4 } = require('uuid');

function seedDatabase() {
  console.log('[Seed] Checking and seeding initial AlgoVerse video data...');

  const characterFile = path.resolve(__dirname, '../../data/seeds/character_reference.json');
  const styleGuideFile = path.resolve(__dirname, '../../data/seeds/video_style_guide.json');
  const referenceVideosFile = path.resolve(__dirname, '../../data/seeds/reference_videos.json');

  // 1. Seed Character Reference
  if (fs.existsSync(characterFile)) {
    const charData = JSON.parse(fs.readFileSync(characterFile, 'utf8'));
    const existingChar = db.prepare('SELECT id FROM character_references WHERE id = ?').get(charData.id);
    const now = new Date().toISOString();

    if (!existingChar) {
      db.prepare(`
        INSERT INTO character_references (id, name, role, image_path, description, palette, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        charData.id,
        charData.name,
        charData.role || 'AlgoVerse Guide',
        charData.image_path,
        charData.description,
        JSON.stringify(charData.palette),
        charData.version,
        now,
        now
      );
      console.log(`[Seed] Seeded character reference: ${charData.name}`);
    }
  }

  // 2. Seed Video Style Guide
  if (fs.existsSync(styleGuideFile)) {
    const styleData = JSON.parse(fs.readFileSync(styleGuideFile, 'utf8'));
    const existingStyle = db.prepare('SELECT id FROM video_style_guides WHERE version = ?').get(styleData.version);
    const now = new Date().toISOString();

    if (!existingStyle) {
      db.prepare(`
        INSERT INTO video_style_guides (id, version, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        'style-guide-v1',
        styleData.version,
        JSON.stringify(styleData),
        now,
        now
      );
      console.log(`[Seed] Seeded video style guide version ${styleData.version}`);
    }
  }

  // 3. Seed Reference Videos
  if (fs.existsSync(referenceVideosFile)) {
    const videos = JSON.parse(fs.readFileSync(referenceVideosFile, 'utf8'));
    const now = new Date().toISOString();

    const insertVideo = db.prepare(`
      INSERT OR REPLACE INTO videos (id, topic_id, concept, title, status, video_url, thumbnail_url, duration_seconds, source_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertShot = db.prepare(`
      INSERT INTO video_shots (id, video_id, shot_number, visual_description, narration_text, duration_seconds, visual_asset_url, audio_asset_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const clearShots = db.prepare('DELETE FROM video_shots WHERE video_id = ?');

    const videoSlugMap = {
      'arrays-what-is-an-array': 'what-is-an-array.mp4',
      'arrays-index-based-access': 'index-based-access.mp4',
      'arrays-insertion': 'insertion.mp4',
      'arrays-deletion': 'deletion.mp4',
      'arrays-traversal': 'traversal.mp4',
      'arrays-search': 'search.mp4'
    };

    const seedTransaction = db.transaction((videoList) => {
      for (const v of videoList) {
        // Point to actual MP4 video path
        const filename = videoSlugMap[v.video_id] || `${v.video_id}.mp4`;
        const videoUrl = `/videos/arrays/${filename}`;
        const thumbnailUrl = `/assets/thumbnails/${v.video_id}.svg`;

        insertVideo.run(
          v.video_id,
          v.topic,
          v.concept,
          v.title,
          'READY',
          videoUrl,
          thumbnailUrl,
          v.target_duration_seconds,
          'REFERENCE',
          now,
          now
        );

        clearShots.run(v.video_id);

        for (const shot of v.shots) {
          const shotId = `${v.video_id}-s${shot.shot_number}`;
          const visualUrl = `/api/videos/${v.video_id}/shots/${shot.shot_number}/visual`;
          const audioUrl = `/api/videos/${v.video_id}/shots/${shot.shot_number}/audio`;

          insertShot.run(
            shotId,
            v.video_id,
            shot.shot_number,
            shot.visual_description,
            shot.narration_text,
            shot.duration_seconds,
            visualUrl,
            audioUrl,
            now
          );
        }
      }
    });

    seedTransaction(videos);
    console.log(`[Seed] Seeded ${videos.length} reference videos with structured shots.`);
  }

  console.log('[Seed] Seeding completed.');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;

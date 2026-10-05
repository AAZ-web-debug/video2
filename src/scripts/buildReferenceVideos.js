const path = require('path');
const fs = require('fs');
const db = require('../db/connection');
const VideoAssemblyService = require('../services/videoAssemblyService');

const videoSlugMap = {
  'arrays-what-is-an-array': 'what-is-an-array.mp4',
  'arrays-index-based-access': 'index-based-access.mp4',
  'arrays-insertion': 'insertion.mp4',
  'arrays-deletion': 'deletion.mp4',
  'arrays-traversal': 'traversal.mp4',
  'arrays-search': 'search.mp4'
};

async function buildReferenceVideos() {
  console.log('[BuildReferenceVideos] Starting build of 6 reference MP4 videos...');
  const refVideosFile = path.resolve(__dirname, '../../data/seeds/reference_videos.json');
  const videos = JSON.parse(fs.readFileSync(refVideosFile, 'utf8'));

  const outputDir = path.resolve(__dirname, '../../public/videos/arrays');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const assembly = new VideoAssemblyService();
  const updateVideoUrlStmt = db.prepare('UPDATE videos SET video_url = ?, status = ? WHERE id = ?');

  for (const v of videos) {
    const filename = videoSlugMap[v.video_id] || `${v.video_id}.mp4`;
    const targetPath = path.join(outputDir, filename);

    console.log(`[BuildReferenceVideos] Assembling "${v.concept}" (${v.target_duration_seconds}s) -> ${filename}...`);
    const startTime = Date.now();

    const result = await assembly.assembleVideo({
      script: v,
      outputMp4Path: targetPath
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const stat = fs.statSync(targetPath);
    console.log(`[BuildReferenceVideos] ✓ Rendered ${filename} (${stat.size} bytes in ${elapsed}s)`);

    const publicUrl = `/videos/arrays/${filename}`;
    updateVideoUrlStmt.run(publicUrl, 'READY', v.video_id);
  }

  console.log('[BuildReferenceVideos] All 6 reference MP4 videos built and database records updated successfully!');
}

if (require.main === module) {
  buildReferenceVideos().catch(err => {
    console.error('[BuildReferenceVideos] Fatal error:', err);
    process.exit(1);
  });
}

module.exports = buildReferenceVideos;

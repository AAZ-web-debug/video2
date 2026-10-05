const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const VisualGenerationAdapter = require('./visualGenerationAdapter');
const NarrationGenerationAdapter = require('./narrationGenerationAdapter');
const TTSService = require('./ttsService');
const CharacterReference = require('../models/CharacterReference');

class VideoAssemblyService {
  constructor() {
    this.visualAdapter = new VisualGenerationAdapter();
    this.narrationAdapter = new NarrationGenerationAdapter();
  }

  /**
   * Assembles a complete video package and encodes an actual playable MP4 file.
   * @param {Object} script - Validated shot list
   * @param {Object} character - Optional character reference
   * @param {string} outputMp4Path - Destination path for final MP4
   */
  async assembleVideo({ script, character = null, outputMp4Path = null }) {
    const char = character || CharacterReference.getActive();
    const shots = script.shots;
    const videoId = script.video_id;

    // Default output path if not specified
    const finalMp4Path = outputMp4Path || path.resolve(__dirname, `../../public/videos/generated/${videoId}.mp4`);
    const mp4Dir = path.dirname(finalMp4Path);
    if (!fs.existsSync(mp4Dir)) {
      fs.mkdirSync(mp4Dir, { recursive: true });
    }

    const tempDir = path.resolve(__dirname, `../../data/temp/${videoId}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    let accumulatedTime = 0;
    const assembledShots = [];
    const shotMp4Files = [];

    for (const shot of shots) {
      const startTime = accumulatedTime;
      const endTime = accumulatedTime + shot.duration_seconds;
      accumulatedTime = endTime;

      const shotPrefix = `shot_${shot.shot_number.toString().padStart(2, '0')}`;
      const shotPngPath = path.join(tempDir, `${shotPrefix}.png`);
      const shotWavPath = path.join(tempDir, `${shotPrefix}.wav`);
      const shotMp4Path = path.join(tempDir, `${shotPrefix}.mp4`);

      // 1. Render PNG Visual Frame
      const visualResult = await this.visualAdapter.renderShotPng({
        videoId,
        shot,
        outputPath: shotPngPath,
        character: char
      });

      // 2. Generate Real Spoken Narration Audio File
      TTSService.generateAudio(shot.narration_text, shotWavPath, shot.duration_seconds);

      // 3. Encode Shot Video Clip matching exact shot duration
      this._encodeShotClip({
        pngPath: shotPngPath,
        wavPath: shotWavPath,
        durationSeconds: shot.duration_seconds,
        outputPath: shotMp4Path
      });

      shotMp4Files.push(shotMp4Path);

      const audioResult = await this.narrationAdapter.generateShotAudio({
        videoId,
        shot
      });

      assembledShots.push({
        shot_number: shot.shot_number,
        visual_description: shot.visual_description,
        narration_text: shot.narration_text,
        duration_seconds: shot.duration_seconds,
        start_time_seconds: startTime,
        end_time_seconds: endTime,
        transition: shot.shot_number === 1 ? 'fade-in' : 'cross-dissolve',
        visual_asset_url: visualResult.assetUrl,
        audio_asset_url: audioResult.audioAssetUrl,
        svg_content: visualResult.svgContent,
        audio_cues: audioResult.cues
      });
    }

    // 4. Concatenate All Shot Clips into Final MP4
    this._concatClips(shotMp4Files, finalMp4Path, tempDir);

    // 5. Clean up temporary files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup error
    }

    const totalDuration = accumulatedTime;
    const webVideoUrl = `/videos/${path.relative(path.resolve(__dirname, '../../public/videos'), finalMp4Path).replace(/\\/g, '/')}`;

    return {
      videoId,
      topic: script.topic,
      concept: script.concept,
      title: script.title || `${script.concept} in ${script.topic}`,
      duration_seconds: totalDuration,
      shots_count: assembledShots.length,
      assembled_shots: assembledShots,
      video_file_path: finalMp4Path,
      video_url: webVideoUrl,
      character_reference: {
        id: char ? char.id : 'char-ada-001',
        name: char ? char.name : 'Ada'
      },
      assembled_at: new Date().toISOString()
    };
  }

  _encodeShotClip({ pngPath, wavPath, durationSeconds, outputPath }) {
    // FFmpeg still-image looping with audio, padded to exact duration
    const args = [
      '-y',
      '-loop', '1',
      '-framerate', '25',
      '-i', pngPath,
      '-i', wavPath,
      '-c:v', 'libx264',
      '-tune', 'stillimage',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-pix_fmt', 'yuv420p',
      '-t', durationSeconds.toString(),
      outputPath
    ];

    cp.execFileSync(ffmpegPath, args, { stdio: 'pipe' });
  }

  _concatClips(shotMp4Files, finalMp4Path, tempDir) {
    const listFile = path.join(tempDir, 'concat_list.txt');
    const listContent = shotMp4Files.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(listFile, listContent);

    const args = [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listFile,
      '-c', 'copy',
      finalMp4Path
    ];

    cp.execFileSync(ffmpegPath, args, { stdio: 'pipe' });
  }
}

module.exports = VideoAssemblyService;

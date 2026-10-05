const path = require('path');
const fs = require('fs');
const cp = require('child_process');

const SCRIPT_PATH = path.resolve(__dirname, 'tts_helper.ps1');

class TTSService {
  /**
   * Generates a WAV file with spoken narration.
   * @param {string} text - Narration text
   * @param {string} outputPath - Destination .wav file path
   * @param {number} targetDurationSeconds - Expected shot duration
   */
  static generateAudio(text, outputPath, targetDurationSeconds = null) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      // Execute PowerShell SpeechSynthesizer
      const safeText = text.replace(/"/g, '`"');
      const args = [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', SCRIPT_PATH,
        '-text', text,
        '-outputPath', outputPath
      ];

      cp.execFileSync('powershell', args, { stdio: 'pipe', timeout: 20000 });
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
        return outputPath;
      }
    } catch (err) {
      console.warn(`[TTSService] SpeechSynthesizer error: ${err.message}. Generating synthetic audio fallback.`);
    }

    // Fallback: Generate clean PCM WAV file with mild tone/silence matching duration
    this._generateFallbackWav(outputPath, targetDurationSeconds || 8);
    return outputPath;
  }

  static _generateFallbackWav(outputPath, durationSeconds) {
    const sampleRate = 22050;
    const numChannels = 1;
    const bytesPerSample = 2; // 16-bit
    const numSamples = Math.floor(sampleRate * durationSeconds);
    const dataSize = numSamples * numChannels * bytesPerSample;
    const buffer = Buffer.alloc(44 + dataSize);

    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
    buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
    buffer.writeUInt16LE(16, 34); // BitsPerSample
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Mild ambient sound wave (440Hz soft sine wave with fade-out)
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;
      if (t < durationSeconds * 0.75) {
        // Soft narrator chime tone
        sample = Math.sin(2 * Math.PI * 330 * t) * 1200 * Math.exp(-t * 0.8);
      }
      buffer.writeInt16LE(Math.round(sample), 44 + i * 2);
    }

    fs.writeFileSync(outputPath, buffer);
  }
}

module.exports = TTSService;

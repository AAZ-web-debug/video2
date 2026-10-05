const AlgoVersePalette = require('../config/palette');
const CharacterReference = require('../models/CharacterReference');

/**
 * Visual Generation Adapter Interface
 * Decouples the visual asset creation from specific AI or rendering backends.
 */
class VisualGenerationAdapter {
  constructor(options = {}) {
    this.providerName = options.providerName || 'algoverse-svg-renderer';
  }

  /**
   * Generates a visual asset for an individual shot.
   * Consumes character reference, shared palette, and shot visual description.
   */
  async generateShotVisual({ videoId, shot, character = null }) {
    const char = character || CharacterReference.getActive() || {
      name: 'Ada',
      role: 'AlgoVerse Guide',
      image_path: '/assets/character/ada_guide.svg'
    };

    const palette = AlgoVersePalette.colors;

    // Generate high-fidelity vector frame matching AlgoVerse design
    const svgContent = this._renderShotSvg({
      shotNumber: shot.shot_number,
      visualDescription: shot.visual_description,
      narrationText: shot.narration_text,
      durationSeconds: shot.duration_seconds,
      character: char,
      palette
    });

    return {
      assetType: 'image/svg+xml',
      provider: this.providerName,
      shotNumber: shot.shot_number,
      svgContent,
      assetUrl: `/api/videos/${videoId}/shots/${shot.shot_number}/visual`
    };
  }

  /**
   * Renders the shot to a crisp 1280x720 PNG buffer and file.
   */
  async renderShotPng({ videoId, shot, outputPath = null, character = null }) {
    const { Resvg } = require('@resvg/resvg-js');
    const fs = require('fs');
    const path = require('path');

    const visual = await this.generateShotVisual({ videoId, shot, character });
    const resvg = new Resvg(visual.svgContent, {
      fitTo: { mode: 'width', value: 1280 }
    });
    const pngBuffer = resvg.render().asPng();

    if (outputPath) {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(outputPath, pngBuffer);
    }

    return {
      ...visual,
      pngBuffer,
      pngPath: outputPath
    };
  }

  _renderShotSvg({ shotNumber, visualDescription, narrationText, durationSeconds, character, palette }) {
    // Escape XML entities
    const safeDesc = (visualDescription || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeNarration = (narrationText || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.bgDark}" />
      <stop offset="100%" stop-color="${palette.bgSurface}" />
    </linearGradient>
    <linearGradient id="panelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${palette.bgCard}" stop-opacity="0.92" />
      <stop offset="100%" stop-color="${palette.secondary}" stop-opacity="0.95" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Canvas Background -->
  <rect width="1280" height="720" fill="url(#bgGrad)" />

  <!-- Subtle Studio Grid -->
  <g stroke="#1E293B" stroke-width="1" opacity="0.4">
    <line x1="0" y1="120" x2="1280" y2="120" />
    <line x1="0" y1="240" x2="1280" y2="240" />
    <line x1="0" y1="360" x2="1280" y2="360" />
    <line x1="0" y1="480" x2="1280" y2="480" />
    <line x1="0" y1="600" x2="1280" y2="600" />
    <line x1="320" y1="0" x2="320" y2="720" />
    <line x1="640" y1="0" x2="640" y2="720" />
    <line x1="960" y1="0" x2="960" y2="720" />
  </g>

  <!-- Header Bar -->
  <rect x="40" y="30" width="1200" height="60" rx="12" fill="${palette.bgCard}" stroke="${palette.borderMuted}" stroke-width="1.5" />
  <circle cx="70" cy="60" r="14" fill="${palette.accentCyan}" filter="url(#glow)" />
  <text x="100" y="66" fill="${palette.textMain}" font-family="Outfit, -apple-system, sans-serif" font-size="20" font-weight="700" letter-spacing="1">
    ALGOVERSE VIDEO MODULE — SHOT ${shotNumber}
  </text>
  <rect x="1110" y="44" width="110" height="32" rx="8" fill="${palette.secondary}" stroke="${palette.accentCyan}" stroke-width="1" />
  <text x="1165" y="65" fill="${palette.accentCyanGlow}" font-family="monospace" font-size="14" font-weight="bold" text-anchor="middle">
    ${durationSeconds}.0s
  </text>

  <!-- Left: Reusable Character Stage -->
  <g transform="translate(60, 120)">
    <rect width="320" height="420" rx="16" fill="url(#panelGrad)" stroke="${palette.borderMuted}" stroke-width="1.5" />
    <text x="160" y="40" fill="${palette.textMuted}" font-family="Outfit, sans-serif" font-size="14" text-anchor="middle" letter-spacing="1">
      GUIDE: ${character.name.toUpperCase()}
    </text>
    <!-- Character Reference Avatar Embed -->
    <image href="${character.image_path}" x="40" y="60" width="240" height="320" />
    <rect x="30" y="370" width="260" height="30" rx="6" fill="${palette.bgDark}" stroke="${palette.primary}" stroke-width="1" />
    <text x="160" y="390" fill="${palette.accentCyan}" font-family="sans-serif" font-size="12" text-anchor="middle" font-weight="600">
      ${character.role || 'AlgoVerse Guide'}
    </text>
  </g>

  <!-- Right: Dynamic Visual Demonstration Arena -->
  <g transform="translate(420, 120)">
    <rect width="820" height="420" rx="16" fill="url(#panelGrad)" stroke="${palette.borderMuted}" stroke-width="1.5" />
    
    <!-- Stage Title -->
    <text x="40" y="50" fill="${palette.accentCyanGlow}" font-family="Outfit, sans-serif" font-size="20" font-weight="700">
      Visual Scene Execution
    </text>

    <!-- Visual Description Box -->
    <rect x="40" y="80" width="740" height="120" rx="10" fill="${palette.bgDark}" stroke="${palette.primary}" stroke-width="1" opacity="0.9" />
    <text x="60" y="115" fill="${palette.textMain}" font-family="sans-serif" font-size="16" font-weight="500">
      <tspan x="60" dy="0">${safeDesc.slice(0, 85)}</tspan>
      ${safeDesc.length > 85 ? `<tspan x="60" dy="28">${safeDesc.slice(85, 170)}</tspan>` : ''}
      ${safeDesc.length > 170 ? `<tspan x="60" dy="28">${safeDesc.slice(170, 255)}...</tspan>` : ''}
    </text>

    <!-- Animated Array Cells Demonstration Area -->
    <g transform="translate(40, 230)">
      <rect width="740" height="150" rx="10" fill="#0B132B" stroke="${palette.borderMuted}" stroke-width="1" />
      
      <!-- Array Cells -->
      <g transform="translate(60, 30)">
        <rect x="0" y="0" width="100" height="70" rx="8" fill="#1C2541" stroke="${palette.primary}" stroke-width="2" />
        <text x="50" y="44" fill="${palette.textMain}" font-family="monospace" font-size="24" font-weight="bold" text-anchor="middle">[0]</text>
        <text x="50" y="88" fill="${palette.textMuted}" font-family="monospace" font-size="12" text-anchor="middle">idx 0</text>
      </g>
      <g transform="translate(180, 30)">
        <rect x="0" y="0" width="100" height="70" rx="8" fill="#1C2541" stroke="${palette.primary}" stroke-width="2" />
        <text x="50" y="44" fill="${palette.textMain}" font-family="monospace" font-size="24" font-weight="bold" text-anchor="middle">[1]</text>
        <text x="50" y="88" fill="${palette.textMuted}" font-family="monospace" font-size="12" text-anchor="middle">idx 1</text>
      </g>
      <g transform="translate(300, 30)">
        <rect x="0" y="0" width="100" height="70" rx="8" fill="${palette.secondary}" stroke="${palette.accentCyan}" stroke-width="3" filter="url(#glow)" />
        <text x="50" y="44" fill="${palette.accentCyanGlow}" font-family="monospace" font-size="24" font-weight="bold" text-anchor="middle">[2]</text>
        <text x="50" y="88" fill="${palette.accentCyan}" font-family="monospace" font-size="12" text-anchor="middle">ACTIVE</text>
      </g>
      <g transform="translate(420, 30)">
        <rect x="0" y="0" width="100" height="70" rx="8" fill="#1C2541" stroke="${palette.primary}" stroke-width="2" />
        <text x="50" y="44" fill="${palette.textMain}" font-family="monospace" font-size="24" font-weight="bold" text-anchor="middle">[3]</text>
        <text x="50" y="88" fill="${palette.textMuted}" font-family="monospace" font-size="12" text-anchor="middle">idx 3</text>
      </g>
      <g transform="translate(540, 30)">
        <rect x="0" y="0" width="100" height="70" rx="8" fill="#1C2541" stroke="${palette.primary}" stroke-width="2" />
        <text x="50" y="44" fill="${palette.textMain}" font-family="monospace" font-size="24" font-weight="bold" text-anchor="middle">[4]</text>
        <text x="50" y="88" fill="${palette.textMuted}" font-family="monospace" font-size="12" text-anchor="middle">idx 4</text>
      </g>
    </g>
  </g>

  <!-- Bottom: Narration Bar -->
  <g transform="translate(40, 560)">
    <rect width="1200" height="120" rx="14" fill="${palette.bgCard}" stroke="${palette.primary}" stroke-width="1.5" />
    <circle cx="45" cy="40" r="16" fill="${palette.primary}" />
    <polygon points="41,32 53,40 41,48" fill="#FFFFFF" />
    <text x="80" y="36" fill="${palette.accentCyanGlow}" font-family="Outfit, sans-serif" font-size="14" font-weight="700" letter-spacing="1">
      NARRATION AUDIO TRACK
    </text>
    <text x="80" y="72" fill="${palette.textMain}" font-family="Outfit, sans-serif" font-size="18" font-weight="500">
      <tspan x="80" dy="0">"${safeNarration.slice(0, 110)}"</tspan>
      ${safeNarration.length > 110 ? `<tspan x="80" dy="26">"${safeNarration.slice(110, 220)}"</tspan>` : ''}
    </text>
  </g>
</svg>`;
  }
}

module.exports = VisualGenerationAdapter;

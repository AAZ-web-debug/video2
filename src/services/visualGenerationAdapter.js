const AlgoVersePalette = require('../config/palette');
const CharacterReference = require('../models/CharacterReference');

/**
 * Visual Generation Adapter
 * Renders professional CS educational motion-graphics frames for the AlgoVerse Video Module.
 * Designed with a dominant central array visualization, visible element movement,
 * high-contrast typography, clear pointers, and the canonical Ada guide reference.
 */
class VisualGenerationAdapter {
  constructor(options = {}) {
    this.providerName = options.providerName || 'algoverse-motion-renderer';
  }

  /**
   * Generates a visual asset (SVG) for an individual shot.
   */
  async generateShotVisual({ videoId, shot, character = null }) {
    const char = character || CharacterReference.getActive() || {
      name: 'Ada',
      role: 'AlgoVerse Guide',
      image_path: '/assets/character/ada_guide.svg'
    };

    const palette = AlgoVersePalette.colors;

    const svgContent = this._renderShotSvg({
      videoId,
      shotNumber: shot.shot_number,
      visualDescription: shot.visual_description,
      narrationText: shot.narration_text,
      durationSeconds: shot.duration_seconds,
      visualMetadata: shot.visual_metadata || null,
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

  _renderShotSvg({ videoId, shotNumber, visualDescription, narrationText, durationSeconds, visualMetadata, character, palette }) {
    const meta = visualMetadata || this._inferMetadata(visualDescription, narrationText, shotNumber);

    const safeTitle = this._escapeXml(meta.title || `ALGOVERSE DSA EXPLORER — SHOT ${shotNumber}`);
    const safeSubtitle = this._escapeXml(meta.subtitle || '');
    const safeBadge = this._escapeXml(meta.badge || '');
    const safeNarration = this._escapeXml(narrationText || '');

    // Render array elements or custom scene visuals
    const sceneGraphic = this._renderSceneGraphic(meta, palette);

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <!-- Background Gradients -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070B14" />
      <stop offset="50%" stop-color="#0B132B" />
      <stop offset="100%" stop-color="#0D1B2A" />
    </linearGradient>

    <!-- Radial Ambient Glows -->
    <radialGradient id="cyanAmbient" cx="50%" cy="38%" r="45%">
      <stop offset="0%" stop-color="#00F0FF" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#00F0FF" stop-opacity="0.0" />
    </radialGradient>
    <radialGradient id="indigoAmbient" cx="75%" cy="65%" r="40%">
      <stop offset="0%" stop-color="#6366F1" stop-opacity="0.10" />
      <stop offset="100%" stop-color="#6366F1" stop-opacity="0.0" />
    </radialGradient>

    <!-- Card Gradients -->
    <linearGradient id="cellNormal" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1E293B" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
    <linearGradient id="cellActive" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0C4A6E" />
      <stop offset="100%" stop-color="#082F49" />
    </linearGradient>
    <linearGradient id="cellMatch" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#065F46" />
      <stop offset="100%" stop-color="#022C22" />
    </linearGradient>
    <linearGradient id="cellMismatch" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#881337" />
      <stop offset="100%" stop-color="#4C0519" />
    </linearGradient>
    <linearGradient id="cellMoving" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3730A3" />
      <stop offset="100%" stop-color="#1E1B4B" />
    </linearGradient>

    <!-- Drop Glow Filters -->
    <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="125%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- 1. Background Canvas -->
  <rect width="1280" height="720" fill="url(#bgGrad)" />
  <rect width="1280" height="720" fill="url(#cyanAmbient)" />
  <rect width="1280" height="720" fill="url(#indigoAmbient)" />

  <!-- 2. Blueprint Architectural Grid -->
  <g stroke="#1E293B" stroke-width="1" opacity="0.28">
    <line x1="0" y1="80" x2="1280" y2="80" />
    <line x1="0" y1="200" x2="1280" y2="200" />
    <line x1="0" y1="360" x2="1280" y2="360" />
    <line x1="0" y1="520" x2="1280" y2="520" />
    <line x1="0" y1="630" x2="1280" y2="630" />
    <line x1="200" y1="0" x2="200" y2="720" />
    <line x1="440" y1="0" x2="440" y2="720" />
    <line x1="640" y1="0" x2="640" y2="720" />
    <line x1="840" y1="0" x2="840" y2="720" />
    <line x1="1080" y1="0" x2="1080" y2="720" />
  </g>

  <!-- 3. Top Header Bar -->
  <g transform="translate(50, 24)">
    <!-- Brand / Topic Pill -->
    <rect x="0" y="0" width="230" height="42" rx="10" fill="#0F172A" stroke="#334155" stroke-width="1.2" />
    <circle cx="22" cy="21" r="7" fill="#00F0FF" filter="url(#glowCyan)" />
    <text x="38" y="27" fill="#E2E8F0" font-family="'Outfit', -apple-system, sans-serif" font-size="13" font-weight="700" letter-spacing="1.2">
      ALGOVERSE • ARRAYS
    </text>

    <!-- Central Stage Banner -->
    <rect x="250" y="0" width="680" height="42" rx="10" fill="#0F172A" stroke="#1E293B" stroke-width="1.2" />
    <text x="590" y="27" fill="#F8FAFC" font-family="'Outfit', -apple-system, sans-serif" font-size="16" font-weight="700" letter-spacing="0.8" text-anchor="middle">
      ${safeTitle}
    </text>

    <!-- Shot Progress Pill -->
    <rect x="950" y="0" width="230" height="42" rx="10" fill="#0F172A" stroke="#334155" stroke-width="1.2" />
    <text x="1065" y="26" fill="#00F0FF" font-family="monospace" font-size="13" font-weight="700" text-anchor="middle">
      SHOT ${shotNumber} • ${durationSeconds}.0s
    </text>
  </g>

  <!-- Sub-Header Status Line -->
  ${safeSubtitle ? `
  <g transform="translate(640, 92)">
    <rect x="-350" y="0" width="700" height="34" rx="8" fill="#0B132B" stroke="#00F0FF" stroke-width="1" opacity="0.9" />
    <text x="0" y="22" fill="#38BDF8" font-family="'Outfit', sans-serif" font-size="14" font-weight="600" text-anchor="middle" letter-spacing="0.5">
      ${safeSubtitle}
    </text>
  </g>` : ''}

  <!-- 4. Dominant Central Stage & Animation -->
  <g id="main-stage">
    ${sceneGraphic}
  </g>

  <!-- 5. Ada Guide Avatar (Bottom-Left / Teacher Position) -->
  ${meta.showAda !== false ? `
  <g transform="translate(50, 470)" filter="url(#cardShadow)">
    <rect width="180" height="150" rx="14" fill="#0F172A" stroke="#334155" stroke-width="1.5" opacity="0.95" />
    <image href="${character.image_path}" x="25" y="10" width="130" height="105" />
    <rect x="15" y="118" width="150" height="24" rx="6" fill="#020617" stroke="#00F0FF" stroke-width="1" />
    <text x="90" y="134" fill="#00F0FF" font-family="'Outfit', sans-serif" font-size="11" font-weight="700" text-anchor="middle" letter-spacing="0.5">
      ADA • DSA GUIDE
    </text>
  </g>` : ''}

  <!-- 6. Bottom Subtitle & Narration Bar (Compact, high contrast, clean) -->
  <g transform="translate(50, 642)" filter="url(#cardShadow)">
    <rect width="1180" height="56" rx="12" fill="#0A0F1D" stroke="#334155" stroke-width="1.5" fill-opacity="0.92" />
    <!-- Audio Wave Graphic -->
    <g transform="translate(24, 18)">
      <rect x="0" y="6" width="3" height="8" rx="1" fill="#00F0FF" />
      <rect x="6" y="2" width="3" height="16" rx="1" fill="#00F0FF" />
      <rect x="12" y="0" width="3" height="20" rx="1" fill="#00F0FF" />
      <rect x="18" y="4" width="3" height="12" rx="1" fill="#00F0FF" />
      <rect x="24" y="7" width="3" height="6" rx="1" fill="#00F0FF" />
    </g>
    <!-- Subtitle Text -->
    <text x="65" y="34" fill="#F8FAFC" font-family="'Outfit', -apple-system, sans-serif" font-size="17" font-weight="500">
      ${safeNarration.length > 120 ? safeNarration.slice(0, 118) + '...' : safeNarration}
    </text>
    <!-- Optional Status Badge in Bottom Bar -->
    ${safeBadge ? `
    <rect x="1000" y="12" width="160" height="32" rx="8" fill="#1E293B" stroke="#00F0FF" stroke-width="1" />
    <text x="1080" y="33" fill="#00F0FF" font-family="monospace" font-size="12" font-weight="700" text-anchor="middle">
      ${safeBadge}
    </text>` : ''}
  </g>
</svg>`;
  }

  _renderSceneGraphic(meta, palette) {
    const sceneType = meta.scene_type || 'default_array';

    // 1. Scattered Memory Values (Intro to What is an Array)
    if (sceneType === 'what_is_array_scattered') {
      return this._renderScatteredValues(meta.values || [10, 20, 30, 40, 50]);
    }

    // 2. Train Car Analogy
    if (sceneType === 'what_is_array_train') {
      return this._renderTrainAnalogy(meta.values || [10, 20, 30, 40, 50]);
    }

    // 3. Code Declaration Syntax Card
    if (sceneType === 'what_is_array_code') {
      return this._renderCodeDeclaration(meta.values || [10, 20, 30, 40, 50]);
    }

    // 4. Memory Layout Comparison (Contiguous vs Scattered)
    if (sceneType === 'what_is_array_comparison') {
      return this._renderMemoryComparison();
    }

    // 5. High-Impact Summary Card
    if (sceneType.endsWith('_summary')) {
      return this._renderSummaryScene(meta);
    }

    // 6. Complexity / Worst Case Diagrams
    if (sceneType.includes('complexity') || sceneType.includes('worst_case')) {
      return this._renderComplexityScene(meta);
    }

    // 7. General & Specific Array Visualizations (Insertion, Deletion, Access, Traversal, Search)
    return this._renderInteractiveArray(meta, palette);
  }

  /**
   * Renders the primary central interactive array with large tactical cells,
   * animated indices, pointers, shift arrows, comparison results, and memory addresses.
   */
  _renderInteractiveArray(meta, palette) {
    let cells = [];

    if (meta.array && Array.isArray(meta.array)) {
      cells = meta.array;
    } else if (meta.values && Array.isArray(meta.values)) {
      cells = meta.values.map((val, idx) => ({
        value: val,
        index: idx,
        state: meta.pointerIndex === idx ? 'active' : 'normal'
      }));
    } else {
      cells = [
        { value: 10, index: 0, state: 'normal' },
        { value: 20, index: 1, state: 'normal' },
        { value: 30, index: 2, state: 'active' },
        { value: 40, index: 3, state: 'normal' },
        { value: 50, index: 4, state: 'normal' }
      ];
    }

    const cellCount = cells.length;
    const cellWidth = cellCount <= 5 ? 134 : 110;
    const cellHeight = 110;
    const gap = cellCount <= 5 ? 26 : 18;
    const totalWidth = (cellCount * cellWidth) + ((cellCount - 1) * gap);
    const startX = Math.round((1280 - totalWidth) / 2);
    const startY = 240;

    let svg = `<g transform="translate(0, 0)">`;

    // Target Value Banner (if applicable, e.g. Search target or Insert value)
    if (meta.targetValue !== undefined && meta.targetValue !== null) {
      svg += `
      <g transform="translate(640, 155)">
        <rect x="-160" y="0" width="320" height="46" rx="10" fill="#0F172A" stroke="#00F0FF" stroke-width="2" filter="url(#glowCyan)" />
        <circle cx="-130" cy="23" r="8" fill="#00F0FF" />
        <text x="0" y="30" fill="#F8FAFC" font-family="'Outfit', sans-serif" font-size="16" font-weight="800" text-anchor="middle" letter-spacing="1">
          TARGET VALUE: <tspan fill="#00F0FF">${meta.targetValue}</tspan>
        </text>
      </g>`;
    }

    // Formula or Math Banner (e.g. Memory address calculation)
    if (meta.highlightFormula) {
      svg += `
      <g transform="translate(640, 160)">
        <rect x="-280" y="0" width="560" height="46" rx="10" fill="#0B132B" stroke="#6366F1" stroke-width="1.8" filter="url(#cardShadow)" />
        <text x="0" y="30" fill="#A5B4FC" font-family="monospace" font-size="16" font-weight="700" text-anchor="middle">
          ${this._escapeXml(meta.highlightFormula)}
        </text>
      </g>`;
    }

    // Shift Arrow Graphic (for Insertion / Deletion)
    if (meta.shiftArrow) {
      const fromIdx = meta.shiftArrow.from;
      const toIdx = meta.shiftArrow.to;
      const fromX = startX + (fromIdx * (cellWidth + gap)) + (cellWidth / 2);
      const toX = startX + (toIdx * (cellWidth + gap)) + (cellWidth / 2);
      const arrowY = startY - 32;
      const isRight = toX > fromX;

      svg += `
      <g transform="translate(0, 0)">
        <path d="M ${fromX} ${arrowY} Q ${(fromX + toX) / 2} ${arrowY - 30} ${toX} ${arrowY}" 
              fill="none" stroke="#F59E0B" stroke-width="3.5" stroke-dasharray="8,4" />
        <polygon points="${isRight ? `${toX},${arrowY} ${toX - 10},${arrowY - 8} ${toX - 10},${arrowY + 8}` : `${toX},${arrowY} ${toX + 10},${arrowY - 8} ${toX + 10},${arrowY + 8}`}" 
                 fill="#F59E0B" />
        <rect x="${(fromX + toX) / 2 - 60}" y="${arrowY - 50}" width="120" height="26" rx="6" fill="#0F172A" stroke="#F59E0B" stroke-width="1.2" />
        <text x="${(fromX + toX) / 2}" y="${arrowY - 33}" fill="#FDE68A" font-family="'Outfit', sans-serif" font-size="12" font-weight="700" text-anchor="middle">
          ${this._escapeXml(meta.shiftArrow.label)}
        </text>
      </g>`;
    }

    // Render Array Cells
    cells.forEach((cell, idx) => {
      const x = startX + (idx * (cellWidth + gap));
      const y = startY;
      const state = cell.state || (meta.pointerIndex === idx ? 'active' : 'normal');

      let fill = 'url(#cellNormal)';
      let stroke = '#334155';
      let strokeWidth = '2';
      let textFill = '#F8FAFC';
      let filter = 'filter="url(#cardShadow)"';
      let dash = '';

      if (state === 'active') {
        fill = 'url(#cellActive)';
        stroke = '#00F0FF';
        strokeWidth = '3.5';
        textFill = '#00F0FF';
        filter = 'filter="url(#glowCyan)"';
      } else if (state === 'match') {
        fill = 'url(#cellMatch)';
        stroke = '#10B981';
        strokeWidth = '3.5';
        textFill = '#34D399';
        filter = 'filter="url(#glowGreen)"';
      } else if (state === 'mismatch') {
        fill = 'url(#cellMismatch)';
        stroke = '#F43F5E';
        strokeWidth = '2.5';
        textFill = '#FDA4AF';
      } else if (state === 'moving') {
        fill = 'url(#cellMoving)';
        stroke = '#F59E0B';
        strokeWidth = '3';
        textFill = '#FDE68A';
      } else if (state === 'gap') {
        fill = '#0B132B';
        stroke = '#00F0FF';
        strokeWidth = '2.5';
        dash = 'stroke-dasharray="6,4"';
        textFill = '#38BDF8';
      } else if (state === 'empty') {
        fill = '#0A0F1D';
        stroke = '#334155';
        strokeWidth = '1.5';
        dash = 'stroke-dasharray="5,5"';
        textFill = '#475569';
      } else if (state === 'visited') {
        fill = '#064E3B';
        stroke = '#059669';
        strokeWidth = '2';
        textFill = '#A7F3D0';
      }

      svg += `
      <!-- Cell ${idx} -->
      <g transform="translate(${x}, ${y})" ${filter}>
        <!-- Cell Body -->
        <rect width="${cellWidth}" height="${cellHeight}" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" ${dash} />
        
        <!-- Value Inside Cell -->
        <text x="${cellWidth / 2}" y="${cellHeight / 2 + 13}" fill="${textFill}" font-family="'Outfit', monospace, sans-serif" font-size="38" font-weight="800" text-anchor="middle">
          ${cell.value !== undefined ? this._escapeXml(String(cell.value)) : ''}
        </text>

        <!-- Status Icon (Checkmark or Cross) -->
        ${state === 'match' || state === 'visited' ? `
        <circle cx="${cellWidth - 18}" cy="18" r="11" fill="#10B981" />
        <text x="${cellWidth - 18}" y="23" fill="#FFFFFF" font-family="sans-serif" font-size="13" font-weight="900" text-anchor="middle">✓</text>` : ''}
        ${state === 'mismatch' ? `
        <circle cx="${cellWidth - 18}" cy="18" r="11" fill="#F43F5E" />
        <text x="${cellWidth - 18}" y="23" fill="#FFFFFF" font-family="sans-serif" font-size="13" font-weight="900" text-anchor="middle">✗</text>` : ''}

        <!-- Memory Address Label Above Cell (if provided) -->
        ${meta.addresses && meta.addresses[idx] ? `
        <rect x="10" y="-32" width="${cellWidth - 20}" height="22" rx="5" fill="#0A0F1D" stroke="#334155" stroke-width="1" />
        <text x="${cellWidth / 2}" y="-17" fill="#94A3B8" font-family="monospace" font-size="11" font-weight="700" text-anchor="middle">
          ${this._escapeXml(meta.addresses[idx])}
        </text>` : ''}

        <!-- Index Pill Below Cell -->
        <g transform="translate(0, ${cellHeight + 14})">
          <rect x="${cellWidth / 2 - 45}" y="0" width="90" height="28" rx="8" 
                fill="${state === 'active' || meta.pointerIndex === idx ? '#00F0FF' : '#1E293B'}" 
                stroke="${state === 'active' || meta.pointerIndex === idx ? '#00F0FF' : '#334155'}" stroke-width="1" />
          <text x="${cellWidth / 2}" y="19" 
                fill="${state === 'active' || meta.pointerIndex === idx ? '#0A0F1D' : '#94A3B8'}" 
                font-family="monospace, sans-serif" font-size="13" font-weight="800" text-anchor="middle">
            idx ${idx}
          </text>
        </g>
      </g>`;
    });

    // Pointer Indicator Arrow Below the Active Index
    if (meta.pointerIndex !== null && meta.pointerIndex !== undefined && meta.pointerIndex >= 0 && meta.pointerIndex < cellCount) {
      const pIdx = meta.pointerIndex;
      const pointerX = startX + (pIdx * (cellWidth + gap)) + (cellWidth / 2);
      const pointerY = startY + cellHeight + 52;
      const label = meta.pointerLabel || `i = ${pIdx}`;

      svg += `
      <!-- Pointer Indicator -->
      <g transform="translate(${pointerX}, ${pointerY})">
        <!-- Upward Arrow -->
        <polygon points="0,0 -12,14 12,14" fill="#00F0FF" filter="url(#glowCyan)" />
        
        <!-- Pointer Label Pill -->
        <rect x="-70" y="16" width="140" height="32" rx="8" fill="#0F172A" stroke="#00F0FF" stroke-width="1.8" filter="url(#cardShadow)" />
        <text x="0" y="37" fill="#00F0FF" font-family="'Outfit', monospace, sans-serif" font-size="13" font-weight="800" text-anchor="middle">
          ▲ ${this._escapeXml(label)}
        </text>
      </g>`;
    }

    svg += `</g>`;
    return svg;
  }

  /**
   * Renders scattered floating data cards for the intro of "What is an Array?"
   */
  _renderScatteredValues(values) {
    const coords = [
      { x: 300, y: 220, val: values[0] || 10, rot: -8 },
      { x: 520, y: 170, val: values[1] || 20, rot: 12 },
      { x: 740, y: 240, val: values[2] || 30, rot: -5 },
      { x: 920, y: 190, val: values[3] || 40, rot: 10 },
      { x: 620, y: 350, val: values[4] || 50, rot: -14 }
    ];

    let svg = `<g transform="translate(0, 0)">`;
    svg += `
    <!-- Disorganized Connectors -->
    <path d="M 360 270 Q 450 200 520 220" stroke="#F43F5E" stroke-width="2" stroke-dasharray="6,6" fill="none" opacity="0.6" />
    <path d="M 600 220 Q 670 280 740 280" stroke="#F43F5E" stroke-width="2" stroke-dasharray="6,6" fill="none" opacity="0.6" />
    <path d="M 820 270 Q 880 210 920 230" stroke="#F43F5E" stroke-width="2" stroke-dasharray="6,6" fill="none" opacity="0.6" />
    <path d="M 740 320 Q 680 380 620 380" stroke="#F43F5E" stroke-width="2" stroke-dasharray="6,6" fill="none" opacity="0.6" />
    `;

    coords.forEach(c => {
      svg += `
      <g transform="translate(${c.x}, ${c.y}) rotate(${c.rot})" filter="url(#cardShadow)">
        <rect width="110" height="90" rx="14" fill="#1E293B" stroke="#F43F5E" stroke-width="2" stroke-dasharray="4,4" />
        <text x="55" y="55" fill="#FDA4AF" font-family="'Outfit', sans-serif" font-size="34" font-weight="800" text-anchor="middle">
          ${c.val}
        </text>
        <text x="55" y="78" fill="#F43F5E" font-family="monospace" font-size="11" font-weight="700" text-anchor="middle">
          ? Address
        </text>
      </g>`;
    });

    svg += `
    <!-- Warning Banner -->
    <g transform="translate(640, 480)">
      <rect x="-240" y="0" width="480" height="44" rx="10" fill="#4C0519" stroke="#F43F5E" stroke-width="1.5" />
      <text x="0" y="28" fill="#FECDD3" font-family="'Outfit', sans-serif" font-size="15" font-weight="700" text-anchor="middle">
        ⚠️ SCATTERED IN MEMORY: SLOW &amp; HARD TO LOCATE
      </text>
    </g>
    </g>`;

    return svg;
  }

  /**
   * Renders the train carriage analogy for "What is an Array?"
   */
  _renderTrainAnalogy(values) {
    const startX = 260;
    const startY = 260;
    const carW = 130;
    const carH = 95;
    const gap = 30;

    let svg = `<g transform="translate(0, 0)">`;
    // Train tracks
    svg += `
    <line x1="180" y1="385" x2="1100" y2="385" stroke="#475569" stroke-width="6" />
    <line x1="180" y1="395" x2="1100" y2="395" stroke="#334155" stroke-width="4" />
    `;
    for (let tx = 200; tx <= 1080; tx += 28) {
      svg += `<line x1="${tx}" y1="380" x2="${tx}" y2="400" stroke="#64748B" stroke-width="3" />`;
    }

    values.slice(0, 5).forEach((val, idx) => {
      const x = startX + (idx * (carW + gap));
      const y = startY;

      svg += `
      <!-- Carriage ${idx} -->
      <g transform="translate(${x}, ${y})" filter="url(#cardShadow)">
        <rect width="${carW}" height="${carH}" rx="12" fill="#0F172A" stroke="#00F0FF" stroke-width="2.5" />
        <rect x="15" y="15" width="${carW - 30}" height="45" rx="6" fill="#1E293B" stroke="#334155" stroke-width="1" />
        <text x="${carW / 2}" y="48" fill="#00F0FF" font-family="'Outfit', sans-serif" font-size="28" font-weight="800" text-anchor="middle">
          ${val}
        </text>
        <circle cx="28" cy="${carH + 8}" r="12" fill="#334155" stroke="#00F0FF" stroke-width="2" />
        <circle cx="${carW - 28}" cy="${carH + 8}" r="12" fill="#334155" stroke="#00F0FF" stroke-width="2" />
        <!-- Coupler to next car -->
        ${idx < 4 ? `<rect x="${carW}" y="${carH / 2 - 4}" width="${gap}" height="8" rx="3" fill="#64748B" />` : ''}
        <text x="${carW / 2}" y="${carH - 12}" fill="#94A3B8" font-family="monospace" font-size="11" font-weight="700" text-anchor="middle">
          CAR #${idx}
        </text>
      </g>`;
    });

    svg += `
    <!-- Analogy Caption -->
    <g transform="translate(640, 480)">
      <rect x="-300" y="0" width="600" height="42" rx="10" fill="#0F172A" stroke="#334155" stroke-width="1.2" />
      <text x="0" y="27" fill="#E2E8F0" font-family="'Outfit', sans-serif" font-size="15" font-weight="600" text-anchor="middle">
        Linked in an unbroken line • All cars carry the exact same data type
      </text>
    </g>
    </g>`;

    return svg;
  }

  /**
   * Renders code syntax card linked to array elements.
   */
  _renderCodeDeclaration(values) {
    let svg = `<g transform="translate(0, 0)">`;
    // Code Card
    svg += `
    <g transform="translate(320, 160)" filter="url(#cardShadow)">
      <rect width="640" height="90" rx="14" fill="#0B132B" stroke="#6366F1" stroke-width="2" />
      <!-- Window dots -->
      <circle cx="28" cy="24" r="5" fill="#EF4444" />
      <circle cx="44" cy="24" r="5" fill="#F59E0B" />
      <circle cx="60" cy="24" r="5" fill="#10B981" />
      <text x="85" y="28" fill="#64748B" font-family="monospace" font-size="12">main.js</text>
      <text x="40" y="65" font-family="monospace" font-size="22" font-weight="700">
        <tspan fill="#F43F5E">const</tspan> <tspan fill="#38BDF8">scores</tspan> <tspan fill="#F8FAFC">=</tspan> <tspan fill="#F59E0B">[</tspan><tspan fill="#10B981">${values.join(', ')}</tspan><tspan fill="#F59E0B">]</tspan><tspan fill="#F8FAFC">;</tspan>
      </text>
    </g>
    `;

    // Downward connecting arrows
    const startX = 300;
    const cellW = 120;
    const gap = 20;
    values.slice(0, 5).forEach((val, idx) => {
      const cx = startX + (idx * (cellW + gap)) + (cellW / 2);
      svg += `
      <line x1="${cx}" y1="260" x2="${cx}" y2="320" stroke="#00F0FF" stroke-width="2" stroke-dasharray="4,4" />
      <polygon points="${cx},325 ${cx - 5},315 ${cx + 5},315" fill="#00F0FF" />
      `;
    });

    // Array Boxes below
    svg += this._renderInteractiveArray({
      values,
      pointerIndex: null,
      title: ''
    }, {});

    svg += `</g>`;
    return svg;
  }

  /**
   * Renders side-by-side memory comparison (Contiguous vs Scattered).
   */
  _renderMemoryComparison() {
    return `
    <g transform="translate(180, 160)">
      <!-- Left: Contiguous Array -->
      <g transform="translate(0, 0)" filter="url(#cardShadow)">
        <rect width="420" height="340" rx="16" fill="#0F172A" stroke="#10B981" stroke-width="2.5" />
        <rect x="20" y="20" width="380" height="36" rx="8" fill="#064E3B" />
        <text x="210" y="44" fill="#34D399" font-family="'Outfit', sans-serif" font-size="16" font-weight="800" text-anchor="middle">
          ✓ CONTIGUOUS ARRAY
        </text>
        <!-- Horizontal block -->
        <g transform="translate(30, 85)">
          <rect x="0" y="0" width="70" height="60" rx="6" fill="#1E293B" stroke="#10B981" stroke-width="1.5" />
          <text x="35" y="38" fill="#34D399" font-family="monospace" font-size="20" font-weight="700" text-anchor="middle">10</text>
          <rect x="72" y="0" width="70" height="60" rx="6" fill="#1E293B" stroke="#10B981" stroke-width="1.5" />
          <text x="107" y="38" fill="#34D399" font-family="monospace" font-size="20" font-weight="700" text-anchor="middle">20</text>
          <rect x="144" y="0" width="70" height="60" rx="6" fill="#1E293B" stroke="#10B981" stroke-width="1.5" />
          <text x="179" y="38" fill="#34D399" font-family="monospace" font-size="20" font-weight="700" text-anchor="middle">30</text>
          <rect x="216" y="0" width="70" height="60" rx="6" fill="#1E293B" stroke="#10B981" stroke-width="1.5" />
          <text x="251" y="38" fill="#34D399" font-family="monospace" font-size="20" font-weight="700" text-anchor="middle">40</text>
          <rect x="288" y="0" width="70" height="60" rx="6" fill="#1E293B" stroke="#10B981" stroke-width="1.5" />
          <text x="323" y="38" fill="#34D399" font-family="monospace" font-size="20" font-weight="700" text-anchor="middle">50</text>
        </g>
        <text x="210" y="190" fill="#E2E8F0" font-family="'Outfit', sans-serif" font-size="14" font-weight="600" text-anchor="middle">
          • Single continuous memory chunk
        </text>
        <text x="210" y="225" fill="#E2E8F0" font-family="'Outfit', sans-serif" font-size="14" font-weight="600" text-anchor="middle">
          • Instant O(1) mathematical jumping
        </text>
        <text x="210" y="260" fill="#E2E8F0" font-family="'Outfit', sans-serif" font-size="14" font-weight="600" text-anchor="middle">
          • Hardware CPU cache acceleration
        </text>
        <rect x="100" y="285" width="220" height="32" rx="8" fill="#065F46" />
        <text x="210" y="306" fill="#A7F3D0" font-family="monospace" font-size="13" font-weight="800" text-anchor="middle">
          FAST &amp; EFFICIENT
        </text>
      </g>

      <!-- Right: Scattered Pointers -->
      <g transform="translate(500, 0)" filter="url(#cardShadow)">
        <rect width="420" height="340" rx="16" fill="#0F172A" stroke="#F43F5E" stroke-width="2" opacity="0.85" />
        <rect x="20" y="20" width="380" height="36" rx="8" fill="#4C0519" />
        <text x="210" y="44" fill="#FDA4AF" font-family="'Outfit', sans-serif" font-size="16" font-weight="800" text-anchor="middle">
          ✗ SCATTERED POINTERS
        </text>
        <!-- Scattered boxes -->
        <rect x="40" y="85" width="55" height="45" rx="6" fill="#1E293B" stroke="#F43F5E" stroke-width="1.5" stroke-dasharray="3,3" />
        <text x="67" y="113" fill="#FDA4AF" font-family="monospace" font-size="16">10</text>
        <rect x="180" y="105" width="55" height="45" rx="6" fill="#1E293B" stroke="#F43F5E" stroke-width="1.5" stroke-dasharray="3,3" />
        <text x="207" y="133" fill="#FDA4AF" font-family="monospace" font-size="16">20</text>
        <rect x="310" y="75" width="55" height="45" rx="6" fill="#1E293B" stroke="#F43F5E" stroke-width="1.5" stroke-dasharray="3,3" />
        <text x="337" y="103" fill="#FDA4AF" font-family="monospace" font-size="16">30</text>
        <!-- Pointer arrows -->
        <path d="M 95 105 Q 140 100 180 120" stroke="#F43F5E" stroke-width="1.5" fill="none" />
        <path d="M 235 120 Q 270 90 310 95" stroke="#F43F5E" stroke-width="1.5" fill="none" />
        <text x="210" y="190" fill="#94A3B8" font-family="'Outfit', sans-serif" font-size="14" font-weight="500" text-anchor="middle">
          • Fragmented memory locations
        </text>
        <text x="210" y="225" fill="#94A3B8" font-family="'Outfit', sans-serif" font-size="14" font-weight="500" text-anchor="middle">
          • Must follow pointers in sequence
        </text>
        <text x="210" y="260" fill="#94A3B8" font-family="'Outfit', sans-serif" font-size="14" font-weight="500" text-anchor="middle">
          • Frequent CPU cache misses
        </text>
        <rect x="100" y="285" width="220" height="32" rx="8" fill="#4C0519" />
        <text x="210" y="306" fill="#FECDD3" font-family="monospace" font-size="13" font-weight="700" text-anchor="middle">
          POINTER OVERHEAD
        </text>
      </g>
    </g>`;
  }

  /**
   * Renders the summary cards with key takeaways and Ada.
   */
  _renderSummaryScene(meta) {
    return `
    <g transform="translate(300, 160)" filter="url(#cardShadow)">
      <rect width="680" height="340" rx="18" fill="#0B132B" stroke="#00F0FF" stroke-width="2.5" />
      
      <!-- Card Header -->
      <rect x="25" y="25" width="630" height="50" rx="10" fill="#0F172A" stroke="#334155" stroke-width="1" />
      <text x="340" y="58" fill="#00F0FF" font-family="'Outfit', sans-serif" font-size="22" font-weight="800" text-anchor="middle" letter-spacing="1">
        ${this._escapeXml(meta.title || 'TOPIC SUMMARY')}
      </text>

      <!-- Key Takeaway Bullets -->
      <g transform="translate(60, 110)">
        <circle cx="15" cy="20" r="10" fill="#10B981" />
        <text x="15" y="25" fill="#FFFFFF" font-family="sans-serif" font-size="12" font-weight="900" text-anchor="middle">1</text>
        <text x="40" y="25" fill="#F8FAFC" font-family="'Outfit', sans-serif" font-size="18" font-weight="700">
          Contiguous Memory: <tspan fill="#94A3B8" font-weight="400">Stores elements sequentially without gaps</tspan>
        </text>

        <circle cx="15" cy="75" r="10" fill="#00F0FF" />
        <text x="15" y="80" fill="#0A0F1D" font-family="sans-serif" font-size="12" font-weight="900" text-anchor="middle">2</text>
        <text x="40" y="80" fill="#F8FAFC" font-family="'Outfit', sans-serif" font-size="18" font-weight="700">
          Zero-Based Index: <tspan fill="#94A3B8" font-weight="400">Index represents offset distance from base address</tspan>
        </text>

        <circle cx="15" cy="130" r="10" fill="#6366F1" />
        <text x="15" y="135" fill="#FFFFFF" font-family="sans-serif" font-size="12" font-weight="900" text-anchor="middle">3</text>
        <text x="40" y="135" fill="#F8FAFC" font-family="'Outfit', sans-serif" font-size="18" font-weight="700">
          Performance Tradeoff: <tspan fill="#94A3B8" font-weight="400">O(1) access vs O(N) insertion/deletion shifts</tspan>
        </text>
      </g>

      <!-- Bottom Badge -->
      <rect x="200" y="280" width="280" height="38" rx="10" fill="#020617" stroke="#00F0FF" stroke-width="1.5" />
      <text x="340" y="305" fill="#00F0FF" font-family="'Outfit', sans-serif" font-size="15" font-weight="800" text-anchor="middle" letter-spacing="1">
        ALGOVERSE CERTIFIED CONCEPT ✓
      </text>
    </g>`;
  }

  /**
   * Renders Time Complexity Comparison graphs (O(1) vs O(N)).
   */
  _renderComplexityScene(meta) {
    return `
    <g transform="translate(240, 160)" filter="url(#cardShadow)">
      <!-- Card Container -->
      <rect width="800" height="340" rx="18" fill="#0B132B" stroke="#6366F1" stroke-width="2" />
      
      <rect x="30" y="25" width="740" height="46" rx="10" fill="#0F172A" stroke="#334155" stroke-width="1" />
      <text x="400" y="55" fill="#A5B4FC" font-family="'Outfit', sans-serif" font-size="20" font-weight="800" text-anchor="middle" letter-spacing="1">
        ${this._escapeXml(meta.title || 'TIME COMPLEXITY ANALYSIS')}
      </text>

      <!-- Left Column: O(1) -->
      <g transform="translate(60, 100)">
        <rect width="320" height="200" rx="12" fill="#0F172A" stroke="#00F0FF" stroke-width="2" />
        <rect x="15" y="15" width="290" height="32" rx="6" fill="#0C4A6E" />
        <text x="160" y="37" fill="#00F0FF" font-family="monospace" font-size="16" font-weight="800" text-anchor="middle">
          O(1) CONSTANT TIME
        </text>
        <text x="160" y="80" fill="#E2E8F0" font-family="'Outfit', sans-serif" font-size="14" font-weight="600" text-anchor="middle">
          • Index-Based Access
        </text>
        <text x="160" y="105" fill="#E2E8F0" font-family="'Outfit', sans-serif" font-size="14" font-weight="600" text-anchor="middle">
          • Insertion at End (with space)
        </text>
        <text x="160" y="130" fill="#E2E8F0" font-family="'Outfit', sans-serif" font-size="14" font-weight="600" text-anchor="middle">
          • Deletion from End
        </text>
        <text x="160" y="172" fill="#38BDF8" font-family="'Outfit', sans-serif" font-size="13" font-weight="700" text-anchor="middle">
          Single calculation • Never scales with N
        </text>
      </g>

      <!-- Right Column: O(N) -->
      <g transform="translate(420, 100)">
        <rect width="320" height="200" rx="12" fill="#0F172A" stroke="#F59E0B" stroke-width="2" />
        <rect x="15" y="15" width="290" height="32" rx="6" fill="#78350F" />
        <text x="160" y="37" fill="#FDE68A" font-family="monospace" font-size="16" font-weight="800" text-anchor="middle">
          O(N) LINEAR TIME
        </text>
        <text x="160" y="80" fill="#E2E8F0" font-family="'Outfit', sans-serif" font-size="14" font-weight="600" text-anchor="middle">
          • Insertion at Front / Middle
        </text>
        <text x="160" y="105" fill="#E2E8F0" font-family="'Outfit', sans-serif" font-size="14" font-weight="600" text-anchor="middle">
          • Deletion from Front / Middle
        </text>
        <text x="160" y="130" fill="#E2E8F0" font-family="'Outfit', sans-serif" font-size="14" font-weight="600" text-anchor="middle">
          • Linear Search &amp; Traversal
        </text>
        <text x="160" y="172" fill="#FBBF24" font-family="'Outfit', sans-serif" font-size="13" font-weight="700" text-anchor="middle">
          Must shift or inspect up to N elements
        </text>
      </g>
    </g>`;
  }

  /**
   * Intelligently infers structured visual parameters for freshly generated AI shot lists.
   */
  _inferMetadata(visualDescription, narrationText, shotNumber) {
    const text = `${visualDescription || ''} ${narrationText || ''}`.toLowerCase();

    const isSearch = text.includes('search') || text.includes('find') || text.includes('target');
    const isInsert = text.includes('insert') || text.includes('add');
    const isDelete = text.includes('delete') || text.includes('remove');
    const isAccess = text.includes('index') && (text.includes('access') || text.includes('lookup') || text.includes('address'));
    const isTraverse = text.includes('traverse') || text.includes('visit') || text.includes('loop') || text.includes('iterate');

    let title = 'ARRAY OPERATION';
    let subtitle = 'Demonstrating Linear Memory Mechanics';
    let badge = 'ALGOVERSE DSA';
    let scene_type = 'default_array';
    let pointerIndex = 0;

    if (isSearch) {
      title = 'LINEAR SEARCH';
      subtitle = 'Scanning Elements Sequentially for Target';
      badge = 'SEARCHING';
      pointerIndex = (shotNumber - 1) % 5;
    } else if (isInsert) {
      title = 'ARRAY INSERTION';
      subtitle = 'Creating Space by Shifting Elements Right';
      badge = 'SHIFT & INSERT';
      pointerIndex = 2;
    } else if (isDelete) {
      title = 'ARRAY DELETION';
      subtitle = 'Removing Element & Shifting Remaining Items Left';
      badge = 'SHIFT & CLOSE GAP';
      pointerIndex = 2;
    } else if (isAccess) {
      title = 'INDEX-BASED ACCESS';
      subtitle = 'Direct Memory Offset Calculation O(1)';
      badge = 'O(1) LOOKUP';
      pointerIndex = 2;
    } else if (isTraverse) {
      title = 'ARRAY TRAVERSAL';
      subtitle = 'Sequential Element Visitation (i++)';
      badge = 'ITERATING';
      pointerIndex = (shotNumber - 1) % 5;
    }

    return {
      scene_type,
      title,
      subtitle,
      badge,
      values: [10, 20, 30, 40, 50],
      pointerIndex,
      pointerLabel: `i = ${pointerIndex}`,
      showAda: true
    };
  }

  _escapeXml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

module.exports = VisualGenerationAdapter;

/**
 * AlgoVerse Video Module (Person 2)
 * Client-Side Interactive Engine with Real MP4 Video Playback
 */

// Application State
const state = {
  userId: 'user-demo-01',
  topic: 'Arrays',
  videos: [],
  currentVideo: null,
  currentShotIndex: 0,
  isPlaying: false,
  voiceEnabled: true,
  playbackTimer: null,
  elapsedSeconds: 0,
  character: null,
  styleGuide: null,
  quota: {
    attemptCount: 0,
    remainingAttempts: 3,
    allowed: true
  }
};

// Predefined Feedback Adjustments lookup
const FEEDBACK_ADJUSTMENTS = {
  'pacing': 'Improve pacing by shortening slow shots and increasing visual changes between concept beats.',
  'narration clarity': 'Use simpler wording, shorter sentences, and explain technical terms before using them.',
  'visual style': 'Keep the existing character reference and shared palette while making visuals clearer and more consistent.',
  'too long/too short': 'Adjust the number and duration of shots while keeping the final video between 60 and 90 seconds.',
  'other': 'Refine the overall instructional flow, keeping the explanation calm, clear, and strictly aligned with the style guide.'
};

// DOM Elements
const elements = {
  playerScreen: document.getElementById('playerScreen'),
  html5VideoPlayer: document.getElementById('html5VideoPlayer'),
  visualViewport: document.getElementById('visualViewport'),
  currentVisualFrame: document.getElementById('currentVisualFrame'),
  overlayPlayBtn: document.getElementById('overlayPlayBtn'),
  playPauseBtn: document.getElementById('playPauseBtn'),
  playIcon: document.getElementById('playIcon'),
  pauseIcon: document.getElementById('pauseIcon'),
  playLabel: document.getElementById('playLabel'),
  prevShotBtn: document.getElementById('prevShotBtn'),
  nextShotBtn: document.getElementById('nextShotBtn'),
  voiceToggleBtn: document.getElementById('voiceToggleBtn'),
  sourceTypeBadge: document.getElementById('sourceTypeBadge'),
  shotCounterBadge: document.getElementById('shotCounterBadge'),
  narrationOverlay: document.getElementById('narrationOverlay'),
  narrationText: document.getElementById('narrationText'),
  audioPulse: document.getElementById('audioPulse'),
  timelineBar: document.getElementById('timelineBar'),
  timelineFill: document.getElementById('timelineFill'),
  currentTime: document.getElementById('currentTime'),
  totalDuration: document.getElementById('totalDuration'),
  currentVideoTitle: document.getElementById('currentVideoTitle'),
  currentVideoConcept: document.getElementById('currentVideoConcept'),
  currentVideoDuration: document.getElementById('currentVideoDuration'),
  currentVideoShots: document.getElementById('currentVideoShots'),
  shotsStrip: document.getElementById('shotsStrip'),
  conceptList: document.getElementById('conceptList'),
  gatewayList: document.getElementById('gatewayList'),
  quotaText: document.getElementById('quotaText'),
  regenQuotaBadge: document.getElementById('regenQuotaBadge'),
  openFeedbackBtn: document.getElementById('openFeedbackBtn'),
  regenerateBtn: document.getElementById('regenerateBtn'),
  feedbackModal: document.getElementById('feedbackModal'),
  closeFeedbackModal: document.getElementById('closeFeedbackModal'),
  cancelFeedbackBtn: document.getElementById('cancelFeedbackBtn'),
  feedbackForm: document.getElementById('feedbackForm'),
  feedbackCategorySelect: document.getElementById('feedbackCategorySelect'),
  adjustmentPreviewText: document.getElementById('adjustmentPreviewText'),
  generationModal: document.getElementById('generationModal'),
  genProgressFill: document.getElementById('genProgressFill'),
  genProgressSteps: document.getElementById('genProgressSteps'),
  genStatusText: document.getElementById('genStatusText'),
  genErrorAlert: document.getElementById('genErrorAlert'),
  toast: document.getElementById('toast'),
  charName: document.getElementById('charName'),
  charDesc: document.getElementById('charDesc'),
  charAvatar: document.getElementById('charAvatar')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadInitialData();
});

// Setup Event Listeners
function setupEventListeners() {
  elements.playPauseBtn.addEventListener('click', togglePlay);
  elements.overlayPlayBtn.addEventListener('click', togglePlay);
  elements.prevShotBtn.addEventListener('click', prevShot);
  elements.nextShotBtn.addEventListener('click', nextShot);
  elements.voiceToggleBtn.addEventListener('click', toggleVoice);

  // HTML5 Video Player Event Listeners
  if (elements.html5VideoPlayer) {
    elements.html5VideoPlayer.addEventListener('timeupdate', () => {
      if (!state.currentVideo) return;
      state.elapsedSeconds = Math.floor(elements.html5VideoPlayer.currentTime);
      syncShotFromTime(elements.html5VideoPlayer.currentTime);
      updateProgressUI();
    });

    elements.html5VideoPlayer.addEventListener('play', () => {
      state.isPlaying = true;
      elements.overlayPlayBtn.classList.add('hidden');
      elements.playIcon.classList.add('hidden');
      elements.pauseIcon.classList.remove('hidden');
      elements.playLabel.textContent = 'Pause';
      elements.audioPulse.classList.add('active');
    });

    elements.html5VideoPlayer.addEventListener('pause', () => {
      state.isPlaying = false;
      elements.overlayPlayBtn.classList.remove('hidden');
      elements.playIcon.classList.remove('hidden');
      elements.pauseIcon.classList.add('hidden');
      elements.playLabel.textContent = 'Play';
      elements.audioPulse.classList.remove('active');
    });

    elements.html5VideoPlayer.addEventListener('ended', () => {
      state.isPlaying = false;
      elements.overlayPlayBtn.classList.remove('hidden');
      elements.playIcon.classList.remove('hidden');
      elements.pauseIcon.classList.add('hidden');
      elements.playLabel.textContent = 'Play';
      elements.audioPulse.classList.remove('active');
      elements.html5VideoPlayer.currentTime = 0;
      state.currentShotIndex = 0;
      updateShotUI();
      showToast('Video playback completed.', 'info');
    });

    elements.html5VideoPlayer.addEventListener('click', togglePlay);
  }

  // Timeline scrubber click
  elements.timelineBar.addEventListener('click', (e) => {
    if (!state.currentVideo) return;
    const rect = elements.timelineBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    seekToPercentage(pct);
  });

  // Feedback modal
  elements.openFeedbackBtn.addEventListener('click', openFeedbackModal);
  elements.closeFeedbackModal.addEventListener('click', closeFeedbackModal);
  elements.cancelFeedbackBtn.addEventListener('click', closeFeedbackModal);
  elements.feedbackCategorySelect.addEventListener('change', updateAdjustmentPreview);
  elements.feedbackForm.addEventListener('submit', handleFeedbackSubmit);

  // Regeneration
  elements.regenerateBtn.addEventListener('click', handleRegenerate);
}

// Data Loading
async function loadInitialData() {
  try {
    // 1. Fetch Character Reference
    const charRes = await fetch('/api/character');
    const charJson = await charRes.json();
    if (charJson.success && charJson.data) {
      state.character = charJson.data;
      elements.charName.textContent = state.character.name;
      elements.charDesc.textContent = state.character.description;
      if (state.character.image_path) {
        elements.charAvatar.src = state.character.image_path;
      }
    }

    // 2. Fetch Regeneration Limit Status
    await updateQuotaStatus();

    // 3. Fetch All Arrays Videos
    const videosRes = await fetch('/api/videos?topic=Arrays');
    const videosJson = await videosRes.json();
    if (videosJson.success && videosJson.data) {
      state.videos = videosJson.data;
      renderConceptList();
      
      // Load first reference video
      if (state.videos.length > 0) {
        await selectVideo(state.videos[0].id);
      }
    }

    // 4. Fetch Gateway Recommendations (2 Pre-made + 1 AI)
    await loadGatewayRecommendations();
  } catch (err) {
    showToast(`Initialization error: ${err.message}`, 'error');
  }
}

async function updateQuotaStatus() {
  try {
    const res = await fetch(`/api/videos/limits/${state.userId}/${state.topic}`);
    const json = await res.json();
    if (json.success && json.data) {
      state.quota = json.data;
      elements.quotaText.textContent = `Regenerations: ${state.quota.attemptCount} / 3`;
      if (!state.quota.allowed) {
        elements.regenerateBtn.classList.add('btn-blocked');
        elements.regenQuotaBadge.style.borderColor = 'var(--rose)';
      } else {
        elements.regenerateBtn.classList.remove('btn-blocked');
        elements.regenQuotaBadge.style.borderColor = 'rgba(59, 130, 246, 0.4)';
      }
    }
  } catch (err) {
    console.error('Failed to update quota status:', err);
  }
}

async function loadGatewayRecommendations() {
  try {
    const res = await fetch(`/api/videos/gateway/recommendations?topic=${state.topic}`);
    const json = await res.json();
    if (json.success && json.data) {
      const { pre_made_videos, generated_video } = json.data;
      elements.gatewayList.innerHTML = '';

      pre_made_videos.forEach(v => {
        const item = document.createElement('div');
        item.className = 'gateway-item';
        item.innerHTML = `
          <div>
            <strong>${escapeHtml(v.concept)}</strong>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${v.duration_seconds}s</div>
          </div>
          <span class="gateway-tag tag-ref">Pre-made</span>
        `;
        item.addEventListener('click', () => selectVideo(v.id));
        elements.gatewayList.appendChild(item);
      });

      if (generated_video) {
        const item = document.createElement('div');
        item.className = 'gateway-item';
        item.innerHTML = `
          <div>
            <strong>${escapeHtml(generated_video.concept)}</strong>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${generated_video.duration_seconds}s</div>
          </div>
          <span class="gateway-tag tag-gen">AI Fresh</span>
        `;
        item.addEventListener('click', () => selectVideo(generated_video.id));
        elements.gatewayList.appendChild(item);
      }
    }
  } catch (err) {
    console.error('Failed to load gateway recommendations:', err);
  }
}

// Render Concepts Sidebar
function renderConceptList() {
  elements.conceptList.innerHTML = '';
  state.videos.forEach(v => {
    const card = document.createElement('div');
    card.className = `concept-card ${state.currentVideo && state.currentVideo.id === v.id ? 'active' : ''}`;
    card.id = `concept-card-${v.id}`;
    card.innerHTML = `
      <div>
        <div class="concept-name">${escapeHtml(v.concept)}</div>
        <div class="concept-shots-badge">${v.duration_seconds}s • ${v.source_type === 'REFERENCE' ? 'Reference' : 'AI Generated'}</div>
      </div>
      <div class="concept-arrow">&rarr;</div>
    `;
    card.addEventListener('click', () => selectVideo(v.id));
    elements.conceptList.appendChild(card);
  });
}

// Video Selection & Playback Setup
async function selectVideo(videoId) {
  pauseVideo();
  try {
    const res = await fetch(`/api/videos/${videoId}`);
    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Failed to fetch video');
    }

    state.currentVideo = json.data;
    state.currentShotIndex = 0;
    state.elapsedSeconds = 0;

    // Update Header Metadata
    elements.currentVideoTitle.textContent = state.currentVideo.title;
    elements.currentVideoConcept.textContent = `Concept: ${state.currentVideo.concept}`;
    elements.currentVideoDuration.textContent = `Duration: ${state.currentVideo.duration_seconds}s`;
    elements.currentVideoShots.textContent = `Shots: ${state.currentVideo.shots.length}`;
    elements.totalDuration.textContent = formatTime(state.currentVideo.duration_seconds);

    // Source Badge
    if (state.currentVideo.source_type === 'REFERENCE') {
      elements.sourceTypeBadge.textContent = 'PRE-MADE VIDEO';
      elements.sourceTypeBadge.className = 'source-badge badge-reference';
    } else {
      elements.sourceTypeBadge.textContent = 'AI GENERATED VIDEO';
      elements.sourceTypeBadge.className = 'source-badge badge-generated';
    }

    // Set Video Source (Actual MP4 file)
    if (state.currentVideo.video_url && state.currentVideo.video_url.endsWith('.mp4')) {
      elements.html5VideoPlayer.src = state.currentVideo.video_url;
      elements.html5VideoPlayer.classList.remove('hidden');
      elements.visualViewport.classList.add('hidden');
      elements.html5VideoPlayer.load();
    } else {
      // Fallback SVG viewport
      elements.html5VideoPlayer.classList.add('hidden');
      elements.visualViewport.classList.remove('hidden');
    }

    renderShotsStrip();
    renderConceptList();
    updateShotUI();
    updateProgressUI();
  } catch (err) {
    showToast(`Error loading video: ${err.message}`, 'error');
  }
}

// Sync shot index based on player current time
function syncShotFromTime(timeSeconds) {
  if (!state.currentVideo || !state.currentVideo.shots) return;
  let accum = 0;
  for (let i = 0; i < state.currentVideo.shots.length; i++) {
    const shot = state.currentVideo.shots[i];
    if (timeSeconds >= accum && timeSeconds < accum + shot.duration_seconds) {
      if (state.currentShotIndex !== i) {
        state.currentShotIndex = i;
        updateShotUI();
      }
      return;
    }
    accum += shot.duration_seconds;
  }
}

// Render Shots Strip Thumbnails
function renderShotsStrip() {
  elements.shotsStrip.innerHTML = '';
  if (!state.currentVideo || !state.currentVideo.shots) return;

  state.currentVideo.shots.forEach((shot, idx) => {
    const item = document.createElement('div');
    item.className = `shot-strip-item ${idx === state.currentShotIndex ? 'active' : ''}`;
    item.id = `shot-strip-${idx}`;
    item.innerHTML = `
      <div class="shot-strip-num">SHOT ${shot.shot_number}</div>
      <div class="shot-strip-dur">${shot.duration_seconds} sec</div>
    `;
    item.addEventListener('click', () => {
      jumpToShot(idx);
    });
    elements.shotsStrip.appendChild(item);
  });
}

// Update UI elements for the current shot (subtitles, badges, strip highlights)
function updateShotUI() {
  if (!state.currentVideo || !state.currentVideo.shots) return;
  const shot = state.currentVideo.shots[state.currentShotIndex];
  if (!shot) return;

  // Subtitle / Narration Banner
  elements.narrationText.textContent = shot.narration_text;
  elements.shotCounterBadge.textContent = `SHOT ${shot.shot_number} / ${state.currentVideo.shots.length}`;

  // Strip highlights
  document.querySelectorAll('.shot-strip-item').forEach((el, i) => {
    el.classList.toggle('active', i === state.currentShotIndex);
  });

  // Fallback visual frame
  if (elements.visualViewport && !elements.visualViewport.classList.contains('hidden')) {
    elements.currentVisualFrame.src = `/api/videos/${state.currentVideo.id}/shots/${shot.shot_number}/visual`;
  }
}

// Playback Engine
function togglePlay() {
  if (!state.currentVideo) return;
  if (state.isPlaying) {
    pauseVideo();
  } else {
    playVideo();
  }
}

function playVideo() {
  if (elements.html5VideoPlayer && elements.html5VideoPlayer.src) {
    elements.html5VideoPlayer.play().catch(e => {
      console.warn('Autoplay prevented or video play error:', e);
    });
    return;
  }

  // Fallback simulator loop if no MP4 attached
  state.isPlaying = true;
  elements.overlayPlayBtn.classList.add('hidden');
  elements.playIcon.classList.add('hidden');
  elements.pauseIcon.classList.remove('hidden');
  elements.playLabel.textContent = 'Pause';
  elements.audioPulse.classList.add('active');

  clearInterval(state.playbackTimer);
  state.playbackTimer = setInterval(() => {
    state.elapsedSeconds += 1;
    syncShotFromTime(state.elapsedSeconds);
    updateProgressUI();

    if (state.elapsedSeconds >= state.currentVideo.duration_seconds) {
      pauseVideo();
      state.currentShotIndex = 0;
      state.elapsedSeconds = 0;
      updateShotUI();
      showToast('Video playback completed.', 'info');
    }
  }, 1000);
}

function pauseVideo() {
  if (elements.html5VideoPlayer && elements.html5VideoPlayer.src && !elements.html5VideoPlayer.paused) {
    elements.html5VideoPlayer.pause();
    return;
  }

  state.isPlaying = false;
  elements.overlayPlayBtn.classList.remove('hidden');
  elements.playIcon.classList.remove('hidden');
  elements.pauseIcon.classList.add('hidden');
  elements.playLabel.textContent = 'Play';
  elements.audioPulse.classList.remove('active');
  clearInterval(state.playbackTimer);
}

function prevShot() {
  if (state.currentShotIndex > 0) {
    jumpToShot(state.currentShotIndex - 1);
  }
}

function nextShot() {
  if (state.currentVideo && state.currentShotIndex < state.currentVideo.shots.length - 1) {
    jumpToShot(state.currentShotIndex + 1);
  }
}

function jumpToShot(index) {
  if (!state.currentVideo || !state.currentVideo.shots) return;
  let shotStart = 0;
  for (let i = 0; i < index; i++) {
    shotStart += state.currentVideo.shots[i].duration_seconds;
  }

  state.currentShotIndex = index;
  state.elapsedSeconds = shotStart;

  if (elements.html5VideoPlayer && elements.html5VideoPlayer.src) {
    elements.html5VideoPlayer.currentTime = shotStart;
  }

  updateShotUI();
  updateProgressUI();
}

function seekToPercentage(pct) {
  if (!state.currentVideo) return;
  const targetSec = Math.floor(pct * state.currentVideo.duration_seconds);
  state.elapsedSeconds = targetSec;

  if (elements.html5VideoPlayer && elements.html5VideoPlayer.src) {
    elements.html5VideoPlayer.currentTime = targetSec;
  } else {
    syncShotFromTime(targetSec);
    updateShotUI();
    updateProgressUI();
  }
}

function updateProgressUI() {
  if (!state.currentVideo) return;
  const total = state.currentVideo.duration_seconds;
  const pct = Math.min(100, (state.elapsedSeconds / total) * 100);
  elements.timelineFill.style.width = `${pct}%`;
  elements.currentTime.textContent = formatTime(state.elapsedSeconds);
}

// Audio narration mute toggle
function toggleVoice() {
  state.voiceEnabled = !state.voiceEnabled;
  elements.voiceToggleBtn.classList.toggle('active', state.voiceEnabled);
  if (elements.html5VideoPlayer) {
    elements.html5VideoPlayer.muted = !state.voiceEnabled;
  }
}

// Feedback Modal Logic
function openFeedbackModal() {
  elements.feedbackCategorySelect.value = '';
  elements.adjustmentPreviewText.textContent = 'Select a category above to inspect its predefined adjustment prompt.';
  elements.feedbackModal.classList.remove('hidden');
}

function closeFeedbackModal() {
  elements.feedbackModal.classList.add('hidden');
}

function updateAdjustmentPreview() {
  const cat = elements.feedbackCategorySelect.value;
  if (FEEDBACK_ADJUSTMENTS[cat]) {
    elements.adjustmentPreviewText.textContent = `"${FEEDBACK_ADJUSTMENTS[cat]}"`;
  } else {
    elements.adjustmentPreviewText.textContent = 'Select a category above to inspect its predefined adjustment prompt.';
  }
}

async function handleFeedbackSubmit(e) {
  e.preventDefault();
  const category = elements.feedbackCategorySelect.value;
  if (!category || !state.currentVideo) return;

  try {
    const res = await fetch(`/api/videos/${state.currentVideo.id}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: state.userId,
        category
      })
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to submit feedback');
    }

    closeFeedbackModal();
    showToast(`Feedback recorded for "${category}". Predefined adjustment will be applied on regeneration!`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Regeneration Flow
async function handleRegenerate() {
  if (!state.currentVideo) return;

  // Server-side check
  if (!state.quota.allowed) {
    showToast('Regeneration limit reached: 3 attempts per rolling 24 hours. Showing current video.', 'warning');
    return;
  }

  try {
    pauseVideo();
    showGenerationModal();

    const res = await fetch(`/api/videos/${state.currentVideo.id}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: state.userId
      })
    });

    const json = await res.json();

    if (res.status === 429) {
      hideGenerationModal();
      await updateQuotaStatus();
      showToast(json.error || 'Regeneration limit reached (max 3/24h).', 'warning');
      return;
    }

    if (!res.ok) {
      throw new Error(json.error || 'Regeneration request failed.');
    }

    // Update quota counter
    await updateQuotaStatus();

    // Poll generation job progress
    await pollGenerationProgress(json.new_video_id, json.job_id);
  } catch (err) {
    hideGenerationModal();
    showToast(`Regeneration failed: ${err.message}`, 'error');
  }
}

function showGenerationModal() {
  elements.genErrorAlert.classList.add('hidden');
  elements.genProgressFill.style.width = '10%';
  setStepActive('QUEUED');
  elements.genStatusText.textContent = 'Status: Job Queued...';
  elements.generationModal.classList.remove('hidden');
}

function hideGenerationModal() {
  elements.generationModal.classList.add('hidden');
}

function setStepActive(stepName) {
  const steps = ['QUEUED', 'GENERATING_SCRIPT', 'GENERATING_VISUALS', 'GENERATING_AUDIO', 'ASSEMBLING'];
  const currentIndex = steps.indexOf(stepName);

  document.querySelectorAll('.step-item').forEach(el => {
    const step = el.getAttribute('data-step');
    const stepIdx = steps.indexOf(step);
    el.classList.remove('active', 'completed');
    if (stepIdx < currentIndex) {
      el.classList.add('completed');
    } else if (stepIdx === currentIndex) {
      el.classList.add('active');
    }
  });
}

async function pollGenerationProgress(videoId, jobId) {
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 800));

    try {
      const res = await fetch(`/api/videos/${videoId}/status?job_id=${jobId}`);
      const json = await res.json();

      if (json.status === 'GENERATING_SCRIPT') {
        elements.genProgressFill.style.width = '35%';
        setStepActive('GENERATING_SCRIPT');
        elements.genStatusText.textContent = 'Status: Generating structured script & shot list...';
      } else if (json.status === 'GENERATING_VISUALS') {
        elements.genProgressFill.style.width = '60%';
        setStepActive('GENERATING_VISUALS');
        elements.genStatusText.textContent = 'Status: Rendering SVG visual frames with Ada character...';
      } else if (json.status === 'GENERATING_AUDIO') {
        elements.genProgressFill.style.width = '80%';
        setStepActive('GENERATING_AUDIO');
        elements.genStatusText.textContent = 'Status: Generating narration audio with voice synthesizer...';
      } else if (json.status === 'ASSEMBLING') {
        elements.genProgressFill.style.width = '95%';
        setStepActive('ASSEMBLING');
        elements.genStatusText.textContent = 'Status: Assembling shots & encoding MP4 video...';
      } else if (json.status === 'COMPLETED') {
        elements.genProgressFill.style.width = '100%';
        elements.genStatusText.textContent = 'Status: Complete! Loading video...';
        await new Promise(r => setTimeout(r, 400));
        hideGenerationModal();

        // Refresh video list and load new video
        const refreshRes = await fetch('/api/videos?topic=Arrays');
        const refreshJson = await refreshRes.json();
        if (refreshJson.success) {
          state.videos = refreshJson.data;
          renderConceptList();
          await selectVideo(videoId);
          await loadGatewayRecommendations();
          showToast('Fresh AI video generated and ready to watch!', 'success');
        }
        return;
      } else if (json.status === 'FAILED') {
        throw new Error(json.error_message || 'Video generation failed.');
      }
    } catch (err) {
      elements.genErrorAlert.textContent = err.message;
      elements.genErrorAlert.classList.remove('hidden');
      setTimeout(() => hideGenerationModal(), 3000);
      return;
    }
  }
  hideGenerationModal();
  showToast('Generation timed out. Please try again.', 'error');
}

// Helpers
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(message, type = 'info') {
  elements.toast.textContent = message;
  elements.toast.className = `toast toast-${type}`;
  elements.toast.classList.remove('hidden');
  setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 4000);
}

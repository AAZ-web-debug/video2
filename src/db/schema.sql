-- AlgoVerse Database Schema
-- Person 2: Video Module & Shared Contracts

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  concept TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'READY', -- READY, PROCESSING, COMPLETED, FAILED
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER NOT NULL,
  source_type TEXT NOT NULL, -- 'REFERENCE' or 'GENERATED'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS video_shots (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  shot_number INTEGER NOT NULL,
  visual_description TEXT NOT NULL,
  narration_text TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  visual_asset_url TEXT,
  audio_asset_url TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_video_shots_video_id ON video_shots(video_id);
CREATE INDEX IF NOT EXISTS idx_videos_topic_concept ON videos(topic_id, concept);

CREATE TABLE IF NOT EXISTS video_style_guides (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS character_references (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  image_path TEXT NOT NULL,
  description TEXT NOT NULL,
  palette TEXT NOT NULL,
  version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Shared Regeneration State Table (Shared contract with Comic Module & Gateway)
CREATE TABLE IF NOT EXISTS shared_regeneration_states (
  user_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT NOT NULL,
  PRIMARY KEY (user_id, topic_id)
);

CREATE TABLE IF NOT EXISTS video_feedbacks (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  adjustment_instruction TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS video_jobs (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  concept TEXT NOT NULL,
  status TEXT NOT NULL, -- QUEUED, GENERATING_SCRIPT, GENERATING_VISUALS, GENERATING_AUDIO, ASSEMBLING, COMPLETED, FAILED
  progress INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  result_data TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

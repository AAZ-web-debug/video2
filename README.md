# AlgoVerse Video Module (Person 2)

A modular, production-quality, and extensible algorithmic video generation and playback engine for the AlgoVerse DSA learning platform. This module is architected for the **Arrays** topic first, while providing reusable interfaces for future data structures (Linked Lists, Stacks, Queues, Trees, Graphs, Sorting, etc.).

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Folder Structure](#2-folder-structure)
3. [Data Models & Database Schema](#3-data-models--database-schema)
4. [API Endpoints](#4-api-endpoints)
5. [AI Script Generation Pipeline](#5-ai-script-generation-pipeline)
6. [Shot List Schema & Validation](#6-shot-list-schema--validation)
7. [Video Style Guide Summary](#7-video-style-guide-summary)
8. [Character Reference Integration](#8-character-reference-integration)
9. [Visual Generation Adapter](#9-visual-generation-adapter)
10. [Narration & Speech Synchronization](#10-narration--speech-synchronization)
11. [Video Assembly Layer](#11-video-assembly-layer)
12. [Structured Feedback System](#12-structured-feedback-system)
13. [Shared 24-Hour Regeneration Limit](#13-shared-24-hour-regeneration-limit)
14. [Environment Variables](#14-environment-variables)
15. [Local Setup & Execution](#15-local-setup--execution)
16. [Automated Test Suite](#16-automated-test-suite)
17. [Future Topic Expansion](#17-future-topic-expansion)

---

## 1. Architecture Overview

The Video Module acts as an independent, loosely coupled subsystem designed to interface seamlessly with Person 1 (Comic Module) and Person 3 / Gateway:

```text
                               +----------------------------+
                               |     Shared Gateway / UI    |
                               +--------------+-------------+
                                              |
                   +--------------------------+--------------------------+
                   |                                                     |
        [GET /gateway/recommendations]                             [POST /feedback]
        (2 Pre-made + 1 Fresh AI Video)                            [POST /regenerate]
                   |                                                     |
                   v                                                     v
+--------------------------------------+             +--------------------------------------+
|       Video Controller & API         |             |   Shared Regeneration Limit Engine   |
|   (Express.js + Zod Validation)      |             |     (Max 3 / Rolling 24-Hour Cap)    |
+------------------+-------------------+             +------------------+-------------------+
                   |                                                    |
                   +---------------------+                              |
                                         v                              v
                           +----------------------------+  +----------------------------+
                           |   Script Generation (AI)   |  |   Shared SQLite Database   |
                           |  - Lean Prompt Tokenomics  |  |  (shared_regeneration_     |
                           |  - Gemini 2.5 / Fallback   |  |   states, videos, shots)   |
                           +-------------+--------------+  +----------------------------+
                                         |
                                         v
                           +----------------------------+
                           |  Visual Generation Adapter |
                           |  - Shared Palette Tokens   |
                           |  - Reused Character: Ada   |
                           +-------------+--------------+
                                         |
                                         v
                           +----------------------------+
                           | Video Assembly & Playback  |
                           |  - Frame-Synchronized SVG  |
                           |  - Web Speech / WAV Audio  |
                           +----------------------------+
```

---

## 2. Folder Structure

```text
AppGenAiPerson2/
├── package.json                    # Dependencies, scripts, and test definitions
├── .env.example                    # Environment variable template
├── .env                            # Active environment configuration
├── README.md                       # Comprehensive Video Module documentation
├── VIDEO_STYLE_GUIDE.md            # Standalone formal Video Style Guide
├── data/
│   ├── algoverse_video.db          # Embedded SQLite database (WAL mode)
│   ├── knowledge_base/
│   │   └── arrays.json             # Structured concept knowledge for Arrays
│   └── seeds/
│       ├── character_reference.json# Shared Comic/Video character sheet ("Ada")
│       ├── video_style_guide.json  # Style guide configuration
│       └── reference_videos.json   # 6 Reference Videos with exact shot lists
├── src/
│   ├── config/
│   │   ├── palette.js              # Shared AlgoVerse color palette tokens
│   │   └── feedback_adjustments.js # 5 Predefined feedback mappings
│   ├── db/
│   │   ├── connection.js           # better-sqlite3 connection manager
│   │   ├── schema.sql              # Database DDL schema
│   │   └── seed.js                 # Automatic seeder for 6 reference videos
│   ├── models/
│   │   ├── Video.js                # Video data access object
│   │   ├── CharacterReference.js   # Reusable character sheet reader
│   │   └── SharedRegenerationState.js # Shared Comic/Video limit tracker
│   ├── services/
│   │   ├── knowledgeBaseService.js # Lean context extractor for prompt
│   │   ├── scriptGenerationService.js # AI script generator (Gemini + fallback)
│   │   ├── visualGenerationAdapter.js # Modular visual generation adapter (resvg PNGs)
│   │   ├── narrationGenerationAdapter.js # Speech & audio timing cues
│   │   ├── ttsService.js           # PowerShell SAPI / PCM audio synthesizer
│   │   ├── videoAssemblyService.js # FFmpeg H.264/AAC video compiler & demuxer
│   │   ├── regenerationLimitService.js # Rolling 24h attempt enforcement
│   │   ├── feedbackService.js      # Structured feedback validator & storage
│   │   └── jobQueueService.js      # Async generation pipeline & status tracker
│   ├── validators/
│   │   └── shotListValidator.js    # Strict Zod schema & invariant validation
│   ├── controllers/
│   │   └── videoController.js      # HTTP request handlers & error handling
│   ├── routes/
│   │   └── videoRoutes.js          # Express route definitions
│   ├── server.js                   # Application bootstrap and server entry
│   └── tests/
│       ├── shotValidation.test.js  # Shot list schema & business rule tests
│       ├── regenerationLimit.test.js # Rolling 24h regeneration limit tests
│       ├── feedback.test.js        # Feedback category & adjustment tests
│       ├── api.test.js             # End-to-end API integration tests
│       └── mediaIntegration.test.js# Real media & MP4 video assembly tests
└── public/
    ├── index.html                  # Responsive video player & generation UI
    ├── index.css                   # Cyber-clarity dark theme & glassmorphism
    ├── app.js                      # Client playback engine, HTML5 video player
    ├── videos/
    │   ├── arrays/                 # 6 Pre-made playable reference MP4 videos
    │   │   ├── what-is-an-array.mp4
    │   │   ├── index-based-access.mp4
    │   │   ├── insertion.mp4
    │   │   ├── deletion.mp4
    │   │   ├── traversal.mp4
    │   │   └── search.mp4
    │   └── generated/              # Freshly generated AI videos on disk
    └── assets/
        └── character/
            └── ada_guide.svg       # Vector illustration of Ada guide
```

---

## 3. Data Models & Database Schema

The SQLite schema matches the specification and provides shared contracts:

### `videos`
- `id` (TEXT, PK): Unique video identifier (e.g. `arrays-what-is-an-array`).
- `topic_id` (TEXT): Topic name (e.g. `Arrays`).
- `concept` (TEXT): Specific concept (e.g. `Index-Based Access`).
- `title` (TEXT): Video title.
- `status` (TEXT): `READY`, `PROCESSING`, `COMPLETED`, `FAILED`.
- `video_url` (TEXT): Video stream URL.
- `thumbnail_url` (TEXT): Thumbnail preview URL.
- `duration_seconds` (INTEGER): Total duration (strictly 60–90 seconds).
- `source_type` (TEXT): `REFERENCE` or `GENERATED`.
- `created_at` / `updated_at` (TEXT): ISO 8601 timestamps.

### `video_shots`
- `id` (TEXT, PK): Shot identifier (`<video_id>-s<shot_number>`).
- `video_id` (TEXT, FK): References `videos(id)`.
- `shot_number` (INTEGER): Sequential 1-based index.
- `visual_description` (TEXT): Detailed visual explanation.
- `narration_text` (TEXT): 1–2 sentence calm instructional text.
- `duration_seconds` (INTEGER): Shot duration (4–20s).
- `visual_asset_url` (TEXT): Endpoint returning SVG/canvas asset.
- `audio_asset_url` (TEXT): Audio asset or TTS sync endpoint.

### `shared_regeneration_states` *(Shared with Comic Module)*
- `user_id` (TEXT): User identifier.
- `topic_id` (TEXT): Topic identifier (e.g. `Arrays`).
- `attempt_count` (INTEGER): Current attempt count (0 to 3).
- `last_attempt_at` (TEXT): Timestamp of last regeneration attempt.
- `PRIMARY KEY (user_id, topic_id)`

---

## 4. API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/videos` | List all videos (supports `?topic=Arrays`, `?gateway=true`) |
| `GET` | `/api/videos/gateway/recommendations` | Returns **2 pre-made + 1 freshly generated** video |
| `GET` | `/api/videos/:id` | Get complete video data with sequential shot list |
| `GET` | `/api/videos/:id/stream` | Streamable synchronized video manifest |
| `GET` | `/api/videos/:id/shots/:shotNumber/visual` | Serve dynamic SVG visual asset for a shot |
| `POST` | `/api/videos/generate/script` | Generate & strictly validate AI shot list |
| `POST` | `/api/videos/generate` | Start asynchronous generation job (`QUEUED` $\to$ `COMPLETED`) |
| `GET` | `/api/videos/:id/status` | Query generation job status & progress |
| `POST` | `/api/videos/:id/feedback` | Submit structured feedback (one of 5 categories) |
| `POST` | `/api/videos/:id/regenerate` | Regenerate video with rolling 24h cap check |
| `GET` | `/api/videos/limits/:userId/:topicId` | Check user regeneration quota and reset time |
| `GET` | `/api/character` | Fetch shared character reference sheet ("Ada") |
| `GET` | `/api/style-guide` | Fetch video style guide configuration |

---

## 5. AI Script Generation Pipeline

```text
User selects topic/concept
        ↓
POST /api/videos/generate
        ↓
Lean Knowledge Base Fetch (only relevant concept extracted)
        ↓
Video Style Guide + Reused Character Sheet ("Ada")
        ↓
Feedback Adjustment Injection (if user previously gave feedback)
        ↓
AI Script Generation (Gemini 2.5 Flash / Deterministic Fallback)
        ↓
Strict Schema & Invariant Validation (Zod)
        ↓
Valid Shot List Stored
```

### Free-Tier Token Optimization Rules:
- Only the specific concept's definition and key points are sent in prompts.
- Output is enforced as structured JSON (`responseMimeType: "application/json"`).
- Character details are passed as fixed metadata rather than regenerated from scratch.
- If external API keys are unavailable or rate-limited, the system falls back to an offline deterministic synthesizer that produces compliant, validated shot lists.

---

## 6. Shot List Schema & Validation

Every shot list must satisfy:
1. `target_duration_seconds` must be an integer between **60 and 90**.
2. `shots` must be an array of at least 4 shots.
3. Every shot must contain:
   - `shot_number` (strictly sequential: 1, 2, 3...)
   - `visual_description` (non-empty, minimum 10 characters)
   - `narration_text` (non-empty, minimum 10 characters)
   - `duration_seconds` (integer between 4 and 20)
4. $\sum \text{shot.duration\_seconds} \equiv \text{target\_duration\_seconds}$ (exact match, no drift).

Malformed inputs, negative durations, out-of-order shot numbers, or duration discrepancies throw structured errors and are immediately rejected.

---

## 7. Video Style Guide Summary

- **Total video length**: 60–90 seconds (average: 75s).
- **Average shot duration**: **8.65 seconds** (calculated from the 6 reference videos).
- **Tone**: Calm, clear, instructional, encouraging, authoritative.
- **Prohibited**: Comedic slang, childish analogies, sarcasm, filler introductions.
- **Narrative Arc**:
  - Shots 1–2: Setup & Motivation
  - Shots 3–4: Structural Mechanics & Analogy
  - Shots 5–7: Step-by-Step Algorithm & Code
  - Shots 8–9: Time Complexity (Big-O) & Recaps

---

## 8. Character Reference Integration

- Character: **Ada** (`char-ada-001`), AlgoVerse Lead DSA Guide.
- Appearance: Deep indigo hair in ponytail, ultramarine tech vest with cyan piping, glowing wrist gauntlets.
- The Video Module **never** invents an alternative character design.
- The shared reference sheet is read from `data/seeds/character_reference.json` and consumed by the visual generator adapter.

---

## 9. Visual Generation Adapter

- Decoupled through `VisualGenerationAdapter` (`src/services/visualGenerationAdapter.js`).
- Combines Shot Visual Description + Character Sheet + Shared Palette.
- Produces responsive SVG frames served directly through `/api/videos/:id/shots/:shotNumber/visual`.
- Provider-independent: Can be swapped with canvas renderers, Remotion, or external video generative models without modifying core business logic.

---

## 10. Narration & Speech Synchronization

- Narration text conforms to the **"simple but not weak"** standard.
- The browser frontend uses the Web Speech API configured to Ada's calm, measured cadence (rate: 0.95x) with audio pulse wave indicators.
- Server-side adapter `NarrationGenerationAdapter` calculates word-level timestamp cues for time synchronization.

---

## 11. Video Assembly Layer

- `VideoAssemblyService` (`src/services/videoAssemblyService.js`) assembles individual shots into a synchronized timeline manifest.
- Computes `start_time_seconds`, `end_time_seconds`, and transition styles.
- Exposed via `/api/videos/:id/stream` for synchronized playback.

---

## 12. Structured Feedback System

Users cannot submit arbitrary free-text complaints as prompt instructions. They must select from 5 predefined categories:

1. **`pacing`** $\to$ *"Improve pacing by shortening slow shots and increasing visual changes between concept beats."*
2. **`narration clarity`** $\to$ *"Use simpler wording, shorter sentences, and explain technical terms before using them."*
3. **`visual style`** $\to$ *"Keep the existing character reference and shared palette while making visuals clearer and more consistent."*
4. **`too long/too short`** $\to$ *"Adjust the number and duration of shots while keeping the final video between 60 and 90 seconds."*
5. **`other`** $\to$ *"Refine the overall instructional flow, keeping the explanation calm, clear, and strictly aligned with the style guide."*

---

## 13. Shared 24-Hour Regeneration Limit

- Rule: **Maximum 3 regenerations per user per topic per rolling 24-hour period.**
- Uses shared SQLite table `shared_regeneration_states` (`user_id`, `topic_id`, `attempt_count`, `last_attempt_at`).
- Enforced strictly on the server:
  - Attempt 1, 2, 3: Allowed (HTTP 202).
  - Attempt 4+: Blocked with HTTP 429 and `resets_in_ms`.
  - After 24 hours: Counter automatically resets to 0.
  - Different users and topics have independent counters.

---

## 14. Environment Variables

Create `.env` using `.env.example`:

```bash
PORT=3000
DB_PATH=data/algoverse_video.db
GEMINI_API_KEY=
```

---

## 15. Local Setup & Execution

### Prerequisites:
- Node.js v18+ (tested on Node v24.18.1)
- npm

### Installation:
```bash
# Install dependencies
npm install

# Seed reference videos and database
npm run seed

# Run automated test suite
npm test

# Start the application server
npm start
```

Open `http://localhost:3000` in any web browser to view the video theater, switch concepts, play reference videos, test structured feedback, and trigger AI regenerations.

---

## 16. Automated Test Suite

Run tests:
```bash
npm test
```

### Test Coverage:
1. `src/tests/shotValidation.test.js`:
   - Valid shot list acceptance
   - Non-object / null rejection
   - Missing/empty narration rejection
   - Short visual description rejection
   - Invalid shot duration rejection
   - Duration < 60s and > 90s rejection
   - Duration sum mismatch rejection
   - Non-sequential shot number rejection
2. `src/tests/regenerationLimit.test.js`:
   - 1st, 2nd, 3rd regeneration allowed
   - 4th regeneration blocked with HTTP 429
   - Rolling 24-hour expiration reset
   - Cross-topic independence
   - Cross-user independence
3. `src/tests/feedback.test.js`:
   - 5 allowed categories accepted
   - Unauthorized categories rejected
   - Exact directive mapping verified
   - Latest feedback retrieval for regeneration
4. `src/tests/api.test.js`:
   - Reference video list retrieval
   - Gateway recommendations (2 pre-made + 1 AI)
   - Shot retrieval by ID
   - Script generation endpoint
   - Asynchronous job execution & polling
   - Feedback submission
   - Regeneration cap enforcement (429)
5. `src/tests/mediaIntegration.test.js`:
   - Verification that all 6 reference MP4 files exist on disk with valid file size (>500KB)
   - Probe validation for H.264 video stream, AAC audio stream, and 60-90s duration
   - Database record linking to playable MP4 URLs
   - HTTP HEAD/GET static streaming with video/mp4 MIME type
   - Feedback prompt injection into next generation request
   - Real end-to-end MP4 assembly from fresh generation job resulting in COMPLETED status

**Result: 29 passing tests across 5 suites (0 failures).**

---

## 17. Future Topic Expansion

Adding a new DSA topic (e.g. `LinkedLists`, `Stacks`, `Trees`) requires zero architectural refactoring:
1. Add `data/knowledge_base/<topic>.json` with topic definitions and concept visual cues.
2. Add reference video shot lists to `data/seeds/reference_videos.json`.
3. Run `npm run seed`.
4. The generation pipeline, character reference, feedback adjustments, and regeneration limits automatically support the new topic.

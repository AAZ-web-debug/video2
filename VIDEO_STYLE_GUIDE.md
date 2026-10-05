# AlgoVerse Video Style Guide (Person 2 — Video Module)

## Source of Truth for Video Generation

This document defines the formal aesthetic, structural, narrative, and technical standards for all AlgoVerse video content. All AI-generated video scripts and visual assembly pipelines must adhere strictly to these rules.

---

### 1. Target Video Specifications

- **Total Video Duration**: Strictly between **60 and 90 seconds**.
- **Average Video Duration**: **75 seconds** (derived from the 6 reference videos).
- **Average Shot Duration**: **8.65 seconds** (standard shot window: 7 to 9 seconds).
- **Total Shots per Video**: **8 to 10 shots**.
- **Shot Synchronization**: The sum of all individual shot durations must equal the target video duration with zero drift.

---

### 2. Narration Style ("Simple But Not Weak")

The video narration adopts the exact standard established for AlgoVerse:

- **Tone**: Calm, instructional, authoritative, encouraging, and clear.
- **Audience**: Beginners to intermediate learners seeking mental models and technical rigor without condescension.
- **Sentence Structure**: 
  - Each shot must have **1 to 2 concise sentences**.
  - Average word count per shot: **14 to 26 words** (approx. 2.2 to 2.8 words per second).
- **Terminology Policy**:
  - Technical terms (e.g., *contiguous memory*, *zero-based indexing*, *O(1) constant time*, *linear search*) must be introduced plainly with an immediate visual anchor.
  - Explain concepts first, then label them with technical terminology.
- **Prohibited Patterns**:
  - NO comedic quips, puns, jokes, or sarcasm.
  - NO childish analogies, cartoon sound effects, or patronizing language.
  - NO cinematic filler (e.g., "Welcome back, guys!", "In this epic video...").

---

### 3. Voice Style

- **Cadence**: Steady, measured, articulate, and rhythmic.
- **Delivery**: Instructional presentation similar to modern professional scientific and technical documentaries (e.g., 3Blue1Brown, Kurzgesagt-style clarity, or MIT OpenCourseWare).
- **Emotion**: Thoughtful curiosity, intellectual clarity, and steady assurance.

---

### 4. Pacing Rules and Narrative Arc

Every AlgoVerse concept video follows a rigorous 4-beat structure across 8–10 sequential shots:

| Beat | Shot Range | Target Duration | Purpose | Visual State Requirement |
| :--- | :--- | :--- | :--- | :--- |
| **Beat 1: Setup & Motivation** | Shots 1–2 | 16–18 sec | Introduce problem or core definition | Problem visualization; unstructured vs structured elements |
| **Beat 2: Structural Mechanics** | Shots 3–4 | 16–18 sec | Hardware/memory reality & real-world mental model | Contiguous memory cells, address calculation, physical analogy |
| **Beat 3: Active Demonstration** | Shots 5–7 | 24–27 sec | Step-by-step operation, code syntax, pointer animation | Moving pointers, shifting elements, glowing comparison cells |
| **Beat 4: Synthesis & Complexity** | Shots 8–9 | 16–18 sec | Time complexity (Big-O), takeaways, recap | Complexity badge, structural invariant summary, clear array state |

**Visual Transition Rule**: Every shot transition must correspond to a distinct visual mutation. Never hold a static image across consecutive narration beats.

---

### 5. Character Reference & Visual Language

- **Primary Character**: **Ada** (AlgoVerse DSA Guide).
- **Reusability Rule**: The video module **never** regenerates a character description or appearance from scratch. It directly consumes the shared reference sheet.
- **Character Attributes**:
  - Deep indigo hair tied in a rear ponytail with electric-cyan bangs.
  - Ultramarine tech-vest over a slate-and-cyan trimmed exploration suit.
  - Holographic wristband communicator displaying data diagnostics.
  - Role: Presenter, guide, and interactive algorithm demonstrator.
- **Shared Palette**:
  - Background Dark: `#0B0F19` / `#0F172A`
  - Container / Card: `#1E293B`
  - Primary Indigo/Blue: `#3B82F6` / `#1E3A8A`
  - Neon Accent / Pointer: `#06B6D4` / `#38BDF8`
  - Success / Match: `#10B981` / `#34D399`
  - Alert / Shift / Mismatch: `#F59E0B` / `#EF4444`
  - Text Primary: `#F8FAFC`
  - Text Secondary: `#94A3B8`

---

### 6. Feedback Adjustment Matrix

When a user submits structured feedback, it must be mapped to one of the following five standardized directives:

1. **pacing**: *"Improve pacing by shortening slow shots and increasing visual changes between concept beats."*
2. **narration clarity**: *"Use simpler wording, shorter sentences, and explain technical terms before using them."*
3. **visual style**: *"Keep the existing character reference and shared palette while making visuals clearer and more consistent."*
4. **too long/too short**: *"Adjust the number and duration of shots while keeping the final video between 60 and 90 seconds."*
5. **other**: *"Refine the overall instructional flow, keeping the explanation calm, clear, and strictly aligned with the style guide."*

---

### 7. Extensibility to Future Topics

While Arrays is Topic 1, this style guide serves as the invariant contract for future topics (Linked Lists, Stacks, Queues, Trees, Graphs, Sorting, Dynamic Programming).

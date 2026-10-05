const { GoogleGenAI } = require('@google/genai');
const { getConceptKnowledge } = require('./knowledgeBaseService');
const { validateShotList } = require('../validators/shotListValidator');
const CharacterReference = require('../models/CharacterReference');
const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

class ScriptGenerationService {
  /**
   * Generates a structured video script shot list.
   * Enforces lean prompt tokens and strict validation.
   */
  static async generateScript({ topic, concept, feedbackAdjustment = null, targetDuration = 75 }) {
    // 1. Fetch lean knowledge base context
    const kb = getConceptKnowledge(topic, concept);

    // 2. Fetch active character reference
    const character = CharacterReference.getActive() || {
      name: 'Ada',
      role: 'AlgoVerse Guide',
      description: 'Explorer in indigo tech vest with cyan gauntlets and calm instructional demeanor.'
    };

    // 3. Fetch style guide rules
    const styleGuideRow = db.prepare('SELECT content FROM video_style_guides ORDER BY created_at DESC LIMIT 1').get();
    const styleGuide = styleGuideRow ? JSON.parse(styleGuideRow.content) : null;

    // 4. Check if Gemini API Key is available
    const apiKey = process.env.GEMINI_API_KEY;

    let rawScriptJson = null;

    if (apiKey && apiKey !== 'placeholder' && !apiKey.startsWith('your_')) {
      try {
        rawScriptJson = await this._callGeminiAPI({
          apiKey,
          topic,
          concept,
          kb,
          character,
          styleGuide,
          feedbackAdjustment,
          targetDuration
        });
      } catch (err) {
        console.warn(`[ScriptGenerationService] Gemini API call failed or rate-limited: ${err.message}. Falling back to deterministic script synthesizer.`);
        rawScriptJson = this._synthesizeScript({ topic, concept, kb, character, feedbackAdjustment, targetDuration });
      }
    } else {
      // Free-tier offline deterministic script synthesizer
      rawScriptJson = this._synthesizeScript({ topic, concept, kb, character, feedbackAdjustment, targetDuration });
    }

    // 5. Strict Schema & Invariant Validation
    const validationResult = validateShotList(rawScriptJson);
    return validationResult.data;
  }

  static async _callGeminiAPI({ apiKey, topic, concept, kb, character, styleGuide, feedbackAdjustment, targetDuration }) {
    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are the AlgoVerse Video Script Generator for Person 2.
Generate a structured video shot list strictly in valid JSON format.
TOPIC: ${topic}
CONCEPT: ${concept}
TARGET DURATION: ${targetDuration} seconds (must be between 60 and 90 seconds).
CHARACTER: ${character.name}, ${character.description}
KNOWLEDGE BASE: ${kb.details.definition}. Key points: ${kb.details.key_points.join(' | ')}. Visual cues: ${kb.details.visual_cues}.
NARRATION RULES: Simple but not weak. Calm, clear, instructional tone. Non-comedic. Non-childish. 1-2 concise sentences per shot.
${feedbackAdjustment ? `FEEDBACK DIRECTIVE: ${feedbackAdjustment}` : ''}

CRITICAL RULES:
- Output MUST be valid JSON only. No markdown ticks, no preamble, no postscript.
- Shot numbers must be strictly sequential: 1, 2, 3...
- Each shot duration must be an integer between 5 and 12 seconds.
- The SUM of all shot durations MUST EQUAL exactly ${targetDuration}.

Required JSON Schema:
{
  "video_id": "generated-${Date.now()}",
  "topic": "${topic}",
  "concept": "${concept}",
  "title": "${concept} in ${topic}",
  "target_duration_seconds": ${targetDuration},
  "shots": [
    {
      "shot_number": 1,
      "visual_description": "Detailed visual description of screen elements and animations...",
      "narration_text": "One to two clear, instructional sentences.",
      "duration_seconds": 8
    }
  ]
}`;

    // Free-tier optimized fast model
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: `Generate the ${targetDuration}-second video script for concept "${concept}". Follow schema exactly.` }]
        }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text ? response.text.trim() : '';
    // Strip accidental code fences if present
    const cleaned = responseText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    return JSON.parse(cleaned);
  }

  /**
   * Deterministic high-quality script synthesizer adhering strictly to the Style Guide.
   * Ensures instant, offline-capable, zero-token generation when no API key is set or when free quota is reached.
   */
  static _synthesizeScript({ topic, concept, kb, character, feedbackAdjustment, targetDuration = 75 }) {
    const videoId = `gen-${topic.toLowerCase()}-${concept.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
    const details = kb.details;

    // Define 8-shot structured breakdown tuned to target duration (e.g. 75s)
    // 9 + 10 + 9 + 10 + 10 + 9 + 9 + 9 = 75s
    const durations = [9, 10, 9, 10, 10, 9, 9, 9];
    const sumD = durations.reduce((a, b) => a + b, 0);
    const diff = targetDuration - sumD;
    durations[durations.length - 1] += diff; // Adjust last shot so sum === targetDuration

    const adjustmentNote = feedbackAdjustment ? ` [Adjusted for: ${feedbackAdjustment}]` : '';

    const shots = [
      {
        shot_number: 1,
        visual_description: `${character.name} stands in the digital AlgoVerse studio with title graphics reading "${concept}". An animated introductory diagram of memory blocks forms beside her.`,
        narration_text: `Welcome to this exploration of ${concept} in ${topic}. Today we break down how it works under the hood.${adjustmentNote ? ' We focus on clear pacing and exact terminology.' : ''}`,
        duration_seconds: durations[0]
      },
      {
        shot_number: 2,
        visual_description: `A close-up diagram displays ${details.definition} with glowing vector cells and callouts.`,
        narration_text: `${details.definition} It provides the foundation for orderly data manipulation.`,
        duration_seconds: durations[1]
      },
      {
        shot_number: 3,
        visual_description: `An animated visual sequence illustrates: ${details.key_points[0]} with highlighted memory slots.`,
        narration_text: `At the physical level, ${details.key_points[0].toLowerCase()}`,
        duration_seconds: durations[2]
      },
      {
        shot_number: 4,
        visual_description: `${character.name} points to a clear mechanical animation demonstrating: ${details.key_points[1]}.`,
        narration_text: `To understand the mechanics, notice how ${details.key_points[1].toLowerCase()}`,
        duration_seconds: durations[3]
      },
      {
        shot_number: 5,
        visual_description: `Step-by-step state transformation occurs: ${details.visual_cues}. Cyan indicator tracks each transition.`,
        narration_text: `As each operation executes, memory boundaries remain strictly respected, preserving our contiguous structure.`,
        duration_seconds: durations[4]
      },
      {
        shot_number: 6,
        visual_description: `A code terminal appears showing practical application: ${details.key_points[3] || details.key_points[2]}.`,
        narration_text: `In code, this translates directly to structured operations with predictable performance.`,
        duration_seconds: durations[5]
      },
      {
        shot_number: 7,
        visual_description: `Time complexity gauges activate on screen showing computational cost: ${details.key_points[2] || 'efficient runtime execution'}.`,
        narration_text: `Analyzing the time complexity reveals why this technique remains fundamental across modern software systems.`,
        duration_seconds: durations[6]
      },
      {
        shot_number: 8,
        visual_description: `${character.name} steps forward beside a summary checklist highlighting: Contiguous Storage, Invariant Guarantees, Predictable Access.`,
        narration_text: `Mastering ${concept} provides you with the essential intuition needed to design and evaluate robust algorithms.`,
        duration_seconds: durations[7]
      }
    ];

    return {
      video_id: videoId,
      topic,
      concept,
      title: `${concept}: Algorithmic Mechanics and Implementation`,
      target_duration_seconds: targetDuration,
      shots
    };
  }
}

module.exports = ScriptGenerationService;

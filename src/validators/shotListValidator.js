const { z } = require('zod');

const shotSchema = z.object({
  shot_number: z.number().int().positive({ message: 'shot_number must be a positive integer' }),
  visual_description: z.string().min(10, { message: 'visual_description must have at least 10 characters' }),
  narration_text: z.string().min(10, { message: 'narration_text must have at least 10 characters' }),
  duration_seconds: z.number().int().min(4, { message: 'duration_seconds must be at least 4' }).max(20, { message: 'duration_seconds cannot exceed 20' }),
  visual_metadata: z.any().optional()
}).passthrough();

const shotListSchema = z.object({
  video_id: z.string().min(3, { message: 'video_id must be at least 3 characters' }),
  topic: z.string().min(2, { message: 'topic is required' }),
  concept: z.string().min(2, { message: 'concept is required' }),
  title: z.string().min(5, { message: 'title must be at least 5 characters' }).optional(),
  target_duration_seconds: z.number().int().min(60, { message: 'target_duration_seconds must be between 60 and 90' }).max(90, { message: 'target_duration_seconds must be between 60 and 90' }),
  shots: z.array(shotSchema).min(4, { message: 'shots array must contain at least 4 shots' }).max(15, { message: 'shots array cannot exceed 15 shots' })
});

/**
 * Validates a video shot list against all business invariants.
 * Throws a formatted Error or returns { valid: true, data: validatedData }
 */
function validateShotList(rawInput) {
  if (!rawInput || typeof rawInput !== 'object') {
    throw new Error('Invalid shot list: payload must be a non-null JSON object');
  }

  const parsed = shotListSchema.safeParse(rawInput);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Shot list schema validation failed: ${errorDetails}`);
  }

  const data = parsed.data;

  // Invariant 1: Sequential shot numbers starting at 1
  for (let i = 0; i < data.shots.length; i++) {
    const expectedNumber = i + 1;
    if (data.shots[i].shot_number !== expectedNumber) {
      throw new Error(`Non-sequential shot number at index ${i}: expected ${expectedNumber}, got ${data.shots[i].shot_number}`);
    }
  }

  // Invariant 2: Sum of durations must equal target_duration_seconds exactly
  const sumDuration = data.shots.reduce((acc, shot) => acc + shot.duration_seconds, 0);
  if (sumDuration !== data.target_duration_seconds) {
    throw new Error(`Duration mismatch: sum of shot durations (${sumDuration}s) does not match target_duration_seconds (${data.target_duration_seconds}s)`);
  }

  // Invariant 3: Total duration must be within 60 to 90 seconds
  if (sumDuration < 60 || sumDuration > 90) {
    throw new Error(`Total video duration must be between 60 and 90 seconds, got ${sumDuration}s`);
  }

  return {
    valid: true,
    data
  };
}

module.exports = {
  validateShotList,
  shotListSchema,
  shotSchema
};

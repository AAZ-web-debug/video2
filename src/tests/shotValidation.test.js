const { test, describe } = require('node:test');
const assert = require('node:assert');
const { validateShotList } = require('../validators/shotListValidator');

describe('Shot List Validation Rules', () => {
  const createValidShotList = () => ({
    video_id: 'test-arrays-valid',
    topic: 'Arrays',
    concept: 'What is an Array?',
    title: 'Valid Array Test',
    target_duration_seconds: 75,
    shots: [
      {
        shot_number: 1,
        visual_description: 'Ada stands next to four empty memory boxes.',
        narration_text: 'An array stores elements together in memory.',
        duration_seconds: 15
      },
      {
        shot_number: 2,
        visual_description: 'Values 10, 20, 30, and 40 slide into the boxes.',
        narration_text: 'Each element occupies a contiguous slot.',
        duration_seconds: 20
      },
      {
        shot_number: 3,
        visual_description: 'A code terminal displays scores array assignment.',
        narration_text: 'We access them using predictable offsets.',
        duration_seconds: 20
      },
      {
        shot_number: 4,
        visual_description: 'Ada presents the summary card with Big-O metrics.',
        narration_text: 'This makes arrays efficient for direct access.',
        duration_seconds: 20
      }
    ]
  });

  test('accepts a valid shot list matching all rules', () => {
    const input = createValidShotList();
    const result = validateShotList(input);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.data.target_duration_seconds, 75);
    assert.strictEqual(result.data.shots.length, 4);
  });

  test('rejects non-object or null input', () => {
    assert.throws(() => validateShotList(null), /must be a non-null JSON object/);
    assert.throws(() => validateShotList('invalid string'), /must be a non-null JSON object/);
  });

  test('rejects missing or empty narration_text', () => {
    const input = createValidShotList();
    input.shots[0].narration_text = '';
    assert.throws(() => validateShotList(input), /narration_text/);
  });

  test('rejects missing or too short visual_description', () => {
    const input = createValidShotList();
    input.shots[1].visual_description = 'short';
    assert.throws(() => validateShotList(input), /visual_description/);
  });

  test('rejects invalid shot duration (< 4s or > 20s)', () => {
    const input = createValidShotList();
    input.shots[0].duration_seconds = 2; // too short
    assert.throws(() => validateShotList(input), /duration_seconds/);
  });

  test('rejects total duration < 60 seconds', () => {
    const input = createValidShotList();
    input.target_duration_seconds = 50;
    input.shots = [
      { shot_number: 1, visual_description: 'Visual description for shot one.', narration_text: 'Narration for shot one here.', duration_seconds: 10 },
      { shot_number: 2, visual_description: 'Visual description for shot two.', narration_text: 'Narration for shot two here.', duration_seconds: 15 },
      { shot_number: 3, visual_description: 'Visual description for shot three.', narration_text: 'Narration for shot three here.', duration_seconds: 15 },
      { shot_number: 4, visual_description: 'Visual description for shot four.', narration_text: 'Narration for shot four here.', duration_seconds: 10 }
    ];
    assert.throws(() => validateShotList(input), /target_duration_seconds must be between 60 and 90/);
  });

  test('rejects total duration > 90 seconds', () => {
    const input = createValidShotList();
    input.target_duration_seconds = 95;
    input.shots = [
      { shot_number: 1, visual_description: 'Visual description for shot one.', narration_text: 'Narration for shot one here.', duration_seconds: 20 },
      { shot_number: 2, visual_description: 'Visual description for shot two.', narration_text: 'Narration for shot two here.', duration_seconds: 20 },
      { shot_number: 3, visual_description: 'Visual description for shot three.', narration_text: 'Narration for shot three here.', duration_seconds: 20 },
      { shot_number: 4, visual_description: 'Visual description for shot four.', narration_text: 'Narration for shot four here.', duration_seconds: 20 },
      { shot_number: 5, visual_description: 'Visual description for shot five.', narration_text: 'Narration for shot five here.', duration_seconds: 15 }
    ];
    assert.throws(() => validateShotList(input), /target_duration_seconds must be between 60 and 90/);
  });

  test('rejects shot duration sum mismatch against target_duration_seconds', () => {
    const input = createValidShotList();
    input.target_duration_seconds = 80; // Sum of shots is 75, not 80
    assert.throws(() => validateShotList(input), /Duration mismatch/);
  });

  test('rejects non-sequential shot numbers', () => {
    const input = createValidShotList();
    input.shots[2].shot_number = 4; // Skips 3
    assert.throws(() => validateShotList(input), /Non-sequential shot number/);
  });
});

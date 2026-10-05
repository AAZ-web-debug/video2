/**
 * Predefined Feedback Categories and Adjustments
 * Strict mapping to prevent arbitrary user text from becoming prompt instructions.
 */
const FEEDBACK_ADJUSTMENTS = {
  'pacing': 'Improve pacing by shortening slow shots and increasing visual changes between concept beats.',
  'narration clarity': 'Use simpler wording, shorter sentences, and explain technical terms before using them.',
  'visual style': 'Keep the existing character reference and shared palette while making visuals clearer and more consistent.',
  'too long/too short': 'Adjust the number and duration of shots while keeping the final video between 60 and 90 seconds.',
  'other': 'Refine the overall instructional flow, keeping the explanation calm, clear, and strictly aligned with the style guide.'
};

const ALLOWED_FEEDBACK_CATEGORIES = Object.keys(FEEDBACK_ADJUSTMENTS);

function getAdjustmentForCategory(category) {
  const normalized = (category || '').trim().toLowerCase();
  const matchedKey = ALLOWED_FEEDBACK_CATEGORIES.find(k => k.toLowerCase() === normalized);
  if (!matchedKey) {
    throw new Error(`Invalid feedback category: "${category}". Allowed categories are: ${ALLOWED_FEEDBACK_CATEGORIES.join(', ')}`);
  }
  return {
    category: matchedKey,
    adjustmentInstruction: FEEDBACK_ADJUSTMENTS[matchedKey]
  };
}

module.exports = {
  FEEDBACK_ADJUSTMENTS,
  ALLOWED_FEEDBACK_CATEGORIES,
  getAdjustmentForCategory
};

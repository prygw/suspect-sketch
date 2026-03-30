const fs = require('fs');
const path = require('path');
const { getTextModel } = require('./gemini');

// Load prompts from files
const INTERVIEWER_PROMPT = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'interviewer.txt'), 'utf-8'
);
const PARSER_PROMPT = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'profileParser.txt'), 'utf-8'
);

// Load fallback questions for when Gemini is unreachable
const FALLBACK_QUESTIONS = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'fallbacks.json'), 'utf-8'
));

// Phase order for transitions
const PHASE_ORDER = [
  'rapport',
  'context',
  'freeRecall',
  'holisticTraits',
  'featureRecall',
  'bodyClothing',
  'categoryClustering',
  'refinement',
];

// Map common Gemini-invented phase names to the correct PHASE_ORDER values.
// Gemini sometimes returns names like "context_reinstatement" or "free_recall"
// instead of the exact camelCase strings we need.
const PHASE_ALIASES = {
  'rapport_building': 'rapport',
  'rapport building': 'rapport',
  'context_reinstatement': 'context',
  'context reinstatement': 'context',
  'context_setting': 'context',
  'free_recall': 'freeRecall',
  'free recall': 'freeRecall',
  'freerecall': 'freeRecall',
  'free_recall_holistic_impression': 'freeRecall',
  'free_recall_holistic': 'freeRecall',
  'holistic_traits': 'holisticTraits',
  'holistic traits': 'holisticTraits',
  'holistictraits': 'holisticTraits',
  'holistic_trait_attribution': 'holisticTraits',
  'feature_recall': 'featureRecall',
  'feature recall': 'featureRecall',
  'featurerecall': 'featureRecall',
  'feature_specific_cued_recall': 'featureRecall',
  'feature_cued_recall': 'featureRecall',
  'body_clothing': 'bodyClothing',
  'body clothing': 'bodyClothing',
  'bodyclothing': 'bodyClothing',
  'body_and_clothing': 'bodyClothing',
  'category_clustering': 'categoryClustering',
  'category clustering': 'categoryClustering',
  'categoryclustering': 'categoryClustering',
  'category_clustering_recall': 'categoryClustering',
};

/**
 * Normalize a phase name returned by Gemini to a valid PHASE_ORDER value.
 * Returns the input unchanged if it's already valid.
 */
function normalizePhase(phase) {
  if (!phase) return phase;
  if (PHASE_ORDER.includes(phase)) return phase;
  const normalized = PHASE_ALIASES[phase.toLowerCase().trim()];
  if (normalized) {
    console.warn(`Normalized Gemini phase "${phase}" → "${normalized}"`);
    return normalized;
  }
  return phase; // Return as-is; validatePhaseTransition will catch it
}

/**
 * Retry a Gemini API call up to `maxRetries` times with a delay between
 * attempts. If all retries fail, return a fallback question for the given phase.
 *
 * @param {Function} fn - Async function that calls Gemini (must return the parsed result object)
 * @param {string} phase - Current interview phase (used to select fallback)
 * @param {number} maxRetries - Maximum number of retry attempts (default 2)
 * @param {number} delayMs - Milliseconds to wait between retries (default 1000)
 * @returns {Object} - The result from fn(), or a fallback question object
 */
async function withRetry(fn, phase, maxRetries = 2, delayMs = 1000) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.error(`Gemini call failed (attempt ${attempt + 1}/${maxRetries + 1}):`, err.message);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries exhausted -- use hardcoded fallback
  console.error('All Gemini retries failed, using fallback question for phase:', phase);
  const phaseFallbacks = FALLBACK_QUESTIONS[phase] || FALLBACK_QUESTIONS['rapport'];
  const randomIndex = Math.floor(Math.random() * phaseFallbacks.length);

  return {
    question: phaseFallbacks[randomIndex],
    phase: phase,
    shouldTransition: false,
    nextPhase: null,
    profileUpdates: {},
    shouldGenerateSketch: false,
    internalNotes: `Fallback question used after ${maxRetries + 1} failed Gemini attempts: ${lastError.message}`,
  };
}

/**
 * Validate that a phase transition is valid (only forward transitions allowed).
 * Returns true if the transition from currentPhase to nextPhase moves forward
 * in the PHASE_ORDER array. Returns false for backward or same-phase transitions.
 *
 * @param {string} currentPhase - The phase we are transitioning from
 * @param {string} nextPhase - The phase we are transitioning to
 * @returns {boolean} - Whether the transition is valid
 */
function validatePhaseTransition(currentPhase, nextPhase) {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  const nextIndex = PHASE_ORDER.indexOf(nextPhase);

  // If either phase is unknown, reject the transition
  if (currentIndex === -1 || nextIndex === -1) {
    console.error(`Invalid phase name: current="${currentPhase}", next="${nextPhase}"`);
    return false;
  }

  // Only forward transitions are allowed
  if (nextIndex <= currentIndex) {
    console.warn(
      `Blocked backward/same phase transition: "${currentPhase}" (${currentIndex}) -> "${nextPhase}" (${nextIndex})`
    );
    return false;
  }

  return true;
}

/**
 * Determine whether a sketch should be generated for the current phase and
 * answer count. This overrides Gemini's shouldGenerateSketch suggestion to
 * enforce guardrails.
 *
 * Rules:
 * - No sketches during rapport or context phases
 * - First sketch after freeRecall phase completes
 * - During featureRecall, sketches every 2-3 answers
 * - During refinement, sketches after every answer
 * - For other phases (holisticTraits, bodyClothing, categoryClustering), allow
 *   Gemini's suggestion to pass through
 *
 * @param {string} phase - Current interview phase
 * @param {boolean} geminiSuggestion - What Gemini suggested for shouldGenerateSketch
 * @param {number} answersInPhase - Number of answers submitted in the current phase
 * @returns {boolean} - Whether to generate a sketch
 */
function shouldSketchForPhase(phase, geminiSuggestion, answersInPhase) {
  // Never generate sketches during rapport or context
  if (phase === 'rapport' || phase === 'context') {
    return false;
  }

  // First sketch triggers when transitioning out of freeRecall
  if (phase === 'freeRecall') {
    // Only sketch at the end of freeRecall (when transitioning), not mid-phase
    // The caller should pass geminiSuggestion=true only on transition
    return geminiSuggestion;
  }

  // During featureRecall, sketch every 2-3 answers (use every 2nd answer)
  if (phase === 'featureRecall') {
    return answersInPhase > 0 && answersInPhase % 2 === 0;
  }

  // During refinement, sketch after every answer
  if (phase === 'refinement') {
    return true;
  }

  // For holisticTraits, bodyClothing, categoryClustering: defer to Gemini
  return geminiSuggestion;
}

/**
 * Generate the next interview question based on the current session state.
 *
 * @param {Object} session - Full session object from sessionService.getSession()
 * @param {string|null} latestAnswer - The witness's latest answer (null if skipped)
 * @param {boolean} skipped - Whether the witness skipped this question
 * @returns {Object} - { question, phase, profileUpdates, shouldGenerateSketch }
 */
async function generateNextQuestion(session, latestAnswer, skipped) {
  const model = getTextModel();

  // Build conversation history for context
  const historyContext = session.interviewHistory
    .slice(-10) // Last 10 exchanges for context window management
    .map(entry => `Q: ${entry.question}\nA: ${entry.answer || '[skipped]'}`)
    .join('\n\n');

  const prompt = `
${INTERVIEWER_PROMPT}

CURRENT SESSION STATE:
- Current phase: ${session.currentPhase}
- Questions asked so far: ${session.interviewHistory.length}
- Current composite profile: ${JSON.stringify(session.compositeProfile, null, 2)}

RECENT CONVERSATION:
${historyContext}

LATEST EXCHANGE:
- Question that was just asked: ${session.nextQuestion || 'This is the start of the interview'}
- Witness response: ${skipped ? '[Witness said they don\'t remember / skipped]' : latestAnswer}

Generate your next response as the interviewer. Remember to respond with valid JSON only.
`;

  // Count answers in the current phase (for sketch guardrails)
  const answersInPhase = session.interviewHistory
    .filter(entry => entry.phase === session.currentPhase)
    .length;

  const result = await withRetry(async () => {
    const genResult = await model.generateContent(prompt);
    const responseText = genResult.response.text();

    // Parse JSON from the response (handle markdown-wrapped JSON like ```json ... ```)
    let parsed;
    try {
      // First, try to strip markdown code fences (```json ... ``` or ``` ... ```)
      let cleanedText = responseText;
      const markdownMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (markdownMatch) {
        cleanedText = markdownMatch[1].trim();
      }

      // Try parsing the cleaned text directly
      try {
        parsed = JSON.parse(cleanedText);
      } catch {
        // Fall back to extracting the first JSON object from the text
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON object found in response');
        parsed = JSON.parse(jsonMatch[0]);
      }

      // Validate required fields
      if (!parsed.question || typeof parsed.question !== 'string') {
        throw new Error('Parsed JSON missing required "question" field (string)');
      }
      if (!parsed.phase || typeof parsed.phase !== 'string') {
        throw new Error('Parsed JSON missing required "phase" field (string)');
      }
    } catch (err) {
      console.error('Failed to parse Gemini response:', responseText);

      // Use a phase-specific fallback question instead of a generic one
      const phaseFallbacks = FALLBACK_QUESTIONS[session.currentPhase] || FALLBACK_QUESTIONS['rapport'];
      const randomIndex = Math.floor(Math.random() * phaseFallbacks.length);

      parsed = {
        question: phaseFallbacks[randomIndex],
        phase: session.currentPhase,
        shouldTransition: false,
        nextPhase: null,
        profileUpdates: {},
        shouldGenerateSketch: false,
        internalNotes: `Failed to parse AI response (${err.message}), using phase-specific fallback`,
      };
    }

    return parsed;
  }, session.currentPhase);

  // Normalize phase names from Gemini (it often invents its own formats)
  if (result.phase) result.phase = normalizePhase(result.phase);

  // Validate phase transition if one is requested
  let shouldTransition = result.shouldTransition || false;
  let nextPhase = result.nextPhase ? normalizePhase(result.nextPhase) : null;

  if (shouldTransition && nextPhase) {
    if (!validatePhaseTransition(session.currentPhase, nextPhase)) {
      // Block invalid transitions
      shouldTransition = false;
      nextPhase = null;
    }
  }

  // Apply sketch guardrails (override Gemini's suggestion)
  const shouldGenerateSketch = shouldSketchForPhase(
    shouldTransition ? nextPhase : (result.phase || session.currentPhase),
    result.shouldGenerateSketch || false,
    answersInPhase
  );

  return {
    question: result.question,
    phase: shouldTransition ? nextPhase : result.phase,
    profileUpdates: result.profileUpdates || {},
    shouldGenerateSketch: shouldGenerateSketch,
    shouldTransition: shouldTransition,
    nextPhase: nextPhase,
    internalNotes: result.internalNotes || null,
  };
}

/**
 * Parse a witness answer to extract profile updates.
 * This is a secondary pass -- the interviewer prompt also extracts updates,
 * but this dedicated parser catches details the interviewer may not have
 * explicitly flagged.
 *
 * @param {string} answer - The witness's answer
 * @param {string} question - The question that was asked
 * @param {string} phase - Current interview phase
 * @returns {Object} - Dot-notation profile updates
 */
async function parseAnswerForProfile(answer, question, phase) {
  if (!answer) return {};

  const model = getTextModel();

  const prompt = `
${PARSER_PROMPT}

Interview phase: ${phase}
Question asked: ${question}
Witness answer: ${answer}

Extract profile updates as JSON:
`;

  try {
    const result = await withRetry(async () => {
      const genResult = await model.generateContent(prompt);
      const responseText = genResult.response.text();

      // Handle markdown-wrapped JSON
      let cleanedText = responseText;
      const markdownMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (markdownMatch) {
        cleanedText = markdownMatch[1].trim();
      }

      try {
        return JSON.parse(cleanedText);
      } catch {
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return {};
        return JSON.parse(jsonMatch[0]);
      }
    }, phase);

    return result;
  } catch (err) {
    console.error('Profile parsing failed:', err);
    return {};
  }
}

/**
 * Apply dot-notation profile updates to the composite profile object.
 *
 * @param {Object} profile - The current composite profile
 * @param {Object} updates - Dot-notation updates (e.g., {"description.hair": "brown"})
 * @returns {Object} - Updated profile
 */
function applyProfileUpdates(profile, updates) {
  const updated = JSON.parse(JSON.stringify(profile)); // deep clone

  for (const [dotPath, value] of Object.entries(updates)) {
    const keys = dotPath.split('.');
    let target = updated;

    for (let i = 0; i < keys.length - 1; i++) {
      if (target[keys[i]] === undefined || target[keys[i]] === null) {
        target[keys[i]] = {};
      }
      target = target[keys[i]];
    }

    const finalKey = keys[keys.length - 1];

    // Special handling for array fields (append, don't replace)
    if (finalKey === 'distinguishingFeatures' && Array.isArray(value)) {
      if (!Array.isArray(target[finalKey])) {
        target[finalKey] = [];
      }
      target[finalKey] = [...new Set([...target[finalKey], ...value])];
    } else {
      target[finalKey] = value;
    }
  }

  return updated;
}

module.exports = {
  generateNextQuestion,
  parseAnswerForProfile,
  applyProfileUpdates,
  withRetry,
  validatePhaseTransition,
  shouldSketchForPhase,
  normalizePhase,
  PHASE_ORDER,
};

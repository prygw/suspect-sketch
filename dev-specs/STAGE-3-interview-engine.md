# Stage 3: Interview Engine (Gemini Text Integration)

## Goal
Build the core interview engine that uses the Gemini API to generate psychologically-grounded questions, parse witness answers into structured profile fields, manage phase transitions, and maintain conversational context. This replaces all the stub responses from Stage 2.

## Prerequisites
- Stage 2 complete (all API endpoints working with stubs)
- A Google Gemini API key (set in `server/.env` as `GEMINI_API_KEY`)

---

## Step-by-Step Instructions

### 3.1 — Install the Gemini SDK

```bash
cd server
npm install @google/generative-ai
```

---

### 3.2 — Create the Gemini client wrapper

**Create `server/services/gemini.js`:**

```js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function getTextModel() {
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

function getImageModel() {
  // This will be used in Stage 4
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });
}

module.exports = { genAI, getTextModel, getImageModel };
```

> **Note:** Model names may change. Check the latest Gemini API documentation for available model IDs. Use the most capable available model that supports both text and image generation.

---

### 3.3 — Create the interview system prompt

**Create `server/prompts/interviewer.txt`:**

This is the full system prompt that governs how Gemini conducts the interview. It encodes all the psychological methodology from the spec.

```
You are a forensic interview assistant conducting a witness interview to build a suspect sketch. You are guiding a crime witness through a structured, evidence-based interview to help them accurately recall and describe the physical appearance of a suspect.

YOUR ROLE:
- You are warm, calm, patient, and non-judgmental
- You ask ONE question at a time
- You NEVER interrupt or rush the witness
- You accept "I don't know" immediately and move on
- You use the witness's own words to cue further recall (witness-compatible questioning)
- You use gender-neutral language ("this person", "they") until the witness establishes gender

STRICT RULES — NEVER VIOLATE THESE:
1. NEVER ask leading questions (e.g., "He had a scar, right?")
2. NEVER ask forced-choice questions (e.g., "Was their face round or oval?")
3. NEVER ask compound questions (e.g., "What about their eyes and nose?")
4. NEVER suggest details the witness has not mentioned
5. NEVER pressure the witness to provide information they say they don't remember
6. NEVER rephrase a question the witness already said "I don't know" to
7. NEVER barrage with rapid-fire specific questions
8. NEVER use placeholders like [interviewer name], [name], or [your name] in your questions. You are an unnamed interviewer — do not refer to yourself by name.

INTERVIEW PHASES:
You must follow these phases in order. You will be told which phase you are currently in.

CRITICAL: When you output the "phase" and "nextPhase" fields in your JSON response, you MUST use EXACTLY the string values listed in brackets below. Do NOT invent your own phase names or use any other format.

Phase "rapport" — RAPPORT BUILDING:
- Greet warmly, explain the process, set expectations
- Tell them: "It's completely okay if you don't remember something"
- Grant correction authority: "If I ever say something that doesn't sound right, please correct me"
- Ask a warm-up question: "How are you feeling right now?"
- 2-3 exchanges, then transition to "context"

Phase "context" — CONTEXT REINSTATEMENT:
- Guide the witness to mentally reconstruct the scene
- Ask about: where they were, sensory details (sounds, smells, temperature), lighting, their spatial relationship to the suspect, how long they saw them
- 3-5 questions
- If the witness volunteers appearance details, note them but don't drill into them yet
- Transition to "freeRecall" when context is established

Phase "freeRecall" — FREE RECALL & HOLISTIC IMPRESSION:
- Start with face-name generation: "If you had to give them a made-up name that fits their face, what would it be?"
- Then: "Tell me everything you can remember about what this person looked like. Take as much time as you need."
- DO NOT INTERRUPT their free narrative
- Ask about first impression, distinctiveness, and whether they resemble anyone familiar
- 3-5 questions
- Transition to "holisticTraits" after

Phase "holisticTraits" — HOLISTIC TRAIT ATTRIBUTION (H-CI):
- Ask the witness to evaluate the suspect on 7 holistic dimensions, one at a time:
  1. Masculinity/femininity of face
  2. Attractiveness
  3. How distinctive/memorable the face was
  4. Perceived health (healthy, tired, unwell)
  5. Perceived age impression
  6. Perceived threat/approachability
  7. Perceived weight from face
- These prime holistic facial processing before feature decomposition
- Transition to "featureRecall" after

Phase "featureRecall" — FEATURE-SPECIFIC CUED RECALL:
- Walk through features one at a time using open-ended prompts
- Order: hair, forehead, eyes, eyebrows, nose, cheeks, mouth, chin, ears, skin, facial hair
- Use the witness's OWN WORDS from earlier phases to cue recall (e.g., "You mentioned they looked angry — what about their face gave that impression?")
- Skip features already described in detail; instead ask for refinement
- Accept "I don't remember" immediately
- 8-12 questions, adaptive

Phase "bodyClothing" — BODY & CLOTHING (PDI Down-to-Up):
- Ask about appearance from feet upward: footwear, lower body, upper body, accessories, items carried
- This counteracts the natural bias of focusing only on the face
- 3-5 questions

Phase "categoryClustering" — CATEGORY CLUSTERING RECALL:
- Prompt recall by semantic category:
  - Person-specific: voice, movement, posture, mannerisms
  - Object-related: things near the person or they touched
  - Spatial: details connected to the specific location
- 2-3 prompts
- Transition to "refinement"

Phase "refinement" — REFINEMENT:
- The sketch is shown. Ask: "What's the first thing that looks wrong or feels off?"
- After each correction: "How about now? Better, worse, or about the same?"
- Ask: "What is the one thing about this person's face you can't forget?"
- Check confidence on a scale of 1-10
- If >= 8, offer to finalize. If < 8, continue refining.

VALID PHASE VALUES (use ONLY these exact strings):
"rapport", "context", "freeRecall", "holisticTraits", "featureRecall", "bodyClothing", "categoryClustering", "refinement"

RESPONSE FORMAT:
You must respond with valid JSON in this exact structure:
{
  "question": "Your next question to the witness",
  "phase": "rapport",
  "shouldTransition": false,
  "nextPhase": null,
  "profileUpdates": {
    "field.path": "extracted value"
  },
  "shouldGenerateSketch": false,
  "internalNotes": "Any observations about witness state (fatigue, trauma signs, etc.)"
}

IMPORTANT:
- "phase" MUST be one of: "rapport", "context", "freeRecall", "holisticTraits", "featureRecall", "bodyClothing", "categoryClustering", "refinement"
- "nextPhase" MUST also be one of those exact strings (or null if not transitioning)
- Do NOT invent phase names. Do NOT use underscores, spaces, or any other format.
- Always ask a NEW question — never repeat a question that appears in the conversation history.

The "profileUpdates" field uses dot notation to update the composite profile. Examples:
- "description.hair": "short, dark brown, curly"
- "description.eyes": "blue, wide-set"
- "context.lighting": "dim streetlight"
- "description.holisticTraits.perceivedAge": "mid-30s"
- "description.distinguishingFeatures": ["scar on left cheek", "crooked nose"]

Set "shouldGenerateSketch" to true when enough new visual information has been gathered to warrant a sketch update (generally after freeRecall, every 2-3 answers in featureRecall, and after every correction in refinement).

Set "shouldTransition" to true and "nextPhase" to the exact phase string when it's time to move to the next phase. Example transition from rapport to context:
{
  "question": "Can you walk me through where you were when you first noticed this person?",
  "phase": "rapport",
  "shouldTransition": true,
  "nextPhase": "context",
  "profileUpdates": {},
  "shouldGenerateSketch": false,
  "internalNotes": "Witness seems calm, ready to proceed"
}
```

---

### 3.4 — Create the profile parser prompt

**Create `server/prompts/profileParser.txt`:**

```
You are a data extraction assistant. Given a witness's answer to an interview question about a suspect's appearance, extract any physical description details and return them as structured JSON updates.

RULES:
- Only extract information the witness actually stated. NEVER infer or assume.
- Use the witness's own language, lightly normalized (e.g., "kinda tall" -> "tall")
- If the answer contains no physical description data, return an empty object
- Use dot notation for nested fields

AVAILABLE FIELDS:
- context.location, context.lighting, context.distance, context.duration
- description.globalImpression, description.faceLabel, description.similarTo
- description.faceShape, description.hair, description.forehead
- description.eyes, description.eyebrows, description.nose
- description.cheeks, description.mouth, description.chin, description.ears
- description.skin, description.facialHair
- description.age, description.build, description.height
- description.clothing, description.footwear, description.accessories, description.itemsCarried
- description.distinguishingFeatures (array -- append, don't replace)
- description.holisticTraits.masculinity, description.holisticTraits.attractiveness
- description.holisticTraits.distinctiveness, description.holisticTraits.perceivedHealth
- description.holisticTraits.perceivedAge, description.holisticTraits.perceivedThreat
- description.holisticTraits.perceivedWeight

Respond with ONLY valid JSON. No explanation, no markdown. Example:
{"description.hair": "long, black, straight", "description.age": "early 20s"}
```

---

### 3.5 — Build the interview engine service

**Create `server/services/interview.js`:**

```js
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
```

---

### 3.6 — Wire the interview engine into the route handler

**Update `server/routes/session.js`** -- replace the `POST /:id/answer` handler:

> **Note on initial question generation:** The `POST /api/session` endpoint (defined in Stage 2) returns a hardcoded first question (e.g., "Hello, thank you for being here..."). This is intentional. The Gemini-powered interview flow does not begin until the witness submits their first answer via `POST /api/session/:id/answer`. At that point, the engine takes over and generates all subsequent questions. The hardcoded first question ensures the session starts immediately without waiting for a Gemini API call, and it provides a consistent rapport-building opener regardless of API availability.

```js
const interviewEngine = require('../services/interview');

// POST /api/session/:id/answer -- Submit witness answer
router.post('/:id/answer', async (req, res) => {
  try {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { answer, skip } = req.body;
    if (!answer && !skip) {
      return res.status(400).json({ error: 'Must provide "answer" or "skip: true"' });
    }

    // 1. Generate next question and get profile updates from the interview engine
    const engineResult = await interviewEngine.generateNextQuestion(
      session,
      skip ? null : answer,
      !!skip
    );

    // 2. Also run the dedicated profile parser for additional extraction
    let parserUpdates = {};
    if (answer && !skip) {
      const currentQuestion = session.nextQuestion || sessionService.INITIAL_RAPPORT_QUESTION;
      parserUpdates = await interviewEngine.parseAnswerForProfile(
        answer, currentQuestion, session.currentPhase
      );
    }

    // 3. Merge updates from both sources
    const allUpdates = { ...parserUpdates, ...engineResult.profileUpdates };

    // 4. Apply updates to the composite profile
    let updatedProfile = session.compositeProfile;
    if (Object.keys(allUpdates).length > 0) {
      updatedProfile = interviewEngine.applyProfileUpdates(updatedProfile, allUpdates);
      sessionService.updateProfile(req.params.id, updatedProfile);
    }

    // 5. Handle phase transition
    if (engineResult.shouldTransition && engineResult.nextPhase) {
      sessionService.updatePhase(req.params.id, engineResult.nextPhase);
    }

    // 6. Record the exchange in interview history.
    // Record the question that was ANSWERED (the current session question),
    // not the NEXT question that the engine just generated.
    const answeredQuestion = session.nextQuestion || sessionService.INITIAL_RAPPORT_QUESTION;
    sessionService.addInterviewEntry(
      req.params.id,
      session.currentPhase,
      answeredQuestion,
      skip ? null : answer,
      !!skip
    );

    // 7. Persist the next question for session resume
    sessionService.updateNextQuestion(req.params.id, engineResult.question);

    // 8. Respond
    res.json({
      question: engineResult.question,
      sketch: null, // Stage 4 will handle sketch generation
      shouldGenerateSketch: engineResult.shouldGenerateSketch,
      profile: updatedProfile,
      phase: engineResult.shouldTransition ? engineResult.nextPhase : session.currentPhase,
    });
  } catch (err) {
    console.error('Error processing answer:', err);
    res.status(500).json({ error: 'Failed to process answer' });
  }
});
```

**Important:** Change the route file to use `async` handlers. The top of the file should still use `const express = require('express')` and `const router = express.Router()`.

---

### 3.7 — Test the interview engine

Start the server and run through a test conversation:

```bash
# Create session
curl -X POST http://localhost:3001/api/session | jq

# Answer the rapport question (use the returned sessionId)
curl -X POST http://localhost:3001/api/session/SESSION_ID/answer \
  -H 'Content-Type: application/json' \
  -d '{"answer": "I am feeling okay, a bit nervous"}' | jq

# Continue answering...
curl -X POST http://localhost:3001/api/session/SESSION_ID/answer \
  -H 'Content-Type: application/json' \
  -d '{"answer": "I was in a grocery store parking lot around 9pm. It was dark but there were overhead lights."}' | jq

# Verify profile is being populated
curl http://localhost:3001/api/session/SESSION_ID | jq '.compositeProfile'
```

**What to verify:**
- Questions are relevant to the current phase
- Phase transitions happen naturally
- The composite profile accumulates description data
- Skipping a question doesn't break the flow
- The tone is warm and non-leading throughout

---

### 3.8 — Error handling and rate limiting

Add basic protection against API failures.

#### 3.8.1 — Retry wrapper with fallback

The `withRetry()` function is already defined in `server/services/interview.js` (see section 3.5). It wraps any async Gemini call and:

1. Attempts the call up to 3 times total (initial + 2 retries)
2. Waits 1 second between retries
3. On total failure, selects a random hardcoded fallback question from `server/prompts/fallbacks.json` for the current phase

Both `generateNextQuestion()` and `parseAnswerForProfile()` use `withRetry()` internally, so no additional wiring is needed.

#### 3.8.2 — Fallback questions file

**Create `server/prompts/fallbacks.json`:**

```json
{
  "rapport": [
    "Thank you for being here. Before we begin, how are you feeling right now?",
    "I appreciate you taking the time to help. Is there anything you'd like to know about how this process works before we start?",
    "Let's take a moment before we dive in. How are you doing today?",
    "Thank you for coming in. I want you to know there are no wrong answers here. How are you feeling about this?"
  ],
  "context": [
    "Can you walk me through where you were when you first noticed this person?",
    "What was the environment like at the time -- the lighting, sounds, anything you recall?",
    "How far away from this person were you, approximately?",
    "About how long would you say you were able to see this person?",
    "Can you describe the setting around you when this happened?"
  ],
  "freeRecall": [
    "Tell me everything you can remember about what this person looked like. Take as much time as you need.",
    "If you had to give this person a made-up name that fits their face, what would it be?",
    "What was your very first impression of this person's appearance?",
    "Does this person remind you of anyone you know, or any public figure?"
  ],
  "holisticTraits": [
    "How would you describe this person's overall appearance -- did they look more masculine or feminine?",
    "Would you say this person's face was distinctive or more average-looking?",
    "What was your impression of this person's age?",
    "Did this person seem healthy, tired, or unwell to you?",
    "Did this person seem approachable or threatening?"
  ],
  "featureRecall": [
    "Let's talk about their hair. What do you remember about it?",
    "What do you recall about their eyes?",
    "Can you describe anything about the shape of their face?",
    "What about their nose -- does anything come to mind?",
    "Do you remember anything about their mouth or lips?"
  ],
  "bodyClothing": [
    "What do you remember about what this person was wearing?",
    "Can you recall anything about their build or height?",
    "Did you notice any accessories, jewelry, or items they were carrying?",
    "Do you remember what kind of shoes or footwear they had on?",
    "What about their upper body clothing -- anything stand out?"
  ],
  "categoryClustering": [
    "Do you remember anything about how this person moved or their posture?",
    "Was there anything about their voice or the way they spoke that stood out?",
    "Were there any objects near this person or things they touched?"
  ],
  "refinement": [
    "Looking at the sketch, what is the first thing that looks wrong or feels off?",
    "How does this compare to your memory -- better, worse, or about the same?",
    "What is the one thing about this person's face you absolutely can't forget?",
    "On a scale of 1 to 10, how close is this sketch to what you remember?",
    "Is there anything else you'd like to adjust before we finalize?"
  ]
}
```

#### 3.8.3 — Rate limiting

```bash
npm install express-rate-limit
```

Add to `server/index.js`:

```js
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: { error: 'Too many requests, please slow down' },
});

app.use('/api/', apiLimiter);
```

---

## Definition of Done

- [ ] `POST /api/session/:id/answer` calls Gemini and returns a contextually appropriate next question
- [ ] Questions follow the correct phase order (rapport -> context -> freeRecall -> holisticTraits -> featureRecall -> bodyClothing -> categoryClustering -> refinement)
- [ ] Phase transitions happen automatically when the engine determines a phase is complete
- [ ] Backward phase transitions are blocked by `validatePhaseTransition()`
- [ ] Witness answers are parsed and the composite profile is populated with extracted descriptions
- [ ] Profile updates use dot-notation and correctly nest into the profile structure
- [ ] `distinguishingFeatures` array appends rather than replaces
- [ ] Skipping a question works gracefully -- engine moves on without pressure
- [ ] Questions are never leading, never forced-choice, never compound
- [ ] The engine uses witness-compatible cuing (references the witness's own earlier words)
- [ ] Fallback questions are returned if Gemini API fails (after 2 retries with 1s delay)
- [ ] `withRetry()` wrapper correctly retries and falls back to `fallbacks.json`
- [ ] Gemini response parsing handles markdown-wrapped JSON and validates required fields
- [ ] `shouldSketchForPhase()` enforces sketch guardrails (no sketches in rapport/context, controlled frequency in featureRecall, every answer in refinement)
- [ ] Rate limiting is in place (30 req/min)
- [ ] A full 10+ exchange test conversation produces a meaningfully populated composite profile

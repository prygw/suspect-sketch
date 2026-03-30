const express = require('express');
const router = express.Router();
const sessionService = require('../services/session');
const interviewEngine = require('../services/interview');
const sketchService = require('../services/sketch');
const exportService = require('../services/export');

/**
 * ===================================================================
 * API Response Shape Reference
 * ===================================================================
 *
 * POST   /api/session
 *   201: { sessionId: string, currentPhase: string, question: string,
 *          sketch: null, profile: object }
 *
 * GET    /api/session/:id
 *   200: Full session object (id, createdAt, updatedAt, status,
 *        currentPhase, compositeProfile, sketchCount, nextQuestion,
 *        interviewHistory, sketches)
 *
 * POST   /api/session/:id/answer
 *   200: { question: string,
 *          sketch: { imageData: "base64", version: number } | null,
 *          profile: object, phase: string }
 *
 * POST   /api/session/:id/refine
 *   200: { question: string,
 *          sketch: { imageData: "base64", version: number } | null,
 *          profile: object, phase: string }
 *
 * POST   /api/session/:id/revert
 *   200: { message: string,
 *          sketch: { imageData: "base64", version: number } | null,
 *          profile: object }
 *
 * POST   /api/session/:id/export
 *   200 (JSON): { sketch: string|null, report: object }
 *   200 (PDF):  binary PDF attachment
 *   200 (PNG):  binary image attachment
 *
 * POST   /api/session/:id/restart
 *   200: { sessionId: string, currentPhase: "rapport",
 *          question: string, sketch: null, profile: object }
 *
 * GET    /api/session/:id/sketch/:version
 *   200: { version: number, imageData: string,
 *          promptUsed: string, createdAt: string }
 *
 * Error responses (all endpoints):
 *   404: { error: "Session not found" } (or "Sketch not found")
 *   400: { error: "<validation message>" }
 *   500: { error: "<failure message>" }
 * ===================================================================
 */

// POST /api/session — Create new interview session
router.post('/', (req, res) => {
  try {
    const session = sessionService.createSession();
    res.status(201).json({
      sessionId: session.id,
      currentPhase: session.currentPhase,
      question: sessionService.INITIAL_RAPPORT_QUESTION,
      sketch: null,
      profile: session.profile,
    });
  } catch (err) {
    console.error('Error creating session:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/session/:id — Get full session state
router.get('/:id', (req, res) => {
  try {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (err) {
    console.error('Error getting session:', err);
    res.status(500).json({ error: 'Failed to retrieve session' });
  }
});

// POST /api/session/:id/answer — Submit witness answer
router.post('/:id/answer', async (req, res) => {
  try {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ error: 'Session is already completed' });
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

    // 6. Generate sketch if the engine says to
    let sketchData = null;
    if (engineResult.shouldGenerateSketch) {
      try {
        const result = await sketchService.generateSketch(updatedProfile);
        const version = sessionService.addSketch(
          req.params.id,
          result.imageData,
          result.promptUsed
        );
        sketchData = {
          imageData: result.imageData,
          version,
        };
      } catch (sketchErr) {
        // Log the full error but don't fail the request.
        // The witness still gets their next question even if the sketch fails.
        console.error('Sketch generation failed:', sketchErr.message);
        console.error('Prompt was:', sketchService.assemblePrompt(updatedProfile).slice(0, 200) + '...');
      }
    }

    // 7. Record the exchange in interview history.
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

    // 8. Persist the next question for session resume
    sessionService.updateNextQuestion(req.params.id, engineResult.question);

    // 9. Respond
    const response = {
      question: engineResult.question,
      sketch: sketchData,
      profile: updatedProfile,
      phase: engineResult.shouldTransition ? engineResult.nextPhase : session.currentPhase,
    };

    // Signal to the frontend when a fallback question was used
    if (engineResult.internalNotes && engineResult.internalNotes.includes('Fallback')) {
      response.warning = 'AI service is temporarily unavailable. Using backup questions.';
    }

    res.json(response);
  } catch (err) {
    console.error('Error processing answer:', err);
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

// POST /api/session/:id/refine — Submit sketch feedback
router.post('/:id/refine', async (req, res) => {
  try {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { feedback, confidence } = req.body;
    if (!feedback) {
      return res.status(400).json({ error: 'Must provide "feedback"' });
    }

    // Validate confidence if provided
    if (confidence !== undefined && confidence !== null) {
      const conf = Number(confidence);
      if (isNaN(conf) || conf < 1 || conf > 10) {
        return res.status(400).json({ error: 'Confidence must be a number between 1 and 10' });
      }
    }

    // Parse the feedback to extract profile updates.
    // E.g., "nose should be wider" → { "description.nose": "wider nose" }
    const profileUpdates = await interviewEngine.parseAnswerForProfile(
      feedback,
      'What needs to change in this sketch?',
      'refinement'
    );

    // Apply any extracted updates to the profile
    let profile = session.compositeProfile;
    if (Object.keys(profileUpdates).length > 0) {
      profile = interviewEngine.applyProfileUpdates(profile, profileUpdates);
    }

    // Record refinement in the profile's refinements array
    profile.refinements.push({
      iteration: profile.refinements.length + 1,
      feedback,
      confidence: confidence || null,
      timestamp: new Date().toISOString(),
    });
    sessionService.updateProfile(req.params.id, profile);

    // Record in history
    sessionService.addInterviewEntry(
      req.params.id, 'refinement',
      'What needs to change in this sketch?', feedback, false
    );

    // Generate new sketch with the refinement feedback emphasized
    let sketchData = null;
    try {
      const result = await sketchService.generateSketch(profile, {
        refinementFeedback: feedback,
      });
      const version = sessionService.addSketch(
        req.params.id, result.imageData, result.promptUsed
      );
      sketchData = { imageData: result.imageData, version };
    } catch (sketchErr) {
      console.error('Refinement sketch failed:', sketchErr.message);
    }

    // Determine next question based on confidence
    let question;
    if (confidence && confidence >= 8) {
      question = "That's a high confidence rating. Are you comfortable finalizing this sketch?";
    } else {
      question = "How about now? Better, worse, or about the same?";
    }

    // Persist the next question for session resume
    sessionService.updateNextQuestion(req.params.id, question);

    res.json({ question, sketch: sketchData, profile, phase: 'refinement' });
  } catch (err) {
    console.error('Error processing refinement:', err);
    res.status(500).json({ error: 'Failed to process refinement' });
  }
});

// POST /api/session/:id/revert — Revert to a previous sketch version
router.post('/:id/revert', (req, res) => {
  try {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { version } = req.body;
    if (!version || typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
      return res.status(400).json({ error: 'Must provide "version" as a positive integer' });
    }

    const sketch = sessionService.getSketch(req.params.id, version);
    if (!sketch) {
      return res.status(404).json({ error: `Sketch version ${version} not found` });
    }

    res.json({
      message: `Reverted to sketch version ${version}`,
      sketch: { imageData: sketch.image_data, version: sketch.version },
      profile: session.compositeProfile,
    });
  } catch (err) {
    console.error('Error reverting sketch:', err);
    res.status(500).json({ error: 'Failed to revert sketch' });
  }
});

// GET /api/session/:id/export/preview — Preview what the export will contain
router.get('/:id/export/preview', (req, res) => {
  try {
    const preview = exportService.generatePreview(req.params.id);
    res.json(preview);
  } catch (err) {
    if (err.message === 'Session not found') {
      return res.status(404).json({ error: 'Session not found' });
    }
    console.error('Error generating export preview:', err);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// POST /api/session/:id/export — Export final sketch and report
router.post('/:id/export', async (req, res) => {
  try {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Mark the session as completed upon export.
    sessionService.finalizeSession(req.params.id);

    const { format } = req.body; // 'pdf', 'sketch', or 'json'

    if (format === 'pdf') {
      const pdfBuffer = await exportService.generateReport(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="suspect-sketch-${req.params.id.slice(0, 8)}.pdf"`
      );
      return res.send(pdfBuffer);
    }

    if (format === 'sketch') {
      const latestSketch = sessionService.getLatestSketch(req.params.id);
      if (!latestSketch) {
        return res.status(404).json({ error: 'No sketch available' });
      }
      const imageBuffer = Buffer.from(latestSketch.image_data, 'base64');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="suspect-sketch-${req.params.id.slice(0, 8)}.png"`
      );
      return res.send(imageBuffer);
    }

    // Default: return JSON
    const latestSketch = sessionService.getLatestSketch(req.params.id);
    res.json({
      sketch: latestSketch ? latestSketch.image_data : null,
      report: {
        sessionId: session.id,
        createdAt: session.createdAt,
        compositeProfile: session.compositeProfile,
        interviewHistory: session.interviewHistory,
        sketchCount: session.sketchCount,
      },
    });
  } catch (err) {
    console.error('Error exporting session:', err);
    res.status(500).json({ error: 'Failed to export session' });
  }
});

// POST /api/session/:id/restart — Reset session for witness restart
router.post('/:id/restart', (req, res) => {
  try {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    sessionService.resetSession(req.params.id);

    res.json({
      sessionId: req.params.id,
      currentPhase: 'rapport',
      question: sessionService.INITIAL_RAPPORT_QUESTION,
      sketch: null,
      profile: sessionService.createEmptyProfile(),
    });
  } catch (err) {
    console.error('Error restarting session:', err);
    res.status(500).json({ error: 'Failed to restart session' });
  }
});

// GET /api/session/:id/prompt-preview — See what prompt would be generated
router.get('/:id/prompt-preview', (req, res) => {
  const session = sessionService.getSession(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  const prompt = sketchService.assemblePrompt(session.compositeProfile);
  res.json({
    prompt,
    negativePrompt: sketchService.NEGATIVE_PROMPT,
    profileSnapshot: session.compositeProfile.description,
  });
});

// GET /api/session/:id/sketch/:version — Get a specific sketch image
router.get('/:id/sketch/:version', (req, res) => {
  try {
    const version = parseInt(req.params.version, 10);
    if (isNaN(version) || version < 1) {
      return res.status(400).json({ error: 'Invalid sketch version' });
    }
    const sketch = sessionService.getSketch(req.params.id, version);
    if (!sketch) {
      return res.status(404).json({ error: 'Sketch not found' });
    }
    res.json({
      version: sketch.version,
      imageData: sketch.image_data,
      promptUsed: sketch.prompt_used,
      createdAt: sketch.created_at,
    });
  } catch (err) {
    console.error('Error getting sketch:', err);
    res.status(500).json({ error: 'Failed to retrieve sketch' });
  }
});

module.exports = router;

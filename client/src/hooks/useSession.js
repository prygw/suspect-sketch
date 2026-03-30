import { useState, useEffect, useCallback, useRef } from 'react';

// --- FIX #6: Standardized API response type ---
// Expected response shape from POST /api/session/:id/answer:
// {
//   question: string,                                        // The next interviewer question
//   sketch: { imageData: string, version: number } | null,   // Generated sketch, if any
//   profile: object,                                         // Updated composite profile
//   phase: string                                            // Current interview phase
// }

export default function useSession(sessionId) {
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [phase, setPhase] = useState('rapport');
  const [sketches, setSketches] = useState([]);
  const [latestSketch, setLatestSketch] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingSketch, setIsGeneratingSketch] = useState(false);
  const [error, setError] = useState(null);

  // --- FIX #3: Track last failed answer for retry ---
  const lastFailedAnswerRef = useRef(null);

  // Load session on mount
  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch(`/api/session/${sessionId}`);
        if (!res.ok) throw new Error('Session not found');
        const data = await res.json();
        setSession(data);
        setSketches(data.sketches || []);
        setIsLoading(false);

        if (data.status === 'completed') {
          setPhase('completed');
          return;
        }

        setPhase(data.currentPhase);

        if (data.interviewHistory.length === 0) {
          // Brand-new session: show the initial rapport question
          setCurrentQuestion(
            "Welcome. I'm here to help you build a picture of the person you saw. " +
            "Before we begin, I want you to know — there are no wrong answers, and " +
            "it's completely okay if you don't remember something. How are you feeling right now?"
          );
        } else {
          // --- FIX #1: Session resume logic ---
          // The backend stores a `next_question` column on the sessions table.
          // This is the question that should be displayed when resuming.
          // If available, use it directly.
          if (data.nextQuestion) {
            // The backend persists the next question on every answer,
            // so this is the authoritative source for resuming.
            setCurrentQuestion(data.nextQuestion);
          } else {
            // Fallback for edge cases where nextQuestion is not set:
            // show the last question from history.
            const lastEntry = data.interviewHistory[data.interviewHistory.length - 1];
            setCurrentQuestion(lastEntry.question);
          }
        }
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    }
    loadSession();
  }, [sessionId]);

  // Submit an answer
  const submitAnswer = useCallback(async (answer) => {
    setIsSending(true);
    setError(null);
    lastFailedAnswerRef.current = null;
    try {
      const res = await fetch(`/api/session/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status})`);
      }
      const data = await res.json();

      // --- FIX #2: Build the local history entry BEFORE updating currentQuestion ---
      // Capture the old question and phase first so they don't go stale.
      const previousQuestion = currentQuestion;
      const previousPhase = phase;

      // Now update state with the new question
      setCurrentQuestion(data.question);
      setPhase(data.phase);

      // Show warning if AI fell back to backup questions
      if (data.warning) {
        setError(data.warning);
      }

      // Update session history using the captured (non-stale) values
      setSession(prev => ({
        ...prev,
        compositeProfile: data.profile,
        currentPhase: data.phase,
        interviewHistory: [
          ...(prev?.interviewHistory || []),
          { question: previousQuestion, answer, phase: previousPhase },
        ],
      }));

      // If a sketch was generated, add it
      if (data.sketch) {
        // --- FIX (Stage 7 #4): Clear generating state when sketch arrives ---
        setIsGeneratingSketch(false);
        const newSketch = {
          version: data.sketch.version,
          imageData: data.sketch.imageData,
        };
        setSketches(prev => [...prev, newSketch]);
        setLatestSketch(newSketch);
      } else if (data.shouldGenerateSketch) {
        // The backend signals a sketch is being generated asynchronously.
        // Set generating state to true; it will be cleared when the sketch
        // data arrives (either via a subsequent response or a polling mechanism).
        setIsGeneratingSketch(true);
      }
    } catch (err) {
      // --- FIX #3: Store the failed answer so the retry button can re-send it ---
      lastFailedAnswerRef.current = answer;
      setError(err.message || 'Failed to send answer.');
    } finally {
      setIsSending(false);
    }
  }, [sessionId, currentQuestion, phase]);

  // --- FIX #3: Retry the last failed answer ---
  const retryLastAnswer = useCallback(() => {
    if (lastFailedAnswerRef.current !== null) {
      submitAnswer(lastFailedAnswerRef.current);
    }
  }, [submitAnswer]);

  // Skip a question
  const skipQuestion = useCallback(async () => {
    setIsSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skip: true }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status})`);
      }
      const data = await res.json();

      // FIX #2: Capture current values before updating state (same pattern as submitAnswer)
      const previousQuestion = currentQuestion;
      const previousPhase = phase;

      setCurrentQuestion(data.question);
      setPhase(data.phase);

      setSession(prev => ({
        ...prev,
        currentPhase: data.phase,
        interviewHistory: [
          ...(prev?.interviewHistory || []),
          { question: previousQuestion, answer: null, phase: previousPhase, skipped: true },
        ],
      }));
    } catch (err) {
      setError('Failed to skip. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [sessionId, currentQuestion, phase]);

  // Submit refinement feedback
  const submitRefinement = useCallback(async (feedback, confidence) => {
    setIsSending(true);
    setIsGeneratingSketch(true);
    try {
      const res = await fetch(`/api/session/${sessionId}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback, confidence }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status})`);
      }
      const data = await res.json();

      setCurrentQuestion(data.question);

      if (data.sketch) {
        const newSketch = {
          version: data.sketch.version,
          imageData: data.sketch.imageData,
        };
        setSketches(prev => [...prev, newSketch]);
        setLatestSketch(newSketch);
      }
    } catch (err) {
      setError('Failed to submit feedback.');
    } finally {
      setIsSending(false);
      setIsGeneratingSketch(false);
    }
  }, [sessionId]);

  // Revert to a previous sketch
  const revertSketch = useCallback(async (version) => {
    try {
      const res = await fetch(`/api/session/${sessionId}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status})`);
      }
      const data = await res.json();
      setLatestSketch({ version: data.sketch.version, imageData: data.sketch.imageData });
    } catch (err) {
      setError('Failed to revert sketch.');
    }
  }, [sessionId]);

  return {
    session,
    currentQuestion,
    phase,
    sketches,
    latestSketch,
    isLoading,
    isSending,
    isGeneratingSketch,
    error,
    submitAnswer,
    retryLastAnswer,
    skipQuestion,
    submitRefinement,
    revertSketch,
  };
}

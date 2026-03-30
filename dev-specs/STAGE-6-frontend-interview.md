# Stage 6: Frontend — Interview UI (Chat Panel + Session State)

## Goal
Build the interview page with the chat panel (left side of the split layout). This includes the scrollable conversation history, text input, "I don't remember" button, phase indicator, and session timer. The sketch panel (right side) is built in Stage 7.

## Prerequisites
- Stage 5 complete (landing page with working session creation and navigation)
- Stage 3 complete (interview engine returning real questions from Gemini)

---

## Step-by-Step Instructions

### 6.1 — Create the session hook

This custom hook manages all communication with the backend for a session.

**Create `client/src/hooks/useSession.js`:**

```js
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
        setPhase(data.currentPhase);
        setSketches(data.sketches || []);
        setIsLoading(false);

        // If the session was already finalized via export, put it in a read-only
        // completion state. The UI should show a summary/re-export view rather
        // than the active interview form.
        if (data.status === 'completed') {
          setPhase('completed');
        }

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
```

---

### 6.2 — Create the Interview Page layout

**Create `client/src/components/InterviewPage.jsx`:**

```jsx
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import useSession from '../hooks/useSession';
import InterviewPanel from './InterviewPanel';
import SketchPanel from './SketchPanel';

function InterviewPage() {
  const { id } = useParams();
  const {
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
  } = useSession(id);

  // --- FIX #4: Save sessionId to localStorage so it can be resumed later ---
  useEffect(() => {
    if (id) {
      localStorage.setItem('witnessSketch_lastSessionId', id);
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading session...</p>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600 text-lg">{error}</p>
      </div>
    );
  }

  // Completed session — show read-only summary instead of active interview form.
  // A session with status 'completed' was finalized by the export step (Stage 8).
  // Do NOT allow further answer submission; show an option to re-download the export.
  if (phase === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-gray-700 text-lg font-semibold mb-2">Session Complete</p>
          <p className="text-gray-500 text-sm mb-6">
            This session has been finalized. You can re-download the export below.
          </p>
          <button
            onClick={() => {/* open ExportModal — wired in Stage 8 */}}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
          >
            Re-download Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-900">WitnessSketch</h1>
        <a href="/" className="text-sm text-blue-600 hover:underline">New Session</a>
      </header>

      {/* --- FIX #5: Mobile responsive layout ---
           On mobile/tablet: stacked vertically (chat on top, sketch below).
           On desktop (lg: breakpoint and above): side-by-side 50/50 split. */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Interview Panel */}
        <div className="w-full lg:w-1/2 h-1/2 lg:h-auto border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col">
          <InterviewPanel
            session={session}
            currentQuestion={currentQuestion}
            phase={phase}
            isSending={isSending}
            error={error}
            onSubmitAnswer={submitAnswer}
            onRetry={retryLastAnswer}
            onSkip={skipQuestion}
            onSubmitRefinement={submitRefinement}
          />
        </div>

        {/* Right: Sketch Panel */}
        <div className="w-full lg:w-1/2 h-1/2 lg:h-auto flex flex-col">
          <SketchPanel
            sketches={sketches}
            latestSketch={latestSketch}
            onRevert={revertSketch}
            onSubmitRefinement={submitRefinement}
            phase={phase}
            isSending={isSending}
            isGeneratingSketch={isGeneratingSketch}
          />
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar phase={phase} session={session} />
    </div>
  );
}

export default InterviewPage;
```

---

### 6.3 — Build the Status Bar

```jsx
import { useState, useEffect } from 'react';

const PHASE_LABELS = {
  rapport: 'Rapport Building',
  context: 'Context Reinstatement',
  freeRecall: 'Free Recall',
  holisticTraits: 'Holistic Impression',
  featureRecall: 'Feature Recall',
  bodyClothing: 'Body & Clothing',
  categoryClustering: 'Category Clustering',
  refinement: 'Sketch Refinement',
};

function StatusBar({ phase, session }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!session?.createdAt) return;
    const start = new Date(session.createdAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.createdAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="bg-white border-t border-gray-200 px-6 py-2 flex items-center justify-between text-sm text-gray-500 flex-shrink-0">
      <span>
        Phase: <span className="font-medium text-gray-700">{PHASE_LABELS[phase] || phase}</span>
      </span>
      <span>
        Duration: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
}
```

Put the `StatusBar` component in the same file as `InterviewPage` or in its own file — your choice.

---

### 6.4 — Build the Interview Panel

**Create `client/src/components/InterviewPanel.jsx`:**

```jsx
import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';

function InterviewPanel({
  session,
  currentQuestion,
  phase,
  isSending,
  error,
  onSubmitAnswer,
  onRetry,
  onSkip,
  onSubmitRefinement,
}) {
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.interviewHistory?.length, currentQuestion]);

  // Focus input after sending
  useEffect(() => {
    if (!isSending) inputRef.current?.focus();
  }, [isSending]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    if (phase === 'refinement') {
      // In refinement phase, treat input as sketch feedback
      onSubmitRefinement(input.trim(), null);
    } else {
      onSubmitAnswer(input.trim());
    }
    setInput('');
  };

  const handleSkip = () => {
    if (isSending) return;
    onSkip();
  };

  // Build message list from interview history
  const messages = [];
  if (session?.interviewHistory) {
    for (const entry of session.interviewHistory) {
      messages.push({ type: 'question', text: entry.question });
      if (entry.skipped) {
        messages.push({ type: 'skip', text: "I don't remember" });
      } else if (entry.answer) {
        messages.push({ type: 'answer', text: entry.answer });
      }
    }
  }
  // Add the current (unanswered) question
  if (currentQuestion) {
    messages.push({ type: 'question', text: currentQuestion });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <ChatMessage key={i} type={msg.type} text={msg.text} />
        ))}
        {isSending && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <span className="animate-pulse">Thinking...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* --- FIX #3: Error display with retry button --- */}
      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-600 text-sm flex items-center justify-between">
          <span>{error}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="ml-3 text-red-700 font-medium hover:underline"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              phase === 'refinement'
                ? "Describe what needs to change..."
                : "Type your answer..."
            }
            disabled={isSending}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Send
          </button>
        </form>
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleSkip}
            disabled={isSending}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:text-gray-300 px-3 py-1 rounded border border-gray-300 hover:border-gray-400 transition-colors"
          >
            I don't remember
          </button>
          {/* Finish button appears after a few exchanges */}
          {session?.interviewHistory?.length >= 5 && (
            <button
              disabled={isSending}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:text-gray-300 px-3 py-1 rounded border border-gray-300 hover:border-gray-400 transition-colors ml-auto"
              onClick={() => {
                // Navigate to export — will be implemented in Stage 8
                alert('Export functionality coming in Stage 8');
              }}
            >
              Finish & Export
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default InterviewPanel;
```

---

### 6.5 — Build the ChatMessage component

**Create `client/src/components/ChatMessage.jsx`:**

```jsx
function ChatMessage({ type, text }) {
  if (type === 'question') {
    return (
      <div className="flex justify-start">
        <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] shadow-sm">
          <p className="text-sm text-gray-500 font-medium mb-1">Interviewer</p>
          <p className="text-gray-800">{text}</p>
        </div>
      </div>
    );
  }

  if (type === 'skip') {
    return (
      <div className="flex justify-end">
        <div className="bg-gray-200 text-gray-500 italic rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%]">
          <p className="text-sm">{text}</p>
        </div>
      </div>
    );
  }

  // type === 'answer'
  return (
    <div className="flex justify-end">
      <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%]">
        <p>{text}</p>
      </div>
    </div>
  );
}

export default ChatMessage;
```

---

### 6.6 — Add the route to App.jsx

**Update `client/src/App.jsx`:**

```jsx
import { Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import InterviewPage from './components/InterviewPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/session/:id" element={<InterviewPage />} />
    </Routes>
  );
}

export default App;
```

---

### 6.7 — Add "Resume Previous Session" to the Landing Page

**FIX #4: Update the LandingPage component** to read the saved sessionId from localStorage and show a resume link:

```jsx
// In LandingPage.jsx, add this inside the component:
const lastSessionId = localStorage.getItem('witnessSketch_lastSessionId');

// Then in the JSX, below the "Start a Witness Interview" button:
{lastSessionId && (
  <a
    href={`/session/${lastSessionId}`}
    className="block mt-4 text-sm text-blue-600 hover:underline text-center"
  >
    Resume Previous Session
  </a>
)}
```

This allows a user who navigated away or closed the tab to pick up where they left off. The session ID is saved to localStorage in `InterviewPage` on mount (see section 6.2).

---

### 6.8 — Test the full flow

1. Go to `http://localhost:3000`
2. Click "Start a Witness Interview"
3. You should be navigated to `/session/UUID`
4. The first rapport question should appear
5. Type an answer and press Send — a new question should appear
6. Click "I don't remember" — the engine should skip gracefully
7. Watch the phase indicator in the status bar change as the interview progresses
8. The timer should count up from session start
9. Chat should auto-scroll to the latest message
10. Messages should be styled differently for interviewer (left, white) vs. witness (right, blue) vs. skipped (right, gray italic)
11. **Simulate a network error** — the error bar should show "Failed to send answer. [Retry]" and clicking Retry should re-send
12. **Reload the page** — the session should resume at the correct next question, not re-show the last answered question
13. **Go back to the landing page** — a "Resume Previous Session" link should appear

---

## Definition of Done

- [ ] Interview page loads at `/session/:id` and displays the first question
- [ ] Chat messages display with correct styling (interviewer left, witness right, skip gray)
- [ ] Text input submits on Enter or Send button click
- [ ] Input is cleared and refocused after sending
- [ ] "I don't remember" button sends a skip and the engine continues
- [ ] "Thinking..." indicator shows while waiting for Gemini response
- [ ] Chat auto-scrolls to the latest message
- [ ] Phase label updates in the status bar as phases transition
- [ ] Session timer counts up from the session creation time
- [ ] Error messages display in a red bar above the input with a Retry button
- [ ] Retry button re-sends the last failed answer
- [ ] "Finish & Export" button appears after 5+ exchanges
- [ ] The page handles a lost/invalid session ID gracefully (shows error, doesn't crash)
- [ ] Layout is responsive: stacked vertically on mobile/tablet, 50/50 side-by-side on desktop (lg: breakpoint)
- [ ] Session ID is saved to localStorage and a "Resume Previous Session" link appears on the landing page
- [ ] Session resume correctly shows the next unanswered question, not the last answered one
- [ ] `isGeneratingSketch` state is exposed from `useSession` and wired to `SketchPanel`
- [ ] Sessions with `status: 'completed'` render a read-only completion view — the interview input form is not shown and no further answers can be submitted
- [ ] The completed-session view shows an option to re-download the export

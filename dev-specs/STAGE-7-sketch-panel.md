# Stage 7: Frontend — Sketch Panel, History & Refinement UI

## Goal
Build the right side of the interview layout: the sketch display panel, sketch history filmstrip, comparison view, confidence meter, and revert functionality. This replaces the placeholder from Stage 6.

## Prerequisites
- Stage 6 complete (interview panel working, `useSession` hook returning sketch data)
- Stage 4 complete (backend generating and storing sketches)

---

## Step-by-Step Instructions

### 7.1 — Build the SketchPanel component

**Create `client/src/components/SketchPanel.jsx`:**

```jsx
import { useState } from 'react';
import SketchHistory from './SketchHistory';
import CompareView from './CompareView';
import ConfidenceMeter from './ConfidenceMeter';

function SketchPanel({
  sketches,
  latestSketch,
  onRevert,
  onSubmitRefinement,
  phase,
  isSending,
  isGeneratingSketch,
}) {
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersion, setCompareVersion] = useState(null);
  const [confidence, setConfidence] = useState(null);

  const currentImage = latestSketch?.imageData || null;
  const currentVersion = latestSketch?.version || 0;

  // Handle compare: user clicks a thumbnail in the filmstrip.
  // If not in compare mode, enter it and set the clicked version.
  // If already in compare mode, update the compare version.
  const handleSelectForCompare = (version) => {
    if (!compareMode) {
      setCompareMode(true);
      setCompareVersion(version);
    } else {
      setCompareVersion(version);
    }
  };

  // Handle revert — with bounds checking
  const handleRevert = (version) => {
    // Don't allow reverting to the current version
    if (version === currentVersion) return;
    // Don't allow reverting to a version that doesn't exist
    if (!sketches.some((s) => s.version === version)) return;

    if (window.confirm(`Revert to sketch version ${version}? The current sketch will be kept in history.`)) {
      onRevert(version);
    }
  };

  // Handle confidence submission during refinement
  const handleConfidenceSubmit = () => {
    if (confidence !== null) {
      onSubmitRefinement(
        `Witness rated confidence at ${confidence}/10`,
        confidence
      );
    }
  };

  // Whether the "Revert to Previous" button should be disabled
  const canRevertToPrevious = sketches.length > 1 && currentVersion > 1;

  return (
    <div className="relative flex flex-col h-full bg-gray-100 p-4">
      {/* Main sketch display */}
      <div className="flex-1 flex items-center justify-center">
        {compareMode && compareVersion !== null ? (
          <CompareView
            currentImage={currentImage}
            currentVersion={currentVersion}
            compareImage={
              sketches.find(s => s.version === compareVersion)?.imageData
            }
            compareVersion={compareVersion}
            onClose={() => {
              setCompareMode(false);
              setCompareVersion(null);
            }}
          />
        ) : currentImage ? (
          <div className="relative max-w-full max-h-full">
            <img
              src={`data:image/png;base64,${currentImage}`}
              alt={`Suspect sketch version ${currentVersion}`}
              className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
            />
            <span className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              v{currentVersion}
            </span>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
              </svg>
            </div>
            <p className="text-sm">Sketch will appear here as you describe the suspect</p>
          </div>
        )}
      </div>

      {/* Confidence meter — shown during refinement phase */}
      {phase === 'refinement' && currentImage && (
        <div className="mt-4">
          <ConfidenceMeter
            value={confidence}
            onChange={setConfidence}
            onSubmit={handleConfidenceSubmit}
          />
        </div>
      )}

      {/* Sketch history filmstrip */}
      {sketches.length > 0 && (
        <div className="mt-4">
          <SketchHistory
            sketches={sketches}
            currentVersion={currentVersion}
            onSelect={handleSelectForCompare}
            onRevert={handleRevert}
          />
        </div>
      )}

      {/* Action buttons */}
      {sketches.length > 0 && (
        <div className="flex gap-2 mt-3 justify-center">
          <button
            onClick={() => {
              setCompareMode(!compareMode);
              if (compareMode) setCompareVersion(null);
            }}
            className={`text-sm px-3 py-1.5 rounded border transition-colors ${
              compareMode
                ? 'bg-blue-100 border-blue-300 text-blue-700'
                : 'border-gray-300 text-gray-600 hover:border-gray-400'
            }`}
          >
            {compareMode ? 'Exit Compare' : 'Compare'}
          </button>
          {sketches.length > 1 && (
            <button
              onClick={() => handleRevert(currentVersion - 1)}
              disabled={!canRevertToPrevious}
              className="text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:border-gray-400 disabled:text-gray-300 disabled:border-gray-200 transition-colors"
            >
              Revert to Previous
            </button>
          )}
        </div>
      )}

      {/* Loading overlay during sketch generation */}
      {isGeneratingSketch && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 rounded-lg z-10">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-600 animate-pulse">Generating sketch...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SketchPanel;
```

---

### 7.2 — Build the SketchHistory filmstrip

**Create `client/src/components/SketchHistory.jsx`:**

```jsx
function SketchHistory({ sketches, currentVersion, onSelect, onRevert }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">Sketch History</p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sketches.map((sketch) => (
          <button
            key={sketch.version}
            onClick={() => onSelect?.(sketch.version)}
            onDoubleClick={() => {
              // Don't allow reverting to the current version via double-click
              if (sketch.version === currentVersion) return;
              onRevert?.(sketch.version);
            }}
            title={`Version ${sketch.version}${onSelect ? ' — click to compare' : ''}${onRevert && sketch.version !== currentVersion ? ' — double-click to revert' : ''}`}
            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
              sketch.version === currentVersion
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {sketch.imageData ? (
              <img
                src={`data:image/png;base64,${sketch.imageData}`}
                alt={`Version ${sketch.version}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">
                v{sketch.version}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default SketchHistory;
```

**Note on thumbnail data:** The filmstrip needs image data for each sketch. There are two approaches:

1. **Simple (recommended for now):** The `useSession` hook stores the full base64 image data for each sketch in memory. This works fine for sessions with < 20 sketches.
2. **Optimized (for later):** Store only thumbnail-sized versions in memory and lazy-load full images from the API. This would require adding a thumbnail generation step on the backend.

Go with approach 1 for now. If performance becomes an issue, optimize later.

---

### 7.3 — Build the CompareView

**Create `client/src/components/CompareView.jsx`:**

```jsx
function CompareView({ currentImage, currentVersion, compareImage, compareVersion, onClose }) {
  if (!compareImage) {
    return (
      <div className="text-center text-gray-400">
        <p>Select a version from the history to compare</p>
        <button
          onClick={onClose}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex gap-4 items-start">
        {/* Compare sketch (older) */}
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-500 mb-2">Version {compareVersion}</p>
          <img
            src={`data:image/png;base64,${compareImage}`}
            alt={`Version ${compareVersion}`}
            className="max-h-[50vh] object-contain mx-auto rounded-lg border border-gray-200"
          />
        </div>

        {/* Current sketch */}
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-500 mb-2">
            Version {currentVersion} (current)
          </p>
          <img
            src={`data:image/png;base64,${currentImage}`}
            alt={`Version ${currentVersion}`}
            className="max-h-[50vh] object-contain mx-auto rounded-lg border border-blue-300"
          />
        </div>
      </div>
      <div className="text-center mt-3">
        <button
          onClick={onClose}
          className="text-sm text-blue-600 hover:underline"
        >
          Exit Compare
        </button>
      </div>
    </div>
  );
}

export default CompareView;
```

---

### 7.4 — Build the ConfidenceMeter

**Create `client/src/components/ConfidenceMeter.jsx`:**

```jsx
function ConfidenceMeter({ value, onChange, onSubmit }) {
  const percentage = value ? (value / 10) * 100 : 0;

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <p className="text-sm text-gray-600 mb-3">
        How close is this sketch to the person you saw?
      </p>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400">1</span>
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          value={value || 5}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="flex-1 accent-blue-600"
        />
        <span className="text-xs text-gray-400">10</span>
      </div>
      <div className="flex items-center justify-between mt-2">
        {/* Visual bar */}
        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: `${percentage}%`,
              backgroundColor: percentage >= 80 ? '#16a34a' : percentage >= 50 ? '#ca8a04' : '#dc2626',
            }}
          />
        </div>
        <span className="text-sm font-medium text-gray-700 w-12 text-right">
          {value ? `${value}/10` : '—'}
        </span>
      </div>
      {value && (
        <button
          onClick={onSubmit}
          className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors"
        >
          Submit Confidence Rating
        </button>
      )}
    </div>
  );
}

export default ConfidenceMeter;
```

---

### 7.5 — Wire SketchPanel into InterviewPage

**Replace the contents of `client/src/components/InterviewPage.jsx` with this complete file:**

```jsx
import { useParams } from 'react-router-dom';
import useSession from '../hooks/useSession'; // default export — matches Stage 6 definition
import InterviewPanel from './InterviewPanel';
import SketchPanel from './SketchPanel';

function InterviewPage() {
  const { id: sessionId } = useParams();
  const {
    session,
    questions,
    sketches,
    latestSketch,
    phase,
    isSending,
    isGeneratingSketch,
    sendAnswer,
  } = useSession(sessionId);

  // Revert to a previous sketch version via the backend
  const revertSketch = async (version) => {
    try {
      const res = await fetch(`/api/session/${sessionId}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Revert failed:', err);
        return;
      }
      // The backend returns the reverted sketch data; useSession should
      // pick it up via its normal polling/refresh mechanism, or we can
      // force a refresh here if the hook exposes one.
    } catch (err) {
      console.error('Revert request failed:', err);
    }
  };

  // Submit refinement feedback (e.g., confidence rating or textual refinement)
  // This goes through the normal answer submission flow so the backend can
  // decide whether to regenerate the sketch.
  const submitRefinement = (text, confidenceValue) => {
    sendAnswer(text, { confidence: confidenceValue });
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <h1 className="text-sm font-semibold text-gray-700">
          Session <span className="font-mono text-gray-500">{sessionId}</span>
        </h1>
        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">
          {phase || 'loading'}
        </span>
      </header>

      {/* Main content: interview on left, sketch on right */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Interview Panel */}
        <div className="w-full lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-200">
          <InterviewPanel
            questions={questions}
            onSendAnswer={sendAnswer}
            isSending={isSending}
            phase={phase}
          />
        </div>

        {/* Right: Sketch Panel */}
        <div className="w-full lg:w-1/2 flex flex-col">
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
    </div>
  );
}

export default InterviewPage;
```

---

### 7.6 — Handle sketch loading from filmstrip

When the user wants to view a sketch from history that wasn't fully loaded (only metadata), you need to fetch it. Add this to `useSession.js`:

```js
const fetchSketch = useCallback(async (version) => {
  try {
    const res = await fetch(`/api/session/${sessionId}/sketch/${version}`);
    const data = await res.json();
    setSketches(prev =>
      prev.map(s =>
        s.version === version ? { ...s, imageData: data.imageData } : s
      )
    );
    return data.imageData;
  } catch (err) {
    console.error('Failed to fetch sketch:', err);
    return null;
  }
}, [sessionId]);
```

Include `fetchSketch` in the hook's return object and pass it to `SketchPanel` if needed.

---

### 7.7 — Sketch generation loading state

When the interview engine signals `shouldGenerateSketch: true`, there will be a delay while the image generates. The UI should indicate this.

**Add to `useSession.js`:**

```js
import { useState, useCallback, useEffect } from 'react';

// NOTE: Keep this as a default export to match Stage 6's definition.
// import useSession from '../hooks/useSession' — not a named import.
export default function useSession(sessionId) {
  // ... existing state ...
  const [isGeneratingSketch, setIsGeneratingSketch] = useState(false);

  // Your existing sendAnswer function, updated with isGeneratingSketch tracking:
  const sendAnswer = useCallback(async (answerText, meta = {}) => {
    setIsSending(true);
    setIsGeneratingSketch(true); // Assume sketch might be generated

    try {
      const res = await fetch(`/api/session/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: answerText, ...meta }),
      });
      const data = await res.json();

      // Update questions with the new follow-up question
      if (data.nextQuestion) {
        setQuestions(prev => [...prev, { role: 'assistant', text: data.nextQuestion }]);
      }

      // Update phase if it changed
      if (data.phase) {
        setPhase(data.phase);
      }

      // If a new sketch was generated, add it to the list
      if (data.sketch) {
        setSketches(prev => [...prev, data.sketch]);
        setLatestSketch(data.sketch);
      }
    } catch (err) {
      console.error('Failed to send answer:', err);
    } finally {
      setIsSending(false);
      setIsGeneratingSketch(false);
    }
  }, [sessionId]);

  return {
    session,
    questions,
    sketches,
    latestSketch,
    phase,
    isSending,
    isGeneratingSketch, // Expose to components
    sendAnswer,
    fetchSketch,
  };
}
```

**In SketchPanel (already wired in section 7.1 above):**

The `isGeneratingSketch` prop controls the loading overlay. The overlay uses `absolute` positioning on top of the panel's root `div`, which has `className="relative ..."` so the overlay is correctly contained. This works for both the first sketch (when there is no `currentImage` yet) and subsequent regenerations (when a sketch is already visible).

---

### 7.8 — Test the full sketch flow

1. Start a new session from the landing page
2. Answer questions through the rapport and context phases (no sketches yet)
3. Continue into free recall — after this phase, the first sketch should appear
4. Continue answering — sketches should update periodically (every 2-3 answers in feature recall)
5. The filmstrip should show all sketch versions as thumbnails
6. Click a filmstrip thumbnail — should enter compare mode showing that version side-by-side with the current sketch
7. Click a different thumbnail while in compare mode — should swap the compare version
8. Click "Exit Compare" or the button to leave compare mode
9. Double-click a filmstrip thumbnail (not the current version) to revert — should show confirmation dialog
10. Double-clicking the current version thumbnail should do nothing
11. "Revert to Previous" button should be disabled when there is only one sketch or `currentVersion <= 1`
12. In refinement phase, the confidence slider should appear
13. Submit a confidence rating — should be sent to the backend

---

## Definition of Done

- [ ] Sketch panel displays a placeholder when no sketch has been generated yet
- [ ] First sketch appears after the free recall phase
- [ ] Sketch updates display immediately when received from the backend
- [ ] Version badge shows on the current sketch (e.g., "v3")
- [ ] Filmstrip shows all sketch versions as clickable thumbnails
- [ ] Current version is highlighted with a blue border in the filmstrip
- [ ] Clicking a filmstrip thumbnail enters compare mode and shows side-by-side view
- [ ] Clicking another thumbnail while in compare mode swaps the compare version
- [ ] "Exit Compare" button returns to normal view
- [ ] "Revert to Previous" button is disabled when there is only one sketch or version <= 1
- [ ] "Revert to Previous" button triggers a confirmation dialog and reverts
- [ ] Double-clicking the current version in the filmstrip does nothing (no revert)
- [ ] Confidence meter appears only during the refinement phase
- [ ] Confidence slider ranges from 1-10 with color-coded progress bar (red -> yellow -> green)
- [ ] "Submit Confidence Rating" sends the value to the backend
- [ ] "Generating sketch..." loading overlay is shown while `isGeneratingSketch` is true
- [ ] Loading overlay is correctly positioned (parent has `relative` class)
- [ ] The layout uses responsive `flex-col lg:flex-row` for mobile/desktop
- [ ] The layout doesn't break when there are 0, 1, or 10+ sketches
- [ ] Filmstrip scrolls horizontally if there are too many thumbnails to fit

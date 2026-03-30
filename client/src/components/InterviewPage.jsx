import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import useSession from '../hooks/useSession';
import InterviewPanel from './InterviewPanel';
import SketchPanel from './SketchPanel';
import ExportModal from './ExportModal';
import TopNavBar from './TopNavBar';

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

const PHASE_KEYS = ['rapport', 'context', 'freeRecall', 'holisticTraits', 'featureRecall', 'bodyClothing', 'categoryClustering', 'refinement'];

function BottomStatusBar({ phase, session }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!session?.createdAt) return;
    // SQLite datetime('now') returns UTC without a 'Z' suffix.
    // Append 'Z' so JavaScript parses it as UTC, not local time.
    const raw = session.createdAt;
    const start = new Date(raw.endsWith('Z') ? raw : raw + 'Z').getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.createdAt]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  const currentPhaseIndex = PHASE_KEYS.indexOf(phase);

  return (
    <footer className="fixed bottom-0 left-0 w-full flex justify-between items-center px-4 md:px-8 bg-slate-900 border-t border-slate-800 z-50 h-10">
      <div className="flex items-center gap-3">
        {PHASE_KEYS.map((key, i) => {
          const isDone = currentPhaseIndex > i;
          const isCurrent = phase === key;
          return (
            <div key={key} className="flex items-center gap-1" title={PHASE_LABELS[key]}>
              <div
                className={`w-2 h-2 rounded-full transition-colors ${
                  isCurrent ? 'bg-blue-400 ring-2 ring-blue-400/40' :
                  isDone ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              />
              {isCurrent && (
                <span className="text-blue-400 font-bold text-xs uppercase tracking-widest font-mono hidden md:inline">
                  {PHASE_LABELS[key]}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest font-mono">
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>timer</span>
        {mm}:{ss}
      </div>
    </footer>
  );
}

function InterviewPage() {
  const { id: sessionId } = useParams();
  const [showExport, setShowExport] = useState(false);
  const {
    session,
    currentQuestion,
    sketches,
    latestSketch,
    phase,
    isLoading,
    isSending,
    isGeneratingSketch,
    error,
    submitAnswer,
    retryLastAnswer,
    skipQuestion,
    submitRefinement,
    revertSketch,
  } = useSession(sessionId);

  // Save session ID to localStorage for resume functionality
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('witnessSketch_lastSessionId', sessionId);
    }
  }, [sessionId]);

  const handleSubmitRefinement = (text, confidenceValue) => {
    submitRefinement(text, confidenceValue);
  };

  // Loading screen while session is being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-on-surface-variant font-body">Loading session...</p>
        </div>
      </div>
    );
  }

  // Error screen if session failed to load
  if (error && !session) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-error block mb-4" style={{ fontSize: '48px' }}>error</span>
          <p className="text-error font-body text-lg mb-4">{error}</p>
          <Link to="/" className="text-primary hover:underline font-label font-semibold">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-surface font-body text-on-surface overflow-hidden">
      <TopNavBar sessionId={sessionId} />

      {/* Main content — padded for TopNavBar (52px) and BottomStatusBar (40px) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden pt-[52px] pb-10">
        {/* Left: Interview Panel */}
        <div className="w-full lg:w-1/2 flex flex-col border-r border-outline-variant/20 bg-surface overflow-hidden">
          <InterviewPanel
            session={session}
            currentQuestion={currentQuestion}
            phase={phase}
            isSending={isSending}
            error={error}
            onSubmitAnswer={submitAnswer}
            onRetry={retryLastAnswer}
            onSkip={skipQuestion}
            onSubmitRefinement={handleSubmitRefinement}
            onFinish={() => setShowExport(true)}
          />
        </div>

        {/* Right: Sketch Panel */}
        <div className="w-full lg:w-1/2 flex flex-col overflow-hidden">
          <SketchPanel
            sketches={sketches}
            latestSketch={latestSketch}
            onRevert={revertSketch}
            onSubmitRefinement={handleSubmitRefinement}
            phase={phase}
            isSending={isSending}
            isGeneratingSketch={isGeneratingSketch}
            onFinish={() => setShowExport(true)}
          />
        </div>
      </div>

      <BottomStatusBar phase={phase} session={session} />

      {showExport && (
        <ExportModal
          sessionId={sessionId}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}

export default InterviewPage;

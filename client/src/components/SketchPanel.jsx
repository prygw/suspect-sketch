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
  onFinish,
}) {
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersion, setCompareVersion] = useState(null);
  const [confidence, setConfidence] = useState(null);

  const currentImage = latestSketch?.imageData || null;
  const currentVersion = latestSketch?.version || 0;

  const handleSelectForCompare = (version) => {
    if (!compareMode) {
      setCompareMode(true);
      setCompareVersion(version);
    } else {
      setCompareVersion(version);
    }
  };

  const handleRevert = (version) => {
    if (version === currentVersion) return;
    if (!sketches.some((s) => s.version === version)) return;
    if (window.confirm(`Revert to sketch version ${version}? The current sketch will be kept in history.`)) {
      onRevert(version);
    }
  };

  const handleConfidenceSubmit = () => {
    if (confidence !== null) {
      onSubmitRefinement(`Witness rated confidence at ${confidence}/10`, confidence);
    }
  };

  const canRevertToPrevious = sketches.length > 1 && currentVersion > 1;

  return (
    <div className="relative flex flex-col h-full bg-surface-container-low">
      {/* Main sketch display area */}
      <div className="flex-1 relative flex items-center justify-center p-10">
        {compareMode && compareVersion !== null ? (
          <CompareView
            currentImage={currentImage}
            currentVersion={currentVersion}
            compareImage={sketches.find(s => s.version === compareVersion)?.imageData}
            compareVersion={compareVersion}
            onClose={() => { setCompareMode(false); setCompareVersion(null); }}
          />
        ) : currentImage ? (
          <div className="relative w-full max-w-lg aspect-[3/4] bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden border border-outline-variant/10">
            <img
              src={`data:image/png;base64,${currentImage}`}
              alt={`Suspect sketch version ${currentVersion}`}
              className="w-full h-full object-cover grayscale brightness-90 contrast-125"
            />
          </div>
        ) : (
          <div className="text-center text-on-surface-variant">
            <div className="w-48 h-48 border-2 border-dashed border-outline-variant rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-outline" style={{ fontSize: '72px' }}>face</span>
            </div>
            <p className="text-sm font-body">Sketch will appear here as you describe the suspect</p>
          </div>
        )}

        {/* Loading overlay during sketch generation */}
        {isGeneratingSketch && (
          <div className="absolute inset-0 bg-on-background/10 backdrop-blur-[2px] flex flex-col items-center justify-center z-10">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 font-headline font-bold text-on-background tracking-wide">Generating sketch...</p>
          </div>
        )}

        {/* Floating utility buttons */}
        {currentImage && !compareMode && (
          <div className="absolute top-6 right-6 flex flex-col gap-2 z-10">
            <button
              className="glass-panel w-12 h-12 rounded-full flex items-center justify-center shadow-sm hover:bg-surface-bright transition-colors"
              title="Zoom"
            >
              <span className="material-symbols-outlined text-primary">zoom_in</span>
            </button>
            <button
              onClick={() => setCompareMode(true)}
              className="glass-panel w-12 h-12 rounded-full flex items-center justify-center shadow-sm hover:bg-surface-bright transition-colors"
              title="Compare versions"
            >
              <span className="material-symbols-outlined text-on-surface">compare</span>
            </button>
            <button
              onClick={onFinish}
              className="glass-panel w-12 h-12 rounded-full flex items-center justify-center shadow-sm hover:bg-surface-bright transition-colors"
              title="Export"
            >
              <span className="material-symbols-outlined text-on-surface">download</span>
            </button>
          </div>
        )}
      </div>

      {/* Controls panel */}
      {(sketches.length > 0 || phase === 'refinement') && (
        <div className="p-6 bg-surface-container-lowest rounded-t-[2rem] shadow-inner space-y-6">
          {/* Confidence meter during refinement */}
          {phase === 'refinement' && currentImage && (
            <ConfidenceMeter
              value={confidence}
              onChange={setConfidence}
              onSubmit={handleConfidenceSubmit}
            />
          )}

          {/* Filmstrip */}
          {sketches.length > 0 && (
            <SketchHistory
              sketches={sketches}
              currentVersion={currentVersion}
              onSelect={handleSelectForCompare}
              onRevert={handleRevert}
            />
          )}

          {/* Revert button */}
          {sketches.length > 1 && (
            <div className="flex justify-center">
              <button
                onClick={() => handleRevert(currentVersion - 1)}
                disabled={!canRevertToPrevious}
                className="text-xs text-on-surface-variant hover:text-on-surface disabled:opacity-30 font-label uppercase tracking-widest transition-colors"
              >
                Revert to Previous Version
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SketchPanel;

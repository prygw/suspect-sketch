function CompareView({ currentImage, currentVersion, compareImage, compareVersion, onClose }) {
  if (!compareImage) {
    return (
      <div className="text-center text-on-surface-variant">
        <p className="font-body text-sm mb-3">Select a version from the history to compare</p>
        <button
          onClick={onClose}
          className="text-sm text-primary hover:underline font-label"
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
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-tertiary mb-2 font-label">
            Version {compareVersion}
          </p>
          <img
            src={`data:image/png;base64,${compareImage}`}
            alt={`Version ${compareVersion}`}
            className="max-h-[50vh] object-contain mx-auto rounded-xl border border-outline-variant/20 grayscale brightness-90 contrast-125"
          />
        </div>
        {/* Current sketch */}
        <div className="flex-1 text-center">
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-primary mb-2 font-label">
            Version {currentVersion} (current)
          </p>
          <img
            src={`data:image/png;base64,${currentImage}`}
            alt={`Version ${currentVersion}`}
            className="max-h-[50vh] object-contain mx-auto rounded-xl border-2 border-primary grayscale brightness-90 contrast-125"
          />
        </div>
      </div>
      <div className="text-center mt-4">
        <button
          onClick={onClose}
          className="text-xs font-label uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
        >
          Exit Compare
        </button>
      </div>
    </div>
  );
}

export default CompareView;

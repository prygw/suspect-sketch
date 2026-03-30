function SketchHistory({ sketches, currentVersion, onSelect, onRevert }) {
  return (
    <div>
      <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-tertiary mb-3 font-label">
        Iteration History
      </p>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {sketches.map((sketch) => (
          <button
            key={sketch.version}
            onClick={() => onSelect?.(sketch.version)}
            onDoubleClick={() => {
              if (sketch.version === currentVersion) return;
              onRevert?.(sketch.version);
            }}
            title={`Version ${sketch.version}${onSelect ? ' — click to compare' : ''}${onRevert && sketch.version !== currentVersion ? ' — double-click to revert' : ''}`}
            className={`flex-shrink-0 w-20 aspect-[3/4] rounded-lg overflow-hidden transition-all ${
              sketch.version === currentVersion
                ? 'border-2 border-primary ring-4 ring-primary/10'
                : 'border border-outline-variant/30 hover:border-primary opacity-60 grayscale'
            }`}
          >
            {sketch.imageData ? (
              <img
                src={`data:image/png;base64,${sketch.imageData}`}
                alt={`Version ${sketch.version}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-surface-container-high flex items-center justify-center text-xs text-on-surface-variant font-label">
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

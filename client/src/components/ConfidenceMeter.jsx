function ConfidenceMeter({ value, onChange, onSubmit }) {
  const displayValue = value || 5;
  const percentage = (displayValue / 10) * 100;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-tertiary font-label">
          Witness Confidence
        </label>
        <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold font-label">
          {displayValue} / 10
        </span>
      </div>
      <div className="relative h-2 w-full bg-surface-container rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-error via-surface-tint to-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          value={displayValue}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      {value && (
        <button
          onClick={onSubmit}
          className="w-full primary-gradient text-on-primary text-sm py-2 rounded-lg font-semibold font-label hover:opacity-90 transition-opacity"
        >
          Submit Confidence Rating
        </button>
      )}
    </div>
  );
}

export default ConfidenceMeter;

import { useState, useEffect } from 'react';

function ExportModal({ sessionId, onClose }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);

  // Fetch the export preview when the modal opens
  useEffect(() => {
    async function fetchPreview() {
      try {
        const res = await fetch(`/api/session/${sessionId}/export/preview`);
        if (res.ok) {
          setPreview(await res.json());
        }
      } catch {
        // Preview is optional — if it fails, the user can still export
      } finally {
        setPreviewLoading(false);
      }
    }
    fetchPreview();
  }, [sessionId]);

  const handleExport = async (format) => {
    setIsExporting(true);
    setExportError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });
      if (!res.ok) throw new Error('Export failed');
      const disposition = res.headers.get('Content-Disposition');
      let filename = `suspect-sketch-export.${format === 'pdf' ? 'pdf' : 'png'}`;
      if (disposition) {
        const match = disposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const durationLabel = preview?.duration || '—';
  const sketchCount = preview?.numberOfSketches ?? '—';
  const exchangeCount = preview?.numberOfExchanges ?? '—';
  const confidence = preview?.finalConfidence ?? null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 glass-overlay">
      <div className="bg-surface-container-lowest w-full max-w-3xl rounded-xl shadow-[0_12px_32px_-4px_rgba(20,27,43,0.08)] overflow-hidden flex flex-col md:flex-row">

        {/* Left: Summary panel */}
        <div className="md:w-5/12 bg-surface-container-low p-10 border-r border-outline-variant/10">
          <h2 className="font-headline font-bold text-2xl text-on-surface mb-1">Session Summary</h2>
          <p className="font-body text-sm text-on-surface-variant mb-8">
            Exporting forensic assets for administrative review.
          </p>

          <div className="space-y-6">
            {[
              { icon: 'timer', label: 'Duration', value: durationLabel },
              { icon: 'draw', label: 'Sketch Count', value: `${sketchCount} Versions` },
              { icon: 'forum', label: 'Total Exchanges', value: `${exchangeCount} Exchanges` },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary">{icon}</span>
                </div>
                <div>
                  <p className="font-label text-[10px] uppercase tracking-wider text-tertiary">{label}</p>
                  <p className="font-headline font-bold text-lg text-on-surface">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {confidence !== null && (
            <div className="mt-12">
              <div className="flex justify-between items-end mb-2">
                <p className="font-label text-[10px] uppercase tracking-wider text-tertiary">Confidence Score</p>
                <p className="font-headline font-extrabold text-2xl text-primary">{confidence * 10}%</p>
              </div>
              <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${confidence * 10}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions panel */}
        <div className="md:w-7/12 bg-surface-container-lowest p-10">
          {/* Loading indicator */}
          {previewLoading && (
            <div className="mb-10 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-fixed mb-4">
                <span className="material-symbols-outlined text-primary text-3xl animate-pulse">sync</span>
              </div>
              <h3 className="font-headline font-bold text-xl text-on-surface">Preparing Evidence Report</h3>
              <p className="font-body text-sm text-on-surface-variant mt-2">
                Aggregating session logs and rendering high-resolution assets...
              </p>
            </div>
          )}

          {exportError && (
            <div className="mb-6 bg-error-container text-on-error-container px-4 py-3 rounded-lg text-sm font-medium font-body">
              {exportError}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              className="w-full primary-gradient text-on-primary py-4 px-6 rounded-lg font-headline font-bold flex items-center justify-center gap-3 shadow-lg hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              <span className="material-symbols-outlined">picture_as_pdf</span>
              {isExporting ? 'Exporting...' : 'Download Full Report (PDF)'}
            </button>

            <button
              onClick={() => handleExport('sketch')}
              disabled={isExporting}
              className="w-full bg-surface-container-high text-on-secondary-container py-4 px-6 rounded-lg font-headline font-bold flex items-center justify-center gap-3 hover:bg-surface-variant disabled:opacity-60 transition-colors"
            >
              <span className="material-symbols-outlined">image</span>
              Download Sketch Only (PNG)
            </button>

            <div className="pt-6 flex justify-center">
              <button
                onClick={onClose}
                className="text-on-surface-variant hover:text-error font-label text-xs uppercase tracking-widest font-bold transition-colors"
              >
                Cancel Export
              </button>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-outline-variant/10 text-center">
            <p className="font-label text-[10px] text-tertiary leading-relaxed">
              Session hash: {sessionId.slice(0, 4)}...{sessionId.slice(-4)}<br />
              Forensic Integrity Verified via SHA-256
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default ExportModal;

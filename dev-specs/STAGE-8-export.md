# Stage 8: Export — PDF Report & High-Res Sketch Download

## Goal
Build the export functionality: a downloadable high-resolution PNG of the final sketch and a PDF report containing the sketch, composite profile, full interview transcript, sketch evolution, and session metadata.

## Prerequisites
- Stage 7 complete (sketch panel, refinement loop, confidence meter all working)
- A session that has been run through to completion with sketches generated

---

## Step-by-Step Instructions

### 8.1 — Install PDF generation dependency

```bash
cd server
npm install pdfkit
```

---

### 8.2 — Build the export service

**Create `server/services/export.js`:**

```js
const PDFDocument = require('pdfkit');
const sessionService = require('./session');

/**
 * Generate a PDF report for a completed session.
 *
 * @param {string} sessionId
 * @returns {Buffer} - PDF file as a buffer
 */
async function generateReport(sessionId) {
  const session = sessionService.getSession(sessionId);
  if (!session) throw new Error('Session not found');

  const profile = session.compositeProfile;
  const history = session.interviewHistory;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `Suspect Sketch Report — Session ${sessionId.slice(0, 8)}`,
        Author: 'Suspect Sketch',
        CreationDate: new Date(),
      },
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Compute usable page dimensions from actual page size and margins.
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const marginTop = doc.page.margins.top;
    const marginBottom = doc.page.margins.bottom;
    const marginLeft = doc.page.margins.left;
    const contentBottom = pageHeight - marginBottom;

    // --- PAGE 1: Title and Final Sketch ---

    doc.fontSize(24).font('Helvetica-Bold').text('Suspect Sketch Report', {
      align: 'center',
    });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#666666').text(
      `Session ID: ${sessionId}`,
      { align: 'center' }
    );
    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      { align: 'center' }
    );
    doc.text(
      `Interview Duration: ${calculateDuration(session.createdAt, session.updatedAt)}`,
      { align: 'center' }
    );

    doc.moveDown(2);

    // Final sketch
    const latestSketch = sessionService.getLatestSketch(sessionId);
    if (latestSketch) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text('Final Sketch');
      doc.moveDown(0.5);
      try {
        const imageBuffer = Buffer.from(latestSketch.image_data, 'base64');
        doc.image(imageBuffer, {
          fit: [300, 400],
          align: 'center',
        });
      } catch (imgErr) {
        doc.fontSize(10).fillColor('#cc0000').text('[Image could not be embedded]');
      }
    }

    // Final confidence
    const lastRefinement = profile.refinements?.[profile.refinements.length - 1];
    if (lastRefinement?.confidence) {
      doc.moveDown(1);
      doc.fontSize(11).font('Helvetica').fillColor('#000000').text(
        `Witness Confidence: ${lastRefinement.confidence}/10`,
        { align: 'center' }
      );
    }

    // --- PAGE 2: Composite Profile ---

    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text('Composite Profile');
    doc.moveDown(1);

    const desc = profile.description || {};
    const profileFields = [
      ['Global Impression', desc.globalImpression],
      ['Age', desc.age],
      ['Build', desc.build],
      ['Height', desc.height],
      ['Face Shape', desc.faceShape],
      ['Hair', desc.hair],
      ['Eyes', desc.eyes],
      ['Eyebrows', desc.eyebrows],
      ['Nose', desc.nose],
      ['Mouth', desc.mouth],
      ['Chin/Jaw', desc.chin],
      ['Cheeks', desc.cheeks],
      ['Ears', desc.ears],
      ['Skin', desc.skin],
      ['Facial Hair', desc.facialHair],
      ['Clothing', desc.clothing],
      ['Footwear', desc.footwear],
      ['Accessories', desc.accessories],
      ['Items Carried', desc.itemsCarried],
      ['Distinguishing Features', desc.distinguishingFeatures?.join(', ')],
      ['Resembles', desc.similarTo || profile.similarTo],
    ];

    for (const [label, value] of profileFields) {
      if (value) {
        doc.fontSize(10).font('Helvetica-Bold').text(`${label}: `, { continued: true });
        doc.font('Helvetica').text(value);
        doc.moveDown(0.3);
      }
    }

    // Context
    const ctx = profile.context || {};
    if (ctx.location || ctx.lighting || ctx.distance || ctx.duration) {
      doc.moveDown(1);
      doc.fontSize(14).font('Helvetica-Bold').text('Observation Context');
      doc.moveDown(0.5);

      const contextFields = [
        ['Location', ctx.location],
        ['Lighting', ctx.lighting],
        ['Distance', ctx.distance],
        ['Duration of Observation', ctx.duration],
      ];

      for (const [label, value] of contextFields) {
        if (value) {
          doc.fontSize(10).font('Helvetica-Bold').text(`${label}: `, { continued: true });
          doc.font('Helvetica').text(value);
          doc.moveDown(0.3);
        }
      }
    }

    // --- PAGE 3+: Sketch Evolution ---

    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').text('Sketch Evolution');
    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica').fillColor('#666666').text(
      `Total versions generated: ${session.sketchCount}`
    );
    doc.moveDown(1);

    // Show ALL sketch thumbnails in a 2-column grid with proper page breaks.
    const allSketches = [];
    for (let v = 1; v <= session.sketchCount; v++) {
      const sk = sessionService.getSketch(sessionId, v);
      if (sk) allSketches.push(sk);
    }

    const thumbWidth = 200;
    const thumbHeight = 250;
    const cols = 2;
    const colGap = 40;
    let col = 0;
    let startX = marginLeft;
    let yPos = doc.y;

    for (const sketch of allSketches) {
      // Check whether this thumbnail row would overflow the page.
      // Compare against the usable content area (page height minus bottom margin).
      if (yPos + thumbHeight + 30 > contentBottom) {
        doc.addPage();
        yPos = marginTop;
      }

      const x = startX + col * (thumbWidth + colGap);

      try {
        const buf = Buffer.from(sketch.image_data, 'base64');
        doc.image(buf, x, yPos, { fit: [thumbWidth, thumbHeight] });
        doc.fontSize(8).fillColor('#666666').text(
          `v${sketch.version}`,
          x, yPos + thumbHeight + 5,
          { width: thumbWidth, align: 'center' }
        );
      } catch {
        doc.fontSize(8).text(`v${sketch.version} [image error]`, x, yPos);
      }

      col++;
      if (col >= cols) {
        col = 0;
        yPos += thumbHeight + 30;
      }
    }

    // --- PAGE N+: Interview Transcript ---

    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text('Interview Transcript');
    doc.moveDown(1);

    for (const entry of history) {
      // Use actual page dimensions for overflow check instead of a magic number.
      if (doc.y > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
      }

      doc.fontSize(8).fillColor('#999999').text(
        `[${entry.phase}] ${entry.created_at || ''}`
      );
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333').text(`Q: ${entry.question}`);

      if (entry.skipped) {
        doc.font('Helvetica-Oblique').fillColor('#999999').text('  [Witness skipped]');
      } else if (entry.answer) {
        doc.font('Helvetica').fillColor('#000000').text(`A: ${entry.answer}`);
      }

      doc.moveDown(0.8);
    }

    // --- Finalize ---
    doc.end();
  });
}

/**
 * Generate a preview summary of what the PDF export will contain.
 * Returns a JSON-friendly object (no binary data).
 *
 * @param {string} sessionId
 * @returns {object} preview summary
 */
function generatePreview(sessionId) {
  const session = sessionService.getSession(sessionId);
  if (!session) throw new Error('Session not found');

  const profile = session.compositeProfile;
  const history = session.interviewHistory;

  // Build a plain-text summary of which profile fields are filled in.
  const desc = profile.description || {};
  const filledFields = [];
  const fieldNames = [
    'globalImpression', 'age', 'build', 'height', 'faceShape', 'hair',
    'eyes', 'eyebrows', 'nose', 'mouth', 'chin', 'cheeks', 'ears',
    'skin', 'facialHair', 'clothing', 'footwear', 'accessories',
    'itemsCarried',
  ];
  for (const f of fieldNames) {
    if (desc[f]) filledFields.push(f);
  }
  if (desc.distinguishingFeatures?.length > 0) filledFields.push('distinguishingFeatures');
  if (profile.similarTo) filledFields.push('similarTo');

  const lastRefinement = profile.refinements?.[profile.refinements.length - 1];

  return {
    sessionId: session.id,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    duration: calculateDuration(session.createdAt, session.updatedAt),
    numberOfSketches: session.sketchCount,
    numberOfExchanges: history.length,
    numberOfRefinements: profile.refinements?.length || 0,
    finalConfidence: lastRefinement?.confidence || null,
    profileFieldsFilled: filledFields,
    profileFieldsFilledCount: filledFields.length,
    hasContext: !!(profile.context?.location || profile.context?.lighting
      || profile.context?.distance || profile.context?.duration),
    phases: [...new Set(history.map((e) => e.phase))],
  };
}

function calculateDuration(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffMs = end - start;
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

module.exports = { generateReport, generatePreview };
```

---

### 8.3 — Update the export endpoint

**Update the `POST /:id/export` handler in `server/routes/session.js`:**

```js
const exportService = require('../services/export');

router.post('/:id/export', async (req, res) => {
  try {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Mark the session as completed upon export.
    // Re-export scenario: if status is already 'completed', this call is a no-op.
    // Re-export is always allowed — the export is regenerated from stored data
    // without error or warning.
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
```

### 8.3b — Add the export preview endpoint

**Add this route in `server/routes/session.js` (before the export POST handler):**

```js
const exportService = require('../services/export');

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
```

The preview endpoint returns a JSON summary like:

```json
{
  "sessionId": "abc-123",
  "createdAt": "2026-03-24T10:00:00Z",
  "updatedAt": "2026-03-24T10:35:00Z",
  "duration": "35m 0s",
  "numberOfSketches": 4,
  "numberOfExchanges": 18,
  "numberOfRefinements": 3,
  "finalConfidence": 7,
  "profileFieldsFilled": ["globalImpression", "age", "hair", "eyes", "nose"],
  "profileFieldsFilledCount": 5,
  "hasContext": true,
  "phases": ["rapport", "context", "freeRecall", "holisticTraits", "featureRecall", "refinement"]
}
```

The frontend can use this to show the witness what will be included before they commit to downloading.

---

### 8.4 — Build the Export Modal on the frontend

**Create `client/src/components/ExportModal.jsx`:**

```jsx
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

      // Determine filename from Content-Disposition header or use default
      const disposition = res.headers.get('Content-Disposition');
      let filename = `suspect-sketch-export.${format === 'pdf' ? 'pdf' : 'png'}`;
      if (disposition) {
        const match = disposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      // Download the file
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Export Session</h2>
        <p className="text-gray-600 text-sm mb-6">
          Download the final sketch and interview report.
        </p>

        {/* Preview summary */}
        {previewLoading && (
          <p className="text-gray-400 text-sm mb-4">Loading summary...</p>
        )}
        {preview && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-gray-700 space-y-1">
            <p><span className="font-medium">Duration:</span> {preview.duration}</p>
            <p><span className="font-medium">Sketches:</span> {preview.numberOfSketches}</p>
            <p><span className="font-medium">Interview exchanges:</span> {preview.numberOfExchanges}</p>
            <p><span className="font-medium">Refinements:</span> {preview.numberOfRefinements}</p>
            {preview.finalConfidence && (
              <p><span className="font-medium">Final confidence:</span> {preview.finalConfidence}/10</p>
            )}
            <p><span className="font-medium">Profile fields filled:</span> {preview.profileFieldsFilledCount}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 rounded-lg font-medium transition-colors"
          >
            {isExporting ? 'Exporting...' : 'Download Full Report (PDF)'}
          </button>
          <p className="text-xs text-gray-400 -mt-1 ml-1">
            Includes sketch, profile, transcript, and sketch evolution
          </p>

          <button
            onClick={() => handleExport('sketch')}
            disabled={isExporting}
            className="w-full bg-white border border-gray-300 hover:border-gray-400 text-gray-700 py-3 rounded-lg font-medium transition-colors"
          >
            Download Sketch Only (PNG)
          </button>
        </div>

        {exportError && (
          <p className="text-red-600 text-sm mt-3">{exportError}</p>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default ExportModal;
```

---

### 8.5 — Wire the Export Modal into InterviewPage

**Update `client/src/components/InterviewPage.jsx`:**

```jsx
import { useState } from 'react';
import ExportModal from './ExportModal';

// Inside InterviewPage component:
const [showExport, setShowExport] = useState(false);

// In the JSX, after the main layout:
{showExport && (
  <ExportModal
    sessionId={id}
    onClose={() => setShowExport(false)}
  />
)}
```

Pass `setShowExport` down to `InterviewPanel` so the "Finish & Export" button opens the modal:

```jsx
<InterviewPanel
  // ... existing props
  onFinish={() => setShowExport(true)}
/>
```

In `InterviewPanel.jsx`, update the "Finish & Export" button:

```jsx
<button
  onClick={onFinish}
  // ... existing classes
>
  Finish & Export
</button>
```

Also add an "Export" button to the `SketchPanel` action buttons area for quick access.

---

### 8.6 — Test the export flow

1. Complete a full interview session (at least through feature recall with a few sketches generated)
2. Click "Finish & Export"
3. The export modal should appear **with a preview summary** showing sketch count, exchange count, duration, and profile completeness
4. Click "Download Full Report (PDF)" — a PDF should download
5. Open the PDF and verify:
   - Title page with session ID and timestamp
   - Final sketch embedded as an image
   - Confidence rating displayed
   - Composite profile with all described features
   - Observation context (location, lighting, etc.)
   - Sketch evolution page with thumbnail grid (handles 7+ sketches with proper page breaks)
   - Full interview transcript with phase labels and timestamps (long transcripts span multiple pages correctly)
6. Click "Download Sketch Only (PNG)" — a PNG should download
7. Verify the PNG is the final sketch image
8. Test the preview endpoint directly: `GET /api/session/abc-123/export/preview`

---

## Definition of Done

- [ ] `POST /api/session/:id/export` with `format: "pdf"` returns a downloadable PDF
- [ ] `POST /api/session/:id/export` with `format: "sketch"` returns a downloadable PNG
- [ ] `POST /api/session/:id/export` with no format returns JSON
- [ ] `POST /api/session/:id/export` marks the session status as 'completed'
- [ ] `GET /api/session/:id/export/preview` returns a JSON summary (sketch count, exchange count, duration, profile summary)
- [ ] PDF contains: title page, final sketch, confidence rating, composite profile, observation context, sketch evolution grid, full transcript
- [ ] PDF sketch images are embedded correctly (not broken)
- [ ] PDF sketch evolution grid handles 7+ sketches with proper page breaks (no hardcoded y-position cutoff)
- [ ] PDF handles long transcripts across multiple pages (uses `doc.page.height - doc.page.margins.bottom` instead of magic numbers)
- [ ] PDF handles sessions with 0 sketches gracefully (shows "no sketch" message)
- [ ] Export modal opens from "Finish & Export" button
- [ ] Export modal shows preview summary before the user commits to download
- [ ] Export modal shows "Exporting..." while download is in progress
- [ ] Export modal shows error message if export fails
- [ ] Downloaded files have meaningful filenames (include truncated session ID)
- [ ] Files download correctly in Chrome, Firefox, and Safari
- [ ] `POST /api/session/:id/export` called on an already-completed session regenerates the export without error (re-export is intentionally allowed)
- [ ] PDF handles sessions with 0 sketches gracefully (omits the sketch section rather than crashing)

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

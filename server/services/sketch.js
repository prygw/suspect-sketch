const fs = require('fs');
const path = require('path');
const { getImageModel } = require('./gemini');

const BASELINE_PROMPT = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'sketchPrompt.txt'), 'utf-8'
).trim();

const NEGATIVE_PROMPT = 'photograph, photo, digital art, painting, oil paint, cartoon, anime, watermark, black and white, monochrome, grayscale';

/**
 * Assemble a full image generation prompt from the composite profile.
 * Most distinctive features are placed first (generators weight earlier tokens more).
 *
 * @param {Object} profile - The composite profile object
 * @returns {string} - The assembled prompt
 */
function assemblePrompt(profile) {
  const desc = profile.description;
  if (!desc) return BASELINE_PROMPT;

  // Collect all non-null description fields in priority order.
  // Distinctive features and global impression come first.
  const parts = [];

  // Global impression and distinctiveness first (highest signal)
  if (desc.distinguishingFeatures && desc.distinguishingFeatures.length > 0) {
    parts.push(desc.distinguishingFeatures.join(', '));
  }
  if (desc.globalImpression) parts.push(desc.globalImpression);

  // Demographics
  const demographics = [desc.age, desc.build, desc.height].filter(Boolean);
  if (demographics.length) parts.push(demographics.join(', '));

  // Face structure
  if (desc.faceShape) parts.push(`${desc.faceShape} face shape`);

  // Features (top-down order)
  if (desc.hair) parts.push(`${desc.hair} hair`);
  if (desc.forehead) parts.push(`${desc.forehead} forehead`);
  if (desc.eyebrows) parts.push(`${desc.eyebrows} eyebrows`);
  if (desc.eyes) parts.push(`${desc.eyes} eyes`);
  if (desc.nose) parts.push(`${desc.nose} nose`);
  if (desc.cheeks) parts.push(`${desc.cheeks} cheeks`);
  if (desc.mouth) parts.push(`${desc.mouth} mouth`);
  if (desc.chin) parts.push(`${desc.chin} chin`);
  if (desc.ears) parts.push(`${desc.ears} ears`);

  // Skin and facial hair
  if (desc.skin) parts.push(`${desc.skin} skin`);
  if (desc.facialHair) parts.push(desc.facialHair);

  // Accessories that affect the face
  if (desc.accessories) {
    const faceAccessories = extractFaceAccessories(desc.accessories);
    if (faceAccessories) parts.push(faceAccessories);
  }

  // If we have holistic traits, use them to add subtle modifiers
  if (desc.holisticTraits) {
    const traitModifiers = assembleTraitModifiers(desc.holisticTraits);
    if (traitModifiers) parts.push(traitModifiers);
  }

  // If they said the suspect resembles someone
  if (desc.similarTo || profile.similarTo) {
    const resemblance = desc.similarTo || profile.similarTo;
    parts.push(`resembles ${resemblance}`);
  }

  const descriptionText = parts.join('. ');

  if (!descriptionText) return BASELINE_PROMPT;

  // Append the negative prompt instruction at the end
  return `${BASELINE_PROMPT}\n\n${descriptionText}.\n\nDo NOT generate: ${NEGATIVE_PROMPT}`;
}

/**
 * Extract face-relevant accessories from a free-text accessories field.
 * We only want things like glasses, hats, piercings — not watches or bags.
 */
function extractFaceAccessories(accessories) {
  if (typeof accessories !== 'string') return null;
  const faceKeywords = ['glasses', 'sunglasses', 'hat', 'cap', 'beanie',
    'hood', 'piercing', 'earring', 'bandana', 'mask', 'headband'];
  const lower = accessories.toLowerCase();
  const matches = faceKeywords.filter(kw => lower.includes(kw));
  if (matches.length === 0) return null;
  return `wearing ${accessories}`;
}

/**
 * Convert ALL 7 holistic trait ratings into subtle prompt modifiers.
 * These guide the overall feel of the generated sketch without being literal.
 */
function assembleTraitModifiers(traits) {
  const modifiers = [];

  // 1. Masculinity / Femininity
  if (traits.masculinity) {
    const val = traits.masculinity.toLowerCase();
    if (val.includes('mascul') || val.includes('rugged') || val.includes('strong')) {
      modifiers.push('strong angular features');
    } else if (val.includes('femin') || val.includes('soft') || val.includes('delicate')) {
      modifiers.push('soft delicate features');
    } else if (val.includes('androg') || val.includes('between') || val.includes('neutral')) {
      modifiers.push('androgynous features');
    }
  }

  // 2. Attractiveness
  if (traits.attractiveness) {
    const val = traits.attractiveness.toLowerCase();
    if (val.includes('attract') || val.includes('good') || val.includes('handsome') || val.includes('pretty')) {
      modifiers.push('well-proportioned symmetrical features');
    } else if (val.includes('average') || val.includes('ordinary') || val.includes('plain')) {
      modifiers.push('average unremarkable features');
    }
    // Don't add "unattractive" modifiers — let the specific features speak
  }

  // 3. Distinctiveness
  if (traits.distinctiveness) {
    const val = traits.distinctiveness.toLowerCase();
    if (val.includes('distinct') || val.includes('unique') || val.includes('stand out') || val.includes('memorable')) {
      modifiers.push('highly distinctive memorable face');
    } else if (val.includes('blend') || val.includes('average') || val.includes('forgettable') || val.includes('generic')) {
      modifiers.push('generic common-looking face');
    }
  }

  // 4. Perceived Health
  if (traits.perceivedHealth) {
    const val = traits.perceivedHealth.toLowerCase();
    if (val.includes('tired') || val.includes('exhaust') || val.includes('sleep')) {
      modifiers.push('tired-looking, slight under-eye shadows');
    } else if (val.includes('unwell') || val.includes('sick') || val.includes('pale')) {
      modifiers.push('gaunt, pale complexion');
    } else if (val.includes('healthy') || val.includes('fit') || val.includes('vibrant')) {
      modifiers.push('healthy complexion, clear skin');
    }
  }

  // 5. Perceived Age (supplements the description.age field)
  if (traits.perceivedAge) {
    const val = traits.perceivedAge.toLowerCase();
    if (val.includes('young') || val.includes('youth') || val.includes('teen')) {
      modifiers.push('youthful features, smooth skin');
    } else if (val.includes('middle') || val.includes('40') || val.includes('50')) {
      modifiers.push('mature features, early wrinkles');
    } else if (val.includes('old') || val.includes('elder') || val.includes('60') || val.includes('70')) {
      modifiers.push('aged features, deep wrinkles, weathered skin');
    }
  }

  // 6. Perceived Threat / Approachability
  if (traits.perceivedThreat) {
    const val = traits.perceivedThreat.toLowerCase();
    if (val.includes('threat') || val.includes('intimi') || val.includes('angry') || val.includes('scary') || val.includes('menac')) {
      modifiers.push('intense stern expression, hard eyes');
    } else if (val.includes('friend') || val.includes('approach') || val.includes('warm') || val.includes('kind')) {
      modifiers.push('approachable expression, relaxed features');
    } else if (val.includes('neutral') || val.includes('blank') || val.includes('cold')) {
      modifiers.push('neutral flat expression');
    }
  }

  // 7. Perceived Weight (from face)
  if (traits.perceivedWeight) {
    const val = traits.perceivedWeight.toLowerCase();
    if (val.includes('thin') || val.includes('slim') || val.includes('lean') || val.includes('skinny')) {
      modifiers.push('thin face, visible cheekbones, narrow jaw');
    } else if (val.includes('heav') || val.includes('full') || val.includes('round') || val.includes('large') || val.includes('chubby')) {
      modifiers.push('full round face, soft jawline');
    }
    // "average" doesn't add a modifier — let other features define it
  }

  return modifiers.length > 0 ? modifiers.join(', ') : null;
}

/**
 * Validate that base64 data represents a valid image.
 * Checks the first few bytes for PNG or JPEG magic bytes.
 *
 * @param {string} base64Data - Base64-encoded image data
 * @returns {boolean} - Whether the data looks like a valid image
 */
function validateImageData(base64Data) {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length < 4) return false;

    // PNG magic bytes: 89 50 4E 47
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 &&
                  buffer[2] === 0x4E && buffer[3] === 0x47;

    // JPEG magic bytes: FF D8 FF
    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;

    // WebP magic bytes: 52 49 46 46 ... 57 45 42 50
    const isWebp = buffer.length >= 12 &&
                   buffer[0] === 0x52 && buffer[1] === 0x49 &&
                   buffer[2] === 0x46 && buffer[3] === 0x46 &&
                   buffer[8] === 0x57 && buffer[9] === 0x45 &&
                   buffer[10] === 0x42 && buffer[11] === 0x50;

    return isPng || isJpeg || isWebp;
  } catch {
    return false;
  }
}

/**
 * Generate a suspect sketch using Gemini's image generation.
 *
 * This function tries the Gemini 2.0 Flash Experimental model with native
 * image output (responseModalities: ["IMAGE", "TEXT"]). The model generates
 * an image inline in the response as base64 data.
 *
 * @param {Object} profile - The composite profile
 * @param {Object} options - { refinementFeedback?: string, seed?: number }
 * @returns {Object} - { imageData: string (base64), promptUsed: string, mimeType: string }
 */
async function generateSketch(profile, options = {}) {
  let prompt = assemblePrompt(profile);

  // If this is a refinement, emphasize the changes
  if (options.refinementFeedback) {
    prompt += `\n\nIMPORTANT CORRECTION: ${options.refinementFeedback}`;
  }

  // Sketch generation uses its own retry logic instead of the interview
  // engine's withRetry, because withRetry returns a fallback *question* object
  // on exhaustion (designed for interview phases), not an image. If we used
  // withRetry here with a non-existent 'sketch_generation' phase, exhausted
  // retries would return { question: "...", phase: "..." } and the caller
  // would get { imageData: undefined }.
  let lastError;
  const maxRetries = 2;
  const delayMs = 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const model = getImageModel();

      const genResult = await model.generateContent(prompt);
      const response = genResult.response;

      let imageData = null;
      let mimeType = 'image/png';

      for (const candidate of response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if (part.inlineData && part.inlineData.data) {
            imageData = part.inlineData.data; // base64 string
            mimeType = part.inlineData.mimeType || 'image/png';
            break;
          }
        }
        if (imageData) break;
      }

      if (!imageData) {
        const partsDescription = (response.candidates || [])
          .flatMap(c => (c.content?.parts || []))
          .map(p => p.text ? `text(${p.text.slice(0, 50)}...)` : p.inlineData ? 'inlineData' : 'unknown')
          .join(', ');
        throw new Error(`No image data in Gemini response. Parts received: [${partsDescription}]`);
      }

      if (!validateImageData(imageData)) {
        throw new Error('Gemini returned data that is not a valid image (bad magic bytes)');
      }

      return { imageData, mimeType, promptUsed: prompt };
    } catch (err) {
      lastError = err;
      console.error(`Sketch generation failed (attempt ${attempt + 1}/${maxRetries + 1}):`, err.message);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries exhausted — throw so the caller knows sketch generation failed
  throw new Error(`Sketch generation failed after ${maxRetries + 1} attempts: ${lastError.message}`);
}

module.exports = {
  assemblePrompt,
  assembleTraitModifiers,
  extractFaceAccessories,
  validateImageData,
  generateSketch,
  BASELINE_PROMPT,
  NEGATIVE_PROMPT,
};

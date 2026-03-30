const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function getTextModel() {
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

// Model for image generation using Gemini's native image output.
// gemini-2.5-flash-image supports responseModalities: ["IMAGE", "TEXT"]
function getImageModel() {
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-image',
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
    },
  });
}

module.exports = { genAI, getTextModel, getImageModel };

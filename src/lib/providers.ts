import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY
});

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY
});

// Helper function to get the appropriate model
export function getModel(modelName: string) {
  if (modelName.startsWith('gemini-')) {
    return google(modelName);
  } else {
    return groq(modelName);
  }
}

// Default model
export const DEFAULT_MODEL = 'gemini-1.5-flash';

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { identifyClips } from '@/inngest/functions';

// Create the Inngest serve handler
// For local development, signingKey is optional
// For production, add INNGEST_SIGNING_KEY to .env.local
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [identifyClips],
  signingKey: process.env.INNGEST_SIGNING_KEY // Optional: only needed for production
});

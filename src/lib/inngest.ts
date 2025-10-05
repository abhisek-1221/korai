import { Inngest } from 'inngest';

// Create a client to send and receive events
// For local development, Inngest works without keys
// For production, add INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY to .env.local
export const inngest = new Inngest({
  id: 'korai-app',
  name: 'Korai App',
  eventKey: process.env.INNGEST_EVENT_KEY // Optional: only needed for production
});

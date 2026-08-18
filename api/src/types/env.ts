import type { User, Session } from '../db/schemas/auth.table';

export type IngestWorkflowParams = {
  url: string;
  guideId?: string;
  userId?: string;
};

export type Bindings = {
  INGEST_WORKFLOW: Workflow<IngestWorkflowParams>;
  APIFY_TOKEN?: string;
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  GOOGLE_PLACES_API_KEY?: string;
  DATABASE_URL?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  API_BASE_URL?: string;
  APIFY_WEBHOOK_SECRET?: string;
  ENVIRONMENT?: string;
};

export type Variables = {
  user: typeof User.$inferSelect;
  session: typeof Session.$inferSelect;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};

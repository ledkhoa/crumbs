import type { User, Session } from '../db/schemas/auth.table';

export type IngestWorkflowParams = {
  url: string;
  guideId?: string;
  userId?: string;
};

// Interface for Cloudflare Workflow binding compatible in both Workers and external TS consumers
export interface CloudflareWorkflow<T = unknown> {
  create: (options: { params: T; id?: string }) => Promise<{ id: string }>;
  get: (id: string) => Promise<any>;
  createBatch?: (batch: Array<{ params: T; id?: string }>) => Promise<any[]>;
  deleteBatch?: (
    ids: string[],
  ) => Promise<{ deleted: string[]; errors: any[] }>;
}

export type Bindings = {
  INGEST_WORKFLOW: CloudflareWorkflow<IngestWorkflowParams>;
  APIFY_TOKEN?: string;
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  GOOGLE_PLACES_API_KEY?: string;
  DATABASE_URL?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  BETTER_AUTH_TRUSTED_ORIGINS?: string;
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

import type { User, Session } from '../db/schemas/auth.table';
import type { DisposableRpcStub } from '../utils/rpc';

export type IngestWorkflowParams = {
  url: string;
  userId?: string;
};

export interface WorkflowInstance extends DisposableRpcStub {
  id: string;
  status: () => Promise<{
    status: string;
    output?: unknown;
    error?: { name?: string; message?: string } | null;
  }>;
  sendEvent: (event: { type: string; payload: unknown }) => Promise<void>;
  pause?: () => Promise<void>;
  resume?: () => Promise<void>;
  terminate?: () => Promise<void>;
  restart?: () => Promise<void>;
  delete?: () => Promise<void>;
}

export interface WorkflowBinding<T = unknown> {
  create: (options: { params: T; id?: string }) => Promise<WorkflowInstance>;
  get: (id: string) => Promise<WorkflowInstance>;
  createBatch?: (
    batch: Array<{ params: T; id?: string }>,
  ) => Promise<WorkflowInstance[]>;
  deleteBatch?: (
    ids: string[],
  ) => Promise<{ deleted: string[]; errors: unknown[] }>;
}

export type Bindings = {
  INGEST_WORKFLOW: WorkflowBinding<IngestWorkflowParams>;
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

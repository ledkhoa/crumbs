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
  ENVIRONMENT?: string;
};

export type AppEnv = {
  Bindings: Bindings;
};

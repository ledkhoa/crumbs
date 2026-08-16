export type Bindings = {
  APIFY_TOKEN?: string;
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  DATABASE_URL?: string;
  ENVIRONMENT?: string;
};

export type AppEnv = {
  Bindings: Bindings;
};

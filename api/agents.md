# Crumbs API Guidelines & Directory Structure

## Global Rules

1. End every response with "Bob's your uncle".
2. **Always** run Prettier formatting and the linter after every code change:
   ```bash
   bun run format && bun run check
   ```
3. **Failure & Mistake Tracking**: Whenever the user corrects you or points out a mistake/oversight:
   - Immediately log the incident in the **Mistakes & Failure Log** section below (recording Date, Mistake, and Root Cause / Correct Rule).
   - Review this log before each task to ensure you never make the same mistake twice.

---

## Mistakes & Failure Log

| Date       | Mistake / Issue                                               | Root Cause & Prevention Rule                                                                   |
| :--------- | :------------------------------------------------------------ | :--------------------------------------------------------------------------------------------- |
| 2026-08-15 | Used deprecated `z.string().url()` instead of `z.url()` (Zod) | Always use modern Zod top-level `z.url()` schema instead of the deprecated `z.string().url()`. |

---

## Quality Assurance & Code Standards

Before finishing any task or submitting changes in `/api`:

- Run `bun run typecheck` (`tsc --noEmit`) to ensure zero TypeScript type errors.
- Run `bun run lint` (`eslint .`) to catch syntax and static analysis issues.
- Run `bun run format` (`prettier . --write`) to format all modified code cleanly according to `.prettierrc`.
- Or simply run `bun run check` which runs typecheck, lint, and format verification in sequence.

---

## Directory Structure (`/api`)

```
api/
├── src/
│   ├── db/                 # Database schema, Drizzle client, and migrations
│   ├── routes/             # Hono route handlers
│   │   ├── ingest.ts       # POST /api/ingest (Receives social media links, runs scraping & AI extraction)
│   │   ├── crumbs.ts       # GET/PATCH /api/crumbs (Inbox & saved food spots)
│   │   └── guides.ts       # GET/POST /api/guides (Curated lists & travel guides)
│   ├── services/           # Reusable backend services
│   │   ├── ai.ts           # Vercel AI SDK generateObject + Gemini 2.5 Flash structured extraction
│   │   ├── places.ts       # Place resolution & geocoding (Google Places / Mapbox)
│   │   └── scraper.ts      # Social media scraper (Apify Instagram / TikTok with local fallback)
│   ├── types/              # Type definitions
│   │   └── env.ts          # Cloudflare Worker Bindings (AppEnv, Bindings, IngestWorkflowParams)
│   ├── workflows/          # Cloudflare Workflows durable background jobs
│   │   └── ingestWorkflow.ts # IngestWorkflow (Scrape -> AI Extract -> Places Geocode -> Cache -> Persist)
│   └── index.ts            # Main application entrypoint, CORS, route mounting, AppType export for RPC
├── .dev.vars               # Local development environment secrets (gitignored)
├── .prettierrc             # Prettier styling configuration
├── eslint.config.mjs       # Modern ESLint flat configuration (TypeScript + Prettier)
├── package.json            # Scripts: dev, deploy, lint, format, typecheck, check
├── tsconfig.json           # Strict TypeScript configuration with Worker & Node types
└── wrangler.jsonc          # Cloudflare Workers configuration (compatibility_flags: ["nodejs_compat"], workflows: [ingest-workflow])
```

---

## Service Responsibilities & Flow

1. **`src/routes/ingest.ts`**:
   - `POST /api/ingest`: Validates payload `{ url, guideId?, userId? }` and creates an `INGEST_WORKFLOW` instance. Returns `202 Accepted` immediately.
   - `GET /api/ingest/:instanceId`: Queries workflow status and output object.
2. **`src/workflows/ingestWorkflow.ts`**:
   - Executes multi-step durable background workflow:
     1. `scrape-social-post` (via Apify / mock)
     2. `extract-restaurant-details` (via Gemini 2.5 Flash + Zod)
     3. `resolve-place-coordinates` (via Google Places / Mapbox)
     4. `cache-thumbnail-snapshot` (Cloudflare R2 staging)
     5. `persist-and-log-crumb` (Logs output / prepares for NeonDB)
3. **`src/services/ai.ts`**:
   - Uses `@ai-sdk/google` + `generateObject` with Zod schema for type-safe restaurant and vibe extraction.
4. **`src/types/env.ts`**:
   - Defines all Cloudflare environment bindings (`INGEST_WORKFLOW`, `APIFY_TOKEN`, `GOOGLE_GENERATIVE_AI_API_KEY`, `DATABASE_URL`).
5. **`src/index.ts`**:
   - Exports `type AppType = typeof _routes` for Hono RPC and exports `IngestWorkflow` for Cloudflare Workers runtime.

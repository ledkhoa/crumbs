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

| Date       | Mistake / Issue                                                                  | Root Cause & Prevention Rule                                                                                                                |
| :--------- | :------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-08-15 | Used deprecated `z.string().url()` instead of `z.url()` (Zod)                    | Always use modern Zod top-level `z.url()` schema instead of the deprecated `z.string().url()`.                                              |
| 2026-08-15 | Attempted to auto-run `git commit` without explicit request                      | Never run `git commit` automatically unless the user explicitly asks to commit changes.                                                     |
| 2026-08-15 | Used deprecated `generateObject()` instead of `generateText({ output: Output })` | In Vercel AI SDK, always use `generateText({ output: Output.object({ schema }) })` for structured extraction instead of `generateObject()`. |

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
│   │   ├── ai.ts           # Vercel AI SDK generateText (Output.object) + Gemini 2.5 Flash structured extraction
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

## Service Architecture Standards: Class-Based Services & Dependency Injection

All services located under `src/services/` (`ScraperService`, `AIService`, `PlacesService`, etc.) **must** be implemented as class-based objects:

1. **Constructor Dependency Injection**: Accept environment tokens and API keys in the class constructor (`new ScraperService(this.env.APIFY_TOKEN)`).
2. **Clean Method Signatures**: Instance methods must only accept operational inputs (`url`, `name`, `city`, etc.) without requiring callers to repeatedly pass credentials.
3. **Single Initialization**: Clients (e.g. `ApifyClient`, `createGoogleGenerativeAI`) are initialized once per instance rather than rebuilt on each function call.

---

## Service Responsibilities & Flow

1. **`src/routes/ingest.ts`**:
   - `POST /api/ingest`: Validates payload `{ url, guideId?, userId? }` and creates an `INGEST_WORKFLOW` instance. Returns `202 Accepted` immediately.
   - `GET /api/ingest/:instanceId`: Queries workflow status and output object.
2. **`src/workflows/ingestWorkflow.ts`**:
   - Initializes `ScraperService`, `AIService`, and `PlacesService` with environment bindings at the start of `run()`.
   - Executes multi-step durable background workflow:
     1. `scrape-social-post` (`scraper.scrape(url)`)
     2. `extract-restaurant-details` (`ai.extract(scrapedData)`)
     3. `resolve-place-coordinates` (`places.resolve(name, city, address)`)
     4. `cache-thumbnail-snapshot` (Cloudflare R2 staging)
     5. `persist-and-log-crumb` (Logs output / prepares for NeonDB)
3. **`src/services/places.ts`**:
   - `PlacesService`: Google Places API (New) Text Search (`https://places.googleapis.com/v1/places:searchText`) resolving restaurant name/city into exact address, lat/lng, Place ID, photo URLs, opening hours, and Maps URLs.
4. **`src/services/ai.ts`**:
   - `AIService`: Uses `@ai-sdk/google` + `generateText({ output: Output.object({ schema }) })` with Zod schema for type-safe restaurant and vibe extraction.
5. **`src/services/scraper.ts`**:
   - `ScraperService`: Official `ApifyClient` SDK Instagram/TikTok post scraping with local development fixtures.
6. **`src/types/env.ts`**:
   - Defines all Cloudflare environment bindings (`INGEST_WORKFLOW`, `APIFY_TOKEN`, `GOOGLE_GENERATIVE_AI_API_KEY`, `GOOGLE_PLACES_API_KEY`, `DATABASE_URL`).
7. **`src/index.ts`**:
   - Exports `type AppType = typeof _routes` for Hono RPC and exports `IngestWorkflow` for Cloudflare Workers runtime.

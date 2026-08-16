# Crumbs Architecture: Database & AI Schema Design

This document details the database schema and standard AI input/output schemas for the **Crumbs** backend. It is designed to handle asynchronous processing, prevent duplicate scraping, and support structured multi-restaurant extraction.

---

## 1. Database Schema Design (SQL / Drizzle)

To support multiple locations (chains/branches), multi-restaurant posts, and user trip-planning, we use a normalized relational schema.

```mermaid
erDiagram
    POSTS ||--o{ POST_RESTAURANTS : references
    RESTAURANTS ||--|{ RESTAURANT_LOCATIONS : has
    RESTAURANT_LOCATIONS ||--o{ POST_RESTAURANTS : tagged_in
    RESTAURANT_LOCATIONS ||--o{ USER_SAVED_PLACES : saved_by
    USERS ||--o{ USER_SAVED_PLACES : saves
    
    POSTS {
        uuid id PK
        string shortcode UK "Unique normalized Instagram key"
        string source_url
        string platform "instagram | tiktok"
        string status "pending | scraping | processing | completed | failed"
        string caption
        string location_name "Original tagged location"
        jsonb raw_metadata
        timestamp created_at
    }

    RESTAURANTS {
        uuid id PK
        string name
        string cuisine
        string website
    }

    RESTAURANT_LOCATIONS {
        uuid id PK
        uuid restaurant_id FK
        string address
        string city
        string state
        string country
        decimal latitude
        decimal longitude
        geography coordinates "For spatial map indexing"
    }

    POST_RESTAURANTS {
        uuid post_id FK
        uuid restaurant_location_id FK
    }
```

### Table Definitions

#### `posts`
Tracks scraping/processing status to prevent duplicate API requests.
*   `id` (UUID, PK)
*   `shortcode` (VARCHAR, Unique Index): E.g., `DXq15-wEQgf` (stripped of tracking query parameters).
*   `source_url` (TEXT): Normalized original URL.
*   `platform` (VARCHAR): `"instagram"` or `"tiktok"`.
*   `status` (VARCHAR): `"pending"` | `"scraping"` | `"processing"` | `"completed"` | `"failed"`.
*   `caption` (TEXT, Optional)
*   `location_name` (VARCHAR, Optional)
*   `raw_metadata` (JSONB): Full dump from Apify for archival/debugging.
*   `error_message` (TEXT, Optional)

#### `restaurants`
Base entity representing the brand/restaurant itself.
*   `id` (UUID, PK)
*   `name` (VARCHAR)
*   `cuisine` (VARCHAR, Optional)
*   `website` (VARCHAR, Optional)

#### `restaurant_locations`
Specific geographic locations (since restaurants can have multiple branches).
*   `id` (UUID, PK)
*   `restaurant_id` (UUID, FK -> `restaurants.id`)
*   `address` (VARCHAR, Optional)
*   `city` (VARCHAR, Optional)
*   `state` (VARCHAR, Optional)
*   `country` (VARCHAR, Optional)
*   `latitude` (DECIMAL)
*   `longitude` (DECIMAL)

#### `post_restaurants` (Join Table)
Connects posts to the restaurants extracted from them (supports posts listing multiple restaurants).
*   `post_id` (UUID, FK -> `posts.id`, Composite PK)
*   `restaurant_location_id` (UUID, FK -> `restaurant_locations.id`, Composite PK)

---

## 2. AI Input & Output Schemas (Vercel AI SDK)

To ensure the AI extracts structured data reliably, we will switch from `generateText` to `generateObject` using the **Vercel AI SDK** with **Zod** schema validation.

### AI Input Payload (JSON)
Only minimal clean metadata is sent to the LLM to minimize token consumption:
```typescript
interface AIInput {
  shortcode: string;
  caption: string;
  taggedLocation?: string;
  hashtags?: string[];
}
```

### AI Output Schema (Zod)
We define the exact structure the model is required to return.

```typescript
import { z } from "zod";

export const aiExtractionSchema = z.object({
  classification: z.enum([
    "restaurant_related",
    "travel_unrelated_to_restaurants",
    "random_unrelated"
  ]).describe("Classify the social media post category"),
  
  restaurants: z.array(
    z.object({
      name: z.string().describe("The name of the restaurant or cafe"),
      cuisine: z.string().optional().describe("Type of food served (e.g. Italian, Ramen, Cafe)"),
      address: z.string().optional().describe("Street address of the restaurant if available"),
      city: z.string().optional().describe("City where the restaurant is located"),
      state: z.string().optional().describe("State or Province"),
      country: z.string().optional().describe("Country"),
      recommendedDishes: z.array(z.string()).optional().describe("List of dishes highlighted in the caption"),
      notes: z.string().optional().describe("Key observations or details (e.g. 'Highly rated for brunch', 'needs reservations')"),
    })
  ).optional().describe("List of restaurants found in the post. Leave empty if classification is not 'restaurant_related'")
});
```

### Execution Example in Backend
```typescript
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

const { object } = await generateObject({
  model: google("gemini-2.5-flash"),
  schema: aiExtractionSchema,
  system: "You are an expert assistant that parses social media posts and extracts structured restaurant detail entities.",
  prompt: `Analyze the following post details:
Tagged Location: ${input.taggedLocation || "None"}
Caption:
"""
${input.caption}
"""`
});

console.log(object.classification); // "restaurant_related"
console.log(object.restaurants); // Array of extracted restaurant objects
```

import { generateText } from "ai";
import { google } from "@ai-sdk/google";

interface InstagramData {
  caption: string;
  locationName?: string;
  mediaUrls?: string[];
  rawItem?: any;
}

/**
 * Scrapes or fetches Instagram data for a given URL.
 * Supports Apify Instagram Scraper if APIFY_TOKEN is set.
 * Otherwise, falls back to simulated/mock responses for development.
 */
export async function fetchInstagramData(url: string): Promise<InstagramData> {
  const apifyToken = process.env.APIFY_TOKEN;

  if (apifyToken) {
    console.log(
      "[Scraper] APIFY_TOKEN detected. Fetching live Instagram data from Apify...",
    );
    try {
      // Call Apify Instagram Scraper actor synchronously to get dataset items directly
      const response = await fetch(
        `https://api.apify.com/v2/actors/apify~instagram-scraper/run-sync-get-dataset-items?token=${apifyToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            directUrls: [url],
            resultsType: "details",
            resultsLimit: 1,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Apify API returned HTTP ${response.status}: ${errorText}`,
        );
      }

      const items = (await response.json()) as any[];
      if (items.length > 0) {
        const item = items[0];
        return {
          caption: item.caption || "",
          locationName: item.locationName || item.location || "",
          mediaUrls: item.displayUrl ? [item.displayUrl] : [],
          rawItem: item,
        };
      }

      throw new Error("No items returned from Apify dataset");
    } catch (error) {
      console.warn("[Scraper] Failed to fetch live data from Apify:", error);
      throw error;
    }
  }

  // Fallback / Simulated Data for local testing (Option A fallback)
  console.log(
    "[Scraper] No APIFY_TOKEN configured. Using simulated/mock response.",
  );

  if (url.includes("type=restaurant")) {
    return {
      caption:
        "Had the absolute best fresh pasta at L'Artusi in West Village tonight! Truly 10/10. Address: 228 W 10th St, New York, NY 10014. Must try the beef carpaccio too!",
      locationName: "L'Artusi",
    };
  } else if (url.includes("type=travel")) {
    return {
      caption:
        "Exploring the beautiful streets of Kyoto today. The shrines are breathtaking. Travel goals for 2026! #kyoto #japan #travel",
      locationName: "Kyoto, Japan",
    };
  } else {
    // Default fallback
    return {
      caption:
        "Just a cute cat jumping over a fence on a sunny afternoon! #cats #funny",
    };
  }
}

/**
 * Passes an Instagram link to the AI SDK model for analysis by scraping/fetching its content first.
 * Make sure to set the AI_API_KEY environment variable.
 */
export async function processInstagramLink(
  instagramUrl: string,
): Promise<string> {
  if (!instagramUrl) {
    throw new Error("Instagram URL is required");
  }

  // Step 1: Scrape/Fetch the Instagram data (Option A)
  const instagramData = await fetchInstagramData(instagramUrl);
  console.log(
    `[Scraper] Retrieved Caption:\n"""\n${instagramData.caption}\n"""`,
  );
  if (instagramData.locationName) {
    console.log(`[Scraper] Tagged Location: "${instagramData.locationName}"`);
  }

  // Step 2: Pass the retrieved data to the AI model
  const startTime = performance.now();
  const modelName = process.env.AI_MODEL || "gemini-2.5-flash";
  const { text } = await generateText({
    model: google(modelName),
    system: `You are a precise assistant designed to extract restaurant details or classify social media posts.

Rules for evaluation:
1. Check if the post context (caption, tagged location, or hashtags) lists or references any restaurants or dining/food establishments.
   - If yes (even if it's a list of multiple restaurants or a single one), extract and return details for the restaurant(s) in a structured format:
     - Restaurant Name
     - Address (if available)
     - City
     - State
     - Country
     - Other details (cuisine, notes)
2. If there are NO restaurants or dining establishments mentioned or tagged:
   - If the content is travel-related (e.g. city guides, travel tips, landmarks, hotels, scenery) but NOT restaurant-focused, return exactly: "this is a travel video stay tuned for supprt"
   - Otherwise (for random videos, cats, memes, unrelated topics), return exactly: "this is a random video"`,
    prompt: `Analyze this Instagram post:
Instagram URL: ${instagramUrl}
Tagged Location: ${instagramData.locationName || "None"}
Caption Content:
"""
${instagramData.caption}
"""

Raw Metadata (if any):
${instagramData.rawItem ? JSON.stringify(instagramData.rawItem, null, 2) : "None"}`,
  });

  const duration = performance.now() - startTime;
  console.log(`[Timer] AI processing took ${duration.toFixed(2)}ms`);

  return text;
}

// Example usage when running the file directly
if (import.meta.main) {
  // Test different cases using URL flags or actual URLs
  const testUrls = [
    "https://www.instagram.com/p/DaiKM-vjXrl/",
  ];

  for (const url of testUrls) {
    console.log(`\n========================================`);
    console.log(`Analyzing: ${url}`);
    try {
      const analysis = await processInstagramLink(url);
      console.log("\n--- AI Analysis ---");
      console.log(analysis);
    } catch (error) {
      console.error("Error processing Instagram link:", error);
    }
  }
}

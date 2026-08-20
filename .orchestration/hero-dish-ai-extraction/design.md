# Design Specification: Hero Dish AI Extraction & 3-Tier Fallback

## 1. Overview
This is a backend and intelligence tier feature for Crumbs that powers the "Spotify for Cravings" experience. It enriches social media post ingestion by extracting the singular Hero Dish, sensory Vibe Anchor, Course Category, and Walk-in Tips, backed by an automated 3-tier fallback hierarchy.

## 2. Information Architecture & Precedence
```mermaid
flowchart TD
    CrumbCard[Crumb Card UI Display] --> Tier3{Tier 3: User Override?<br/>crumbs.user_hero_dish_override}
    Tier3 -- YES --> ShowOverride[Show '🍽️ My Must-Order: ...']
    Tier3 -- NO --> Tier1{Tier 1: Post Hero Dish?<br/>post_restaurants.hero_dish}
    Tier1 -- YES --> ShowPostDish[Show '🍽️ The Must-Order: ...']
    Tier1 -- NO --> Tier2{Tier 2: Google Places Community Dish?<br/>restaurants.community_favorite_dish}
    Tier2 -- YES --> ShowCommunityDish[Show '⭐ Community Favorite: ...']
    Tier2 -- NO --> Fallback[Show 'Explore Menu']
```

## 3. UI/UX Contract for iOS Clients
* **Hero Dish Banner**: Displayed prominently above restaurant details.
* **Vibe Anchor Tagline**: Evocative 3-8 word sensory atmosphere description rendered in italics below the restaurant title.
* **Course Category Badge**: Used for crawl sequencing (`aperitif` | `main` | `dessert` | `cafe_bakery` | `cocktail_bar` | `snack`).
* **Reservation Action Button**: Direct deep link to Resy, OpenTable, SevenRooms, or Tock if detected.

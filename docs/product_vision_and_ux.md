# Crumbs: Product Vision, UX Flow & iOS Design Specification

> **A Comprehensive Specification for Product Designers, iOS Engineers (Swift / SwiftUI), and AI Agents.**  
> *Target Platform: iOS (Native Swift & SwiftUI with Apple Share Extension)*  
> *Core Identity: "Spotify for Cravings" — The Visual Food, Vibe & Travel Guide Platform.*

---

## 1. Executive Summary & Product Vision

### The Problem
Foodies and travelers constantly discover amazing restaurants, bakeries, and cocktail bars on Instagram Reels and TikTok. Today, these spots end up trapped in saved post folders, messy notes apps, or scattered Apple Maps pins with zero context on *why* they were saved, what dish was recommended, or what the vibe is.

### The Crumbs Solution
**Crumbs** turns viral food and travel videos into an organized, actionable, visual trail:
1. **Frictionless iOS Share Sheet Capture:** Share a link directly from Instagram/TikTok via native iOS Share Extension (`ShareViewController` in Swift/SwiftUI).
2. **AI Extraction & Spatial Resolution:** Automatically extracts the restaurant name, exact address, coordinates, hero dish (e.g. *Truffle Gnocchi*), and vibe tags (*"Date Night"*, *"Cozy"*).
3. **Curated Guides:** Organize spots into custom guides (e.g., *"West Village Date Night"*, *"Tokyo 2026 Bakery Crawl"*).
4. **Actionable Decision Engine:** Live visual maps, nearby filters, and one-tap booking (Resy/OpenTable/Google Maps/Apple Maps).

---

## 2. End-to-End User Experience Flows

```mermaid
flowchart TD
    subgraph Step 1: Capture (iOS Share Extension)
        IG[User browses Instagram / TikTok] --> Share[Taps Share -> Selects 'Crumbs']
        Share --> ExtModal[Crumbs Share Extension SwiftUI Sheet Appears]
        ExtModal --> PickGuide[Optional: Select Guide, + New Guide, or Inbox]
        PickGuide --> Submit[Taps 'Save Crumb']
    end

    subgraph Step 2: AI Processing & Review
        Submit --> BackgroundAPI[POST /ingest -> Cloudflare Workflows]
        BackgroundAPI --> ReviewScreen[SwiftUI Review Sheet: Extracted Spots Checklist]
        ReviewScreen --> MultiCheck{User picks spots to save}
        MultiCheck -->|Checked| SavedToGuide[Saved to Target Guide & All Crumbs]
        MultiCheck -->|Unchecked| SavedToInbox[Still stored in All Crumbs / Inbox]
    end

    subgraph Step 3: Exploration & Execution (Bottom-First Ergonomics)
        SavedToGuide --> Home[Home Screen: Map + Bottom Sheet + Floating Thumb Bar]
        SavedToInbox --> Home
        Home --> Decide[Decide Now / Nearby Spots / Guide Exploration]
    end
```

---

## 3. Screen-by-Screen UX & Wireframe Specifications

### Flow A: The iOS Native Share Extension Experience (`SwiftUI`)

```
┌──────────────────────────────────────────────────┐
│  INSTAGRAM REEL / TIKTOK OVERLAY                 │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ 🍞 Save to Crumbs                    [ ✕ ] │  │
│  │ 🔗 instagram.com/reel/DaiKM-vjXrl...       │  │
│  ├────────────────────────────────────────────┤  │
│  │ 🗺️ Destination Guide:                      │  │
│  │ ┌────────────────────────────────────────┐ │  │
│  │ │ 🔍 Search all guides...                │ │  │
│  │ └────────────────────────────────────────┘ │  │
│  │                                            │  │
│  │ RECENT & FILTERED GUIDES:                  │  │
│  │   (•) 🌴 Bali Trip 2026          (12 spots)│  │
│  │   ( ) 🍷 Date Night Spots         (8 spots)│  │
│  │   ( ) 🥐 Paris Bakery Crawl      (15 spots)│  │
│  │   ( ) 🍜 Tokyo Ramen Map         (22 spots)│  │
│  │                                            │  │
│  │ QUICK OPTIONS:                             │  │
│  │   ( ) ➕ Create "New Guide..."             │  │
│  │   ( ) 📥 Save to Inbox Only (Unassigned)   │  │
│  ├────────────────────────────────────────────┤  │
│  │              [ Save Crumb ]                │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

#### Step 1: Quick Share Sheet Modal with Live Guide Search
* When the user shares a link to Crumbs, a lightweight native SwiftUI modal opens over the current app.
* **Instant Guide Search & Filter:** Includes an inline search bar (`🔍 Search all guides...`) allowing the user to quickly search and filter through their entire collection of guides without leaving the extension.
* **Recent & Matched Guides List:**
  * Displays the user's most recently updated guides by default.
  * As the user types into the search bar, the list dynamically filters matching guides in real time with spot count badges (e.g. *"Paris Bakery Crawl (15 spots)"*).
* **Inline Quick Guide Creation:** If the typed search query does not match an existing guide, an inline button `➕ Create "[Search Query]"` appears immediately to create and assign the new guide in one step.
* **Inbox Default:** `📥 Save to Inbox Only (Unassigned)` is always accessible at the bottom of the list for quick unclassified saves.
* **Frictionless Submission:** User selects their target guide and taps **Save Crumb** $\rightarrow$ Dispatches to `/api/ingest`. The modal dismisses and the user can immediately return to browsing social media.

---

### Flow B: Multi-Restaurant Review & Selection Sheet

When the AI extracts multiple restaurants from a post (e.g., a "Top 5 Dining Experiences in Ubud" carousel), the user sees a review prompt:

```
┌──────────────────────────────────────────────────┐
│ 🍞 5 Spots Extracted from Post                   │
│ Adding to: 🌴 Bali Trip 2026                     │
├──────────────────────────────────────────────────┤
│                                                  │
│ [✓] 1. Mozaic Restaurant Gastronomique           │
│     📍 Ubud, Bali • ⭐ 4.8 (1.2k) • Fine Dining  │
│     🍽️ Hero Dish: Chef's Tasting Menu           │
│                                                  │
│ [✓] 2. Merlin's Magical Dining                   │
│     📍 Ubud, Bali • Themed • Tarot Readings      │
│     🍸 Hero: Dragon Breath Cocktail              │
│                                                  │
│ [✓] 3. Apéritif French Mediterranean Dining      │
│     📍 Ubud, Bali • ⭐ 4.9 • Romantic            │
│                                                  │
│ [ ] 4. Kaja by Numa                              │
│     📍 Ubud, Bali • Modern Cafe                  │
│                                                  │
│ [ ] 5. Ferro Grill Restaurant & Bar              │
│     📍 Ubud, Bali • Steakhouse                   │
│                                                  │
├──────────────────────────────────────────────────┤
│         [ Confirm 3 Spots to Guide ]             │
└──────────────────────────────────────────────────┘
```

#### Selection Rules:
1. **Checked Items:** Saved directly into the chosen **Guide** AND added to the user's global **Crumbs** table.
2. **Unchecked Items:** Still saved to the user's global **Crumbs / Inbox** with `status: 'inbox'` so the user never loses discovered spots and can see they've already ingested the post.
3. **Duplicate Detection:** If a restaurant was already saved in that guide from a previous post, it shows a subtle badge: `"Already in this Guide"` with an option to *"Add to Another Guide"*.

---

## 4. The Home Screen Architecture: Minimalist Map with Floating Liquid Glass Controls

To ensure an ultra-clean, distraction-free visual experience without cluttered top bars or heavy bottom tab bars, the home screen is designed around a **clean full-bleed living map** and an integrated **Floating Liquid Glass Control Island** positioned in the ergonomic thumb zone.

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                      🗺️ LIVING MAP                       │
│        (Clean Full-Bleed MapKit • No Giant Top Bar)      │
│                                                          │
│                   📍 L'Artusi                            │
│                     [ ⭐ 4.7 ]                           │
│                                 📍 Dante (Cocktails)     │
│                                                          │
│        📍 Via Carota                                     │
│                                                          │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  ═══ LIQUID GLASS DRAGGABLE SHEET (.presentationDetents) │
│                                                          │
│  🍞 RECENT INBOX (2 Unreviewed Spots)           [See All]│
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │ 🌴 Mozaic    │ │ 🍸 Merlin's  │ │ 🍝 L'Artusi   │      │
│  │ Ubud, Bali   │ │ Ubud, Bali   │ │ West Village │      │
│  └──────────────┘ └──────────────┘ └──────────────┘      │
│                                                          │
│  🗺️ MY GUIDES                                  [+ New]   │
│  ┌──────────────────────┐ ┌──────────────────────┐      │
│  │ 🌴 Bali 2026 Trip    │ │ 🍷 NYC Date Nights   │      │
│  │ 12 Spots • 3 Days    │ │ 8 Spots • West Vill. │      │
│  └──────────────────────┘ └──────────────────────┘      │
│                                                          │
│  ⚡ OPEN NOW & NEARBY                                    │
│  • L'Artusi — 400m away (Open until 11 PM)              │
│  • Dante — 650m away (Hero: Negroni Sessions)            │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  FLOATING LIQUID GLASS CONTROL ISLAND (Unified Thumb Bar)│
│  ┌────────────────────────────────────────────────────┐  │
│  │ 🔍 Search spots... │ 📍 Soho ▾ │ 🎲 │ 🗺️ │ 📥(2) │ 👤 │  │
│  └────────────────────────────────────────────────────┘  │
│  (Ultra-Thin Glass Blur • Specular Highlight • No Nav Bar)│
└──────────────────────────────────────────────────────────┘
```

---

### Home Screen Component Breakdown:

#### 1. Integrated Floating Liquid Glass Island (Thumb Zone)
* **Zero Clutter, No Traditional Bottom Tab Bar:** Replaces the rigid, outdated multi-row bottom navigation bar with a single, sleek, floating frosted glass capsule.
* **Unified Controls:**
  * **Search & Filter:** `🔍 Search spots, vibes...` triggers an instant full-sheet search.
  * **City / Guide Switcher (`📍 Soho ▾`):** Smoothly flies the MapKit camera between saved destination guides (*"Tokyo"*, *"Bali"*, *"Soho"*).
  * **🎲 "Decide For Me":** Interactive haptic rolling button that instantly surfaces the best open nearby spot.
  * **Integrated Quick Destinations:** Compact translucent glass icons for `🗺️ Guides`, `📥 Inbox` (with live unreviewed badge count), and `👤 Profile`.

#### 2. Clean Living Map (MapKit in SwiftUI)
* **No Giant Top Map Bar:** Full-bleed map from top safe area to bottom without intrusive headers or banners.
* **Visual Pins:** Minimalist, dynamic SwiftUI annotations displaying hero dish snippets or restaurant badges on zoom.
* **Viewport Sync:** Panning the map dynamically filters the cards in the bottom sheet to match the visible area.

#### 3. Liquid Glass Draggable Sheet (SwiftUI Presentation Detents: `.height(100)`, `.medium`, `.large`)
* **Liquid Glass Translucency:** Rendered with `.ultraThinMaterial` and subtle specular edge refraction so the map smoothly shines through behind cards.
* **Collapsed State (Peeking ~15%):** Quick glance at newly ingested **Inbox Captures** and **Active Guides Carousel**.
* **Medium State (50%):** Shows nearby open spots and guide cards while keeping the map visible.
* **Expanded State (Full Screen):** Full searchable list of all spots grouped by Guide, Distance, or Vibe.

---

## 5. Visual Design System & Aesthetics Guidelines

### 1. Liquid Glass & Tactile Material Architecture
* **Apple Ultra-Thin Material Blur:** Surfaces and floating controls use native SwiftUI `.ultraThinMaterial` / `backdrop-filter: blur(28px) saturate(190%)`.
* **Liquid Specular Highlights:** 1px translucent borders with subtle top-to-bottom refraction gradients (`rgba(255, 255, 255, 0.35)` to `rgba(255, 255, 255, 0.08)`).
* **Floating Depth:** Multi-layered soft drop shadows (`box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12)`) creating a lightweight floating feel above the map canvas.
* **Dynamic Fluidity:** Responsive spring animations on expansion, drag gestures, and button haptics.

### 2. Theme-Agnostic Color Palette & Design Exploration
To enable rapid visual testing and A/B aesthetic comparisons, color palettes are **not hard-coded**. Designers and AI agents should explore, test, and propose distinct, cohesive color themes to identify the most delightful and conversion-optimized look and feel:

* **Theme Archetypes for Visual Testing:**
  * **Warm Editorial & Culinary:** Rich creamy backdrops, deep espresso/charcoal typography, vibrant tomato/persimmon accents, and fresh herb pistachio status tags.
  * **Midnight & Neon Vibez (Dark Theme):** Deep obsidian/carbon backgrounds, crisp typography, amber/tangerine highlights, and glowing neon accents.
  * **Modern Minimalist & Clean Linen:** Tactile paper/linen tones, stark graphite typography, subtle warm grey borders, and high-contrast editorial accents.
  * **Earthy Organic & Terracotta:** Muted sage greens, warm clay terracottas, sand canvas, and olive badges.

* **Semantic Token Architecture (Theme-Adaptable):**
  * `background`: Primary viewport background (comfortable on eyes, tactile or sleek).
  * `surface` / `card`: Elevated container surface with clean contrast and subtle border.
  * `text-primary`: Primary headings, restaurant names, and key copy.
  * `text-secondary` / `text-muted`: Metadata, city names, review counts, and distances.
  * `accent-primary`: High-intent action buttons (Save Crumb, Reserve, Confirm).
  * `accent-secondary`: Highlighted badges, hero dish callouts, and creator tags.
  * `status-open` / `status-closed`: Real-time operating hour indicators.

### 3. Typography Hierarchy
* **Headlines / Display:** Modern Serif or Warm Geometric (e.g. *Playfair Display*, *Fraunces*, or *Plus Jakarta Sans*).
* **Body / UI Labels:** Apple SF Pro / SF Pro Rounded for crisp native iOS typography.

### 4. Card & Media Aesthetics
* **No Generic Bento Overuse:** Cards feel like editorial restaurant magazine clippings.
* **Hero Dish Badges:** Displayed over video thumbnail snapshot with dish name in bold.
* **Social Credit Badge:** Small overlay showing origin (*"Saved from @baliinsidertravel on Instagram"*).

---

## 6. Sitemap & Navigation Architecture

| View / Overlay | Purpose | Key UI Elements (SwiftUI & Liquid Glass) |
| :--- | :--- | :--- |
| **🧭 Living Map (Home)** | Clean Map + Discovery | Full-bleed MapKit, Floating Liquid Glass Island, "Decide Now", Draggable Sheet. |
| **🗺️ My Guides** | All Curated Lists | Grid of Guides (Local & Travel), Collaborative Shared Guides, `+ Create Guide`. |
| **📥 Inbox** | Raw Ingested Spots Queue | Uncategorized spots, Multi-select bulk tagging, "Add to Guide". |
| **📍 Spot Detail (Sheet)** | Full Restaurant Profile | Liquid glass header, Video thumbnail carousel, Creator quotes, Hero Dishes, Booking button. |

---

## 7. Next Steps for Design & Engineering

1. **For Designers / UI Agents:** Create high-fidelity Figma / SwiftUI mocks for:
   * (A) Native iOS Share Extension Modal (`ShareViewController` / SwiftUI) with Guide search.
   * (B) Home Screen (Clean Living MapKit + Floating Liquid Glass Control Island + Draggable Sheet).
   * (C) Guide View (Curated itinerary with route pins).
   * (D) Spot Detail Modal (Creator attribution + Hero dishes + booking buttons).
2. **For API / Backend:** Wire `POST /api/ingest` and database queries to support the iOS client endpoints.

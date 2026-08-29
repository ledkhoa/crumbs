# Design Specification: Guide Detail View & Itinerary

## 1. Overview & Visual Aesthetic
The Guide Detail View (`mobile/src/app/guides/[id].tsx`) is the central presentation surface for curated itineraries, food crawls, and tasting collections. It aligns with `mobile/DESIGN.md` (warm buttercream `#F7F4EF`, deep espresso canvas `#1E1915`, terracotta `#C45B3E`, pistachio `#7C9070`, Georgia serif display typography) and the high-fidelity mock in `mocks/crumbs-guide.png`.

---

## 2. Information Architecture & Layout Structure

```
┌──────────────────────────────────────────────────────────┐
│ [‹ Back]                              [Share] [••• Menu] │ ── Floating Glass Top Bar
├──────────────────────────────────────────────────────────┤
│                                                          │
│                     [🗺️ / 🍜 Emoji]                     │
│               "Bali Trip 2026" / "Soho"                 │ ── Hero Header Banner
│         12 crumbs · Soho & West Village · Private        │
│   "Low-lit wine bars, handmade pasta & late-night spots" │
│                                                          │
│     [📍 View on Map]  [➕ Add Crumbs]  [🔗 Share]        │ ── Primary Action Capsules
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│ [All Stops (12)]                 [Food Crawl Timeline]   │ ── Mode Segmented Control
├──────────────────────────────────────────────────────────┤
│  (1) ─── ┌─────────────────────────────────────────────┐ │
│   │      │ [Photo]  Mozaic Gastronomique         (>)   │ │
│   │      │          $$$ · Ubud · ● Open until 11 PM    │ │
│   │      │          [🍝 Must-Order: Truffle Duck Tagli] │ │
│   │      └─────────────────────────────────────────────┘ │
│   │                                                      │
│  (2) ─── ┌─────────────────────────────────────────────┐ │
│   │      │ [Photo]  Merlin's Magical Dining      (>)   │ │
│   │      │          $$ · Ubud · ● Closed · Opens 5 PM  │ │
│   │      │          [🍸 Must-Order: Smoked Tarot Negr]  │ │
│   │      └─────────────────────────────────────────────┘ │
│   │                                                      │
│  (3) ─── ┌─────────────────────────────────────────────┐ │
│          │ [Photo]  Kaja by Numa                 (>)   │ │
│          │          $$$ · Canggu · ● Open              │ │
│          │          [🥥 Must-Order: Coconut Ceviche]   │ │
│          └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Component Details & Interactive Behaviors

### A. Top Floating Navigation
- Left: Rounded glass back button (`‹`) with tactile tap haptics.
- Right:
  - `ShareIcon` button (triggers system share sheet).
  - `DotsThreeVerticalIcon` button (opens native modal / action sheet with Edit Guide, Export Tasting Menu, and Delete Guide).

### B. Hero Cover Header
- Displays guide emoji avatar (`emojiIcon`), title in `Georgia` serif font (`fontSize: 26, fontWeight: '700'`), metadata subtitle (`${count} crumbs · ${privacy}`), and description note.
- Three action pills:
  - `[ 📍 View on Map ]` (Terracotta primary button).
  - `[ ➕ Add Crumbs ]` (Pistachio/inputBackground secondary button).
  - `[ 🔗 Share Guide ]` (Outlined capsule).

### C. Sequential Timeline Stop Cards (`GuideCrumbCard`)
- Left spine: Vertical line (`Theme.colors.inputBorder`) with numbered circular badges (`(1)`, `(2)`, `(3)`...) using terracotta background and bold text.
- Card Body:
  - Left: 72x72 rounded square image thumbnail (`Theme.radii.md`).
  - Middle:
    - Restaurant name in Georgia serif (`fontSize: 16, fontWeight: '700'`).
    - Subtitle row: Price level + Neighborhood + Live Open Status dot & text (using `getRestaurantOpenStatus`).
    - Hero Dish Pill: `The Must-Order: ${effectiveHeroDish}` in soft coral/buttercream badge.
    - Course category tag: `Apéritif`, `Main Course`, `Dessert`, etc.
  - Right: Chevron (`›`) for detail navigation or quick remove button (`✕`).
- Interactions:
  - Tap card: Navigates to `/crumbs/[id]`.
  - Swipe to remove: Smooth swipe gesture revealing destructive remove action.

### D. Multi-Select Add Crumbs Modal (`AddCrumbsToGuideModal`)
- Bottom sheet / modal displaying all saved crumbs in the user's library with search filter.
- Checkboxes for selecting multiple crumbs.
- Sticky bottom `[ Add (N) Crumbs to Guide ]` CTA button with instant cache invalidation.

### E. Edit Guide Modal (`EditGuideModal`)
- Modal pre-populated with guide title, description, emoji selector, and public/private toggle.

# Crumbs Mobile Design System & UX Specification

## Overview

This document defines the visual, interaction, and implementation principles for **Crumbs** across iOS and Android.

Crumbs is an opinionated, visual food, vibe, and place-discovery platform ("Spotify for Cravings") centered around saved spots ("crumbs"), curated guides, interactive maps, and frictionless social capture.

The product identity is defined by:

- **Warm, appetizing editorial palette**: Buttercream/Warm Linen surfaces (`#F7F4EF`), Deep Espresso canvas (`#1E1915`), Terracotta brand action (`#C45B3E`), Charcoal text (`#1A1715`), Sage/Pistachio accents (`#7C9070`), and Warm Gold (`#DFB064`).
- **Editorial typography**: Elegant serif display typography (`Georgia` on iOS, `serif` on Android) paired with clean platform sans-serif UI typography.
- **Rounded cards & tactile ergonomics**: Translucent bottom sheets, grab handles, and thumb-friendly bottom controls.
- **Content-first visual hierarchy**: Food photography and video snapshots act as primary hero elements with hero dish overlays.
- **Platform-native expression**: iOS leverages Apple Liquid Glass / Ultra-Thin Material Blur, SF Symbols, and continuous sheet gestures. Android leverages Material 3 tonal surfaces, elevation, Material iconography, and predictive back gestures.

The app is built with **Expo SDK 57 / React Native**, sharing design tokens and business logic while rendering platform-idiomatic UI chrome and interactions.

---

# 1. Core Design Principle

## Shared brand, platform-native expression

Do **not** attempt to make iOS and Android visually identical.

> **The brand stays consistent. The operating system speaks its own visual language.**

### Shared Across Platforms

- Brand colors and semantic token definitions
- Content hierarchy & information architecture
- Editorial serif display typography
- Hero dish pills, vibe tags, and creator provenance badges
- 4pt spacing scale & radius philosophy
- Voice, tone, and editorial copywriting
- Form validation, state management, and business logic

### Platform-Specific Expression

#### iOS

- **Liquid Glass**: Translucent surfaces using `.ultraThinMaterial` / native blur with specular 1px border highlights
- **Floating Controls**: Floating glass control capsule in the thumb zone
- **Continuous Curves**: Smooth sheet detents (`.sheet` radius: 36pt)
- **Iconography**: SF Symbols via `expo-symbols`
- **Feedback**: Subtle iOS haptics (`expo-haptics`)

#### Android

- **Material 3 Surfaces**: Tonal elevation and container hierarchy (`SurfaceContainer`, `SurfaceContainerHigh`)
- **Feedback**: Material state layers and touch ripples
- **Navigation**: Material 3 NavigationBar and ModalBottomSheet
- **Iconography**: Material Symbols
- **System Conventions**: Predictive back navigation, standard elevation shadows

---

# 2. Visual Personality

The visual identity should feel:

**Warm · Editorial · Appetizing · Curious · Premium · Cinematic · Human**

It should **never** feel:

**Corporate · Generic SaaS · Neon / Techy · Cold · Over-Decorated · Glass-on-Everything**

The interface feels like a high-end culinary travel magazine brought to life with snappy, interactive touchpoints.

---

# 3. Color System & Semantic Tokens

All color references in code **must** use semantic tokens from `@/theme/tokens`. Never hardcode raw hex or `rgba(...)` values directly in components or stylesheets.

## Tokens Reference (`mobile/src/theme/tokens.ts`)

```ts
export const Theme = {
  colors: {
    // Primary Action (Terracotta)
    primary: '#C45B3E',
    primaryPressed: '#A84B31',
    primaryLight: '#E89078',
    onPrimary: '#FFFFFF',

    // Backgrounds & Surfaces (Buttercream & Espresso)
    background: '#F7F4EF',
    canvas: '#1E1915',
    cardBackground: 'rgba(247, 244, 239, 0.85)',
    inputBackground: 'rgba(242, 236, 228, 0.75)',
    inputBorder: 'rgba(216, 207, 196, 0.8)',

    // Translucent overlays & Glass effects
    cardBorder: 'rgba(255, 255, 255, 0.4)',
    grabHandle: 'rgba(255, 255, 255, 0.8)',

    // Typography
    text: '#1A1715',
    textMuted: '#736B63',
    textSubtle: '#9E958C',

    // Social Auth
    appleButton: '#1C1917',
    googleButton: '#F7F4EF',
    googleBorder: '#DDD5CA',

    // Semantic Accents
    success: '#7C9070',
    accent: '#DFB064',
    error: '#DC2626',
    errorBackground: 'rgba(220, 38, 38, 0.1)',
    errorBorder: 'rgba(220, 38, 38, 0.2)',

    // Utilities
    shadow: '#000000',
  },
};
```

## Surface Hierarchy by Platform

- **iOS**: Canvas (`Theme.colors.canvas`) $\rightarrow$ Frosted Card (`Theme.colors.cardBackground` with `Theme.colors.cardBorder`) $\rightarrow$ Inset Input (`Theme.colors.inputBackground`).
- **Android**: Canvas $\rightarrow$ Tonal Material Surface $\rightarrow$ Inset Input with state borders and ripple.

---

# 4. Typography

Typography combines an elegant serif display face for hero moments with a clean platform sans-serif for high-legibility interface elements.

## Typography Roles

| Role                | Font Family (iOS / Android)          | Use Case                                                    |
| :------------------ | :----------------------------------- | :---------------------------------------------------------- |
| **Display / Title** | `Georgia` (iOS) / `serif` (Android)  | Logo wordmark, screen titles, spot hero titles, guide names |
| **Heading**         | System Sans-serif (Bold / Semi-bold) | Section headers, card titles, modal headlines               |
| **Body**            | System Sans-serif (Regular / 400)    | Notes, descriptions, form inputs, primary actions           |
| **Caption / Label** | System Sans-serif (Medium / 500)     | Vibe tags, timestamps, distance indicators, error messages  |

Dynamic Type and Android font scaling must be supported. Never lock critical labels to rigid clipping containers.

---

# 5. Spacing Scale

Based on a strict 4pt / 8pt spatial grid:

```ts
export const spacing = {
  xs: 4, // Micro gaps, icon-to-text spacing
  sm: 8, // Element padding, compact chip gaps
  md: 16, // Standard card padding, input vertical padding
  lg: 24, // Screen margins, section gaps
  xl: 32, // Header-to-content spacing, brand hero margins
  xxl: 40, // Large separation, bottom card clearance
};
```

Preferred screen horizontal margin is `spacing.lg` (24pt) or `spacing.md` (16pt) on compact viewports.

---

# 6. Corner Radius Scale

Soft, organic geometry matching the tactile character of the brand:

```ts
export const radii = {
  sm: 8, // Small pills, tags, inner inputs
  md: 14, // Input fields, alert banners
  lg: 18, // Action buttons, standard place cards
  xl: 24, // Guide cover cards, hero containers
  sheet: 36, // Modal bottom sheets, draggable bottom cards
  pill: 999, // Grab handles, filter capsules, circular badges
};
```

---

# 7. Core UI Components & Patterns

## 1. Buttons

### Primary CTA (Terracotta)

- Background: `Theme.colors.primary` (`#C45B3E`), pressed: `Theme.colors.primaryPressed` (`#A84B31`)
- Label: `Theme.colors.onPrimary` (`#FFFFFF`), 16pt semi-bold
- Height: 52pt, Radius: `Theme.radii.lg` (18pt)
- Haptic feedback on press (`Haptics.NotificationFeedbackType.Success` or `Haptics.selectionAsync()`)
- Activity indicator inherits `Theme.colors.onPrimary`

### Secondary / Outlined Button

- Background: `transparent` or `Theme.colors.background`
- Border: 1px solid `Theme.colors.inputBorder`
- Label: `Theme.colors.text`

---

## 2. Inputs & Form Fields

- Height: 48–52pt, Radius: `Theme.radii.lg` (18pt)
- Background: `Theme.colors.inputBackground`
- Border: 1px `Theme.colors.inputBorder` (transitions to 2px `Theme.colors.primary` on focus)
- Placeholder: `Theme.colors.textMuted`
- Text: `Theme.colors.text`
- Leading emoji/icon + optional trailing toggle (e.g. password visibility `👁️`/`🙈`)

---

## 3. The Crumb Card (Saved Spot)

- **Hero Aspect**: 16:9 or 4:3 food/venue photography
- **Hero Dish Badge**: Pill overlaid on photo (_"The Must-Order: Truffle Gnocchi"_) using `Theme.colors.cardBackground`
- **Social Credit**: Creator attribution badge (_"Saved from @nycfoodie"_)
- **Metadata**: Restaurant name (Serif), neighborhood, status pill (`Open until 11 PM` in `Theme.colors.success`), vibe tags
- **Action Row**: One-tap transactional buttons (`[ 🍷 Book on Resy ]`, `[ 🍽️ Book on OpenTable ]`, `[ 🗺️ Open in Maps ]`)

---

## 4. Draggable Bottom Sheet & Living Map

- **Map Canvas**: Warm cartography styled to blend with the Linen/Buttercream palette
- **Sheet**: Translucent bottom sheet with `Theme.radii.sheet` (36pt) top corners and a tactile pill grab handle (`Theme.colors.grabHandle`)
- **Ergonomics**: Floating control capsule in the bottom thumb zone for search (`🔍`), location switcher (`📍 Soho ▾`), and decision engine (`🎲 Decide For Me`)

---

## 5. Auth Experience (Sign In / Sign Up)

- **Backdrop**: Deep espresso canvas (`Theme.colors.canvas`) with Crumbs bread icon (`🍞`) and serif brand wordmark
- **Card**: Bottom-anchored glass card (`Theme.colors.cardBackground`) with grab handle and serif header
- **Validation**: TanStack Form + Zod v4 with inline error alerts styled via `Theme.colors.errorBackground` and `Theme.colors.errorBorder`

---

# 8. Platform Adaptation Matrix

| Feature / Element      | iOS                                                               | Android                                        |
| :--------------------- | :---------------------------------------------------------------- | :--------------------------------------------- |
| **Surfaces**           | Liquid Glass (`expo-glass-effect` / `expo-blur`)                  | Material 3 Tonal Elevation                     |
| **Tabs**               | `NativeTabs` (`expo-router/unstable-native-tabs`) with SF Symbols | `NativeTabs` with Material Icons               |
| **Haptics / Feedback** | `expo-haptics` impact & notification feedback                     | Material touch ripple & state layer            |
| **Bottom Sheets**      | UIKit presentation detents (`.height`, `.medium`, `.large`)       | Material `ModalBottomSheet`                    |
| **Display Font**       | `Georgia`                                                         | `serif`                                        |
| **Back Action**        | Interactive edge swipe gesture                                    | Predictive back gesture + hardware back button |

---

# 9. Engineering & Developer Checklist

Before completing any mobile screen or component:

- [ ] **Zero Hardcoded Colors**: Every color is referenced via `Theme.colors.*` from `@/theme/tokens`.
- [ ] **Semantic Tokens**: Spacing uses `Theme.spacing.*` and radii use `Theme.radii.*`.
- [ ] **Platform Native**: Tested on iOS and Android viewports without awkward UI clones.
- [ ] **Safe Areas**: All floating bars and bottom sheets respect `useSafeAreaInsets()`.
- [ ] **Accessibility**: Touch targets $\ge 44 \times 44\text{pt}$ (iOS) / $\ge 48 \times 48\text{dp}$ (Android), with accessible labels.
- [ ] **Form Validation**: Handled through TanStack Form with clear inline errors.
- [ ] **Static Analysis**: Passes `bun run check` (`tsc --noEmit && oxlint . && prettier . --check`).

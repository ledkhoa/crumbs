# Crumbs Global Development Guidelines

This document defines the universal coding principles, mistake logs, and quality standards for all codebases in the Crumbs monorepo (`api/`, `mobile/`, `docs/`, `poc/`).

---

## Sub-Project Domain Guidelines

In addition to these global rules, always consult and follow the domain-specific guidelines when working within each package:

- **Backend / Workers API**: [`api/agents.md`](file:///Users/khoa/Documents/crumbs/api/agents.md) — Cloudflare Workers, Hono, Drizzle ORM, BetterAuth, Apify, and AI pipelines.
- **Mobile App (React Native & Expo)**: [`mobile/AGENTS.md`](file:///Users/khoa/Documents/crumbs/mobile/AGENTS.md) — Expo v57+, Expo Router, Reanimated, and UI standards.

---

## Global Agent Rules

1. **Response Signature**: End every response with `"Bob's your uncle"`.
2. **Git Commit Discipline**: **Never** run `git commit` automatically unless the user explicitly gives instructions to commit.
3. **Format & Static Analysis Enforcement**:
   - **Always** run Prettier formatting and the linter/typecheck after every code change before concluding a task:
     ```bash
     bun run format && bun run check
     ```
4. **Failure & Mistake Tracking**:
   - Whenever the user corrects you or points out a mistake/oversight, **immediately** log the incident in the **Mistakes & Failure Log** below (recording Date, Mistake, and Root Cause / Correct Rule).
   - Review this log before every task to ensure you never repeat past mistakes.
5. **Dead & Cold Code Elimination**:
   - **Always** delete superseded, orphaned, unused, or cold code, components, files, and types when refactoring or implementing features. Never leave lingering, unused, or commented-out code in the codebase.

---

## Mistakes & Failure Log

| Date       | Mistake / Issue                                                                         | Root Cause & Prevention Rule                                                                                                                                                                                        |
| :--------- | :-------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-08-15 | Attempted to auto-run `git commit` without explicit request                             | Never run `git commit` automatically unless the user explicitly asks to commit changes.                                                                                                                             |
| 2026-08-21 | Hardcoded specific third-party library names into product & design docs prematurely     | Keep high-level architecture docs platform-agnostic; avoid hardcoding specific npm/third-party package names until docs are provided.                                                                               |
| 2026-08-21 | Used RN Modal instead of `@expo/ui` BottomSheet and standard `KeyboardAvoidingView`     | Always use `@expo/ui` `BottomSheet` for bottom sheets and `react-native-keyboard-controller` (`KeyboardAwareScrollView`) for all keyboard-managed views.                                                            |
| 2026-08-22 | Used "spot" / "spots" in UI copy instead of canonical product terminology "crumbs"      | Always verify UI copy, entity naming, and user-facing text against `docs/app_terminology.md`. Saved dining places are strictly called **crumbs** (never "spots").                                                   |
| 2026-08-22 | Imported `@react-navigation/native` (`useFocusEffect`) in Expo SDK 57 / Expo Router v57 | As of Expo SDK 56+, Expo Router is incompatible with direct `@react-navigation/native` imports. Always import navigation hooks (`useFocusEffect`, `useRouter`, `useLocalSearchParams`) strictly from `expo-router`. |
| 2026-08-28 | Inconsistent modal button layouts & solid red/terracotta buttons causing color-blind confusion | Standardize all modal action bars to side-by-side `[Cancel (flex:1)]` `[Save/Submit (flex:2)]`, use uniform `Switch` styling (`Theme.colors.switchTrackOff`), and style destructive delete actions as separated ghost/outline buttons with danger text/icons rather than solid filled buttons. |
| 2026-08-29 | Relied on static StyleSheet.create for theming and attempted nested modal presentation | In React Native, static `StyleSheet.create` only evaluates once at boot time; always use `useTheme()` for dynamic colors. Never stack modal sheets on top of active modal sheets in iOS UIKit; switch views within the same modal container. |
| 2026-08-29 | Configured iOS permissions in `app.json` only, causing missing `NSLocationWhenInUseUsageDescription` in prebuilt native project | When native directories (`ios/` / `android/`) already exist in the repository, permissions and metadata must be added directly to `ios/<AppName>/Info.plist` and `android/app/src/main/AndroidManifest.xml` in addition to `app.json`. |
| 2026-08-29 | Permissive overnight shift check (`closeMin >= 60`) in `isRestaurantOpenAtMoment` caused 2 AM bars to qualify for morning breakfast | An overnight shift starting yesterday only overlaps with morning if `closeMin > 420` (7:00 AM). Always verify shift boundaries against the specific moment's `slotStart` and resolve auto-selected dining moments in the restaurant/crumbs' local timezone. |

---

## Universal Code Standards

- **Dynamic System Theming (Dark & Light Mode)**:
  - **Dynamic Theme Hooks**: In React Native, static `StyleSheet.create` evaluates once at module boot time. Any color-dependent property (backgrounds, borders, text, icons, modals, and navigation stacks) must dynamically bind to `colors` from `useTheme()`.
  - **Root Navigator Canvas**: Always configure `contentStyle: { backgroundColor: colors.background }` on the root Stack navigator so view transitions and loading skeletons never flash default light backgrounds.
  - **Single Modal Container Rule**: iOS UIKit prohibits presenting a second `pageSheet` `<Modal>` on top of an active modal. Always transition internal view state (`viewMode: 'picker' | 'create'`) inside the same modal sheet.

- **UI Accessibility & Form Modal Consistency**:
  - Modal form action rows must strictly follow the standard layout: side-by-side `Cancel` (secondary / outline, `flex: 1`) and `Submit/Save` (primary, `flex: 2`).
  - **Color-Blindness & Destructive Action Safety**: Never place two solid-filled warm buttons (e.g. terracotta `#C45B3E` primary and red `#DC2626` destructive) adjacent or stacked. Destructive actions (like Delete) in edit sheets must be styled as distinct ghost/text buttons with a trash icon and separated below the primary action row.
  - All form `Switch` rows must use the identical unboxed layout with `Theme.colors.switchTrackOff` and platform-adaptive thumb colors.

- **App Terminology & Glossary Discipline**:
  - Always verify UI copy, model field names, and user-facing text against [`docs/app_terminology.md`](file:///Users/khoa/Documents/crumbs/docs/app_terminology.md).
  - Saved dining establishments are strictly called **crumbs** (singular: _crumb_, plural: _crumbs_). Collections are called **guides**. The interactive map is the **Cravings Map** / **Crumb Trail**. Never use "spot" or "spots" in user-facing UI.

- **Comments Philosophy (Explain the WHY, Not the WHAT or HOW)**:
  - Code must be clear, idiomatic, and self-documenting. Never add comments that simply restate what the code does.
  - Reserve comments exclusively for the **WHY**: non-obvious business rationale, third-party API quirks/workarounds, edge case handling, or architectural trade-offs.
  - Do not hardcode specific third-party model names or versions in comments/logs that can become stale.
- **Type Safety & Native Inference**:
  - Rely on TypeScript's native return type inference from async callbacks and functions.
  - Avoid redundant manual type casting (`as SomeType`) when types are already preserved.
- **Aggressive Dead Code Elimination**:
  - Whenever a component, helper, or feature is unified, superseded, or refactored, immediately delete the old source files, unreferenced exports, and orphaned assets.
  - Do not retain deprecated variants or unmounted placeholder branches "just in case". Git history is the archive.
- **Automated Verification**:
  - Run `bun run check` (`tsc --noEmit && oxlint . && prettier . --check`) after every modification.

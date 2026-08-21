# Mobile Agent Rules (React Native & Expo)

## Design Specification

Consult [`mobile/DESIGN.md`](./DESIGN.md) for all design system guidelines, UI tokens, platform-native conventions (iOS vs Android), and screen layout specifications.

## Stack

- **Runtime**: Expo SDK 57+, Expo Router v57 (file-based routing with typed routes)
- **Styling**: React Native `StyleSheet.create` — no external CSS-in-JS libs
- **State**: Zustand (persisted via MMKV) for client state; TanStack Query v5 for server state
- **Forms**: TanStack Form + Zod v4 validation
- **Animations**: React Native Reanimated v4
- **Target Platforms**: iOS (primary), Android (secondary)

## Conventions

- Use functional components with hooks.
- Prefer `StyleSheet.create` at the bottom of the file.
- Keep screens thin; extract business logic into `src/hooks/` or `src/utils/`.
- Use `@/` path alias for all imports (`@/components/...`, `@/theme/...`, `@/utils/...`, etc.).

## Theme & Token Enforcement

- **No hardcoded colors**: Never write raw hex (`#FFF`, `#1E1915`), `rgba(...)`, or named CSS colors directly in components or stylesheets. Always reference `Theme.colors.*` from `@/theme/tokens`.
- **Semantic token names**: Color tokens must use role-based names (`primary`, `text`, `textMuted`, `onPrimary`, `canvas`, etc.) per `mobile/DESIGN.md`.
- **Single source of truth**: All color values live exclusively in `src/theme/tokens.ts`.
- **Spacing & radii**: Always use `Theme.spacing.*` and `Theme.radii.*` tokens. Avoid magic numbers for padding, margin, gap, and border radius.

## Cross-Platform

- Prefer platform-native behaviors: SF Symbols on iOS, Material Icons on Android via `expo-symbols`.
- Use `Platform.OS` checks only where platform behavior genuinely diverges (e.g., `KeyboardAvoidingView` behavior, serif display font).
- Use `expo-haptics` for tactile feedback on user actions.

## Expo Version Notice

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

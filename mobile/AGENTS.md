# Mobile Agent Rules (React Native & Expo)

## Design Specification

Consult [`mobile/DESIGN.md`](./DESIGN.md) for all design system guidelines, UI tokens, platform-native conventions (iOS vs Android), and screen layout specifications.

## Stack

- **Runtime**: Expo SDK 57+, Expo Router v57 (file-based routing with typed routes)
- **Native UI Primitives**: `@expo/ui` (Universal, SwiftUI, Jetpack Compose)
- **Keyboard Management**: `react-native-keyboard-controller` (`KeyboardProvider`, `KeyboardAwareScrollView`, `KeyboardStickyView`)
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

## Keyboard Management Protocol (react-native-keyboard-controller)

**All keyboard handling across the mobile app must use `react-native-keyboard-controller`**:

1. **Root Provider**: Ensure `<KeyboardProvider>` wraps the entire application at `src/app/_layout.tsx`.
2. **Always-Visible Focused Inputs**:
   - **Never** use default React Native `KeyboardAvoidingView` or plain `ScrollView` for forms/inputs.
   - **Always** use `KeyboardAwareScrollView` from `react-native-keyboard-controller` so that the currently focused `TextInput` remains smoothly and automatically visible above the software keyboard on both iOS and Android.
3. **Interactive & Animated Inputs**:
   - Use `bottomOffset` / `extraKeyboardSpace` props on `KeyboardAwareScrollView` to prevent keyboard collisions with sticky toolbars or tab bars.
   - For bottom-anchored action bars or submit buttons that must track keyboard movement 1:1, use `KeyboardStickyView` or `useReanimatedKeyboardAnimation`.

## Native UI & Documentation Protocol (@expo/ui)

**Always prefer `@expo/ui` native primitives** over writing custom native bridge code or installing heavy third-party community modules:

1. **Component Tiers**:
   - **Universal (`@expo/ui`)**: Cross-platform primitives (`BottomSheet`, `Button`, `Checkbox`, `Collapsible`, `FieldGroup`, `Icon`, `List`, `Picker`, `Switch`, `TextInput`, `Slider`).
   - **Modal Sheets & Overlays**: For rich React Native interactive forms, use `presentationStyle="pageSheet"` with `Modal` (or `@expo/ui/community/bottom-sheet`) paired with `KeyboardAwareScrollView` to ensure 100% theme background coverage and unobstructed touch responders on all buttons and inputs.
   - **SwiftUI (`@expo/ui/swift-ui`)**: iOS native SwiftUI primitives (`ContextMenu`, `SwipeActions`, `Menu`, `Form`, `Section`, `Popover`, `Gauge`, `VStack`, `HStack`, `ZStack`).
   - **Jetpack Compose (`@expo/ui/jetpack-compose`)**: Android native Material 3 primitives (`ModalBottomSheet`, `AlertDialog`, `FloatingActionButton`, `NavigationBar`, `PullToRefreshBox`, `Surface`, `Chip`, `Snackbar`).

2. **Fetching Expo Documentation (Agent Instruction)**:
   - **Never guess API props** for Expo SDK 57+ components.
   - All Expo documentation is available directly as Markdown by appending `.md` to the URL.
   - **Main UI Index**: [`https://docs.expo.dev/versions/latest/sdk/ui.md`](https://docs.expo.dev/versions/latest/sdk/ui.md)
   - **Universal Docs**: `https://docs.expo.dev/versions/latest/sdk/ui/universal/<component>.md` (e.g. `bottomsheet.md`, `picker.md`)
   - **SwiftUI Docs**: `https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/<component>.md` (e.g. `contextmenu.md`, `swipeactions.md`)
   - **Jetpack Compose Docs**: `https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/<component>.md` (e.g. `bottomsheet.md`, `alertdialog.md`)
   - **Full Sitemap**: [`https://docs.expo.dev/llms.txt`](https://docs.expo.dev/llms.txt)
   - When introducing or editing an `@expo/ui` or Expo SDK component, always fetch and read the exact `.md` documentation beforehand using `read_url_content`.

## Theme & Token Enforcement

- **No hardcoded colors**: Never write raw hex (`#FFF`, `#1E1915`), `rgba(...)`, or named CSS colors directly in components or stylesheets. Always reference `Theme.colors.*` from `@/theme/tokens`.
- **Semantic token names**: Color tokens must use role-based names (`primary`, `text`, `textMuted`, `onPrimary`, `canvas`, etc.) per `mobile/DESIGN.md`.
- **Single source of truth**: All color values live exclusively in `src/theme/tokens.ts`.
- **Spacing & radii**: Always use `Theme.spacing.*` and `Theme.radii.*` tokens. Avoid magic numbers for padding, margin, gap, and border radius.

## Mandatory Haptic Feedback Pattern

**Every user interaction implemented in the mobile app must trigger appropriate tactile feedback** using `@/utils/haptics`:

| Trigger / Action          | Method                | When to Use                                                                                                   |
| :------------------------ | :-------------------- | :------------------------------------------------------------------------------------------------------------ |
| **Standard Tap**          | `haptics.tap()`       | Tapping cards, chips, secondary buttons, filters, list items, icon buttons                                    |
| **Primary Action**        | `haptics.primary()`   | Pressing high-intent primary CTA buttons (`[ Save Crumb ]`, `[ Create Guide ]`, `[ Book ]`, `[ Decide Now ]`) |
| **Destructive Action**    | `haptics.heavy()`     | Confirming deletions, removing spots, signing out                                                             |
| **Discrete Selection**    | `haptics.selection()` | Tab switching, checkbox/switch toggles, emoji pickers, segmented controls                                     |
| **Async Success**         | `haptics.success()`   | Successful API completion (guide created, spot saved, authenticated)                                          |
| **Async Error / Failure** | `haptics.error()`     | Validation errors, network failures, auth rejection                                                           |
| **Warning / Prompt**      | `haptics.warning()`   | Alert dialogs, unsaved changes confirmation                                                                   |

## Cross-Platform

- Prefer platform-native behaviors: SF Symbols on iOS, Material Icons on Android via `expo-symbols` or `@expo/ui` `Icon`.
- Use `Platform.OS` checks only where platform behavior genuinely diverges (e.g., serif display font).

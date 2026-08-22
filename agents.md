# Crumbs Global Development Guidelines

This document defines the universal coding principles, mistake logs, and quality standards for all codebases in the Crumbs monorepo (`api/`, `mobile/`, `docs/`, `poc/`).

---

## Sub-Project Domain Guidelines

In addition to these global rules, always consult and follow the domain-specific guidelines when working within each package:

* **Backend / Workers API**: [`api/agents.md`](file:///Users/khoa/Documents/crumbs/api/agents.md) — Cloudflare Workers, Hono, Drizzle ORM, BetterAuth, Apify, and AI pipelines.
* **Mobile App (React Native & Expo)**: [`mobile/AGENTS.md`](file:///Users/khoa/Documents/crumbs/mobile/AGENTS.md) — Expo v57+, Expo Router, Reanimated, and UI standards.

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

---

## Mistakes & Failure Log

| Date       | Mistake / Issue                                                                    | Root Cause & Prevention Rule                                                                                                            |
| :--------- | :--------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-15 | Attempted to auto-run `git commit` without explicit request                         | Never run `git commit` automatically unless the user explicitly asks to commit changes.                                                 |
| 2026-08-21 | Hardcoded specific third-party library names into product & design docs prematurely | Keep high-level architecture docs platform-agnostic; avoid hardcoding specific npm/third-party package names until docs are provided. |
| 2026-08-21 | Used RN Modal instead of `@expo/ui` BottomSheet and standard `KeyboardAvoidingView` | Always use `@expo/ui` `BottomSheet` for bottom sheets and `react-native-keyboard-controller` (`KeyboardAwareScrollView`) for all keyboard-managed views. |

---

## Universal Code Standards

- **Comments Philosophy (Explain the WHY, Not the WHAT or HOW)**:
  - Code must be clear, idiomatic, and self-documenting. Never add comments that simply restate what the code does.
  - Reserve comments exclusively for the **WHY**: non-obvious business rationale, third-party API quirks/workarounds, edge case handling, or architectural trade-offs.
  - Do not hardcode specific third-party model names or versions in comments/logs that can become stale.
- **Type Safety & Native Inference**:
  - Rely on TypeScript's native return type inference from async callbacks and functions.
  - Avoid redundant manual type casting (`as SomeType`) when types are already preserved.
- **Automated Verification**:
  - Run `bun run check` (`tsc --noEmit && oxlint . && prettier . --check`) after every modification.

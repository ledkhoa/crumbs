# Test Results: Guide Detail View & Itinerary System

## 1. Automated Test Suites

### A. Backend API (`api/`)
```bash
bun run check && bun test src
```
- **Total Test Suites**: 9 files
- **Total Tests**: 62 passing (0 failing)
- **Coverage Highlights**:
  - `guides.route.test.ts`:
    - `GET /guides` rejection when unauthenticated: ✅ PASSED
    - `POST /guides` rejection when unauthenticated: ✅ PASSED
    - `GET /guides/:id` rejection when unauthenticated: ✅ PASSED
    - `POST /guides/:id/crumbs` rejection when unauthenticated: ✅ PASSED
    - `PATCH /guides/:id` rejection when unauthenticated: ✅ PASSED
    - `DELETE /guides/:id` rejection when unauthenticated: ✅ PASSED
    - `DELETE /guides/:id/crumbs/:crumbId` rejection when unauthenticated: ✅ PASSED
    - `PUT /guides/:id/reorder` rejection when unauthenticated: ✅ PASSED
  - `places.service.test.ts`: 19 tests passing: ✅ PASSED
  - `crumbs.logic.test.ts`: 9 tests passing: ✅ PASSED
- **Static Analysis & Formatting**:
  - `tsc --noEmit`: 0 errors
  - `oxlint .`: 0 errors
  - `prettier . --check`: All files formatted cleanly.

---

### B. Mobile Frontend (`mobile/`)
```bash
bun run check && bun test src
```
- **Total Test Suites**: 5 files
- **Total Tests**: 40 passing (0 failing)
- **Coverage Highlights**:
  - `opening-hours.test.ts`: 8 tests passing (timezone offsets, overnight shifts, 24/7): ✅ PASSED
  - `maps.test.ts`: 5 tests passing (iOS, Android, coordinate parameters): ✅ PASSED
  - `price.test.ts`: 5 tests passing: ✅ PASSED
  - `social-url.test.ts`: 18 tests passing: ✅ PASSED
  - `unread.test.ts`: 4 tests passing: ✅ PASSED
- **Static Analysis & Formatting**:
  - `tsc --noEmit`: 0 errors
  - `oxlint .`: 0 anti-slop or lint errors
  - `prettier . --check`: All files formatted cleanly.

---

## 2. Verdict
All automated test suites, TypeScript compiler checks, and Oxlint anti-slop rules passed with 0 errors.

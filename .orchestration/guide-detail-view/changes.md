# Summary of Changes: Guide Detail View & Itinerary System

## 1. Backend (`api/src/modules/guides/`)
- **`guides.types.ts`**:
  - Added `UpdateGuideInput` interface supporting partial updates for `name`, `description`, `emojiIcon`, `coverImageUrl`, and `isPublic`.
- **`guides.repository.ts`**:
  - Added `update(db, guideId, userId, data)`: updates guide metadata.
  - Added `delete(db, guideId, userId)`: deletes guide record.
  - Added `removeCrumb(db, guideId, crumbId, userId)`: deletes junction record in `guide_crumbs`.
  - Added `reorderCrumbs(db, guideId, crumbIds, userId)`: updates `orderIndex` for a list of crumbs.
- **`guides.route.ts`**:
  - Added `updateGuideSchema` and `reorderGuideSchema` Zod validation schemas.
  - Added `PATCH /guides/:id`: updates guide details.
  - Added `DELETE /guides/:id`: deletes guide.
  - Added `DELETE /guides/:id/crumbs/:crumbId`: removes a crumb from a guide.
  - Added `PUT /guides/:id/reorder`: reorders crumbs.
- **`guides.route.test.ts`**:
  - Added unit test coverage validating authentication requirements across all 4 new endpoints (62 passing tests).

---

## 2. Mobile Frontend (`mobile/src/`)
- **`hooks/useGuides.ts`**:
  - Added `useUpdateGuideMutation()` with cache invalidation on `guides.all` and `guides.detail(id)`.
  - Added `useDeleteGuideMutation()` with cache invalidation on `guides.all`.
  - Added `useRemoveCrumbFromGuideMutation()` with cache invalidation on `guides.all`, `guides.detail(id)`, and `crumbs.all`.
  - Added `useReorderGuideCrumbsMutation()`.
- **`components/guides/GuideCrumbCard.tsx`**:
  - Created sequential timeline stop card with numbered milestone badges `(1)`, restaurant thumbnail, `Georgia` serif title, price/neighborhood metadata, live timezone-aware Open Status dot, The Must-Order hero dish pill, and course category pill.
- **`components/guides/EditGuideModal.tsx`**:
  - Created modal with emoji icon selector, guide title input, description textarea, public/private toggle, and delete guide confirmation.
- **`components/guides/AddCrumbsToGuideModal.tsx`**:
  - Created multi-select modal sheet for batch adding existing saved crumbs into the current guide with instant search filtering.
- **`app/guides/[id].tsx`**:
  - Created the full Guide Detail Screen featuring:
    - Top floating glass navigation bar with back button, native share sheet, and action menu.
    - Hero header with emoji avatar, title, metadata pills, and description.
    - Action capsules: `[ 📍 View on Map ]` and `[ ➕ Add Crumbs ]`.
    - Mode selector: `All Stops` vs `Food Crawl Timeline` (Apéritif $\rightarrow$ Main $\rightarrow$ Dessert).
    - Sequential timeline stops with remove and navigation interactions.
    - Skeleton loader and error/empty states.
- **`app/(tabs)/guides/index.tsx`**:
  - Wired `handleSelectGuide` to navigate to `/guides/[id]`.
- **`app/_layout.tsx`**:
  - Registered `guides/[id]` in the root `Stack` navigator with `slide_from_right` animation.

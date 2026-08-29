# Technical Specification: Guide Detail View & Itinerary

## 1. Overview
This specification details the backend and mobile engineering requirements to build the **Guide Detail View** (`mobile/src/app/guides/[id].tsx`), supporting CRUD endpoints in `api/src/modules/guides/`, and React Native state management.

---

## 2. API Contract & Database Operations

### A. Endpoints in `api/src/modules/guides/guides.route.ts`

1. **`GET /guides/:id`** (Existing & Verified)
   - Resolves guide record, checks authorization (`userId === user.id` or `isPublic === true`).
   - Fetches and sorts `guide_crumbs` by `orderIndex ASC`.
   - Resolves 3-tier effective hero dishes and post attributions.

2. **`PATCH /guides/:id`** (NEW)
   - Schema:
     ```ts
     const updateGuideSchema = z.object({
       name: z.string().min(1).max(255).optional(),
       description: z.string().max(1000).optional().nullable(),
       emojiIcon: z.string().max(32).optional(),
       coverImageUrl: z.url().optional().nullable(),
       isPublic: z.boolean().optional(),
     });
     ```
   - Updates `Guides` table where `id = guideId AND userId = user.id`.
   - Returns updated guide payload.

3. **`DELETE /guides/:id`** (NEW)
   - Deletes from `Guides` where `id = guideId AND userId = user.id`.
   - Foreign key constraint on `guide_crumbs.guideId` with `ON DELETE CASCADE` automatically removes junctions.
   - Returns `{ success: true, message: 'Guide deleted successfully' }`.

4. **`DELETE /guides/:id/crumbs/:crumbId`** (NEW)
   - Deletes from `GuideCrumbs` where `guideId = guideId AND crumbId = crumbId`.
   - Checks guide ownership (`guide.userId === user.id`).
   - Returns `{ success: true, message: 'Crumb removed from guide' }`.

5. **`PUT /guides/:id/reorder`** (NEW)
   - Schema:
     ```ts
     const reorderSchema = z.object({
       crumbIds: z.array(z.string()).min(1),
     });
     ```
   - Iterates through `crumbIds` and updates `orderIndex = index` in `GuideCrumbs`.
   - Returns `{ success: true }`.

---

## 3. Frontend Architecture (`mobile/src/`)

### A. Query Hooks in `mobile/src/hooks/useGuides.ts`
- `useGuideDetailQuery(guideId: string)`
- `useUpdateGuideMutation()`: invalidates `guides.all` and `guides.detail(id)`.
- `useDeleteGuideMutation()`: invalidates `guides.all`.
- `useRemoveCrumbFromGuideMutation()`: invalidates `guides.all`, `guides.detail(guideId)`, and `crumbs.all`.
- `useReorderGuideCrumbsMutation()`: optimistic update on guide detail cache.

### B. Components in `mobile/src/components/guides/`
1. **`GuideCrumbCard.tsx`**:
   - Displays sequence index `(1)`, photo thumbnail, title, price, neighborhood, hero dish badge, live open status, and course category tag.
   - Action buttons for removing from guide and navigating to crumb detail.
2. **`EditGuideModal.tsx`**:
   - Form modal with title input, description textarea, emoji selector, and public/private switch.
3. **`AddCrumbsToGuideModal.tsx`**:
   - Multi-select list of all user crumbs with search input, highlighting crumbs already in the guide.
   - Batch adds selected crumbs via `useAddCrumbToGuideMutation`.

### C. Screen in `mobile/src/app/guides/[id].tsx`
- Screen route handling `guideId` param via `useLocalSearchParams()`.
- Skeleton loading placeholder with `GuidesSkeletonList` or custom header skeleton.
- Error and empty state handling.
- Integrated ActionSheet for options menu.

---

## 4. Verification & Testing Plan
- **Unit Tests**:
  - `api/src/modules/guides/guides.route.test.ts`: test `GET`, `PATCH`, `DELETE /guides/:id`, `DELETE /guides/:id/crumbs/:crumbId`, and `PUT /guides/:id/reorder`.
  - `mobile/` static analysis: `bun run check && bun test src`.
- **Manual Verification**:
  - Tapping a guide from the Guides Hub opens the Guide Detail screen.
  - Adding/removing crumbs updates the UI immediately.
  - Editing guide title updates header and list.
  - Deleting guide returns to Guides Hub with toast confirmation.

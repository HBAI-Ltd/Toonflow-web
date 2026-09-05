# Batch First-Class Citizen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each novel import a first-class batch across import, novel browsing, script agent sessions, and script management.

**Architecture:** The import dialog performs one `addNovel` request per selected file and reports successful import IDs to the novel page. The novel page loads `/novel/getImportList`, groups current-page chapters by `importId`, and exposes batch actions. The script agent uses the existing route-keyed remount behavior to rebind sessions when the batch selector changes `route.query.importId`; the script page applies a client-side batch filter over loaded scripts.

**Tech Stack:** Vue 3 Composition API, TDesign, Pinia, existing Axios wrapper.

**Spec:** User-provided backend contract and finalized UI design in this thread.

## Global Constraints

- Only modify `G:\trae\Toonflow-web`.
- Do not modify `src/views/faceAsset/index.vue`.
- Preserve existing `/scriptAgent` importId-aware semantics.
- Verify with `npx vue-tsc --noEmit`, then build with Node 24 prepended to `PATH`.

---

### Task 1: Import Dialog

**Files:**
- Modify: `src/views/novel/components/importNovel.vue`

- [ ] Replace single-file upload and the temporary multi-file bar with one multiple-file drop/select area.
- [ ] Validate and parse each file independently using the existing `.txt` / `.docx` rules.
- [ ] Call `/novel/addNovel` once per file with `name` set to the file base name.
- [ ] Show per-file progress and success chapter count or failure reason; close only when all files succeed.
- [ ] Add optional paste batch name and emit successful import IDs.
- [ ] Remove the old Batches tab and merge-into-script flow from this dialog.

### Task 2: Novel Batch Groups

**Files:**
- Modify: `src/views/novel/index.vue`

- [ ] Load batch metadata from `/novel/getImportList`.
- [ ] Render current-page chapter rows in per-batch tables with reusable row slots and global pagination.
- [ ] Add generate-script, rename, delete, and disabled merge actions to each batch header.
- [ ] Mark freshly imported batches and provide the unbatched fallback group.

### Task 3: Script Agent Batch Selector

**Files:**
- Modify: `src/views/scriptAgent/index.vue`
- Inspect only: `src/stores/scriptAgent.ts`

- [ ] Load batch options and initialize selection from `route.query.importId`.
- [ ] Switch sessions by updating route query and letting the existing full-path component key remount/reconnect.
- [ ] Display the current batch name in the session header.

### Task 4: Script Batch Filter and Text

**Files:**
- Modify: `src/views/script/index.vue`
- Modify: `src/locales/language/zh-CN.json`
- Modify: `src/locales/language/en.json`

- [ ] Add all / batch / unbatched filtering and keep bulk actions scoped to visible selections.
- [ ] Add every new Chinese and English string.

### Task 5: Verification

- [ ] Inspect the final diff and confirm the protected face asset file is untouched.
- [ ] Run `npx vue-tsc --noEmit`.
- [ ] Run `npx vite build` with Node 24 first in `PATH`.

# Changelog guide (for AI agents)

Use this when **adding or updating** project changelogs so entries stay **consistent** with existing files in [`changelogs/`](./).

## Goals

- One **markdown file per calendar day** (`YYYY-MM-DD.md`). All work merged that day goes into **that day’s file** (append or extend sections; do not open a second file for the same date).
- **User-relevant** bullets: what changed in the product and where in the codebase, not implementation noise.
- **Reproducible** structure so humans and agents can scan and compare entries quickly.

## File layout

1. **Per-day file** — always under `changelogs/`. If `2026-05-01.md` already exists and new work lands the same day, **edit that file** (add bullets under the right sections, refresh `### Notes` if needed).

2. **Filename** — `YYYY-MM-DD.md` (local **calendar date** for the change set).  
   - Example: `2026-04-30.md`

3. **First lines of each entry file** (in order):

   - `# Changelog — YYYY-MM-DD` (match filename)  
   - One optional **short paragraph** (scope).  
   - A single line (can be fixed text):  
     `The format is inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).`  
   - Optional `### Issues` — tracked GitHub/GitLab issues (`#12`, …) when known.  
   - `## [Unreleased]`  
   - Then **sections** (only include sections that have at least one bullet):
     - `### API` — backend routes, modules, DTOs, breaking API behavior.
     - `### Added` / `### Added (web)` — new files, features, public surfaces.
     - `### Changed` / `### Changed (web)` — behavior or UI updates.
     - `### Fixed` — bug fixes.
     - `### Removed` — deleted features or endpoints.
     - `### Security` — auth, validation, dependencies (only if relevant).
     - `### Notes` — optional: file list, `git` scope, migration hints.

   Use **`(web)`** in the heading when the section is only frontend (mirrors how this repo has already split concerns).

4. **Bullets** — start with a **bold** label, then a colon and the description.

   - Good:  
     `- **Home (\`+page.svelte\`):** Loads data from \`/dashboard/summary\` instead of multiple requests.`  
   - Include **paths** in backticks (`apps/web/src/...`, `` `$lib/me.ts` ``).  
   - Mention **REST paths** where useful (`GET /dashboard/summary?day=…`).  
   - Call out **breaking** or **regression-risk** behavior explicitly (e.g. removed auto-fill of a filter).

5. **Root `CHANGELOG.md`** (repo root) — keep it as an **index only**:

   - Short intro + link to `changelogs/`.
   - A **table** with columns: `Date / file` | `Summary`.
   - Each row: markdown link to `changelogs/YYYY-MM-DD.md` and a **one-line** summary.
   - When adding a new **day**, add or update a row (this repo keeps **newest dates at the top**).
   - One row per day, not per edit.

## Related agent guides

- **Web UI conventions** — [`apps/web/AGENTS.md`](../apps/web/AGENTS.md): component usage, navigation config, state patterns, accessibility, and the new-feature adoption checklist. Read this before touching any file under `apps/web/src`.

## Workflow suggestions

- **From git:** Run `git diff --cached --stat` and/or full diff when the user wants “staged” or “committed” scope. Put a **file list** or scope hint under `### Notes` when the change touches many paths.
- **Same day, multiple PRs:** merge bullets into the **same** `YYYY-MM-DD.md`; avoid duplicate bullets for the same feature.
- **Do not** invent release version numbers in the entry file unless the user provides a version; use `## [Unreleased]` unless they ask for `## [1.2.3]`.

## Checklist before finishing

- [ ] Filename is `changelogs/YYYY-MM-DD.md` and matches the `# Changelog — YYYY-MM-DD` title.
- [ ] Keep a Changelog link line present.
- [ ] Sections are ordered and named consistently with sibling entries.
- [ ] Root `CHANGELOG.md` index updated (one row per day touched).
- [ ] No duplicate prose between index row and full entry (index = one line only).

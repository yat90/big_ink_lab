# Web UI guidelines (for AI agents)

Use this when **adding or modifying** any UI in `apps/web/src` so that new work stays **consistent** with the existing design system.

## Design tokens

All values come from CSS custom properties in [`src/styles/tokens.css`](src/styles/tokens.css). Never hard-code colors, radii, spacing, or shadows.

| Category | Key tokens |
|----------|-----------|
| Colors | `--ink` (primary/purple), `--big` (danger/red), `--gold`, `--fg`, `--muted`, `--bg`, `--bg2`, `--card` |
| Radii | `--radius` (16 px), `--radius-sm` (12 px), `--radius-lg` (20 px), `--radius-full` |
| Spacing | `--space-xs` 4 px · `--space-sm` 8 px · `--space-md` 12 px · `--space-lg` 16 px · `--space-xl` 24 px |
| Glass | `--glass-bg`, `--glass-bg-strong`, `--glass-border`, `--glass-blur` |
| Motion | `--transition` (`0.2s var(--ease)`) — always respect `prefers-reduced-motion` (handled globally in `layout.css`) |

## Shared primitives

Import from `$lib/` — never re-implement these inline.

### `AppButton`

```svelte
<AppButton variant="primary">Save</AppButton>
<AppButton variant="danger" href="/delete">Delete</AppButton>
<AppButton variant="dangerOutline" size="sm">Remove</AppButton>
<AppButton variant="default" icon>
  <PlusIcon /> Add
</AppButton>
```

- **`variant`**: `default` | `primary` | `danger` | `dangerOutline`
- **`size`**: `md` (default) | `sm`
- **`icon`**: set when the button contains a leading SVG icon (adds right padding)
- Renders an `<a>` when `href` is set, `<button>` otherwise — never wrap an `AppButton` in an `<a>`.
- **Do:** use `variant="primary"` for the one primary action per view; `variant="danger"` for destructive confirms.
- **Don't:** invent new button classes; don't use raw `<button class="btn">` outside of legacy code.

### `AppCard`

```svelte
<AppCard>Content</AppCard>
<AppCard href="/matches/42">Clickable card</AppCard>
```

- Applies `.card.ui-card`. Add utility classes via `className`.
- Link variant adds `.link-inherit` and renders as `<a>`.

### `AppBanner`

```svelte
<AppBanner variant="danger" title="Save failed" message={error} />
<AppBanner variant="success" title="Saved" message="Changes applied." />
```

- **`variant`**: `info` | `success` | `warning` | `danger`
- ARIA `role` and `aria-live` are set automatically (`assertive` for danger, `polite` for others).
- **Do:** use for page-level feedback (auth errors, save results).
- **Don't:** use for inline field validation — that belongs on the form field itself.

### `StatusStateCard`

Covers loading, empty, and error states for list/detail screens.

```svelte
<StatusStateCard kind="loading" message="Loading matches…" />
<StatusStateCard kind="empty" title="No matches yet" message="Record your first match to get started.">
  {#snippet actions()}
    <AppButton variant="primary" href="/matches/new">Add match</AppButton>
  {/snippet}
</StatusStateCard>
<StatusStateCard kind="error" title="Could not load" message={errorMessage} />
```

- **`kind`**: `loading` | `empty` | `error`
- **`align`**: `left` (default) | `center`
- Error state sets `role="alert"` and `aria-live="assertive"` automatically.
- Loading state sets `aria-busy="true"` automatically.
- **Do:** always provide an `actions` snippet for `empty` states that have a clear next step.
- **Don't:** render raw spinner or "No data" text outside of this component.

### `Select`

Custom ARIA listbox with full keyboard navigation.

```svelte
<Select bind:value={deckId} {options} ariaLabel="Select deck" id="deck-select" />
```

- **`options`**: `{ value: string; label: string }[]`
- Pair with a visible `<label for="deck-select">` or pass `ariaLabel` — never omit both.

### `AppToast`

Triggered via the `toast` store, not rendered directly per route:

```ts
import { toast } from '$lib/toast';
toast.success('Match saved.');
toast.error('Could not delete match.');
```

### `AppBreadcrumb`

Use for all drill-down routes (detail pages). Wrap in `<PageHeader>` for consistent layout.

## Navigation

Navigation is driven by a **single config** in [`src/lib/navConfig.ts`](src/lib/navConfig.ts).

- **Do:** add new top-level routes to `PRIMARY_NAV_ITEMS` and let `DesktopNavBar`, `MobileNavBar`, and `MobileNavDrawer` pick them up automatically.
- **Don't:** hard-code route labels or active-state logic in individual nav components.
- Mobile tab bar shows only `MOBILE_TAB_NAV_IDS` items — update that list deliberately when adding a tab.

## Loading / empty / error states

Every list or detail route **must** handle all three states using `StatusStateCard`:

| State | `kind` | Notes |
|-------|--------|-------|
| Fetching data | `loading` | Show immediately; no layout shift |
| No results | `empty` | Include a next-step action if one exists |
| Fetch/action failed | `error` | Include the error message; `aria-live="assertive"` fires automatically |

## Forms

- Use `<label>` elements with matching `for`/`id` pairs on all inputs.
- Use `AppButton variant="primary"` for submit; `AppButton variant="danger"` for destructive confirms.
- Show `AppBanner variant="danger"` above the form for server-side errors.
- Disable the submit button and show a loading indicator while the request is in flight.
- **Do:** validate at the server boundary; trust SvelteKit's type-safe form actions.
- **Don't:** add client-only validation for constraints the server already enforces.

## Accessibility

- **Focus trapping in modals:** use the `focusTrap` Svelte action from `$lib/a11y.ts`. It handles Tab/Shift+Tab cycling, initial focus, and restores focus on close.
- **Scroll locking:** use the `scrollLock` action from `$lib/a11y.ts` when opening any full-screen overlay.
- **Color contrast:** all text/surface pairs must meet WCAG AA (4.5:1 for normal text, 3:1 for large text and UI components). Use `--border-ui` for form element borders — not `--border` or `--glass-border`.
- **Interactive elements:** minimum tap target of `--tap` (56 px) on mobile. Use `btn--sm` only in contexts where adjacent targets remain well-separated.
- **Reduced motion:** `layout.css` suppresses animations globally when `prefers-reduced-motion: reduce` is set — do not override this per-component.
- **Live regions:** use `AppBanner` and `StatusStateCard` instead of raw `aria-live` attributes; they apply the correct `role` and politeness level for each variant.
- **Icon buttons:** always pair an icon-only button with `aria-label`.

## Responsive / mobile-first

- Write mobile styles first; add `@media (min-width: 640px)` for tablet, `@media (min-width: 768px)` for desktop.
- Use the `.stack` utility class (gap-based vertical layout) rather than one-off flex columns.
- Keep tap targets at `var(--tap)` (56 px) for primary actions on mobile.
- Test layouts in both portrait and landscape orientations.

## Do / don't quick reference

| Do | Don't |
|----|-------|
| Use `AppButton`, `AppCard`, `AppBanner`, `StatusStateCard` | Compose raw buttons, cards, or banners from scratch |
| Use CSS tokens from `tokens.css` | Hard-code colors, spacing, or shadow values |
| Add routes to `navConfig.ts` | Hard-code nav labels or active logic in nav components |
| Handle loading, empty, and error states with `StatusStateCard` | Leave routes with no feedback during data fetch |
| Pair every form input with a `<label>` | Use `placeholder` as the only label |
| Use `focusTrap` + `scrollLock` for modal dialogs | Implement manual Tab-trapping or scroll management |
| Use `--border-ui` for interactive element borders | Use `--glass-border` or `--border` on inputs and selects |
| Show a `toast` for async action results | Use `alert()` or silent failures |

## Commit and changelog requirements

Every commit that closes or addresses a GitHub issue **must**:

1. **Reference the issue** in the commit message body — e.g. `Closes #65` or `Part of #65`.
2. **Add a changelog entry** following [`changelogs/AGENTS.md`](../../changelogs/AGENTS.md) before pushing:
   - Create or extend today's `changelogs/YYYY-MM-DD.md`.
   - Update the table in the root `CHANGELOG.md` (newest row at top).

## New feature adoption checklist

When adding a new feature or route, verify:

- [ ] Route uses `StatusStateCard` for loading, empty, and error states.
- [ ] All buttons use `AppButton` with the correct variant; primary action uses `variant="primary"`.
- [ ] Cards use `AppCard`; banners use `AppBanner`.
- [ ] Forms have paired `<label>` elements and show `AppBanner variant="danger"` on error.
- [ ] If the route introduces a custom `<select>`, replace it with `<Select>` from `$lib/Select.svelte`.
- [ ] Any modal or drawer uses `focusTrap` and `scrollLock` from `$lib/a11y.ts`.
- [ ] New top-level navigation entries are added to `navConfig.ts`.
- [ ] Color contrast meets WCAG AA; interactive borders use `--border-ui`.
- [ ] Mobile layout is usable with 56 px tap targets and a minimum 375 px viewport.
- [ ] Async action results are surfaced via `toast.success` / `toast.error`.
- [ ] A changelog entry is added following [`changelogs/AGENTS.md`](../../changelogs/AGENTS.md).

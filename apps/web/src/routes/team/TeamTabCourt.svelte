<script lang="ts">
  import { onMount, tick } from 'svelte';
  import {
    fetchTeamAccusations,
    fetchTeamMembers,
    fetchTeamSettings,
    formatDate,
    formatMoney,
    createTeamAccusation,
    deleteTeamAccusation,
    updateTeamAccusationStatus,
    type TeamAccusation,
    type TeamMember,
    type TeamPenalty,
    type AccusationStatus,
  } from '$lib/team';
  import IconGavel from '$lib/icons/IconGavel.svelte';
  import IconTrash from '$lib/icons/IconTrash.svelte';
  import IconCheck from '$lib/icons/IconCheck.svelte';
  import IconClose from '$lib/icons/IconClose.svelte';
  import IconRefresh from '$lib/icons/IconRefresh.svelte';
  import IconMore from '$lib/icons/IconMore.svelte';
  import { portal } from '$lib/portal';
  import { getLocale, translate, t } from '$lib/i18n';
  import { focusTrap, scrollLock } from '$lib/a11y';

  interface Props {
    isAdmin: boolean;
    currentPlayerId: string | null;
  }
  let { isAdmin, currentPlayerId }: Props = $props();

  let members = $state<TeamMember[]>([]);
  let penalties = $state<TeamPenalty[]>([]);
  let accusations = $state<TeamAccusation[]>([]);
  let loading = $state(true);
  let loadError = $state('');

  let accusedPlayerId = $state('');
  let penaltyId = $state('');
  let details = $state('');
  let filing = $state(false);
  let fileError = $state('');

  let updatingId = $state<string | null>(null);
  let deletingId = $state<string | null>(null);
  let courtActionError = $state('');
  let withdrawPromptRow = $state<TeamAccusation | null>(null);
  let openActionsRowId = $state<string | null>(null);
  type ActionsMenuLayout = { top: number; right: number; maxHeight?: number };

  let actionsMenuLayout = $state<ActionsMenuLayout | null>(null);

  const openActionsRow = $derived(
    openActionsRowId ? (accusations.find((a) => a.id === openActionsRowId) ?? null) : null,
  );

  const accusableMembers = $derived(
    members.filter((m) => m.playerId !== currentPlayerId),
  );

  const showCourtActionsCol = $derived(
    isAdmin ||
      accusations.some(
        (a) =>
          a.status === 'open' &&
          currentPlayerId !== null &&
          a.accuser.playerId === currentPlayerId,
      ),
  );

  function canDeleteOwnAccusation(row: TeamAccusation): boolean {
    return (
      row.status === 'open' &&
      currentPlayerId !== null &&
      row.accuser.playerId === currentPlayerId
    );
  }

  function rowHasActions(row: TeamAccusation): boolean {
    if (isAdmin) return true;
    return canDeleteOwnAccusation(row);
  }

  function closeActionsMenu() {
    openActionsRowId = null;
    actionsMenuLayout = null;
  }

  function toggleActionsMenu(rowId: string) {
    openActionsRowId = openActionsRowId === rowId ? null : rowId;
  }

  function estimateMenuHeight(row: TeamAccusation): number {
    let items = 0;
    if (isAdmin && row.status === 'open') items += 2;
    else if (isAdmin) items += 1;
    if (canDeleteOwnAccusation(row)) items += 1;
    return items * 42 + 16;
  }

  function positionActionsMenu() {
    const id = openActionsRowId;
    if (!id) {
      actionsMenuLayout = null;
      return;
    }
    const btn = document.getElementById(`court-actions-btn-${id}`);
    const row = accusations.find((a) => a.id === id);
    if (!btn || !row) {
      actionsMenuLayout = null;
      return;
    }

    const r = btn.getBoundingClientRect();
    const panelEl = document.getElementById(`court-actions-panel-${id}`);
    const estimatedH = estimateMenuHeight(row);
    const panelH = panelEl?.offsetHeight ?? estimatedH;
    const panelW = panelEl?.offsetWidth ?? 200;

    const gap = 6;
    const margin = 8;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    const belowTop = r.bottom + gap;
    const spaceBelow = vh - margin - belowTop;
    const spaceAboveMax = r.top - gap - margin;

    let top: number;
    let maxHeight: number | undefined;

    if (panelH <= spaceBelow) {
      top = belowTop;
    } else if (panelH <= spaceAboveMax) {
      top = r.top - gap - panelH;
    } else if (spaceBelow >= spaceAboveMax) {
      top = belowTop;
      maxHeight = Math.max(96, spaceBelow);
    } else {
      top = margin;
      maxHeight = Math.max(96, spaceAboveMax);
    }

    if (maxHeight != null) {
      const effectiveH = Math.min(panelH, maxHeight);
      if (top + effectiveH > vh - margin) {
        top = Math.max(margin, vh - margin - effectiveH);
      }
    }

    let right = vw - r.right;
    const leftEdge = vw - right - panelW;
    if (leftEdge < margin) {
      right = Math.max(margin, vw - margin - panelW);
    }

    actionsMenuLayout = { top, right, maxHeight };
  }

  async function loadAll() {
    closeActionsMenu();
    loading = true;
    loadError = '';
    try {
      const [m, p, a] = await Promise.all([
        fetchTeamMembers(),
        fetchTeamSettings(),
        fetchTeamAccusations(),
      ]);
      members = m;
      penalties = p.penalties ?? [];
      accusations = a;
      const others = m.filter((x) => x.playerId !== currentPlayerId);
      if (accusedPlayerId && !others.some((x) => x.playerId === accusedPlayerId)) {
        accusedPlayerId = '';
      }
      if (penaltyId && !penalties.some((x) => x.id === penaltyId)) {
        penaltyId = '';
      }
    } catch (err) {
      loadError =
        err instanceof Error ? err.message : translate(getLocale(), 'court.loadError');
      members = [];
      penalties = [];
      accusations = [];
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void loadAll();
  });

  async function submitAccusation() {
    if (!accusedPlayerId || !penaltyId) return;
    filing = true;
    fileError = '';
    try {
      await createTeamAccusation({
        accusedPlayerId,
        penaltyId,
        details: details.trim() || undefined,
      });
      details = '';
      accusedPlayerId = '';
      penaltyId = '';
      await loadAll();
    } catch (err) {
      fileError =
        err instanceof Error ? err.message : translate(getLocale(), 'court.fileError');
    } finally {
      filing = false;
    }
  }

  async function setStatus(id: string, status: AccusationStatus) {
    closeActionsMenu();
    updatingId = id;
    courtActionError = '';
    try {
      await updateTeamAccusationStatus(id, status);
      await loadAll();
    } catch (err) {
      courtActionError =
        err instanceof Error ? err.message : translate(getLocale(), 'court.statusError');
    } finally {
      updatingId = null;
    }
  }

  function openWithdrawPrompt(row: TeamAccusation) {
    closeActionsMenu();
    withdrawPromptRow = row;
  }

  function closeWithdrawPrompt() {
    withdrawPromptRow = null;
  }

  async function confirmWithdrawOwnAccusation() {
    const id = withdrawPromptRow?.id;
    if (!id) return;
    closeWithdrawPrompt();
    deletingId = id;
    courtActionError = '';
    try {
      await deleteTeamAccusation(id);
      await loadAll();
    } catch (err) {
      courtActionError =
        err instanceof Error ? err.message : translate(getLocale(), 'court.deleteError');
    } finally {
      deletingId = null;
    }
  }

  $effect(() => {
    if (!withdrawPromptRow && !openActionsRowId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (withdrawPromptRow) closeWithdrawPrompt();
      else closeActionsMenu();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  $effect(() => {
    if (openActionsRowId && !openActionsRow) closeActionsMenu();
  });

  $effect(() => {
    if (!openActionsRowId) {
      actionsMenuLayout = null;
      return;
    }
    const id = openActionsRowId;
    const update = () => {
      if (openActionsRowId !== id) return;
      positionActionsMenu();
    };
    update();
    void tick().then(() => {
      update();
      requestAnimationFrame(update);
    });
    const onScrollResize = () => update();
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);
    return () => {
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
    };
  });

  $effect(() => {
    if (!openActionsRowId) return;
    const id = openActionsRowId;
    const onDoc = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      const wrap = document.querySelector(`[data-court-actions="${id}"]`);
      const panel = document.querySelector(`[data-court-panel-for="${id}"]`);
      if (wrap?.contains(t) || panel?.contains(t)) return;
      closeActionsMenu();
    };
    document.addEventListener('mousedown', onDoc, true);
    return () => document.removeEventListener('mousedown', onDoc, true);
  });
</script>

<div class="court-room stack">
  {#if loading}
    <div class="card court-room__loading muted" aria-busy="true">{$t('court.loading')}</div>
  {:else if loadError}
    <div class="card" role="alert">
      <p class="alert">{loadError}</p>
      <button type="button" class="btn" onclick={() => void loadAll()}>{$t('court.retry')}</button>
    </div>
  {:else}
    <div class="card court-room__hero">
      <h2 class="court-room__title">
        <span class="court-room__title-icon" aria-hidden="true">
          <IconGavel size={26} />
        </span>
        {$t('court.title')}
      </h2>
      <p class="court-room__lead muted">
        {$t('court.lead')}
      </p>
    </div>

    {#if !currentPlayerId}
      <div class="card court-room__notice" role="status">
        <p class="court-room__notice-text">
          {$t('court.noticeNoPlayerBefore')}<a href="/me">{$t('court.noticeNoPlayerLink')}</a>{$t('court.noticeNoPlayerAfter')}
        </p>
      </div>
    {:else if accusableMembers.length === 0}
      <div class="card court-room__notice muted" role="status">
        <p class="court-room__notice-text">{$t('court.noticeNoMembers')}</p>
      </div>
    {:else if penalties.length === 0}
      <div class="card court-room__notice muted" role="status">
        <p class="court-room__notice-text">
          {$t('court.noticeNoPenalties')}
        </p>
      </div>
    {:else}
      <div class="card court-room__form">
        <h3 class="court-room__form-title">{$t('court.formTitle')}</h3>
        {#if fileError}
          <p class="alert" role="alert">{fileError}</p>
        {/if}
        <div class="court-room__fields">
          <label class="court-room__label">
            <span class="court-room__label-text">{$t('court.accusedLabel')}</span>
            <select class="input court-room__select" bind:value={accusedPlayerId}>
              <option value="">{$t('court.selectPlaceholder')}</option>
              {#each accusableMembers as m (m.playerId)}
                <option value={m.playerId}>{m.name}</option>
              {/each}
            </select>
          </label>
          <label class="court-room__label">
            <span class="court-room__label-text">{$t('court.violationLabel')}</span>
            <select class="input court-room__select" bind:value={penaltyId}>
              <option value="">{$t('court.selectPlaceholder')}</option>
              {#each penalties as p (p.id)}
                <option value={p.id}>{p.description} — {formatMoney(p.amount)}</option>
              {/each}
            </select>
          </label>
          <label class="court-room__label court-room__label--grow">
            <span class="court-room__label-text">{$t('court.detailsLabel')}</span>
            <textarea
              class="input court-room__textarea"
              rows="3"
              maxlength={500}
              placeholder={$t('court.detailsPlaceholder')}
              bind:value={details}
            ></textarea>
          </label>
        </div>
        <button
          type="button"
          class="btn btn--primary court-room__submit"
          disabled={filing || !accusedPlayerId || !penaltyId}
          onclick={() => void submitAccusation()}
        >
          {filing ? $t('court.submitting') : $t('court.submit')}
        </button>
      </div>
    {/if}

    <div class="card court-room__table-wrap">
      <h3 class="court-room__list-title">{$t('court.recordsTitle')}</h3>
      {#if courtActionError}
        <p class="alert" role="alert">{courtActionError}</p>
      {/if}
      {#if accusations.length === 0}
        <p class="court-room__empty muted">{$t('court.empty')}</p>
      {:else}
        <div class="court-room__scroll">
          <table class="court-table">
            <thead>
              <tr>
                <th scope="col">{$t('court.colDate')}</th>
                <th scope="col">{$t('court.colAccuser')}</th>
                <th scope="col">{$t('court.colAccused')}</th>
                <th scope="col">{$t('court.colOffense')}</th>
                <th scope="col" class="court-table__col-num">{$t('court.colFine')}</th>
                <th scope="col">{$t('court.colStatus')}</th>
                {#if showCourtActionsCol}
                  <th scope="col" class="court-table__col-actions">{$t('court.colActions')}</th>
                {/if}
              </tr>
            </thead>
            <tbody>
              {#each accusations as row (row.id)}
                <tr class="court-table__row">
                  <td class="court-table__date muted">{formatDate(row.createdAt)}</td>
                  <td class="court-table__names">{row.accuser.name}</td>
                  <td class="court-table__names">{row.accused.name}</td>
                  <td class="court-table__desc">
                    <span class="court-table__offense">{row.penaltyDescription}</span>
                    {#if row.details?.trim()}
                      <span class="court-table__details muted">{row.details.trim()}</span>
                    {/if}
                  </td>
                  <td class="court-table__amount">{formatMoney(row.penaltyAmount)}</td>
                  <td class="court-table__status">
                    <span
                      class="court-badge"
                      class:court-badge--open={row.status === 'open'}
                      class:court-badge--dismissed={row.status === 'dismissed'}
                      class:court-badge--upheld={row.status === 'upheld'}
                    >
                      {#if row.status === 'open'}{$t('court.status.open')}
                      {:else if row.status === 'dismissed'}{$t('court.status.dismissed')}
                      {:else}{$t('court.status.upheld')}{/if}
                    </span>
                  </td>
                  {#if showCourtActionsCol}
                    <td class="court-table__actions">
                      {#if rowHasActions(row)}
                        <div
                          class="court-actions-menu"
                          class:court-actions-menu--open={openActionsRowId === row.id}
                          data-court-actions={row.id}
                        >
                          <button
                            type="button"
                            class="btn btn--sm court-actions-menu__trigger"
                            aria-expanded={openActionsRowId === row.id}
                            aria-haspopup="true"
                            aria-label={$t('court.actionsAria')}
                            aria-controls="court-actions-panel-{row.id}"
                            id="court-actions-btn-{row.id}"
                            disabled={updatingId === row.id || deletingId === row.id}
                            onclick={(e) => {
                              e.stopPropagation();
                              toggleActionsMenu(row.id);
                            }}
                          >
                            <IconMore size={16} className="court-actions-menu__trigger-icon" />
                          </button>
                        </div>
                      {:else}
                        <span class="court-table__actions-empty muted">—</span>
                      {/if}
                    </td>
                  {/if}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}

  {#if openActionsRowId && openActionsRow && actionsMenuLayout}
    <div
      use:portal={document.body}
      class="court-actions-menu__panel court-actions-menu__panel--portal"
      data-court-actions-panel
      data-court-panel-for={openActionsRowId}
      style:top="{actionsMenuLayout.top}px"
      style:right="{actionsMenuLayout.right}px"
      style:max-height={actionsMenuLayout.maxHeight !== undefined ? `${actionsMenuLayout.maxHeight}px` : undefined}
      role="menu"
      id="court-actions-panel-{openActionsRow.id}"
      aria-labelledby="court-actions-btn-{openActionsRow.id}"
    >
      {#if isAdmin && openActionsRow.status === 'open'}
        <button
          type="button"
          class="court-actions-menu__item"
          role="menuitem"
          disabled={updatingId === openActionsRow.id || deletingId === openActionsRow.id}
          onclick={() => void setStatus(openActionsRow.id, 'dismissed')}
        >
          <IconClose size={16} className="court-actions-menu__item-icon" />
          {$t('court.menuDismiss')}
        </button>
        <button
          type="button"
          class="court-actions-menu__item court-actions-menu__item--primary"
          role="menuitem"
          disabled={updatingId === openActionsRow.id || deletingId === openActionsRow.id}
          onclick={() => void setStatus(openActionsRow.id, 'upheld')}
        >
          <IconCheck size={16} className="court-actions-menu__item-icon" />
          {$t('court.menuConfirm')}
        </button>
      {:else if isAdmin}
        <button
          type="button"
          class="court-actions-menu__item"
          role="menuitem"
          disabled={updatingId === openActionsRow.id || deletingId === openActionsRow.id}
          title={$t('court.menuReopenTitle')}
          onclick={() => void setStatus(openActionsRow.id, 'open')}
        >
          <IconRefresh size={16} className="court-actions-menu__item-icon" />
          {$t('court.menuReopen')}
        </button>
      {/if}
      {#if canDeleteOwnAccusation(openActionsRow)}
        <button
          type="button"
          class="court-actions-menu__item court-actions-menu__item--danger"
          role="menuitem"
          disabled={deletingId === openActionsRow.id || updatingId === openActionsRow.id}
          onclick={() => openWithdrawPrompt(openActionsRow)}
        >
          <IconTrash size={16} className="court-actions-menu__item-icon" />
          {deletingId === openActionsRow.id ? $t('court.menuWithdrawing') : $t('court.menuWithdraw')}
        </button>
      {/if}
    </div>
  {/if}

  {#if withdrawPromptRow}
    <div
      class="court-room-withdraw-modal delete-game-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="court-withdraw-title"
    >
      <button
        type="button"
        class="delete-game-modal__backdrop"
        aria-label={$t('court.backdropCancel')}
        onclick={closeWithdrawPrompt}
      ></button>
      <div
        class="delete-game-modal__card card"
        use:focusTrap={{ focusRoot: true }}
        use:scrollLock
      >
        <h2 id="court-withdraw-title" class="delete-game-modal__title">
          {$t('court.withdrawModalTitle')}
        </h2>
        <p class="delete-game-modal__text muted">
          {$t('court.withdrawModalBodyBefore')}<strong>{withdrawPromptRow.accused.name}</strong>{$t('court.withdrawModalBodyAfter')}
        </p>
        <div class="delete-game-modal__actions row">
          <button
            type="button"
            class="btn btn--danger btn--icon"
            onclick={() => void confirmWithdrawOwnAccusation()}
          >
            <IconTrash size={18} />
            {$t('court.withdrawConfirm')}
          </button>
          <button type="button" class="btn" onclick={closeWithdrawPrompt}>
            {$t('court.withdrawCancel')}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .court-room.stack {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-md);
    min-height: min-content;
  }

  .court-room__loading {
    padding: var(--space-lg);
    font-size: 0.95rem;
  }

  .court-room__hero {
    padding: var(--space-lg);
    border-left: 3px solid var(--gold);
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--gold) 12%, transparent) 0%,
      transparent 70%
    );
  }

  .court-room__title {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin: 0 0 var(--space-xs) 0;
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .court-room__title-icon {
    display: flex;
    color: var(--gold);
    flex-shrink: 0;
  }

  .court-room__lead {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.45;
    max-width: 42rem;
  }

  .court-room__notice {
    padding: var(--space-md) var(--space-lg);
  }

  .court-room__notice-text {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.45;
  }

  .court-room__notice-text a {
    color: var(--primary);
    text-underline-offset: 2px;
  }

  .court-room__form {
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .court-room__form-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
  }

  .court-room__fields {
    display: grid;
    gap: var(--space-md);
    grid-template-columns: 1fr;
  }

  @media (min-width: 640px) {
    .court-room__fields {
      grid-template-columns: 1fr 1fr;
    }

    .court-room__label--grow {
      grid-column: 1 / -1;
    }
  }

  .court-room__label {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .court-room__label-text {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    font-weight: 600;
  }

  .court-room__select,
  .court-room__textarea {
    width: 100%;
  }

  .court-room__textarea {
    resize: vertical;
    min-height: 4.5rem;
  }

  .court-room__submit {
    align-self: flex-start;
  }

  .court-room__table-wrap {
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
    min-height: min-content;
    padding: var(--space-lg);
  }

  .court-room__list-title {
    margin: 0 0 var(--space-md) 0;
    font-size: 1.05rem;
    font-weight: 700;
  }

  .court-room__empty {
    margin: 0;
    font-size: 0.95rem;
  }

  .court-room__scroll {
    flex: 0 0 auto;
    width: 100%;
    min-height: min-content;
    max-height: none;
    overflow-x: auto;
    overflow-y: visible;
    margin: 0 calc(-1 * var(--space-lg));
    padding: 0 var(--space-lg);
  }

  .court-table {
    width: 100%;
    min-width: 720px;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  .court-table thead {
    border-bottom: 1px solid var(--border);
  }

  .court-table th {
    text-align: left;
    padding: var(--space-sm) var(--space-md);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    font-weight: 600;
    white-space: nowrap;
  }

  .court-table__col-num {
    text-align: right;
  }

  .court-table__col-actions {
    width: 1%;
    white-space: nowrap;
  }

  .court-table td {
    padding: var(--space-md);
    vertical-align: top;
    border-bottom: 1px solid var(--border);
  }

  .court-table tbody tr:last-child td {
    border-bottom: none;
  }

  .court-table__date {
    white-space: nowrap;
    font-size: 0.85rem;
  }

  .court-table__names {
    font-weight: 600;
    white-space: nowrap;
  }

  .court-table__desc {
    max-width: 14rem;
  }

  .court-table__offense {
    display: block;
    font-weight: 500;
    line-height: 1.35;
  }

  .court-table__details {
    display: block;
    font-size: 0.85rem;
    margin-top: var(--space-xs);
    line-height: 1.35;
  }

  .court-table__amount {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    white-space: nowrap;
  }

  .court-table__actions {
    text-align: right;
    vertical-align: middle;
  }

  .court-table__actions-empty {
    font-size: 1rem;
    user-select: none;
  }

  .court-actions-menu {
    position: relative;
    display: inline-flex;
    justify-content: flex-end;
    isolation: isolate;
  }

  .court-actions-menu__trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  :global(.court-actions-menu__trigger-icon) {
    flex-shrink: 0;
    opacity: 0.85;
  }

  .court-actions-menu--open .court-actions-menu__trigger {
    color: var(--fg);
    background: var(--glass-bg-strong);
  }

  .court-actions-menu__panel {
    min-width: 12.5rem;
    padding: 6px;
    border-radius: var(--radius-sm);
    background: var(--card);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
  }

  .court-actions-menu__panel--portal {
    position: fixed;
    z-index: 300;
    margin: 0;
    max-width: min(12.5rem, calc(100vw - 16px));
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .court-actions-menu__item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--fg);
    cursor: pointer;
    transition: background var(--transition);
    -webkit-tap-highlight-color: transparent;
  }

  .court-actions-menu__item:hover:not(:disabled) {
    background: var(--glass-bg-strong);
  }

  .court-actions-menu__item:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .court-actions-menu__item--primary:not(:disabled) {
    color: var(--primary);
  }

  .court-actions-menu__item--danger:not(:disabled) {
    color: var(--danger);
  }

  :global(.court-actions-menu__item-icon) {
    flex-shrink: 0;
    opacity: 0.9;
  }

  .court-badge {
    display: inline-block;
    padding: 0.2rem 0.55rem;
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .court-badge--open {
    background: var(--danger-soft);
    color: var(--danger);
    border: 1px solid var(--danger-border);
  }

  .court-badge--dismissed {
    background: var(--glass-bg);
    color: var(--muted);
    border: 1px solid var(--border);
  }

  .court-badge--upheld {
    background: var(--gold-dim);
    color: var(--gold);
    border: 1px solid color-mix(in srgb, var(--gold) 35%, transparent);
  }

  .court-room-withdraw-modal.delete-game-modal {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .court-room-withdraw-modal .delete-game-modal__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    padding: 0;
    cursor: pointer;
  }

  .court-room-withdraw-modal .delete-game-modal__card {
    position: relative;
    z-index: 1;
    max-width: 360px;
    width: 100%;
    text-align: center;
  }

  .court-room-withdraw-modal .delete-game-modal__title {
    font-size: 1.25rem;
    margin: 0 0 8px;
  }

  .court-room-withdraw-modal .delete-game-modal__text {
    margin: 0 0 20px;
    line-height: 1.45;
  }

  .court-room-withdraw-modal .delete-game-modal__text strong {
    font-weight: 700;
    color: var(--fg);
  }

  .court-room-withdraw-modal .delete-game-modal__actions {
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }
</style>

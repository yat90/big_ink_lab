<script lang="ts">
  import { onMount } from 'svelte';
  import {
    fetchTeamAccusations,
    fetchTeamMembers,
    fetchTeamSettings,
    formatDate,
    formatMoney,
    createTeamAccusation,
    updateTeamAccusationStatus,
    type TeamAccusation,
    type TeamMember,
    type TeamPenalty,
    type AccusationStatus,
  } from '$lib/team';

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

  const accusableMembers = $derived(
    members.filter((m) => m.playerId !== currentPlayerId),
  );

  async function loadAll() {
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
        err instanceof Error ? err.message : 'Gerichtssaal konnte nicht geladen werden.';
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

  function statusLabel(s: AccusationStatus): string {
    if (s === 'open') return 'Offen';
    if (s === 'dismissed') return 'Abgewiesen';
    return 'Bestätigt';
  }

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
        err instanceof Error ? err.message : 'Anklage konnte nicht eingereicht werden.';
    } finally {
      filing = false;
    }
  }

  async function setStatus(id: string, status: AccusationStatus) {
    updatingId = id;
    try {
      await updateTeamAccusationStatus(id, status);
      await loadAll();
    } catch {
      /* handled by reload failure — optional toast */
    } finally {
      updatingId = null;
    }
  }
</script>

<div class="court-room stack">
  {#if loading}
    <div class="card court-room__loading muted" aria-busy="true">Gerichtssaal wird geladen…</div>
  {:else if loadError}
    <div class="card" role="alert">
      <p class="alert">{loadError}</p>
      <button type="button" class="btn" onclick={() => void loadAll()}>Erneut versuchen</button>
    </div>
  {:else}
    <div class="card court-room__hero">
      <h2 class="court-room__title">Gerichtssaal</h2>
      <p class="court-room__lead muted">
        Hier reicht ihr Anklagen nach dem Strafenkatalog ein. Im Team Meeting werden sie besprochen;
        Admins markieren den Ausgang (abgewiesen oder bestätigt).
      </p>
    </div>

    {#if !currentPlayerId}
      <div class="card court-room__notice" role="status">
        <p class="court-room__notice-text">
          Um eine Anklage einzureichen, muss dein Account mit einem Spielerprofil verknüpft sein
          (siehe <a href="/me">Me</a>).
        </p>
      </div>
    {:else if accusableMembers.length === 0}
      <div class="card court-room__notice muted" role="status">
        <p class="court-room__notice-text">Keine anderen Teammitglieder zum Anklagen.</p>
      </div>
    {:else if penalties.length === 0}
      <div class="card court-room__notice muted" role="status">
        <p class="court-room__notice-text">
          Der Strafenkatalog ist leer. Ein Admin kann ihn unter „Strafen“ pflegen.
        </p>
      </div>
    {:else}
      <div class="card court-room__form">
        <h3 class="court-room__form-title">Neue Anklage</h3>
        {#if fileError}
          <p class="alert" role="alert">{fileError}</p>
        {/if}
        <div class="court-room__fields">
          <label class="court-room__label">
            <span class="court-room__label-text">Beschuldigte Person</span>
            <select class="input court-room__select" bind:value={accusedPlayerId}>
              <option value="">Auswählen…</option>
              {#each accusableMembers as m (m.playerId)}
                <option value={m.playerId}>{m.name}</option>
              {/each}
            </select>
          </label>
          <label class="court-room__label">
            <span class="court-room__label-text">Verstoß (Strafenkatalog)</span>
            <select class="input court-room__select" bind:value={penaltyId}>
              <option value="">Auswählen…</option>
              {#each penalties as p (p.id)}
                <option value={p.id}>{p.description} — {formatMoney(p.amount)}</option>
              {/each}
            </select>
          </label>
          <label class="court-room__label court-room__label--grow">
            <span class="court-room__label-text">Details (optional)</span>
            <textarea
              class="input court-room__textarea"
              rows="3"
              maxlength={500}
              placeholder="Kontext fürs Meeting…"
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
          {filing ? 'Wird eingereicht…' : 'Anklage einreichen'}
        </button>
      </div>
    {/if}

    <div class="card court-room__table-wrap">
      <h3 class="court-room__list-title">Akten</h3>
      {#if accusations.length === 0}
        <p class="court-room__empty muted">Noch keine Anklagen.</p>
      {:else}
        <div class="court-room__scroll">
          <table class="court-table">
            <thead>
              <tr>
                <th scope="col">Datum</th>
                <th scope="col">Anklage</th>
                <th scope="col">Beschuldigt</th>
                <th scope="col">Verstoß</th>
                <th scope="col" class="court-table__col-num">Strafe</th>
                <th scope="col">Status</th>
                {#if isAdmin}
                  <th scope="col" class="court-table__col-actions"></th>
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
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  {#if isAdmin}
                    <td class="court-table__actions">
                      {#if row.status === 'open'}
                        <div class="court-table__action-btns">
                          <button
                            type="button"
                            class="btn btn--sm"
                            disabled={updatingId === row.id}
                            onclick={() => void setStatus(row.id, 'dismissed')}
                          >
                            Abweisen
                          </button>
                          <button
                            type="button"
                            class="btn btn--sm btn--primary"
                            disabled={updatingId === row.id}
                            onclick={() => void setStatus(row.id, 'upheld')}
                          >
                            Bestätigen
                          </button>
                        </div>
                      {:else}
                        <span class="muted">—</span>
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
</div>

<style>
  .court-room.stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
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
    margin: 0 0 var(--space-xs) 0;
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
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
    overflow-x: auto;
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
  }

  .court-table__action-btns {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    justify-content: flex-end;
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
</style>

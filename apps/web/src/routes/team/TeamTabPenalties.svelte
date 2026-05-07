<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchTeamSettings, formatMoney, updateTeamSettings, type TeamPenalty } from '$lib/team';
  import IconEdit from '$lib/icons/IconEdit.svelte';
  import IconTrash from '$lib/icons/IconTrash.svelte';

  interface Props {
    isAdmin: boolean;
  }
  let { isAdmin }: Props = $props();

  let penalties = $state<TeamPenalty[]>([]);
  let loading = $state(true);
  let loadError = $state('');

  let editing = $state(false);
  let draft = $state<TeamPenalty[]>([]);
  let saving = $state(false);
  let saveError = $state('');

  async function loadPenalties() {
    loading = true;
    loadError = '';
    try {
      const settings = await fetchTeamSettings();
      penalties = settings.penalties ?? [];
    } catch (err) {
      loadError =
        err instanceof Error ? err.message : 'Strafenkatalog konnte nicht geladen werden.';
      penalties = [];
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void loadPenalties();
  });

  function startEdit() {
    draft = penalties.map((p) => ({ ...p }));
    saveError = '';
    editing = true;
  }

  function cancelEdit() {
    editing = false;
  }

  function addRow() {
    draft = [...draft, { id: crypto.randomUUID(), description: '', amount: 0 }];
  }

  function removeRow(id: string) {
    draft = draft.filter((p) => p.id !== id);
  }

  function patchRow(id: string, patch: Partial<Pick<TeamPenalty, 'description' | 'amount'>>) {
    draft = draft.map((p) => (p.id === id ? { ...p, ...patch } : p));
  }

  async function save() {
    const cleaned = draft
      .map((p) => ({
        id: p.id,
        description: p.description.trim(),
        amount: Number.isFinite(p.amount) && p.amount >= 0 ? p.amount : 0,
      }))
      .filter((p) => p.description.length > 0);
    saving = true;
    saveError = '';
    try {
      await updateTeamSettings({ penalties: cleaned });
      editing = false;
      await loadPenalties();
    } catch (err) {
      saveError =
        err instanceof Error ? err.message : 'Strafenkatalog konnte nicht gespeichert werden.';
    } finally {
      saving = false;
    }
  }
</script>

<div class="penalties-tab stack">
  {#if loading}
    <div class="card penalties-loading muted" aria-busy="true">Strafenkatalog wird geladen…</div>
  {:else if loadError}
    <div class="card" role="alert">
      <p class="alert">{loadError}</p>
      <button type="button" class="btn" onclick={() => void loadPenalties()}
        >Erneut versuchen</button
      >
    </div>
  {:else}
    <div class="card penalties-toolbar">
      <p class="penalties-toolbar__intro muted">
        Strafenkatalog des Teams. Strafen werden im nächsten Team Meeting geklärt. Beträge gelten
        pro Verstoß, sofern nicht anders vereinbart.
      </p>
      {#if isAdmin && !editing}
        <button type="button" class="btn btn--primary penalties-toolbar__edit" onclick={startEdit}>
          <IconEdit size={18} className="penalties-toolbar__edit-icon" />
          Katalog bearbeiten
        </button>
      {:else if isAdmin && editing}
        <div class="penalties-toolbar__actions">
          <button type="button" class="btn" onclick={addRow}>Strafe hinzufügen</button>
          <button type="button" class="btn" onclick={cancelEdit} disabled={saving}>Abbrechen</button
          >
          <button
            type="button"
            class="btn btn--primary"
            onclick={() => void save()}
            disabled={saving}
          >
            {saving ? 'Speichern…' : 'Speichern'}
          </button>
        </div>
      {/if}
    </div>

    {#if saveError}
      <p class="alert" role="alert">{saveError}</p>
    {/if}

    <div class="card penalties-tab__table-wrap">
      {#if !editing && penalties.length === 0}
        <p class="penalties-empty muted">Noch keine Strafen im Katalog.</p>
      {:else}
        <table class="penalties-table">
          <thead>
            <tr>
              <th scope="col">Verstoß</th>
              <th scope="col" class="penalties-table__col-amount">Strafe</th>
              {#if isAdmin && editing}
                <th scope="col" class="penalties-table__col-actions"></th>
              {/if}
            </tr>
          </thead>
          <tbody>
            {#if editing}
              {#each draft as row (row.id)}
                <tr class="penalties-table__row">
                  <td class="penalties-table__desc">
                    <input
                      type="text"
                      class="penalties-input penalties-input--text"
                      maxlength={500}
                      placeholder="Beschreibung"
                      value={row.description}
                      oninput={(e) => patchRow(row.id, { description: e.currentTarget.value })}
                    />
                  </td>
                  <td class="penalties-table__amount">
                    <input
                      type="number"
                      class="penalties-input penalties-input--num"
                      min="0"
                      step="0.01"
                      value={row.amount}
                      oninput={(e) => {
                        const v = parseFloat(e.currentTarget.value);
                        patchRow(row.id, {
                          amount: Number.isFinite(v) && v >= 0 ? v : 0,
                        });
                      }}
                    />
                  </td>
                  <td class="penalties-table__actions">
                    <button
                      type="button"
                      class="btn btn--icon btn--danger"
                      aria-label="Strafe entfernen"
                      onclick={() => removeRow(row.id)}
                    >
                      <IconTrash size={18} />
                    </button>
                  </td>
                </tr>
              {/each}
            {:else}
              {#each penalties as row (row.id)}
                <tr class="penalties-table__row">
                  <td class="penalties-table__desc">{row.description}</td>
                  <td class="penalties-table__amount">{formatMoney(row.amount)}</td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      {/if}
    </div>
  {/if}
</div>

<style>
  .penalties-tab.stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .penalties-loading {
    padding: var(--space-lg);
    font-size: 0.95rem;
  }

  .penalties-toolbar {
    padding: var(--space-md) var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    align-items: flex-start;
  }

  .penalties-toolbar__intro {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .penalties-toolbar__edit {
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
    align-self: flex-start;
  }

  :global(.penalties-toolbar__edit-icon) {
    flex-shrink: 0;
  }

  .penalties-toolbar__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
    align-items: center;
  }

  .penalties-tab__table-wrap {
    padding: 0;
    overflow-x: auto;
  }

  .penalties-empty {
    margin: 0;
    padding: var(--space-lg);
    font-size: 0.95rem;
  }

  .penalties-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95rem;
  }

  .penalties-table thead {
    border-bottom: 1px solid var(--border);
  }

  .penalties-table th {
    text-align: left;
    padding: var(--space-md) var(--space-lg);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    font-weight: 600;
  }

  .penalties-table__col-amount {
    text-align: right;
    white-space: nowrap;
    width: 8rem;
  }

  .penalties-table__col-actions {
    width: 3rem;
  }

  .penalties-table td {
    padding: var(--space-md) var(--space-lg);
    vertical-align: middle;
    border-bottom: 1px solid var(--border);
  }

  .penalties-table tbody tr:last-child td {
    border-bottom: none;
  }

  .penalties-table__desc {
    font-weight: 500;
    line-height: 1.4;
  }

  .penalties-table__amount {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    white-space: nowrap;
  }

  .penalties-table__actions {
    text-align: right;
    vertical-align: middle;
    padding-left: 0;
  }

  .penalties-input {
    width: 100%;
    max-width: 100%;
    padding: 0.45rem 0.55rem;
    font-size: 0.95rem;
    font-family: inherit;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--fg);
  }

  .penalties-input--num {
    max-width: 8rem;
    margin-left: auto;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .penalties-input:focus {
    outline: 2px solid color-mix(in srgb, var(--primary) 45%, transparent);
    outline-offset: 1px;
  }
</style>

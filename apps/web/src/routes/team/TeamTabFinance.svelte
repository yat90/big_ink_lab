<script lang="ts">
  import { onMount } from 'svelte';
  import {
    deleteTransaction,
    fetchMyContributions,
    fetchTeamTransactions,
    type PaginatedResult,
    type TeamTransaction,
    type TransactionType,
  } from '$lib/components/team/team-transactions';
  import { formatDate, formatMoney } from '$lib/components/team/team-utils';
  import { updateTeamSettings } from '$lib/components/team/team-settings';
  import type { TeamBalance } from '$lib/components/team/team-analytics';
  import type { AuthMePayload } from '$lib/me';
  import type { Writable } from 'svelte/store';
  import IconEdit from '$lib/icons/IconEdit.svelte';
  import IconTrash from '$lib/icons/IconTrash.svelte';
  import Pagination from '$lib/components/ui/Pagination.svelte';
  import TransactionEditModal from './TransactionEditModal.svelte';
  import TransactionTypePieChart from './TransactionTypePieChart.svelte';

  interface Props {
    isAdmin: boolean;
    balance: TeamBalance | null;
    authMeStore: Writable<AuthMePayload | null>;
    onChange: () => void;
  }
  let { isAdmin, balance, authMeStore, onChange }: Props = $props();

  let editingDues = $state(false);
  // The draft is reseeded from `balance` every time the editor opens via `startEditDues()`,
  // so capturing only the initial prop value here is intentional.
  /* svelte-ignore state_referenced_locally */
  let duesDraft = $state<number>(balance?.monthlyDues ?? 0);
  let savingDues = $state(false);
  let duesError = $state('');

  function startEditDues() {
    duesDraft = balance?.monthlyDues ?? 0;
    duesError = '';
    editingDues = true;
  }

  async function saveDues() {
    savingDues = true;
    duesError = '';
    try {
      await updateTeamSettings({
        monthlyDues: Number.isFinite(duesDraft) && duesDraft >= 0 ? duesDraft : 0,
      });
      editingDues = false;
      onChange();
    } catch (err) {
      duesError = err instanceof Error ? err.message : "Couldn't save monthly dues.";
    } finally {
      savingDues = false;
    }
  }

  let typeFilter = $state<TransactionType | ''>('');
  let page = $state(1);
  const PAGE_SIZE = 10;

  let txList = $state<PaginatedResult<TeamTransaction> | null>(null);
  let txLoading = $state(false);
  let txError = $state('');

  let myList = $state<PaginatedResult<TeamTransaction> | null>(null);
  let myLoading = $state(false);
  let myError = $state('');
  let myPage = $state(1);

  let editing = $state<TeamTransaction | null>(null);
  let creating = $state(false);
  let removingId = $state<string | null>(null);
  let removeError = $state('');

  const playerId = $derived($authMeStore?.player?._id ?? null);

  async function loadTransactions() {
    if (!isAdmin) return;
    txLoading = true;
    txError = '';
    try {
      txList = await fetchTeamTransactions({
        page,
        limit: PAGE_SIZE,
        type: typeFilter || undefined,
      });
    } catch (err) {
      txError = err instanceof Error ? err.message : "Couldn't load transactions.";
    } finally {
      txLoading = false;
    }
  }

  async function loadMine() {
    if (!playerId) return;
    myLoading = true;
    myError = '';
    try {
      myList = await fetchMyContributions({ page: myPage, limit: PAGE_SIZE });
    } catch (err) {
      myError = err instanceof Error ? err.message : "Couldn't load your contributions.";
    } finally {
      myLoading = false;
    }
  }

  async function refresh() {
    await Promise.all([loadTransactions(), loadMine()]);
    onChange();
  }

  async function handleSaved() {
    editing = null;
    creating = false;
    page = 1;
    await refresh();
  }

  async function confirmDelete(t: TeamTransaction) {
    const ok = window.confirm(`Delete this ${t.type} of ${formatMoney(t.amount)}?`);
    if (!ok) return;
    removingId = t._id;
    removeError = '';
    try {
      await deleteTransaction(t._id);
      await refresh();
    } catch (err) {
      removeError = err instanceof Error ? err.message : "Couldn't delete transaction.";
    } finally {
      removingId = null;
    }
  }

  function typeLabel(type: TransactionType): string {
    switch (type) {
      case 'contribution':
        return 'Contribution';
      case 'income':
        return 'Income';
      case 'expense':
        return 'Expense';
      case 'penalty_fine':
        return 'Penalty fine';
    }
  }

  function signFor(type: TransactionType): string {
    return type === 'expense' ? '−' : '+';
  }

  $effect(() => {
    void [page, typeFilter, isAdmin];
    void loadTransactions();
  });

  onMount(() => {
    void loadMine();
  });
</script>

<div class="finance-tab">
  <div class="card settings-card">
    <div class="settings-card__row">
      <div>
        <h2 class="card__title settings-card__title">Monthly dues</h2>
        <p class="card__sub muted settings-card__sub">
          Same amount applies to every active member. Outstanding dues are recalculated
          automatically.
        </p>
      </div>
      {#if !editingDues}
        <div class="settings-card__value">
          <span
            class="settings-card__value-text"
            class:settings-card__value-text--muted={(balance?.monthlyDues ?? 0) === 0}
          >
            {(balance?.monthlyDues ?? 0) > 0
              ? `${formatMoney(balance?.monthlyDues ?? 0)}/month`
              : 'Not set'}
          </span>
          {#if isAdmin}
            <button
              type="button"
              class="btn btn--icon"
              aria-label="Edit monthly dues"
              onclick={startEditDues}
            >
              <IconEdit size={16} className="icon-inline" />
            </button>
          {/if}
        </div>
      {:else}
        <div class="settings-card__edit">
          <input
            type="number"
            class="input settings-card__input"
            min="0"
            step="0.01"
            bind:value={duesDraft}
            aria-label="Monthly dues amount"
          />
          <button
            type="button"
            class="btn btn--primary"
            disabled={savingDues}
            onclick={() => void saveDues()}
          >
            {savingDues ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            class="btn"
            disabled={savingDues}
            onclick={() => (editingDues = false)}
          >
            Cancel
          </button>
        </div>
      {/if}
    </div>
    {#if duesError}
      <p class="alert" role="alert">{duesError}</p>
    {/if}
  </div>

  {#if balance}
    <div class="card balance-card">
      <div class="balance-card__main">
        <div class="balance-card__main-left">
          <span class="balance-card__label">Treasury</span>
          <span class="balance-card__value" class:balance-card__value--neg={balance.balance < 0}>
            {formatMoney(balance.balance)}
          </span>
        </div>
      </div>
      <div class="balance-card__lower">
        <dl class="balance-card__breakdown">
          <div>
            <dt class="muted">Contributions</dt>
            <dd>{formatMoney(balance.totals.contributions)}</dd>
          </div>
          <div>
            <dt class="muted">Penalty fines</dt>
            <dd>{formatMoney(balance.totals.penaltyFines ?? 0)}</dd>
          </div>
          <div>
            <dt class="muted">Other income</dt>
            <dd>{formatMoney(balance.totals.income)}</dd>
          </div>
          <div>
            <dt class="muted">Expenses</dt>
            <dd>−{formatMoney(balance.totals.expenses)}</dd>
          </div>
          <div>
            <dt class="muted">Outstanding dues</dt>
            <dd>{formatMoney(balance.outstandingTotal)}</dd>
          </div>
        </dl>
        <TransactionTypePieChart {balance} />
      </div>
    </div>
  {/if}

  {#if !isAdmin}
    <div class="card stack">
      <h2 class="card__title">My contributions</h2>
      <p class="card__sub muted">
        Only admins see the full transaction list. Below is your personal payment history.
      </p>
      {#if myLoading}
        <p class="muted">Loading…</p>
      {:else if myError}
        <p class="alert" role="alert">{myError}</p>
      {:else if !myList || myList.data.length === 0}
        <p class="muted">No contributions recorded yet.</p>
      {:else}
        <ul class="tx-list" role="list">
          {#each myList.data as t (t._id)}
            <li class="tx-row">
              <div class="tx-row__main">
                <div class="tx-row__title">{t.description || 'Contribution'}</div>
                <div class="tx-row__meta muted">
                  {typeLabel(t.type)} · {formatDate(t.occurredAt)}
                </div>
              </div>
              <div class="tx-row__amount tx-row__amount--positive">
                +{formatMoney(t.amount)}
              </div>
            </li>
          {/each}
        </ul>
        <Pagination
          currentPage={myList.meta.page}
          totalPages={myList.meta.totalPages}
          onPageChange={(p) => {
            myPage = p;
            void loadMine();
          }}
        />
      {/if}
    </div>
  {/if}

  {#if isAdmin}
    <div class="finance-tab__transactions">
      <div class="finance-tab__head">
        <h2 class="card__title finance-tab__title">Transactions</h2>
        <button type="button" class="btn btn--primary" onclick={() => (creating = true)}>
          New transaction
        </button>
      </div>
      <div class="finance-tab__filters">
        <label class="label">
          <span class="muted text-sm">Type</span>
          <select class="input" bind:value={typeFilter} onchange={() => (page = 1)}>
            <option value="">All</option>
            <option value="contribution">Contributions</option>
            <option value="penalty_fine">Penalty fines</option>
            <option value="income">Other income</option>
            <option value="expense">Expenses</option>
          </select>
        </label>
      </div>
      {#if removeError}
        <p class="alert" role="alert">{removeError}</p>
      {/if}
      {#if txLoading}
        <div class="card stack">
          <div class="loading-skeleton__line"></div>
          <div class="loading-skeleton__line"></div>
          <div class="loading-skeleton__line"></div>
        </div>
      {:else if txError}
        <div class="card" role="alert">
          <p class="alert">{txError}</p>
          <button type="button" class="btn" onclick={() => void loadTransactions()}>Retry</button>
        </div>
      {:else if !txList || txList.data.length === 0}
        <div class="card">
          <p class="muted">No transactions yet.</p>
        </div>
      {:else}
        <ul class="tx-list" role="list">
          {#each txList.data as t (t._id)}
            <li class="card tx-row">
              <div class="tx-row__main">
                <div class="tx-row__title">
                  <span class="tx-row__type tx-row__type--{t.type}">{typeLabel(t.type)}</span>
                  {#if t.player}
                    <span class="tx-row__who">· {t.player.name}</span>
                  {/if}
                </div>
                {#if t.description}
                  <div class="tx-row__desc">{t.description}</div>
                {/if}
                <div class="tx-row__meta muted">{formatDate(t.occurredAt)}</div>
              </div>
              <div
                class="tx-row__amount"
                class:tx-row__amount--positive={t.type !== 'expense'}
                class:tx-row__amount--negative={t.type === 'expense'}
              >
                {signFor(t.type)}{formatMoney(t.amount)}
              </div>
              <div class="tx-row__actions">
                <button
                  type="button"
                  class="btn btn--icon"
                  aria-label="Edit transaction"
                  onclick={() => (editing = t)}
                >
                  <IconEdit size={16} className="icon-inline" />
                </button>
                <button
                  type="button"
                  class="btn btn--icon btn--danger"
                  aria-label="Delete transaction"
                  disabled={removingId === t._id}
                  onclick={() => void confirmDelete(t)}
                >
                  <IconTrash size={16} className="icon-inline" />
                </button>
              </div>
            </li>
          {/each}
        </ul>
        <Pagination
          currentPage={txList.meta.page}
          totalPages={txList.meta.totalPages}
          onPageChange={(p) => (page = p)}
        />
      {/if}
    </div>
  {/if}
</div>

{#if editing || creating}
  <TransactionEditModal
    transaction={editing}
    onClose={() => {
      editing = null;
      creating = false;
    }}
    onSaved={handleSaved}
  />
{/if}

<style>
  .finance-tab {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .settings-card {
    padding: var(--space-lg);
  }

  .settings-card__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    flex-wrap: wrap;
  }

  .settings-card__title {
    margin: 0;
    font-size: 1rem;
  }

  .settings-card__sub {
    margin: var(--space-xs) 0 0 0;
    font-size: 0.85rem;
  }

  .settings-card__value {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .settings-card__value-text {
    font-weight: 700;
    font-size: 1.05rem;
  }

  .settings-card__value-text--muted {
    color: var(--muted);
    font-weight: 600;
  }

  .settings-card__edit {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .settings-card__input {
    width: 7rem;
  }

  .balance-card {
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  @media (min-width: 640px) {
    .balance-card {
      padding: var(--space-lg);
      gap: var(--space-lg);
    }
  }

  .balance-card__main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    flex-wrap: wrap;
  }

  .balance-card__main-left {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .balance-card__label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    font-weight: 700;
    color: var(--muted);
  }

  .balance-card__value {
    font-size: clamp(1.6rem, 4vw, 2.2rem);
    font-weight: 800;
    color: var(--ok);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.03em;
    line-height: 1;
  }

  .balance-card__value--neg {
    color: var(--danger);
  }

  .balance-card__lower {
    display: grid;
    gap: var(--space-lg);
    grid-template-columns: 1fr;
    align-items: start;
  }

  @media (min-width: 720px) {
    .balance-card__lower {
      grid-template-columns: minmax(0, 1fr) minmax(240px, 1fr);
    }
  }

  .balance-card__breakdown {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
    gap: var(--space-sm);
    margin: 0;
  }

  .balance-card__breakdown div {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-sm);
    background: var(--glass-bg);
    border: 1px solid var(--border);
  }

  .balance-card__breakdown dt {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    font-weight: 600;
  }

  .balance-card__breakdown dd {
    margin: 0;
    font-weight: 700;
    font-size: 0.95rem;
    font-variant-numeric: tabular-nums;
  }

  .finance-tab__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    flex-wrap: wrap;
  }

  .finance-tab__title {
    margin: 0;
  }

  .finance-tab__filters {
    display: flex;
    gap: var(--space-md);
    margin-top: var(--space-sm);
    margin-bottom: var(--space-md);
  }

  .finance-tab__filters select {
    min-width: 10rem;
  }

  .tx-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .tx-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: var(--space-md);
    align-items: center;
    padding: var(--space-md) var(--space-lg);
  }

  @media (max-width: 640px) {
    .tx-row {
      grid-template-columns: 1fr auto;
    }
    .tx-row__actions {
      grid-column: 1 / -1;
      justify-self: end;
    }
  }

  .tx-row__main {
    min-width: 0;
  }

  .tx-row__title {
    font-weight: 700;
    font-size: 1rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .tx-row__type {
    display: inline-flex;
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius-full);
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border: 1px solid var(--border);
  }

  .tx-row__type--contribution {
    color: var(--primary);
    background: rgba(168, 85, 247, 0.12);
    border-color: var(--primary);
  }

  .tx-row__type--income {
    color: var(--ok);
    background: rgba(34, 197, 94, 0.12);
    border-color: var(--ok);
  }

  .tx-row__type--expense {
    color: var(--danger);
    background: var(--danger-soft);
    border-color: var(--danger-border);
  }

  .tx-row__type--penalty_fine {
    color: var(--gold);
    background: var(--gold-dim);
    border-color: color-mix(in srgb, var(--gold) 45%, transparent);
  }

  .tx-row__who {
    font-weight: 500;
    color: var(--muted);
  }

  .tx-row__desc {
    margin-top: var(--space-xs);
    font-size: 0.9rem;
  }

  .tx-row__meta {
    margin-top: 0.15rem;
    font-size: 0.8rem;
  }

  .tx-row__amount {
    font-weight: 700;
    font-size: 1.05rem;
    text-align: right;
  }

  .tx-row__amount--positive {
    color: var(--ok);
  }

  .tx-row__amount--negative {
    color: var(--danger);
  }

  .tx-row__actions {
    display: flex;
    gap: var(--space-sm);
  }

  .text-sm {
    font-size: 0.85rem;
  }
</style>

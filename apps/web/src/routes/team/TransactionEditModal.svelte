<script lang="ts">
  import { onMount } from 'svelte';
  import AppBanner from '$lib/components/ui/AppBanner.svelte';
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import AppCard from '$lib/components/ui/AppCard.svelte';
  import { focusTrap, scrollLock } from '$lib/a11y';
  import { portal } from '$lib/portal';
  import { fetchTeamMembers, type TeamMember } from '$lib/components/team/team-members';
  import {
    createTransaction,
    updateTransaction,
    type TeamTransaction,
    type TransactionType,
  } from '$lib/components/team/team-transactions';
  import { toDateInputValue } from '$lib/components/team/team-utils';

  interface Props {
    /** When null, the modal is in create mode. */
    transaction: TeamTransaction | null;
    onClose: () => void;
    onSaved: () => void;
  }
  let { transaction, onClose, onSaved }: Props = $props();

  /** Default amount pre-filled when creating a new transaction (matches the typical monthly dues). */
  const DEFAULT_NEW_TRANSACTION_AMOUNT = 20;

  // The modal is recreated on each open, so capturing the initial transaction values is intentional.
  /* svelte-ignore state_referenced_locally */
  const isEdit = !!transaction;

  /* svelte-ignore state_referenced_locally */
  let type = $state<TransactionType>(transaction?.type ?? 'contribution');
  /* svelte-ignore state_referenced_locally */
  let amount = $state<number>(transaction?.amount ?? DEFAULT_NEW_TRANSACTION_AMOUNT);
  /* svelte-ignore state_referenced_locally */
  let description = $state(transaction?.description ?? '');
  /* svelte-ignore state_referenced_locally */
  let occurredAt = $state(toDateInputValue(transaction?.occurredAt ?? new Date().toISOString()));
  /* svelte-ignore state_referenced_locally */
  let playerId = $state(transaction?.player?._id ?? '');
  let members = $state<TeamMember[]>([]);
  let loadingMembers = $state(true);
  let saving = $state(false);
  let error = $state('');

  async function loadMembers() {
    loadingMembers = true;
    try {
      members = await fetchTeamMembers();
    } catch {
      members = [];
    } finally {
      loadingMembers = false;
    }
  }

  async function submit(e: Event) {
    e.preventDefault();
    if ((type === 'contribution' || type === 'penalty_fine') && !playerId) {
      error =
        type === 'penalty_fine'
          ? 'Pick the member paying the penalty fine.'
          : 'Pick the contributing member.';
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      error = 'Amount must be greater than 0.';
      return;
    }
    saving = true;
    error = '';
    try {
      const payload = {
        type,
        amount,
        description: description.trim() || undefined,
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
        playerId: playerId || undefined,
      };
      if (isEdit && transaction) {
        await updateTransaction(transaction._id, payload);
      } else {
        await createTransaction(payload);
      }
      onSaved();
    } catch (err) {
      error = err instanceof Error ? err.message : "Couldn't save transaction.";
    } finally {
      saving = false;
    }
  }

  $effect(() => {
    if (type !== 'contribution' && type !== 'penalty_fine') return;
    if (!playerId && members.length > 0) {
      playerId = members[0].playerId;
    }
  });

  onMount(loadMembers);
</script>

<div use:portal>
  <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="tx-modal-title">
    <button type="button" class="modal-backdrop" aria-label="Close" onclick={onClose}></button>
    <div class="modal-card" use:focusTrap use:scrollLock>
      <AppCard>
      <h2 id="tx-modal-title" class="card__title">
        {isEdit ? 'Edit transaction' : 'New transaction'}
      </h2>
        <form class="stack" onsubmit={submit}>
        <label class="label">
          Type
          <select class="input" bind:value={type}>
            <option value="contribution">Contribution (member dues)</option>
            <option value="penalty_fine">Penalty fine (Strafgeld)</option>
            <option value="income">Other income (sponsor, prize…)</option>
            <option value="expense">Expense</option>
          </select>
        </label>

        <label class="label">
          Amount
          <input type="number" class="input" min="0.01" step="0.01" bind:value={amount} required />
        </label>

        {#if type === 'contribution' || type === 'penalty_fine' || type === 'expense'}
          <label class="label">
            {#if type === 'contribution'}
              Member <span aria-hidden="true">*</span>
            {:else if type === 'penalty_fine'}
              Member paying fine <span aria-hidden="true">*</span>
            {:else}
              Linked member
              <span class="hint">Optional — leave empty for a team-wide expense.</span>
            {/if}
            {#if loadingMembers}
              <input class="input" value="Loading members…" disabled />
            {:else if members.length === 0}
              <p class="hint">Add at least one member first.</p>
            {:else if type === 'contribution' || type === 'penalty_fine'}
              <select class="input" bind:value={playerId} required>
                {#each members as m (m.playerId)}
                  <option value={m.playerId}>{m.name}</option>
                {/each}
              </select>
            {:else}
              <select class="input" bind:value={playerId}>
                <option value="">Team expense (no member)</option>
                {#each members as m (m.playerId)}
                  <option value={m.playerId}>{m.name}</option>
                {/each}
              </select>
            {/if}
          </label>
        {/if}

        <label class="label">
          Date
          <input type="date" class="input" bind:value={occurredAt} required />
        </label>

        <label class="label">
          Description
          <textarea
            class="input"
            rows="2"
            maxlength="500"
            placeholder="Optional — what was this for?"
            bind:value={description}
          ></textarea>
        </label>

        {#if error}
          <AppBanner variant="danger" message={error} />
        {/if}

        <div class="row" style="gap: 12px; margin-top: 8px;">
          <AppButton type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create transaction'}
          </AppButton>
          <AppButton type="button" onclick={onClose} disabled={saving}>Cancel</AppButton>
        </div>
        </form>
      </AppCard>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .modal-backdrop {
    position: absolute;
    inset: 0;
    border: none;
    padding: 0;
    background: rgba(0, 0, 0, 0.55);
    cursor: pointer;
  }
  .modal-card {
    position: relative;
    z-index: 1;
    max-width: 480px;
    width: 100%;
  }
</style>

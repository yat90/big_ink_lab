<script lang="ts">
  import AppBanner from '$lib/components/ui/AppBanner.svelte';
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import AppCard from '$lib/components/ui/AppCard.svelte';
  import { focusTrap, scrollLock } from '$lib/a11y';
  import { portal } from '$lib/portal';
  import { updateTeamMember, type MemberStatus, type TeamMember } from '$lib/team-members';
  import { toDateInputValue } from '$lib/team-transactions';
  import type { MeRole } from '$lib/me';

  interface Props {
    member: TeamMember;
    isCurrentUser: boolean;
    onClose: () => void;
    onSaved: () => void;
  }
  let { member, isCurrentUser, onClose, onSaved }: Props = $props();

  // The modal is recreated on each open, so capturing the initial member values is intentional.
  /* svelte-ignore state_referenced_locally */
  let status = $state<MemberStatus>(member.status);
  /* svelte-ignore state_referenced_locally */
  let role = $state<MeRole | null>(member.role);
  /* svelte-ignore state_referenced_locally */
  let notes = $state(member.notes);
  /* svelte-ignore state_referenced_locally */
  let joinedAt = $state(toDateInputValue(member.joinedAt));
  let saving = $state(false);
  let error = $state('');

  async function save(e: Event) {
    e.preventDefault();
    saving = true;
    error = '';
    try {
      await updateTeamMember(member.playerId, {
        status,
        notes,
        joinedAt: joinedAt ? new Date(joinedAt).toISOString() : undefined,
        role: member.hasAccount && role ? role : undefined,
      });
      onSaved();
    } catch (err) {
      error = err instanceof Error ? err.message : "Couldn't save member.";
    } finally {
      saving = false;
    }
  }
</script>

<div use:portal>
  <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-member-title">
    <button type="button" class="modal-backdrop" aria-label="Close" onclick={onClose}></button>
    <div class="modal-card" use:focusTrap={{ focusRoot: true }} use:scrollLock>
      <AppCard>
      <h2 id="edit-member-title" class="card__title">Edit {member.name}</h2>
      <p class="card__sub muted" style="margin-top: 0;">
        Monthly dues are configured team-wide on the Finance tab.
      </p>
        <form class="stack" onsubmit={save}>
        <label class="label">
          Joined on
          <input type="date" class="input" bind:value={joinedAt} />
        </label>

        <label class="label">
          Status
          <select class="input" bind:value={status}>
            <option value="active">Active</option>
            <option value="padawan">Padawan (in training)</option>
            <option value="inactive">Inactive</option>
          </select>
          <span class="hint">Padawan and inactive members don't accrue monthly dues.</span>
        </label>

        {#if member.hasAccount}
          <label class="label">
            Role
            <select
              class="input"
              bind:value={role}
              disabled={isCurrentUser && member.role === 'admin'}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            {#if isCurrentUser && member.role === 'admin'}
              <span class="hint">You can't demote yourself.</span>
            {/if}
          </label>
        {:else}
          <p class="hint">No login account is linked to this player — role can't be changed.</p>
        {/if}

        <label class="label">
          Notes
          <textarea
            class="input"
            rows="3"
            maxlength="500"
            placeholder="Optional — internal notes for the team."
            bind:value={notes}
          ></textarea>
        </label>

        {#if error}
          <AppBanner variant="danger" message={error} />
        {/if}

        <div class="row" style="gap: 12px; margin-top: 8px;">
          <AppButton type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
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
    max-width: 460px;
    width: 100%;
  }
</style>

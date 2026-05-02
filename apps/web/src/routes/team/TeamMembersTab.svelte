<script lang="ts">
  import { onMount } from 'svelte';
  import {
    fetchTeamMembers,
    formatDate,
    formatMoney,
    removeTeamMember,
    resetTeamMemberPassword,
    type TeamMember,
  } from '$lib/team';
  import IconEdit from '$lib/icons/IconEdit.svelte';
  import IconRefresh from '$lib/icons/IconRefresh.svelte';
  import IconTrash from '$lib/icons/IconTrash.svelte';
  import MemberEditModal from './MemberEditModal.svelte';
  import AddMemberModal from './AddMemberModal.svelte';

  interface Props {
    isAdmin: boolean;
    team: string;
    currentPlayerId: string | null;
    onChange: () => void;
  }
  let { isAdmin, team, currentPlayerId, onChange }: Props = $props();

  let members = $state<TeamMember[]>([]);
  let loading = $state(true);
  let error = $state('');
  let search = $state('');
  let editing = $state<TeamMember | null>(null);
  let adding = $state(false);
  let removingPlayerId = $state<string | null>(null);
  let removeError = $state('');
  let passwordResetError = $state('');
  let resettingPlayerId = $state<string | null>(null);
  let resetPasswordFor = $state<{ name: string; temporaryPassword: string } | null>(null);
  let resetPasswordCopied = $state(false);

  const filteredMembers = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.email ?? '').toLowerCase().includes(q) ||
        (m.notes ?? '').toLowerCase().includes(q),
    );
  });

  async function load() {
    loading = true;
    error = '';
    try {
      members = await fetchTeamMembers();
    } catch (err) {
      error = err instanceof Error ? err.message : "Couldn't load members.";
    } finally {
      loading = false;
    }
  }

  async function confirmRemove(member: TeamMember) {
    const ok = window.confirm(
      `Remove ${member.name} from the team? Their contributions will be kept.`,
    );
    if (!ok) return;
    removingPlayerId = member.playerId;
    removeError = '';
    try {
      await removeTeamMember(member.playerId);
      await load();
      onChange();
    } catch (err) {
      removeError = err instanceof Error ? err.message : "Couldn't remove member.";
    } finally {
      removingPlayerId = null;
    }
  }

  function openEdit(member: TeamMember) {
    editing = member;
  }

  async function handleEditSaved() {
    editing = null;
    await load();
    onChange();
  }

  async function handleAdded() {
    adding = false;
    await load();
    onChange();
  }

  async function confirmResetPassword(member: TeamMember) {
    const ok = window.confirm(
      `Reset the login password for ${member.name}? You'll see a temporary password to share with them once.`,
    );
    if (!ok) return;
    passwordResetError = '';
    resettingPlayerId = member.playerId;
    try {
      const { temporaryPassword } = await resetTeamMemberPassword(member.playerId);
      resetPasswordFor = { name: member.name, temporaryPassword };
      resetPasswordCopied = false;
    } catch (err) {
      passwordResetError = err instanceof Error ? err.message : "Couldn't reset password.";
    } finally {
      resettingPlayerId = null;
    }
  }

  async function copyResetPassword() {
    if (!resetPasswordFor) return;
    try {
      await navigator.clipboard.writeText(resetPasswordFor.temporaryPassword);
      resetPasswordCopied = true;
    } catch {
      resetPasswordCopied = false;
    }
  }

  function closeResetPasswordModal() {
    resetPasswordFor = null;
    resetPasswordCopied = false;
  }

  onMount(load);
</script>

<div class="members-tab">
  <div class="members-tab__header">
    <div class="members-tab__search-row">
      <input
        type="search"
        class="input members-tab__search"
        placeholder="Search by name, email or notes…"
        bind:value={search}
        aria-label="Search members"
      />
      {#if isAdmin}
        <button type="button" class="btn btn--primary" onclick={() => (adding = true)}>
          Add member
        </button>
      {/if}
    </div>
    {#if !isAdmin}
      <p class="muted text-sm members-tab__note">
        Only team admins can edit member profiles. Ask an admin to update your dues, role or
        notes.
      </p>
    {/if}
  </div>

  {#if loading}
    <div class="card stack" aria-busy="true" aria-live="polite">
      <div class="loading-skeleton__line loading-skeleton__line--short"></div>
      <div class="loading-skeleton__line"></div>
      <div class="loading-skeleton__line"></div>
    </div>
  {:else if error}
    <div class="card" role="alert">
      <p class="alert">{error}</p>
      <button type="button" class="btn" onclick={load}>Retry</button>
    </div>
  {:else if members.length === 0}
    <div class="card stack">
      <h2 class="card__title">No members yet</h2>
      <p class="card__sub">
        {#if isAdmin}
          Add a player to <strong>{team}</strong> to start tracking dues and balance.
        {:else}
          Once your admin adds members they'll appear here.
        {/if}
      </p>
    </div>
  {:else if filteredMembers.length === 0}
    <div class="card stack">
      <p class="card__sub">No members match "{search}".</p>
    </div>
  {:else}
    {#if removeError}
      <p class="alert" role="alert">{removeError}</p>
    {/if}
    {#if passwordResetError}
      <p class="alert" role="alert">{passwordResetError}</p>
    {/if}
    <ul class="member-list" role="list">
      {#each filteredMembers as member (member.playerId)}
        <li class="card member-row">
          <div class="member-row__main">
            <div class="member-row__title">
              <a href="/players/{member.playerId}" class="member-row__name">{member.name}</a>
              {#if member.role === 'admin'}
                <span class="member-row__badge member-row__badge--admin">Admin</span>
              {/if}
              {#if member.status === 'padawan'}
                <span class="member-row__badge member-row__badge--padawan">Padawan</span>
              {:else if member.status === 'inactive'}
                <span class="member-row__badge member-row__badge--inactive">Inactive</span>
              {/if}
              {#if member.playerId === currentPlayerId}
                <span class="member-row__badge member-row__badge--you">You</span>
              {/if}
            </div>
            <div class="member-row__meta muted">
              {#if member.email}<span>{member.email}</span>{/if}
              <span>· Joined {formatDate(member.joinedAt)}</span>
            </div>
            {#if member.notes}
              <p class="member-row__notes muted">{member.notes}</p>
            {/if}
          </div>
          <div class="member-row__finance">
            <div class="member-row__amount">
              <span class="muted text-sm">Paid</span>
              <strong>{formatMoney(member.contributedTotal)}</strong>
            </div>
            <div class="member-row__amount" class:member-row__amount--warn={member.outstanding > 0}>
              <span class="muted text-sm">Outstanding</span>
              <strong>{formatMoney(member.outstanding)}</strong>
            </div>
          </div>
          {#if isAdmin}
            <div class="member-row__actions">
              <button
                type="button"
                class="btn btn--icon"
                aria-label="Edit member"
                onclick={() => openEdit(member)}
              >
                <IconEdit size={16} className="icon-inline" />
              </button>
              <button
                type="button"
                class="btn btn--icon"
                aria-label="Reset login password"
                disabled={!member.hasAccount || resettingPlayerId === member.playerId}
                title={!member.hasAccount
                  ? 'No login account linked to this player'
                  : 'Set a new temporary password'}
                onclick={() => void confirmResetPassword(member)}
              >
                <IconRefresh size={16} className="icon-inline" />
              </button>
              <button
                type="button"
                class="btn btn--icon btn--danger"
                aria-label="Remove member"
                disabled={removingPlayerId === member.playerId || member.playerId === currentPlayerId}
                title={member.playerId === currentPlayerId ? "You can't remove yourself" : 'Remove from team'}
                onclick={() => void confirmRemove(member)}
              >
                <IconTrash size={16} className="icon-inline" />
              </button>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

{#if editing}
  <MemberEditModal
    member={editing}
    isCurrentUser={editing.playerId === currentPlayerId}
    onClose={() => (editing = null)}
    onSaved={handleEditSaved}
  />
{/if}

{#if adding}
  <AddMemberModal
    team={team}
    existingPlayerIds={new Set(members.map((m) => m.playerId))}
    onClose={() => (adding = false)}
    onAdded={handleAdded}
  />
{/if}

{#if resetPasswordFor}
  <div
    class="reset-pw-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="reset-pw-title"
    tabindex="-1"
    onclick={(e) => e.target === e.currentTarget && closeResetPasswordModal()}
    onkeydown={(e) => {
      if (e.key === 'Escape') closeResetPasswordModal();
    }}
  >
    <div class="card reset-pw-dialog">
      <h2 id="reset-pw-title" class="card__title">New temporary password</h2>
      <p class="card__sub">
        Share this with <strong>{resetPasswordFor.name}</strong> once. They can log in at the usual
        login page.
      </p>
      <div class="reset-pw-value" role="group" aria-label="Temporary password">
        <code class="reset-pw-code">{resetPasswordFor.temporaryPassword}</code>
        <button type="button" class="btn btn--primary" onclick={() => void copyResetPassword()}>
          {resetPasswordCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {#if resetPasswordCopied}
        <p class="muted text-sm reset-pw-copied" role="status">Copied to clipboard.</p>
      {/if}
      <p class="muted text-sm">
        For security, this dialog won’t appear again — store or send the password before closing.
      </p>
      <div class="reset-pw-actions">
        <button type="button" class="btn btn--primary" onclick={closeResetPasswordModal}>
          Done
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .members-tab__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
  }

  .members-tab__search-row {
    display: flex;
    gap: var(--space-md);
    flex-wrap: wrap;
    align-items: stretch;
  }

  .members-tab__search {
    flex: 1;
    min-width: 14rem;
  }

  .members-tab__note {
    margin: 0;
  }

  .member-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .member-row {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto;
    gap: var(--space-md);
    align-items: center;
    padding: var(--space-md) var(--space-lg);
  }

  @media (max-width: 760px) {
    .member-row {
      grid-template-columns: 1fr;
    }
  }

  .member-row__main {
    min-width: 0;
  }

  .member-row__title {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .member-row__name {
    font-weight: 700;
    font-size: 1rem;
    text-decoration: none;
    color: var(--fg);
  }

  .member-row__name:hover {
    text-decoration: underline;
  }

  .member-row__badge {
    display: inline-flex;
    align-items: center;
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius-full);
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border: 1px solid var(--border);
  }

  .member-row__badge--admin {
    color: var(--gold);
    border-color: var(--gold-dim);
    background: var(--gold-dim);
  }

  .member-row__badge--inactive {
    color: var(--muted);
    background: var(--glass-bg-strong);
  }

  .member-row__badge--padawan {
    color: var(--ok);
    border-color: var(--ok);
    background: var(--ok-glow);
  }

  .member-row__badge--you {
    color: var(--primary);
    border-color: var(--primary);
    background: rgba(168, 85, 247, 0.12);
  }

  .member-row__meta {
    margin-top: var(--space-xs);
    font-size: 0.85rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .member-row__notes {
    margin: var(--space-sm) 0 0 0;
    font-size: 0.85rem;
    font-style: italic;
  }

  .member-row__finance {
    display: flex;
    gap: var(--space-lg);
    align-items: center;
  }

  .member-row__amount {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 5rem;
  }

  .member-row__amount strong {
    font-weight: 700;
    font-size: 1rem;
  }

  .member-row__amount--warn strong {
    color: var(--gold);
  }

  .member-row__actions {
    display: flex;
    gap: var(--space-sm);
  }

  .text-sm {
    font-size: 0.85rem;
  }

  .reset-pw-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-md);
    background: rgba(0, 0, 0, 0.55);
  }

  .reset-pw-dialog {
    max-width: 28rem;
    width: 100%;
  }

  .reset-pw-value {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
    align-items: center;
    margin: var(--space-md) 0;
  }

  .reset-pw-code {
    flex: 1;
    min-width: 0;
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    background: var(--glass-bg-strong);
    border: 1px solid var(--border);
    font-size: 0.95rem;
    word-break: break-all;
  }

  .reset-pw-copied {
    margin: 0 0 var(--space-sm) 0;
  }

  .reset-pw-actions {
    margin-top: var(--space-lg);
  }
</style>

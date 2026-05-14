<script lang="ts">
  import { onMount } from 'svelte';
  import {
    fetchTeamMembers,
    removeTeamMember,
    resetTeamMemberPassword,
    type TeamMember,
  } from '$lib/components/team/team-members';
  import { formatDate, formatMoney } from '$lib/components/team/team-utils';
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
        (m.notes ?? '').toLowerCase().includes(q)
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
      `Remove ${member.name} from the team? Their contributions will be kept.`
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
      `Reset the login password for ${member.name}? You'll see a temporary password to share with them once.`
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
        Only team admins can edit member profiles. Ask an admin to update your dues, role or notes.
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
        <li class="card member-card">
          <div class="member-card__main">
            <div
              class="member-card__avatar"
              class:member-card__avatar--inactive={member.status === 'inactive'}
              aria-hidden="true"
            >
              {member.name[0].toUpperCase()}
            </div>
            <div class="member-card__body">
              <div class="member-card__title-row">
                <a href="/players/{member.playerId}" class="member-card__name">{member.name}</a>
                {#if member.role === 'admin'}
                  <span class="member-badge member-badge--admin">Admin</span>
                {/if}
                {#if member.status === 'padawan'}
                  <span class="member-badge member-badge--padawan">Padawan</span>
                {:else if member.status === 'inactive'}
                  <span class="member-badge member-badge--inactive">Inactive</span>
                {/if}
                {#if member.playerId === currentPlayerId}
                  <span class="member-badge member-badge--you">You</span>
                {/if}
              </div>
              <div class="member-card__meta muted">
                {#if member.email}<span>{member.email}</span>{/if}
                <span>Joined {formatDate(member.joinedAt)}</span>
              </div>
              <div class="member-card__finance">
                <span class="member-card__fin-item">
                  <span class="member-card__fin-label muted">Paid</span>
                  <strong class="member-card__fin-value">{formatMoney(member.contributedTotal)}</strong>
                </span>
                <span class="member-card__fin-sep" aria-hidden="true">·</span>
                <span
                  class="member-card__fin-item"
                  class:member-card__fin-item--warn={member.outstanding > 0}
                >
                  <span class="member-card__fin-label muted">Owed</span>
                  <strong class="member-card__fin-value">{formatMoney(member.outstanding)}</strong>
                </span>
              </div>
              {#if member.notes}
                <p class="member-card__notes muted">{member.notes}</p>
              {/if}
            </div>
          </div>
          {#if isAdmin}
            <div class="member-card__actions">
              <button
                type="button"
                class="btn btn--icon btn--sm"
                aria-label="Edit member"
                onclick={() => openEdit(member)}
              >
                <IconEdit size={15} className="icon-inline" />
              </button>
              <button
                type="button"
                class="btn btn--icon btn--sm"
                aria-label="Reset login password"
                disabled={!member.hasAccount || resettingPlayerId === member.playerId}
                title={!member.hasAccount
                  ? 'No login account linked to this player'
                  : 'Set a new temporary password'}
                onclick={() => void confirmResetPassword(member)}
              >
                <IconRefresh size={15} className="icon-inline" />
              </button>
              <button
                type="button"
                class="btn btn--icon btn--sm btn--danger"
                aria-label="Remove member"
                disabled={removingPlayerId === member.playerId ||
                  member.playerId === currentPlayerId}
                title={member.playerId === currentPlayerId
                  ? "You can't remove yourself"
                  : 'Remove from team'}
                onclick={() => void confirmRemove(member)}
              >
                <IconTrash size={15} className="icon-inline" />
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
    {team}
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
        Share this with <strong>{resetPasswordFor.name}</strong> once. They can log in at the usual login
        page.
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
    gap: var(--space-xs);
  }

  .member-card {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-sm);
    align-items: start;
    padding: var(--space-md);
  }

  @media (min-width: 640px) {
    .member-card {
      padding: var(--space-md) var(--space-lg);
    }
  }

  .member-card__main {
    display: flex;
    gap: var(--space-md);
    min-width: 0;
    align-items: flex-start;
  }

  .member-card__avatar {
    flex-shrink: 0;
    width: 2.2rem;
    height: 2.2rem;
    border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--primary) 18%, transparent);
    color: var(--primary);
    font-size: 0.88rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    letter-spacing: 0.02em;
    user-select: none;
    text-transform: uppercase;
  }

  .member-card__avatar--inactive {
    background: var(--glass-bg-strong);
    color: var(--muted);
  }

  .member-card__body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .member-card__title-row {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    flex-wrap: wrap;
    line-height: 1.3;
  }

  .member-card__name {
    font-weight: 700;
    font-size: 0.95rem;
    text-decoration: none;
    color: var(--fg);
  }

  .member-card__name:hover {
    text-decoration: underline;
  }

  .member-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.1rem 0.45rem;
    border-radius: var(--radius-full);
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border: 1px solid var(--border);
  }

  .member-badge--admin {
    color: var(--gold);
    border-color: var(--gold-dim);
    background: var(--gold-dim);
  }

  .member-badge--inactive {
    color: var(--muted);
    background: var(--glass-bg-strong);
  }

  .member-badge--padawan {
    color: var(--ok);
    border-color: var(--ok);
    background: var(--ok-glow);
  }

  .member-badge--you {
    color: var(--primary);
    border-color: var(--primary);
    background: rgba(168, 85, 247, 0.12);
  }

  .member-card__meta {
    font-size: 0.78rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.45rem;
  }

  .member-card__finance {
    display: flex;
    align-items: baseline;
    gap: var(--space-xs);
    flex-wrap: wrap;
    font-size: 0.82rem;
  }

  .member-card__fin-item {
    display: inline-flex;
    align-items: baseline;
    gap: 0.2rem;
  }

  .member-card__fin-label {
    font-size: 0.75rem;
  }

  .member-card__fin-value {
    font-weight: 700;
  }

  .member-card__fin-item--warn .member-card__fin-value {
    color: var(--gold);
  }

  .member-card__fin-sep {
    color: var(--muted);
    font-size: 0.75rem;
  }

  .member-card__notes {
    margin: 0.1rem 0 0;
    font-size: 0.78rem;
    font-style: italic;
  }

  .member-card__actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    align-items: flex-end;
  }

  @media (min-width: 480px) {
    .member-card__actions {
      flex-direction: row;
      align-items: center;
    }
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

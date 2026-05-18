<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    fetchTeamMembers,
    removeTeamMember,
    resetTeamMemberPassword,
    type TeamMember,
  } from '$lib/components/team/team-members';
  import { formatDate, formatMoney } from '$lib/components/team/team-utils';
  import { t } from '$lib/i18n';
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import IconEdit from '$lib/icons/IconEdit.svelte';
  import IconRefresh from '$lib/icons/IconRefresh.svelte';
  import IconTrash from '$lib/icons/IconTrash.svelte';
  import IconUsers from '$lib/icons/IconUsers.svelte';
  import MemberEditModal from './MemberEditModal.svelte';
  import AddMemberModal from './AddMemberModal.svelte';
  import { dicebearAvatarUrl } from '$lib/dicebearFunEmojiAvatar';

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

  async function afterLoadInviteFlow() {
    const invite = get(page).url.searchParams.get('invite');
    if (invite === '1' && isAdmin) {
      adding = true;
      void goto('/team?tab=members', { replaceState: true, noScroll: true, keepFocus: true });
    }
  }

  onMount(() => {
    void (async () => {
      await load();
      await afterLoadInviteFlow();
    })();
  });

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

  function openAddMember() {
    adding = true;
  }
</script>

<div class="members-tab">
  <div class="members-tab__header">
    <h2 class="members-tab__title">{$t('team.members.title')}</h2>
    <div class="members-tab__search-row">
      <input
        type="search"
        class="input members-tab__search"
        placeholder={$t('team.members.searchPlaceholder')}
        bind:value={search}
        aria-label={$t('team.members.searchPlaceholder')}
      />
      {#if isAdmin}
        <button type="button" class="btn btn--primary members-tab__add-inline" onclick={openAddMember}>
          {$t('team.members.addMember')}
        </button>
      {/if}
    </div>
    {#if !isAdmin}
      <p class="muted text-sm members-tab__note">
        {$t('team.members.adminNote')}
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
      <button type="button" class="btn" onclick={load}>{$t('common.retry')}</button>
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
      {#if isAdmin}
        <AppButton variant="primary" className="members-tab__empty-cta" icon={true} onclick={openAddMember}>
          <IconUsers size={18} className="icon-inline" />
          <span style="margin-left: var(--space-xs);">{$t('team.members.inviteCta')}</span>
        </AppButton>
      {/if}
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
          <div class="member-card__row">
            <img
              class="member-card__avatar"
              class:member-card__avatar--inactive={member.status === 'inactive'}
              src={dicebearAvatarUrl(member.name, { size: 88 })}
              alt=""
              width="44"
              height="44"
              loading="lazy"
              decoding="async"
            />
            <div class="member-card__mid">
              <div class="member-card__title-line">
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
              <p class="member-card__role muted">
                {member.role === 'admin' ? $t('team.members.roleAdmin') : $t('team.members.roleMember')}
              </p>
              <div class="member-card__meta muted">
                {#if member.email}<span>{member.email}</span>{/if}
                <span>{$t('team.members.joined')} {formatDate(member.joinedAt)}</span>
              </div>
              {#if member.notes}
                <p class="member-card__notes muted">{member.notes}</p>
              {/if}
            </div>
          </div>
          <div class="member-card__amounts">
            <div class="member-card__amount">
              <span class="member-card__amount-label muted">{$t('team.members.owed')}</span>
              <strong class="member-card__amount-value member-card__amount-value--owed">{formatMoney(member.outstanding)}</strong>
            </div>
            <div class="member-card__amount">
              <span class="member-card__amount-label muted">{$t('team.members.penalties')}</span>
              <strong class="member-card__amount-value member-card__amount-value--penalties">{formatMoney(member.penaltiesTotal)}</strong>
            </div>
            <div class="member-card__amount">
              <span class="member-card__amount-label muted">{$t('team.members.contributed')}</span>
              <strong class="member-card__amount-value">{formatMoney(member.contributedTotal)}</strong>
            </div>
          </div>
          {#if isAdmin}
            <div class="member-card__admin">
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

  {#if isAdmin && !loading && members.length > 0}
    <div class="members-tab__footer">
      <AppButton variant="primary" className="members-tab__invite-btn" icon={true} onclick={openAddMember}>
        <IconUsers size={18} className="icon-inline" />
        <span style="margin-left: var(--space-xs);">{$t('team.members.inviteCta')}</span>
      </AppButton>
    </div>
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

  .members-tab__title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: -0.02em;
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

  .members-tab__add-inline {
    flex-shrink: 0;
    align-self: stretch;
  }

  @media (max-width: 479px) {
    .members-tab__add-inline {
      width: 100%;
    }
  }

  .members-tab__note {
    margin: 0;
  }

  .members-tab__footer {
    margin-top: var(--space-lg);
    padding-top: var(--space-md);
    border-top: 1px solid var(--border);
  }

  :global(.members-tab__invite-btn) {
    width: 100%;
    justify-content: center;
    min-height: var(--tap);
  }

  :global(.members-tab__empty-cta) {
    margin-top: var(--space-md);
    align-self: flex-start;
  }

  .member-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .member-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-md);
  }

  @media (min-width: 640px) {
    .member-card {
      padding: var(--space-md) var(--space-lg);
    }
  }

  .member-card__row {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-md);
    align-items: start;
    min-width: 0;
  }

  .member-card__avatar {
    flex-shrink: 0;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: var(--radius-full);
    object-fit: cover;
    display: block;
    user-select: none;
    box-sizing: border-box;
    border: 1px solid var(--border-ui);
  }

  .member-card__avatar--inactive {
    opacity: 0.55;
    filter: grayscale(0.35);
  }

  .member-card__mid {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .member-card__title-line {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    flex-wrap: wrap;
    line-height: 1.3;
  }

  .member-card__name {
    font-weight: 800;
    font-size: 1rem;
    text-decoration: none;
    color: var(--fg);
  }

  .member-card__name:hover {
    text-decoration: underline;
  }

  .member-card__role {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .member-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.1rem 0.45rem;
    border-radius: var(--radius-full);
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border: 1px solid var(--border);
  }

  .member-badge--admin {
    color: var(--primary);
    border-color: color-mix(in srgb, var(--primary) 45%, var(--border));
    background: color-mix(in srgb, var(--primary) 12%, transparent);
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

  .member-card__amounts {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    justify-content: flex-end;
    gap: var(--space-lg);
    padding-top: var(--space-sm);
    border-top: 1px solid var(--border);
  }

  .member-card__amount {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.15rem;
    text-align: right;
  }

  .member-card__amount-label {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .member-card__amount-value {
    font-size: 1.1rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--ok);
    line-height: 1.1;
  }

  .member-card__amount-value--owed {
    color: var(--gold);
  }

  .member-card__amount-value--penalties {
    color: var(--primary);
  }

  .member-card__notes {
    margin: 0.15rem 0 0;
    font-size: 0.78rem;
    font-style: italic;
  }

  .member-card__admin {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
    padding-top: var(--space-xs);
    border-top: 1px solid var(--border);
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

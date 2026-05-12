<script lang="ts">
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import AppCard from '$lib/components/ui/AppCard.svelte';
  import { t } from '$lib/i18n';
  import LoreModal from './LoreModal.svelte';

  type EventRow = {
    type: string;
    timestamp: number;
    playerId?: string;
    playerLabel: string;
  };

  interface Props {
    gameIndex: number;
    events: EventRow[];
    eventTypeLabel: (type: string) => string;
    onClose: () => void;
  }

  let { gameIndex, events, eventTypeLabel, onClose }: Props = $props();
</script>

<LoreModal labelledBy="events-popup-title" onDismiss={onClose}>
  <AppCard className="lore-modal__card">
    <h2 id="events-popup-title" class="lore-modal__title">
      {$t('matches.lore.eventsTitle', { n: String(gameIndex + 1) })}
    </h2>
    <div class="lore-events-popup__list">
      {#each events as evt, i (evt.timestamp + '-' + i)}
        <div class="lore-events-popup__row">
          <span class="lore-events-popup__time" title={new Date(evt.timestamp).toISOString()}>
            {new Date(evt.timestamp).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
          <span class="lore-events-popup__type">{eventTypeLabel(evt.type)}</span>
          <span class="lore-events-popup__player muted">{evt.playerLabel}</span>
        </div>
      {:else}
        <p class="muted lore-events-popup__empty">{$t('matches.detail.eventsEmpty')}</p>
      {/each}
    </div>
    <div class="lore-modal__actions">
      <AppButton type="button" onclick={onClose}>{$t('matches.lore.close')}</AppButton>
    </div>
  </AppCard>
</LoreModal>

<style>
  .lore-events-popup__list {
    max-height: 50vh;
    overflow-y: auto;
    margin-bottom: 20px;
    text-align: left;
  }

  .lore-events-popup__row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid var(--glass-border);
    font-size: 0.9rem;
  }

  .lore-events-popup__row:last-child {
    border-bottom: none;
  }

  .lore-events-popup__time {
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
    min-width: 5.5em;
  }

  .lore-events-popup__type {
    flex-shrink: 0;
    font-weight: 600;
    min-width: 6em;
  }

  .lore-events-popup__player {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lore-events-popup__empty {
    padding: 16px 0;
    margin: 0;
    text-align: center;
  }

  .lore-modal__title {
    font-size: 1.5rem;
    font-weight: 800;
    margin: 0 0 24px;
  }

  .lore-modal__actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  @media (max-width: 480px) {
    .lore-modal__actions :global(.btn) {
      min-height: 52px;
      padding: 14px 24px;
      font-size: 1.1rem;
    }
  }
</style>

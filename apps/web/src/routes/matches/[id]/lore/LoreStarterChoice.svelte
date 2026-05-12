<script lang="ts">
  import AppCard from '$lib/components/ui/AppCard.svelte';
  import { t } from '$lib/i18n';
  import LoreModal from './LoreModal.svelte';

  interface Props {
    p1Name: string;
    p2Name: string;
    p1Id: string | undefined | null;
    p2Id: string | undefined | null;
    saving: boolean;
    onChoose: (playerId: string) => void;
    onDismiss: () => void;
  }

  let { p1Name, p2Name, p1Id, p2Id, saving, onChoose, onDismiss }: Props = $props();
</script>

<LoreModal labelledBy="starter-choice-title" onDismiss={onDismiss}>
  <AppCard className="lore-modal__card lore-starter-choice">
    <h2 id="starter-choice-title" class="lore-starter-choice__title">
      {$t('matches.lore.starterTitle')}
    </h2>
    <div class="lore-starter-choice__buttons">
      <button
        type="button"
        class="lore-starter-choice__btn lore-starter-choice__btn--p2"
        disabled={saving || !p2Id}
        onclick={() => p2Id && onChoose(p2Id)}
        aria-label={$t('matches.lore.playerStartsAria', { name: p2Name })}
      >
        {saving ? $t('matches.lore.saving') : p2Name}
      </button>
      <button
        type="button"
        class="lore-starter-choice__btn lore-starter-choice__btn--p1"
        disabled={saving || !p1Id}
        onclick={() => p1Id && onChoose(p1Id)}
        aria-label={$t('matches.lore.playerStartsAria', { name: p1Name })}
      >
        {saving ? $t('matches.lore.saving') : p1Name}
      </button>
    </div>
  </AppCard>
</LoreModal>

<style>
  /* Choose starting player: two large buttons in player direction (P2 top, P1 bottom) */
  .lore-starter-choice {
    padding: 0;
    max-width: 420px;
    overflow: hidden;
  }

  .lore-starter-choice__title {
    margin: 0;
    padding: 20px 20px 12px;
    font-size: 1.25rem;
    text-align: center;
  }

  .lore-starter-choice__buttons {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .lore-starter-choice__btn {
    flex: 1;
    min-height: 120px;
    border: none;
    padding: 24px 20px;
    font-size: 1.5rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition:
      filter 0.15s,
      transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: #fff;
  }

  .lore-starter-choice__btn:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: scale(1.01);
  }

  .lore-starter-choice__btn:active:not(:disabled) {
    transform: scale(0.99);
  }

  .lore-starter-choice__btn:disabled {
    opacity: 0.8;
    cursor: wait;
  }

  .lore-starter-choice__btn--p2 {
    background: linear-gradient(145deg, #5b21b6, #7c3aed);
  }

  .lore-starter-choice__btn--p1 {
    background: linear-gradient(145deg, #4b5563, #6b7280);
  }
</style>

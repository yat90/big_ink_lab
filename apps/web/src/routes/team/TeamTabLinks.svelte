<script lang="ts">
  import IconCloud from '$lib/icons/IconCloud.svelte';
  import { TEAM_DRIVE_LINKS } from '$lib/components/team/teamDriveLinks';
  import { t } from '$lib/i18n';
</script>

<section class="card stack team-data-links" aria-labelledby="team-data-links-heading">
  <div class="team-data-links__header">
    <h2 id="team-data-links-heading" class="team-data-links__title">
      {$t('team.dataLinks.heading')}
    </h2>
    <p class="team-data-links__intro muted">{$t('team.dataLinks.intro')}</p>
  </div>
  <ul class="team-data-links__list">
    {#each TEAM_DRIVE_LINKS as row (row.id)}
      <li>
        <a class="team-data-links__link" href={row.href} target="_blank" rel="noopener noreferrer">
          <span class="team-data-links__icon" aria-hidden="true">
            <IconCloud size={22} className="team-data-links__icon-svg" />
          </span>
          <span class="team-data-links__label">{$t(`team.dataLinks.items.${row.id}`)}</span>
          <span class="team-data-links__hint muted">{$t('team.dataLinks.openDrive')}</span>
        </a>
      </li>
    {/each}
  </ul>
</section>

<style>
  .team-data-links__header {
    margin-bottom: var(--space-sm);
  }

  .team-data-links__title {
    margin: 0 0 0.35rem;
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .team-data-links__intro {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .team-data-links__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .team-data-links__link {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.65rem 0.75rem;
    padding: 0.85rem 1rem;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--glass-bg-strong, rgba(0, 0, 0, 0.06));
    color: inherit;
    text-decoration: none;
    transition:
      border-color 0.15s ease,
      background 0.15s ease;
  }

  .team-data-links__link:hover {
    border-color: var(--muted);
    background: var(--glass-bg, rgba(0, 0, 0, 0.04));
  }

  .team-data-links__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
  }

  .team-data-links__label {
    font-weight: 600;
    font-size: 0.95rem;
    min-width: 0;
  }

  .team-data-links__hint {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }
</style>

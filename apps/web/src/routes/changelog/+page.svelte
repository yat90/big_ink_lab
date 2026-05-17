<script lang="ts">
  import { t } from '$lib/i18n';
  import AppCard from '$lib/components/ui/AppCard.svelte';

  const modules = import.meta.glob<string>('../../../../../changelogs/[0-9]*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  });

  const entries = Object.entries(modules)
    .map(([path, content]) => ({
      date: path.split('/').pop()!.replace('.md', ''),
      content,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  function inline(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="cl__code">$1</code>')
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" rel="noopener noreferrer" target="_blank" class="cl__link">$1</a>'
      );
  }

  function renderMarkdown(md: string): string {
    let html = '';
    let inList = false;

    for (const rawLine of md.split('\n')) {
      const line = rawLine.trimEnd();
      let m: RegExpMatchArray | null;

      if (!line) {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        continue;
      }

      if ((m = line.match(/^### (.+)/))) {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += `<h4 class="cl__h3">${inline(m[1])}</h4>`;
      } else if ((m = line.match(/^## (.+)/))) {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += `<h3 class="cl__h2">${inline(m[1])}</h3>`;
      } else if ((m = line.match(/^# (.+)/))) {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += `<h2 class="cl__h1">${inline(m[1])}</h2>`;
      } else if ((m = line.match(/^[-*] (.*)/))) {
        if (!inList) {
          html += '<ul class="cl__list">';
          inList = true;
        }
        html += `<li class="cl__item">${inline(m[1])}</li>`;
      } else {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += `<p class="cl__p">${inline(line)}</p>`;
      }
    }

    if (inList) html += '</ul>';
    return html;
  }
</script>

<svelte:head>
  <title>{$t('changelog.pageTitle')}</title>
</svelte:head>

<div class="page">
  <h2 class="cl-page__heading">{$t('changelog.heading')}</h2>

  {#each entries as entry (entry.date)}
    <AppCard className="cl-card">
      <div class="cl-body">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html renderMarkdown(entry.content)}
      </div>
    </AppCard>
  {/each}
</div>

<style>
  .cl-page__heading {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 var(--space-lg);
  }

  :global(.cl-card) {
    padding: var(--space-lg);
  }

  .cl-body :global(.cl__h1) {
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0 0 var(--space-md);
    color: var(--fg);
  }

  .cl-body :global(.cl__h2) {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    margin: var(--space-lg) 0 var(--space-sm);
    color: var(--fg);
    padding-top: var(--space-sm);
    border-top: 1px solid var(--glass-border);
  }

  .cl-body :global(.cl__h3) {
    font-size: 0.9rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    margin: var(--space-md) 0 var(--space-xs);
  }

  .cl-body :global(.cl__p) {
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--muted);
    margin: 0 0 var(--space-sm);
  }

  .cl-body :global(.cl__list) {
    margin: 0 0 var(--space-sm);
    padding-left: var(--space-lg);
    list-style: disc;
  }

  .cl-body :global(.cl__item) {
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--fg);
    margin-bottom: var(--space-xs);
  }

  .cl-body :global(.cl__code) {
    font-family: var(--font-mono, monospace);
    font-size: 0.8em;
    background: var(--glass-bg-strong);
    border: 1px solid var(--glass-border);
    border-radius: 3px;
    padding: 1px 4px;
    word-break: break-all;
  }

  .cl-body :global(.cl__link) {
    color: var(--ink);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .cl-body :global(.cl__link:hover) {
    opacity: 0.8;
  }
</style>

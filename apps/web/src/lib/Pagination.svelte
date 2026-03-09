<script lang="ts">
  interface Props {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }

  let { currentPage, totalPages, onPageChange }: Props = $props();

  const getPageNumbers = $derived(() => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  });

  function handleClick(page: number | string) {
    if (typeof page === 'number' && page !== currentPage) {
      onPageChange(page);
    }
  }
</script>

{#if totalPages > 1}
  <div class="pagination">
    <button
      type="button"
      class="pagination__btn"
      disabled={currentPage === 1}
      onclick={() => onPageChange(currentPage - 1)}
      aria-label="Previous page"
    >
      ‹ Prev
    </button>

    {#each getPageNumbers() as page}
      {#if page === '...'}
        <span class="pagination__ellipsis">…</span>
      {:else}
        <button
          type="button"
          class="pagination__btn pagination__page"
          class:pagination__page--active={page === currentPage}
          onclick={() => handleClick(page)}
          aria-label={`Page ${page}`}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </button>
      {/if}
    {/each}

    <button
      type="button"
      class="pagination__btn"
      disabled={currentPage === totalPages}
      onclick={() => onPageChange(currentPage + 1)}
      aria-label="Next page"
    >
      Next ›
    </button>
  </div>
{/if}

<style>
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs, 0.5rem);
    margin-top: var(--space-lg, 1.5rem);
    flex-wrap: wrap;
  }

  .pagination__btn {
    padding: 0.5rem 0.75rem;
    background: var(--bg-card, white);
    border: 1px solid var(--border, #ddd);
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--text, #333);
    transition: all 0.15s ease;
  }

  .pagination__btn:hover:not(:disabled) {
    background: var(--bg-hover, #f5f5f5);
    border-color: var(--border-hover, #999);
  }

  .pagination__btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pagination__page {
    min-width: 2.5rem;
    padding: 0.5rem;
  }

  .pagination__page--active {
    background: var(--primary, #3b82f6);
    color: white;
    border-color: var(--primary, #3b82f6);
  }

  .pagination__page--active:hover {
    background: var(--primary-dark, #2563eb);
    border-color: var(--primary-dark, #2563eb);
  }

  .pagination__ellipsis {
    padding: 0.5rem;
    color: var(--muted, #666);
    user-select: none;
  }
</style>

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
  <nav class="pagination" aria-label="Pagination">
    <button
      type="button"
      class="btn pagination__btn"
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
          class="btn pagination__btn pagination__page"
          class:btn--primary={page === currentPage}
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
      class="btn pagination__btn"
      disabled={currentPage === totalPages}
      onclick={() => onPageChange(currentPage + 1)}
      aria-label="Next page"
    >
      Next ›
    </button>
  </nav>
{/if}

<style>
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm, 0.5rem);
    margin-top: var(--space-lg, 1.5rem);
    flex-wrap: wrap;
  }

  .pagination__btn {
    min-height: 40px;
    padding: 8px 12px;
    font-size: 0.9rem;
  }

  .pagination__page {
    min-width: 2.5rem;
    padding: 8px 12px;
  }

  .pagination__ellipsis {
    padding: 0.5rem;
    color: var(--muted);
    font-weight: 600;
    user-select: none;
  }
</style>

<script lang="ts">
  /** When set (e.g. in Vercel), links "issue #40" to your repo’s GitHub issue. */
  const resetIssueUrl = import.meta.env.VITE_GITHUB_ISSUE_40_URL as string | undefined;
</script>

<svelte:head>
  <title>Forgot password · Big Ink Lab</title>
</svelte:head>

<div class="page auth-page">
  <div class="card auth-card">
    <h1 class="card__title">Forgot password</h1>
    <p class="card__sub">
      Password reset by email is not available yet. We will add it here when it is ready.
    </p>
    <p class="hint">
      {#if resetIssueUrl}
        You can follow progress on
        <a href={resetIssueUrl} class="auth-inline-link" rel="noopener noreferrer"
          >GitHub issue #40</a
        >.
      {:else}
        Progress is tracked as GitHub issue #40 in this project’s repository.
      {/if}
    </p>
    <p class="auth-card__actions">
      <a href="/login" class="btn btn--primary">Back to login</a>
    </p>
  </div>
</div>

<style>
  .auth-page {
    max-width: 520px;
  }

  .auth-card {
    margin-top: 4vh;
  }

  .auth-card__actions {
    margin-top: var(--space-xl);
  }

  .auth-inline-link {
    color: var(--ink);
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .auth-inline-link:hover {
    color: var(--ink-hover);
  }
</style>

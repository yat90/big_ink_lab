<script lang="ts">
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import AppCard from '$lib/components/ui/AppCard.svelte';
  /** When set (e.g. in Vercel), links "issue #40" to your repo’s GitHub issue. */
  const resetIssueUrl = import.meta.env.VITE_GITHUB_ISSUE_40_URL as string | undefined;
</script>

<svelte:head>
  <title>Forgot password · Big Ink Lab</title>
</svelte:head>

<div class="page auth-page">
  <AppCard className="auth-card">
    <h1 class="card__title">Forgot password</h1>
    <p class="card__sub">
      Password reset by email is not available yet. We will add it here when it is ready.
    </p>
    
    <p class="auth-card__actions">
      <AppButton href="/login" variant="primary">Back to login</AppButton>
    </p>
  </AppCard>
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

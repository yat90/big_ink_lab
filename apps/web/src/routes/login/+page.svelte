<script lang="ts">
  import { config } from '$lib/config';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { setAuthSession } from '$lib/auth';

  type AuthMode = 'login' | 'register';
  type AuthResponse = {
    accessToken: string;
    user: {
      id: string;
      email: string;
      name?: string;
    };
  };

  let mode = $state<AuthMode>('login');
  let name = $state('');
  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state('');

  const apiUrl = config.apiUrl ?? '/api';
  const nextPath = $derived($page.url.searchParams.get('next') || '/');
  const title = $derived(mode === 'login' ? 'Login' : 'Create account');

  async function submitAuth() {
    loading = true;
    error = '';
    try {
      const endpoint = mode === 'login' ? 'login' : 'register';
      const res = await fetch(`${apiUrl}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          ...(mode === 'register' ? { name } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.message ?? 'Authentication failed.';
        return;
      }
      const data = (await res.json()) as AuthResponse;
      setAuthSession(data.accessToken, data.user);
      goto(nextPath, { replaceState: true });
    } catch {
      error = 'Could not reach API.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{title} · Big Ink Lab</title>
</svelte:head>

<div class="page auth-page">
  <div class="card auth-card">
    <h1 class="card__title">{title}</h1>
    <p class="card__sub">Use your account to access the app.</p>

    <form class="stack" onsubmit={(e) => (e.preventDefault(), submitAuth())}>
      {#if mode === 'register'}
        <label class="label">
          Name
          <input
            class="input"
            type="text"
            bind:value={name}
            placeholder="Your name"
            autocomplete="name"
          />
        </label>
      {/if}

      <label class="label">
        Email
        <input
          class="input"
          type="email"
          bind:value={email}
          placeholder="you@example.com"
          autocomplete="email"
          required
        />
      </label>

      <label class="label">
        Password
        <input
          class="input"
          type="password"
          bind:value={password}
          placeholder="Minimum 6 characters"
          autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
          minlength="6"
          required
        />
      </label>

      {#if error}
        <p class="alert" role="alert">{error}</p>
      {/if}

      <button type="submit" class="btn btn--primary" disabled={loading}>
        {loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}
      </button>
    </form>

    <div class="auth-card__switch row">
      <span class="muted">
        {mode === 'login' ? 'No account yet?' : 'Already have an account?'}
      </span>
      <button
        type="button"
        class="btn"
        onclick={() => {
          mode = mode === 'login' ? 'register' : 'login';
          error = '';
        }}
      >
        {mode === 'login' ? 'Create account' : 'Back to login'}
      </button>
    </div>
  </div>
</div>

<style>
  .auth-page {
    max-width: 520px;
  }

  .auth-card {
    margin-top: 4vh;
  }

  .auth-card__switch {
    margin-top: var(--space-lg);
    justify-content: space-between;
  }
</style>

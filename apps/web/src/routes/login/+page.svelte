<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { config } from '$lib/config';
  import { page } from '$app/stores';
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
  let showPassword = $state(false);
  let loading = $state(false);
  let error = $state('');
  let nameInput: HTMLInputElement | undefined = $state();
  let emailInput: HTMLInputElement | undefined = $state();

  const apiUrl = config.apiUrl ?? '/api';
  const nextPath = $derived($page.url.searchParams.get('next') || '/');
  const title = $derived(mode === 'login' ? 'Login' : 'Create account');

  // Focus the most relevant first field on load (desktop only — mobile autofocus
  // pops a keyboard that hides the form, which hurts more than it helps).
  onMount(() => {
    const isCoarse =
      typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    if (isCoarse) return;
    emailInput?.focus({ preventScroll: true });
  });

  async function switchMode() {
    mode = mode === 'login' ? 'register' : 'login';
    error = '';
    if (mode === 'login') name = '';
    await tick();
    if (mode === 'register') {
      nameInput?.focus({ preventScroll: true });
    } else {
      emailInput?.focus({ preventScroll: true });
    }
  }

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
      window.location.href = nextPath;
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
            bind:this={nameInput}
            class="input"
            type="text"
            bind:value={name}
            placeholder="Your name"
            autocomplete="name"
            minlength="1"
            required
          />
        </label>
      {/if}

      <label class="label">
        Email
        <input
          bind:this={emailInput}
          class="input"
          type="email"
          bind:value={email}
          placeholder="you@example.com"
          autocomplete="email"
          inputmode="email"
          autocapitalize="off"
          spellcheck="false"
          required
        />
      </label>

      <label class="label">
        Password
        <span class="input-affix">
          <input
            class="input"
            type={showPassword ? 'text' : 'password'}
            bind:value={password}
            placeholder="Minimum 6 characters"
            autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
            minlength="6"
            required
          />
          <button
            type="button"
            class="input-affix__btn"
            onclick={() => (showPassword = !showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </span>
      </label>

      {#if error}
        <p class="alert" role="alert">{error}</p>
      {/if}

      <button type="submit" class="btn btn--primary" disabled={loading}>
        {#if loading}
          <span class="spinner" aria-hidden="true" style="margin-right: 8px;"></span>
          Please wait…
        {:else}
          {mode === 'login' ? 'Login' : 'Create account'}
        {/if}
      </button>
    </form>

    <div class="auth-card__switch row">
      <span class="muted">
        {mode === 'login' ? 'No account yet?' : 'Already have an account?'}
      </span>
      <button type="button" class="btn" onclick={switchMode}>
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

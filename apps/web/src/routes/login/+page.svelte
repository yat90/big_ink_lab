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

  type PasswordStrength = 'weak' | 'fair' | 'ok';

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

  const registerPasswordStrength = $derived.by((): PasswordStrength | null => {
    if (mode !== 'register' || password.length === 0) return null;
    if (password.length < 6) return 'weak';
    if (password.length < 10) return 'fair';
    return 'ok';
  });

  function extractApiMessage(body: unknown): string {
    if (!body || typeof body !== 'object') return '';
    const raw = (body as { message?: unknown }).message;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw) && raw.every((x) => typeof x === 'string')) return raw.join(' ');
    return '';
  }

  function mapAuthError(status: number, body: unknown, authMode: AuthMode): string {
    const raw = extractApiMessage(body);
    const lower = raw.toLowerCase();

    if (status >= 500) {
      return 'The server had a problem. Please try again in a moment.';
    }

    if (status === 401) {
      if (lower.includes('invalid') && (lower.includes('password') || lower.includes('email'))) {
        return 'That email or password does not match our records. Check for typos and try again.';
      }
      if (lower.includes('disabled')) {
        return 'This account is disabled. Contact an administrator if you need help.';
      }
      if (lower.includes('token')) {
        return 'Your session could not be verified. Please sign in again.';
      }
      return raw || 'We could not sign you in. Check your details and try again.';
    }

    if (status === 409) {
      if (lower.includes('already') || lower.includes('registered')) {
        return 'An account with this email already exists. Try logging in or use a different email.';
      }
    }

    if (status === 400) {
      if (lower.includes('at least 6') || lower.includes('6 characters')) {
        return 'Use a password with at least 6 characters.';
      }
      if (lower.includes('valid email')) {
        return 'Enter a valid email address.';
      }
    }

    if (status === 404) {
      return 'The sign-in service could not be reached. If this keeps happening, try again later.';
    }

    if (raw) return raw;
    return authMode === 'login'
      ? 'We could not sign you in. Please try again.'
      : 'We could not create your account. Please try again.';
  }

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
    password = '';
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
        error = mapAuthError(res.status, data, mode);
        return;
      }
      const data = (await res.json()) as AuthResponse;
      setAuthSession(data.accessToken, data.user);
      window.location.href = nextPath;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      const looksNetwork =
        e instanceof TypeError || /network|fetch|load failed|failed to fetch/i.test(msg);
      error = looksNetwork
        ? 'We could not reach the server. Check your connection and try again.'
        : 'Something went wrong. Please try again.';
    } finally {
      loading = false;
    }
  }

  const strengthLabel: Record<PasswordStrength, string> = {
    weak: 'Weak',
    fair: 'Fair',
    ok: 'OK',
  };
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
            placeholder={mode === 'login' ? 'Password' : 'Choose a password'}
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

      {#if mode === 'login'}
        <p class="auth-forgot">
          <a class="auth-forgot__link" href="/forgot-password">Forgot password?</a>
        </p>
      {:else}
        <div class="auth-register-password-meta">
          <p class="hint">At least 6 characters.</p>
          {#if registerPasswordStrength}
            <span
              class="password-strength password-strength--{registerPasswordStrength}"
              aria-live="polite"
            >
              {strengthLabel[registerPasswordStrength]}
            </span>
          {/if}
        </div>
      {/if}

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
    <p class="hint auth-switch-note">
      The password field is cleared when you switch between login and sign up.
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

  .auth-card__switch {
    margin-top: var(--space-lg);
    justify-content: space-between;
  }

  .auth-forgot {
    margin: calc(var(--space-xs) * -1) 0 0;
    text-align: right;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .auth-forgot__link {
    color: var(--ink);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .auth-forgot__link:hover {
    color: var(--ink-hover);
  }

  .auth-register-password-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-sm);
    margin-top: calc(var(--space-xs) * -1);
  }

  .auth-register-password-meta .hint {
    margin: 0;
    font-weight: 600;
  }

  .password-strength {
    font-size: 0.8125rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .password-strength--weak {
    color: var(--danger);
  }

  .password-strength--fair {
    color: var(--gold);
  }

  .password-strength--ok {
    color: var(--ok);
  }

  .auth-switch-note {
    margin: var(--space-md) 0 0;
    font-size: 0.875rem;
    text-align: center;
  }
</style>

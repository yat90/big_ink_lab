<script lang="ts">
  import AppButton from '$lib/components/ui/AppButton.svelte';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  /** Minimal typing where DOM lib may omit `BeforeInstallPromptEvent`. */
  type ChromiumInstallEvent = Event & { prompt: () => Promise<{ outcome?: string } | void> };

  const STORAGE_KEY = 'bil-install-prompt-dismissed';

  let dismissed = $state(false);
  let deferredPrompt: ChromiumInstallEvent | null = $state(null);
  let showChromiumInstall = $state(false);
  let showIosHint = $state(false);

  type WebStorageLite = {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  };

  function getLs(): WebStorageLite | null {
    if (typeof globalThis === 'undefined') return null;
    const g = globalThis as typeof globalThis & { localStorage?: WebStorageLite };
    return g.localStorage ?? null;
  }

  function readDismissed(): boolean {
    const ls = getLs();
    if (!ls) return false;
    try {
      return ls.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  function dismiss() {
    dismissed = true;
    const ls = getLs();
    if (!ls) return;
    try {
      ls.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    deferredPrompt = null;
    showChromiumInstall = false;
    dismiss();
  }

  onMount(() => {
    if (!browser) return;

    if (readDismissed()) {
      dismissed = true;
      return;
    }

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true;

    if (standalone) {
      dismissed = true;
      return;
    }

    const ua = navigator.userAgent;
    const isIos =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    let sawBeforeInstall = false;
    const onBip = (e: Event) => {
      e.preventDefault();
      sawBeforeInstall = true;
      deferredPrompt = e as ChromiumInstallEvent;
      showChromiumInstall = true;
      showIosHint = false;
    };
    window.addEventListener('beforeinstallprompt', onBip);

    const timer = window.setTimeout(() => {
      if (!sawBeforeInstall && isIos) {
        showIosHint = true;
      }
    }, 600);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBip);
    };
  });
</script>

{#if !dismissed && (showChromiumInstall || showIosHint)}
  <div class="install-prompt" role="region" aria-label="Install app">
    {#if showChromiumInstall}
      <p class="install-prompt__text">
        Install Big Ink Lab for quick access from your home screen.
      </p>
      <AppButton type="button" size="sm" variant="primary" onclick={install}>Install</AppButton>
    {:else}
      <p class="install-prompt__text">
        Add Big Ink Lab to your home screen: tap <strong>Share</strong>, then
        <strong>Add to Home Screen</strong>.
      </p>
    {/if}
    <AppButton
      type="button"
      size="sm"
      className="install-prompt__close"
      onclick={dismiss}
      aria-label="Dismiss"
    >
      Not now
    </AppButton>
  </div>
{/if}

<script lang="ts">
  type Props = {
    /** When true, the popup is shown. */
    open: boolean;
    /** Dialog title, e.g. "Analyse game 1" or "Analyse match". */
    title: string;
    /** Returns the prompt text to copy. Called when user clicks Copy Prompt. */
    getPromptText: () => string;
    /** Called when user closes the popup (backdrop or Close button). */
    onClose: () => void;
  };

  let { open, title, getPromptText, onClose }: Props = $props();

  let copyPromptCopied = $state(false);

  async function copyToClipboard() {
    const text = getPromptText();
    try {
      await navigator.clipboard.writeText(text);
      copyPromptCopied = true;
      setTimeout(() => (copyPromptCopied = false), 3000);
    } catch {
      // ignore
    }
  }

  function handleClose() {
    copyPromptCopied = false;
    onClose();
  }
</script>

{#if open}
  <div
    class="delete-game-modal game-analyse-modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="game-analyse-title"
  >
    <button
      type="button"
      class="delete-game-modal__backdrop"
      aria-label="Close"
      onclick={handleClose}
    ></button>
    <div class="delete-game-modal__card card game-analyse-modal__card">
      <h2 id="game-analyse-title" class="delete-game-modal__title">
        {title}
      </h2>
      <p class="game-analyse-modal__hint muted">
        Click the <strong>Copy Prompt</strong> button below, then paste the prompt into your AI agent
        (e.g. ChatGPT, Claude, Cursor) to get it analysed.
      </p>
      {#if copyPromptCopied}
        <p class="game-analyse-modal__copied" role="status">Copied to clipboard!</p>
      {/if}
      <div class="delete-game-modal__actions row game-analyse-modal__actions">
        <button type="button" class="btn btn--primary" onclick={copyToClipboard}>
          Copy Prompt
        </button>
        <button type="button" class="btn" onclick={handleClose}>Close</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .delete-game-modal {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .delete-game-modal__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    padding: 0;
    cursor: pointer;
  }

  .delete-game-modal__card {
    position: relative;
    z-index: 1;
    max-width: 360px;
    width: 100%;
    text-align: center;
  }

  .delete-game-modal__title {
    font-size: 1.25rem;
    margin: 0 0 8px;
  }

  .delete-game-modal__actions {
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .game-analyse-modal__card {
    max-width: 420px;
    text-align: left;
  }

  .game-analyse-modal__hint {
    margin: 0 0 20px;
    font-size: 0.95rem;
    line-height: 1.45;
  }

  .game-analyse-modal__copied {
    margin: 0 0 16px;
    font-size: 0.95rem;
    color: var(--ok, #22c55e);
    font-weight: 600;
  }

  .game-analyse-modal__actions {
    margin-top: 8px;
  }
</style>

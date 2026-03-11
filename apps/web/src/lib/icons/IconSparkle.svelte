<script lang="ts">
  /** Size in pixels (width and height). Default 18. */
  export let size: number = 18;
  export let className: string = '';
</script>

<span class="sparkle-wrap">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={className}
    aria-hidden="true"
  >
    <!-- Central main sparkle -->
    <path
      class="sparkle-main"
      d="m12 4-1.8 5.5a1.8 1.8 0 0 1-1.2 1.2L4 12l5.5 1.8a1.8 1.8 0 0 1 1.2 1.2L12 20l1.8-5.5a1.8 1.8 0 0 1 1.2-1.2L20 12l-5.5-1.8a1.8 1.8 0 0 1-1.2-1.2L12 4Z"
    />
    <!-- Small sparkle top-right -->
    <path
      class="sparkle-dot sparkle-dot--tr"
      d="M17 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
      fill="currentColor"
      stroke="none"
    />
    <!-- Small sparkle bottom-right -->
    <path
      class="sparkle-dot sparkle-dot--br"
      d="M21 19a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
      fill="currentColor"
      stroke="none"
    />
    <!-- Small sparkle bottom-left -->
    <path
      class="sparkle-dot sparkle-dot--bl"
      d="M5 21a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
      fill="currentColor"
      stroke="none"
    />
    <!-- Small sparkle top-left -->
    <path
      class="sparkle-dot sparkle-dot--tl"
      d="M3 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
</span>

<style>
  .sparkle-wrap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  :global(.btn:hover) .sparkle-wrap,
  :global(.btn:focus-visible) .sparkle-wrap {
    animation: sparkle-magic 0.55s ease-out;
  }

  @keyframes sparkle-magic {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    25% {
      transform: scale(1.2);
      opacity: 0.95;
    }
    50% {
      transform: scale(1.15);
      opacity: 1;
    }
    75% {
      transform: scale(1.22);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  :global(.btn:hover) .sparkle-dot,
  :global(.btn:focus-visible) .sparkle-dot {
    animation: sparkle-dot-twinkle 0.55s ease-out;
  }

  .sparkle-dot--tr {
    animation-delay: 0.05s;
  }
  .sparkle-dot--br {
    animation-delay: 0.1s;
  }
  .sparkle-dot--bl {
    animation-delay: 0.15s;
  }
  .sparkle-dot--tl {
    animation-delay: 0.2s;
  }

  @keyframes sparkle-dot-twinkle {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.4;
      transform: scale(0.85);
    }
  }
</style>

<script lang="ts">
  /** Size in pixels (width and height). Default 18. */
  export let size: number = 18;
  export let className: string = '';
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
  aria-hidden="true"
>
  <path d="M3 12h18" />
  <path d="M3 6h18" />
  <path d="M3 18h18" />
</svg>

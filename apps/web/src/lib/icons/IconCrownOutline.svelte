<script lang="ts">
  /** Size in pixels (width and height). Default 24. */
  export let size: number = 24;
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
  <path d="M5 18h14" />
  <path d="M5 18 7.5 9.5 10 13 12 6.5 14 13 16.5 9.5 19 18" />
</svg>

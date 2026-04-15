<script lang="ts">
  /** Size in pixels (width and height). Default 20. */
  export let size: number = 20;
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
  <path d="M22 3H2l8 9.46V19l4 2v-6.54L22 3z" />
</svg>

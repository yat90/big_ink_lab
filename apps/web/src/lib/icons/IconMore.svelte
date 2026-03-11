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
  fill="currentColor"
  class={className}
  aria-hidden="true"
>
  <circle cx="12" cy="6" r="1.5" />
  <circle cx="12" cy="12" r="1.5" />
  <circle cx="12" cy="18" r="1.5" />
</svg>

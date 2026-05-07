<script lang="ts">
  /** Size in pixels (width and height). Default 18. */
  export let size: number = 18;
  export let className: string = '';
</script>

<!-- Solid triangular caret (points left) -->
<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="currentColor"
  class={className}
  aria-hidden="true"
>
  <polygon points="19 5 7 12 19 19" />
</svg>

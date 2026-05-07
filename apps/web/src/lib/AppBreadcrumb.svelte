<script lang="ts">
  import { page } from '$app/stores';
  import Breadcrumb from '$lib/Breadcrumb.svelte';
  import { breadcrumbTrail } from '$lib/breadcrumbTrail';
  import { breadcrumbTail } from '$lib/breadcrumbTail';
  import { t } from '$lib/i18n';

  const pathname = $derived($page.url.pathname);

  const items = $derived.by(() => {
    const trail = breadcrumbTrail(pathname);
    const tail = $breadcrumbTail;
    const tailLabel = tail && tail.path === pathname ? tail.label.trim() : '';
    const mapped = trail.map((seg, i) => ({
      label: $t(seg.key),
      href: i === trail.length - 1 ? undefined : seg.href,
    }));
    if (tailLabel && mapped.length > 0) {
      const next = [...mapped];
      next[next.length - 1] = { ...next[next.length - 1], label: tailLabel };
      return next;
    }
    return mapped;
  });
</script>

<Breadcrumb {items} />

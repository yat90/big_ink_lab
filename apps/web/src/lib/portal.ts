import type { Action } from 'svelte/action';

/** Move node to `document.body` (or another parent) so it escapes overflow/stacking contexts. */
export const portal: Action<HTMLElement, Document | Element | undefined> = (node, target) => {
  const parent = target ?? document.body;
  parent.appendChild(node);
  return {
    destroy() {
      node.remove();
    },
  };
};

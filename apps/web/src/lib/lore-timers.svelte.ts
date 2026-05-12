/** Mobile: avoid single tap firing both inc and dec (touch + ghost click or wrong target). */
export const LORE_BUTTON_COOLDOWN_MS = 400;

/** Recent lore changes are cleared after this many ms of inactivity. */
export const LORE_INACTIVITY_CLEAR_MS = 2500;

export function createCooldownState() {
  let active = $state(false);
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    get active() {
      return active;
    },
    flash() {
      if (timer) clearTimeout(timer);
      active = true;
      timer = setTimeout(() => {
        active = false;
        timer = null;
      }, 220);
    },
    dispose() {
      if (timer) clearTimeout(timer);
    },
  };
}

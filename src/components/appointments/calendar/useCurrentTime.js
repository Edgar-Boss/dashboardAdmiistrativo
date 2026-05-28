import { useEffect, useState } from "react";

/** How often the now-line repositions (ms). */
export const CURRENT_TIME_TICK_MS = 30_000;

/**
 * Keeps browser `Date` in sync for the current-time indicator.
 * Only ticks when `enabled` (e.g. viewing today).
 */
export function useCurrentTime(enabled = true) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!enabled) return undefined;

    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), CURRENT_TIME_TICK_MS);
    return () => window.clearInterval(id);
  }, [enabled]);

  return now;
}

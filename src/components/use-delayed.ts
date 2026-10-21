"use client";

import { useEffect, useState } from "react";

/** True once `active` has stayed true for `ms`; answers that arrive sooner never flash a loading state. */
export function useDelayed(active: boolean, ms = 150): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsed(false);
      return;
    }
    const timer = setTimeout(() => setElapsed(true), ms);
    return () => clearTimeout(timer);
  }, [active, ms]);
  return active && elapsed;
}

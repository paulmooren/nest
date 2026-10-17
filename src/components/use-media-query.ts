"use client";

import { useSyncExternalStore } from "react";

/** Whether a CSS media query matches. False on the server and during hydration, so the first paint matches the server's. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Below Tailwind's `md` breakpoint: the layouts that swap a table for a list and popovers for sheets. */
export const useIsPhone = () => useMediaQuery("(max-width: 767px)");

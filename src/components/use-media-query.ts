"use client";

import { createContext, createElement, useContext, useSyncExternalStore } from "react";

/**
 * What the server expects the screen to be, taken from the user agent (see `guessPhone`). It's the answer used on the
 * server and while hydrating, so a phone gets its phone layout in the first HTML instead of after the JavaScript has
 * loaded. Once hydrated the real screen decides, so a wrong guess or a resized window still ends up right.
 */
const PhoneHintContext = createContext(false);

export function PhoneHint({ phone, children }: { phone: boolean; children: React.ReactNode }) {
  return createElement(PhoneHintContext.Provider, { value: phone }, children);
}

/** Whether a CSS media query matches. On the server and during hydration it returns `serverValue`, so the first paint matches the server's. */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Below Tailwind's `md` breakpoint: the layouts that swap a table for a list and popovers for sheets. */
export const useIsPhone = () => useMediaQuery("(max-width: 767px)", useContext(PhoneHintContext));

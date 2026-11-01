"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ConfirmOptions = { title: string; description?: string; confirmLabel?: string };
type Pending = ConfirmOptions & { resolve: (ok: boolean) => void; opener: Element | null };

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

/** Where focus goes when the question closes: the button that asked it, if it is still on the page. */
const returnFocusTo = (active: Element | null) => () =>
  active instanceof HTMLElement && active !== document.body && active.isConnected ? active : true;

/**
 * Mount once near the root. Gives useConfirm() — an awaitable replacement for the browser's confirm(), shown as the
 * design system's alert dialog. Cancel is focused first, so the destructive choice never is. Screens that already
 * hold their own state use `ConfirmDelete` instead.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  // Kept after closing, so the text survives while the dialog is going away.
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        // A second question cancels the first; focus still goes back to what opened the first.
        const opener = pendingRef.current ? pendingRef.current.opener : document.activeElement;
        pendingRef.current?.resolve(false);
        const next = { ...options, resolve, opener };
        pendingRef.current = next;
        setPending(next);
        setOpen(true);
      }),
    [],
  );

  function settle(ok: boolean) {
    pendingRef.current?.resolve(ok);
    pendingRef.current = null;
    setOpen(false);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) settle(false);
        }}
      >
        <AlertDialogContent finalFocus={returnFocusTo(pending?.opener ?? null)}>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
            {pending?.description && <AlertDialogDescription>{pending.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => settle(true)}>
              {pending?.confirmLabel ?? "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

/** `if (!(await confirm({ title: "Delete X?" }))) return;` — resolves true on confirm, false on Cancel/Escape. */
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return confirm;
}

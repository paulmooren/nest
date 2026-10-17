"use client";

import Link from "next/link";

import { IS_DEMO_CLIENT } from "@/lib/demo";
import { useModules } from "@/components/use-modules";
import { VaultIcon } from "@/components/nav-icons";
import { signOutAction } from "../settings/actions";

const SETTINGS = [
  { href: "/settings/profile", label: "Profile", hint: "Name, photo, password" },
  { href: "/settings/household", label: "Household", hint: "Members, invites, modules" },
  { href: "/settings/categories", label: "Categories", hint: "Names and colours" },
  // No push notifications in the Demo.
  ...(IS_DEMO_CLIENT ? [] : [{ href: "/settings/notifications", label: "Notifications", hint: "Reminders on this device" }]),
  { href: "/settings/data", label: "Data", hint: "Export and import" },
];

const ROW = "flex min-h-[var(--tap-primary)] items-center gap-3 px-4 py-2.5 hover:bg-surface-hover";

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-text-faint" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/** The phone's overflow destination: what doesn't earn a slot in the bottom bar (Vault, Settings) and sign out. */
export default function MorePage() {
  const { isEnabled } = useModules();

  return (
    <div className="flex max-w-[560px] flex-col gap-6">
      {isEnabled("vault") && (
        <section aria-label="Modules">
          <div className="overflow-hidden rounded-2xl border border-border-soft">
            <Link href="/vault" className={ROW}>
              <span className="block h-5 w-5 shrink-0 text-text-muted">
                <VaultIcon />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[16px] font-medium">Vault</span>
                <span className="text-[13px] text-text-muted">Documents, codes and notes, encrypted</span>
              </span>
              <Chevron />
            </Link>
          </div>
        </section>
      )}

      <section aria-labelledby="more-settings">
        <h2 id="more-settings" className="mb-2 px-1 text-[12px] font-semibold tracking-wider text-text-muted uppercase">
          Settings
        </h2>
        <div className="divide-y divide-border-soft overflow-hidden rounded-2xl border border-border-soft">
          {SETTINGS.map(({ href, label, hint }) => (
            <Link key={href} href={href} className={ROW}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[16px] font-medium">{label}</span>
                <span className="text-[13px] text-text-muted">{hint}</span>
              </span>
              <Chevron />
            </Link>
          ))}
        </div>
      </section>

      <form action={signOutAction}>
        <button
          type="submit"
          className="flex min-h-[var(--tap-primary)] w-full items-center justify-center rounded-2xl border border-border-soft px-4 text-[16px] font-medium text-critical hover:bg-surface-2"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

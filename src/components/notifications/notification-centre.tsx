"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { BellIcon } from "lucide-react";

import { trpc } from "@/trpc/react";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Inbox } from "@/components/notifications/inbox";

const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: HOUSEHOLD_TIME_ZONE });

/** "Today, 10:00", "Yesterday, 10:00", "4 Nov, 10:00" — in the household's own time. */
function sentAt(date: Date) {
  const time = date.toLocaleTimeString("en-GB", { timeZone: HOUSEHOLD_TIME_ZONE, hour: "2-digit", minute: "2-digit" });
  const now = new Date();
  if (dayKey(date) === dayKey(now)) return `Today, ${time}`;
  if (dayKey(date) === dayKey(new Date(now.getTime() - 86_400_000))) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString("en-GB", { timeZone: HOUSEHOLD_TIME_ZONE, day: "numeric", month: "short" })}, ${time}`;
}

/**
 * The bell and the panel behind it (Notification centre in CONTEXT.md): the live Inbox on top, then Earlier, the
 * Notifications sent to you. The badge counts Inbox items plus unread entries. Entries stay marked unread while the
 * panel is open and turn read when it closes.
 */
export function NotificationCentre() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  // Focus lands on the panel itself, not on the first checkbox, which would open with a focus ring on it.
  const bodyRef = useRef<HTMLDivElement>(null);
  const { data: badge } = trpc.notification.badge.useQuery();
  const { data: earlier } = trpc.notification.earlier.useQuery(undefined, { enabled: open });
  const markRead = trpc.notification.markEarlierRead.useMutation({
    onSuccess: () => Promise.all([utils.notification.badge.invalidate(), utils.notification.earlier.invalidate()]),
  });

  const total = badge?.total ?? 0;

  function change(next: boolean) {
    setOpen(next);
    if (!next && (badge?.unread ?? 0) > 0) markRead.mutate();
  }

  return (
    <Sheet open={open} onOpenChange={change}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={total > 0 ? `Notifications, ${total} waiting` : "Notifications"}
            className="relative"
          />
        }
      >
        <BellIcon />
        {total > 0 && (
          <span
            aria-hidden
            className="absolute top-1.5 right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-xs leading-none font-semibold text-white tabular-nums md:top-1 md:right-1"
          >
            {total > 9 ? "9+" : total}
          </span>
        )}
      </SheetTrigger>
      <SheetContent initialFocus={bodyRef} className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b px-4 py-4 pr-14">
          <SheetTitle className="text-lg">Notifications</SheetTitle>
        </SheetHeader>
        {/* A link inside (an Inbox row, an Earlier entry) takes you to its page, so the panel closes behind it. */}
        <div
          ref={bodyRef}
          tabIndex={-1}
          className="flex flex-1 flex-col gap-8 overflow-y-auto px-4 py-6 outline-none"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) change(false);
          }}
        >
          <Inbox />
          <Section title="Earlier">
            {!earlier ? null : earlier.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing yet. What Nest sends to your phone shows up here for 30 days.
              </p>
            ) : (
              <ul className="divide-y divide-border/70">
                {earlier.map((entry) => (
                  <li key={entry.id}>
                    <Link href={entry.url} className="flex min-h-14 items-start gap-3 py-3 hover:underline">
                      <span
                        aria-hidden
                        className={cn("mt-2 size-2 shrink-0 rounded-full", entry.readAt ? "bg-transparent" : "bg-destructive")}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-medium md:text-sm">
                          {entry.body}
                          {!entry.readAt && <span className="sr-only"> (unread)</span>}
                        </span>
                        <span className="block text-sm text-muted-foreground md:text-xs">
                          {sentAt(new Date(entry.createdAt))}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

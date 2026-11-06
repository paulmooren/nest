"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { parseNote } from "@/lib/notes";
import { cn } from "@/lib/utils";

/** The way back from a Note or the new-Note screen to the Notes list. */
export function NotesBackLink() {
  return (
    <Link
      href="/notes"
      className="-mt-2 mb-2 inline-flex min-h-11 w-fit items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ChevronLeftIcon className="size-4" aria-hidden />
      Notes
    </Link>
  );
}

export function NotesBones({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-2">
      <span className="sr-only">Loading…</span>
      <Skeleton className="mb-4 h-8 w-32" />
      <Skeleton className="h-11 w-full" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

/** "6 Nov 2026, 14:05" — when a Note was written or last edited. */
export function stamp(date: Date | string) {
  const d = new Date(date);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

/** A Note's body, read: headings, bullets, paragraphs and checkboxes. A checkbox can be ticked when `onToggle` is given. */
export function NoteBody({ body, onToggle }: { body: string; onToggle?: (line: number) => void }) {
  const blocks = parseNote(body).filter((b, i, all) => !(b.kind === "blank" && (i === 0 || all[i - 1].kind === "blank")));
  if (blocks.every((b) => b.kind === "blank")) return <p className="text-sm text-muted-foreground">This note is empty.</p>;
  return (
    <div className="flex max-w-3xl flex-col gap-1.5 text-base md:text-sm">
      {blocks.map((b) => {
        switch (b.kind) {
          case "blank":
            return <div key={b.line} className="h-2" aria-hidden />;
          case "heading":
            return (
              <p
                key={b.line}
                role="heading"
                aria-level={b.level + 1}
                className={cn("font-heading font-semibold", b.level === 1 ? "mt-2 text-xl" : b.level === 2 ? "mt-1 text-lg" : "text-base")}
              >
                {b.text}
              </p>
            );
          case "bullet":
            return (
              <p key={b.line} className="flex gap-2.5 pl-1">
                <span aria-hidden className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-foreground/60" />
                <span className="min-w-0 whitespace-pre-wrap break-words">{b.text}</span>
              </p>
            );
          case "check":
            return (
              <label key={b.line} className="flex min-h-9 items-center gap-3 pl-1">
                <Checkbox
                  checked={b.checked}
                  disabled={!onToggle}
                  onCheckedChange={() => onToggle?.(b.line)}
                  aria-label={b.text || "Checkbox"}
                  className="rounded-md"
                />
                <span className={cn("min-w-0 whitespace-pre-wrap break-words", b.checked && "text-muted-foreground line-through")}>
                  {b.text}
                </span>
              </label>
            );
          default:
            return (
              <p key={b.line} className="whitespace-pre-wrap break-words">
                {b.text}
              </p>
            );
        }
      })}
    </div>
  );
}

/** Copies text produced on click (it may need a fetch first) and says so for a moment. */
export function CopyTextButton({ label, getText }: { label: string; getText: () => Promise<string> | string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(await getText());
          setState("copied");
        } catch {
          setState("failed");
        }
        setTimeout(() => setState("idle"), 1800);
      }}
    >
      {state === "copied" ? "Copied" : state === "failed" ? "Couldn't copy" : label}
    </Button>
  );
}

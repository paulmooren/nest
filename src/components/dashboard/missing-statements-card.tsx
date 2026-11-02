"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { TRPCClientError } from "@trpc/client";
import { AlertTriangleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { trpc } from "@/trpc/react";
import { useRefresh } from "@/trpc/optimistic";
import { AFTER_BULK_TRANSACTION_CHANGE } from "@/components/finance/use-transactions";
import { Toast, toastPrimary, toastSecondary } from "@/components/toast";
import { suggestCategoryId } from "@/lib/categorize";
import { describeImport, readStatement, type ImportResult } from "@/lib/statement-import";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function lastMonthName() {
  const now = new Date();
  return MONTH_NAMES[(now.getMonth() + 11) % 12];
}

type Outcome =
  | { kind: "success"; accountId: string; accountName: string; result: ImportResult; skipped: number }
  | { kind: "error"; accountId: string; message: string };

/**
 * A full-width alert banner (not a card) for each account missing last
 * month's statement — stays up from the 1st of the month until that
 * account has a transaction dated last month (`dashboard.missingStatements`
 * is pure date-math re-evaluated on every load, so there's no dismissed/seen
 * state to track: it simply stops being true once imported). Named apart
 * from "Reminders" (recurring Tasks) — same word, unrelated concepts.
 *
 * "Import statement" opens the file picker right here; the file is read,
 * columns are guessed, and the rows are imported without leaving the
 * dashboard. A toast then confirms and links to the transactions.
 */
export function MissingStatementsCard() {
  const refresh = useRefresh();
  const { data: missingStatements } = trpc.dashboard.missingStatements.useQuery();
  const { data: categories } = trpc.category.list.useQuery();
  const [busyAccount, setBusyAccount] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const targetAccount = useRef<{ id: string; name: string } | null>(null);

  const importCsv = trpc.transaction.importCsv.useMutation();

  async function handleFile(file: File) {
    const account = targetAccount.current;
    if (!account) return;
    setOutcome(null);
    setBusyAccount(account.id);
    try {
      const statement = await readStatement(file);
      if (!statement.ok) {
        setOutcome({ kind: "error", accountId: account.id, message: statement.error });
        return;
      }
      const result = await importCsv.mutateAsync({
        accountId: account.id,
        accountIban: statement.accountIban,
        rows: statement.rows.map((r) => ({
          ...r,
          categoryId: suggestCategoryId(r.merchant, categories ?? []) ?? undefined,
        })),
      });
      // Confirm straight away; the screen catches up with the new data in the background.
      void refresh(...AFTER_BULK_TRANSACTION_CHANGE);
      setOutcome({
        kind: "success",
        accountId: account.id,
        accountName: account.name,
        result,
        skipped: statement.skipped,
      });
    } catch (e) {
      // A refusal the server explains (e.g. a statement for another account) is worth showing as is.
      const explained = e instanceof TRPCClientError && e.data?.code === "BAD_REQUEST" ? e.message : null;
      setOutcome({
        kind: "error",
        accountId: account.id,
        message: explained ?? "Something went wrong importing that file.",
      });
    } finally {
      setBusyAccount(null);
    }
  }

  const month = lastMonthName();
  const hasBanners = !!missingStatements && missingStatements.length > 0;
  if (!hasBanners && !outcome) return null;

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        aria-label="Bank statement CSV"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />

      {hasBanners && (
        <div className="flex flex-col gap-3">
          {missingStatements.map((r) => (
            <div
              key={r.accountId}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3"
            >
              <AlertTriangleIcon className="size-5 shrink-0 text-warning" aria-hidden />
              <p className="min-w-0 flex-1 text-sm leading-snug">
                <span className="font-semibold">Missing {month}&apos;s statement</span>{" "}
                <span className="text-muted-foreground">
                  — {r.accountName} has no transactions recorded for {month}.
                </span>
              </p>
              <Button
                type="button"
                disabled={busyAccount !== null}
                onClick={() => {
                  targetAccount.current = { id: r.accountId, name: r.accountName };
                  fileInput.current?.click();
                }}
              >
                {busyAccount === r.accountId ? "Importing…" : "Import statement"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {outcome?.kind === "success" && (
        <Toast
          onClose={() => setOutcome(null)}
          actions={
            <>
              <Link
                href={`/finance/transactions?account=${outcome.accountId}`}
                onClick={() => setOutcome(null)}
                className={toastPrimary}
              >
                View transactions
              </Link>
              <Button type="button" variant="ghost" onClick={() => setOutcome(null)} className={toastSecondary}>
                Close
              </Button>
            </>
          }
        >
          <p className="font-semibold">✓ {describeImport(outcome.result).headline}</p>
          <p className="mt-0.5 text-background/75">
            {outcome.accountName}
            {describeImport(outcome.result).detail && ` · ${describeImport(outcome.result).detail}`}
            {outcome.skipped > 0 && ` · ${outcome.skipped} row${outcome.skipped === 1 ? "" : "s"} skipped (no date or amount)`}
          </p>
        </Toast>
      )}

      {outcome?.kind === "error" && (
        <Toast
          onClose={() => setOutcome(null)}
          actions={
            <>
              <Link
                href={`/finance/transactions?import=${outcome.accountId}`}
                onClick={() => setOutcome(null)}
                className={toastPrimary}
              >
                Open the importer
              </Link>
              <Button type="button" variant="ghost" onClick={() => setOutcome(null)} className={toastSecondary}>
                Close
              </Button>
            </>
          }
        >
          <p className="font-semibold">Couldn&apos;t import that file</p>
          <p className="mt-0.5 text-background/75">{outcome.message}</p>
        </Toast>
      )}
    </>
  );
}

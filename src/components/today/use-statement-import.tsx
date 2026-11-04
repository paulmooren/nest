"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { TRPCClientError } from "@trpc/client";

import { Button } from "@/components/ui/button";

import { trpc } from "@/trpc/react";
import { useRefresh } from "@/trpc/optimistic";
import { AFTER_BULK_TRANSACTION_CHANGE } from "@/components/finance/use-transactions";
import { Toast, toastPrimary, toastSecondary } from "@/components/toast";
import { suggestCategoryId } from "@/lib/categorize";
import { describeImport, readStatement, type ImportResult } from "@/lib/statement-import";

type Outcome =
  | { kind: "success"; accountId: string; accountName: string; result: ImportResult; skipped: number }
  | { kind: "error"; accountId: string; message: string };

/**
 * Importing last month's statement from an Inbox row: "Import" opens the file picker right there; the file is read,
 * columns are guessed, and the rows are imported without leaving Today. A toast then confirms and links to the
 * transactions. The row itself disappears once the account has a transaction dated last month.
 *
 * `ui` holds the hidden file input and the toasts; render it once, anywhere on the page.
 */
export function useStatementImport() {
  const refresh = useRefresh();
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

  function start(account: { id: string; name: string }) {
    targetAccount.current = account;
    fileInput.current?.click();
  }

  const ui = (
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

      {outcome?.kind === "success" && (
        <Toast
          onClose={() => setOutcome(null)}
          actions={
            <>
              <Link
                href={`/finance/accounts/${outcome.accountId}`}
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
                href={`/finance/budgets?import=${outcome.accountId}`}
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

  return { start, busyAccount, ui };
}

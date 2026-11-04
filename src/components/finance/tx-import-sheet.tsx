"use client";

import { useMemo, useState } from "react";
import { FileIcon, UploadIcon } from "lucide-react";

import { trpc } from "@/trpc/react";
import { useRefresh } from "@/trpc/optimistic";
import { cleanMerchant, detectColumns, detectPartyColumns, normalizeIban, parseAmount, parseFlexibleDate } from "@/lib/csv";
import { formatDate, formatEUR } from "@/lib/format";
import { parseStatementText, statementIban, type ImportResult } from "@/lib/statement-import";
import { suggestCategoryId } from "@/lib/categorize";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AFTER_BULK_TRANSACTION_CHANGE } from "@/components/finance/use-transactions";

type ParsedRow = Record<string, string>;

function Pick({
  id,
  label,
  items,
  value,
  onChange,
}: {
  id: string;
  label: string;
  items: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field id={id} label={label}>
      <Select items={items} value={value} onValueChange={(v) => v !== null && onChange(v)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/**
 * Import a bank statement: pick the account and the CSV, check the detected columns, give each row a category (the
 * app suggests one), then import. Rows are never dropped for lacking a description; only an unreadable date or amount
 * skips one, and the count is shown. Re-importing is safe: the server skips what it already has.
 */
export function TxImportSheet({
  accounts,
  categories,
  initialAccountId,
  onImported,
  onClose,
}: {
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; color: string }[];
  initialAccountId?: string;
  onImported: (result: ImportResult) => void;
  onClose: () => void;
}) {
  const refresh = useRefresh();
  const [accountId, setAccountId] = useState(
    initialAccountId && accounts.some((a) => a.id === initialAccountId) ? initialAccountId : (accounts[0]?.id ?? ""),
  );
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [dateCol, setDateCol] = useState("");
  const [merchantCol, setMerchantCol] = useState("");
  const [merchantFallbackCol, setMerchantFallbackCol] = useState("");
  const [amountCol, setAmountCol] = useState("");
  // Who the statement is for and who each row was with; empty when the bank doesn't export them.
  const [partyCols, setPartyCols] = useState({ accountIbanCol: "", counterpartyIbanCol: "", counterpartyNameCol: "" });
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);

  const importCsv = trpc.transaction.importCsv.useMutation({
    onSuccess: (result) => {
      refresh(...AFTER_BULK_TRANSACTION_CHANGE);
      onImported(result);
    },
  });

  async function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    const parsed = await parseStatementText(await file.text());
    if (!parsed) {
      setError("Couldn't read the file. Is it a valid CSV file?");
      return;
    }
    setHeaders(parsed.fields);
    setRows(parsed.rows);
    const cols = detectColumns(parsed.fields);
    setDateCol(cols.dateCol);
    setMerchantCol(cols.merchantCol);
    setMerchantFallbackCol(cols.merchantFallbackCol);
    setAmountCol(cols.amountCol);
    setPartyCols(detectPartyColumns(parsed.fields));
  }

  const parsedRows = useMemo(
    () =>
      rows.map((row) => {
        const primary = merchantCol ? cleanMerchant(row[merchantCol] ?? "") : "";
        const fallback = merchantFallbackCol ? cleanMerchant(row[merchantFallbackCol] ?? "") : "";
        return {
          date: dateCol ? parseFlexibleDate(row[dateCol] ?? "") : null,
          merchant: primary || fallback || "Transaction",
          amount: amountCol ? parseAmount(row[amountCol] ?? "") : NaN,
          counterpartyIban: partyCols.counterpartyIbanCol ? normalizeIban(row[partyCols.counterpartyIbanCol]) : null,
          counterpartyName: partyCols.counterpartyNameCol
            ? cleanMerchant(row[partyCols.counterpartyNameCol] ?? "") || null
            : null,
        };
      }),
    [rows, dateCol, merchantCol, merchantFallbackCol, amountCol, partyCols],
  );

  function categoryFor(i: number, merchant: string) {
    return categoryOverrides[i] ?? suggestCategoryId(merchant, categories) ?? "";
  }

  const categorizedCount = parsedRows.filter((p, i) => categoryFor(i, p.merchant)).length;
  const skippedCount = parsedRows.filter((r) => !r.date || Number.isNaN(r.amount)).length;
  const columnItems = headers.map((h) => ({ value: h, label: h }));

  function handleImport() {
    const parsed = parsedRows
      .map((row, i) => ({ ...row, categoryId: categoryFor(i, row.merchant) || undefined }))
      .filter((r) => r.date && r.merchant && !Number.isNaN(r.amount)) as {
      date: Date;
      merchant: string;
      amount: number;
      categoryId?: string;
      counterpartyIban: string | null;
      counterpartyName: string | null;
    }[];

    if (parsed.length === 0) {
      setError("No valid rows found. Check the column mapping.");
      return;
    }
    importCsv.mutate({ accountId, accountIban: statementIban(rows, partyCols.accountIbanCol), rows: parsed });
  }

  const message =
    error ??
    (importCsv.error
      ? importCsv.error.data?.code === "BAD_REQUEST"
        ? importCsv.error.message
        : "The import didn't go through. Please try again, or check the column mapping."
      : null);

  return (
    <ResponsiveSheet open wide onOpenChange={(open) => !open && onClose()} title="Import bank statement">
      <div className="flex flex-col gap-5">
        <Pick id="import-account" label="Account" items={accounts.map((a) => ({ value: a.id, label: a.name }))} value={accountId} onChange={setAccountId} />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Bank statement</span>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
            className={cn(
              "flex min-h-11 cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
              dragging ? "border-foreground bg-muted" : "hover:border-foreground/40"
            )}
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              {fileName ? <FileIcon className="size-5" /> : <UploadIcon className="size-5" />}
            </span>
            {fileName ? (
              <>
                <span className="max-w-full truncate text-sm font-medium">{fileName}</span>
                <span className="text-sm text-muted-foreground">Choose a different file</span>
              </>
            ) : (
              <>
                <span className="text-sm font-medium">
                  Choose your statement, or drop it here
                </span>
                <span className="text-sm text-muted-foreground">CSV file from your bank</span>
              </>
            )}
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              aria-label="Bank statement CSV file"
              onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])}
            />
          </label>
        </div>

        {message && (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
            {message}
          </p>
        )}

        {headers.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Pick id="col-date" label="Date column" items={columnItems} value={dateCol} onChange={setDateCol} />
              <Pick id="col-merchant" label="Description column" items={columnItems} value={merchantCol} onChange={setMerchantCol} />
              <Pick id="col-amount" label="Amount column" items={columnItems} value={amountCol} onChange={setAmountCol} />
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">
                {rows.length} rows detected · {categorizedCount} categorized automatically — review before importing.
                Negative amount = expense, positive = income.
              </p>
              {skippedCount > 0 && (
                <p role="status" className="text-sm font-medium text-destructive">
                  {skippedCount} row{skippedCount === 1 ? "" : "s"} will be skipped — unreadable date or amount. Check
                  the column mapping above.
                </p>
              )}
            </div>

            <ul className="max-h-[50dvh] divide-y overflow-y-auto rounded-xl border">
              {parsedRows.map((p, i) => {
                const categoryId = categoryFor(i, p.merchant);
                const color = categories.find((c) => c.id === categoryId)?.color ?? "#9a9da5";
                return (
                  <li key={i} className="flex flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
                    <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.merchant}</p>
                        <p className="text-xs text-muted-foreground">{p.date ? formatDate(p.date) : "Unreadable date"}</p>
                      </div>
                      <span className="shrink-0 text-sm font-medium tabular-nums">
                        {Number.isNaN(p.amount) ? "—" : formatEUR(p.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 sm:w-52 sm:shrink-0">
                      <span className="block size-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
                      {/* A plain select: hundreds of rows each carrying a full menu would make this sheet slow. */}
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryOverrides((prev) => ({ ...prev, [i]: e.target.value }))}
                        aria-label={`Category for ${p.merchant}`}
                        className="min-h-11 w-full rounded-lg border bg-background px-2 text-base md:min-h-9 md:text-sm"
                      >
                        <option value="">No category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <div className="flex gap-2">
          <Button size="lg" className="flex-1" onClick={handleImport} disabled={importCsv.isPending || headers.length === 0}>
            {importCsv.isPending ? "Importing…" : headers.length > 0 ? `Import ${rows.length} transactions` : "Import"}
          </Button>
          <Button variant="outline" size="lg" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </ResponsiveSheet>
  );
}

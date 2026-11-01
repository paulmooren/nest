"use client";

import { useRouter } from "next/navigation";

import { trpc } from "@/trpc/react";
import { Button } from "@/components/ds/button";
import { PageBody } from "@/components/ds/page-header";
import { Section } from "@/components/ds/section";
import { IS_DEMO_CLIENT } from "@/lib/demo";

export default function DataSettingsPage() {
  const utils = trpc.useUtils();

  async function exportJson() {
    const data = await utils.user.exportData.fetch();
    downloadBlob(JSON.stringify(data, null, 2), "nest-export.json", "application/json");
  }

  async function exportCsv() {
    const transactions = await utils.transaction.list.fetch({ limit: 200 });
    const header = "Date,Description,Category,Type,Amount\n";
    const body = transactions
      .map((t) =>
        [
          new Date(t.date).toISOString().slice(0, 10),
          `"${t.merchant.replace(/"/g, '""')}"`,
          t.category?.name ?? "",
          t.type,
          Number(t.amount).toFixed(2),
        ].join(","),
      )
      .join("\n");
    downloadBlob(header + body, "nest-transactions.csv", "text/csv");
  }

  return (
    <PageBody className="gap-10">
      {IS_DEMO_CLIENT && <ResetDemo />}
      <Section title="Export data" description="Your data belongs to you — download it anytime.">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={exportCsv}>
            Transactions (CSV)
          </Button>
          <Button variant="outline" onClick={exportJson}>
            All data (JSON)
          </Button>
        </div>
      </Section>
    </PageBody>
  );
}

/** Demo only: throw away every change and start again from the made-up household, dated relative to today. */
function ResetDemo() {
  const utils = trpc.useUtils();
  const router = useRouter();
  const reset = trpc.demo.reset.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
      router.push("/dashboard");
    },
  });
  return (
    <Section
      title="Reset demo"
      description="Undoes every change made while showing the app and starts again from the made-up household, with dates brought up to today."
    >
      <div>
        <Button onClick={() => reset.mutate()} disabled={reset.isPending}>
          {reset.isPending ? "Resetting…" : "Reset demo"}
        </Button>
        {reset.error && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {reset.error.message}
          </p>
        )}
      </div>
    </Section>
  );
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/server/api/root";
import { trpc } from "@/trpc/react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { EmptyState } from "@/components/ui/empty-state";
import { ListTools } from "@/components/ui/list-tools";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { Row, RowList } from "@/components/ui/row";
import { useDelayed } from "@/components/use-delayed";
import { ModuleGate } from "@/components/use-modules";
import { CategoryManager } from "@/components/vault/category-manager";
import { prepareFiles, stashDroppedFiles } from "@/components/vault/uploads";
import { ExpiryBadge, VaultBones } from "@/components/vault/vault-ui";
import { expiryLabel } from "@/lib/vault";

export default function VaultPage() {
  return (
    <ModuleGate module="vault">
      <Vault />
    </ModuleGate>
  );
}

type Entry = inferRouterOutputs<AppRouter>["vault"]["list"][number];

type VaultShow = "all" | "expiry" | "files";
type VaultSort = "category" | "name" | "expiry";
const SORTS: { value: VaultSort; label: string }[] = [
  { value: "category", label: "Category" },
  { value: "name", label: "Name" },
  { value: "expiry", label: "Expires soonest" },
];
const byTitle = (a: Entry, b: Entry) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
const BY: Record<Exclude<VaultSort, "category">, (a: Entry, b: Entry) => number> = {
  name: byTitle,
  // Entries with no expiry date come last.
  expiry: (a, b) => (a.expiresOn ? new Date(a.expiresOn).getTime() : Infinity) - (b.expiresOn ? new Date(b.expiresOn).getTime() : Infinity) || byTitle(a, b),
};

function Vault() {
  const router = useRouter();
  const { data: entries } = trpc.vault.list.useQuery();
  const { data: categories } = trpc.vault.listCategories.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const { data: household } = trpc.household.current.useQuery();
  const showSkeleton = useDelayed(!entries || !categories || !me);

  const [query, setQuery] = useState<string | null>(null);
  const [show, setShow] = useState<VaultShow>("all");
  const [sort, setSort] = useState<VaultSort>("category");
  const [categoryId, setCategoryId] = useState("all");
  const [managing, setManaging] = useState(false);
  const [dragging, setDragging] = useState(false);

  const members = household?.members ?? [];
  const multiMember = members.length > 1;
  const categoryName = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c.name])), [categories]);

  const visible = useMemo(() => {
    const q = (query ?? "").trim().toLowerCase();
    return (entries ?? []).filter((e) => {
      if (categoryId !== "all" && e.categoryId !== categoryId) return false;
      if (show === "expiry" && !e.expiresOn) return false;
      if (show === "files" && e.attachmentCount === 0) return false;
      if (!q) return true;
      const haystack = [
        e.title,
        categoryName.get(e.categoryId) ?? "",
        e.expiryLabel ?? "",
        ...e.secretLabels,
        ...e.plainFields.flatMap((f) => [f.label, f.value]),
      ];
      return haystack.some((s) => s.toLowerCase().includes(q));
    });
  }, [entries, query, categoryId, categoryName, show]);

  const newEntry = (
    <Button render={<Link href="/vault/new" />} nativeButton={false}>
      <PlusIcon /> New entry
    </Button>
  );

  if (!entries || !categories || !me) {
    return (
      <>
        <PageHeader title="Vault" actions={newEntry} inHeader />
        {showSkeleton && <VaultBones />}
      </>
    );
  }

  // One flat list as soon as anything narrows or reorders it; otherwise Pinned on top and the rest by category.
  const searching = (query ?? "").trim() !== "" || categoryId !== "all" || show !== "all" || sort !== "category";
  const pinned = searching ? [] : visible.filter((e) => e.pinned);
  const rest = searching ? (sort === "category" ? visible : [...visible].sort(BY[sort])) : visible.filter((e) => !e.pinned);
  const groups = categories
    .map((c) => ({ category: c, entries: rest.filter((e) => e.categoryId === c.id) }))
    .filter((g) => g.entries.length > 0);

  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.categoryId, (counts.get(e.categoryId) ?? 0) + 1);

  async function onDrop(files: FileList) {
    const { ok } = await prepareFiles([...files]);
    if (ok.length === 0) return;
    stashDroppedFiles(ok);
    router.push("/vault/new");
  }

  const row = (entry: Entry) => {
    const expiry = entry.expiresOn ? expiryLabel(entry.expiresOn, entry.expiryLabel) : null;
    const owner = multiMember && entry.ownerId ? members.find((m) => m.user.id === entry.ownerId) : undefined;
    const meta = [
      searching ? categoryName.get(entry.categoryId) : undefined,
      entry.attachmentCount > 0 ? `${entry.attachmentCount} file${entry.attachmentCount === 1 ? "" : "s"}` : undefined,
    ]
      .filter(Boolean)
      .join(" · ");
    return (
      <Row
        key={entry.id}
        href={`/vault/${entry.id}`}
        leading={owner ? <Avatar name={owner.user.name || owner.user.email} image={owner.user.image} size={24} /> : undefined}
        title={entry.title}
        meta={meta || undefined}
        trailing={expiry ? <ExpiryBadge text={expiry.text} critical={expiry.critical} /> : undefined}
      />
    );
  };

  const list = (title: string, rows: Entry[]) => (
    <section key={title} aria-label={title} className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold tracking-[0.09em] text-muted-foreground uppercase">{title}</h2>
      <RowList>{rows.map(row)}</RowList>
    </section>
  );

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDragging(false);
        void onDrop(e.dataTransfer.files);
      }}
    >
      <PageHeader title="Vault" actions={newEntry} inHeader />
      <PageBody>
        {dragging && (
          <p className="rounded-2xl border border-dashed border-foreground/40 bg-muted px-6 py-6 text-center text-sm text-muted-foreground">
            Drop files to start a new entry
          </p>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ChoiceChips
              label="Filter by category"
              value={categoryId}
              onChange={setCategoryId}
              options={[
                { value: "all", label: `All ${entries.length}` },
                ...categories
                  .filter((c) => counts.has(c.id) || categoryId === c.id)
                  .map((c) => ({ value: c.id, label: `${c.name} ${counts.get(c.id) ?? 0}` })),
              ]}
            />
            <Button type="button" variant="ghost" onClick={() => setManaging(true)}>
              Edit categories
            </Button>
          </div>
        </div>

        {entries.length > 0 && (
          <ListTools
            count={visible.length}
            noun={["entry", "entries"]}
            filters={[
              {
                key: "show",
                label: "Show",
                value: show,
                any: "all",
                options: [
                  { value: "all", label: "Everything" },
                  { value: "expiry", label: "With an expiry date" },
                  { value: "files", label: "With files" },
                ],
              },
            ]}
            onFilter={(_, value) => setShow(value as VaultShow)}
            sort={{ value: sort, initial: "category", options: SORTS, onChange: setSort }}
            query={query}
            onQuery={setQuery}
            searchPlaceholder="Search titles, labels and details"
          />
        )}

        {entries.length === 0 && (
          <EmptyState
            title="Nothing in the Vault yet. Add your passport, policy numbers, warranties, invoices — anything you'd otherwise dig around for. You can also drop a file here to start."
            action={newEntry}
          />
        )}

        {entries.length > 0 && visible.length === 0 && (
          <EmptyState title="Nothing matches. Search covers titles, labels and plain details — not secrets or file contents." />
        )}

        {pinned.length > 0 && list("Pinned", pinned)}
        {searching
          ? visible.length > 0 && list(sort === "category" ? "Found" : (SORTS.find((o) => o.value === sort)?.label ?? ""), rest)
          : groups.map((g) => list(g.category.name, g.entries))}
      </PageBody>

      {managing && <CategoryManager onClose={() => setManaging(false)} />}
    </div>
  );
}

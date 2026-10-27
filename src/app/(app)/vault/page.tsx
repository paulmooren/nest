"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@base-ui/react/button";
import { Input } from "@base-ui/react/input";

import { useDelayed } from "@/components/use-delayed";
import { RowsSkeleton } from "@/components/ui/skeleton";
import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/server/api/root";
import { trpc } from "@/trpc/react";
import { Avatar } from "@/components/avatar";
import { PageActions } from "@/components/page-actions";
import { ModuleGate } from "@/components/use-modules";
import { CategoryManager } from "@/components/vault/category-manager";
import { prepareFiles, stashDroppedFiles } from "@/components/vault/uploads";
import { expiryLabel } from "@/lib/vault";

export default function VaultPage() {
  return (
    <ModuleGate module="vault">
      <Vault />
    </ModuleGate>
  );
}

type Entry = inferRouterOutputs<AppRouter>["vault"]["list"][number];

function Vault() {
  const router = useRouter();
  const { data: entries } = trpc.vault.list.useQuery();
  const { data: categories } = trpc.vault.listCategories.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const { data: household } = trpc.household.current.useQuery();
  const showSkeleton = useDelayed(!entries || !categories || !me);

  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const [dragging, setDragging] = useState(false);

  const members = household?.members ?? [];
  const multiMember = members.length > 1;
  const categoryName = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c.name])), [categories]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (entries ?? []).filter((e) => {
      if (categoryId && e.categoryId !== categoryId) return false;
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
  }, [entries, query, categoryId, categoryName]);

  if (!entries || !categories || !me) return showSkeleton ? <RowsSkeleton rows={6} /> : null;

  const searching = query.trim() !== "" || categoryId !== null;
  const pinned = searching ? [] : visible.filter((e) => e.pinned);
  const rest = searching ? visible : visible.filter((e) => !e.pinned);
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

  const row = (entry: Entry) => (
    <EntryRow
      key={entry.id}
      entry={entry}
      category={searching ? categoryName.get(entry.categoryId) : undefined}
      owner={multiMember && entry.ownerId ? members.find((m) => m.user.id === entry.ownerId) : undefined}
    />
  );

  return (
    <div
      className="flex flex-col gap-6"
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
      <PageActions>
        <Link
          href="/vault/new"
          className="inline-flex min-h-[var(--tap-primary)] items-center rounded-xl bg-accent-fill px-5 text-[15px] font-semibold text-accent-ink hover:opacity-90 md:min-h-0 md:px-4 md:py-2.5 md:text-[13.5px]"
        >
          + New entry
        </Link>
      </PageActions>

      {dragging && (
        <p className="rounded-2xl border border-dashed border-accent bg-surface-2 px-6 py-6 text-center text-[14px] text-text-muted">
          Drop files to start a new entry
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles, labels and details"
          aria-label="Search the Vault"
          className="w-full rounded-xl border border-border-soft bg-surface px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-text-faint focus:border-accent md:max-w-md md:py-2.5 md:text-[14px]"
        />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0" role="group" aria-label="Filter by category">
          <Chip active={categoryId === null} onClick={() => setCategoryId(null)}>
            All <span className="text-text-faint">{entries.length}</span>
          </Chip>
          {categories
            .filter((c) => counts.has(c.id) || categoryId === c.id)
            .map((c) => (
              <Chip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}>
                {c.name} <span className="text-text-faint">{counts.get(c.id) ?? 0}</span>
              </Chip>
            ))}
          <Button
            type="button"
            onClick={() => setManaging(true)}
            className="inline-flex min-h-[var(--tap)] shrink-0 items-center px-3 text-[13px] font-medium text-accent hover:opacity-80 md:min-h-0 md:py-1.5"
          >
            Edit categories
          </Button>
        </div>
      </div>

      {entries.length === 0 && (
        <p className="text-[13.5px] text-text-muted">
          Nothing in the Vault yet. Add your passport, policy numbers, warranties, invoices — anything you&apos;d
          otherwise dig around for. You can also drop a file here to start.
        </p>
      )}

      {entries.length > 0 && visible.length === 0 && (
        <p className="text-[13.5px] text-text-muted">Nothing matches. Search covers titles, labels and plain details — not secrets or file contents.</p>
      )}

      {pinned.length > 0 && <Section title="Pinned">{pinned.map(row)}</Section>}
      {searching ? (
        visible.length > 0 && <Section title={`${visible.length} ${visible.length === 1 ? "entry" : "entries"}`}>{rest.map(row)}</Section>
      ) : (
        groups.map((g) => (
          <Section key={g.category.id} title={g.category.name}>
            {g.entries.map(row)}
          </Section>
        ))
      )}

      {managing && <CategoryManager onClose={() => setManaging(false)} />}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-[var(--tap)] shrink-0 items-center gap-1.5 rounded-full border px-4 text-[14px] font-medium transition-colors md:min-h-0 md:px-3.5 md:py-1.5 md:text-[13px] ${
        active ? "border-text bg-text text-bg" : "border-transparent bg-surface-2 text-text-muted hover:text-text"
      }`}
    >
      {children}
    </Button>
  );
}

/** A heading and its rows: boxed on larger screens, plain rows on a phone. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[13px] font-semibold tracking-wide text-text-muted">{title}</h2>
      <div className="flex flex-col divide-y divide-border-soft md:overflow-hidden md:rounded-[20px] md:border md:border-border-soft md:bg-surface">
        {children}
      </div>
    </section>
  );
}

function EntryRow({
  entry,
  category,
  owner,
}: {
  entry: Entry;
  category?: string;
  owner?: { user: { name: string | null; email: string; image: string | null } };
}) {
  const expiry = entry.expiresOn ? expiryLabel(entry.expiresOn, entry.expiryLabel) : null;
  const subtitle = [category, entry.attachmentCount > 0 ? `${entry.attachmentCount} file${entry.attachmentCount === 1 ? "" : "s"}` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      href={`/vault/${entry.id}`}
      className="flex min-h-[var(--tap-primary)] items-center gap-3 py-3 transition-colors hover:bg-surface-hover md:px-6"
    >
      {owner && <Avatar name={owner.user.name || owner.user.email} image={owner.user.image} size={22} />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15.5px] font-medium md:text-[14.5px]">{entry.title}</p>
        {subtitle && <p className="truncate text-[12.5px] text-text-muted">{subtitle}</p>}
      </div>
      {expiry && (
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
            expiry.critical ? "bg-critical/10 text-critical" : "bg-surface-2 text-text-muted"
          }`}
        >
          {expiry.text}
        </span>
      )}
    </Link>
  );
}

"use client";

import { useState } from "react";
import { PencilIcon } from "lucide-react";

import { SECTION_PREFIX, SortableBoard, SortableList, SortableSection, type BoardDrop } from "@/components/sortable-list";
import { monthlyOf, type BudgetItem, type Entry } from "@/lib/budget-scope";
import { formatEUR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { AddChip } from "@/components/ui/choice-chips";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { RowList } from "@/components/ui/row";
import { TextField } from "@/components/ui/text-field";

export type BudgetGroup = { id: string; name: string };

type GroupedItem = BudgetItem & { budgetGroupId: string | null };

const OTHER = `${SECTION_PREFIX}other`;

/** Rename or delete a Budget group. Deleting keeps its items, under Other. */
function GroupSheet({
  group,
  onRename,
  onDelete,
  onClose,
}: {
  group: BudgetGroup;
  onRename: (name: string) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [confirming, setConfirming] = useState(false);
  const close = () => {
    const next = name.trim();
    if (next && next !== group.name) onRename(next);
    onClose();
  };
  return (
    <>
      <ResponsiveSheet open={!confirming} onOpenChange={(open) => !open && close()} title="Budget group">
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            close();
          }}
        >
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <div className="flex gap-2">
            <Button type="submit" size="lg" className="flex-1">
              Done
            </Button>
            <Button type="button" variant="outline" size="lg" className="text-destructive" onClick={() => setConfirming(true)}>
              Delete group
            </Button>
          </div>
        </form>
      </ResponsiveSheet>
      <ConfirmDelete
        open={confirming}
        onOpenChange={(o) => {
          setConfirming(o);
          if (!o) onClose();
        }}
        title={`Delete the group “${group.name}”?`}
        description="Its items stay, under Other."
        confirmLabel="Delete group"
        onConfirm={onDelete}
      />
    </>
  );
}

/**
 * The expenses of one owner group, split into the household's Budget groups — Rent, Insurances, Savings — each with
 * its subtotal, and what has no group under "Other". Rows can be dragged within a section to reorder, or into
 * another to change group.
 *
 * Only groups that hold something here are shown, plus a brand-new group (used by nothing yet) in `hostsFresh`, so
 * there is somewhere to drop the first item. With no groups at all it is just the plain list.
 */
export function ExpenseSections<T extends GroupedItem>({
  entries,
  groups,
  usedGroupIds,
  hostsFresh,
  renderRow,
  onReorder,
  onMove,
  onRename,
  onDelete,
}: {
  entries: Entry<T>[];
  groups: BudgetGroup[];
  /** Groups that hold at least one item anywhere in the household. */
  usedGroupIds: Set<string>;
  hostsFresh: boolean;
  renderRow: (entry: Entry<T>) => React.ReactNode;
  onReorder: (ids: string[]) => void;
  onMove: (move: { id: string; groupId: string | null; ids: string[] }) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [managing, setManaging] = useState<BudgetGroup | null>(null);
  const known = new Set(groups.map((g) => g.id));
  const sections: { id: string; group: BudgetGroup | null; entries: Entry<T>[] }[] = [];
  for (const group of groups) {
    const inGroup = entries.filter((e) => e.item.budgetGroupId === group.id);
    if (inGroup.length > 0 || (hostsFresh && !usedGroupIds.has(group.id))) {
      sections.push({ id: `${SECTION_PREFIX}${group.id}`, group, entries: inGroup });
    }
  }
  const other = entries.filter((e) => !e.item.budgetGroupId || !known.has(e.item.budgetGroupId));
  if (other.length > 0) sections.push({ id: OTHER, group: null, entries: other });

  // Nothing to tell apart: the plain list.
  if (sections.length === 0 || (sections.length === 1 && sections[0].group === null)) {
    return entries.length === 0 ? null : (
      <SortableList ids={entries.map((e) => e.item.id)} onReorder={onReorder}>
        <RowList>{entries.map(renderRow)}</RowList>
      </SortableList>
    );
  }

  function handleDrop({ id, from, to, ids }: BoardDrop) {
    if (from === to) onReorder(ids);
    else onMove({ id, groupId: to === OTHER ? null : to.slice(SECTION_PREFIX.length), ids });
  }

  return (
    <>
      <SortableBoard sections={sections.map((s) => ({ id: s.id, ids: s.entries.map((e) => e.item.id) }))} onDrop={handleDrop}>
        <div className="flex flex-col gap-5">
          {sections.map((section) => (
            <section key={section.id} aria-label={section.group?.name ?? "Other"} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex min-w-0 items-center gap-1 text-xs font-semibold tracking-[0.09em] text-muted-foreground uppercase">
                  <span className="truncate">{section.group?.name ?? "Other"}</span>
                  {section.group && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Edit group ${section.group.name}`}
                      onClick={() => setManaging(section.group)}
                    >
                      <PencilIcon />
                    </Button>
                  )}
                </h3>
                {section.entries.length > 0 && (
                  <p className="shrink-0 text-sm text-muted-foreground tabular-nums md:text-xs">
                    {formatEUR(section.entries.reduce((sum, e) => sum + monthlyOf(e.item), 0))} / mo
                  </p>
                )}
              </div>
              <SortableSection
                id={section.id}
                ids={section.entries.map((e) => e.item.id)}
                empty={
                  <p className="rounded-xl border border-dashed px-4 py-4 text-sm text-muted-foreground">
                    Drag an item here, or choose this group when you edit one.
                  </p>
                }
              >
                {section.entries.length > 0 && <RowList>{section.entries.map(renderRow)}</RowList>}
              </SortableSection>
            </section>
          ))}
        </div>
      </SortableBoard>
      {managing && (
        <GroupSheet
          group={managing}
          onRename={(name) => onRename(managing.id, name)}
          onDelete={() => onDelete(managing.id)}
          onClose={() => setManaging(null)}
        />
      )}
    </>
  );
}

/** "Add group": a name in a small sheet. */
export function AddGroup({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return (
    <>
      <div className="self-start">
        <AddChip onClick={() => setOpen(true)}>Group</AddChip>
      </div>
      {open && (
        <ResponsiveSheet open onOpenChange={(o) => !o && setOpen(false)} title="New group">
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              onAdd(name.trim());
              setName("");
              setOpen(false);
            }}
          >
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Insurances" autoFocus />
            <Button type="submit" size="lg" disabled={!name.trim()}>
              Add group
            </Button>
          </form>
        </ResponsiveSheet>
      )}
    </>
  );
}

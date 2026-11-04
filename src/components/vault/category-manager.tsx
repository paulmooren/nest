"use client";

import { useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from "lucide-react";

import { trpc } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Input } from "@/components/ui/input";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { showToast } from "@/components/toast";
import { newId } from "@/lib/client-id";

/** Rename, reorder, add and delete the Household's Vault categories. "Other" is the fallback and stays. */
export function CategoryManager({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: categories } = trpc.vault.listCategories.useQuery();
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  const refresh = () => Promise.all([utils.vault.listCategories.invalidate(), utils.vault.list.invalidate()]);
  const onError = (e: { message: string }) => showToast(e.message);
  const create = trpc.vault.createCategory.useMutation({ onSuccess: refresh, onError });
  const rename = trpc.vault.renameCategory.useMutation({ onSuccess: refresh, onError });
  const remove = trpc.vault.deleteCategory.useMutation({ onSuccess: refresh, onError });
  const reorder = trpc.vault.reorderCategories.useMutation({ onSuccess: refresh, onError });

  function move(index: number, by: -1 | 1) {
    if (!categories) return;
    const ids = categories.map((c) => c.id);
    const target = index + by;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate({ ids });
  }

  return (
    <ResponsiveSheet open onOpenChange={(open) => !open && onClose()} title="Categories">
      <div className="flex flex-col gap-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) return;
            create.mutate({ id: newId(), name: trimmed });
            setName("");
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="New category" aria-label="New category" />
          <Button type="submit" disabled={!name.trim()}>
            Add
          </Button>
        </form>

        <ul className="flex flex-col">
          {categories?.map((c, i) => (
            <li key={c.id} className="flex items-center gap-1">
              {c.isFallback ? (
                <span className="flex min-h-11 flex-1 items-center px-3 text-base text-muted-foreground md:text-sm">{c.name}</span>
              ) : (
                <Input
                  defaultValue={c.name}
                  maxLength={40}
                  aria-label={`Rename ${c.name}`}
                  className="border-transparent bg-transparent shadow-none hover:border-input focus-visible:bg-background"
                  onBlur={(e) => {
                    const next = e.target.value.trim();
                    if (next && next !== c.name) rename.mutate({ id: c.id, name: next });
                    else e.target.value = c.name;
                  }}
                />
              )}
              <Button type="button" variant="ghost" size="icon" aria-label={`Move ${c.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUpIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Move ${c.name} down`}
                disabled={i === categories.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDownIcon />
              </Button>
              {c.isFallback ? (
                <span className="w-11 shrink-0 md:w-9" />
              ) : (
                <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${c.name}`} onClick={() => setDeleting({ id: c.id, name: c.name })}>
                  <Trash2Icon />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete "${deleting?.name ?? ""}"?`}
        description="Its entries move to Other."
        onConfirm={() => deleting && remove.mutate({ id: deleting.id })}
      />
    </ResponsiveSheet>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@base-ui/react/button";
import { Input } from "@base-ui/react/input";

import { Modal } from "@/components/modal";
import { useConfirm } from "@/components/confirm-dialog";
import { showToast } from "@/components/toast";
import { trpc } from "@/trpc/react";
import { newId } from "@/lib/client-id";
import { TrashIcon } from "@/components/action-icons";

const inputClass =
  "min-w-0 flex-1 rounded-xl border border-border-soft bg-surface px-3.5 py-2.5 text-[14px] outline-none transition-colors placeholder:text-text-faint focus:border-accent";

/** Rename, reorder, add and delete the Household's Vault categories. */
export function CategoryManager({ onClose }: { onClose: () => void }) {
  const confirm = useConfirm();
  const utils = trpc.useUtils();
  const { data: categories } = trpc.vault.listCategories.useQuery();
  const [name, setName] = useState("");

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
    <Modal title="Categories" onClose={onClose}>
      <div className="flex flex-col gap-2">
        {categories?.map((c, i) => (
          <div key={c.id} className="flex items-center gap-2">
            {c.isFallback ? (
              <span className={`${inputClass} border-transparent bg-surface-2 text-text-muted`}>{c.name}</span>
            ) : (
              <Input
                defaultValue={c.name}
                maxLength={40}
                aria-label={`Rename ${c.name}`}
                className={inputClass}
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (next && next !== c.name) rename.mutate({ id: c.id, name: next });
                  else e.target.value = c.name;
                }}
              />
            )}
            <Button
              type="button"
              aria-label={`Move ${c.name} up`}
              disabled={i === 0}
              onClick={() => move(i, -1)}
              className="min-h-[var(--tap)] px-2 text-text-faint hover:text-text disabled:opacity-30"
            >
              ↑
            </Button>
            <Button
              type="button"
              aria-label={`Move ${c.name} down`}
              disabled={i === categories.length - 1}
              onClick={() => move(i, 1)}
              className="min-h-[var(--tap)] px-2 text-text-faint hover:text-text disabled:opacity-30"
            >
              ↓
            </Button>
            {c.isFallback ? (
              <span className="w-8" />
            ) : (
              <Button
                type="button"
                aria-label={`Delete ${c.name}`}
                onClick={async () => {
                  if (
                    await confirm({
                      title: `Delete "${c.name}"?`,
                      description: "Its entries move to Other.",
                    })
                  )
                    remove.mutate({ id: c.id });
                }}
                className="flex h-8 w-8 items-center justify-center text-text-faint hover:text-critical"
              >
                <span className="h-4 w-4">
                  <TrashIcon />
                </span>
              </Button>
            )}
          </div>
        ))}
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) return;
            create.mutate({ id: newId(), name: trimmed });
            setName("");
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="New category"
            aria-label="New category"
            className={inputClass}
          />
          <Button
            type="submit"
            className="min-h-[var(--tap)] rounded-xl bg-accent-fill px-4 text-[14px] font-semibold text-accent-ink"
          >
            Add
          </Button>
        </form>
      </div>
    </Modal>
  );
}

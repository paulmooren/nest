"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@base-ui/react/button";

import { ModuleGate } from "@/components/use-modules";
import { trpc } from "@/trpc/react";
import { VaultEntryForm, type EntryFormInitial } from "@/components/vault/entry-form";
import { takeDroppedFiles, uploadAttachment } from "@/components/vault/uploads";
import { useRefreshVault } from "@/components/vault/use-vault";
import { showToast } from "@/components/toast";
import { newId } from "@/lib/client-id";
import { BLANK_TEMPLATE, FALLBACK_VAULT_CATEGORY, VAULT_TEMPLATES, templateByKey } from "@/lib/vault";

export default function NewVaultEntryPage() {
  return (
    <ModuleGate module="vault">
      <Suspense>
        <NewEntry />
      </Suspense>
    </ModuleGate>
  );
}

function NewEntry() {
  const router = useRouter();
  const search = useSearchParams();
  const templateKey = search.get("template");
  const { data: categories } = trpc.vault.listCategories.useQuery();
  // Files dropped on the list are picked up once, here, and kept for the form.
  const [dropped] = useState(() => takeDroppedFiles());
  const create = trpc.vault.create.useMutation();
  const refresh = useRefreshVault();
  const [saving, setSaving] = useState(false);

  const template = templateKey ? templateByKey(templateKey) : null;
  const initial = useMemo<EntryFormInitial | null>(() => {
    if (!template || !categories) return null;
    const category =
      categories.find((c) => c.name === template.category) ??
      categories.find((c) => c.name === FALLBACK_VAULT_CATEGORY) ??
      categories[0];
    return {
      title: "",
      categoryId: category.id,
      expiresOn: null,
      expiryLabel: template.dateLabel,
      hasDate: template.dateLabel !== null,
      shared: false,
      fields: template.fields.map((f) => ({ ...f, value: "" })),
      note: null,
    };
  }, [template, categories]);

  if (!categories) return null;

  if (!template || !initial) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-[17px] font-semibold">What are you adding?</h2>
          <p className="mt-1 text-[13px] text-text-muted">
            A starting point only — you can change every field afterwards.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {[...VAULT_TEMPLATES, BLANK_TEMPLATE].map((t) => (
            <Button
              key={t.key}
              type="button"
              onClick={() => router.replace(`/vault/new?template=${t.key}`)}
              className="flex min-h-[var(--tap-primary)] flex-col items-start justify-center gap-0.5 rounded-2xl border border-border-soft bg-surface px-4 py-3 text-left transition-colors hover:border-border"
            >
              <span className="text-[15px] font-semibold">{t.label}</span>
              <span className="text-[12.5px] text-text-muted">{t.hint}</span>
            </Button>
          ))}
        </div>
        {dropped.length > 0 && (
          <p className="text-[13px] text-text-muted">
            {dropped.length} file{dropped.length === 1 ? "" : "s"} ready to attach.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[17px] font-semibold">New {template.key === "blank" ? "entry" : template.label.toLowerCase()}</h2>
      <VaultEntryForm
        initial={initial}
        categories={categories}
        pending={saving}
        initialFiles={dropped}
        onCancel={() => router.push("/vault")}
        onSubmit={async (values, files) => {
          setSaving(true);
          const id = newId();
          try {
            await create.mutateAsync({ id, ...values });
          } catch {
            setSaving(false);
            showToast("Couldn't save this entry");
            return;
          }
          const failed: string[] = [];
          for (const file of files) {
            const problem = await uploadAttachment(id, file);
            if (problem) failed.push(problem);
          }
          await refresh();
          if (failed.length) showToast(failed[0]);
          router.push(`/vault/${id}`);
        }}
      />
    </div>
  );
}

"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ModuleGate } from "@/components/use-modules";
import { trpc } from "@/trpc/react";
import { PageBody, PageHeader } from "@/components/ds/page-header";
import { Row, RowList } from "@/components/ds/row";
import { VaultEntryForm, type EntryFormInitial } from "@/components/vault/entry-form";
import { takeDroppedFiles, uploadAttachment } from "@/components/vault/uploads";
import { useRefreshVault } from "@/components/vault/use-vault";
import { VaultBackLink } from "@/components/vault/vault-ui";
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
      <>
        <VaultBackLink />
        <PageHeader title="What are you adding?" description="A starting point only — you can change every field afterwards." />
        <PageBody>
          <RowList>
            {[...VAULT_TEMPLATES, BLANK_TEMPLATE].map((t) => (
              <Row key={t.key} title={t.label} meta={t.hint} chevron onClick={() => router.replace(`/vault/new?template=${t.key}`)} />
            ))}
          </RowList>
          {dropped.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {dropped.length} file{dropped.length === 1 ? "" : "s"} ready to attach.
            </p>
          )}
        </PageBody>
      </>
    );
  }

  return (
    <>
      <VaultBackLink />
      <PageHeader title={`New ${template.key === "blank" ? "entry" : template.label.toLowerCase()}`} />
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
    </>
  );
}

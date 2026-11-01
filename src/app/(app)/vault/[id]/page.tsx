"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { trpc } from "@/trpc/react";
import { useDelayed } from "@/components/use-delayed";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { EmptyState } from "@/components/ui/empty-state";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { VaultBackLink, VaultBones } from "@/components/vault/vault-ui";
import { ModuleGate } from "@/components/use-modules";
import { VaultEntryForm } from "@/components/vault/entry-form";
import { prepareFiles, uploadAttachment } from "@/components/vault/uploads";
import { useRefreshVault, useVaultActions } from "@/components/vault/use-vault";
import { showToast } from "@/components/toast";
import { PlusIcon, XIcon } from "lucide-react";
import { formatDate } from "@/lib/format";
import { ATTACHMENTS_PER_ENTRY, ATTACHMENT_TYPES, expiryLabel, formatFileSize, type VaultField } from "@/lib/vault";

/** A revealed entry hides itself again after this long. */
const AUTO_HIDE_MS = 60_000;

type Revealed = { fields: VaultField[]; note: string | null };

export default function VaultEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ModuleGate module="vault">
      <EntryDetail id={id} />
    </ModuleGate>
  );
}

function EntryDetail({ id }: { id: string }) {
  const router = useRouter();
  const vault = useVaultActions();
  const refresh = useRefreshVault();
  const { data: entry, error } = trpc.vault.get.useQuery({ id }, { retry: false });
  // The section layout titles this page "Vault"; name the entry too, so a tab or history list tells entries apart.
  const entryTitle = entry?.title;
  useEffect(() => {
    if (entryTitle) document.title = `${entryTitle} · Vault · Nest`;
  }, [entryTitle]);
  const { data: categories } = trpc.vault.listCategories.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const { data: household } = trpc.household.current.useQuery();
  const showSkeleton = useDelayed(!entry && !error);

  const [revealed, setRevealed] = useState<Revealed | null>(null);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [removingFile, setRemovingFile] = useState<{ id: string; name: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const reveal = trpc.vault.reveal.useMutation();
  const update = trpc.vault.update.useMutation();
  const removeAttachment = trpc.vault.removeAttachment.useMutation({ onSuccess: refresh });

  // Never leave decrypted values sitting in memory after leaving the page.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function hide() {
    if (timer.current) clearTimeout(timer.current);
    setRevealed(null);
  }

  async function show() {
    const data = await reveal.mutateAsync({ id });
    setRevealed({ fields: data.fields, note: data.note });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(hide, AUTO_HIDE_MS);
    return data;
  }

  if (error) {
    return (
      <>
        <VaultBackLink />
        <EmptyState title="This entry doesn't exist, or you can't see it." />
      </>
    );
  }
  if (!entry || !categories || !me) return showSkeleton ? <VaultBones rows={5} /> : null;

  const isShared = entry.ownerId === null;
  const isMine = entry.ownerId === me.id;
  const canEdit = isShared || isMine;
  const members = household?.members ?? [];
  const owner = members.find((m) => m.user.id === entry.ownerId);
  const category = categories.find((c) => c.id === entry.categoryId);
  const expiry = entry.expiresOn ? expiryLabel(entry.expiresOn, entry.expiryLabel) : null;

  async function addFiles(list: FileList) {
    setUploading(true);
    const { ok, problems } = await prepareFiles([...list]);
    const room = ATTACHMENTS_PER_ENTRY - entry!.attachments.length;
    const errors = [...problems];
    for (const file of ok.slice(0, room)) {
      const problem = await uploadAttachment(id, file);
      if (problem) errors.push(problem);
    }
    if (ok.length > room) errors.push(`An entry can hold ${ATTACHMENTS_PER_ENTRY} files.`);
    await refresh();
    setUploading(false);
    if (errors.length) showToast(errors[0]);
  }

  if (editing && revealed) {
    return (
      <>
        <VaultBackLink />
        <PageHeader title={`Edit ${entry.title}`} />
        <VaultEntryForm
          editing
          categories={categories}
          pending={update.isPending}
          initial={{
            title: entry.title,
            categoryId: entry.categoryId,
            expiresOn: entry.expiresOn,
            expiryLabel: entry.expiryLabel,
            shared: isShared,
            fields: revealed.fields,
            note: revealed.note,
          }}
          onCancel={() => {
            setEditing(false);
            hide();
          }}
          onSubmit={async (values) => {
            try {
              await update.mutateAsync({ id, ...values });
            } catch {
              showToast("Couldn't save this entry");
              return;
            }
            await refresh();
            setEditing(false);
            hide();
          }}
        />
      </>
    );
  }

  // Once revealed, every Field shows in its own order; until then Secrets show only as dots.
  const rows: { label: string; kind: VaultField["kind"]; value: string | null }[] = revealed
    ? revealed.fields.map((f) => ({ label: f.label, kind: f.kind, value: f.value }))
    : [
        ...entry.plainFields.map((f) => ({ label: f.label, kind: f.kind, value: f.value })),
        ...entry.secretLabels.map((label) => ({ label, kind: "secret" as const, value: null })),
      ];
  const hasHidden = entry.secretLabels.length > 0 || entry.hasNote;
  const whose = isShared
    ? "Shared"
    : isMine
      ? "Personal"
      : members.length > 1 && owner
        ? `${owner.user.name || owner.user.email}'s`
        : "Personal";

  return (
    <>
      <VaultBackLink />
      <PageHeader
        title={entry.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {category && <span>{category.name}</span>}
            <span className="inline-flex items-center gap-1.5">
              {!isShared && owner && members.length > 1 && (
                <Avatar name={owner.user.name || owner.user.email} image={owner.user.image} size={18} />
              )}
              {whose}
            </span>
            {entry.pinned && <Badge variant="secondary">Pinned</Badge>}
            {!isMine && !isShared && <span>Visible to you</span>}
          </span>
        }
      />
      <PageBody>
        {expiry && (
          <p className={`text-base font-medium ${expiry.critical ? "text-destructive" : ""}`}>
            {expiry.text}{" "}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {entry.expiryLabel ? expiry.relative : formatDate(entry.expiresOn!)}
            </span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {hasHidden &&
            (revealed ? (
              <Button variant="outline" onClick={hide}>
                Hide
              </Button>
            ) : (
              // Stay focusable while busy, so activating "Reveal secrets" doesn't drop keyboard focus to the page.
              <Button onClick={() => void show()} disabled={reveal.isPending} focusableWhenDisabled>
                Reveal secrets
              </Button>
            ))}
          {canEdit && (
            <>
              <Button variant="outline" onClick={() => vault.setPinned({ id, pinned: !entry.pinned })}>
                {entry.pinned ? "Unpin" : "Pin"}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!revealed) await show();
                  setEditing(true);
                }}
              >
                Edit
              </Button>
              <Button variant="outline" className="text-destructive" onClick={() => setConfirmingDelete(true)}>
                Delete
              </Button>
            </>
          )}
        </div>

        {isMine && (
          <label className="flex min-h-11 items-center gap-3 text-base md:text-sm">
            <Switch
              checked={entry.visibleToHousehold}
              onCheckedChange={(visible) => vault.setVisibility({ id, visible })}
              aria-label="Visible to household"
            />
            Visible to household
          </label>
        )}

        {(rows.length > 0 || entry.hasNote) && (
          <Section label="Details">
            <RowList>
              {rows.map((f, i) => (
                <li key={i} className="flex min-h-14 items-center gap-3 px-4 py-3 md:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground md:text-xs">{f.label}</p>
                    <p className={`break-all text-base md:text-sm ${f.kind === "secret" ? "font-mono" : ""}`}>
                      {f.value === null ? (
                        <span className="tracking-widest text-muted-foreground" aria-label="Hidden">
                          ••••••••
                        </span>
                      ) : f.kind === "date" && f.value ? (
                        formatDate(f.value)
                      ) : (
                        f.value
                      )}
                    </p>
                  </div>
                  {f.value !== null && <CopyButton value={f.value} label={f.label} />}
                </li>
              ))}
              {entry.hasNote && (
                <li className="px-4 py-3 md:px-5">
                  {revealed ? (
                    <p className="whitespace-pre-wrap rounded-xl bg-muted px-3.5 py-3 text-sm">{revealed.note}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">A note is stored here — reveal to read it.</p>
                  )}
                </li>
              )}
            </RowList>
          </Section>
        )}

        <Section
          title="Files"
          description={entry.attachments.length === 0 ? "No files. Add a scan or PDF — PDF, JPEG, PNG or WebP up to 4 MB." : undefined}
        >
          {entry.attachments.length > 0 && (
            <RowList>
              {entry.attachments.map((a) => (
                <li key={a.id} className="flex min-h-14 items-center gap-2 px-4 py-2 md:px-5">
                  <a
                    href={`/api/vault/attachments/${a.id}`}
                    target="_blank"
                    rel="noopener"
                    className="flex min-h-11 min-w-0 flex-1 flex-col justify-center hover:underline"
                  >
                    <span className="truncate text-base font-medium md:text-sm">{a.name}</span>
                    <span className="text-sm text-muted-foreground md:text-xs">{formatFileSize(a.size)}</span>
                  </a>
                  <Button variant="ghost" render={<a href={`/api/vault/attachments/${a.id}?download=1`} />} nativeButton={false}>
                    Download
                  </Button>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${a.name}`}
                      onClick={() => setRemovingFile({ id: a.id, name: a.name })}
                    >
                      <XIcon />
                    </Button>
                  )}
                </li>
              ))}
            </RowList>
          )}
          {canEdit && entry.attachments.length < ATTACHMENTS_PER_ENTRY && (
            <>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={ATTACHMENT_TYPES.join(",")}
                className="sr-only"
                aria-label="Add files"
                tabIndex={-1}
                onChange={(e) => {
                  if (e.target.files) void addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button variant="outline" className="self-start" disabled={uploading} onClick={() => fileInput.current?.click()}>
                <PlusIcon /> {uploading ? "Uploading…" : "Add file"}
              </Button>
            </>
          )}
        </Section>
      </PageBody>

      <ConfirmDelete
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Delete "${entry.title}" from the Vault?`}
        description="Its files are deleted too."
        onConfirm={() => {
          vault.remove({ id });
          router.push("/vault");
        }}
      />
      <ConfirmDelete
        open={!!removingFile}
        onOpenChange={(o) => !o && setRemovingFile(null)}
        title={`Remove "${removingFile?.name ?? ""}"?`}
        confirmLabel="Remove"
        onConfirm={() => removingFile && removeAttachment.mutate({ id: removingFile.id })}
      />
    </>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label={`${copied ? "Copied" : "Copy"} ${label}`}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

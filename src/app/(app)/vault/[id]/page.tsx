"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@base-ui/react/button";

import { trpc } from "@/trpc/react";
import { useDelayed } from "@/components/use-delayed";
import { RowsSkeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/avatar";
import { ModuleGate } from "@/components/use-modules";
import { VisibilityToggle, VisibilityBadge } from "@/components/finance/visibility-toggle";
import { VaultEntryForm } from "@/components/vault/entry-form";
import { prepareFiles, uploadAttachment } from "@/components/vault/uploads";
import { useRefreshVault, useVaultActions } from "@/components/vault/use-vault";
import { useConfirm } from "@/components/confirm-dialog";
import { showToast } from "@/components/toast";
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
  const confirm = useConfirm();
  const vault = useVaultActions();
  const refresh = useRefreshVault();
  const { data: entry, error } = trpc.vault.get.useQuery({ id }, { retry: false });
  const { data: categories } = trpc.vault.listCategories.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const { data: household } = trpc.household.current.useQuery();
  const showSkeleton = useDelayed(!entry && !error);

  const [revealed, setRevealed] = useState<Revealed | null>(null);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
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
      <div className="flex flex-col gap-3">
        <BackLink />
        <p className="text-[13.5px] text-text-muted">This entry doesn&apos;t exist, or you can&apos;t see it.</p>
      </div>
    );
  }
  if (!entry || !categories || !me) return showSkeleton ? <RowsSkeleton rows={6} /> : null;

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
      <div className="flex flex-col gap-4">
        <BackLink />
        <h2 className="text-[17px] font-semibold">Edit {entry.title}</h2>
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
      </div>
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

  return (
    <div className="flex flex-col gap-6">
      <BackLink />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[22px] font-semibold tracking-tight">{entry.title}</h2>
          {entry.pinned && <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[12px] font-medium text-text-muted">Pinned</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-text-muted">
          {category && <span>{category.name}</span>}
          {!isShared && owner && members.length > 1 && (
            <span className="flex items-center gap-1.5">
              <Avatar name={owner.user.name || owner.user.email} image={owner.user.image} size={18} />
              {isMine ? "Personal" : `${owner.user.name || owner.user.email}'s`}
            </span>
          )}
          {isShared && <span>Shared</span>}
          {isMine && (
            <VisibilityToggle
              visible={entry.visibleToHousehold}
              onChange={(visible) => vault.setVisibility({ id, visible })}
            />
          )}
          {!isMine && !isShared && <VisibilityBadge />}
        </div>
        {expiry && (
          <p className={`text-[15px] font-medium ${expiry.critical ? "text-critical" : "text-text"}`}>
            {expiry.text}
            <span className="ml-2 text-[13px] font-normal text-text-muted">{formatDate(entry.expiresOn!)}</span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {hasHidden &&
            (revealed ? (
              <ActionButton onClick={hide}>Hide</ActionButton>
            ) : (
              <ActionButton primary onClick={() => void show()} disabled={reveal.isPending}>
                Reveal secrets
              </ActionButton>
            ))}
          {canEdit && (
            <>
              <ActionButton onClick={() => vault.setPinned({ id, pinned: !entry.pinned })}>
                {entry.pinned ? "Unpin" : "Pin"}
              </ActionButton>
              <ActionButton
                onClick={async () => {
                  if (!revealed) await show();
                  setEditing(true);
                }}
              >
                Edit
              </ActionButton>
              <ActionButton
                danger
                onClick={async () => {
                  if (await confirm({ title: `Delete "${entry.title}" from the Vault?`, description: "Its files are deleted too." })) {
                    vault.remove({ id });
                    router.push("/vault");
                  }
                }}
              >
                Delete
              </ActionButton>
            </>
          )}
        </div>
      </div>

      {(rows.length > 0 || entry.hasNote) && (
        <section aria-label="Details" className="flex flex-col divide-y divide-border-soft md:overflow-hidden md:rounded-[20px] md:border md:border-border-soft md:bg-surface">
          {rows.map((f, i) => (
            <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 md:px-6">
              <dt className="w-full shrink-0 text-[13px] text-text-muted md:w-44 md:text-[12.5px]">{f.label}</dt>
              <dd className={`min-w-0 flex-1 break-all text-[14.5px] ${f.kind === "secret" ? "font-mono" : ""}`}>
                {f.value === null ? <span className="tracking-widest text-text-faint">••••••••</span> : f.kind === "date" && f.value ? formatDate(f.value) : f.value}
              </dd>
              {f.value !== null && <CopyButton value={f.value} label={f.label} />}
            </div>
          ))}
          {entry.hasNote && (
            <div className="py-3 md:px-6">
              {revealed ? (
                <p className="whitespace-pre-wrap rounded-xl bg-surface-2 px-3.5 py-3 text-[13.5px]">{revealed.note}</p>
              ) : (
                <p className="text-[13px] text-text-muted">A note is stored here — reveal to read it.</p>
              )}
            </div>
          )}
        </section>
      )}

      <section aria-label="Files" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[13px] font-semibold tracking-wide text-text-muted">Files</h3>
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
              <Button
                type="button"
                disabled={uploading}
                onClick={() => fileInput.current?.click()}
                className="min-h-[var(--tap)] px-2 text-[14px] font-medium text-accent hover:opacity-80 disabled:opacity-60 md:min-h-0 md:text-[12.5px]"
              >
                {uploading ? "Uploading…" : "+ Add file"}
              </Button>
            </>
          )}
        </div>
        {entry.attachments.length === 0 ? (
          <p className="text-[13.5px] text-text-muted">No files. Add a scan or PDF — PDF, JPEG, PNG or WebP up to 4 MB.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border-soft md:overflow-hidden md:rounded-[20px] md:border md:border-border-soft md:bg-surface">
            {entry.attachments.map((a) => (
              <div key={a.id} className="flex min-h-[var(--tap-primary)] items-center gap-3 py-3 md:px-6">
                <a
                  href={`/api/vault/attachments/${a.id}`}
                  target="_blank"
                  rel="noopener"
                  className="min-w-0 flex-1 truncate text-[14.5px] font-medium hover:underline"
                >
                  {a.name}
                </a>
                <span className="shrink-0 text-[12.5px] text-text-muted">{formatFileSize(a.size)}</span>
                <a
                  href={`/api/vault/attachments/${a.id}?download=1`}
                  className="shrink-0 text-[13px] font-medium text-accent hover:opacity-80"
                >
                  Download
                </a>
                {canEdit && (
                  <Button
                    type="button"
                    aria-label={`Remove ${a.name}`}
                    onClick={async () => {
                      if (await confirm({ title: `Remove "${a.name}"?` })) removeAttachment.mutate({ id: a.id });
                    }}
                    className="shrink-0 px-1 text-[13px] text-text-faint hover:text-critical"
                  >
                    ✕
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/vault" className="inline-flex min-h-[var(--tap)] w-fit items-center text-[14px] font-medium text-accent hover:opacity-80 md:min-h-0 md:text-[13px]">
      ← Vault
    </Link>
  );
}

function ActionButton({
  children,
  onClick,
  primary,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      // Stay focusable while busy, so activating "Reveal secrets" doesn't drop keyboard focus to the page.
      focusableWhenDisabled
      className={`min-h-[var(--tap)] rounded-full px-4 text-[14px] font-medium transition-colors disabled:opacity-60 md:min-h-0 md:px-3.5 md:py-1.5 md:text-[13px] ${
        primary
          ? "bg-accent-fill text-accent-ink hover:opacity-90"
          : danger
            ? "border border-border-soft text-critical hover:border-critical"
            : "border border-border text-text hover:border-text"
      }`}
    >
      {children}
    </Button>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label={`${copied ? "Copied" : "Copy"} ${label}`}
      className="min-h-[var(--tap)] px-2 text-[14px] font-medium text-accent hover:opacity-80 md:min-h-0 md:px-0 md:text-[12px]"
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

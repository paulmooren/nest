"use client";

import { useRef, useState } from "react";
import { Button } from "@base-ui/react/button";
import { Input } from "@base-ui/react/input";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";

import {
  ATTACHMENTS_PER_ENTRY,
  VAULT_FIELD_KINDS,
  VAULT_FIELD_KIND_LABELS,
  formatFileSize,
  type VaultField,
  type VaultFieldKind,
} from "@/lib/vault";
import { SelectField } from "@/components/ui/select";
import { prepareFiles } from "@/components/vault/uploads";

export type VaultFormValues = {
  title: string;
  categoryId: string;
  expiresOn: Date | null;
  expiryLabel: string | null;
  fields: VaultField[];
  note: string | null;
  shared: boolean;
};

const inputClass =
  "min-w-0 rounded-xl border border-border-soft bg-surface px-3.5 py-2.5 text-[14px] outline-none transition-colors placeholder:text-text-faint focus:border-accent";

export type EntryFormInitial = {
  title: string;
  categoryId: string;
  expiresOn: Date | string | null;
  expiryLabel: string | null;
  /** Ask for the main date even when empty (a Template that has one). */
  hasDate?: boolean;
  shared: boolean;
  fields: VaultField[];
  note: string | null;
};

/**
 * Create or edit a Vault entry. When editing, `initial` is the already-revealed plaintext (fetched on demand) and
 * ownership can't be changed. Creating also collects files; editing leaves files to the entry's own page.
 */
export function VaultEntryForm({
  initial,
  editing = false,
  categories,
  pending,
  initialFiles = [],
  onSubmit,
  onCancel,
}: {
  initial: EntryFormInitial;
  editing?: boolean;
  categories: { id: string; name: string }[];
  pending?: boolean;
  initialFiles?: File[];
  onSubmit: (values: VaultFormValues, files: File[]) => void;
  onCancel: () => void;
}) {
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [shared, setShared] = useState(initial.shared);
  const [fields, setFields] = useState<VaultField[]>(initial.fields);
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [problems, setProblems] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const showDate = initial.hasDate || !!initial.expiresOn || !!initial.expiryLabel;

  const setField = (i: number, patch: Partial<VaultField>) =>
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  async function addFiles(list: FileList | File[]) {
    const { ok, problems: bad } = await prepareFiles([...list]);
    setFiles((prev) => [...prev, ...ok].slice(0, ATTACHMENTS_PER_ENTRY));
    setProblems(bad);
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const title = String(form.get("title") ?? "").trim();
        if (!title) return;
        // The date input is left uncontrolled and read here, so typing a year isn't fought by React.
        const rawDate = String(form.get("expiresOn") ?? "");
        onSubmit(
          {
            title,
            categoryId,
            expiresOn: rawDate ? new Date(rawDate) : null,
            expiryLabel: String(form.get("expiryLabel") ?? "").trim() || null,
            fields: fields
              .map((f) => ({ ...f, label: f.label.trim() }))
              .filter((f) => f.label && f.value),
            note: String(form.get("note") ?? "").trim() || null,
            shared,
          },
          files,
        );
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_200px]">
        <Input
          name="title"
          defaultValue={initial.title}
          required
          autoFocus
          maxLength={100}
          placeholder="Title, e.g. Passport — Alex"
          aria-label="Title"
          className={`${inputClass} text-[15px]`}
        />
        <SelectField
          value={categoryId}
          onValueChange={setCategoryId}
          aria-label="Category"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[12.5px] text-text-muted">Fields — Secrets are encrypted and hidden until revealed</p>
        {fields.map((field, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[170px_110px_1fr_auto]">
            <Input
              value={field.label}
              onChange={(e) => setField(i, { label: e.target.value })}
              maxLength={60}
              placeholder="Label"
              aria-label={`Label ${i + 1}`}
              className={`${inputClass} col-span-2 sm:col-span-1`}
            />
            <SelectField
              value={field.kind}
              onValueChange={(kind) => setField(i, { kind: kind as VaultFieldKind, value: kind === "date" ? "" : field.value })}
              aria-label={`Type ${i + 1}`}
              options={VAULT_FIELD_KINDS.map((k) => ({ value: k, label: VAULT_FIELD_KIND_LABELS[k] }))}
              className={`${inputClass} col-span-2 sm:col-span-1`}
            />
            <Input
              type={field.kind === "date" ? "date" : "text"}
              value={field.value}
              onChange={(e) => setField(i, { value: e.target.value })}
              maxLength={500}
              placeholder="Value"
              aria-label={`Value ${i + 1}`}
              autoComplete="off"
              className={inputClass}
            />
            <Button
              type="button"
              onClick={() => setFields((prev) => prev.filter((_, idx) => idx !== i))}
              aria-label={`Remove field ${i + 1}`}
              className="px-2 text-[13px] text-text-faint hover:text-critical"
            >
              ✕
            </Button>
          </div>
        ))}
        {fields.length < 20 && (
          <Button
            type="button"
            onClick={() => setFields((prev) => [...prev, { label: "", kind: "text", value: "" }])}
            className="self-start text-[12.5px] font-medium text-accent hover:opacity-80"
          >
            + Add field
          </Button>
        )}
      </div>

      {showDate && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Input
            name="expiryLabel"
            defaultValue={initial.expiryLabel ?? ""}
            maxLength={40}
            placeholder="Date label, e.g. Valid until"
            aria-label="Date label"
            className={`${inputClass} w-52`}
          />
          <Input
            type="date"
            name="expiresOn"
            defaultValue={initial.expiresOn ? new Date(initial.expiresOn).toISOString().slice(0, 10) : ""}
            aria-label="Date"
            className={inputClass}
          />
        </div>
      )}
      {!showDate && (
        <DateToggle />
      )}

      <textarea
        name="note"
        defaultValue={initial.note ?? ""}
        maxLength={2000}
        rows={3}
        placeholder="Note — also encrypted (optional)"
        aria-label="Note"
        className={inputClass}
      />

      {!editing && (
        <div className="flex flex-col gap-2">
          <p className="text-[12.5px] text-text-muted">Files — PDF or photo, up to 4 MB each, encrypted</p>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void addFiles(e.dataTransfer.files);
            }}
            className={`flex flex-col items-start gap-2 rounded-xl border border-dashed px-4 py-4 transition-colors ${
              dragOver ? "border-accent bg-surface-2" : "border-border"
            }`}
          >
            <input
              ref={fileInput}
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp"
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
              onClick={() => fileInput.current?.click()}
              className="min-h-[var(--tap)] rounded-xl border border-border px-4 text-[14px] font-medium text-text hover:border-text md:min-h-0 md:py-2 md:text-[13px]"
            >
              Choose files or take a photo
            </Button>
            <span className="text-[12.5px] text-text-muted">or drop them here</span>
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="flex w-full items-center justify-between gap-3 text-[13.5px]">
                <span className="min-w-0 truncate">{f.name}</span>
                <span className="flex shrink-0 items-center gap-3 text-[12.5px] text-text-muted">
                  {formatFileSize(f.size)}
                  <Button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={`Remove ${f.name}`}
                    className="text-text-faint hover:text-critical"
                  >
                    ✕
                  </Button>
                </span>
              </div>
            ))}
          </div>
          {problems.map((p) => (
            <p key={p} role="alert" className="text-[12.5px] text-critical">
              {p}
            </p>
          ))}
        </div>
      )}

      {!editing && (
        <RadioGroup
          aria-label="Who owns this"
          value={shared ? "shared" : "personal"}
          onValueChange={(next) => setShared(next === "shared")}
          className="flex w-fit overflow-hidden rounded-xl border border-border-soft text-[13px] font-medium"
        >
          {[
            { value: "personal", label: "Personal" },
            { value: "shared", label: "Shared" },
          ].map((option) => (
            <Radio.Root
              key={option.value}
              value={option.value}
              className="cursor-pointer px-4 py-2.5 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent data-checked:bg-text data-checked:text-bg data-unchecked:text-text-muted data-unchecked:hover:text-text"
            >
              {option.label}
            </Radio.Root>
          ))}
        </RadioGroup>
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={pending}
          className="min-h-[var(--tap-primary)] rounded-xl bg-accent-fill px-5 text-[15px] font-semibold text-accent-ink hover:opacity-90 disabled:opacity-60 md:min-h-0 md:py-2.5 md:text-[13.5px]"
        >
          {pending ? "Saving…" : editing ? "Save" : "Add to Vault"}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          className="min-h-[var(--tap-primary)] rounded-xl border border-border-soft px-5 text-[15px] font-medium text-text-muted hover:text-text md:min-h-0 md:py-2.5 md:text-[13.5px]"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** A form without a date offers one on request, so a Blank entry stays short. */
function DateToggle() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-[12.5px] font-medium text-accent hover:opacity-80"
      >
        + Add a date (expiry, deadline…)
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Input name="expiryLabel" maxLength={40} placeholder="Date label, e.g. Valid until" aria-label="Date label" className={`${inputClass} w-52`} />
      <Input type="date" name="expiresOn" aria-label="Date" autoFocus className={inputClass} />
    </div>
  );
}

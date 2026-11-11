"use client";

import { useRef, useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";

import {
  ATTACHMENTS_PER_ENTRY,
  VAULT_FIELD_KINDS,
  VAULT_FIELD_KIND_LABELS,
  formatFileSize,
  type VaultField,
  type VaultFieldKind,
} from "@/lib/vault";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TextField } from "@/components/ui/text-field";
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
  const [dateOpen, setDateOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const showDate = initial.hasDate || !!initial.expiresOn || !!initial.expiryLabel || dateOpen;
  const categoryItems = categories.map((c) => ({ value: c.id, label: c.name }));
  const kindItems = VAULT_FIELD_KINDS.map((k) => ({ value: k, label: VAULT_FIELD_KIND_LABELS[k] }));

  const setField = (i: number, patch: Partial<VaultField>) =>
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  async function addFiles(list: FileList | File[]) {
    const { ok, problems: bad } = await prepareFiles([...list]);
    setFiles((prev) => [...prev, ...ok].slice(0, ATTACHMENTS_PER_ENTRY));
    setProblems(bad);
  }

  return (
    <form
      className="flex max-w-3xl flex-col gap-6"
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
            fields: fields.map((f) => ({ ...f, label: f.label.trim() })).filter((f) => f.label && f.value),
            note: String(form.get("note") ?? "").trim() || null,
            shared,
          },
          files,
        );
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px]">
        <TextField
          label="Title"
          name="title"
          defaultValue={initial.title}
          required
          autoFocus
          maxLength={100}
          placeholder="e.g. Passport — Alex"
        />
        <Field id="entry-category" label="Category">
          <Select items={categoryItems} value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
            <SelectTrigger id="entry-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryItems.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Fields</legend>
        <p className="-mt-1 text-sm text-muted-foreground">Secrets are encrypted and hidden until revealed.</p>
        {fields.map((field, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border p-3 md:grid-cols-[180px_120px_1fr_auto] md:border-0 md:p-0"
          >
            <Input
              value={field.label}
              onChange={(e) => setField(i, { label: e.target.value })}
              maxLength={60}
              placeholder="Label"
              aria-label={`Label ${i + 1}`}
              className="col-span-2 md:col-span-1"
            />
            <Select
              items={kindItems}
              value={field.kind}
              onValueChange={(kind) => kind && setField(i, { kind: kind as VaultFieldKind, value: kind === "date" ? "" : field.value })}
            >
              <SelectTrigger aria-label={`Type ${i + 1}`} className="col-span-2 w-full md:col-span-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {kindItems.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type={field.kind === "date" ? "date" : "text"}
              value={field.value}
              onChange={(e) => setField(i, { value: e.target.value })}
              maxLength={500}
              placeholder="Value"
              aria-label={`Value ${i + 1}`}
              autoComplete="off"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setFields((prev) => prev.filter((_, idx) => idx !== i))}
              aria-label={`Remove field ${i + 1}`}
            >
              <XIcon />
            </Button>
          </div>
        ))}
        {fields.length < 20 && (
          <Button
            type="button"
            variant="ghost"
            className="self-start"
            onClick={() => setFields((prev) => [...prev, { label: "", kind: "text", value: "" }])}
          >
            <PlusIcon /> Add field
          </Button>
        )}
      </fieldset>

      {showDate ? (
        <fieldset className="flex flex-wrap items-end gap-3">
          <legend className="mb-2 text-sm font-medium">Date</legend>
          <TextField
            label="Label"
            name="expiryLabel"
            defaultValue={initial.expiryLabel ?? ""}
            maxLength={40}
            placeholder="e.g. Valid until"
            fieldClassName="w-52"
          />
          <TextField
            label="Date"
            type="date"
            name="expiresOn"
            defaultValue={initial.expiresOn ? new Date(initial.expiresOn).toISOString().slice(0, 10) : ""}
            autoFocus={dateOpen}
          />
        </fieldset>
      ) : (
        <Button type="button" variant="ghost" className="self-start" onClick={() => setDateOpen(true)}>
          <PlusIcon /> Add a date (expiry, deadline…)
        </Button>
      )}

      <Field id="entry-note" label="Note" hint="Also encrypted. Optional.">
        <Textarea id="entry-note" name="note" defaultValue={initial.note ?? ""} maxLength={2000} rows={3} />
      </Field>

      {!editing && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Files</p>
          <p className="-mt-1 text-sm text-muted-foreground">PDF or photo, up to 4 MB each, encrypted.</p>
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
            className={`flex flex-col items-start gap-2 rounded-xl border border-dashed p-4 transition-colors ${
              dragOver ? "border-foreground/50 bg-muted" : ""
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
            <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
              Choose files or take a photo
            </Button>
            <span className="text-sm text-muted-foreground">or drop them here</span>
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="flex w-full items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{f.name}</span>
                <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                  {formatFileSize(f.size)}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={`Remove ${f.name}`}
                  >
                    <XIcon />
                  </Button>
                </span>
              </div>
            ))}
          </div>
          {problems.map((p) => (
            <p key={p} role="alert" className="text-sm text-destructive">
              {p}
            </p>
          ))}
        </div>
      )}

      <Field id="entry-owner" label="Who owns this">
        <ChoiceChips
          label="Who owns this"
          value={shared ? "shared" : "personal"}
          onChange={(v) => setShared(v === "shared")}
          options={[
            { value: "personal", label: "Personal" },
            { value: "shared", label: "Shared" },
          ]}
        />
      </Field>

      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save" : "Add to Vault"}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

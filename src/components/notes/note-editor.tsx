"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TextField } from "@/components/ui/text-field";
import { NOTE_BODY_MAX, NOTE_TITLE_MAX } from "@/lib/notes";

export type NoteValues = { title: string; body: string; notebookId: string };

/**
 * Write or edit a Note. `notebooks` are the ones the Member may put it in. `error` is shown above the buttons —
 * for a save refused because someone else changed the Note, with `onReload` to fetch their version.
 */
export function NoteEditor({
  initial,
  notebooks,
  pending,
  error,
  submitLabel = "Save",
  onSubmit,
  onCancel,
  onReload,
}: {
  initial: NoteValues;
  notebooks: { id: string; name: string }[];
  pending?: boolean;
  error?: string | null;
  submitLabel?: string;
  onSubmit: (values: NoteValues) => void;
  onCancel: () => void;
  onReload?: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [notebookId, setNotebookId] = useState(initial.notebookId);
  const items = notebooks.map((n) => ({ value: n.id, label: n.name }));

  return (
    <form
      className="flex max-w-3xl flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title: title.trim(), body, notebookId });
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px]">
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={NOTE_TITLE_MAX}
          placeholder="e.g. Led the Q3 migration"
          autoFocus
        />
        <Field id="note-notebook" label="Notebook">
          <Select items={items} value={notebookId} onValueChange={(v) => v && setNotebookId(v)}>
            <SelectTrigger id="note-notebook" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((n) => (
                <SelectItem key={n.value} value={n.value}>
                  {n.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field
        id="note-body"
        label="Note"
        hint="Start a line with # for a heading, - for a bullet, or - [ ] for a checkbox."
      >
        <Textarea
          id="note-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={NOTE_BODY_MAX}
          className="min-h-56 font-mono md:text-sm"
          placeholder="What happened, what you did, what came of it…"
        />
      </Field>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={pending || (!title.trim() && !body.trim())}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        {error && onReload && (
          <Button type="button" variant="outline" size="lg" onClick={onReload}>
            Discard mine and reload
          </Button>
        )}
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
